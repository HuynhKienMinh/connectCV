'use strict';
// Opt-in local diagnostic for a previously unexplored Source Code Pro template.
// Synthetic facts, actual renderer and sandbox; no AI/auth/database/network calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {PDFDocument}=require('pdf-lib');
const out=process.env.CV_WORD_QA_OUTPUT;
assert.ok(out,'Set CV_WORD_QA_OUTPUT to owned temporary staging');
assert.equal(process.env.NODE_ENV,'production','Keep actual production browser sandbox');
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.invalid',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. WORD_BOUNDARY_EXPERIENCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'WORD_BOUNDARY_EDUCATION'}]};
const long={...profile,experience:Array.from({length:12},(_,i)=>({...profile.experience[0],company:'Công ty giả '+i,bullets:['Kiểm tra dữ liệu giả và triển khai phần mềm. WORD_BOUNDARY_LONG_'+i]}))};
(async()=>{
 assert.ok(!fs.existsSync(out),'Do not reuse or overwrite diagnostic artifacts');fs.mkdirSync(out,{recursive:true});
 const disk=fs.statfsSync(out);assert.ok(disk.bavail*disk.bsize>=256*1024*1024);
 const browser=await getBrowser(),page=await browser.newPage(),rows=[];let bytes=0;
 try{
  for(const [id,language,p] of [['dev_1-vi-short','vi',profile],['dev_1-en-short','en',profile],['dev_1-vi-long','vi',long]]){
   const html=renderCVDataToTemplateHtml(getTemplateById('dev_1',language),groundCv(p,{},language),p,language);
   await prepareCvPage(page,html);
   const layout=await page.evaluate(()=>{
    const root=document.querySelector('.cv-page-container'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),facts=[];
    while(walker.nextNode()){
     const n=walker.currentNode,text=n.textContent.trim();if(!text||!/(Ứng viên|Công ty giả|Kỹ sư|Kiểm thử viên|Trường thử nghiệm|WORD_BOUNDARY)/.test(text))continue;
     const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect(),style=getComputedStyle(n.parentElement);
     facts.push({text,fontFamily:style.fontFamily,fontWeight:style.fontWeight,x:r.x,y:r.y,width:r.width,height:r.height});
    }
    return {facts,width:root.getBoundingClientRect().width,height:root.getBoundingClientRect().height,documentHeight:document.documentElement.scrollHeight};
   });
   const pdf=await generateCvPdf({html});bytes+=pdf.length;assert.ok(bytes<8*1024*1024,'Bounded diagnostic PDF output');
   const doc=await PDFDocument.load(pdf);for(const p of doc.getPages())assert.ok(Math.abs(p.getWidth()-595.28)<2&&Math.abs(p.getHeight()-841.89)<2,'Keep A4');
   fs.writeFileSync(path.join(out,id+'.pdf'),pdf);
   rows.push({id,language,bytes:pdf.length,pages:doc.getPageCount(),layout,requiredFacts:[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school,...(id.includes('long')?Array.from({length:12},(_,i)=>'WORD_BOUNDARY_LONG_'+i):['WORD_BOUNDARY_EXPERIENCE']),'WORD_BOUNDARY_EDUCATION','Node.js']});
  }
  const report={scope:'Source Code Pro/dev_1 short VI+EN and new long VI; parser contrast diagnostic, no acceptance or ATS certification',actualProductionRenderer:true,chromiumSandbox:true,syntheticOnly:true,cloudWrites:0,bytes,rows};
  fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:rows.length,bytes,pages:rows.map(r=>({id:r.id,pages:r.pages})),output:out}));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
