'use strict';
// Actual feature mount, trusted synthetic identity and stubbed AI. No cloud calls.
const test=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createRequireAuth,requireVerified}=require('../src/middlewares/firebaseAuth');
const {createFeatureSecurity}=require('../features/connectcv/src/middlewares/featureSecurity');
const actor=id=>'SYNTHETIC_LOCAL_INTERVIEW_ACTOR_'+id;
const startBody={action:'start',industry:'software-engineering',level:'fresher',jobTitle:'Lập trình viên backend'};
async function fixture(t,{provider=async()=>({relevance:'unclear',correctness:'not_assessed',answerEvidence:[],questionEvidence:'',missingPoints:[]})}={}){
 const saved=new Map(),stats={prompts:[],budget:[]},previousStore=process.env.FEATURE_STORE_BACKEND;
 const remember=id=>{if(!saved.has(id))saved.set(id,require.cache[id]);};
 const mock=(name,exports)=>{const id=require.resolve(name);remember(id);require.cache[id]={loaded:true,exports};};
 process.env.FEATURE_STORE_BACKEND='file';
 mock('../features/connectcv/src/services/geminiService',{
  callGeminiJSON:async prompt=>{stats.prompts.push(prompt);return provider(prompt);},
  callGeminiText:async()=>{throw Error('Unexpected synthetic text provider call');},
  genAI:{getGenerativeModel(){throw Error('Unexpected synthetic audio provider call');}}
 });
 mock('../features/connectcv/src/services/ttsService',{generateSpeechMP3:async()=>{throw Error('No real speech service allowed');}});
 const routeId=require.resolve('../features/connectcv/src/routes/interview');remember(routeId);delete require.cache[routeId];const router=require(routeId);
 const auth=createRequireAuth(async(token,revoked)=>{assert.equal(revoked,true);const id=['A','U'].find(x=>token===actor(x));if(!id)throw Error('Unknown synthetic actor');return {uid:id,aud:process.env.FIREBASE_PROJECT_ID||'connect-cv',email_verified:id==='A'};});
 const guard=createFeatureSecurity({consumeBudget:async id=>stats.budget.push(id)});
 mock('../features/connectcv/src/middlewares/featureSecurity',{featureSecurity:guard});mock('../features/connectcv/src/routes/interview',router);
 for(const name of ['cv','chatbot','upload'])mock('../features/connectcv/src/routes/'+name,express.Router());
 const mountId=require.resolve('../features/connectcv/mount');remember(mountId);delete require.cache[mountId];
 const app=express();require(mountId)(app,{authenticate:(req,res,next)=>auth(req,res,()=>requireVerified(req,res,next))});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 t.after(()=>{server.closeAllConnections();server.close();for(const[id,old]of saved)if(old)require.cache[id]=old;else delete require.cache[id];if(previousStore===undefined)delete process.env.FEATURE_STORE_BACKEND;else process.env.FEATURE_STORE_BACKEND=previousStore;});
 async function request({body=startBody,identity='A',path='/live-chat',method='POST',raw}={}){
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/interview'+path,{method,headers:{'Content-Type':'application/json',...(identity?{Authorization:'Bearer '+(identity==='forged'?'SYNTHETIC_FORGED_SESSION':actor(identity))}:{})},...(method==='GET'?{}:{body:raw===undefined?JSON.stringify(body):raw})});
  return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
 }
 return {stats,request};
}
const questionOf=response=>response.body.data.currentQuestion;
function replyFor(question,message,extra={}){return {...startBody,action:'reply',currentQuestionId:question.id,askedQuestionIds:[question.id],history:[{role:'interviewer',message:question.question},{role:'candidate',message}],message,...extra};}

test('actual interview mount rejects missing, forged and unverified identity before coaching/provider/budget',async t=>{
 const f=await fixture(t);
 for(const[identity,status]of [[null,401],['forged',401],['U',403]])assert.equal((await f.request({identity})).status,status);
 assert.equal(f.stats.prompts.length,0);assert.equal(f.stats.budget.length,0);
});

test('invalid live-coaching inputs fail before provider or daily AI budget',async t=>{
 const f=await fixture(t);
 for(const body of [
  {...startBody,action:'publish'},
  {...startBody,level:'administrator'},
  {...startBody,industry:'unknown-sector'},
  {...startBody,action:'reply',message:''},
  {...startBody,message:{text:'PRIVATE_INVALID_SENTINEL'}},
  {...startBody,history:[{role:'system',message:'PRIVATE_INVALID_SENTINEL'}]},
  {...startBody,askedQuestionIds:Array(101).fill('swe-fresher-001')},
  {...startBody,action:'reply',message:'x'.repeat(3001)}
 ]){const r=await f.request({body});assert.equal(r.status,400);assert.doesNotMatch(JSON.stringify(r.body),/PRIVATE_INVALID_SENTINEL/);}
 assert.equal((await f.request({raw:'{invalid-json'})).status,400);assert.equal(f.stats.prompts.length,0);assert.equal(f.stats.budget.length,0);
});

