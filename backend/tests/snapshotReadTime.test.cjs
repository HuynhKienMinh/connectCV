'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {acquireReadTime,readTimeSpec}=require('../ops/snapshotReadTime.cjs');
const {createFirestoreReadTransport}=require('../ops/firestoreReadTransport.cjs');
const at='2026-10-16T06:34:30.123456Z',clock=()=>Date.parse('2026-10-16T06:34:34Z');
const raw=body=>({status:200,body:Buffer.from(JSON.stringify(body))});
const response=body=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
test('fixed zero-result probe through bounded transport anchors every collector page at server time',async()=>{
 const {collectSnapshot}=require('../ops/snapshotCollector.cjs');const calls=[];
 const request=createFirestoreReadTransport({getAccessToken:async()=>'SYNTHETIC_ACCESS_TOKEN_ONLY',fetchImpl:async(url,options)=>{
  calls.push({url,options});const u=new URL(url);
  if(u.pathname.endsWith(':runQuery')){assert.deepEqual(JSON.parse(options.body),readTimeSpec().body);assert.equal(options.redirect,'error');return response([{readTime:at,done:true}]);}
  if(u.pathname.endsWith(':listCollectionIds')){assert.equal(JSON.parse(options.body).readTime,at);return response(u.pathname.endsWith('/documents:listCollectionIds')?{collectionIds:['accounts']}:{});}
  assert.equal(u.searchParams.get('readTime'),at);return response({documents:[{name:'projects/connect-cv/databases/(default)/documents/accounts/fixture',fields:{credits:{integerValue:'20'}}}]});
 }});
 const readTime=await acquireReadTime({request,clock});assert.equal(readTime,at);
 const snapshot=await collectSnapshot({request,readTime,clock});assert.equal(snapshot.readTime,at);assert.equal(snapshot.documents.length,1);assert.equal(calls.length,4);
});
test('only exact fixed query is allowed; widening or scope change rejects before credentials',async()=>{
 let auth=0,fetches=0;const request=createFirestoreReadTransport({getAccessToken:async()=>{auth++;return 'SYNTHETIC_ACCESS_TOKEN_ONLY';},fetchImpl:async()=>{fetches++;return response([]);}});
 const variants=[s=>s.body.structuredQuery.limit=1,s=>delete s.body.structuredQuery.limit,s=>delete s.body.structuredQuery.select,s=>s.body.structuredQuery.from[0].collectionId='other',s=>s.body.structuredQuery.from[0].allDescendants=true,s=>s.body.readTime=at,s=>s.query={},s=>s.maxResponseBytes=65537,s=>s.path=s.path.replace('connect-cv','other-project'),s=>s.path=s.path.replace(':runQuery',':commit')];
 for(const mutate of variants){const spec=readTimeSpec();mutate(spec);await assert.rejects(request(spec),/^Error: SNAPSHOT_TRANSPORT_FAILED$/);}
 assert.equal(auth,0);assert.equal(fetches,0);
});
test('request body is captured before async authentication to prevent later widening',async()=>{
 let resolveToken,captured;const request=createFirestoreReadTransport({getAccessToken:()=>new Promise(r=>resolveToken=r),fetchImpl:async(url,options)=>{captured=JSON.parse(options.body);assert.equal(options.method,'POST');return response([{readTime:at}]);}});
 const spec=readTimeSpec(),pending=request(spec);spec.body.structuredQuery.limit=100;spec.method='DELETE';resolveToken('SYNTHETIC_ACCESS_TOKEN_ONLY');await pending;assert.equal(captured.structuredQuery.limit,0);
 const bounded=createFirestoreReadTransport({getAccessToken:()=>new Promise(r=>resolveToken=r),fetchImpl:async()=>response([{readTime:at}])});
 const small={...readTimeSpec(),maxResponseBytes:2},late=bounded(small);small.maxResponseBytes=65536;resolveToken('SYNTHETIC_ACCESS_TOKEN_ONLY');await assert.rejects(late,/TRANSPORT_FAILED/);
});
test('microsecond precision is kept exactly; invalid, stale, future and submicrosecond timestamps reject',async()=>{
 assert.equal(await acquireReadTime({request:async()=>raw([{readTime:at.replace('456Z','456000Z')}]),clock}),at);
 for(const readTime of ['2026-10-16T06:34:30.123456001Z','2026-10-16T06:34:35Z','2026-10-16T05:35:34Z','2026-02-30T00:00:00Z','2026-10-16T06:34:30+00:00',null,42])await assert.rejects(acquireReadTime({request:async()=>raw([{readTime}]),clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);
});
test('document, progress, missing, duplicate and malformed responses cannot become an empty backup anchor',async()=>{
 for(const body of [[],{},[{readTime:at},{readTime:at}],[{}],[{readTime:at,document:{fields:{private:'SENTINEL'}}}],[{readTime:at,error:{message:'SENTINEL'}}],[{readTime:at,done:false}],[{readTime:at,skippedResults:1}]])await assert.rejects(acquireReadTime({request:async()=>raw(body),clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);
 for(const body of [Buffer.from([0xff]),Buffer.from('bad-json'),Buffer.alloc(65537)])await assert.rejects(acquireReadTime({request:async()=>({status:200,body}),clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);
});
test('auth/rate/provider failures are single attempt, sanitized and never fall back to local clock',async()=>{
 for(const status of [401,403,429,500]){let count=0;await assert.rejects(acquireReadTime({request:async()=>{count++;return {status,body:Buffer.from('PRIVATE_SENTINEL')};},clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);assert.equal(count,1);}
 await assert.rejects(acquireReadTime({request:async()=>{throw Error('TOKEN_SENTINEL');},clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);
});
test('deadline covers token lookup, aborts late token and blocks subsequent network request',async()=>{
 let resolveToken,fetches=0;const request=createFirestoreReadTransport({getAccessToken:()=>new Promise(r=>resolveToken=r),fetchImpl:async()=>{fetches++;return response([{readTime:at}]);}});
 await assert.rejects(acquireReadTime({request,clock,timeoutMs:15}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);resolveToken('SYNTHETIC_ACCESS_TOKEN_ONLY');await new Promise(r=>setImmediate(r));assert.equal(fetches,0);
 await assert.rejects(acquireReadTime({request:()=>new Promise(()=>{}),clock,timeoutMs:15}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);
});
test('abort before start or during ignored request rejects without retry; config bounds cannot be raised',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();await assert.rejects(acquireReadTime({request:async()=>{calls++;},signal:controller.signal,clock}),/^Error: SNAPSHOT_READ_TIME_FAILED$/);assert.equal(calls,0);
 const next=new AbortController(),pending=acquireReadTime({request:()=>{calls++;return new Promise(()=>{});},signal:next.signal,clock});next.abort();await assert.rejects(pending,/READ_TIME_FAILED/);assert.equal(calls,1);
 for(const timeoutMs of [0,10001,1.5])await assert.rejects(acquireReadTime({request:async()=>raw([{readTime:at}]),timeoutMs,clock}),/READ_TIME_FAILED/);
});
