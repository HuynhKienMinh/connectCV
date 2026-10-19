'use strict';
// Actual Studio controller with deferred synthetic transport/audio; no real device/AI.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),express=require('express');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright-core');
const root=path.resolve(__dirname,'../public'),out=process.env.INTERVIEW_VOICE_QA_OUTPUT;
assert.ok(out&&!fs.existsSync(out),'Fresh owned output directory required');fs.mkdirSync(out,{recursive:true});
const source=process.env.INTERVIEW_VOICE_SOURCE_REF?execFileSync('git',['show',`${process.env.INTERVIEW_VOICE_SOURCE_REF}:backend/features/connectcv/public/index.html`],{encoding:'utf8',maxBuffer:2*1024*1024}):fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=express(),rows=[];
app.get('/ai/runtime.js',(q,s)=>s.type('js').send('window.connectCVParentOrigins=[];window.connectCVServerPdf=false;'));
app.get('/ai/',(q,s)=>s.type('html').send(source));app.use('/ai',express.static(root));app.use('/api',(q,s)=>s.status(401).json({success:false,message:'Synthetic unavailable'}));
(async()=>{let server,browser;try{
 server=app.listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage();page.setDefaultTimeout(5000);
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.addInitScript(()=>{
  const qa=window.__voiceQA={requests:[],audio:[],utterances:[],recognizers:[],urls:[],revoked:[],playPending:false,playRejects:[],blobResolvers:[]};
  window.SpeechRecognition=class{constructor(){qa.recognizers.push(this);}start(){this.onstart?.();}stop(){}abort(){}};window.webkitSpeechRecognition=undefined;
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia(){throw Error('Real device access forbidden in fixture');}}});
  window.Audio=class{constructor(url){this.url=url;this.paused=true;this.pauses=0;qa.audio.push(this);}pause(){this.paused=true;this.pauses++;}play(){this.paused=false;this.onplay?.();return qa.playPending?new Promise((r,j)=>qa.playRejects.push(j)):Promise.resolve();}};
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},getVoices:()=>[{lang:'vi-VN',name:'Synthetic Vietnamese'}],speak:u=>qa.utterances.push(u)}});
  URL.createObjectURL=()=>{const url='blob:fixture-'+qa.urls.length;qa.urls.push(url);return url;};URL.revokeObjectURL=url=>qa.revoked.push(url);
  const original=fetch.bind(window);window.fetch=(url,options)=>{
   if(String(url).endsWith('/api/interview/tts'))return new Promise((resolve,reject)=>qa.requests.push({resolve,reject,signal:options.signal,text:JSON.parse(options.body).text}));
   if(String(url).includes('/api/interview/'))return Promise.resolve(new Response(JSON.stringify({success:false,message:'Synthetic unavailable'}),{headers:{'Content-Type':'application/json'}}));
   return original(url,options);
  };
  qa.respond=(i,blobPending=false)=>qa.requests[i].resolve({ok:true,blob:()=>blobPending?new Promise(r=>qa.blobResolvers.push(()=>r(new Blob(['fixture'])))):Promise.resolve(new Blob(['fixture']))});
 });
 const reset=async()=>{await page.goto(base+'/ai/?module=interview');await page.waitForFunction(()=>typeof playNaturalVoice==='function');await page.evaluate(()=>{switchIntSubMode('practice');switchIntMode('live');liveInterviewHistory=[{role:'interviewer',message:'Câu hỏi giả.'}];isAISpeakingOrThinking=false;document.getElementById('live-quick-input').value='Nháp mới';document.getElementById('handsfree-toggle').checked=true;});};
 const state=()=>page.evaluate(()=>({audio:__voiceQA.audio.length,playing:__voiceQA.audio.filter(a=>!a.paused).length,speech:__voiceQA.utterances.length,mics:__voiceQA.recognizers.length,thinking:isAISpeakingOrThinking,draft:document.getElementById('live-quick-input').value,caption:document.getElementById('live-caption-text').innerText,revoked:__voiceQA.revoked.length,urls:__voiceQA.urls.length}));
 async function test(phase,fn){try{await reset();await fn();rows.push({phase,pass:true});}catch(e){rows.push({phase,pass:false,error:e.message.slice(0,1000),state:await state().catch(()=>null)});}}
 const begin=text=>page.evaluate(text=>{window.voiceTask=playNaturalVoice(text);},text);
 const finish=()=>page.evaluate(async()=>{await endLiveInterview();});
 const respond=i=>page.evaluate(i=>{__voiceQA.respond(i);},i);
 await test('late-tts-response-after-end-cannot-play',async()=>{await begin('Câu cũ');await finish();await respond(0);await page.evaluate(()=>voiceTask);assert.equal((await state()).audio,0);assert.equal((await state()).thinking,false);});
 await test('superseded-response-cannot-replace-new-voice',async()=>{await begin('Câu cũ');await begin('Câu mới');await respond(1);await page.evaluate(()=>voiceTask);await respond(0);await page.waitForTimeout(50);const s=await state();assert.equal(s.audio,1);assert.match(s.caption,/Câu mới/);assert.equal(await page.evaluate(()=>__voiceQA.requests[0].signal.aborted),true);});
 await test('late-blob-after-end-cannot-create-object-url',async()=>{await begin('Câu cũ');await page.evaluate(()=>__voiceQA.respond(0,true));await page.waitForFunction(()=>__voiceQA.blobResolvers.length===1);await finish();await page.evaluate(async()=>{__voiceQA.blobResolvers[0]();await voiceTask;});assert.equal((await state()).urls,0);});
 await test('late-network-error-after-end-cannot-speak-fallback',async()=>{await begin('Câu cũ');await finish();await page.evaluate(async()=>{__voiceQA.requests[0].reject(Error('Synthetic network'));await voiceTask;});assert.equal((await state()).speech,0);assert.equal((await state()).thinking,false);});
 await test('ended-delay-after-end-cannot-reopen-microphone',async()=>{await begin('Câu cũ');await respond(0);await page.evaluate(async()=>{await voiceTask;__voiceQA.audio[0].onended();});await finish();await page.waitForTimeout(650);assert.equal((await state()).mics,0);assert.equal((await state()).draft,'Nháp mới');});
 await test('obsolete-browser-speech-end-cannot-unlock-new-request',async()=>{await begin('Câu cũ');await page.evaluate(async()=>{__voiceQA.requests[0].reject(Error('Synthetic network'));await voiceTask;window.oldEnd=__voiceQA.utterances[0].onend;});await begin('Câu mới');await page.evaluate(()=>oldEnd());await page.waitForTimeout(650);const s=await state();assert.equal(s.mics,0);assert.equal(s.thinking,true);});
 await test('current-audio-end-resumes-once-and-releases-url',async()=>{await begin('Câu hiện tại');await respond(0);await page.evaluate(async()=>{await voiceTask;__voiceQA.audio[0].onended();});await page.waitForTimeout(650);const s=await state();assert.equal(s.mics,1);assert.equal(s.thinking,false);assert.equal(s.revoked,1);});
 await test('current-fallback-error-respects-handsfree-off',async()=>{await page.evaluate(()=>document.getElementById('handsfree-toggle').checked=false);await begin('Câu hiện tại');await page.evaluate(async()=>{__voiceQA.requests[0].reject(Error('Synthetic network'));await voiceTask;__voiceQA.utterances[0].onerror();});await page.waitForTimeout(650);assert.equal((await state()).mics,0);assert.equal((await state()).thinking,false);});
 await test('pending-play-rejection-cannot-fallback-over-new-request',async()=>{await page.evaluate(()=>__voiceQA.playPending=true);await begin('Câu cũ');await respond(0);await page.waitForFunction(()=>__voiceQA.playRejects.length===1);await begin('Câu mới');await page.evaluate(()=>__voiceQA.playRejects[0](Error('Synthetic play cancelled')));await page.waitForTimeout(50);assert.equal((await state()).speech,0);assert.equal((await state()).thinking,true);});
 await test('switch-to-script-cancels-pending-voice',async()=>{await begin('Câu cũ');await page.evaluate(()=>switchIntMode('script'));await respond(0);await page.evaluate(()=>voiceTask);assert.equal((await state()).audio,0);assert.equal((await state()).mics,0);});
 await test('typed-answer-cancels-current-voice-url',async()=>{await begin('Câu cũ');await respond(0);await page.evaluate(async()=>{await voiceTask;sendQuickLiveAnswer();});const s=await state();assert.equal(s.playing,0);assert.equal(s.revoked,1);});
 await test('empty-typed-submit-keeps-current-voice',async()=>{await begin('Câu hiện tại');await respond(0);await page.evaluate(async()=>{await voiceTask;document.getElementById('live-quick-input').value='';sendQuickLiveAnswer();});const s=await state();assert.equal(s.playing,1);assert.equal(s.revoked,0);});
 await test('completed-audio-late-error-cannot-start-fallback',async()=>{await begin('Câu hiện tại');await respond(0);await page.evaluate(async()=>{await voiceTask;const a=__voiceQA.audio[0],late=a.onerror;a.onended();late();});await page.waitForTimeout(650);assert.equal((await state()).speech,0);assert.equal((await state()).mics,1);});
 await page.setViewportSize({width:390,height:844});await reset();await begin('Câu cũ');await finish();await respond(0);await page.evaluate(()=>voiceTask);await page.screenshot({path:path.join(out,'ended-voice-390.png')});
 const report={wholeStudio:true,syntheticAudio:true,realMicrophone:false,cloudWrites:0,realAiCalls:0,sourceRef:process.env.INTERVIEW_VOICE_SOURCE_REF||'working-tree',rows};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(rows.filter(r=>!r.pass).length,0);
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
