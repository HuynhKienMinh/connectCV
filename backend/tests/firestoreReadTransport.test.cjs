'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createFirestoreReadTransport}=require('../ops/firestoreReadTransport.cjs');
const PREFIX='/v1/projects/connect-cv/databases/(default)/documents',time='2026-10-15T19:07:30.123456Z',token='SYNTHETIC_LOCAL_ACCESS_TOKEN_ONLY';
const getSpec=()=>({method:'GET',path:PREFIX+'/accounts',query:{pageSize:100,readTime:time,showMissing:true},maxResponseBytes:2048});
const json=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
test('transport emits scoped list reads with auth in headers, fixed-time input and redirect/cookie/cache guards',async()=>{
 const calls=[],request=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async(url,options)=>{calls.push({url,options});return json({documents:[]});}});
 assert.deepEqual(JSON.parse((await request(getSpec())).body),{documents:[]});
 await request({method:'POST',path:PREFIX+':listCollectionIds',body:{pageSize:100,readTime:time,pageToken:'opaque'},maxResponseBytes:2048});
 const first=new URL(calls[0].url);assert.equal(first.origin,'https://firestore.googleapis.com');assert.equal(first.searchParams.get('showMissing'),'true');assert.equal(first.searchParams.get('readTime'),time);
 for(const call of calls){assert.equal(call.options.headers.Authorization,'Bearer '+token);assert.equal(call.options.redirect,'error');assert.equal(call.options.credentials,'omit');assert.equal(call.options.cache,'no-store');assert.ok(!call.url.includes(token));}
 assert.equal(JSON.parse(calls[1].options.body).readTime,time);
});
test('mutation endpoints, other projects, traversal and partial masks reject before token or fetch access',async()=>{
 let auth=0,fetches=0;const request=createFirestoreReadTransport({getAccessToken:async()=>{auth++;return token;},fetchImpl:async()=>{fetches++;return json({});}});
 for(const changes of [{method:'DELETE'},{method:'POST',path:PREFIX+':commit',body:{}},{path:PREFIX.replace('connect-cv','another-project')+'/accounts'},{path:PREFIX+'/accounts/../other'},{path:PREFIX+'/accounts?x=1'},{query:{...getSpec().query,mask:'name'}},{query:{...getSpec().query,showMissing:false}},{maxResponseBytes:2*1024*1024+1}])await assert.rejects(request({...getSpec(),...changes}),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);
 assert.equal(auth,0);assert.equal(fetches,0);
});
test('stream and content-length bounds cancel oversized responses without returning partial plaintext',async()=>{
 let cancelled=0;const request=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(8));c.enqueue(new Uint8Array(8));},cancel(){cancelled++;}}),{headers:{'Content-Type':'application/json'}})});
 await assert.rejects(request({...getSpec(),maxResponseBytes:12}),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);assert.equal(cancelled,1);
 const lengthBound=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async()=>new Response('data',{headers:{'Content-Type':'application/json','Content-Length':'9999'}})});
 await assert.rejects(lengthBound({...getSpec(),maxResponseBytes:12}),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);
});
test('error responses are not read and transport/credential failures never echo secret text',async()=>{
 let cancelled=0;const request=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async()=>new Response(new ReadableStream({cancel(){cancelled++;}}),{status:403})});
 const result=await request(getSpec());assert.equal(result.status,403);assert.equal(result.body.length,0);assert.equal(cancelled,1);
 for(const parts of [{getAccessToken:async()=>{throw Error('Bearer SECRET_SENTINEL');},fetchImpl:async()=>json({})},{getAccessToken:async()=>token,fetchImpl:async()=>{throw Error('SECRET_SENTINEL');}}])await assert.rejects(createFirestoreReadTransport(parts)(getSpec()),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);
});
test('cancellation before auth and after late auth resolution prevents subsequent network reads',async()=>{
 let auth=0,fetches=0,resolveToken;const controller=new AbortController(),request=createFirestoreReadTransport({getAccessToken:()=>{auth++;return new Promise(r=>resolveToken=r);},fetchImpl:async()=>{fetches++;return json({});}});
 const pending=request({...getSpec(),signal:controller.signal});controller.abort();resolveToken(token);await assert.rejects(pending,/SNAPSHOT_TRANSPORT_FAILED/);assert.equal(auth,1);assert.equal(fetches,0);
 await assert.rejects(request({...getSpec(),signal:controller.signal}),/SNAPSHOT_TRANSPORT_FAILED/);assert.equal(auth,1);assert.equal(fetches,0);
});
test('unexpected content type and malformed scope segments fail closed',async()=>{
 const request=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async()=>new Response('PRIVATE_SENTINEL',{headers:{'Content-Type':'text/html'}})});
 await assert.rejects(request(getSpec()),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);
 for(const path of [PREFIX+'/accounts%2Fother',PREFIX+'/accounts#fragment',PREFIX+'/accounts/%2e%2e/other'])await assert.rejects(request({...getSpec(),path}),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);
});
test('collector and streaming transport compose through fake Fetch responses without losing typed JSON or negative zero',async()=>{
 const {collectSnapshot}=require('../ops/snapshotCollector.cjs'),{seal,open}=require('../ops/snapshotEnvelope.cjs'),crypto=require('node:crypto');let calls=0;
 const request=createFirestoreReadTransport({getAccessToken:async()=>token,fetchImpl:async(url,options)=>{
  calls++;const parsed=new URL(url);assert.equal(parsed.origin,'https://firestore.googleapis.com');
  if(parsed.pathname===PREFIX+':listCollectionIds'){assert.equal(JSON.parse(options.body).readTime,time);return json({collectionIds:['accounts']});}
  if(parsed.pathname===PREFIX+'/accounts'){assert.equal(parsed.searchParams.get('readTime'),time);return new Response('{"documents":[{"name":"projects/connect-cv/databases/(default)/documents/accounts/A","fields":{"balance":{"integerValue":"9223372036854775807"},"zero":{"doubleValue":-0}}}]}',{headers:{'Content-Type':'application/json'}});}
  assert.equal(parsed.pathname,PREFIX+'/accounts/A:listCollectionIds');return json({});
 }});
 const snapshot=await collectSnapshot({request,readTime:time,clock:()=>Date.parse('2026-10-15T19:07:33Z')}),key=crypto.randomBytes(32);
 const restored=open(seal(snapshot,key,crypto.randomUUID()).archive,key).snapshot;assert.equal(calls,3);assert.equal(restored.documents[0].fields.balance.integerValue,'9223372036854775807');assert.ok(Object.is(restored.documents[0].fields.zero.doubleValue,-0));key.fill(0);
});
