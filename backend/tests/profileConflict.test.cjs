const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {PortfolioTestDB}=require('./helpers/portfolioFixture.cjs');
const {AccountStore}=require('../src/services/accountStore');
const {profileVersion}=require('../src/services/profileVersion');
test('two stale-tab writes cannot overwrite each other and credits remain separate',async()=>{
 const db=new PortfolioTestDB(),store=new AccountStore(db),user={id:'A'},base=profileVersion('A',{});
 await store.ensure(user);await store.ensure({id:'B'});
 const recent=await store.saveProfile(user,{summary:'Recent tab'},base);
 await assert.rejects(store.saveProfile(user,{summary:'Stale tab'},base),e=>e.status===409&&e.code==='PROFILE_CONFLICT');
 assert.equal(db.records.get('accounts/A').profile.summary,'Recent tab');assert.equal(db.records.get('accounts/A').credits,15);assert.deepEqual(db.records.get('accounts/B').profile,{});
 await store.saveProfile(user,{summary:'Resolved tab'},recent.profileVersion);assert.equal(db.records.get('accounts/A').profile.summary,'Resolved tab');
});
test('same-content retry is safe; versions ignore key order and unrelated credit changes',async()=>{
 const db=new PortfolioTestDB(),store=new AccountStore(db),user={id:'A'},base=profileVersion('A',{});const data={fullName:'Synthetic',skills:['SQL'],summary:'Source'};
 const first=await store.saveProfile(user,data,base),before=db.records.get('accounts/A').updatedAt;
 await store.consume('A');const repeat=await store.saveProfile(user,{summary:'Source',skills:['SQL'],fullName:'Synthetic'},base);
 assert.equal(repeat.profileVersion,first.profileVersion);assert.equal(db.records.get('accounts/A').updatedAt,before);assert.equal(db.records.get('accounts/A').dailyCount,1);
 assert.notEqual(profileVersion('B',data),first.profileVersion);
});
test('missing or wildcard versions fail before writes, and concurrent different drafts allow one winner',async()=>{
 const db=new PortfolioTestDB(),store=new AccountStore(db),user={id:'A'};
 for(const tag of [undefined,'*','W/"tag"'])await assert.rejects(store.saveProfile(user,{summary:'Draft'},tag),e=>e.status===428);
 assert.equal(db.records.size,0);await store.ensure(user);const base=profileVersion('A',{});
 const runs=await Promise.allSettled(Array.from({length:8},(_,i)=>store.saveProfile(user,{summary:'Draft '+i},base)));
 assert.equal(runs.filter(r=>r.status==='fulfilled').length,1);assert.equal(runs.filter(r=>r.status==='rejected'&&r.reason.status===409).length,7);
});
test('HTTP contract exposes own opaque version, rejects stale/legacy saves without source echo',async t=>{
 const db=new PortfolioTestDB(),store=new AccountStore(db),app=express();app.use('/api/account',require('../src/routes/account').createAccountRouter({accountStore:()=>store,authenticate:(req,res,next)=>{req.user={id:'A'};next();}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port+'/api/account';
 const initial=await(await fetch(base+'/me')).json();assert.match(initial.profileVersion,/^"[a-f0-9]{64}"$/);
 const put=async(summary,version)=>{const r=await fetch(base+'/profile',{method:'PUT',headers:{'Content-Type':'application/json',...(version?{'If-Match':version}:{})},body:JSON.stringify({summary})});return {status:r.status,body:await r.json()};};
 assert.equal((await put('Recent',initial.profileVersion)).status,200);const stale=await put('PRIVATE_SENTINEL',initial.profileVersion);assert.equal(stale.status,409);assert.equal(stale.body.code,'PROFILE_CONFLICT');assert.ok(!JSON.stringify(stale.body).includes('PRIVATE_SENTINEL'));assert.equal((await put('Legacy')).status,428);
 assert.equal(db.records.get('accounts/A').profile.summary,'Recent');
});
