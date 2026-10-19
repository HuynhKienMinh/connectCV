'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {answeredPairs,groundSummary}=require('../src/services/interviewSummaryGrounding');
const {history,proposed}=require('./fixtures/interview-career-change.json');
test('career-change transcript preserves negation and isolates evidence between answers',()=>{
 const pairs=answeredPairs(history),report=groundSummary(proposed,pairs);assert.equal(report.qaBreakdown.length,2);
 const second=report.qaBreakdown[1];assert.equal(second.candidateAnswer,history[3].message);
 assert.equal(second.suggestedStarAnswer.action,'');assert.equal(second.suggestedStarAnswer.result,'');
 assert.equal(second.score,null);assert.equal(report.overallScore,null);
 assert.doesNotMatch(second.critique,/SAP|12%/);assert.equal(second.inventedAchievement,undefined);
 assert.doesNotMatch(JSON.stringify([report.strengths,report.improvements,report.finalAdvice]),/SAP|12%|quản lý phòng kế toán/);
 assert.ok(second.followUpQuestions.length>0);assert.ok(second.practiceTask);
});
test('complete negative evidence stays negative and zero remains a valid estimated score',()=>{
 const source='Tôi chưa sử dụng SAP trong công việc.';
 const r=groundSummary({qaBreakdown:[{answerId:'answer-1',score:0,suggestedStarAnswer:{action:source}}]},[{answerId:'answer-1',question:'Kinh nghiệm của bạn?',candidateAnswer:source}]);
 assert.equal(r.qaBreakdown[0].suggestedStarAnswer.action,source);assert.equal(r.qaBreakdown[0].score,0);assert.equal(r.overallScore,0);
 assert.match(r.scoreNote,/ước lượng/i);
});
function render(report){
 const source=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),start=source.indexOf('    function renderLiveSummaryReport('),end=source.indexOf('    function toggleTextInputModal(',start),node={innerHTML:''};assert.ok(start>0&&end>start);
 const escapeStart=source.indexOf('    function escapeHTML('),escapeEnd=source.indexOf('    function renderMarkdownSafe(',escapeStart);assert.ok(escapeStart>0&&escapeEnd>escapeStart);
 const scope={document:{getElementById:()=>node}};vm.createContext(scope);vm.runInContext(source.slice(escapeStart,escapeEnd)+source.slice(start,end),scope);scope.renderLiveSummaryReport(report);return node.innerHTML;
}
test('actual summary UI preserves zero and labels unverified estimates instead of inserting eight',()=>{
 const zero=render({overallScore:0,scoreNote:'Ước lượng AI',qaBreakdown:[{score:0,question:'Q',candidateAnswer:'A'}]});
 assert.match(zero,/0\/10 điểm/);assert.doesNotMatch(zero,/8\/10 điểm|Chuẩn năng lực phỏng vấn/);
 const unknown=render({overallScore:null,scoreNote:'Chưa xác minh',qaBreakdown:[{score:null,question:'Q',candidateAnswer:'<img src=x onerror=alert(1)>'}]});
 assert.match(unknown,/Chưa xác minh/);assert.doesNotMatch(unknown,/8\/10 điểm|>null</);assert.ok(unknown.includes('&lt;img'));
});
test('older report clients stop before AI budget and action buckets while current version proceeds',async()=>{
 const {createFeatureSecurity}=require('../src/middlewares/featureSecurity');let budget=0,accepted=0;
 const guard=createFeatureSecurity({consumeBudget:async()=>budget++});
 async function request(body){let status=200,data;const res={setHeader(){},status:n=>{status=n;return res;},json:value=>{data=value;return res;}};
  await guard({method:'POST',baseUrl:'/api/interview',path:'/live-summary',featureIdentityVerified:true,user:{id:'synthetic-report'},socket:{remoteAddress:'local'},body},res,()=>accepted++);return {status,data};}
 for(let i=0;i<25;i++){const r=await request({history,reportVersion:i%2?undefined:'2'});assert.equal(r.status,409);assert.equal(r.data.code,'INTERVIEW_REPORT_CLIENT_OUTDATED');}
 assert.equal(budget,0);assert.equal(accepted,0);assert.equal((await request({history,reportVersion:2})).status,200);assert.equal(budget,1);assert.equal(accepted,1);
});
test('actual end-interview request declares version2 and leaves transcript intact on stale-client error',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),start=source.indexOf('    async function endLiveInterview('),end=source.indexOf('    function closeLiveSummaryModal(',start);assert.ok(start>0&&end>start);
 const elements=new Map(),requests=[];const scope={window:{},currentLiveAudio:null,isAISpeakingOrThinking:false,currentSpeechBuffer:'',liveInterviewHistory:structuredClone(history),isLiveInterviewActive:true,cancelLiveVoice(){},stopLiveListening(){},setLiveOrbState(){},updateLiveCaption(){},escapeHTML:s=>String(s??''),
  document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{value:'Synthetic',innerHTML:'',classList:{add(){},remove(){}}});return elements.get(id);}},
  fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {json:async()=>({success:false,message:'Mở lại trang để nhận báo cáo mới.'})};}};
 vm.createContext(scope);vm.runInContext(source.slice(start,end),scope);await scope.endLiveInterview();
 assert.equal(requests[0].reportVersion,2);assert.equal(JSON.stringify(scope.liveInterviewHistory),JSON.stringify(history));assert.match(elements.get('live-summary-result').innerHTML,/Mở lại trang/);
});
test('actual live-summary handler sends complete non-IT answers and returns guarded evidence with mocked provider',async()=>{
 const modules=['../src/services/geminiService','../src/services/communityStore','../src/services/ttsService'],saved=new Map();let calls=0,prompt='';
 const store=process.env.FEATURE_STORE_BACKEND;delete process.env.FEATURE_STORE_BACKEND;
 for(const name of modules){const id=require.resolve(name);saved.set(id,require.cache[id]);}
 try{
  require.cache[require.resolve(modules[0])]={loaded:true,exports:{callGeminiJSON:async p=>{calls++;prompt=p;return proposed;}}};
  require.cache[require.resolve(modules[1])]={loaded:true,exports:{CommunityStore:class{constructor(){this.entries=[{}];}},publicEntry:x=>x}};
  require.cache[require.resolve(modules[2])]={loaded:true,exports:{generateSpeechMP3:()=>{throw Error('TTS must not run');}}};
  const id=require.resolve('../src/routes/interview'),previous=require.cache[id];delete require.cache[id];
  let router;try{router=require(id);}finally{if(previous)require.cache[id]=previous;else delete require.cache[id];}
  const handler=router.stack.find(x=>x.route?.path==='/live-summary').route.stack[0].handle;
  let status,data;const res={status:n=>{status=n;return res;},json:body=>{data=body;return res;}};
  await handler({body:{reportVersion:2,history,jobTitle:'Nhân viên kế toán chuyển nghề',jdText:'Đối chiếu hóa đơn và theo dõi chứng từ.'}},res);
  assert.equal(status,200);assert.equal(calls,1);assert.equal(data.data.qaBreakdown.length,2);assert.equal(data.data.overallScore,null);
  for(const pair of answeredPairs(history))assert.ok(prompt.includes(pair.candidateAnswer));
  assert.match(prompt,/CỦA CHÍNH answerId/);assert.equal(data.data.qaBreakdown[1].suggestedStarAnswer.action,'');
  const previousCalls=calls;await handler({body:{history}},res);assert.equal(status,409);assert.equal(calls,previousCalls);
 }finally{
  for(const [id,previous] of saved)if(previous)require.cache[id]=previous;else delete require.cache[id];
  if(store===undefined)delete process.env.FEATURE_STORE_BACKEND;else process.env.FEATURE_STORE_BACKEND=store;
 }
});
