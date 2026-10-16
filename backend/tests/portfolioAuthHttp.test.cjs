'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {PortfolioTestDB}=require('./helpers/portfolioFixture.cjs');
const {createPortfolioRouter}=require('../src/routes/portfolios');
const {createRequireAuth}=require('../src/middlewares/firebaseAuth');
const {AccountStore}=require('../src/services/accountStore');
const origin='https://connect-cv.web.app';
const token=id=>'SYNTHETIC_LOCAL_PORTFOLIO_OPAQUE_'+id;
const input={title:'Hồ sơ freelancer giả',summary:'Nội dung giả để kiểm thử local.',published:false,projects:[{title:'Dự án giả',description:'Dữ kiện công khai được chọn.',url:'https://example.invalid/project'}]};
async function fixture(t){
 const db=new PortfolioTestDB(),store=new AccountStore(db),stats={verifies:[],database:0,ensure:0},saved=new Map(),oldOrigins=process.env.WEB_ORIGINS;
 const authenticate=createRequireAuth(async(value,revoked)=>{
  stats.verifies.push(value);assert.equal(revoked,true);
  const id=['A','B','ADMIN','EMPLOYER','UNVERIFIED','WRONG_AUD','REVOKED'].find(id=>value===token(id));
  if(!id||id==='REVOKED')throw Error('Synthetic revoked or invalid credential');
  return {uid:id==='UNVERIFIED'?'A':id,aud:id==='WRONG_AUD'?'other-project':process.env.FIREBASE_PROJECT_ID||'connect-cv',email_verified:id!=='UNVERIFIED',admin:id==='ADMIN',employer:id==='EMPLOYER',email:'synthetic-auth@example.invalid',name:'PRIVATE_AUTH_SENTINEL'};
 });
 const router=createPortfolioRouter({database:()=>{stats.database++;return db;},authenticate,ensureAccount:async user=>{stats.ensure++;return store.ensure(user);}});
 function mock(name,exports){const id=require.resolve(name);saved.set(id,require.cache[id]);require.cache[id]={loaded:true,exports};}
 mock('../src/routes/portfolios',router);mock('../src/routes/account',express.Router());mock('../features/connectcv/mount',()=>{});
 process.env.WEB_ORIGINS=origin;
 let app;
 try{app=require('../app').createApp({frontendDistPath:require('node:path').join(__dirname,'nonexistent-synthetic-frontend')});}
 finally{for(const [id,old]of saved)if(old)require.cache[id]=old;else delete require.cache[id];if(oldOrigins===undefined)delete process.env.WEB_ORIGINS;else process.env.WEB_ORIGINS=oldOrigins;}
 const server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port+'/api/portfolios';
 async function request({path='',actor,method='GET',body,raw,headers={}}={}){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+token(actor)}:{}),...headers},...(body!==undefined||raw!==undefined?{body:raw??JSON.stringify(body)}:{})});
  const text=await response.text();return {status:response.status,cache:response.headers.get('cache-control'),cors:response.headers.get('access-control-allow-origin'),vary:response.headers.get('vary'),text,body:text&&response.headers.get('content-type')?.includes('json')?JSON.parse(text):null};
 }
 return {db,stats,request};
}

test('actual app and Firebase middleware reject missing malformed revoked or wrong-audience credentials before DB and parser',async t=>{
 const f=await fixture(t);
 for(const authorization of ['', 'Basic synthetic','Bearer short']){
  const r=await f.request({method:'POST',raw:'x'.repeat(210*1024),headers:{Authorization:authorization,Origin:origin}});assert.equal(r.status,401);assert.equal(r.cache,'no-store');assert.equal(r.cors,origin);
 }
 assert.equal(f.stats.verifies.length,0);
 for(const actor of ['INVALID','REVOKED','WRONG_AUD']){const r=await f.request({actor});assert.equal(r.status,401);assert.equal(r.body.code,'SESSION_INVALID');assert.equal(r.cache,'no-store');}
 assert.equal(f.stats.database,0);assert.equal(f.stats.ensure,0);assert.equal(f.db.records.size,0);
 const before=f.stats.verifies.length;const denied=await f.request({actor:'A',method:'POST',body:input,headers:{Origin:'https://untrusted.example.invalid'}});assert.equal(denied.status,403);assert.equal(denied.body.code,'ORIGIN_DENIED');assert.equal(f.stats.verifies.length,before);assert.equal(f.stats.database,0);
});

