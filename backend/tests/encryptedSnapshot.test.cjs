'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createEncryptedSnapshot}=require('../ops/encryptedSnapshot.cjs'),{open}=require('../ops/snapshotEnvelope.cjs');
const ROOT='projects/connect-cv/databases/(default)/documents',at='2026-10-16T07:04:30.123456Z',clock=()=>Date.parse('2026-10-16T07:04:34Z');
const custody={status:'OWNER_CONFIRMED',method:'owner-offline',recoveryVerified:true}; // Synthetic attestation only.
const token='SYNTHETIC_ONLY_ACCESS_TOKEN',json=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
const config=(extra={})=>({key:crypto.randomBytes(32),keyId:crypto.randomUUID(),custody,clock,credential:{getAccessToken:async()=>({access_token:token,expires_in:3600})},fetchImpl:async url=>json(url.endsWith(':runQuery')?[{readTime:at}]:{}),...extra});
test('custody/key/config preflight blocks credential lookup and network before any export',async()=>{
 let auth=0,network=0;const base=config({credential:{getAccessToken:async()=>{auth++;return {access_token:token,expires_in:3600};}},fetchImpl:async()=>{network++;return json({});}});
 for(const change of [{custody:undefined},{custody:{...custody,status:'WAITING_OWNER_CHOICE'}},{custody:{...custody,recoveryVerified:false}},{custody:{...custody,method:'same-backup-folder'}},{key:Buffer.alloc(31)},{key:'PRIVATE_KEY_SENTINEL'},{keyId:'PRIVATE_PATH_SENTINEL'},{limits:{maxPages:0}},{limits:{maxBytes:33554433}},{clock:()=>NaN},{fetchImpl:undefined},{deadlineMs:130001},{signal:{}}])await assert.rejects(createEncryptedSnapshot({...base,...change}),/^Error: SNAPSHOT_EXPORT_FAILED$/);
 assert.equal(auth,0);assert.equal(network,0);base.key.fill(0);
});
test('full fake HTTP pipeline returns only verified ciphertext and small catalog, retaining all typed fields/missing parents',async()=>{
 const calls=[],input=config();let auth=0;input.credential={getAccessToken:async()=>{auth++;return {access_token:token,expires_in:3600};}};
 input.fetchImpl=async(url,options)=>{
  const u=new URL(url);calls.push(u.pathname);assert.equal(options.headers.Authorization,'Bearer '+token);assert.ok(!url.includes(token));const body=options.body?JSON.parse(options.body):null;
  if(u.pathname.endsWith(':runQuery'))return json([{readTime:at,done:true}]);
  assert.equal(body?.readTime||u.searchParams.get('readTime'),at);
  if(u.pathname==='/v1/'+ROOT+':listCollectionIds')return json({collectionIds:['accounts','posts']});
  if(u.pathname==='/v1/'+ROOT+'/accounts')return json({documents:[{name:ROOT+'/accounts/fake',fields:{name:{stringValue:'HỒ SƠ GIẢ SENTINEL'},wide:{integerValue:'9223372036854775807'},items:{arrayValue:{values:[{bytesValue:'AAEC/w=='}]}}}}]});
  if(u.pathname==='/v1/'+ROOT+'/posts')return json({documents:[{name:ROOT+'/posts/ghost'}]});
  if(u.pathname==='/v1/'+ROOT+'/posts/ghost:listCollectionIds')return json({collectionIds:['likes']});
  if(u.pathname==='/v1/'+ROOT+'/posts/ghost/likes')return json({documents:[{name:ROOT+'/posts/ghost/likes/fake',fields:{at:{timestampValue:at}}}]});return json({});
 };
 const result=await createEncryptedSnapshot(input),decoded=open(result.archive,input.key).snapshot;
 assert.equal(auth,1);assert.equal(decoded.documents.length,2);assert.deepEqual(decoded.missingParents,[ROOT+'/posts/ghost']);assert.equal(decoded.documents[0].fields.wide.integerValue,'9223372036854775807');assert.equal(decoded.readTime,at);
 assert.deepEqual(Object.keys(result).sort(),['archive','catalog']);assert.equal(result.catalog.documentCount,2);assert.equal(result.catalog.localReadbackVerified,true);assert.equal(result.catalog.cloudVerified,false);assert.equal(result.catalog.restoreVerified,false);
 const catalog=JSON.stringify(result.catalog);for(const text of ['SENTINEL',token,'/accounts/fake',at,'OWNER_CONFIRMED'])assert.ok(!catalog.includes(text));assert.ok(!result.archive.includes(Buffer.from('HỒ SƠ GIẢ SENTINEL')));assert.equal(result.catalog.sha256,crypto.createHash('sha256').update(result.archive).digest('hex'));input.key.fill(0);
});
test('key is copied before async work; wrapper does not erase or depend on later mutation of caller key',async()=>{
 let release;const input=config({credential:{getAccessToken:()=>new Promise(r=>release=r)}}),original=Buffer.from(input.key),pending=createEncryptedSnapshot(input);await new Promise(r=>setImmediate(r));input.key.fill(0);release({access_token:token,expires_in:3600});const result=await pending;assert.equal(open(result.archive,original).snapshot.documents.length,0);assert.ok(input.key.every(x=>x===0));original.fill(0);
 const next=config(),before=Buffer.from(next.key);await createEncryptedSnapshot(next);assert.deepEqual(next.key,before);next.key.fill(0);before.fill(0);
});
test('probe, auth, later page and malformed failures never return partial archive or raw provider data',async()=>{
 for(const mode of ['auth','probe','late','malformed']){
  let requests=0;const input=config({credential:{getAccessToken:async()=>{if(mode==='auth')throw Error('TOKEN_SECRET_SENTINEL');return {access_token:token,expires_in:3600};}},fetchImpl:async url=>{
   requests++;if(url.endsWith(':runQuery'))return mode==='probe'?new Response('PRIVATE_SENTINEL',{status:403}):json([{readTime:at}]);
   if(url.endsWith('/documents:listCollectionIds'))return json({collectionIds:['accounts']});
   if(url.includes('/accounts?'))return json({documents:[{name:ROOT+'/accounts/fake',fields:{private:{stringValue:'PRIVATE_SENTINEL'}}}]});
   return mode==='malformed'?json({error:{message:'PRIVATE_SENTINEL'}}):new Response('PRIVATE_SENTINEL',{status:403});
  }});
  await assert.rejects(createEncryptedSnapshot(input),/^Error: SNAPSHOT_EXPORT_FAILED$/);assert.equal(requests,mode==='auth'?0:mode==='probe'?1:4);input.key.fill(0);
 }
});
test('collector capacity failure after valid probe yields no partial result and cannot raise limits',async()=>{
 const input=config({limits:{maxBytes:100},fetchImpl:async url=>json(url.endsWith(':runQuery')?[{readTime:at}]:{})});await assert.rejects(createEncryptedSnapshot(input),/^Error: SNAPSHOT_EXPORT_FAILED$/);input.key.fill(0);
});
test('cancelled or expired wrapper with pending credential cannot perform network after late resolution',async()=>{
 for(const mode of ['cancel','deadline']){
  let release,network=0;const controller=new AbortController(),input=config({signal:controller.signal,deadlineMs:mode==='deadline'?20:130000,credential:{getAccessToken:()=>new Promise(r=>release=r)},fetchImpl:async()=>{network++;return json({});}}),pending=createEncryptedSnapshot(input);await new Promise(r=>setImmediate(r));if(mode==='cancel')controller.abort();await assert.rejects(pending,/EXPORT_FAILED/);release({access_token:token,expires_in:3600});await new Promise(r=>setImmediate(r));assert.equal(network,0);input.key.fill(0);
 }
});
test('abort while fetch ignores signal discards late data; already aborted input makes no provider call',async()=>{
 let auth=0,release;const controller=new AbortController(),input=config({signal:controller.signal,credential:{getAccessToken:async()=>{auth++;return {access_token:token,expires_in:3600};}},fetchImpl:()=>new Promise(r=>release=r)}),pending=createEncryptedSnapshot(input);await new Promise(r=>setImmediate(r));controller.abort();await assert.rejects(pending,/EXPORT_FAILED/);release(json([{readTime:at}]));await assert.rejects(createEncryptedSnapshot(input),/EXPORT_FAILED/);assert.equal(auth,1);input.key.fill(0);
});
