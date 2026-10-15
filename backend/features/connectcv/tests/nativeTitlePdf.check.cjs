'use strict';
// Opt-in synthetic PDF regression for the four native layouts without a title.
// Before mode loads the trusted Git baseline; no AI or cloud writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {PDFDocument}=require('pdf-lib');
const out=process.env.CV_TITLE_QA_OUTPUT,phase=process.env.CV_TITLE_QA_PHASE;
assert.ok(out);assert.ok(['before','after','ci'].includes(phase));assert.equal(process.env.NODE_ENV,'production');
let render=renderCVDataToTemplateHtml;
if(phase==='before'){
 const {execFileSync}=require('node:child_process'),Module=require('node:module');
 const filename=require.resolve('../src/services/topcvSourceRenderer');
 const baseline=new Module(filename,module);baseline.filename=filename;baseline.paths=module.paths;
 baseline._compile(execFileSync('git',['show','94e4418:backend/features/connectcv/src/services/topcvSourceRenderer.js'],{cwd:path.resolve(__dirname,'../../../..'),encoding:'utf8'}),filename);
 render=baseline.exports.renderTopcvSource;
}
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF.',email:'fixture@example.test',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. MATRIX_EXPERIENCE_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'MATRIX_EDUCATION_SOURCE'}]};
const requiredFacts=[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school,'MATRIX_EXPERIENCE_SOURCE','MATRIX_EDUCATION_SOURCE','Node.js'];
async function geometry(page){return page.evaluate(()=>{
 const root=document.querySelector('.cv-page-container'),title=document.querySelector('#cvo-profile-title'),name=document.querySelector('#cvo-profile-fullname');
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,text:e.textContent.trim()}};
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),text=[];
 while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim()||n.parentElement.closest('style,script'))continue;const r=document.createRange();r.selectNodeContents(n);for(const b of r.getClientRects())if(b.width&&b.height)text.push({text:n.textContent.trim(),x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom,inTitle:!!n.parentElement.closest('#cvo-profile-title')});}
 return {root:box(root),title:box(title),name:box(name),text};
});}
(async()=>{
 fs.mkdirSync(out,{recursive:true});assert.ok(fs.statfsSync(out).bavail*fs.statfsSync(out).bsize>256*1024*1024);
 const browser=await getBrowser(),page=await browser.newPage(),rows=[];let bytes=0;
 try{for(const language of ['vi','en'])for(const slug of ['classic_1','schoolarship_standard','senior_2','software_engineer']){
  const id=slug+'-'+language,html=render(getTemplateById(slug,language),groundCv(profile,{},language),profile,language);
  if(phase==='before')fs.writeFileSync(path.join(out,id+'-before.html'),html);
  await prepareCvPage(page,html);const g=await geometry(page);
  if(phase==='before')assert.equal(g.title,null,id+' should reproduce absent title');
  else{
   assert.equal(g.title?.text,profile.targetRole,id+' must display source target role');
   assert.ok(g.title.width>0&&g.title.height>0&&g.title.x>=g.root.x&&g.title.right<=g.root.right+1,id+' title clipped');
   const titleRuns=g.text.filter(t=>t.inTitle),otherRuns=g.text.filter(t=>!t.inTitle);
   for(const a of titleRuns)for(const b of otherRuns)assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,id+' title overlaps '+b.text);
  }
  const pdf=await generateCvPdf({html});bytes+=pdf.length;assert.ok(bytes<8*1024*1024);
  fs.writeFileSync(path.join(out,id+'-'+phase+'.pdf'),pdf);
  const doc=await PDFDocument.load(pdf);const pages=doc.getPageCount();
  assert.equal(pages,1,id+' short profile must fit on one page');
  if(phase==='after'){const baseline=JSON.parse(fs.readFileSync(path.join(out,'before.json'))).rows.find(r=>r.id===id);assert.equal(pages,baseline.pages,id+' short-profile pagination changed');}
  // Keep only the header screenshot; all PDF pages are independently verified.
  await page.screenshot({path:path.join(out,id+'-'+phase+'.png'),clip:{x:0,y:0,width:794,height:400}});
  rows.push({id,pages,bytes:pdf.length,geometry:g});
 }
 if(phase!=='before')for(const slug of ['classic_1','schoolarship_standard','senior_2','software_engineer']){
  const p={...profile,targetRole:('Chuyên viên kiểm thử phần mềm và quản lý chất lượng ').repeat(5).trim()};
  const html=renderCVDataToTemplateHtml(getTemplateById(slug,'vi'),groundCv(p,{},'vi'),p,'vi');await prepareCvPage(page,html);const g=await geometry(page);
  assert.equal(g.title.text,p.targetRole);assert.ok(g.title.right<=g.root.right+1&&g.title.x>=g.root.x);assert.ok(g.title.height>30,slug+' long role should wrap');
  for(const a of g.text.filter(t=>t.inTitle))for(const b of g.text.filter(t=>!t.inTitle))assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<1||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<1,slug+' wrapped role overlaps '+b.text);
  rows.push({id:slug+'-vi-long-title',geometry:g});
 }
 fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify({phase,scope:'four native layouts, VI/EN short profile; after also long-title DOM; synthetic only',requiredFacts,bytes,rows},null,2)+'\n');console.log(JSON.stringify({phase,cases:rows.length,bytes}));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
