'use strict';
// RAM-only orchestration; no credential discovery, key generation, filesystem,
// Drive, restore mutation or automatic execution. Custody is a caller attestation,
// not proof that a human has recovered the key on a second device.
const {performance}=require('node:perf_hooks');
const {createSnapshotCredential}=require('./snapshotCredential.cjs');
const {createFirestoreReadTransport}=require('./firestoreReadTransport.cjs');
const {acquireReadTime}=require('./snapshotReadTime.cjs');
const {collectSnapshot,validateCollectorLimits}=require('./snapshotCollector.cjs');
const {seal,open,digest}=require('./snapshotEnvelope.cjs');
const fail=()=>new Error('SNAPSHOT_EXPORT_FAILED');
async function createEncryptedSnapshot({key,keyId,custody,credential,fetchImpl,signal,clock=Date.now,limits={},deadlineMs=130000}={}){
 let ownedKey,session,timer,cancel;const controller=new AbortController(),started=performance.now();
 try{
  // All non-network prerequisites must pass before even asking for a token.
  if(!Buffer.isBuffer(key)||key.length!==32||typeof keyId!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(keyId)||custody?.status!=='OWNER_CONFIRMED'||custody?.recoveryVerified!==true||!['password-manager','owner-offline'].includes(custody?.method)||typeof fetchImpl!=='function'||typeof clock!=='function'||!Number.isFinite(clock())||!Number.isInteger(deadlineMs)||deadlineMs<1||deadlineMs>130000||(signal!==undefined&&!(signal instanceof AbortSignal))||signal?.aborted)throw fail();
  const config=validateCollectorLimits(limits);ownedKey=Buffer.from(key);
  cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
  timer=setTimeout(cancel,deadlineMs);
  session=createSnapshotCredential({credential,projectId:'connect-cv',signal:controller.signal});
  const request=createFirestoreReadTransport({fetchImpl,getAccessToken:session.getAccessToken});
  const check=()=>{if(controller.signal.aborted||performance.now()-started>=deadlineMs)throw fail();};
  check();const readTime=await acquireReadTime({request,clock,signal:controller.signal});
  check();const snapshot=await collectSnapshot({request,readTime,clock,limits:config,signal:controller.signal});
  check();const result=seal(snapshot,ownedKey,keyId,{maxBytes:config.maxBytes});
  const restored=open(result.archive,ownedKey,{maxBytes:config.maxBytes});
  if(restored.keyId!==keyId||digest(restored.snapshot)!==digest(snapshot))throw fail();check();
  return {archive:result.archive,catalog:{...result.catalog,localReadbackVerified:true,cloudVerified:false,restoreVerified:false}};
 }catch{throw fail();}
 finally{
  clearTimeout(timer);controller.abort();if(cancel)signal?.removeEventListener('abort',cancel);session?.close();ownedKey?.fill(0);
 }
}
module.exports={createEncryptedSnapshot};
