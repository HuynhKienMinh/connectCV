'use strict';
// One short backup session, supplied Credential only. No SDK initialization,
// ADC discovery, environment/file reads, login, scopes or refresh-token handling.
const {performance}=require('node:perf_hooks');
const fail=()=>new Error('SNAPSHOT_CREDENTIAL_FAILED');
function createSnapshotCredential({credential,projectId,signal,clock=()=>performance.now(),timeoutMs=10000}={}){
 if(projectId!=='connect-cv'||!credential||typeof credential.getAccessToken!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw fail();
 const obtain=credential.getAccessToken.bind(credential);
 let token=null,pending=null,closed=false,started=null,last=null,rejectClosed;
 function close(){closed=true;token=null;pending=null;rejectClosed?.(fail());signal?.removeEventListener('abort',close);}
 function now(){const value=clock();if(!Number.isFinite(value)||value<0||(last!==null&&value<last))throw fail();last=value;return value;}
 function check(){if(closed||signal?.aborted)throw fail();const at=now();if(started!==null&&at-started>=150000)throw fail();return at;}
 async function acquire(){
  let timer;
  try{
   started=check();
   const cancelled=new Promise((_,reject)=>{rejectClosed=reject;});
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail()),timeoutMs);});
   const operation=Promise.resolve().then(()=>{check();return obtain();});
   const value=await Promise.race([operation,cancelled,timeout]);
   const at=check();
   if(!value||typeof value.access_token!=='string'||!/^\S{20,8192}$/.test(value.access_token)||!Number.isInteger(value.expires_in)||value.expires_in<180||value.expires_in>3600||at-started>=(value.expires_in-30)*1000)throw fail();
   token=value.access_token;return token;
  }catch{close();throw fail();}
  finally{clearTimeout(timer);rejectClosed=null;}
 }
 async function getAccessToken(){
  try{check();if(token)return token;if(!pending)pending=acquire();return await pending;}
  catch{close();throw fail();}
 }
 signal?.addEventListener('abort',close,{once:true});if(signal?.aborted)close();
 return Object.freeze({getAccessToken,close});
}
module.exports={createSnapshotCredential};
