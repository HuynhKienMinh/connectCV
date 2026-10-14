'use strict';
// Production browser smoke with synthetic documents only. Never uses cloud data or AI.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {getBrowser,generateCvPdf,isRendererReady}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
async function inspect(buffer,marker){
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:true,verbosity:0}).promise;
 // Adjacent font runs may split accented glyphs; do not insert artificial spaces.
 try{let text='';for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i),v=p.view;assert.ok(Math.abs(v[2]-v[0]-595.28)<2&&Math.abs(v[3]-v[1]-841.89)<2,'A4 page dimensions');text+=(await p.getTextContent()).items.map(x=>(x.str||'')+(x.hasEOL?'\n':'')).join('')+'\n';}
 assert.ok(text.includes(marker),'PDF must retain final source marker');assert.ok(text.toLocaleLowerCase('vi').replace(/\s+/g,' ').includes('ứng viên thử nghiệm'),'Vietnamese glyph order must be retained ('+marker+')');return {pages:doc.numPages,bytes:buffer.length,unicodeText:true,tailPreserved:true};
 }finally{await doc.destroy();}
}
(async()=>{
 assert.equal(process.env.NODE_ENV,'production','QA must use the production sandbox policy');
 let networkHits=0;const server=http.createServer((req,res)=>{networkHits++;res.end('untrusted fixture');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;let browser,page;const rows=[];
 try{
 browser=await getBrowser();assert.equal(isRendererReady(),true);page=await browser.newPage();
 const prefix='<html><head><style>@page{size:A4;margin:0}body{font:16px Arial}.cv-page-container{box-sizing:border-box;padding:30px}</style></head><body><div class="cv-page-container"><h1>Ứng viên thử nghiệm</h1>';
 const unsafe=`${prefix}<p>SHORT_FINAL_SOURCE</p><style>@import url('http://127.0.0.1:${port}/css');body{background:url('http://127.0.0.1:${port}/background')}</style><img src="http://127.0.0.1:${port}/image" onerror="document.body.innerHTML='EXECUTED'"><iframe src="http://127.0.0.1:${port}/frame"></iframe><script>document.body.innerHTML='EXECUTED';fetch('http://127.0.0.1:${port}/script')</script></div></body></html>`;
 await prepareCvPage(page,unsafe);const safe=await page.evaluate(()=>({text:document.body.innerText,unsafe:document.querySelectorAll('script,iframe,[onerror]').length}));assert.equal(safe.unsafe,0);assert.ok(!safe.text.includes('EXECUTED'));assert.equal(networkHits,0);
 const short=await generateCvPdf({html:unsafe});rows.push({id:'short-isolated',...await inspect(short,'SHORT_FINAL_SOURCE')});assert.equal(networkHits,0);
 const longHtml=prefix+Array.from({length:80},(_,i)=>`<p>Dự án giả ${i}: kiểm thử triển khai ứng dụng. LONG_SOURCE_${i}</p>`).join('')+'</div></body></html>';
 const long=await generateCvPdf({html:longHtml});rows.push({id:'long',...await inspect(long,'LONG_SOURCE_79')});assert.ok(rows[1].pages>1);
 const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF.',email:'fixture@example.com',skills:['SQL'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['NATIVE_FINAL_SOURCE']}],education:[],avatarDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='};
 const html=renderCVDataToTemplateHtml(getTemplateById('formal','vi'),groundCv(profile,{},'vi'),profile,'vi');
 const native=await generateCvPdf({html});
 if(process.env.CV_PDF_QA_OUTPUT){fs.mkdirSync(process.env.CV_PDF_QA_OUTPUT,{recursive:true});for(const [name,buffer] of [['short',short],['long',long],['native-formal',native]])fs.writeFileSync(path.join(process.env.CV_PDF_QA_OUTPUT,name+'.pdf'),buffer);}
 rows.push({id:'native-formal',...await inspect(native,'NATIVE_FINAL_SOURCE')});assert.equal(networkHits,0);
 console.log(JSON.stringify({productionPolicy:true,documentScriptsBlocked:true,externalFixtureHits:networkHits,rows}));
 }finally{if(page)await page.close();if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
