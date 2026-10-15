'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=source.indexOf('    async function loadCommunityQuestions()'),end=source.indexOf('    // ========================================================',start);
assert.ok(start>0&&end>start);const feedController=source.slice(start,end);
const escapeStart=source.indexOf('    function escapeHTML('),escapeEnd=source.indexOf('    function renderMarkdownSafe(',escapeStart);assert.ok(escapeStart>0&&escapeEnd>escapeStart);
const post={id:'synthetic-post',anonymous:true,companyName:'Công ty GIẢ LẬP',position:'Chuyên viên bán lẻ',interviewQuestions:['Bạn hỗ trợ khách hàng đổi sản phẩm như thế nào?'],reviewText:'Dữ liệu giả dành cho kiểm thử local.',likesCount:0,difficultyRating:3,tags:['Bán lẻ'],sharedAt:'2026-10-16T01:00:00Z'};
const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ai/css/studio.css"><link rel="stylesheet" href="/ai/css/community-report.css"><script src="/ai/js/community-report.js" defer></script></head><body><main style="max-width:800px;margin:auto;padding:16px"><h1>Kiểm thử báo cáo · dữ liệu giả</h1><p id="debrief-stats-label"></p><div id="debrief-feed"></div></main><script>let currentDebriefSearchQuery="",currentDebriefCategory="ALL",currentDebriefMinDifficulty=0,currentDebriefSort="newest";function formatRelativeTime(){return "Vừa xong";}'+source.slice(escapeStart,escapeEnd)+feedController+'loadCommunityQuestions();</script></body></html>';
let mode='success',requests=[],receiptSaved=false;
const receipt='a'.repeat(64),server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/interview/community-questions'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({success:true,data:[post],totalEntries:1}));}
 if(url.pathname==='/api/interview/community-questions/synthetic-post/report'){
  let body='';req.on('data',part=>body+=part);req.on('end',()=>{
   requests.push(JSON.parse(body));assert.deepEqual(Object.keys(JSON.parse(body)),['reason']);res.setHeader('Content-Type','application/json');
   if(mode==='network'){receiptSaved=true;return req.socket.destroy();}
   if(mode==='slow')return;
   if(mode==='malformed')return res.end(JSON.stringify({success:true,data:{status:'received',reportId:'<img src=x onerror=alert(1)>'}}));
   if(mode!=='success'){res.statusCode=Number(mode);return res.end(JSON.stringify({success:false,message:'PRIVATE_SERVER_SENTINEL <img src=x onerror=alert(1)>'}));}
   const alreadyReported=receiptSaved;receiptSaved=true;res.end(JSON.stringify({success:true,data:{reportId:receipt,status:'received',alreadyReported}}));
  });return;
 }
 const allowed=new Map([['/ai/js/community-report.js','js/community-report.js'],['/ai/css/community-report.css','css/community-report.css'],['/ai/css/studio.css','css/studio.css']]);
 if(allowed.has(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/css');return res.end(fs.readFileSync(path.join(root,allowed.get(url.pathname))));}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()}),page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[],rows=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const out=process.env.REPORT_UI_QA_OUTPUT;assert.ok(out);fs.mkdirSync(out,{recursive:true});
 const dialog=page.getByRole('dialog',{name:'Báo cáo bài chia sẻ'}),reason=page.getByLabel('Lý do báo cáo'),status=dialog.getByRole('status'),send=page.getByRole('button',{name:'Gửi báo cáo',exact:true});
 async function open(){await page.getByRole('button',{name:'Báo cáo',exact:true}).click();await dialog.waitFor();assert.equal(await reason.evaluate(el=>el===document.activeElement),true);}
 async function submit(value='spam'){await reason.selectOption(value);await send.click();}
 async function close(){await page.getByRole('button',{name:'Đóng',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(await page.getByRole('button',{name:'Báo cáo',exact:true}).evaluate(el=>el===document.activeElement),true);}
 try{
  await page.goto(base);await open();const before=requests.length;await send.click();assert.equal(requests.length,before);assert.equal(await reason.evaluate(el=>el.validity.valueMissing),true);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});rows.push({phase:'required-keyboard-cancel',pass:true});
  for(const code of ['401','403','404','429','503']){mode=code;await open();await submit('personal-information');await status.filter({hasText:/đăng nhập|xác minh|chưa sẵn sàng|quá nhanh|Chưa gửi được/}).waitFor();assert.equal(await reason.inputValue(),'personal-information');assert.equal(await send.isEnabled(),true);assert.doesNotMatch(await status.innerText(),/PRIVATE_SERVER_SENTINEL|<img/);await close();rows.push({phase:'error-'+code,pass:true});}
  mode='network';await open();await submit('harassment');await status.filter({hasText:'Chưa xác nhận'}).waitFor();assert.equal(await reason.inputValue(),'harassment');assert.equal(await send.isEnabled(),true);
  mode='success';await send.click();await status.filter({hasText:'Báo cáo trước vẫn được giữ'}).waitFor();assert.equal(await send.isDisabled(),true);await close();rows.push({phase:'lost-response-retry-receipt',pass:true});
  mode='malformed';await open();await submit();await status.filter({hasText:'Chưa xác nhận'}).waitFor();assert.equal(await dialog.locator('img').count(),0);await close();rows.push({phase:'untrusted-receipt-not-success',pass:true});
  mode='slow';await open();const beforeSlow=requests.length;await submit();await status.filter({hasText:'Đang gửi'}).waitFor();await page.evaluate(()=>document.querySelector('#community-report-dialog form').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true})));await status.filter({hasText:'Chưa xác nhận'}).waitFor();assert.equal(requests.length,beforeSlow+1);assert.equal(await send.isEnabled(),true);assert.equal(await reason.inputValue(),'spam');await close();rows.push({phase:'timeout-and-double-submit',pass:true});
  await page.evaluate(()=>{window.fixtureFetch=window.fetch;window.fetch=()=>new Promise(resolve=>{window.resolveOldReport=()=>resolve(new Response(JSON.stringify({success:true,data:{reportId:'a'.repeat(64),status:'received'}}),{status:200,headers:{'Content-Type':'application/json'}}));});});await open();await submit();await page.evaluate(()=>window.dispatchEvent(new Event('connectcv:logout')));await dialog.waitFor({state:'hidden'});await page.evaluate(()=>{window.fetch=window.fixtureFetch;});await open();assert.equal(await reason.inputValue(),'');await page.evaluate(()=>window.resolveOldReport());await page.waitForTimeout(50);assert.equal(await status.innerText(),'');await close();rows.push({phase:'logout-discards-late-result',pass:true});
  for(const width of [1366,390]){
   await page.setViewportSize({width,height:844});await open();const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert.equal(await dialog.locator('textarea,input').count(),0);assert.match(await dialog.innerText(),/tài khoản gửi được lưu|không thay đổi Credits/);
   await page.screenshot({path:path.join(out,'report-dialog-'+width+'.png')});await close();rows.push({phase:'viewport-'+width,pass:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report-ui.json'),JSON.stringify({synthetic:true,cloudWrites:0,realAiCalls:0,mockedTransport:true,requests:requests.length,rows,errors},null,2));console.log(JSON.stringify({rows,errors}));
 }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(error=>{console.error(error.stack);server.closeAllConnections();server.close();process.exitCode=1;});
