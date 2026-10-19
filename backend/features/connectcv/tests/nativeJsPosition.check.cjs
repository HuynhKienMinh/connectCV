'use strict';
// Opt-in bounded JavaScript text-position prototype acceptance using the actual renderer.
// Synthetic facts, actual renderer and sandbox; no AI/auth/database/network calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {PDFDocument}=require('pdf-lib');
const {foldPdf}=require('../tools/pdfTextPositionPrototype.cjs');
const out=process.env.CV_POSITION_QA_OUTPUT;
assert.ok(out,'Set CV_POSITION_QA_OUTPUT to owned temporary staging');
assert.equal(process.env.NODE_ENV,'production','Keep actual production browser sandbox');
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.invalid',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. WORD_BOUNDARY_EXPERIENCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'WORD_BOUNDARY_EDUCATION'}]};
const crop={...profile,avatarDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',avatarCrop:{zoom:2,x:20,y:-15}};
const long={...profile,experience:Array.from({length:12},(_,i)=>({...profile.experience[0],company:'Công ty giả '+i,bullets:['Kiểm tra dữ liệu giả và triển khai phần mềm. WORD_BOUNDARY_LONG_'+i]}))};
(async()=>{
 assert.ok(!fs.existsSync(out),'Do not reuse or overwrite diagnostic artifacts');fs.mkdirSync(out,{recursive:true});
 const disk=fs.statfsSync(out);assert.ok(disk.bavail*disk.bsize>=256*1024*1024);
 const browser=await getBrowser(),page=await browser.newPage(),rows=[];let bytes=0;
 try{
  for(const [id,slug,language,p] of [['dev_1-vi-short','dev_1','vi',profile],['dev_1-en-short','dev_1','en',profile],['dev_1-vi-long','dev_1','vi',long],['ambitious-vi-short','ambitious','vi',profile],['ambitious-en-short','ambitious','en',profile],['ambitious-vi-long','ambitious','vi',long],['ambitious-vi-crop','ambitious','vi',crop]]){
   const html=renderCVDataToTemplateHtml(getTemplateById(slug,language),groundCv(p,{},language),p,language);
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
   const pdf=await generateCvPdf({html});const fixed=await foldPdf(pdf);assert.equal(fixed.reason,null,id+' skipped');if(!fixed.folded){fs.writeFileSync(path.join(out,id+'-unmatched.pdf'),pdf);throw Error(id+' must exercise rewrite (owned diagnostic saved)');}bytes+=pdf.length+fixed.bytes.length;assert.ok(bytes<16*1024*1024,'Bounded diagnostic PDF output');
   const doc=await PDFDocument.load(pdf);for(const p of doc.getPages())assert.ok(Math.abs(p.getWidth()-595.28)<2&&Math.abs(p.getHeight()-841.89)<2,'Keep A4');
   fs.writeFileSync(path.join(out,id+'-before.pdf'),pdf);fs.writeFileSync(path.join(out,id+'-after.pdf'),fixed.bytes);const twice=await foldPdf(fixed.bytes);assert.equal(twice.folded,0);assert.deepEqual(twice.bytes,fixed.bytes);
   rows.push({id,slug,language,bytes:pdf.length,fixedBytes:fixed.bytes.length,folded:fixed.folded,idempotent:true,pages:doc.getPageCount(),layout,requiredFacts:[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school,...(id.includes('long')?Array.from({length:12},(_,i)=>'WORD_BOUNDARY_LONG_'+i):['WORD_BOUNDARY_EXPERIENCE']),'WORD_BOUNDARY_EDUCATION','Node.js']});
  }
  const report={scope:'Seven native SourceCodePro+Roboto cases; JavaScript positioning prototype, no ATS certification',actualProductionRenderer:true,chromiumSandbox:true,syntheticOnly:true,cloudWrites:0,bytes,rows};
  fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:rows.length,bytes,pages:rows.map(r=>({id:r.id,pages:r.pages})),output:out}));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
