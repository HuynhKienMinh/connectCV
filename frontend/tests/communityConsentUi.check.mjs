// Actual React FeaturePage + complete Studio + token bridge; loopback synthetic API/SDK only.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),express=require('../../backend/features/connectcv/node_modules/express'),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(root,'..'),publicRoot=path.join(repo,'backend/features/connectcv/public');
const out=process.env.COMMUNITY_CONSENT_QA_OUTPUT;assert.ok(out);
const revision=process.env.COMMUNITY_CONSENT_SOURCE_REF;
const read=async file=>revision?execFileSync('git',['show',`${revision}:${file}`],{cwd:repo,encoding:'utf8',maxBuffer:2*1024*1024}):fs.readFile(path.join(repo,file),'utf8');
const studio=await read('backend/features/connectcv/public/index.html'),feature=await read('frontend/src/pages/FeaturePage.jsx');
const selectedAssets=new Map();for(const file of ['js/account-bridge.js','js/community-publication.js'])selectedAssets.set('/ai/'+file,await read('backend/features/connectcv/public/'+file));
let parentOrigin,writes=[];
const childApp=express();
childApp.get('/ai/runtime.js',(q,s)=>s.type('js').send(`window.connectCVParentOrigins=[${JSON.stringify(parentOrigin)}];window.connectCVServerPdf=false;`));
childApp.get('/ai/',(q,s)=>s.type('html').send(studio));for(const [url,source] of selectedAssets)childApp.get(url,(q,s)=>s.type('js').send(source));childApp.use('/ai',express.static(publicRoot));
childApp.get('/api/account/me',(q,s)=>s.json({credits:15,profile:{},profileVersion:'synthetic-version'}));
childApp.get('/api/interview/community-questions',(q,s)=>s.json({success:true,data:[],totalEntries:0,allTotalCount:0,topCompanies:[]}));
childApp.post('/api/interview/debrief',express.json(),(q,s)=>{
 const actor=q.get('Authorization')==='Bearer SYNTHETIC_OPAQUE_B'?'B':q.get('Authorization')==='Bearer SYNTHETIC_OPAQUE_A'?'A':'missing';
 writes.push({actor,body:q.body});
 s.status(201).json({success:true,message:'Synthetic local publication confirmed.',data:{alreadyShared:false,awardedCredits:0,publishedAt:new Date().toISOString()}});
});
childApp.use('/api',(q,s)=>s.status(401).json({success:false}));
const child=childApp.listen(0,'127.0.0.1');await new Promise(resolve=>child.once('listening',resolve));
const childOrigin=`http://127.0.0.1:${child.address().port}`;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-community-session',enforce:'pre',
 resolveId(id){if(id==='/qa-consent.jsx')return '\0consent-entry';if(id==='../context/AuthContext')return '\0consent-auth';if(id==='../lib/firebase')return '\0consent-sdk';if(id==='../lib/api')return '\0consent-api';},
 load(id){
  if(id==='\0consent-entry')return `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import FeaturePage from '/src/pages/FeaturePage.jsx';import '/src/index.css';function App(){const [module,setModule]=useState('social');window.__qa.setModule=setModule;return React.createElement(MemoryRouter,null,React.createElement(FeaturePage,{module}));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
  if(id==='\0consent-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.state);`;
  if(id==='\0consent-sdk')return 'export const auth=window.__qa.auth;';
  if(id==='\0consent-api')return `export const API_BASE=${JSON.stringify(childOrigin)};`;
 },
 transform(code,id){if(id.replaceAll('\\','/').endsWith('/src/pages/FeaturePage.jsx'))return feature;},
 configureServer(s){s.middlewares.use(async(q,res,next)=>{if(q.url!=='/qa-consent')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-consent','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-consent.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;const rows=[];
try{
 await server.listen();parentOrigin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 const frame=p=>p.frames().find(f=>f.url().startsWith(childOrigin+'/ai/'));
 async function ready(p,module='social'){await p.frameLocator(`iframe[title="ConnectCV ${module}"]`).locator('#deb-company').waitFor({state:'attached'});const f=frame(p);await f.waitForFunction(()=>typeof submitDebrief==='function'&&typeof connectCVGetAccessToken==='function');return f;}
 async function fill(f){await f.locator('#deb-company').fill('Công ty Giả Lập');await f.locator('#deb-pos').fill('Chuyên viên bán lẻ');await f.locator('#deb-questions').fill('Bạn xử lý yêu cầu đổi hàng của khách như thế nào?');await f.locator('#deb-review').fill('Buổi phỏng vấn giả định dùng để kiểm thử.');}
 async function preview(f){await f.locator('#btn-debrief').click();await f.locator('#deb-public-preview').waitFor({state:'visible'});assert.equal(writes.length,0);await f.locator('#deb-public-confirm').check();}
 async function submit(f){await f.locator('#btn-debrief').click();await f.waitForFunction(()=>!_debriefSubmitting);}
 async function scenario(name,check){
  writes=[];const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[];
  p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',route=>[parentOrigin,childOrigin].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  await p.addInitScript(()=>{
   if(window!==parent)return;
   const qa=window.__qa={listeners:new Set(),auth:{currentUser:null},pending:[],hold:false};
   qa.setActor=(uid,verified=true)=>{qa.hold=false;const user=uid?{uid,emailVerified:verified,getIdToken(){return qa.hold?new Promise(resolve=>qa.pending.push(()=>resolve('SYNTHETIC_OPAQUE_'+uid))):Promise.resolve('SYNTHETIC_OPAQUE_'+uid);}}:null;qa.auth.currentUser=user;qa.state={user,loading:false};for(const fn of qa.listeners)fn();};qa.setActor('A');
  });
  try{await p.goto(parentOrigin+'/qa-consent');const f=await ready(p);await fill(f);const box=await p.locator('iframe').boundingBox();assert.ok(box.width>=380&&box.height>=600,'Actual parent CSS must size iframe to mobile viewport');await check(p,f);assert.deepEqual(errors,[]);rows.push({name,pass:true});console.log(JSON.stringify({phase:name,pass:true}));}
  catch(e){rows.push({name,pass:false,error:e.message.slice(0,1200)});console.log(JSON.stringify({phase:name,pass:false}));}
  finally{await context.close();}
 }
 await scenario('rating-handler-without-input-event-requires-new-preview-and-consent',async(p,f)=>{
  await preview(f);await f.evaluate(()=>setDebriefDifficulty(2));await submit(f);
  assert.equal(writes.length,0);assert.equal(await f.locator('#deb-public-confirm').isChecked(),false);assert.match(await f.locator('#deb-preview-text').innerText(),/Độ khó: 2\/5/);
 });
 await scenario('programmatic-edit-without-input-event-cannot-reuse-consent',async(p,f)=>{
  await preview(f);await f.evaluate(()=>document.getElementById('deb-review').value='Bản mới không phát input event.');await submit(f);
  assert.equal(writes.length,0);assert.equal(await f.locator('#deb-public-confirm').isChecked(),false);assert.match(await f.locator('#deb-preview-text').innerText(),/Bản mới không phát input event/);
 });
 await scenario('anonymity-toggle-revokes-old-consent',async(p,f)=>{
  await preview(f);await f.locator('label:has(#deb-anonymous)').click();assert.equal(await f.locator('#deb-public-preview').isVisible(),false);await submit(f);
  assert.equal(writes.length,0);assert.equal(await f.locator('#deb-public-confirm').isChecked(),false);assert.match(await f.locator('#deb-preview-text').innerText(),/Tên tài khoản đăng nhập sẽ hiển thị/);
 });
 await scenario('back-to-edit-never-publishes-and-requires-consent-again',async(p,f)=>{
  await preview(f);await f.getByRole('button',{name:'Quay lại sửa',exact:true}).click();await submit(f);
  assert.equal(writes.length,0);assert.equal(await f.locator('#deb-public-confirm').isChecked(),false);assert.equal(await f.locator('#deb-company').inputValue(),'Công ty Giả Lập');
 });
 await scenario('contact-added-after-consent-is-rejected-before-local-post',async(p,f)=>{
  await preview(f);await f.evaluate(()=>document.getElementById('deb-review').value='Liên hệ fixture@example.invalid');await submit(f);
  assert.equal(writes.length,0);assert.equal(await f.locator('#deb-public-preview').isVisible(),false);assert.equal(await f.locator('#deb-public-confirm').isChecked(),false);assert.match(await f.locator('#deb-review').inputValue(),/fixture@example.invalid/);
 });
 await scenario('literal-preview-is-inert-and-current-confirmation-sends-only-public-fields',async(p,f)=>{
  const literal='<img src=x onerror="window.__consentExecuted=true">';await f.locator('#deb-review').fill(literal);await preview(f);
  assert.equal(await f.locator('#deb-preview-text img').count(),0);assert.match(await f.locator('#deb-preview-text').innerText(),/<img src=x/);assert.equal(await f.evaluate(()=>window.__consentExecuted===true),false);
  await fs.mkdir(out,{recursive:true});await p.screenshot({path:path.join(out,'consent-390.png'),fullPage:true});await submit(f);
  assert.equal(writes.length,1);assert.equal(writes[0].actor,'A');assert.equal(writes[0].body.reviewText,literal);assert.equal(writes[0].body.publicAcknowledged,true);
  assert.deepEqual(Object.keys(writes[0].body).sort(),['anonymous','companyName','difficultyRating','interviewQuestions','position','publicAcknowledged','reviewText']);
 });
 await scenario('actor-change-remounts-actual-form-and-discards-old-consent',async(p,f)=>{
  await preview(f);await p.evaluate(()=>__qa.setActor('B'));const next=await ready(p);
  assert.equal(await next.locator('#deb-company').inputValue(),'');assert.equal(await next.locator('#deb-public-confirm').isChecked(),false);assert.equal(await next.locator('#deb-public-preview').isVisible(),false);assert.equal(writes.length,0);
  await fill(next);await preview(next);await submit(next);assert.equal(writes.length,1);assert.equal(writes[0].actor,'B');
 });
 await scenario('module-round-trip-does-not-restore-public-consent',async(p,f)=>{
  await preview(f);await p.evaluate(()=>__qa.setModule('cv'));await ready(p,'cv');await p.evaluate(()=>__qa.setModule('social'));const next=await ready(p);
  assert.equal(await next.locator('#deb-company').inputValue(),'');assert.equal(await next.locator('#deb-public-confirm').isChecked(),false);assert.equal(writes.length,0);
 });
 await scenario('verification-revocation-removes-consented-form-without-posting',async(p,f)=>{
  await preview(f);await p.evaluate(()=>__qa.setActor('A',false));await p.getByText('Bạn cần xác minh email để sử dụng AI.',{exact:false}).waitFor();assert.equal(await p.locator('iframe').count(),0);assert.equal(writes.length,0);
 });
 await scenario('actor-change-during-real-bridge-token-wait-cannot-publish-old-consent',async(p,f)=>{
  await preview(f);await p.evaluate(()=>__qa.hold=true);await f.locator('#btn-debrief').click();await p.waitForFunction(()=>__qa.pending.length>0);
  await p.evaluate(()=>__qa.setActor('B'));const next=await ready(p);await p.evaluate(()=>{for(const finish of __qa.pending)finish();});
  assert.equal(await next.locator('#deb-public-confirm').isChecked(),false);await fill(next);await preview(next);await submit(next);
  assert.equal(writes.length,1);assert.equal(writes[0].actor,'B');
 });
 const report={actualReactFeaturePage:true,actualStudio:true,actualTokenBridge:true,parentCssLoaded:true,bridgePublicationAssetsFromSelectedRef:true,starPointerInteractionVerified:false,sourceRef:revision||'working-tree',syntheticSdkAndLoopbackApi:true,cloudWrites:0,realAiCalls:0,realFirebaseVerified:false,chromiumSandbox:true,externalNetworkBlocked:true,rows};
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(rows.filter(r=>!r.pass).length,0);
}finally{await browser?.close();await server.close();child.closeAllConnections();await new Promise(resolve=>child.close(resolve));}
