'use strict';
// Investigate variable-font subset extraction without modifying production assets.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {getBrowser,generateCvPdf}=require('../src/services/pdfService');
const {prepareCvPage}=require('../src/services/cvRenderRuntime');
const {getTemplateById,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const out=process.env.CV_ROBOTO_QA_OUTPUT;assert.ok(out,'Set temporary CV_ROBOTO_QA_OUTPUT');
assert.equal(process.env.NODE_ENV,'production','Keep production sandbox policy');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'prototype.json'),'utf8'));
const sourceNames=new Set(manifest.sources.map(x=>x.file));
const profile={fullName:'Ứng viên thử nghiệm',targetRole:'Kỹ sư kiểm thử',summary:'Hồ sơ giả để kiểm tra xuất PDF. Kinh nghiệm xây dựng và kiểm thử phần mềm.',email:'fixture@example.test',phone:'0102345678',address:'Thành phố giả',skills:['SQL','Node.js'],experience:[{company:'Công ty giả',role:'Kiểm thử viên',time:'2024 - 2025',bullets:['Kiểm tra ứng dụng bằng dữ liệu giả. MATRIX_EXPERIENCE_SOURCE']}],education:[{school:'Trường thử nghiệm',degree:'Kỹ thuật phần mềm',time:'2020 - 2024',highlight:'MATRIX_EDUCATION_SOURCE'}]};
const long={...profile,experience:Array.from({length:12},(_,i)=>({...profile.experience[0],company:'Công ty giả '+i,bullets:['Kiểm tra dữ liệu giả và triển khai phần mềm. ROBOTO_LONG_'+i]}))};
const crop={...profile,avatarDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',avatarCrop:{zoom:2,x:20,y:-15}};
function prototypeFonts(html){
 const seen=new Set();
 return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,style=>style.replace(/@font-face\s*\{[^}]*\}/gi,rule=>{
  if(!/font-family:\s*(['"])Roboto\1\s*;/i.test(rule)||!/font-style:\s*normal\s*;/i.test(rule))return rule;
  const weight=rule.match(/font-weight:\s*(\d+)\s*;/i)?.[1],entry=manifest.weights[weight];
  const src=rule.match(/src:\s*url\(\s*(['"]?)(\/api\/cv\/source-assets\/([a-z0-9]+\.woff2))\1\s*\)\s*format\((['"])woff2\4\)\s*;/i);
  if(!entry||!src||!sourceNames.has(src[3]))return rule;
  if(seen.has(weight))return '';seen.add(weight);
  const data=fs.readFileSync(path.join(out,entry.file)).toString('base64');
  return rule.replace(src[0],`src:url(data:font/woff2;base64,${data}) format('woff2');`).replace(/unicode-range:[^;]*;/i,'');
 }));
}
async function geometry(page){return page.evaluate(()=>{
 const root=document.querySelector('.cv-page-container'),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),rows=[];
 while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);const b=r.getBoundingClientRect();if(b.width&&b.height)rows.push({text:n.textContent.trim(),x:b.x,y:b.y,width:b.width,height:b.height});}
 return {rows,photos:[...root.querySelectorAll('.cv-photo-frame')].map(x=>({style:x.getAttribute('style'),transform:x.querySelector('img')?.style.transform}))};
});}
(async()=>{
 const browser=await getBrowser(),page=await browser.newPage(),cases=[];
 let bytes=0;
 try{for(const [id,slug,language,p] of [['ambitious-vi-short','ambitious','vi',profile],['ambitious-en-short','ambitious','en',profile],['ambitious-vi-long','ambitious','vi',long],['ambitious-vi-crop','ambitious','vi',crop],['default_v2-vi-short','default_v2','vi',profile],['default_v2-en-short','default_v2','en',profile]]){
  const html=renderCVDataToTemplateHtml(getTemplateById(slug,language),groundCv(p,{},language),p,language),layouts={},pages={};
  for(const [variant,document] of [['baseline',html],['prototype',prototypeFonts(html)]]){
   await prepareCvPage(page,document);layouts[variant]=await geometry(page);
   const pdf=await generateCvPdf({html:document});bytes+=pdf.length;assert.ok(bytes<8*1024*1024,'Bounded prototype output:8MB');
   fs.writeFileSync(path.join(out,id+'-'+variant+'.pdf'),pdf);pages[variant]=(await PDFDocument.load(pdf)).getPageCount();
  }
  const geometryExact=JSON.stringify(layouts.baseline)===JSON.stringify(layouts.prototype),paginationExact=pages.baseline===pages.prototype;
  cases.push({id,pages:pages.prototype,geometryExact,paginationExact,marker:id.includes('long')?'ROBOTO_LONG_11':'MATRIX_EXPERIENCE_SOURCE',requiredFacts:[profile.fullName,profile.targetRole,profile.experience[0].company,profile.experience[0].role,profile.education[0].school],baseline:layouts.baseline,prototype:layouts.prototype});
 }
 fs.writeFileSync(path.join(out,'fidelity.json'),JSON.stringify({scope:manifest.strategy||'Roboto variable subsets instantiated at four normal weights; six synthetic cases; prototype only',bytes,cases},null,2)+'\n');
 console.log(JSON.stringify(cases.map(({baseline,prototype,...rest})=>rest)));
 }finally{await page.close();await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
