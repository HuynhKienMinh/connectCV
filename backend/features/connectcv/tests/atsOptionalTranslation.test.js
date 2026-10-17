'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const AdmZip=require('adm-zip');
let providerCalls=0;
const translations={
 'projects.0.title':'Inventory system',
 'projects.0.description':'Tracked 12 warehouses.',
 'certifications.0':'Data analysis certificate',
 'activities.0.title':'Study group mentoring',
 'activities.0.description':'Supported 20 learners.',
 'awards.0':'Second prize in analytics in 2024',
 'languages.0.name':'English',
 'languages.0.level':'Proficient'
};
// Fake model responses go through the actual translator/signature validator in this process.
// No real key, provider, Firebase account, JWT or quota is used.
const gp=require.resolve('../src/services/geminiService');
require.cache[gp]={id:gp,filename:gp,loaded:true,exports:{callGeminiJSON:async prompt=>{
 providerCalls++;
 if(prompt.includes('\nFIELDS:\n')){
  const fields=JSON.parse(prompt.split('\nFIELDS:\n')[1]);
  return {translations:fields.map(e=>({id:e.id,text:translations[e.id]}))};
 }
 const pairs=JSON.parse(prompt.split('\nPAIRS:\n')[1]);
 return {checks:pairs.map(e=>({id:e.id,faithful:true,english:true}))};
},keyManager:{isRateLimitError:()=>false}}};
const {groundCv}=require('../src/services/cvGroundingService');
const {translateCv}=require('../src/services/cvTranslationService');
const {blocks,buildAtsDocx,buildAtsHtml}=require('../src/services/atsExportService');
const profile={fullName:'Synthetic Candidate',summary:'Prepared monthly reports.',targetRole:'Data analyst',skills:['Excel'],
 projects:[{title:'Hệ thống kho',description:'Theo dõi 12 kho hàng.',url:'https://example.invalid/project'}],
 certifications:['Chứng chỉ phân tích dữ liệu'],activities:[{title:'Hướng dẫn nhóm học tập',description:'Hỗ trợ 20 học viên.'}],
 awards:['Giải nhì phân tích năm 2024'],languages:[{name:'Tiếng Anh',level:'Thành thạo'}]};
const verified=translateCv(groundCv(profile,{},'en'));
const xml=buffer=>new AdmZip(buffer).readAsText('word/document.xml');
test('English ATS Word retains every verified optional-section translation and source number',async()=>{
 const cv=await verified;assert.equal(cv.grounding.translationVerified,true);assert.equal(providerCalls,2);
 const document=xml(buildAtsDocx(cv,{},'en'));
 for(const text of Object.values(translations))assert.ok(document.includes(text),'missing verified optional text: '+text);
 for(const text of [profile.projects[0].title,profile.projects[0].description,profile.certifications[0],profile.awards[0],profile.languages[0].name])assert.ok(!document.includes(text),'export reverted to source: '+text);
 assert.ok(document.includes('https://example.invalid/project'));assert.ok(document.includes('Synthetic Candidate'));
 assert.ok(!document.includes('txbxContent'));assert.ok(!document.includes('w:pict'));
});
test('ATS PDF HTML uses the same verified optional content without a second model call',async()=>{
 const cv=await verified,html=buildAtsHtml(cv,{},'en');for(const text of Object.values(translations))assert.ok(html.includes(text),'HTML missing: '+text);assert.equal(providerCalls,2);
});
test('Vietnamese optional facts stay unchanged and unverified client replacements are ignored',()=>{
 const cv=groundCv(profile,{},'vi');cv.projects=[{title:'Invented project',description:'Invented 90% result'}];cv.certifications=['Invented qualification'];
 const document=xml(buildAtsDocx(cv,{},'vi'));assert.ok(document.includes(profile.projects[0].description));assert.ok(document.includes(profile.certifications[0]));assert.ok(!document.includes('Invented'));assert.equal(providerCalls,2);
});
test('forged translation values cannot replace source facts in optional sections',async()=>{
 const cv=structuredClone(await verified);cv.translationBundle.values['projects.0.description']='Invented 90% result';
 const document=xml(buildAtsDocx(cv,{},'en'));assert.ok(document.includes(profile.projects[0].description));assert.ok(!document.includes('Invented 90%'));assert.ok(!document.includes(translations['projects.0.description']));
});
test('changing optional source facts invalidates the old signed bundle',async()=>{
 const cv=structuredClone(await verified);cv.sourceProfile.projects[0].description='Theo dõi 13 kho hàng.';
 const document=xml(buildAtsDocx(cv,{},'en'));assert.ok(document.includes('Theo dõi 13 kho hàng.'));assert.ok(!document.includes('Tracked 12 warehouses.'));
});
test('plain English, missing and escaped optional values remain ordinary editable paragraphs',()=>{
 const source={fullName:'Synthetic & <Candidate>',projects:['A & B <C>'],awards:[],languages:['English']};
 const document=xml(buildAtsDocx({},source,'en'));assert.ok(document.includes('Synthetic &amp; &lt;Candidate&gt;'));assert.ok(document.includes('A &amp; B &lt;C&gt;'));assert.ok(!document.includes('Awards'));assert.ok(!document.includes('Backend Developer'));assert.ok(!document.includes('FPT University'));
 assert.ok(blocks({},source,'en').some(b=>b.text==='A & B <C>'));
});
test('actual export-docx route preserves signed optional translations in binary response',async()=>{
 const cv=await verified,express=require('express'),app=express();app.use(express.json());app.use('/api/cv',require('../src/routes/cv'));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 try{
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/cv/export-docx`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({format:'ats',cvData:cv,userProfile:{fullName:'Ignored alternate profile'},language:'en',fileName:'Synthetic CV'})});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/wordprocessingml/);assert.match(response.headers.get('content-disposition'),/Synthetic_CV\.docx/);
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(Number(response.headers.get('content-length')),bytes.length);const document=xml(bytes);
  for(const text of Object.values(translations))assert.ok(document.includes(text),'route missing: '+text);assert.ok(!document.includes('Ignored alternate profile'));assert.equal(providerCalls,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
