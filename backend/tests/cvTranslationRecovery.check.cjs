'use strict';
const assert=require('node:assert/strict');
const root=process.env.TEST_ROOT || require('node:path').resolve(__dirname,'..');
let translationCalls=0,sawRepairFeedback=false;
const gp=require.resolve(root+'/src/services/geminiService');
require.cache[gp]={id:gp,filename:gp,loaded:true,exports:{callGeminiJSON:async prompt=>{
 if(prompt.startsWith('Translate these')){
  const rows=JSON.parse(prompt.split('FIELDS:\n')[1]);translationCalls++;
  sawRepairFeedback ||= prompt.includes('Copy all source numbers');
  return {translations:rows.map(r=>{
   let text=r.protectedSource.replace('Tôi hỗ trợ','I support').replace('với','with').replace('tài khoản thử nghiệm','test accounts').replace('Giảm','Reduced').replace('thời gian phản hồi','response time');
   if(translationCalls===1 && r.id==='summary')text=text.replace('__CV_NUMBER_1__','700');
   return {id:r.id,text};
  })};
 }
 const pairs=JSON.parse(prompt.split('PAIRS:\n')[1]);return {checks:pairs.map(p=>({id:p.id,faithful:true,english:true}))};
}}};
const {groundCv}=require(root+'/src/services/cvGroundingService');
const {translateCv}=require(root+'/src/services/cvTranslationService');
(async()=>{
 const profile={fullName:'Nguyễn Ví Dụ',summary:'Tôi hỗ trợ Nguyễn Ví Dụ với 700+ tài khoản thử nghiệm.',skills:['Node.js'],experience:[{company:'Synthetic Example Company',role:'Developer',bullets:['Giảm 17% thời gian phản hồi.']}]};
 const cv=await translateCv(groundCv(profile,{},'en'));
 assert.equal(translationCalls,2,'Retry the invalid translation with targeted feedback');
 assert.ok(sawRepairFeedback);
 assert.equal(cv.summary,'I support Nguyễn Ví Dụ with 700+ test accounts.');
 assert.equal(cv.tailoredExperience[0].achievements[0],'Reduced 17% response time.');
 assert.ok(cv.grounding.translationVerified);
 assert.ok(!cv.summary.includes('__CV_'));
 const repeated=await translateCv(groundCv(profile,{},'en'));
 assert.equal(repeated.summary,cv.summary);assert.equal(translationCalls,2,'Reuse verified cache');
 console.log('PASS: accented proper name preserved, exact +/% tokens restored, failed field repaired with feedback, verified cache reused.');
})().catch(e=>{console.error(e);process.exitCode=1});