test('verified bearer identity owns writes and lists; query/header spoof and admin/employer roles cannot cross owner boundary',async t=>{
 const f=await fixture(t);
 const bad=await f.request({actor:'A',method:'POST',body:{...input,ownerId:'B'}});assert.equal(bad.status,400);assert.equal(f.stats.ensure,0);
 const created=await f.request({path:'?uid=B&ownerId=B',actor:'A',method:'POST',body:input,headers:{'x-fixture-actor':'B','x-user-id':'B'}});assert.equal(created.status,201);const id=created.body.id;
 assert.equal(f.db.records.get('portfolios/'+id).ownerId,'A');assert.equal(f.db.records.get('accounts/A').portfolioCount,1);assert.equal(f.db.records.has('accounts/B'),false);
 for(const actor of ['B','ADMIN','EMPLOYER']){
  const list=await f.request({actor});assert.deepEqual(list.body.portfolios,[]);assert.equal(list.cache,'no-store');
  assert.equal((await f.request({path:'/'+id,actor,method:'PUT',body:{...input,title:'Forbidden overwrite'}})).status,404);
  assert.equal((await f.request({path:'/'+id,actor,method:'DELETE'})).status,404);
 }
 const owned=await f.request({actor:'A'});assert.equal(owned.body.portfolios.length,1);assert.ok(!('ownerId' in owned.body.portfolios[0]));assert.doesNotMatch(owned.text,/PRIVATE_AUTH_SENTINEL|synthetic-auth@example.invalid/);
 const head=await f.request({actor:'A',method:'HEAD'});assert.equal(head.status,200);assert.equal(head.text,'');assert.equal(head.cache,'no-store');assert.equal(f.db.records.get('portfolios/'+id).title,input.title);
});

test('unverified owner may read existing private drafts but cannot create/update before account ensure',async t=>{
 const f=await fixture(t),id=(await f.request({actor:'A',method:'POST',body:input})).body.id,before=structuredClone([...f.db.records]),ensures=f.stats.ensure;
 assert.equal((await f.request({actor:'UNVERIFIED'})).body.portfolios[0].id,id);
 for(const path of ['', '/'+id]){const r=await f.request({path,actor:'UNVERIFIED',method:path?'PUT':'POST',body:input});assert.equal(r.status,403);assert.equal(r.body.code,'EMAIL_NOT_VERIFIED');assert.equal(r.cache,'no-store');}
 assert.equal(f.stats.ensure,ensures);assert.deepEqual([...f.db.records],before);
});

