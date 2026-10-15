'use strict';
// Actual Studio controller, native CV and photo editor. Synthetic profile/image only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),Module=require('node:module');
const {chromium}=require('playwright-core');
const {renderTopcvSource}=require('../src/services/topcvSourceRenderer');
const {getTemplateById}=require('../src/services/templateService');
const {groundCv}=require('../src/services/cvGroundingService');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../../..');
const studio=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const ci=process.env.CI==='true';
const beforeStudio=ci?studio:execFileSync('git',['show','b3ca417:backend/features/connectcv/public/index.html'],{cwd:repo,encoding:'utf8'});
const old=new Module(require.resolve('../src/services/topcvSourceRenderer'),module);old.filename=require.resolve('../src/services/topcvSourceRenderer');old.paths=module.paths;
if(!ci)old._compile(execFileSync('git',['show','b3ca417:backend/features/connectcv/src/services/topcvSourceRenderer.js'],{cwd:repo,encoding:'utf8'}),old.filename);
const image='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'fixtures/avatar-portrait.png')).toString('base64');
const profile={fullName:'Ứng viên giả lập',targetRole:'Backend Developer Node.js',avatarDataUrl:image,skills:['Node.js','SQL'],summary:'Hồ sơ giả để test, không phải người thật.',education:[{school:'Trường giả lập',degree:'Công nghệ thông tin',time:'2020 - 2024'}],experience:[{company:'Công ty giả lập',role:'Developer',time:'2024 - 2025',bullets:['Kiểm thử dữ liệu giả.']} ]};
const cv={...groundCv(profile,{},'en'),atsScore:50,language:'en'};
const native=phase=>(phase==='before'?old.exports.renderTopcvSource:renderTopcvSource)(getTemplateById('basic_1_v2','en'),cv,profile,'en');
function pageHtml(phase){
 const src=phase==='before'?beforeStudio:studio;
 const funcs=src.slice(src.indexOf('    function toggleCVFullscreen()'),src.indexOf("    window.addEventListener('message', event => {"));
 const a=src.indexOf('function escapeHTML('),b=src.indexOf('\n    }',a)+6;
 const modal=src.slice(src.indexOf('<div class="fixed inset-0 bg-slate-900/80'),src.indexOf('<!-- MODAL XEM CHI TIẾT CÔNG VIỆC'));
 return '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/ai/css/studio.css">'+(phase==='after'?'<script src="/ai/js/cv-preview.js"></script>':'')+'</head><body><main class="p-4"><h1>CV test '+phase+' · Hồ sơ/ảnh giả</h1><button onclick="toggleCVFullscreen()" id="open">Mở toàn màn hình</button><div id="cv-result" style="height:720px"></div></main>'+modal+'<script>let latestRenderedHtml='+JSON.stringify(phase==='before'?native(phase).replace('/ai/js/cv-photo-editor.js','/ai/js/cv-photo-editor.js?phase=before'):native(phase)).replace(/</g,'\\u003c')+';let latestCVData='+JSON.stringify(cv)+';let currentCVLanguage="en", currentCVTab="visual", currentAppliedTemplate={title:"Basic 1",id:"basic_1_v2"},currentSelectedTemplateId="basic_1_v2",batchCVResults=[],activeBatchIndex=0,cvLanguageCache={en:null,vi:null};'+src.slice(a,b)+'\n'+funcs+'\nrenderCVResult(latestCVData,latestRenderedHtml);</script></body></html>';
}
const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');let file;
 if(url.pathname==='/before'||url.pathname==='/after'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(pageHtml(url.pathname.slice(1)));}
 if(url.pathname==='/ai/js/cv-photo-editor.js'&&url.searchParams.get('phase')==='before'){res.setHeader('Content-Type','text/javascript');return res.end(execFileSync('git',['show','b3ca417:backend/features/connectcv/public/js/cv-photo-editor.js'],{cwd:repo}));}
 if(/^\/ai\/(js\/(cv-photo-layout|cv-photo-editor|cv-preview)\.js|css\/studio\.css)$/.test(url.pathname))file=path.join(root,'public',url.pathname.slice(4));
 const asset=/^\/api\/cv\/source-assets\/([a-zA-Z0-9_-]+\.[a-z0-9]+)$/.exec(url.pathname);if(asset)file=path.join(root,'assets/topcv-source/assets',asset[1]);
 if(!file||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
const out=process.env.CV_PREVIEW_QA_OUTPUT;
async function geometry(frame){return frame.locator('html').evaluate(()=>{const page=document.querySelector('.cv-page-container'),img=page.querySelector('img[data-photo-zoom]'),r=page.getBoundingClientRect(),f=img.closest('.cv-photo-frame'),ir=img.getBoundingClientRect();return {viewport:document.documentElement.clientWidth,page:{x:r.x,width:r.width},photo:{width:ir.width,height:ir.height,fit:getComputedStyle(img).objectFit,frameWidth:f?.offsetWidth,frameHeight:f?.offsetHeight,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight},previewStyles:document.querySelectorAll('[data-cv-preview]').length};});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 if(process.env.CV_PREVIEW_SERVE==='1'){console.log(base+'/after');return;}
 assert.ok(out);fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});const page=await browser.newPage({viewport:{width:1366,height:950}});const rows=[];const errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>{errors.push(e.message);console.error('Fixture page:',e.message)});
 await page.route('**/*',route=>route.request().url().startsWith(base)||route.request().url().startsWith('data:')?route.continue():route.abort());
 try{
  if(!ci){await page.goto(base+'/before');await page.locator('#cv-rendered-iframe').contentFrame().locator('.cv-photo-frame').waitFor();let f=page.locator('#cv-rendered-iframe').contentFrame();const before=await geometry(f);assert.ok(Math.abs(before.page.x-(before.viewport-before.page.width)/2)>20);assert.equal(before.photo.fit,'cover');rows.push({phase:'before',...before});await page.screenshot({path:path.join(out,'before.png')});}
  let f;
  for(const width of [1366,390]){
   await page.setViewportSize({width,height:950});await page.goto(base+'/after');await page.locator('#cv-rendered-iframe').contentFrame().locator('.cv-photo-frame').waitFor();f=page.locator('#cv-rendered-iframe').contentFrame();await f.locator('[data-cv-preview]').waitFor({state:'attached'});const normal=await geometry(f);assert.ok(Math.abs(normal.page.x-(normal.viewport-normal.page.width)/2)<2,JSON.stringify(normal));assert.equal(normal.photo.fit,'contain');assert.ok(normal.page.width<=normal.viewport);rows.push({phase:'after-normal',width,...normal});
   await page.locator('#open').click();f=page.locator('#iframe-cv-fullscreen').contentFrame();await f.locator('[data-cv-preview]').waitFor({state:'attached'});const full=await geometry(f);assert.ok(Math.abs(full.page.x-(full.viewport-full.page.width)/2)<2,JSON.stringify(full));assert.equal(full.photo.fit,'contain');assert.equal(full.photo.frameWidth,normal.photo.frameWidth,'Moving to fullscreen must not enlarge canonical photo frame');rows.push({phase:'after-full',width,...full});await page.screenshot({path:path.join(out,'after-'+width+'.png')});
   await f.locator('.cv-photo-frame').click();await f.locator('[data-control=fit]').selectOption('cover');await f.locator('[data-control=zoom]').fill('140');await f.locator('[data-control=zoom]').dispatchEvent('input');await f.locator('[data-action=done]').click();
   const exported=await page.evaluate(()=>getCurrentCVHtml(document.getElementById('iframe-cv-fullscreen')));assert.ok(!exported.includes('data-cv-preview'));assert.ok(!exported.includes('--cv-preview-scale'));assert.ok(exported.includes('data-photo-fit="cover"'));assert.ok(exported.includes('data-photo-zoom="1.4"'));
   await page.getByRole('button',{name:'✕',exact:true}).click();await page.locator('#cv-rendered-iframe').contentFrame().locator('[data-cv-preview]').waitFor({state:'attached'});assert.equal(await page.locator('#cv-rendered-iframe').contentFrame().locator('img[data-photo-fit]').getAttribute('data-photo-fit'),'cover');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({synthetic:true,cloudWrites:0,realAiCalls:0,rows,errors},null,2));console.log(JSON.stringify({rows,errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});


