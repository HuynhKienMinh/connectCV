const test=require('node:test'),assert=require('node:assert/strict');
const {createProfileAutosave}=require('../public/js/profile-autosave');
const {createFeatureSecurity}=require('../src/middlewares/featureSecurity');
test('slow profile writes are serialized and the latest edit survives',async()=>{
 let release;const writes=[],states=[];
 const saver=createProfileAutosave({delay:60000,status:s=>states.push(s),write:async p=>{writes.push(p);if(writes.length===1)await new Promise(r=>release=r);}});
 saver.seed({fullName:'Original'});saver.change({fullName:'First'});const pending=saver.flush();
 saver.change({fullName:'Latest',education:[{school:'Fixture school',time:'2023-2027'}]});
 assert.equal(writes.length,1);release();await pending;
 assert.equal(writes.length,2);assert.equal(writes[1].fullName,'Latest');assert.equal(states.at(-1),'saved');saver.dispose();
});
test('failed profile writes never claim success and can be saved again',async()=>{
 let failing=true;const states=[],writes=[];
 const saver=createProfileAutosave({delay:60000,status:s=>states.push(s),write:async p=>{if(failing)throw Error('offline');writes.push(p);}});
 saver.change({fullName:'Retained'});await saver.flush();assert.equal(states.at(-1),'error');
 failing=false;await saver.flush();assert.equal(writes[0].fullName,'Retained');assert.equal(states.at(-1),'saved');saver.dispose();
});
test('typing and local matching do not consume AI budget or prevent generation; AI limits still hold',async()=>{
 let budget=0;const middleware=createFeatureSecurity({consumeBudget:async()=>budget++,clock:()=>1000});
 async function request(path,id='fixture'){
  let passed=false,status=200;const req={method:'POST',baseUrl:'/api/cv',path,user:{id},body:{profile:{}},socket:{remoteAddress:'proxy'}};
  const res={setHeader(){},status(n){status=n;return this;},json(){}};
  await middleware(req,res,()=>passed=true);return {passed,status};
 }
 for(let i=0;i<40;i++)assert.equal((await request(i%2?'/templates/recommend':'/auto-match-jobs')).passed,true);
 assert.equal(budget,0);
 for(let i=0;i<15;i++)assert.equal((await request('/generate')).passed,true);
 assert.equal(budget,15);assert.equal((await request('/generate')).status,429);
 assert.equal((await request('/generate','other-account')).passed,true);
 assert.equal((await request('/auto-match-jobs')).passed,true);
});
