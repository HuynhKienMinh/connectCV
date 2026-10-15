'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {PortfolioTestDB}=require('./helpers/portfolioFixture.cjs');
const {AccountStore}=require('../src/services/accountStore');
const {createRequireAuth,requireVerified}=require('../src/middlewares/firebaseAuth');
const {createFeatureSecurity}=require('../features/connectcv/src/middlewares/featureSecurity');

// Local transaction model only: no Firebase SDK/network, real tokens, provider calls or disk store.
class CommunityDB extends PortfolioTestDB{
 collection(name){
  const query=(max=Infinity,key=null,direction='asc')=>({
   orderBy:(k,d)=>query(max,k,d),limit:n=>query(n,key,direction),
   get:async()=>({docs:[...this.records.keys()].filter(p=>p.startsWith(name+'/')&&p.slice(name.length+1).indexOf('/')===-1)
    .sort((a,b)=>key?String(this.records.get(a)[key]).localeCompare(String(this.records.get(b)[key]))*(direction==='desc'?-1:1):0)
    .slice(0,max).map(p=>this.snapshot(p))})
  });
  return {...query(),doc:id=>this.ref(name+'/'+id)};
 }
 ref(path){return {...super.ref(path),collection:name=>this.collection(path+'/'+name)};}
}
function actualRouter(db){
 const mocks={
  '../features/connectcv/src/services/geminiService':{callGeminiJSON(){throw Error('AI forbidden in community fixture');},callGeminiText(){throw Error('AI forbidden in community fixture');}},
  '../features/connectcv/src/services/ttsService':{generateSpeechMP3(){throw Error('TTS forbidden in community fixture');}},
  '../src/config/firebase':{db:()=>db}
 };
 const saved=new Map(),routeId=require.resolve('../features/connectcv/src/routes/interview'),previousRoute=require.cache[routeId],backend=process.env.FEATURE_STORE_BACKEND;
 try{
  process.env.FEATURE_STORE_BACKEND='firestore';
  for(const [name,exports]of Object.entries(mocks)){const id=require.resolve(name);saved.set(id,require.cache[id]);require.cache[id]={loaded:true,exports};}
  delete require.cache[routeId];return require(routeId);
 }finally{
  for(const [id,previous]of saved)if(previous)require.cache[id]=previous;else delete require.cache[id];
  if(previousRoute)require.cache[routeId]=previousRoute;else delete require.cache[routeId];
  if(backend===undefined)delete process.env.FEATURE_STORE_BACKEND;else process.env.FEATURE_STORE_BACKEND=backend;
 }
}
const payload=()=>({companyName:'Công ty Giả Lập',position:'Chuyên viên bán lẻ',interviewQuestions:['Bạn xử lý yêu cầu đổi hàng của khách như thế nào?'],reviewText:'Buổi phỏng vấn hư cấu dùng cho kiểm thử.',anonymous:true,publicAcknowledged:true,difficultyRating:3});
const token=id=>'SYNTHETIC_LOCAL_ACTOR_'+id;
function actualMount(app,router,authenticate,guard){
 const mocks={
  '../features/connectcv/src/middlewares/featureSecurity':{featureSecurity:guard},
  '../features/connectcv/src/routes/interview':router,
  '../features/connectcv/src/routes/cv':express.Router(),
  '../features/connectcv/src/routes/chatbot':express.Router(),
  '../features/connectcv/src/routes/upload':express.Router()
 },saved=new Map(),id=require.resolve('../features/connectcv/mount'),previous=require.cache[id];
 try{
  for(const [name,exports]of Object.entries(mocks)){const key=require.resolve(name);saved.set(key,require.cache[key]);require.cache[key]={loaded:true,exports};}
  delete require.cache[id];require(id)(app,{authenticate});
 }finally{
  for(const [key,value]of saved)if(value)require.cache[key]=value;else delete require.cache[key];
  if(previous)require.cache[id]=previous;else delete require.cache[id];
 }
}
async function fixture(t){
 const db=new CommunityDB(),accounts=new AccountStore(db);for(const id of ['A','B'])await accounts.ensure({id});
 let budget=0,verifications=0,dropReceipt=null;
 const authenticate=createRequireAuth(async(value,revoked)=>{
  verifications++;assert.equal(revoked,true);
  const id=['A','B','U','ADMIN'].find(id=>value===token(id));if(!id)throw Error('Unknown synthetic actor');
  return {uid:id,aud:process.env.FIREBASE_PROJECT_ID||'connect-cv',email_verified:id!=='U',admin:id==='ADMIN',name:'PRIVATE_NAME_'+id,picture:'PRIVATE_AVATAR_'+id};
 });
 const app=express();
 app.use('/api/interview',(req,res,next)=>{
  const json=res.json.bind(res);res.json=body=>{if(req.path===dropReceipt&&res.statusCode<300){dropReceipt=null;res.destroy();return res;}return json(body);};
  next();
 });
 actualMount(app,actualRouter(db),(req,res,next)=>authenticate(req,res,()=>requireVerified(req,res,next)),createFeatureSecurity({consumeBudget:async()=>{budget++;throw Error('Community must not consume AI budget');}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port+'/api/interview';
 async function request(path,{actor,body,method='POST',headers={}}={}){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+token(actor)}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:method==='HEAD'?null:await response.json(),cacheControl:response.headers.get('cache-control')};
 }
 return {db,request,dropNextReceipt:(path='/debrief')=>{dropReceipt=path;},stats:()=>({budget,verifications})};
}
const count=(db,name)=>[...db.records.keys()].filter(k=>k.startsWith(name+'/')&&k.split('/').length===2).length;
function balance(db,a=20,b=15){assert.equal(db.records.get('accounts/A').credits,a);assert.equal(db.records.get('accounts/B').credits,b);assert.equal(db.records.get('accounts/A').dailyCount,0);assert.equal(db.records.get('accounts/B').dailyCount,0);}

test('HTTP rejects anonymous, forged-session, unverified and nonconsenting/contact publications before writes or AI quota',async t=>{
 const f=await fixture(t),initial=structuredClone([...f.db.records]);
 assert.equal((await f.request('/debrief',{body:{...payload(),userId:'A',emailVerified:true}})).status,401);
 assert.equal((await f.request('/debrief',{body:payload(),headers:{Authorization:'Bearer SYNTHETIC_INVALID_SESSION'}})).status,401);
 assert.equal((await f.request('/debrief',{actor:'U',body:payload()})).status,403);
 for(const body of [{...payload(),publicAcknowledged:false},{...payload(),reviewText:'Liên hệ synthetic@example.invalid để trao đổi.'}])assert.equal((await f.request('/debrief',{actor:'A',body})).status,400);
 assert.deepEqual([...f.db.records],initial);assert.equal(f.stats().budget,0);
});

test('HTTP publication binds reward to verified actor and anonymous public GET excludes private and forged metadata',async t=>{
 const f=await fixture(t),r=await f.request('/debrief',{actor:'A',body:{...payload(),ownerId:'B',userId:'B',credits:999,authorName:'FORGED_NAME',authorAvatar:'FORGED_AVATAR',role:'admin',profile:{email:'PRIVATE_PROFILE'}}});
 assert.equal(r.status,201);assert.equal(r.body.data.awardedCredits,5);balance(f.db);
 assert.equal(f.db.records.get('communityPosts/'+r.body.data.debriefId).ownerId,'A');
 const view=await f.request('/community-questions?category=Business&q=đổi%20hàng',{method:'GET'});
 assert.equal(view.status,200);assert.equal(view.body.totalEntries,1);assert.equal(view.body.data[0].authorName,'Ứng viên Ẩn danh');assert.equal(view.body.data[0].authorAvatar,'');
 assert.equal(view.body.data[0].id,r.body.data.debriefId);assert.doesNotMatch(JSON.stringify(view.body),/PRIVATE_|FORGED_|ownerId|contentHash|rewardId|creditStatus|likedUsers|likedIps/);assert.equal(f.stats().budget,0);
});

test('HTTP concurrent drafts enforce account cooldown and second actor duplicate receives no reward receipt',async t=>{
 const f=await fixture(t),bodies=Array.from({length:4},(_,i)=>({...payload(),companyName:'Công ty Giả Lập '+i}));
 const responses=await Promise.all(bodies.map(body=>f.request('/debrief',{actor:'A',body})));
 assert.equal(responses.filter(r=>r.status===201).length,1);assert.equal(responses.filter(r=>r.status===429).length,3);balance(f.db);
 const winner=responses.findIndex(r=>r.status===201),other=await f.request('/debrief',{actor:'B',body:bodies[winner]});
 assert.equal(other.status,409);assert.equal(other.body.data,undefined);assert.doesNotMatch(JSON.stringify(other.body),/rewardId|debriefId|PRIVATE_|ownerId/);
 assert.equal(count(f.db,'communityPosts'),1);assert.equal(count(f.db,'creditEvents'),1);assert.equal(f.stats().budget,0);
});

test('HTTP socket loss after committed publication leaves one reward; same-owner retry currently returns 409 without receipt',async t=>{
 const f=await fixture(t);f.dropNextReceipt();await assert.rejects(f.request('/debrief',{actor:'A',body:payload()}),/fetch failed/);
 const view=await f.request('/community-questions',{method:'GET'});assert.equal(view.body.data.length,1);balance(f.db);
 const retry=await f.request('/debrief',{actor:'A',body:payload()});assert.equal(retry.status,409);assert.equal(retry.body.data,undefined);
 assert.equal(count(f.db,'communityPosts'),1);assert.equal(count(f.db,'creditEvents'),1);balance(f.db);
});

test('HTTP dedupe omits review and questions after five: edited payload is rejected, never mistaken for exact retry receipt',async t=>{
 const f=await fixture(t),body={...payload(),interviewQuestions:Array.from({length:6},(_,i)=>'Bạn xử lý tình huống bán lẻ số '+i+' như thế nào?')};
 assert.equal((await f.request('/debrief',{actor:'A',body})).status,201);
 const edited={...body,reviewText:'Đánh giá hư cấu đã chỉnh sửa hoàn toàn.',interviewQuestions:[...body.interviewQuestions.slice(0,5),'Bạn hỗ trợ thành viên mới trong ca trực như thế nào?']};
 const r=await f.request('/debrief',{actor:'A',body:edited});assert.equal(r.status,409);assert.equal(r.body.data,undefined);
 const post=[...f.db.records].find(([k])=>k.startsWith('communityPosts/'))[1];assert.equal(post.reviewText,body.reviewText);assert.deepEqual(post.interviewQuestions,body.interviewQuestions);balance(f.db);
});

test('HTTP cooldown expiry allows a distinct publication; like identities remain private and toggling never changes credits',async t=>{
 const f=await fixture(t),first=await f.request('/debrief',{actor:'A',body:payload()});assert.equal(first.status,201);
 f.db.records.get('accounts/A').lastCommunityAt=Date.now()-21600001;
 assert.equal((await f.request('/debrief',{actor:'A',body:{...payload(),companyName:'Công ty Giả Lập Khác'}})).status,201);balance(f.db,25,15);
 const path='/community-questions/'+first.body.data.debriefId+'/like';
 assert.equal((await f.request(path,{body:{}})).status,401);
 for(const [actor,count,liked]of [['A',1,true],['B',2,true],['A',1,false]]){
  const r=await f.request(path,{actor,body:{ownerId:'OTHER',likesCount:999}});assert.equal(r.status,200);assert.equal(r.body.data.likesCount,count);assert.equal(r.body.data.hasLiked,liked);
 }
 const view=await f.request('/community-questions?sort=popular',{method:'GET'});assert.equal(view.body.data[0].likesCount,1);assert.doesNotMatch(JSON.stringify(view.body),/PRIVATE_|ownerId|contentHash|likedUsers|likedIps/);balance(f.db,25,15);assert.equal(f.stats().budget,0);
});

test('HTTP reports bind to verified actor, dedupe concurrent retries, reject invalid reasons and never reward or auto-hide',async t=>{
 const f=await fixture(t),post=await f.request('/debrief',{actor:'A',body:payload()}),id=post.body.data.debriefId,path='/community-questions/'+id+'/report';
 for(const [actor,reason,status]of [[undefined,'spam',401],['U','spam',403],['B','unknown',400],['B',{spam:true},400]])assert.equal((await f.request(path,{actor,body:{reason}})).status,status);
 assert.equal(count(f.db,'communityReports'),0);
 const reports=await Promise.all(Array.from({length:4},()=>f.request(path,{actor:'B',body:{reason:'personal-information',reporterId:'A',role:'admin',reviewText:'PRIVATE_IGNORED_TEXT',credits:999}})));
 assert.ok(reports.every(r=>r.status===200&&r.body.data.status==='received'));
 assert.equal(new Set(reports.map(r=>r.body.data.reportId)).size,1);assert.equal(reports.filter(r=>!r.body.data.alreadyReported).length,1);
 const stored=[...f.db.records].find(([k])=>k.startsWith('communityReports/'))[1];assert.equal(stored.reporterId,'B');assert.equal(stored.reason,'personal-information');assert.doesNotMatch(JSON.stringify(stored),/PRIVATE_|credits|role|reviewText/);
 assert.equal((await f.request(path,{actor:'A',body:{reason:'other'}})).status,200);assert.equal(count(f.db,'communityReports'),2);
 const view=await f.request('/community-questions',{method:'GET'});assert.equal(view.body.data.length,1);assert.doesNotMatch(JSON.stringify(view.body),/reporterId|reportId|personal-information|PRIVATE_/);balance(f.db);assert.equal(count(f.db,'creditEvents'),1);assert.equal(f.stats().budget,0);
});

test('actual mount protects private report GET/HEAD including case and trailing slash; only trusted verified admin sees bounded projection',async t=>{
 const f=await fixture(t),post=await f.request('/debrief',{actor:'A',body:payload()});
 await f.request('/community-questions/'+post.body.data.debriefId+'/report',{actor:'B',body:{reason:'spam'}});
 for(const method of ['GET','HEAD'])for(const [actor,status]of [[undefined,401],['U',403],['A',403],['B',403],['ADMIN',200]]){
  const r=await f.request('/COMMUNITY-REPORTS/',{actor,method,headers:{'X-Role':'admin','X-User-Id':'ADMIN'}});assert.equal(r.status,status);assert.equal(r.cacheControl,'no-store');
  if(actor==='ADMIN'&&method==='GET'){assert.equal(r.body.data.length,1);assert.equal(r.body.data[0].reason,'spam');assert.doesNotMatch(JSON.stringify(r.body),/reporterId|PRIVATE_|credits|rewardId|ownerId/);}
 }
 balance(f.db);assert.equal(f.stats().budget,0);
});

test('reader compatibility hides synthetic hidden/unknown states from data, totals, search, top companies, likes and reports',async t=>{
 const f=await fixture(t),post=await f.request('/debrief',{actor:'A',body:payload()}),id=post.body.data.debriefId;
 for(const status of ['hidden','future-state',null]){
  f.db.records.get('communityPosts/'+id).moderationStatus=status;
  const view=await f.request('/community-questions?q=Giả',{method:'GET'});assert.equal(view.cacheControl,'no-store');assert.equal(view.body.totalEntries,0);assert.equal(view.body.allTotalCount,0);assert.deepEqual(view.body.topCompanies,[]);assert.deepEqual(view.body.data,[]);
  assert.equal((await f.request('/community-questions/'+id+'/like',{actor:'B',body:{}})).status,404);
  assert.equal((await f.request('/community-questions/'+id+'/report',{actor:'B',body:{reason:'spam'}})).status,404);
 }
 assert.equal(count(f.db,'communityReports'),0);balance(f.db);
 f.db.records.get('communityPosts/'+id).moderationStatus='visible';assert.equal((await f.request('/community-questions',{method:'GET'})).body.totalEntries,1);
});

test('HTTP lost report receipt recovers idempotently while a second reporter receives a separate private receipt',async t=>{
 const f=await fixture(t),post=await f.request('/debrief',{actor:'A',body:payload()}),path='/community-questions/'+post.body.data.debriefId+'/report';
 f.dropNextReceipt(path);await assert.rejects(f.request(path,{actor:'B',body:{reason:'spam'}}),/fetch failed/);
 const retry=await f.request(path,{actor:'B',body:{reason:'harassment'}});assert.equal(retry.status,200);assert.equal(retry.body.data.alreadyReported,true);assert.equal(count(f.db,'communityReports'),1);
 const other=await f.request(path,{actor:'A',body:{reason:'other'}});assert.notEqual(other.body.data.reportId,retry.body.data.reportId);assert.equal(other.body.data.alreadyReported,false);
 const queue=await f.request('/community-reports',{actor:'ADMIN',method:'GET'});assert.deepEqual(queue.body.data.map(r=>r.reason).sort(),['other','spam']);assert.doesNotMatch(JSON.stringify(queue.body),/reporterId|PRIVATE_|credit/);balance(f.db);
});

test('admin report queue is bounded even when the local model contains more than one hundred reports',async t=>{
 const f=await fixture(t);for(let i=0;i<105;i++)f.db.records.set('communityReports/report-'+i,{postId:'synthetic-post',reporterId:'PRIVATE_REPORTER',reason:'spam',createdAt:new Date(i*1000).toISOString(),status:'received'});
 const queue=await f.request('/community-reports',{actor:'ADMIN',method:'GET'});assert.equal(queue.body.data.length,100);assert.equal(queue.body.data[0].reportId,'report-104');assert.equal(queue.body.data.at(-1).reportId,'report-5');assert.doesNotMatch(JSON.stringify(queue.body),/PRIVATE_REPORTER|reporterId/);
});

test('local file store retains report receipt across restart and filters hidden content without mutating reward ledger',async t=>{
 const fs=require('node:fs/promises'),path=require('node:path'),{CommunityStore}=require('../features/connectcv/src/services/communityStore');
 const root=path.resolve(__dirname),dir=await fs.mkdtemp(path.join(root,'.tmp-community-'));
 t.after(async()=>{const resolved=path.resolve(dir);assert.ok(resolved.startsWith(root+path.sep+'.tmp-community-'));await fs.rm(resolved,{recursive:true,force:true});});
 const file=path.join(dir,'state.json'),store=new CommunityStore(file),created=await store.submit({id:'A'},payload(),'synthetic-local-hash');
 const receipt=await store.report({id:'B'},created.debriefId,{reason:'spam',reporterId:'FORGED'}),ledger=structuredClone(store.state.ledger);
 const restored=new CommunityStore(file),retry=await restored.report({id:'B'},created.debriefId,{reason:'other'});assert.equal(retry.reportId,receipt.reportId);assert.equal(retry.alreadyReported,true);assert.equal(restored.state.reports.length,1);assert.equal(restored.state.reports[0].reporterId,'B');assert.deepEqual(restored.state.ledger,ledger);
 assert.throws(()=>restored.reports({id:'B',role:'candidate',emailVerified:true}),e=>e.status===403);
 assert.doesNotMatch(JSON.stringify(restored.reports({id:'ADMIN',role:'admin',emailVerified:true})),/reporterId|FORGED/);
 await restored.transaction(s=>{s.entries[0].moderationStatus='hidden';});assert.deepEqual(restored.list(),[]);
 await assert.rejects(restored.like({id:'B'},created.debriefId),e=>e.status===404);assert.deepEqual(restored.state.ledger,ledger);
});
