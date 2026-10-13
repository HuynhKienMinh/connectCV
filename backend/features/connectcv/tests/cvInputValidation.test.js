const test=require('node:test'),assert=require('node:assert/strict');
const {validateGeneration,validationResponse}=require('../src/services/cvGenerationValidation');
const client=require('../public/js/cv-input-validation');
const {createFeatureSecurity}=require('../src/middlewares/featureSecurity');
const valid={jdText:'Tuyển Backend Node.js và Docker cho dự án kiểm thử.',profile:{fullName:'Synthetic'}};
test('client and server reject empty, short, whitespace and oversized JD; accept VI/EN boundaries',()=>{
 for(const jdText of ['', ' ', ' '.repeat(21), 'ngắn', 'x'.repeat(6001)]){
  assert.ok(client.validate({...valid,jdText}).jdText);assert.ok(validateGeneration({...valid,jdText}).error);
 }
 for(const jdText of ['x'.repeat(20),'x'.repeat(6000),'Tuyển kỹ sư phần mềm Node.js tại Việt Nam.']){
  assert.deepEqual(client.validate({...valid,jdText}),{});assert.equal(validateGeneration({...valid,jdText}).error,undefined);
 }
});
test('profile JSON errors are actionable and never expose values, even with hostile content',()=>{
 for(const profile of [null,[], '[]','null','PRIVATE_SENTINEL<script>alert(1)</script>']){
  const {error}=validateGeneration({...valid,profile});assert.ok(error);
  const response=validationResponse(error);assert.equal(response.code,'CV_INPUT_INVALID');assert.ok(response.fieldErrors.profile);
  assert.ok(!JSON.stringify(response).includes('PRIVATE_SENTINEL'));assert.ok(!JSON.stringify(response).includes('<script>'));
  assert.ok(client.validate({...valid,profile}).profile);
 }
 assert.equal(validateGeneration({...valid,profile:JSON.stringify(valid.profile)}).value.profile.fullName,'Synthetic');
 assert.ok(validateGeneration({...valid,companyName:'x'.repeat(151)}).error);
 assert.ok(client.validate({...valid,companyName:'x'.repeat(151)}).companyName);
});
test('invalid CV submissions do not consume AI budget or block the next valid request; valid limits remain',async()=>{
 let budget=0;const middleware=createFeatureSecurity({consumeBudget:async()=>budget++,clock:()=>1000});
 async function request(body,user=true,path='/generate',baseUrl='/api/cv'){let next=false,status=200,data;
  await middleware({method:'POST',baseUrl,path,user:user?{id:'synthetic'}:undefined,body,socket:{remoteAddress:'local'}},{setHeader(){},status(n){status=n;return this;},json(v){data=v;}},()=>next=true);
  return {next,status,data};
 }
 for(let i=0;i<25;i++)assert.equal((await request({...valid,jdText:''})).status,400);
 assert.equal((await request({...valid,jdText:''},true,'/generate/')).status,400);
 assert.equal((await request({...valid,jdText:''},true,'/GENERATE','/api/CV')).status,400);
 assert.equal(budget,0);assert.equal((await request(valid)).next,true);assert.equal(budget,1);
 for(let i=1;i<15;i++)assert.equal((await request(valid)).next,true);
 assert.equal((await request(valid)).status,429);assert.equal(budget,15);
 assert.equal((await request({...valid,jdText:''},false)).status,401);
});
