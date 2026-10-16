'use strict';
// Explicit injection only. No credential discovery or I/O on import.
const PREFIX='/v1/projects/connect-cv/databases/(default)/documents',ORIGIN='https://firestore.googleapis.com';
const {isReadTimeSpec}=require('./snapshotReadTime.cjs');
const fail=()=>new Error('SNAPSHOT_TRANSPORT_FAILED');
function validate(spec){
 if(isReadTimeSpec(spec))return {url:new URL(ORIGIN+spec.path),listing:true,input:JSON.parse(JSON.stringify(spec.body))};
 if(!spec||typeof spec.path!=='string'||!spec.path.startsWith(PREFIX))throw fail();
 const suffix=spec.path.slice(PREFIX.length),listing=spec.method==='POST'&&suffix.endsWith(':listCollectionIds');
 if(spec.method!=='GET'&&!listing)throw fail();
 const relative=listing?suffix.slice(0,-':listCollectionIds'.length):suffix;if(relative&&relative[0]!=='/')throw fail();
 const parts=relative?relative.slice(1).split('/'):[];let decoded;
 try{decoded=parts.map(decodeURIComponent);}catch{throw fail();}
 if(decoded.some(p=>!p||p==='.'||p==='..'||p.includes('/')||Buffer.byteLength(p)>1500)||decoded.map(encodeURIComponent).join('/')!==parts.join('/'))throw fail();
 if(decoded.length%2!==(listing?0:1))throw fail();
 const input=listing?spec.body:spec.query,keys=listing?['pageSize','pageToken','readTime']:['pageSize','pageToken','readTime','showMissing'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))throw fail();
 if(!Number.isInteger(input.pageSize)||input.pageSize<1||input.pageSize>100||typeof input.readTime!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(input.readTime)||(!listing&&input.showMissing!==true))throw fail();
 if(input.pageToken!==undefined&&(typeof input.pageToken!=='string'||input.pageToken.length>4096))throw fail();
 if(!Number.isSafeInteger(spec.maxResponseBytes)||spec.maxResponseBytes<1||spec.maxResponseBytes>2*1024*1024)throw fail();
 const url=new URL(ORIGIN+spec.path);if(url.origin!==ORIGIN||url.pathname!==spec.path||url.search||url.hash)throw fail();
 if(!listing)for(const [key,value]of Object.entries(input))url.searchParams.set(key,String(value));return {url,listing,input:{...input}};
}
function createFirestoreReadTransport({fetchImpl,getAccessToken}={}){
 if(typeof fetchImpl!=='function'||typeof getAccessToken!=='function')throw fail();
 return async spec=>{
  let response,reader,complete=false;
  try{
   const {url,listing,input}=validate(spec),{method,signal,maxResponseBytes}=spec;if(signal?.aborted)throw fail();
   const token=await getAccessToken();if(signal?.aborted||typeof token!=='string'||!/^[^\s]{20,8192}$/.test(token))throw fail();
   response=await fetchImpl(url.href,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(listing?{body:JSON.stringify(input)}:{}),signal,redirect:'error',credentials:'omit',cache:'no-store'});
   if(response.status!==200){await response.body?.cancel().catch(()=>{});return {status:response.status,body:Buffer.alloc(0)};}
   if(signal?.aborted||!response.headers.get('Content-Type')?.toLowerCase().includes('application/json'))throw fail();
   const length=response.headers.get('Content-Length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxResponseBytes))throw fail();
   reader=response.body?.getReader();if(!reader)throw fail();const chunks=[];let bytes=0;
   for(;;){
    if(signal?.aborted)throw fail();const {done,value}=await reader.read();if(signal?.aborted)throw fail();if(done)break;
    bytes+=value.byteLength;if(bytes>maxResponseBytes)throw fail();chunks.push(Buffer.from(value));
   }
   complete=true;return {status:200,body:Buffer.concat(chunks,bytes)};
  }catch{throw fail();}
  finally{
   if(!complete){if(reader)await reader.cancel().catch(()=>{});else if(response?.status===200)await response.body?.cancel().catch(()=>{});}
   reader?.releaseLock();
  }
 };
}
module.exports={createFirestoreReadTransport};
