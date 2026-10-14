'use strict';
// Offline export investigation. Synthetic facts only; never calls AI or Firebase.
// Keep PDF artifacts in a bounded temporary folder and remove after verification.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {getAvailableTemplates,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {PDFDocument}=require('pdf-lib');
const out=process.env.CV_MATRIX_OUTPUT;
assert.ok(out,'Set CV_MATRIX_OUTPUT to a temporary directory');
assert.equal(process.env.NODE_ENV,'production','Keep production browser sandbox enabled');
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.test',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. MATRIX_EXPERIENCE_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'MATRIX_EDUCATION_SOURCE'}]};
const requiredFacts=[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school,'MATRIX_EXPERIENCE_SOURCE','MATRIX_EDUCATION_SOURCE','Node.js'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 assert.ok(fs.statfsSync(out).bavail*fs.statfsSync(out).bsize>256*1024*1024,'Need 256MB available before diagnostic export');
 const browser=await getBrowser(),rows=[];let bytes=0;
 const allow=process.env.CV_MATRIX_SLUGS?.split(',');
 try{
  for(const language of ['vi','en'])for(const template of getAvailableTemplates(language)){
   if(allow&&!allow.includes(template.slug))continue;
   const id=template.slug+'-'+language;
   const html=renderCVDataToTemplateHtml(template,groundCv(profile,{},language),profile,language);
   const pdf=await generateCvPdf({html});bytes+=pdf.length;
   assert.ok(bytes<32*1024*1024,'Diagnostic output limit: 32MB');
   fs.writeFileSync(path.join(out,id+'.pdf'),pdf);
   const doc=await PDFDocument.load(pdf);
   for(const page of doc.getPages()){
    assert.ok(Math.abs(page.getWidth()-595.28)<2&&Math.abs(page.getHeight()-841.89)<2,id+' must retain A4');
   }
   rows.push({id,slug:template.slug,language,bytes:pdf.length,pages:doc.getPageCount(),requiredFacts});
   // Preserve investigation evidence even if a later export/resource limit fails.
   fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify({scope:'short synthetic profile; native template languages; no visual/ATS certification',bytes,complete:false,rows},null,2)+'\n');
   if(rows.length%20===0)console.log(JSON.stringify({completed:rows.length,bytes}));
  }
  fs.writeFileSync(path.join(out,'matrix.json'),JSON.stringify({scope:'short synthetic profile; native template languages; no visual/ATS certification',bytes,complete:true,rows},null,2)+'\n');
  console.log(JSON.stringify({completed:rows.length,bytes,output:out}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