test('bank-backed start returns a real role/level question without AI generation or budget',async t=>{
 const f=await fixture(t),r=await f.request();assert.equal(r.status,200);const q=questionOf(r);
 assert.equal(typeof q.id,'string');assert.equal(typeof q.question,'string');assert.equal(typeof q.topic,'string');assert.ok(q.question.length>15);assert.equal(r.cache,'no-store');
 assert.equal(f.stats.prompts.length,0);assert.equal(f.stats.budget.length,0);
});

test('explicit unknown and skip move to another question topic without provider or AI budget',async t=>{
 const f=await fixture(t),first=await f.request(),q=questionOf(first);
 for(const extra of [{message:'Em không biết trả lời câu này, mình chuyển câu khác nhé.'},{action:'skip',message:''}]){
  const r=await f.request({body:replyFor(q,extra.message,extra)});assert.equal(r.status,200);const next=questionOf(r);
  assert.notEqual(next.id,q.id);assert.notEqual(next.topic,q.topic);assert.doesNotMatch(r.body.data.interviewerReply,/rất logic|rất tốt|trả lời tốt|tuyệt vời/i);
 }
 assert.equal(f.stats.prompts.length,0);assert.equal(f.stats.budget.length,0);
});

test('a learned-before admission is evaluated rather than treated as an inability to answer',async t=>{
 const f=await fixture(t),q=questionOf(await f.request()),message='Trước đây em không biết cách phân biệt, nhưng em đã học và thực hành. GET dùng để đọc tài nguyên, còn POST gửi dữ liệu để xử lý.';
 const r=await f.request({body:replyFor(q,message)});assert.equal(r.status,200);assert.equal(f.stats.prompts.length,1);assert.deepEqual(f.stats.budget,['A']);
});

test('invented evidence and flattering model prose cannot become feedback for an unrelated answer',async t=>{
 const f=await fixture(t,{provider:async()=>({relevance:'on_topic',correctness:'adequate',questionEvidence:'PRIVATE_INVENTED_QUESTION',answerEvidence:['PRIVATE_INVENTED_ANSWER'],missingPoints:[],interviewerReply:'Câu trả lời của bạn rất logic và hoàn hảo. PRIVATE_MODEL_PROSE',quickFeedback:'Tuyệt vời, trả lời tốt! PRIVATE_MODEL_PROSE',score:10})});
 const q=questionOf(await f.request()),r=await f.request({body:replyFor(q,'Em thích đi du lịch và ăn phở vào cuối tuần.')});assert.equal(r.status,200);
 assert.equal(f.stats.prompts.length,1);assert.deepEqual(f.stats.budget,['A']);assert.doesNotMatch(JSON.stringify(r.body),/PRIVATE_MODEL_PROSE|PRIVATE_INVENTED|rất logic|hoàn hảo|Tuyệt vời|trả lời tốt/);
 assert.ok(r.body.data.quickFeedback.length>10);
});

test('provider failure is generic and leaves the deterministic skip path available',async t=>{
 const f=await fixture(t,{provider:async()=>{throw Error('PRIVATE_PROVIDER_SENTINEL personal@example.invalid');}}),q=questionOf(await f.request()),logs=[],previous=console.error;console.error=(...args)=>logs.push(args.join(' '));
 let r;try{r=await f.request({body:replyFor(q,'Em sẽ kiểm tra cấu trúc yêu cầu và phản hồi trước khi kết luận nguyên nhân. ')});}finally{console.error=previous;}
 assert.ok(r.status>=500);assert.doesNotMatch(JSON.stringify(r.body),/PRIVATE_PROVIDER_SENTINEL|personal@example.invalid/);assert.doesNotMatch(logs.join(' '),/PRIVATE_PROVIDER_SENTINEL|personal@example.invalid/);
 const next=await f.request({body:replyFor(q,'Em không biết, bỏ qua câu này.')});assert.equal(next.status,200);assert.notEqual(questionOf(next).topic,q.topic);assert.equal(f.stats.prompts.length,1);assert.deepEqual(f.stats.budget,['A']);
});
