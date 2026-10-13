const test=require('node:test'),assert=require('node:assert/strict');
const {validate,hasContact,errorResponse}=require('../public/js/community-publication');
const {createFeatureSecurity}=require('../src/middlewares/featureSecurity');
const input={companyName:'Công ty thử nghiệm',position:'Backend Developer',interviewQuestions:['Bạn xử lý lỗi kết nối cơ sở dữ liệu như thế nào?'],reviewText:'Chuẩn bị ví dụ thực tế và hỏi rõ yêu cầu công việc.',anonymous:true,difficultyRating:3,publicAcknowledged:true};
test('anonymous sharing requires explicit public consent and strips profile fields',()=>{
 const result=validate({...input,authorName:'private-name',authorAvatar:'private-photo',profile:{email:'private'}});
 assert.deepEqual(result.fieldErrors,{});assert.equal(result.value.authorName,undefined);assert.equal(result.value.profile,undefined);
 assert.ok(validate({...input,publicAcknowledged:false}).fieldErrors.publicAcknowledged);
 assert.ok(validate({...input,anonymous:'false'}).fieldErrors.anonymous);
});
test('contact guard rejects clear emails and Vietnamese phones without echoing content',()=>{
 for(const contact of ['fixture@example.invalid','090 123 4567','+84 90 123 4567','０９０１２３４５６７','fixt\u200Bure@example.invalid']){
  assert.equal(hasContact(contact),true);
  const result=validate({...input,reviewText:'Liên hệ '+contact});assert.ok(result.fieldErrors.reviewText);
  assert.ok(!JSON.stringify(errorResponse(result)).includes(contact));
 }
 assert.equal(hasContact('2023-2027; giảm từ 200ms xuống 120ms.'),false);
});
test('publication input cannot be silently truncated or coerced into public facts',()=>{
 for(const changes of [{companyName:'x'.repeat(101)},{reviewText:'x'.repeat(1001)},{interviewQuestions:[{}]},{difficultyRating:'5'},{interviewQuestions:['x'.repeat(501)]}])assert.ok(Object.keys(validate({...input,...changes}).fieldErrors).length);
 assert.equal(validate({...input,anonymous:undefined}).value.anonymous,true);
});
test('invalid posts do not enter store or budget; valid non-AI sharing retains action limit',async()=>{
 let budget=0,accepted=0;const middleware=createFeatureSecurity({consumeBudget:async()=>budget++});
 async function request(body,path='/debrief'){let status=200,response;await middleware({method:'POST',baseUrl:'/api/interview',path,user:{id:'synthetic'},socket:{remoteAddress:'local'},body},{setHeader(){},status(n){status=n;return this;},json(v){response=v;}},()=>accepted++);return {status,response};}
 for(let i=0;i<25;i++)assert.equal((await request({...input,reviewText:'Liên hệ fixture@example.invalid'})).status,400);
 assert.equal(accepted,0);assert.equal(budget,0);
 for(let i=0;i<15;i++)assert.equal((await request(input,i%2?'/DEBRIEF/':'/debrief')).status,200);
 assert.equal(budget,0);assert.equal(accepted,15);assert.equal((await request(input)).status,429);
});
