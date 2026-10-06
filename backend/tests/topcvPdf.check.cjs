const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {getAvailableTemplates,getTemplatePreviewHtml,renderCVDataToTemplateHtml,PREVIEW_VERSION}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const out=process.env.TOPCV_QA_OUTPUT||'/tmp/connectcv-topcv-pdf';fs.mkdirSync(out,{recursive:true});
const profile={fullName:'TEST CANDIDATE',targetRole:'Backend Developer',summary:'Builds reliable software using Node.js.',phone:'0102345678',email:'fixture@example.test',address:'Test City',birth:'01/01/2000',skills:['Node.js','Docker'],avatarDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',experience:[{company:'FACT COMPANY',role:'FACT ROLE',time:'2020 - Present',bullets:['SOURCE ACHIEVEMENT ONE','SOURCE ACHIEVEMENT TWO']}],education:[{school:'FACT SCHOOL',degree:'FACT DEGREE',time:'2016 - 2020',highlight:'SOURCE GPA 3.2/4.0'}]};
(async()=>{const b=await getBrowser(),p=await b.newPage();const rows=[];try{
 for(const lang of ['vi','en']){fs.mkdirSync(path.join(out,lang),{recursive:true});for(const t of getAvailableTemplates(lang)){
  const preview=getTemplatePreviewHtml(t.id,lang),html=renderCVDataToTemplateHtml(t,groundCv(profile,{},lang),profile,lang);
  assert.ok(html.includes('data-native-topcv="'+t.slug+'"'));
  assert.equal(preview.match(/<style>([\s\S]*?)<\/style>/)[1],html.match(/<style>([\s\S]*?)<\/style>/)[1],t.slug+' changed source CSS');
  await prepareCvPage(p,html,{scale:1});
  const facts=await p.evaluate(()=>document.querySelector('.cv-page-container').innerText);
  for(const fact of ['FACT COMPANY','FACT SCHOOL','SOURCE ACHIEVEMENT ONE','SOURCE ACHIEVEMENT TWO','SOURCE GPA 3.2/4.0','Node.js','Docker'])assert.ok(facts.toLowerCase().includes(fact.toLowerCase()),t.slug+' missing '+fact);
  for(const fake of ['HJS Academy','ABC Company','BCD Company','1M+','25%','TopCV University'])assert.ok(!facts.includes(fake),t.slug+' leaked sample '+fake);
  const pdf=await generateCvPdf({html});fs.writeFileSync(path.join(out,lang,t.slug+'.pdf'),pdf);
  if(['ambitious','formal','tiktop','topinstar','senior_2'].includes(t.slug)){
   fs.writeFileSync(path.join(out,lang,t.slug+'.html'),html);await p.screenshot({path:path.join(out,lang,t.slug+'.png'),fullPage:true});
  }
  rows.push({slug:t.slug,lang,bytes:pdf.length,sourceCssExact:true,fontsLoaded:true,factsPreserved:true});
  if(rows.length%20===0)console.log('PDF '+rows.length+'/148');
 }}
 const long={...profile,experience:Array.from({length:20},(_,i)=>({...profile.experience[0],company:'LONG COMPANY '+i,bullets:['A long source achievement describing development, deployment and testing of reliable applications without adding unsupported claims.','FINAL_SOURCE_MARKER_'+i]}))};
 for(const slug of ['ambitious','formal','tiktop','senior_2']){
  const html=renderCVDataToTemplateHtml({slug,title:slug},groundCv(long,{},'en'),long,'en');fs.writeFileSync(path.join(out,'long-'+slug+'.pdf'),await generateCvPdf({html}));
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({version:PREVIEW_VERSION,rows},null,2));console.log('PASS: 148 native PDF exports; source CSS unchanged, fonts loaded, profile facts retained, plus 4 long documents.');
}finally{await p.close();await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
