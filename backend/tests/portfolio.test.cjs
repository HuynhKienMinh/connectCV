const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {PortfolioTestDB,fixtureRouter}=require('./helpers/portfolioFixture.cjs');
async function fixture(t){const db=new PortfolioTestDB(),app=express();app.use('/api/portfolios',fixtureRouter(db));app.use((e,req,res,next)=>res.status(e.status||500).json({success:false}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port+'/api/portfolios';return {db,request:async(path='',actor,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(actor?{'x-fixture-actor':actor}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};}};}
const input={title:'Synthetic portfolio',summary:'Synthetic project overview',published:false,projects:[{title:'Demo project',description:'Owned synthetic work',url:'https://example.invalid/project'}]};
test('drafts stay private, lists isolate actors, client owner spoof is rejected',async t=>{
 const f=await fixture(t);assert.equal((await f.request()).status,401);assert.equal((await f.request('', 'A','POST',{...input,ownerId:'B'})).status,400);
 const created=await f.request('','A','POST',input);assert.equal(created.status,201);const id=created.body.id;
 assert.equal((await f.request('/public/'+id)).status,404);assert.equal((await f.request('/public/'+id)).cache,'no-store');
 assert.equal((await f.request('','B')).body.portfolios.length,0);assert.equal((await f.request('','A')).body.portfolios.length,1);
 assert.equal(f.db.records.get('portfolios/'+id).ownerId,'A');
});
test('second account cannot overwrite or delete the owner document',async t=>{
 const f=await fixture(t),id=(await f.request('','A','POST',input)).body.id;
 assert.equal((await f.request('/'+id,'B','PUT',{...input,title:'forged'})).status,404);assert.equal((await f.request('/'+id,'B','DELETE')).status,404);
 assert.equal(f.db.records.get('portfolios/'+id).title,input.title);assert.equal(f.db.records.get('accounts/A').portfolioCount,1);
});
test('publish exposes allowlisted content; hide immediately returns 404/no-store',async t=>{
 const f=await fixture(t),id=(await f.request('','A','POST',input)).body.id;
 assert.equal((await f.request('/'+id,'A','PUT',{...input,published:true})).status,200);
 const view=await f.request('/public/'+id);assert.equal(view.status,200);assert.equal(view.cache,'no-store');assert.deepEqual(Object.keys(view.body.portfolio).sort(),['id','projects','summary','title']);
 await f.request('/'+id,'A','PUT',input);assert.equal((await f.request('/public/'+id)).status,404);
});
test('owner deletion updates count once, and invalid publication/link inputs fail',async t=>{
 const f=await fixture(t);for(const body of [{...input,published:'false'},{...input,projects:[{title:'demo',url:'javascript:alert(1)'}]}])assert.equal((await f.request('','A','POST',body)).status,400);
 const id=(await f.request('','A','POST',input)).body.id;assert.equal((await f.request('/'+id,'A','DELETE')).status,200);assert.equal(f.db.records.get('accounts/A').portfolioCount,0);assert.equal((await f.request('/'+id,'A','DELETE')).status,404);
});
test('concurrent creation respects the account limit in the transaction fixture',async t=>{
 const f=await fixture(t);f.db.records.set('accounts/A',{portfolioCount:29});
 const results=await Promise.all(Array.from({length:8},()=>f.request('','A','POST',input)));
 assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===429).length,7);assert.equal(f.db.records.get('accounts/A').portfolioCount,30);
});
