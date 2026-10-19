'use strict';
// Whole Studio/controller/assets; synthetic transport and account balance, no cloud actors.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),express=require('express');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public'),out=process.env.RECEIPT_UI_QA_OUTPUT;assert.ok(out);fs.mkdirSync(out,{recursive:true});
const source=process.env.RECEIPT_UI_SOURCE_REF?execFileSync('git',['show',`${process.env.RECEIPT_UI_SOURCE_REF}:backend/features/connectcv/public/index.html`],{encoding:'utf8',maxBuffer:2*1024*1024}):fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=express(),rows=[];app.get('/ai/runtime.js',(q,s)=>s.type('js').send('window.connectCVParentOrigins=[];window.connectCVServerPdf=false;'));
app.get('/ai/',(q,s)=>s.type('html').send(source));app.use('/ai',express.static(root));app.use('/api',(q,s)=>s.status(401).json({success:false}));
(async()=>{let server,browser;try{
 server=app.listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();page.setDefaultTimeout(5000);
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.addInitScript(()=>{
  const native=fetch.bind(window),qa=window.__receiptQA={calls:[],accountReads:0,credits:15,mode:'pending',saved:0,beforeReads:0};
  const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  window.fetch=(resource,options={})=>{const url=new URL(resource instanceof Request?resource.url:String(resource),location.href);
   if(url.pathname==='/api/account/me'){qa.accountReads++;return Promise.resolve(response({credits:qa.credits,profile:{},profileVersion:'synthetic-profile-version'}));}
   if(url.pathname==='/api/interview/community-questions')return Promise.resolve(response({success:true,data:[],totalEntries:0,allTotalCount:0,topCompanies:[]}));
   if(url.pathname==='/api/interview/debrief'){
    const call={body:JSON.parse(options.body)};qa.calls.push(call);
    if(qa.mode==='loss-first'&&qa.calls.length===1){qa.saved=1;qa.credits=20;return Promise.reject(new TypeError('Synthetic socket lost after commit'));}
    return new Promise(resolve=>{call.finish=(overrides={},status=200)=>{qa.credits=20;resolve(response({success:status<300,message:status<300?'Bài chia sẻ này đã được lưu từ lần gửi trước. Không cộng thưởng lần nữa.':'Nội dung đã được chia sẻ.',data:status<300?{debriefId:'synthetic-post',awardedCredits:0,pendingCredits:0,creditStatus:'awarded',rewardId:'community-synthetic-post',alreadyShared:true,publishedAt:new Date(Date.now()-3600000).toISOString(),...overrides}:undefined},status));};});
   }
   return native(resource,options);
  };
 });
 const company=page.locator('#deb-company'),review=page.locator('#deb-review'),button=page.locator('#btn-debrief'),preview=page.locator('#deb-public-preview');
 async function reset(){await page.goto(base+'/ai/?module=social');await page.waitForFunction(()=>__receiptQA.accountReads>0&&typeof submitDebrief==='function');await company.fill('Công ty Giả Lập');await page.locator('#deb-pos').fill('Chuyên viên bán lẻ');await page.locator('#deb-questions').fill('Bạn xử lý yêu cầu đổi hàng của khách như thế nào?');await review.fill('Buổi phỏng vấn giả định để kiểm thử.');await page.evaluate(()=>__receiptQA.beforeReads=__receiptQA.accountReads);}
 async function send(){await button.click();await preview.waitFor({state:'visible'});await page.locator('#deb-public-confirm').check();await button.click();await page.waitForFunction(()=>__receiptQA.calls.length>0);}
 async function finish(i=0,changes={},status=200){await page.evaluate(({i,changes,status})=>__receiptQA.calls[i].finish(changes,status),{i,changes,status});await page.waitForFunction(()=>!_debriefSubmitting);}
 async function test(name,fn){try{await reset();await fn();rows.push({phase:name,pass:true});}catch(e){rows.push({phase:name,pass:false,error:e.message.slice(0,900)});}}
 await test('lost-receipt-explicit-retry-refreshes-authoritative-balance',async()=>{await page.evaluate(()=>__receiptQA.mode='loss-first');await send();await page.waitForFunction(()=>!_debriefSubmitting);assert.equal(await company.inputValue(),'Công ty Giả Lập');assert.equal(await page.evaluate(()=>__receiptQA.calls.length),1);await button.click();await page.waitForFunction(()=>__receiptQA.calls.length===2);await finish(1);assert.equal(await page.locator('#creditBalance').innerText(),'20');assert.equal(await page.evaluate(()=>__receiptQA.saved),1);assert.equal(await company.inputValue(),'');});
 await test('receipt-keeps-original-publication-cooldown',async()=>{await send();const publishedAt=new Date(Date.now()-3600000).toISOString();await finish(0,{publishedAt});assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem(DEBRIEF_COOLDOWN_KEY))),Date.parse(publishedAt));});
 await test('expired-receipt-does-not-start-another-six-hour-wait',async()=>{await send();await finish(0,{publishedAt:new Date(Date.now()-7*3600000).toISOString()});assert.equal(await button.isEnabled(),true);});
 await test('first-success-still-refreshes-account-and-clears-submitted-form',async()=>{await send();await finish(0,{alreadyShared:false,awardedCredits:5,publishedAt:new Date().toISOString()},201);assert.equal(await page.locator('#creditBalance').innerText(),'20');assert.equal(await company.inputValue(),'');assert.equal(await button.isEnabled(),false);});
 await test('newer-draft-survives-confirmation-of-previous-submission',async()=>{await send();await review.fill('Bản nháp mới cần được giữ sau khi gửi bài trước.');await finish();assert.equal(await review.inputValue(),'Bản nháp mới cần được giữ sau khi gửi bài trước.');assert.equal(await company.inputValue(),'Công ty Giả Lập');assert.equal(await page.locator('#deb-public-confirm').isChecked(),false);});
 await test('conflict-keeps-draft-and-does-not-refresh-or-auto-retry',async()=>{await send();await finish(0,{},409);assert.equal(await company.inputValue(),'Công ty Giả Lập');assert.equal(await page.evaluate(()=>__receiptQA.accountReads-__receiptQA.beforeReads),0);assert.equal(await page.evaluate(()=>__receiptQA.calls.length),1);});
 await test('incomplete-recovery-receipt-does-not-clear-draft',async()=>{await send();await finish(0,{publishedAt:'invalid'});assert.equal(await company.inputValue(),'Công ty Giả Lập');assert.equal(await page.evaluate(()=>sessionStorage.getItem(DEBRIEF_COOLDOWN_KEY)),null);});
 await test('preview-consent-is-required-again-after-content-edit',async()=>{await button.click();assert.equal(await page.evaluate(()=>__receiptQA.calls.length),0);await page.locator('#deb-public-confirm').check();await review.fill('Bản đánh giá mới cần xem trước và đồng ý lại.');await button.click();assert.equal(await page.evaluate(()=>__receiptQA.calls.length),0);assert.equal(await page.locator('#deb-public-confirm').isChecked(),false);});
 const report={wholeStudio:true,syntheticTransport:true,realAuthVerified:false,realFirestoreVerified:false,cloudWrites:0,realAiCalls:0,rows};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(rows.filter(r=>!r.pass).length,0);
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
