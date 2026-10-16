'use strict';
// Whole Studio document and local assets, synthetic delayed transport only.
// This checks browser lifecycle/DOM integration, not Firebase login or model semantics.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),express=require('express');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public');
const source=process.env.CHAT_BROWSER_SOURCE_REF
 ?execFileSync('git',['show',`${process.env.CHAT_BROWSER_SOURCE_REF}:backend/features/connectcv/public/index.html`],{encoding:'utf8',maxBuffer:2*1024*1024})
 :fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=express(),rows=[],httpCalls=[],unexpectedMutations=[],deniedBackgroundReads=[];
app.get('/ai/runtime.js',(req,res)=>res.type('js').send('window.connectCVParentOrigins=[];window.connectCVServerPdf=false;'));
app.get(['/ai/','/ai/index.html'],(req,res)=>res.type('html').send(source));
app.use('/ai',express.static(root));
app.use(express.json());
app.post('/api/chatbot/message',(req,res)=>{httpCalls.push({body:req.body,res});req.on('close',()=>{});});
app.use('/api',(req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){
  if(['/cv/auto-match-jobs','/cv/templates/recommend'].includes(req.path))deniedBackgroundReads.push(req.path);
  else unexpectedMutations.push(req.path);
 }
 if(req.path==='/cv/templates')return res.json({success:true,templates:[]});
 if(req.path==='/features/health')return res.json({browserConfigured:false});
 return res.status(401).json({success:false,message:'Synthetic fixture: no signed-in account'});
});
(async()=>{
 let server,browser;
 try{
  server=app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===base||u.protocol==='data:'?r.continue():r.abort();});
  await page.addInitScript(()=>{
   const nativeFetch=window.fetch.bind(window);
   window.__chatQA={calls:[],mode:'deferred',executed:false};
   window.fetch=function(resource,options={}){
    const url=new URL(resource instanceof Request?resource.url:String(resource),location.href);
    if(url.pathname!=='/api/chatbot/message')return nativeFetch(resource,options);
    const qa=window.__chatQA,call={body:JSON.parse(options.body),signal:options.signal};qa.calls.push(call);
    if(qa.mode==='http')return nativeFetch(resource,options);
    return new Promise((resolve,reject)=>{
     call.resolve=reply=>resolve(new Response(JSON.stringify({success:true,data:{reply,suggestedQuestions:[],responseKind:'ai-advice'}}),{headers:{'Content-Type':'application/json'}}));
     call.reject=()=>reject(Error('PRIVATE_PROVIDER_SENTINEL'));
     call.jsonPending=()=>resolve({json:()=>new Promise(done=>{call.finishJSON=reply=>done({success:true,data:{reply,suggestedQuestions:[],responseKind:'ai-advice'}});})});
    }); // Deliberately ignores AbortSignal to exercise generation ownership.
   };
  });
  const popup=page.locator('#chatbot-popup-window'),input=page.locator('#chatbot-input'),send=page.locator('#btn-chatbot-send'),messages=page.locator('#chatbot-messages');
  async function reset(){await page.goto(base+'/ai/?module=chatbot');await popup.waitFor({state:'visible'});}
  async function count(){return page.evaluate(()=>__chatQA.calls.length);}
  async function submit(text,keyboard=false){const before=await count();await input.fill(text);if(keyboard)await input.press('Enter');else await send.click();await page.waitForFunction(n=>__chatQA.calls.length===n+1,before);return before;}
  async function history(){return page.evaluate(()=>JSON.parse(JSON.stringify(chatbotHistory)));}
  async function resolve(i,text){await page.evaluate(({i,text})=>__chatQA.calls[i].resolve(text),{i,text});}
  async function idle(){await page.waitForFunction(()=>!document.getElementById('btn-chatbot-send').disabled);}
  async function clear(){await page.getByTitle('Làm mới lịch sử chat',{exact:true}).click();}
  await reset();
  await submit('OLD_PRIVATE_QUESTION');await clear();await resolve(0,'OLD_PRIVATE_REPLY');await idle();
  assert.deepEqual(await history(),[]);assert.doesNotMatch(await messages.innerText(),/OLD_PRIVATE/);rows.push({phase:'clear-discards-late-response',pass:true});

  await reset();await submit('OLD');await clear();await submit('NEW');await resolve(0,'OLD_REPLY');
  await page.evaluate(()=>new Promise(r=>setTimeout(r,30)));assert.equal(await send.isDisabled(),true);assert.deepEqual(await history(),[{role:'user',message:'NEW'}]);
  await resolve(1,'NEW_REPLY');await idle();assert.deepEqual(await history(),[{role:'user',message:'NEW'},{role:'assistant',message:'NEW_REPLY'}]);rows.push({phase:'old-completion-cannot-unlock-new-request',pass:true});

  await reset();await submit('REMOVED_QUESTION');await clear();await input.fill('NEW_DRAFT');await page.evaluate(()=>__chatQA.calls[0].reject());await idle();
  assert.equal(await input.inputValue(),'NEW_DRAFT');assert.deepEqual(await history(),[]);assert.doesNotMatch(await messages.innerText(),/PRIVATE_PROVIDER_SENTINEL|REMOVED_QUESTION/);rows.push({phase:'old-error-cannot-restore-deleted-message',pass:true});

  await reset();await submit('PRIVATE_JSON_QUESTION');await page.evaluate(()=>__chatQA.calls[0].jsonPending());await page.waitForFunction(()=>!!__chatQA.calls[0].finishJSON);await clear();
  await page.evaluate(()=>__chatQA.calls[0].finishJSON('LATE_PARSED_REPLY'));await idle();assert.deepEqual(await history(),[]);assert.doesNotMatch(await messages.innerText(),/LATE_PARSED_REPLY/);rows.push({phase:'clear-during-json-decode',pass:true});

  await reset();await page.clock.install();await submit('RETRY_QUESTION');await page.clock.fastForward(60001);await idle();
  assert.equal(await input.inputValue(),'RETRY_QUESTION');assert.equal(await count(),1);assert.deepEqual(await history(),[]);assert.equal(await page.evaluate(()=>__chatQA.calls[0].signal.aborted),true);
  await resolve(0,'LATE_AFTER_TIMEOUT');await page.clock.runFor(1);assert.doesNotMatch(await messages.innerText(),/LATE_AFTER_TIMEOUT/);rows.push({phase:'deadline-retains-draft-no-auto-retry',pass:true});await page.clock.resume();

  await reset();await input.fill('Lượt một');await input.press('Shift+Enter');assert.equal(await count(),0);assert.match(await input.inputValue(),/\n/);
  await input.press('Enter');await page.waitForFunction(()=>__chatQA.calls.length===1);await input.fill('NEWER_DRAFT');await input.press('Enter');assert.equal(await count(),1);
  await page.evaluate(()=>__chatQA.calls[0].reject());await idle();assert.equal(await input.inputValue(),'NEWER_DRAFT');assert.deepEqual(await history(),[]);rows.push({phase:'keyboard-double-send-and-newer-draft',pass:true});

  await reset();await page.getByTitle('Xem/Sửa hồ sơ ứng viên',{exact:true}).click();
  await page.locator('#chat-user-name').fill('PRIVATE_DISPLAY_NAME<img src=x onerror="window.__chatQA.executed=true">');await page.locator('#chat-user-role').fill('Chuyển nghề bán lẻ');
  const hostile='<img src=x onerror="window.__chatQA.executed=true">';await submit(hostile);
  const body=await page.evaluate(()=>__chatQA.calls[0].body);assert.deepEqual(Object.keys(body).sort(),['context','history','message']);assert.deepEqual(body.context,{targetRole:'Chuyển nghề bán lẻ'});assert.doesNotMatch(JSON.stringify(body),/PRIVATE_DISPLAY_NAME/);
  await resolve(0,hostile);await idle();assert.equal(await messages.locator('img').count(),0);assert.equal(await page.evaluate(()=>__chatQA.executed),false);assert.ok((await messages.innerText()).includes(hostile));rows.push({phase:'literal-html-and-context-projection',pass:true});

  await reset();await page.getByTitle('Xem/Sửa hồ sơ ứng viên',{exact:true}).click();await page.locator('#chat-user-name').fill('PRIVATE_LOGOUT_NAME');await page.locator('#chat-user-role').fill('PRIVATE_LOGOUT_ROLE');await submit('PRIVATE_LOGOUT_QUESTION');await input.fill('PRIVATE_LOGOUT_DRAFT');
  const reloaded=page.waitForEvent('load');await page.evaluate(()=>{sessionStorage.setItem('connectcv_synthetic','PRIVATE_LOCAL_DRAFT');window.dispatchEvent(new Event('connectcv:logout'));});await reloaded;await popup.waitFor({state:'visible'});
  for(const id of ['chat-user-name','chat-user-role','chatbot-input'])assert.equal(await page.locator('#'+id).inputValue(),'');
  assert.deepEqual(await history(),[]);assert.equal(await page.evaluate(()=>sessionStorage.getItem('connectcv_synthetic')),null);assert.doesNotMatch(await messages.innerText(),/PRIVATE_LOGOUT/);rows.push({phase:'actual-global-logout-reload-clears-local-state',pass:true});

  await reset();await page.evaluate(()=>__chatQA.mode='http');await submit('SYNTHETIC_HTTP_CANCELLATION');await page.waitForFunction(()=>__chatQA.calls.length===1);for(let i=0;i<50&&!httpCalls.length;i++)await new Promise(r=>setTimeout(r,20));assert.equal(httpCalls.length,1);await clear();await idle();
  assert.equal(await page.evaluate(()=>__chatQA.calls[0].signal.aborted),true);assert.deepEqual(await history(),[]);httpCalls[0].res.end(JSON.stringify({success:true,data:{reply:'LATE_HTTP',suggestedQuestions:[]}}));assert.doesNotMatch(await messages.innerText(),/LATE_HTTP/);rows.push({phase:'native-fetch-cancellation-to-local-http',pass:true});

  const out=process.env.CHAT_BROWSER_QA_OUTPUT;assert.ok(out);fs.mkdirSync(out,{recursive:true});
  for(const width of [1366,390,360]){
   await page.setViewportSize({width,height:844});await reset();const rect=await popup.boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=width+1&&rect.y+rect.height<=844+1,JSON.stringify(rect));
   await submit('Câu hỏi giả để kiểm thử giao diện');await resolve(0,'Gợi ý thử nghiệm từ dữ liệu giả.');await idle();
   await page.screenshot({path:path.join(out,`chatbot-${width}.png`)});rows.push({phase:'viewport-'+width,pass:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(unexpectedMutations,[]);
  const report={wholeStudioDocument:true,syntheticTransport:true,nativeLoopbackRequests:httpCalls.length,deniedBackgroundReadPosts:deniedBackgroundReads.length,cloudWrites:0,realAiCalls:0,firebaseAuthExercised:false,iosWebKitExercised:false,rows,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
