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
async function fixture(t){
 const db=new CommunityDB(),accounts=new AccountStore(db);for(const id of ['A','B'])await accounts.ensure({id});
 let budget=0,verifications=0,dropReceipt=false;
 const authenticate=createRequireAuth(async(value,revoked)=>{
  verifications++;assert.equal(revoked,true);
  const id=['A','B','U'].find(id=>value===token(id));if(!id)throw Error('Unknown synthetic actor');
  return {uid:id,aud:process.env.FIREBASE_PROJECT_ID||'connect-cv',email_verified:id!=='U',name:'PRIVATE_NAME_'+id,picture:'PRIVATE_AVATAR_'+id};
 });
 const app=express();app.use(express.json({limit:'100kb'}));
 app.use('/api/interview',(req,res,next)=>{
  const json=res.json.bind(res);res.json=body=>{if(dropReceipt&&req.path==='/debrief'&&res.statusCode===201){dropReceipt=false;res.destroy();return res;}return json(body);};
  if(req.method==='GET')return next();return authenticate(req,res,()=>requireVerified(req,res,next));
 },createFeatureSecurity({consumeBudget:async()=>{budget++;throw Error('Community must not consume AI budget');}}),actualRouter(db));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port+'/api/interview';
 async function request(path,{actor,body,method='POST',headers={}}={}){
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+token(actor)}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json(),cacheControl:response.headers.get('cache-control')};
 }
 return {db,request,dropNextReceipt:()=>{dropReceipt=true;},stats:()=>({budget,verifications})};
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

test('HTTP socket loss recovers exact owner receipt without another publication or credit award',async t=>{
 const f=await fixture(t);f.dropNextReceipt();await assert.rejects(f.request('/debrief',{actor:'A',body:payload()}),/fetch failed/);
 const view=await f.request('/community-questions',{method:'GET'});assert.equal(view.body.data.length,1);balance(f.db);
 const before=structuredClone([...f.db.records]);
 const retry=await f.request('/debrief',{actor:'A',body:payload()});assert.equal(retry.status,200);assert.equal(retry.body.data.alreadyShared,true);assert.equal(retry.body.data.awardedCredits,0);assert.equal(retry.body.data.creditStatus,'awarded');assert.equal(retry.body.data.debriefId,view.body.data[0].id);assert.deepEqual([...f.db.records],before);assert.equal(retry.cacheControl,'no-store');assert.equal(f.stats().budget,0);
 assert.doesNotMatch(JSON.stringify(retry.body),/PRIVATE_|ownerId|contentHash|likedUsers|reporterId/);
 const concurrent=await Promise.all(Array.from({length:4},()=>f.request('/debrief',{actor:'A',body:payload()})));assert.ok(concurrent.every(r=>r.status===200&&r.body.data.alreadyShared&&r.body.data.awardedCredits===0));assert.deepEqual([...f.db.records],before);
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
