'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {renderTopcvSource}=require('../src/services/topcvSourceRenderer');
const {getTemplateById}=require('../src/services/templateService');
const {PDFDocument}=require('pdf-lib');
(async()=>{
 assert.equal(process.env.NODE_ENV,'production');const browser=await getBrowser();const page=await browser.newPage();const rows=[];
 try{for(const fit of ['contain','cover']){
  const profile={fullName:'Ứng viên giả lập',avatarDataUrl:'data:image/png;base64,'+fs.readFileSync(require('node:path').join(__dirname,'fixtures/avatar-portrait.png')).toString('base64'),avatarCrop:{fit,zoom:fit==='cover'?1.4:1,x:fit==='cover'?10:0,y:0}};
  let html=renderTopcvSource(getTemplateById('basic_1_v2','en'),{targetRole:'Synthetic role',summary:'Synthetic photo regression'},profile,'en');
  html=html.replace('<head>','<head><style data-cv-preview>@media screen{.cv-page-container{zoom:.4;margin:16px auto!important}}</style>').replace('<html ','<html style="--cv-preview-scale:.4" ');
  await prepareCvPage(page,html);
  const g=await page.evaluate(()=>{const i=document.querySelector('img[data-photo-zoom]'),f=i.closest('.cv-photo-frame'),r=f.getBoundingClientRect();return {fit:getComputedStyle(i).objectFit,width:r.width,height:r.height,zoom:i.dataset.photoZoom,previewStyles:document.querySelectorAll('[data-cv-preview]').length,previewScale:document.documentElement.style.getPropertyValue('--cv-preview-scale')};});
  assert.equal(g.fit,fit);assert.equal(g.width,264);assert.equal(g.height,169);assert.equal(g.previewStyles,0);assert.equal(g.previewScale,'');
  const buffer=await generateCvPdf({html}),pdf=await PDFDocument.load(buffer);assert.equal(pdf.getPageCount(),1);assert.ok(Math.abs(pdf.getPage(0).getWidth()-595.28)<1);rows.push({fit,...g,pages:pdf.getPageCount(),bytes:buffer.length});
 }console.log(JSON.stringify({productionSandbox:true,synthetic:true,rows}));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
