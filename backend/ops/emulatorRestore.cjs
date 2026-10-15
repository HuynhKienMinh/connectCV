'use strict';
// Restore is confined to an explicit loopback demo emulator, never production.
const {open}=require('./snapshotEnvelope.cjs');
const SOURCE='projects/connect-cv/databases/(default)/documents/',TARGET='projects/demo-connectcv-backup/databases/(default)/documents';
function originValue(value){const u=new URL(value);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('EMULATOR_TARGET_INVALID');return u.origin;}
async function restoreToEmulator({archive,key,origin,fetchImpl=fetch}={}){
 let base,snapshot,batches=[];
 try{
  base=originValue(origin);snapshot=open(archive,key).snapshot;
  // Prepare all operations before contacting the target. System create/update times
  // are source metadata, not writable fields; the emulator creates new metadata.
  let batch=[],bytes=0;
  for(const doc of snapshot.documents){
   const relative=doc.name.slice(SOURCE.length);
   const write={update:{name:TARGET+'/'+relative,fields:doc.fields},currentDocument:{exists:false}},size=Buffer.byteLength(JSON.stringify(write));
   if(size>2*1024*1024)throw Error('EMULATOR_DOCUMENT_TOO_LARGE');
   if(batch.length&&(batch.length>=100||bytes+size>2*1024*1024)){batches.push(batch);batch=[];bytes=0;}
   batch.push(write);bytes+=size;
  }
  if(batch.length)batches.push(batch);
 }catch{throw Error('EMULATOR_RESTORE_PREFLIGHT_FAILED');}
 async function post(suffix,body){
  try{
   // Fixed emulator sentinel, never a real token; origin was restricted above.
   const response=await fetchImpl(base+'/v1/'+TARGET+suffix,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),redirect:'error',credentials:'omit'});
   if(!response.ok)throw Error();const result=await response.json();if(!result||typeof result!=='object'||Array.isArray(result)||result.error)throw Error();return result;
  }catch{throw Error('EMULATOR_RESTORE_REQUEST_FAILED');}
 }
 const inventory=await post(':listCollectionIds',{pageSize:100});
 if((inventory.collectionIds!==undefined&&!Array.isArray(inventory.collectionIds))||inventory.collectionIds?.length||inventory.nextPageToken||Object.keys(inventory).some(k=>!['collectionIds','nextPageToken'].includes(k)))throw Error('EMULATOR_TARGET_NOT_EMPTY');
 let written=0;
 for(const writes of batches){const result=await post(':commit',{writes});if(!Array.isArray(result.writeResults)||result.writeResults.length!==writes.length)throw Error('EMULATOR_RESTORE_RESULT_INVALID');written+=writes.length;}
 return {written,missingParents:snapshot.missingParents.length,sourceMetadataRestored:false};
}
module.exports={restoreToEmulator};
