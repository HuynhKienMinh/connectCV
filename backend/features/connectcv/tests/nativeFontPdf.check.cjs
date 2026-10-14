'use strict';
// Offline synthetic before/after fidelity check. It uses the same production
// renderer and sandbox as exports; no AI, Firebase or authenticated user data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const manifest=require('../assets/topcv-source/merged-fonts.json');
const assetRoot=path.resolve(__dirname,'../assets/topcv-source/assets');
const out=process.env.CV_FONT_QA_OUTPUT||path.resolve('font-qa');
const sources=new Set(Object.values(manifest.weights).flatMap(x=>x.sources.map(s=>s.file)));
const originalFonts=html=>html.replace(/url\(\/api\/cv\/source-assets\/([a-z0-9]+\.woff2)\)/g,(match,file)=>sources.has(file)?`url(data:font/woff2;base64,${fs.readFileSync(path.join(assetRoot,file)).toString('base64')})`:match);
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.com',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. NATIVE_FINAL_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'Dữ liệu giả'}]};
const crop={...profile,avatarDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',avatarCrop:{zoom:2,x:20,y:-15}};
const long={...profile,experience:Array.from({length:12},(_,i)=>({...profile.experience[0],company:'Công ty giả '+i,bullets:['Kiểm tra dữ liệu giả và triển khai phần mềm. LONG_NATIVE_'+i]}))};
const cases=[['formal-vi-short','formal','vi',profile],['formal-en-short','formal','en',profile],['formal-vi-long','formal','vi',long],['formal-vi-crop','formal','vi',crop],['ambitious-vi-short','ambitious','vi',profile],['senior_2-en-short','senior_2','en',profile]];
async function geometry(page){return page.evaluate(()=>{
 const root=document.querySelector('.cv-page-container'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),rows=[];
 while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();if(r.width&&r.height)rows.push({text:n.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height});}
 return {rows,photos:[...root.querySelectorAll('.cv-photo-frame')].map(x=>({style:x.getAttribute('style'),transform:x.querySelector('img')?.style.transform}))};
});}
(async()=>{
 assert.equal(process.env.NODE_ENV,'production');fs.mkdirSync(out,{recursive:true});const browser=await getBrowser(),page=await browser.newPage(),results=[];
 try{for(const [id,slug,lang,p] of cases){
  const html=renderCVDataToTemplateHtml(getTemplateById(slug,lang),groundCv(p,{},lang),p,lang),layouts={},pages={};
  for(const [variant,document] of [['baseline',originalFonts(html)],['fixed',html]]){
   await prepareCvPage(page,document);layouts[variant]=await geometry(page);
   const pdf=await generateCvPdf({html:document});fs.writeFileSync(path.join(out,id+'-'+variant+'.pdf'),pdf);pages[variant]=(await PDFDocument.load(pdf)).getPageCount();
  }
  assert.deepEqual(layouts.fixed,layouts.baseline,id+' text/geometry/crop changed');assert.equal(pages.fixed,pages.baseline,id+' pagination changed');
  results.push({id,pages:pages.fixed,textRuns:layouts.fixed.rows.length,geometryExact:true,cropExact:true,marker:id.includes('long')?'LONG_NATIVE_11':'NATIVE_FINAL_SOURCE',wholeWordsRequired:slug==='formal'});
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'four Be Vietnam Pro normal weights; original template CSS unchanged',cases:results},null,2)+'\n');console.log(JSON.stringify(results));
 }finally{await page.close();await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
