const fs=require('fs'),assert=require('node:assert/strict');
const {getAvailableTemplates,getTemplatePreviewHtml,renderCVDataToTemplateHtml,PREVIEW_VERSION}=require('../src/services/templateService');
const {generateCvPdf,getBrowser}=require('../src/services/pdfService');
const {groundCv}=require('../src/services/cvGroundingService');
const profile={fullName:'CONNECTCV BRAND TEST',email:'candidate@topcv.vn',skills:['Node.js'],experience:[],education:[]};
(async()=>{let count=0;for(const language of ['vi','en'])for(const template of getAvailableTemplates(language)){
 for(const html of [getTemplatePreviewHtml(template.id,language),renderCVDataToTemplateHtml(template,groundCv(profile,{},language),profile,language)]){
  const footers=[...html.matchAll(/<div\b[^>]*(?:class="[^"]*\bview-cv__watermark\b[^"]*"|id="cv-watermark")[^>]*>([\s\S]*?)<\/div>/g)].map(m=>m[1]);
  assert.ok(!/©\s*topcv\.vn/i.test(html),template.id+' retained original watermark');
  assert.ok(footers.every(x=>x==='© ConnectCV'),template.id+' wrong footer');
 }
 const generated=renderCVDataToTemplateHtml(template,groundCv(profile,{},language),profile,language);
 assert.ok(generated.includes('candidate@topcv.vn'),'Candidate contact must remain unchanged');count++;
}
fs.mkdirSync('/tmp/connectcv-branding',{recursive:true});
for(const language of ['vi','en']){
 const template=getAvailableTemplates(language).find(t=>t.id==='formal');
 fs.writeFileSync('/tmp/connectcv-branding/'+language+'.pdf',await generateCvPdf({html:renderCVDataToTemplateHtml(template,groundCv(profile,{},language),profile,language)}));
}
console.log(JSON.stringify({version:PREVIEW_VERSION,variants:count,previewAndGeneratedFooter:'PASS',profileContacts:'PASS'}));await(await getBrowser()).close();
})().catch(e=>{console.error(e);process.exitCode=1});
