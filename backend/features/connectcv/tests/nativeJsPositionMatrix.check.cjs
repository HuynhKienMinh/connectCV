'use strict';
// Opt-in local sweep: one owned PDF pair at a time, independent parser/raster verification.
// No app route imports this file. No AI/Firebase/provider calls or credential reads.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {getAvailableTemplates,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {foldPdf}=require('../tools/pdfTextPositionPrototype.cjs');
const {PDFDocument}=require('pdf-lib');
const out=process.env.CV_POSITION_MATRIX_OUTPUT,python=process.env.CV_QA_PYTHON;
assert.ok(out&&python,'Set fresh owned CV_POSITION_MATRIX_OUTPUT and CV_QA_PYTHON');
assert.equal(process.env.NODE_ENV,'production','Keep Chromium sandbox');
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.test',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. MATRIX_EXPERIENCE_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'MATRIX_EDUCATION_SOURCE'}]};
const requiredFacts=[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school,'MATRIX_EXPERIENCE_SOURCE','MATRIX_EDUCATION_SOURCE','Node.js'];
const scope='74 native templates x VI/EN, short synthetic profile; offline JS prototype; strict parser failures retained; no commercial ATS certification';
(async()=>{
 assert.ok(!fs.existsSync(out),'Never reuse stage');fs.mkdirSync(out,{recursive:true});
 const disk=fs.statfsSync(out);assert.ok(disk.bavail*disk.bsize>=256*1024*1024,'Free256MiB required');
 const browser=await getBrowser(),rows=[];let generatedBytes=0,peakStageBytes=0;
 const checkpoint=complete=>fs.writeFileSync(path.join(out,'matrix-report.json'),JSON.stringify({scope,complete,syntheticOnly:true,chromiumSandbox:true,productionRuntimeChanged:false,cloudWrites:0,stageLimitBytes:16*1024*1024,peakStageBytes,generatedBytes,cases:rows},null,2)+'\n');
 const cases=['vi','en'].flatMap(language=>getAvailableTemplates(language).map(template=>({language,template})));
 assert.equal(cases.length,148,'Do not silently shrink matrix');
 try{
  checkpoint(false);
  for(const {language,template} of cases){
   assert.match(template.slug,/^[a-zA-Z0-9_-]+$/);
   const id=template.slug+'-'+language,html=renderCVDataToTemplateHtml(template,groundCv(profile,{},language),profile,language);
   const pdf=await generateCvPdf({html}),fixed=await foldPdf(pdf),doc=await PDFDocument.load(pdf);
   generatedBytes+=pdf.length+fixed.bytes.length;
   const row={id,slug:template.slug,language,pages:doc.getPageCount(),folded:fixed.folded,skipReason:fixed.reason,requiredFacts};
   fs.writeFileSync(path.join(out,id+'-before.pdf'),pdf);fs.writeFileSync(path.join(out,id+'-after.pdf'),fixed.bytes);
   fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify({scope,rows:[row]}));
   const result=spawnSync(python,[path.join(__dirname,'nativeJsPosition.check.py'),out],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONDONTWRITEBYTECODE:'1'}});
   assert.ifError(result.error);assert.ok([0,1].includes(result.status),'Unexpected verifier failure');
   const reportPath=path.join(out,'acceptance-report.json');assert.ok(fs.existsSync(reportPath),id+' independent verifier did not complete');
   const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
   assert.equal(report.cases.length,1);assert.equal(report.cases[0].id,id);assert.equal(result.status,report.allCasesPass?0:1);
   row.verification=report.cases[0];row.strictAcceptance=report.allCasesPass;
   row.parserFontBBoxWarnings=(result.stderr.match(/Could not get FontBBox/g)||[]).length;
   row.parserStderrSha256=crypto.createHash('sha256').update(result.stderr).digest('hex');
   const ownedNames=[id+'-before.pdf',id+'-after.pdf','render-report.json','acceptance-report.json'];
   for(let page=1;page<=row.pages;page++)for(const suffix of ['before','after'])ownedNames.push(id+'-'+suffix+'-'+page+'.png');
   const diskBytes=fs.readdirSync(out).reduce((n,file)=>n+fs.statSync(path.join(out,file)).size,0);
   peakStageBytes=Math.max(peakStageBytes,diskBytes);assert.ok(diskBytes<16*1024*1024,'Stage16MiB exceeded');
   rows.push(row);checkpoint(false);
   // Only explicit files from this case, after successful verification and checkpoint.
   for(const name of ownedNames){const file=path.join(out,name);assert.ok(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink());fs.unlinkSync(file);}
   if(rows.length%20===0)console.log(JSON.stringify({completed:rows.length,total:148,peakStageBytes}));
  }
  checkpoint(true);
  console.log(JSON.stringify({completed:rows.length,strictAcceptancePass:rows.filter(r=>r.strictAcceptance).length,pages:rows.reduce((n,r)=>n+r.pages,0),peakStageBytes,generatedBytes}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
