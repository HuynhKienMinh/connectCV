const test=require('node:test'),assert=require('node:assert/strict');
const {answeredPairs,groundSummary}=require('../src/services/interviewSummaryGrounding');
const history=[{role:'interviewer',message:'How did you improve the query?'},{role:'candidate',message:'I added an index. It changed from 200ms to 120ms.'},{role:'interviewer',message:'Unanswered follow-up?'}];
test('unanswered follow-up is excluded and original answer remains authoritative',()=>{
 const pairs=answeredPairs(history);assert.equal(pairs.length,1);
 const result=groundSummary({overallScore:10,qaBreakdown:[{answerId:'answer-1',question:'Invented question',candidateAnswer:'Used Redis and reached 5ms',score:8,suggestedStarAnswer:{action:'I added an index.',result:'Reached 5ms'}},{answerId:'answer-2',score:10}]},pairs);
 assert.equal(result.qaBreakdown.length,1);assert.equal(result.overallScore,8);
 assert.equal(result.qaBreakdown[0].candidateAnswer,history[1].message);
 assert.equal(result.qaBreakdown[0].question,history[0].message);
 assert.equal(result.qaBreakdown[0].suggestedStarAnswer.action,'I added an index.');
 assert.equal(result.qaBreakdown[0].suggestedStarAnswer.result,'');
});
test('missing, duplicated or invalid evaluation scores fail explicitly',()=>{
 const pairs=answeredPairs(history);
 for(const rows of [[],[{answerId:'answer-1',score:12}],[{answerId:'answer-1',score:8},{answerId:'answer-1',score:9}]])assert.throws(()=>groundSummary({qaBreakdown:rows},pairs));
 assert.deepEqual(answeredPairs([{role:'interviewer',message:'Only a question'}]),[]);
});
