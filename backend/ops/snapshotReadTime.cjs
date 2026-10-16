'use strict';
// No default network/credential access. The fixed zero-result query obtains a
// server timestamp without returning document contents; it is not an export.
const PATH='/v1/projects/connect-cv/databases/(default)/documents:runQuery';
const BODY={structuredQuery:{from:[{collectionId:'accounts'}],select:{fields:[{fieldPath:'__name__'}]},limit:0}};
const fail=()=>new Error('SNAPSHOT_READ_TIME_FAILED');
function readTimeSpec(){return {method:'POST',path:PATH,body:JSON.parse(JSON.stringify(BODY)),maxResponseBytes:65536};}
function isReadTimeSpec(spec){return spec?.method==='POST'&&spec.path===PATH&&spec.query===undefined&&JSON.stringify(spec.body)===JSON.stringify(BODY)&&Number.isSafeInteger(spec.maxResponseBytes)&&spec.maxResponseBytes>0&&spec.maxResponseBytes<=65536;}
async function acquireReadTime({request,clock=Date.now,signal,timeoutMs=10000}={}){
 if(typeof request!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw fail();
 const controller=new AbortController();let timer,cancel;
 try{
  if(signal?.aborted)throw fail();
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail());},timeoutMs);});
  const cancelled=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(fail());};signal?.addEventListener('abort',cancel,{once:true});});
  const response=await Promise.race([Promise.resolve().then(()=>request({...readTimeSpec(),signal:controller.signal})),timeout,cancelled]);
  if(signal?.aborted||response?.status!==200||!Buffer.isBuffer(response.body)||response.body.length>65536)throw fail();
  const rows=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(response.body));
  if(!Array.isArray(rows)||rows.length!==1)throw fail();const row=rows[0];
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(k=>!['readTime','done','skippedResults'].includes(k))||(row.done!==undefined&&row.done!==true)||(row.skippedResults!==undefined&&row.skippedResults!==0))throw fail();
  let value=row.readTime;
  // Generated protobuf timestamps may use nine digits. Accept only exact
  // microseconds; never round to a different database snapshot time.
  if(typeof value==='string'&&/\.\d{6}000Z$/.test(value))value=value.slice(0,-4)+'Z';
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(value))throw fail();
  const at=Date.parse(value),now=clock();if(!Number.isFinite(at)||!Number.isFinite(now)||new Date(at).toISOString().slice(0,19)!==value.slice(0,19)||now<at||now-at>=59*60000)throw fail();
  return value;
 }catch{throw fail();}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
}
module.exports={acquireReadTime,readTimeSpec,isReadTimeSpec};
