'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {getTemplateById,renderCVDataToTemplateHtml}=require(path.join(root,'src/services/templateService'));
const {groundCv}=require(path.join(root,'src/services/cvGroundingService'));
const {getBrowser,generateCvPdf}=require(path.join(root,'src/services/pdfService'));
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.test',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. MATRIX_EXPERIENCE_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'MATRIX_EDUCATION_SOURCE'}]};

const out=process.env.CV_RELATIVE_QA_OUTPUT;require('node:assert/strict').ok(out&&!fs.existsSync(out),'Fresh owned CV_RELATIVE_QA_OUTPUT required');require('node:assert/strict').equal(process.env.NODE_ENV,'production');fs.mkdirSync(out,{recursive:true});const disk=fs.statfsSync(out);require('node:assert/strict').ok(disk.bavail*disk.bsize>=256*1024*1024);
(async()=>{const browser=await getBrowser();try{
 const html=renderCVDataToTemplateHtml(getTemplateById('ambitious','vi'),groundCv(profile,{},'vi'),profile,'vi');
 const pdf=await generateCvPdf({html});require('node:assert/strict').ok(pdf.length<4*1024*1024);fs.writeFileSync(path.join(out,'native.pdf'),pdf);console.log(JSON.stringify({bytes:pdf.length,syntheticOnly:true}));
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
