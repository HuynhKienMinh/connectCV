'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {prepareLiveInput,decorateTurn}=require('../src/services/interviewLiveSession');
const bank=require('../src/services/interviewQuestionBank');
const scope={industry:'software-engineering',level:'fresher',jobTitle:'Backend developer'};

test('a previously skipped topic remains excluded on later substantive turns',()=>{
 const questions=bank.listQuestions({...scope,limit:100}).items,first=questions[0],current=questions[1];
 const result=prepareLiveInput({...scope,action:'reply',currentQuestionId:current.id,askedQuestionIds:questions.slice(1).map(q=>q.id),skippedTopics:[first.topic],message:'Em dùng transaction để các bước ghi cùng thành công hoặc cùng được hoàn tác.'});
 assert.equal(result.error,undefined);assert.equal(result.plan.next,null);assert.deepEqual(result.plan.skippedTopics,[first.topic]);
});

test('an admission records skipped topic while normal answers do not',()=>{
 const first=bank.selectQuestion(scope);
 const unknown=prepareLiveInput({...scope,action:'reply',currentQuestionId:first.id,message:'Câu này em chưa biết trả lời.'});
 assert.equal(unknown.plan.local,true);assert.deepEqual(unknown.plan.skippedTopics,[first.topic]);
 const output=decorateTurn({},unknown.value,unknown.plan);assert.deepEqual(output.skippedTopics,[first.topic]);
 const normal=prepareLiveInput({...scope,action:'reply',currentQuestionId:first.id,message:'GET thường dùng để đọc một biểu diễn của tài nguyên.'});
 assert.equal(normal.plan.local,false);assert.deepEqual(normal.plan.skippedTopics,[]);
});

test('a start resets caller history and skipped topics',()=>{
 const first=bank.selectQuestion(scope);
 const result=prepareLiveInput({...scope,action:'start',skippedTopics:[first.topic],askedQuestionIds:[first.id],history:[{role:'interviewer',message:first.question,questionId:first.id}]});
 assert.equal(result.plan.next.id,first.id);assert.deepEqual(result.plan.skippedTopics,[]);assert.deepEqual(result.plan.askedQuestionIds,[]);
});

test('the full 1000-question ID list fits admission without removing the safety bound',()=>{
 const ids=Array.from({length:1000},(_,i)=>'swe-fresher-synthetic-'+i);
 assert.equal(prepareLiveInput({...scope,action:'start',askedQuestionIds:ids}).error,undefined);
 assert.ok(prepareLiveInput({...scope,action:'start',askedQuestionIds:[...ids,'extra']}).error);
 assert.ok(prepareLiveInput({...scope,action:'start',skippedTopics:Array(1001).fill('topic')}).error);
});
