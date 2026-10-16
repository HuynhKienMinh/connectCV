'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),util=require('node:util');
const {createSnapshotCredential}=require('../ops/snapshotCredential.cjs');
const TOKEN='SYNTHETIC_TOKEN_NO_REAL_ACCOUNT',good=()=>({access_token:TOKEN,expires_in:3600});
const create=(options={})=>createSnapshotCredential({projectId:'connect-cv',credential:{getAccessToken:async()=>good()},...options});
test('adapter is lazy, retains Credential receiver and shares one lookup across all session callers',async()=>{
 let calls=0,release;const credential={marker:true,getAccessToken(){assert.equal(this,credential);calls++;return new Promise(r=>release=r);}};
 const session=create({credential});assert.equal(calls,0);const pending=Array.from({length:12},()=>session.getAccessToken());await new Promise(r=>setImmediate(r));assert.equal(calls,1);release(good());assert.deepEqual(await Promise.all(pending),Array(12).fill(TOKEN));assert.equal(await session.getAccessToken(),TOKEN);assert.equal(calls,1);
 assert.ok(!JSON.stringify(session).includes(TOKEN));assert.ok(!util.inspect(session).includes(TOKEN));session.close();await assert.rejects(session.getAccessToken(),/^Error: SNAPSHOT_CREDENTIAL_FAILED$/);
});
test('wrong project/missing provider/raised deadlines fail without credential discovery',()=>{
 let calls=0;const credential={getAccessToken:()=>{calls++;return good();}};
 for(const options of [{projectId:'other-project'},{projectId:undefined},{credential:{}},{timeoutMs:0},{timeoutMs:10001}])assert.throws(()=>create({credential,...options}),/^Error: SNAPSHOT_CREDENTIAL_FAILED$/);assert.equal(calls,0);
});
test('session stops after 150s without silently refreshing, extending token lifetime or returning cached token',async()=>{
 let at=0,calls=0;const session=create({clock:()=>at,credential:{getAccessToken:async()=>{calls++;return good();}}});assert.equal(await session.getAccessToken(),TOKEN);at=149999;assert.equal(await session.getAccessToken(),TOKEN);at=150000;await assert.rejects(session.getAccessToken(),/CREDENTIAL_FAILED/);assert.equal(calls,1);
});
test('token/expiry contract, provider failures and backward/invalid clocks are sanitized and permanently close session',async()=>{
 for(const result of [null,{},'TOKEN_SENTINEL',{access_token:'short',expires_in:3600},{access_token:TOKEN+'\n',expires_in:3600},{access_token:TOKEN,expires_in:179},{access_token:TOKEN,expires_in:3601},{access_token:TOKEN,expires_in:'3600'},{access_token:TOKEN,expires_in:180.5}]){
  let calls=0;const s=create({credential:{getAccessToken:async()=>{calls++;return result;}}});for(let i=0;i<2;i++)await assert.rejects(s.getAccessToken(),/^Error: SNAPSHOT_CREDENTIAL_FAILED$/);assert.equal(calls,1);
 }
 const failed=create({credential:{getAccessToken:async()=>{throw Error('PRIVATE_SECRET_SENTINEL');}}});await assert.rejects(failed.getAccessToken(),/^Error: SNAPSHOT_CREDENTIAL_FAILED$/);
 for(const invalid of [-1,NaN,Infinity]){let at=0;const s=create({clock:()=>at});await s.getAccessToken();at=invalid;await assert.rejects(s.getAccessToken(),/CREDENTIAL_FAILED/);}
});
test('timeout or close prevents late token from reviving session and never retries provider',async()=>{
 for(const mode of ['timeout','close']){
  let release,calls=0;const s=create({timeoutMs:15,credential:{getAccessToken:()=>{calls++;return new Promise(r=>release=r);}}});const pending=s.getAccessToken();await new Promise(r=>setImmediate(r));if(mode==='close')s.close();await assert.rejects(pending,/CREDENTIAL_FAILED/);release(good());await new Promise(r=>setImmediate(r));await assert.rejects(s.getAccessToken(),/CREDENTIAL_FAILED/);assert.equal(calls,1);
 }
});
test('abort before lookup or while lookup is pending closes all waiters and cannot trigger later lookup',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();const before=create({signal:controller.signal,credential:{getAccessToken:async()=>{calls++;return good();}}});await assert.rejects(before.getAccessToken(),/CREDENTIAL_FAILED/);assert.equal(calls,0);
 let release;const next=new AbortController(),during=create({signal:next.signal,credential:{getAccessToken:()=>{calls++;return new Promise(r=>release=r);}}});const a=during.getAccessToken(),b=during.getAccessToken();await new Promise(r=>setImmediate(r));next.abort();await Promise.all([assert.rejects(a,/CREDENTIAL_FAILED/),assert.rejects(b,/CREDENTIAL_FAILED/)]);release(good());assert.equal(calls,1);
});
test('fake Credential composes through fixed readTime and collector transport without token in URL or snapshot',async()=>{
 const {createFirestoreReadTransport}=require('../ops/firestoreReadTransport.cjs'),{acquireReadTime}=require('../ops/snapshotReadTime.cjs'),{collectSnapshot}=require('../ops/snapshotCollector.cjs');
 let lookups=0;const session=create({credential:{getAccessToken:async()=>{lookups++;return good();}}}),at='2026-10-16T06:49:30.123456Z',clock=()=>Date.parse('2026-10-16T06:49:34Z');
 const request=createFirestoreReadTransport({getAccessToken:session.getAccessToken,fetchImpl:async(url,options)=>{assert.ok(!url.includes(TOKEN));assert.equal(options.headers.Authorization,'Bearer '+TOKEN);return new Response(JSON.stringify(url.endsWith(':runQuery')?[{readTime:at}]:{}),{headers:{'Content-Type':'application/json'}});}});
 try{const readTime=await acquireReadTime({request,clock}),snapshot=await collectSnapshot({request,readTime,clock});assert.equal(snapshot.documents.length,0);assert.equal(snapshot.readTime,at);assert.equal(lookups,1);assert.ok(!JSON.stringify(snapshot).includes(TOKEN));}finally{session.close();}
});
