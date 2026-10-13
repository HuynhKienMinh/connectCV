const test=require('node:test'),assert=require('node:assert/strict');
const {validateEvaluation,evaluationError,buildEvaluationPrompt,groundEvaluation}=require('../src/services/interviewEvaluationService');
const {createFeatureSecurity}=require('../src/middlewares/featureSecurity');
const parts={situation:'Trong dự án học tập, API phản hồi chậm.',task:'Tôi phụ trách tối ưu truy vấn SQL.',action:'Tôi thêm chỉ mục và kiểm tra lại truy vấn.',result:'Thời gian giảm từ 200ms xuống 120ms.'};
const input={question:'Bạn đã giải quyết vấn đề như thế nào?',candidateAnswer:Object.values(parts).join(' '),category:'Behavioral'};
test('STAR scaffold uses complete source quotes and discards invented model biography',()=>{
 const result=groundEvaluation({score:8,suggestedStarAnswer:parts,improvedAnswer:'I used Redis and reduced latency to 5ms.',strengths:['Managed 50 engineers.']},input);
 assert.equal(result.candidateAnswer,input.candidateAnswer);assert.equal(result.verifiedComponents.length,4);
 assert.ok(!result.improvedAnswer.includes('Redis'));assert.ok(!result.improvedAnswer.includes('5ms'));
 assert.deepEqual(result.followUpQuestions,[]);assert.equal(result.score,8);
});
test('the entire accepted long answer reaches the prompt, including the final result',()=>{
 const answer='Tôi tham gia dự án học tập. '.repeat(85)+'Kết quả thật ở cuối: từ 200ms xuống 120ms.';
 const validated=validateEvaluation({...input,candidateAnswer:answer});assert.equal(validated.error,undefined);
 assert.ok(answer.length>2000&&answer.length<=3000);
 const prompt=buildEvaluationPrompt(validated.value);const supplied=JSON.parse(prompt.split('DỮ LIỆU:\n')[1]);assert.equal(supplied.candidateAnswer,answer);
});
test('a fragment dropping negation and invented result are not published as STAR facts',()=>{
 const source={...input,candidateAnswer:'Tôi chưa dùng Redis trong dự án. Tôi chỉ thêm chỉ mục SQL.'};
 const result=groundEvaluation({score:9,suggestedStarAnswer:{action:'dùng Redis trong dự án.',result:'Tăng hiệu suất 99%.'}},source);
 assert.equal(result.suggestedStarAnswer.action,'');assert.equal(result.suggestedStarAnswer.result,'');assert.equal(result.score,null);
 assert.ok(!result.improvedAnswer.includes('Redis'));assert.ok(!result.improvedAnswer.includes('99%'));assert.equal(result.followUpQuestions.length,4);
});
test('duplicate evidence is not presented as four verified components and invalid scores fail',()=>{
 const result=groundEvaluation({score:7,suggestedStarAnswer:Object.fromEntries(Object.keys(parts).map(k=>[k,parts.action]))},input);
 assert.equal(result.verifiedComponents.length,1);
 for(const score of ['8',-1,11,NaN,Infinity,null])assert.throws(()=>groundEvaluation({score,suggestedStarAnswer:parts},input));
});
test('invalid interview inputs never consume AI quota; error responses do not echo source',async()=>{
 let budget=0;const middleware=createFeatureSecurity({consumeBudget:async()=>budget++});
 async function request(body){let status=200,next=false,response;
  await middleware({method:'POST',baseUrl:'/api/interview',path:'/evaluate',user:{id:'synthetic'},socket:{remoteAddress:'local'},body},{setHeader(){},status(n){status=n;return this;},json(v){response=v;}},()=>next=true);
  return {status,next,response};
 }
 for(const candidateAnswer of ['', ' ', 'x'.repeat(3001)])assert.equal((await request({...input,candidateAnswer})).status,400);
 assert.equal(budget,0);assert.equal((await request(input)).next,true);assert.equal(budget,1);
 const bad=validateEvaluation({...input,question:'PRIVATE_SENTINEL'.repeat(100)});assert.ok(bad.error);assert.ok(!JSON.stringify(evaluationError(bad.error)).includes('PRIVATE_SENTINEL'));
});
