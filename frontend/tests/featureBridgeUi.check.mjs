// Actual FeaturePage + child account-bridge; only Firebase observer/token SDK is synthetic.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=process.env.FEATURE_BRIDGE_QA_OUTPUT;
const revision=process.env.FEATURE_BRIDGE_SOURCE_REF;
const baseline=revision?execFileSync('git',['show',`${revision}:frontend/src/pages/FeaturePage.jsx`],{cwd:root,encoding:'utf8'}):null;
const bridge=await fs.readFile(path.join(root,'../backend/features/connectcv/public/js/account-bridge.js'),'utf8');
let parentOrigin;
const child=http.createServer((req,res)=>{
 res.setHeader('Content-Type','text/html');
 if(req.url==='/account-bridge.js'){res.setHeader('Content-Type','text/javascript');res.end(bridge);return;}
 res.end(`<html><body><textarea aria-label="Child draft"></textarea><script>
 window.connectCVParentOrigins=[${JSON.stringify(parentOrigin)}];window.received=[];window.answers=[];
 window.addEventListener('message',e=>{if(e.data?.type==='connectcv:token-response')received.push(e.data);});
 window.ask=id=>parent.postMessage({type:'connectcv:token-request',requestId:id},${JSON.stringify(parentOrigin)});
 </script><script src="/account-bridge.js"></script></body></html>`);
});
await new Promise(resolve=>child.listen(0,'127.0.0.1',resolve));
const childOrigin=`http://127.0.0.1:${child.address().port}`;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-feature-auth',enforce:'pre',
 resolveId(id){if(id==='/qa-feature.jsx')return '\0feature-entry';if(id==='../context/AuthContext')return '\0feature-auth';if(id==='../lib/firebase')return '\0feature-firebase';if(id==='../lib/api')return '\0feature-api';},
 load(id){
  if(id==='\0feature-entry')return `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import FeaturePage from '/src/pages/FeaturePage.jsx';function App(){const [module,setModule]=useState('chatbot');window.__qa.setModule=setModule;return React.createElement(MemoryRouter,null,React.createElement(FeaturePage,{module}));}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));`;
  if(id==='\0feature-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.state);`;
  if(id==='\0feature-firebase')return 'export const auth=window.__qa.auth;';
  if(id==='\0feature-api')return `export const API_BASE=${JSON.stringify(childOrigin)};`;
 },
 transform(code,id){if(baseline&&id.endsWith('/src/pages/FeaturePage.jsx'))return baseline;},
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-feature')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-feature','<html><body><div id="root"></div><script type="module" src="/qa-feature.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;const results=[];
try{
 await server.listen();parentOrigin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check,{startup=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[];
  p.setDefaultTimeout(4000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>[parentOrigin,childOrigin].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
  await p.addInitScript(({startup})=>{
   if(window!==parent){if(startup)window.addEventListener('load',()=>{void connectCVGetAccessToken().then(token=>answers.push(token));});return;}
   const qa=window.__qa={listeners:new Set(),calls:[],auth:{currentUser:null}};
   qa.setActor=(uid,verified=true)=>{const user=uid?{uid,emailVerified:verified,getIdToken(){return new Promise((resolve,reject)=>qa.calls.push({uid,resolve,reject}));}}:null;qa.auth.currentUser=user;qa.state={user,loading:false};for(const fn of qa.listeners)fn();};qa.setActor('A');
  },{startup});
  try{await p.goto(parentOrigin+'/qa-feature');await p.locator('iframe[title="ConnectCV chatbot"]').waitFor();await frame(p).waitForFunction(()=>typeof window.ask==='function');await check(p);assert.deepEqual(errors,[]);results.push({name,pass:true});}
  catch(e){results.push({name,pass:false,error:e.message});}
  finally{await context.close();}
 }
 const frame=p=>p.frames().find(f=>f.url().startsWith(childOrigin+'/ai/'));
 const tick=p=>p.evaluate(()=>new Promise(r=>setTimeout(r,90)));
 async function ask(p,id='synthetic-request-0001'){await frame(p).evaluate(id=>ask(id),id);await p.waitForFunction(()=>__qa.calls.length===1);}
 async function settle(p,index=0,fail=false){await p.evaluate(({index,fail})=>{const c=__qa.calls[index];if(fail)c.reject(Error('SYNTHETIC_PROVIDER_PRIVATE'));else c.resolve('SYNTHETIC_OPAQUE_'+c.uid);},{index,fail});await tick(p);}
 await scenario('verified-current-child-gets-correlated-token',async p=>{await ask(p);await settle(p);assert.equal(await frame(p).evaluate(()=>received.length),1);assert.equal(await frame(p).evaluate(()=>received[0].requestId),'synthetic-request-0001');assert.equal(await frame(p).evaluate(()=>received[0].token==='SYNTHETIC_OPAQUE_A'),true);});
 await scenario('initial-child-load-request-still-receives-token',async p=>{await p.waitForFunction(()=>__qa.calls.length===1);await settle(p);await frame(p).waitForFunction(()=>answers.length===1);assert.equal(await frame(p).evaluate(()=>answers[0]==='SYNTHETIC_OPAQUE_A'),true);},{startup:true});
 await scenario('wrong-origin-source-and-invalid-request-id-ignored',async p=>{
  await p.evaluate(()=>window.postMessage({type:'connectcv:token-request',requestId:'synthetic-request-0001'},location.origin));
  await frame(p).evaluate(()=>ask('bad!'));
  await p.evaluate(origin=>new Promise(resolve=>{const decoy=document.createElement('iframe');decoy.onload=resolve;decoy.src=origin+'/decoy';decoy.title='Decoy';document.body.append(decoy);}),childOrigin);
  const decoy=p.frames().find(f=>f.url()===childOrigin+'/decoy');
  await decoy.waitForFunction(()=>typeof ask==='function');await decoy.evaluate(()=>ask('synthetic-request-0001'));await tick(p);assert.equal(await p.evaluate(()=>__qa.calls.length),0);
 });
 await scenario('current-sdk-failure-returns-null-without-provider-message',async p=>{await ask(p);await settle(p,0,true);assert.equal(await frame(p).evaluate(()=>received[0].token),null);assert.equal(await frame(p).evaluate(()=>JSON.stringify(received).includes('SYNTHETIC_PROVIDER_PRIVATE')),false);});
 await scenario('account-change-discards-child-draft-and-old-token',async p=>{
  await frame(p).getByLabel('Child draft').fill('Private synthetic A draft');await ask(p);await p.evaluate(()=>__qa.setActor('B'));await tick(p);await frame(p).waitForFunction(()=>typeof ask==='function');await settle(p);
  assert.equal(await frame(p).getByLabel('Child draft').inputValue(),'');assert.equal(await frame(p).evaluate(()=>received.some(r=>r.token==='SYNTHETIC_OPAQUE_A')),false);
  await frame(p).evaluate(()=>ask('synthetic-request-0002'));await p.waitForFunction(()=>__qa.calls.length===2);await settle(p,1);assert.equal(await frame(p).evaluate(()=>received.length),1);assert.equal(await frame(p).evaluate(()=>received[0].token==='SYNTHETIC_OPAQUE_B'),true);
 });
 await scenario('module-navigation-cannot-receive-obsolete-token',async p=>{
  await ask(p);await p.evaluate(()=>__qa.setModule('cv'));await p.locator('iframe[title="ConnectCV cv"]').waitFor();await p.waitForFunction(()=>document.querySelector('iframe')?.src.endsWith('module=cv'));await frame(p).waitForFunction(()=>typeof ask==='function');await settle(p);assert.equal(await frame(p).evaluate(()=>received.length),0);
 });
 await scenario('return-to-same-uid-does-not-revive-old-session',async p=>{
  await ask(p);await p.evaluate(()=>__qa.setActor('B'));await tick(p);await p.evaluate(()=>__qa.setActor('A'));await tick(p);await frame(p).waitForFunction(()=>typeof ask==='function');await settle(p);assert.equal(await frame(p).evaluate(()=>received.length),0);
 });
 await scenario('child-document-navigation-invalidates-pending-token',async p=>{
  await ask(p);await frame(p).goto(childOrigin+'/ai/?module=chatbot&revision=2');await frame(p).waitForFunction(()=>typeof ask==='function');await settle(p);assert.equal(await frame(p).evaluate(()=>received.length),0);
 });
 await scenario('verification-revocation-removes-frame-and-blocks-new-token',async p=>{await ask(p);await p.evaluate(()=>__qa.setActor('A',false));await p.getByText('Bạn cần xác minh email để sử dụng AI.',{exact:false}).waitFor();await settle(p);assert.equal(await p.locator('iframe').count(),0);assert.equal(await p.evaluate(()=>__qa.calls.length),1);});
 await scenario('child-timeout-ignores-late-token-and-retry-is-explicit',async p=>{
  await frame(p).evaluate(()=>{void connectCVGetAccessToken().then(token=>answers.push(token));});
  await p.waitForFunction(()=>__qa.calls.length===1);await frame(p).waitForFunction(()=>answers.length===1,null,{timeout:12000});assert.equal(await frame(p).evaluate(()=>answers[0]),null);await settle(p);assert.equal(await frame(p).evaluate(()=>answers.length),1);
  await frame(p).evaluate(()=>{void connectCVGetAccessToken().then(token=>answers.push(token));});await p.waitForFunction(()=>__qa.calls.length===2);await settle(p,1);assert.equal(await frame(p).evaluate(()=>answers[1]==='SYNTHETIC_OPAQUE_A'),true);
 });
 const report={actualReactFeaturePage:true,actualChildBridge:true,syntheticFirebaseSdk:true,realFirebaseVerified:false,cloudAuthCalls:0,externalNetworkBlocked:true,chromiumSandbox:true,sourceRevision:revision||'working-tree',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
 if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));}console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
}finally{await browser?.close();await server.close();await new Promise(resolve=>child.close(resolve));}
