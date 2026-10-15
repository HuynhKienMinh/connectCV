'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {collectSnapshot}=require('../ops/snapshotCollector.cjs'),{seal,open,digest}=require('../ops/snapshotEnvelope.cjs');
const ROOT='projects/connect-cv/databases/(default)/documents',time='2026-10-15T19:07:30.123456Z',now=Date.parse('2026-10-15T19:07:33Z');
const reply=body=>({status:200,body:Buffer.from(JSON.stringify(body))});
function fixture(){
 const calls=[];const request=async spec=>{
  calls.push(spec);assert.equal(spec.body?.readTime||spec.query?.readTime,time);assert.equal(spec.maxResponseBytes,2*1024*1024);
  const path=decodeURIComponent(spec.path),token=spec.body?.pageToken||spec.query?.pageToken;
  if(path==='/v1/'+ROOT+':listCollectionIds')return reply(token?{collectionIds:['communityPosts']}:{collectionIds:['accounts'],nextPageToken:'root-next'});
  if(path==='/v1/'+ROOT+'/accounts')return reply(token?{documents:[{name:ROOT+'/accounts/B',createTime:time,updateTime:time}]}:{documents:[{name:ROOT+'/accounts/A',fields:{credits:{integerValue:'15'},name:{stringValue:'PRIVATE_SYNTHETIC_NAME'}}}],nextPageToken:'account-next'});
  if(path==='/v1/'+ROOT+'/communityPosts')return reply({documents:[{name:ROOT+'/communityPosts/ghost'}]});
  if(path==='/v1/'+ROOT+'/accounts/A:listCollectionIds')return reply(token?{}:{collectionIds:['savedCVs'],nextPageToken:'nested-next'});
  if(path==='/v1/'+ROOT+'/communityPosts/ghost:listCollectionIds')return reply({collectionIds:['likes']});
  if(path==='/v1/'+ROOT+'/accounts/A/savedCVs')return reply({documents:[{name:ROOT+'/accounts/A/savedCVs/one',fields:{html:{stringValue:'CV hư cấu'},at:{timestampValue:time}}}]});
  if(path==='/v1/'+ROOT+'/communityPosts/ghost/likes')return reply({documents:[{name:ROOT+'/communityPosts/ghost/likes/B',fields:{at:{timestampValue:time}}}]});
  if(path.endsWith(':listCollectionIds'))return reply({});throw Error('Unexpected fake request');
 };return {request,calls};
}
const collect=(request,extra={})=>collectSnapshot({request,readTime:time,clock:()=>now,...extra});
test('recursive fixed-time pagination includes missing-parent descendants and existing empty documents; envelope round trip is exact',async()=>{
 const {request,calls}=fixture(),snapshot=await collect(request);
 assert.equal(snapshot.documents.length,4);assert.deepEqual(snapshot.collectionPaths,['accounts','accounts/A/savedCVs','communityPosts','communityPosts/ghost/likes']);assert.deepEqual(snapshot.missingParents,[ROOT+'/communityPosts/ghost']);
 assert.deepEqual(snapshot.documents.find(d=>d.name===ROOT+'/accounts/B').fields,{});
 for(const call of calls){assert.ok(call.path.startsWith('/v1/'+ROOT));if(call.method==='GET'){assert.equal(call.query.showMissing,true);assert.equal(call.query.orderBy,undefined);}else assert.equal(call.path.endsWith(':listCollectionIds'),true);}
 const key=crypto.randomBytes(32),archive=seal(snapshot,key,crypto.randomUUID());assert.equal(digest(open(archive.archive,key).snapshot),digest(snapshot));key.fill(0);
});
test('empty database is a completed empty snapshot only after a successful root response',async()=>{
 let calls=0;const result=await collect(async()=>{calls++;return reply({});});assert.equal(calls,1);assert.deepEqual(result.documents,[]);assert.deepEqual(result.collectionPaths,[]);
});
test('auth, permission, throttling and transport failures stop without retries or secret/error-body echo',async()=>{
 for(const [status,code]of [[401,'AUTH_REQUIRED'],[403,'PERMISSION_DENIED'],[429,'RATE_LIMITED'],[500,'READ_FAILED']]){let calls=0;await assert.rejects(collect(async()=>{calls++;return {status,body:Buffer.from('PRIVATE_SYNTHETIC_NAME Bearer SECRET_SENTINEL')};}),new RegExp('^Error: SNAPSHOT_'+code+'$'));assert.equal(calls,1);}
 await assert.rejects(collect(async()=>{throw Error('Bearer SECRET_SENTINEL');}),/^Error: SNAPSHOT_READ_FAILED$/);
});
test('bad scope, sibling collection, path traversal, invalid JSON/UTF8 and malformed response arrays fail closed',async()=>{
 for(const name of ['projects/other/databases/(default)/documents/accounts/A',ROOT+'/sibling/A',ROOT+'/accounts/../escape']){
  let calls=0;await assert.rejects(collect(async()=>++calls===1?reply({collectionIds:['accounts']}):reply({documents:[{name,fields:{}}]})),/^Error: SNAPSHOT_RESPONSE_INVALID$/);assert.equal(calls,2);
 }
 for(const body of [Buffer.from('{'),Buffer.from([0xff]),Buffer.from('null'),Buffer.from('{"collectionIds":null}'),Buffer.from('{"error":{"message":"PRIVATE_SENTINEL"}}'),Buffer.from('{"documents":[]}')])await assert.rejects(collect(async()=>({status:200,body})),/^Error: SNAPSHOT_RESPONSE_INVALID$/);
 await assert.rejects(collect(async()=>reply({collectionIds:['../escape']})),/SNAPSHOT_RESPONSE_INVALID/);
});
test('repeated cursors and duplicate documents never turn a partial inventory into success',async()=>{
 let calls=0;await assert.rejects(collect(async()=>{calls++;return reply({nextPageToken:'same-token'});}),/SNAPSHOT_CURSOR_LOOP/);assert.equal(calls,2);
 calls=0;await assert.rejects(collect(async()=>++calls===1?reply({collectionIds:['accounts']}):reply({documents:[{name:ROOT+'/accounts/A',fields:{}}],nextPageToken:'next'})),/SNAPSHOT_DUPLICATE_RECORD/);
});
test('page, document, collection, depth and byte budgets stop before returning any partial snapshot',async()=>{
 for(const [limits,expected]of [[{maxPages:1},'PAGE_LIMIT'],[{maxDocuments:1},'DOCUMENT_LIMIT'],[{maxCollections:1},'COLLECTION_LIMIT'],[{maxDepth:1},'DEPTH_LIMIT'],[{maxBytes:64},'CAPACITY_EXCEEDED']]){const f=fixture();await assert.rejects(collect(f.request,{limits}),new RegExp('SNAPSHOT_'+expected));}
 await assert.rejects(collect(async()=>({status:200,body:Buffer.alloc(17)}),{limits:{maxPageBytes:16}}),/SNAPSHOT_PAGE_CAPACITY_EXCEEDED/);
 await assert.rejects(collect(async()=>reply({}),{limits:{maxPages:1001}}),/SNAPSHOT_LIMIT_INVALID/);
});
test('timeout and cancellation abort injected work even when the transport ignores its abort signal',async()=>{
 let transportSignal;await assert.rejects(collect(spec=>{transportSignal=spec.signal;return new Promise(()=>{});},{limits:{timeoutMs:15}}),/SNAPSHOT_TIMEOUT/);assert.equal(transportSignal.aborted,true);
 const controller=new AbortController();const pending=collect(spec=>{transportSignal=spec.signal;return new Promise(()=>{});},{signal:controller.signal});setTimeout(()=>controller.abort(),5);await assert.rejects(pending,/SNAPSHOT_CANCELLED/);assert.equal(transportSignal.aborted,true);
});
test('read window expiry and future/invalid timestamps reject before further reads; caller cancellation rejects before first request',async()=>{
 let clockValue=now,calls=0;await assert.rejects(collectSnapshot({readTime:time,clock:()=>clockValue,request:async()=>{calls++;clockValue=Date.parse(time)+59*60000;return reply({collectionIds:['accounts']});}}),/SNAPSHOT_READ_WINDOW_EXPIRED/);assert.equal(calls,1);
 for(const readTime of ['2026-02-31T00:00:00Z','2026-10-15T19:07:40Z','2026-10-15T19:07:30.123456789Z'])await assert.rejects(collect(()=>{throw Error('Must not call');},{readTime}),/SNAPSHOT_READ_TIME_INVALID|SNAPSHOT_READ_WINDOW_EXPIRED/);
 const controller=new AbortController();controller.abort();await assert.rejects(collect(()=>{throw Error('Must not call');},{signal:controller.signal}),/SNAPSHOT_CANCELLED/);
});
test('a late page failure after collecting a private record returns only a safe failure',async()=>{
 const f=fixture();await assert.rejects(collect(spec=>{if(spec.path.endsWith('/communityPosts'))throw Error('PRIVATE_SYNTHETIC_NAME');return f.request(spec);}),/^Error: SNAPSHOT_READ_FAILED$/);
});
test('resource names are encoded as path segments and malformed Unicode/invalid clock/config fail closed',async()=>{
 let calls=0;const result=await collect(async spec=>{
  calls++;assert.equal(spec.path.includes('?'),false);assert.equal(spec.path.includes('#'),false);
  if(calls===1)return reply({collectionIds:['accounts']});
  if(calls===2)return reply({documents:[{name:ROOT+'/accounts/A?x=1#frag',fields:{}}]});
  assert.ok(spec.path.endsWith('/accounts/A%3Fx%3D1%23frag:listCollectionIds'));return reply({});
 });assert.equal(result.documents.length,1);
 await assert.rejects(collect(async()=>reply({collectionIds:['\ud800']})),/SNAPSHOT_RESPONSE_INVALID/);
 await assert.rejects(collect(async()=>reply({}),{clock:()=>NaN}),/SNAPSHOT_READ_WINDOW_EXPIRED/);
 await assert.rejects(collect(async()=>reply({}),{limits:null}),/SNAPSHOT_CONFIG_INVALID/);
 await assert.rejects(collect(async()=>reply({}),{limits:{constructor:1}}),/SNAPSHOT_LIMIT_INVALID/);
 let read=false;await assert.rejects(collect(async()=>{read=true;return reply({});},{limits:{maxBytes:1}}),/SNAPSHOT_CAPACITY_EXCEEDED/);assert.equal(read,false);
});