test('anonymous GET and HEAD follow publish/hide state and never expose owner/auth/internal metadata or verify public bearer',async t=>{
 const f=await fixture(t),id=(await f.request({actor:'A',method:'POST',body:input})).body.id;
 for(const method of ['GET','HEAD']){const r=await f.request({path:'/public/'+id,method});assert.equal(r.status,404);assert.equal(r.cache,'no-store');if(method==='HEAD')assert.equal(r.text,'');}
 await f.request({path:'/'+id,actor:'A',method:'PUT',body:{...input,published:true}});
 const record=f.db.records.get('portfolios/'+id);record.internalAudit='PRIVATE_INTERNAL_SENTINEL';record.ownerEmail='private-owner@example.invalid';
 const checks=f.stats.verifies.length,ensures=f.stats.ensure;
 const visible=await f.request({path:'/public/'+id+'?ownerId=B',headers:{Authorization:'Bearer invalid-public-token',Origin:origin}});assert.equal(visible.status,200);assert.equal(visible.cors,origin);assert.match(visible.vary,/Origin/);assert.equal(visible.cache,'no-store');
 assert.deepEqual(Object.keys(visible.body.portfolio).sort(),['id','projects','summary','title']);assert.deepEqual(visible.body.portfolio.projects,input.projects);assert.doesNotMatch(visible.text,/PRIVATE_INTERNAL_SENTINEL|ownerId|ownerEmail|private-owner@example.invalid|PRIVATE_AUTH_SENTINEL/);
 const head=await f.request({path:'/public/'+id,method:'HEAD'});assert.equal(head.status,200);assert.equal(head.text,'');assert.equal(head.cache,'no-store');assert.equal(f.stats.verifies.length,checks);assert.equal(f.stats.ensure,ensures);
 await f.request({path:'/'+id,actor:'A',method:'PUT',body:input});for(const method of ['GET','HEAD'])assert.equal((await f.request({path:'/public/'+id,method})).status,404);
 const reads=f.stats.database;assert.equal((await f.request({path:'/public/bad%2Fid'})).status,404);assert.equal(f.stats.database,reads);
});

test('real parser and schema bounds reject invalid or oversized input before persistence and do not leak request text',async t=>{
 const f=await fixture(t);
 for(const body of [{...input,published:'false'},{...input,projects:Array.from({length:31},()=>({title:'Synthetic'}))},{...input,projects:[{title:'Synthetic',url:'javascript:alert(1)'}]},{...input,projects:[{title:'Synthetic',ownerEmail:'PRIVATE_REQUEST_SENTINEL'}]},{...input,summary:'x'.repeat(6001)}]){
  const r=await f.request({actor:'A',method:'POST',body});assert.equal(r.status,400);assert.equal(r.cache,'no-store');assert.doesNotMatch(r.text,/PRIVATE_REQUEST_SENTINEL|javascript|ownerEmail/);
 }
 for(const [raw,status]of [['{PRIVATE_MALFORMED',400],[JSON.stringify({...input,summary:'x'.repeat(210*1024)}),413]]){const r=await f.request({actor:'A',method:'POST',raw});assert.equal(r.status,status);assert.equal(r.cache,'no-store');assert.doesNotMatch(r.text,/PRIVATE_MALFORMED/);}
 assert.equal(f.stats.ensure,0);assert.equal(f.stats.database,0);assert.equal(f.db.records.size,0);
 const minimal=await f.request({actor:'A',method:'POST',body:{title:'Synthetic minimal'}});assert.equal(minimal.status,201);assert.deepEqual(f.db.records.get('portfolios/'+minimal.body.id).projects,[]);assert.equal(f.db.records.get('portfolios/'+minimal.body.id).published,false);
});

test('precommit transaction fault returns safe503 without partial portfolio/count; explicit retry creates exactly one stored document',async t=>{
 const f=await fixture(t),run=f.db.runTransaction.bind(f.db);let transactions=0;
 f.db.runTransaction=fn=>run(async tx=>{const result=await fn(tx);if(++transactions===2)throw Error('PRIVATE_STORAGE_SENTINEL');return result;});
 const failed=await f.request({actor:'A',method:'POST',body:input});assert.equal(failed.status,503);assert.equal(failed.cache,'no-store');assert.doesNotMatch(failed.text,/PRIVATE_STORAGE_SENTINEL/);assert.equal([...f.db.records.keys()].filter(p=>p.startsWith('portfolios/')).length,0);assert.equal(f.db.records.get('accounts/A').portfolioCount||0,0);
 const retried=await f.request({actor:'A',method:'POST',body:input});assert.equal(retried.status,201);assert.equal([...f.db.records.keys()].filter(p=>p.startsWith('portfolios/')).length,1);assert.equal(f.db.records.get('accounts/A').portfolioCount,1);
});
