'use strict';
// Controlled local causal probe; no production font replacement or verifier change.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const out=process.env.CV_SWITCH_QA_OUTPUT;
assert.ok(out&&!fs.existsSync(out),'Set a new owned CV_SWITCH_QA_OUTPUT');assert.equal(process.env.NODE_ENV,'production');
const p={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử'};
const source=renderCVDataToTemplateHtml(getTemplateById('dev_1','vi'),groundCv(p,{},'vi'),p,'vi');
const rules=[...source.matchAll(/@font-face\s*\{[^}]*\}/gi)].map(m=>m[0]).filter(r=>/font-family:\s*(['"])Source Code Pro\1/.test(r));
assert.equal(rules.length,13,'Five original TTF rules plus eight original variable subset rules');
const lineText={vi:'Ứng viên thử nghiệm Công ty giả',ascii:'Candidate Example Synthetic Company'};
const rows=[300,400,500,600,700].flatMap(weight=>Object.entries(lineText).map(([kind,text])=>({id:'W'+weight+'_'+kind,weight,kind,text})));
(async()=>{
 fs.mkdirSync(out,{recursive:true});assert.ok(fs.statfsSync(out).bavail*fs.statfsSync(out).bsize>256*1024*1024);
 const browser=await getBrowser(),page=await browser.newPage(),results=[];
 try{
  for(const variant of ['original-subsets','original-template-ttf-control']){
   const faces=variant==='original-subsets'?rules:rules.filter(r=>/\.ttf\)/.test(r));assert.equal(faces.length,variant==='original-subsets'?13:5);
   const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${faces.join('\n')}html,body{margin:0}.cv-page-container{box-sizing:border-box;width:794px;min-height:1123px;padding:40px}p{font-family:'Source Code Pro';font-size:18px;line-height:30px;margin:0 0 12px}</style></head><body><main class="cv-page-container" data-native-topcv="true">${rows.map(r=>`<p data-probe="${r.id}" style="font-weight:${r.weight}">${r.id} ${r.text}</p>`).join('')}</main></body></html>`;
   await prepareCvPage(page,html);
   const geometry=await page.evaluate(()=>[...document.querySelectorAll('[data-probe]')].map(e=>{const range=document.createRange();range.selectNodeContents(e);const b=range.getBoundingClientRect();return {id:e.dataset.probe,text:e.textContent,fontFamily:getComputedStyle(e).fontFamily,fontWeight:getComputedStyle(e).fontWeight,x:b.x,y:b.y,width:b.width,height:b.height};}));
   const pdf=await generateCvPdf({html});assert.ok(pdf.length<2*1024*1024);fs.writeFileSync(path.join(out,variant+'.pdf'),pdf);
   results.push({variant,bytes:pdf.length,geometry});
  }
  const result={scope:'Source Code Pro controlled weight300/400/500/600/700 VI/ASCII; existing original TTF control is a diagnostic intervention, not a candidate fix',actualProductionRenderer:true,chromiumSandbox:true,cloudWrites:0,originalRulesUnchanged:true,geometryExact:JSON.stringify(results[0].geometry)===JSON.stringify(results[1].geometry),rows,results};
  fs.writeFileSync(path.join(out,'switch-render.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({variants:results.length,rowsPerVariant:rows.length,geometryExact:result.geometryExact,bytes:results.reduce((n,r)=>n+r.bytes,0)}));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
