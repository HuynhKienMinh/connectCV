// Actual AccountPage, Router, loader and api.js; SDK identity/token and fetch are synthetic.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=process.env.API_SESSION_QA_OUTPUT,ref=process.env.API_SESSION_SOURCE_REF,results=[];
const selected=ref?execFileSync('git',['show',ref+':frontend/src/lib/api.js'],{cwd:root,encoding:'utf8'}):null;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-api-session',enforce:'pre',
 resolveId(id){if(id==='/qa-api-session.jsx')return '\0session-entry';if(id==='../context/AuthContext')return '\0session-auth';if(id==='./firebase')return '\0session-firebase';if(id==='firebase/auth')return '\0session-sdk';},
 load(id){
  if(selected&&id.replaceAll('\\','/').endsWith('/src/lib/api.js'))return selected;
  if(id==='\0session-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';import AccountPage from '/src/pages/AccountPage.jsx';import {api} from '/src/lib/api.js';import '/src/index.css';window.__qa.call=api;createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,{initialEntries:['/account']},React.createElement(Routes,null,React.createElement(Route,{path:'/account',element:React.createElement(AccountPage)}),React.createElement(Route,{path:'/login',element:React.createElement('h1',null,'Synthetic login')})))));`;
  if(id==='\0session-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.auth);`;
  if(id==='\0session-firebase')return 'export const auth=window.__qa.sdkAuth;';
  if(id==='\0session-sdk')return 'export const sendEmailVerification=async()=>{};';
 },
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-api-session')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-api-session','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-api-session.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[];p.setDefaultTimeout(4500);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await p.addInitScript(()=>{
   const qa=window.__qa={listeners:new Set(),sdkAuth:{currentUser:null},tokens:[],sent:[],holdTokens:false,holdWrites:false,pendingWrites:[]};
   qa.setActor=uid=>{const user=uid?{uid,email:uid+'@example.invalid',emailVerified:true,getIdToken(){return qa.holdTokens?new Promise((resolve,reject)=>qa.tokens.push({uid,resolve,reject})):Promise.resolve('opaque-test-'+uid);}}:null;qa.sdkAuth.currentUser=user;qa.auth={user,loading:false,logout:async()=>qa.setActor(null)};for(const f of qa.listeners)f();};
   qa.setActor('A');
   window.fetch=async(url,options={})=>{
    const parsed=new URL(url,location.href);if(!parsed.pathname.startsWith('/api/'))throw Error('SYNTHETIC_NETWORK_BLOCKED');
    const method=options.method||'GET',authorization=options.headers?.Authorization||null,actor=authorization?.replace('Bearer opaque-test-','')||'visitor';
    qa.sent.push({path:parsed.pathname,method,actor,body:options.body||null,version:options.headers?.['If-Match']||null,authorizationPresent:!!authorization});
    const receipt=name=>({profile:{fullName:name,email:'contact@example.invalid',skills:['QA']},credits:7,profileVersion:method==='PUT'?'next-'+actor:'v-'+actor});
    const body=parsed.pathname.includes('/public/')?{portfolio:{title:'Synthetic public'}}:receipt(method==='PUT'?JSON.parse(options.body).fullName:'Current '+actor);
    if(method==='PUT'&&qa.holdWrites)await new Promise(resolve=>qa.pendingWrites.push(resolve));
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
   };
  });
  try{await p.goto(base+'/qa-api-session');await p.waitForFunction(()=>document.querySelector('form input')?.value==='Current A'&&!document.querySelector('form input').disabled);await check(p);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,pass:true});}
  catch(error){results.push({name,pass:false,error:error.message});}
  finally{if(out&&name==='same-uid-new-sdk-instance-cannot-dispatch-old-profile-write'){await fs.mkdir(out,{recursive:true});await p.screenshot({path:path.join(out,'account-session-390.png'),fullPage:true});}await context.close();}
 }
 const field=p=>p.getByLabel('Họ tên',{exact:true}),save=p=>p.getByRole('button',{name:'Lưu hồ sơ',exact:true});
 const writes=p=>p.evaluate(()=>__qa.sent.filter(r=>r.method==='PUT'));
 async function heldSave(p){await field(p).fill('Retained synthetic draft');await p.evaluate(()=>__qa.holdTokens=true);await save(p).click();await p.waitForFunction(()=>__qa.tokens.length===1);assert.equal((await writes(p)).length,0);}
 async function release(p,error=false){await p.evaluate(error=>{const t=__qa.tokens[0];if(error)t.reject(Error('SYNTHETIC_OBSOLETE_PRIVATE_TOKEN_ERROR'));else t.resolve('opaque-test-A');},error);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 await scenario('logout-before-token-resolution-cannot-dispatch-profile-write',async p=>{await heldSave(p);await p.evaluate(()=>__qa.setActor(null));await p.getByRole('heading',{name:'Synthetic login',exact:true}).waitFor();await release(p);assert.equal((await writes(p)).length,0);});
 await scenario('account-switch-before-token-resolution-cannot-dispatch-old-profile-write',async p=>{await heldSave(p);await p.evaluate(()=>{__qa.holdTokens=false;__qa.setActor('B');});await p.waitForFunction(()=>document.querySelector('form input')?.value==='Current B');await release(p);assert.equal((await writes(p)).length,0);assert.equal(await field(p).inputValue(),'Current B');});
 await scenario('same-uid-new-sdk-instance-cannot-dispatch-old-profile-write',async p=>{await heldSave(p);await p.evaluate(()=>{__qa.holdTokens=false;__qa.setActor('A');});await release(p);assert.equal((await writes(p)).length,0);assert.equal(await field(p).inputValue(),'Retained synthetic draft');assert.equal(await save(p).isEnabled(),true);await p.getByRole('status').filter({hasText:'Phiên tài khoản đã thay đổi.'}).waitFor();});
 await scenario('obsolete-sdk-token-error-is-generic-for-new-same-uid-session',async p=>{await heldSave(p);await p.evaluate(()=>{__qa.holdTokens=false;__qa.setActor('A');});await release(p,true);assert.equal((await writes(p)).length,0);assert.equal(await p.getByText('SYNTHETIC_OBSOLETE_PRIVATE_TOKEN_ERROR',{exact:false}).count(),0);await p.getByRole('status').filter({hasText:'Phiên tài khoản đã thay đổi.'}).waitFor();assert.equal(await field(p).inputValue(),'Retained synthetic draft');assert.equal(await save(p).isEnabled(),true);});
 await scenario('current-profile-save-remains-versioned-and-sent-once',async p=>{await field(p).fill('Current synthetic save');await save(p).click();await p.getByRole('status').filter({hasText:'Đã hoàn tất.'}).waitFor();const sent=await writes(p);assert.equal(sent.length,1);assert.equal(sent[0].actor,'A');assert.equal(sent[0].version,'v-A');assert.equal(JSON.parse(sent[0].body).fullName,'Current synthetic save');});
 await scenario('current-token-failure-retains-draft-and-explicit-retry-works',async p=>{await heldSave(p);await release(p,true);assert.equal((await writes(p)).length,0);assert.equal(await field(p).inputValue(),'Retained synthetic draft');assert.equal(await save(p).isEnabled(),true);await p.evaluate(()=>__qa.holdTokens=false);await save(p).click();await p.getByRole('status').filter({hasText:'Đã hoàn tất.'}).waitFor();assert.equal((await writes(p)).length,1);});
 await scenario('already-dispatched-write-is-not-retracted-and-late-result-does-not-replace-B',async p=>{await p.evaluate(()=>__qa.holdWrites=true);await field(p).fill('Already sent A');await save(p).click();await p.waitForFunction(()=>__qa.pendingWrites.length===1);await p.evaluate(()=>__qa.setActor('B'));await p.waitForFunction(()=>document.querySelector('form input')?.value==='Current B');await p.evaluate(()=>__qa.pendingWrites[0]());await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await writes(p)).length,1);assert.equal(await field(p).inputValue(),'Current B');});
 await scenario('anonymous-public-read-still-works-without-credentials',async p=>{await p.evaluate(()=>__qa.setActor(null));await p.getByRole('heading',{name:'Synthetic login',exact:true}).waitFor();const title=await p.evaluate(async()=>(await __qa.call('/api/portfolios/public/example')).portfolio.title);assert.equal(title,'Synthetic public');const sent=await p.evaluate(()=>__qa.sent.at(-1));assert.equal(sent.method,'GET');assert.equal(sent.authorizationPresent,false);});
 const report={actualReactAccountPage:true,actualRouter:true,actualApiModule:true,syntheticSdkAndFetch:true,realFirebaseVerified:false,cloudWrites:0,aiProviderCalls:0,externalNetworkBlocked:true,chromiumSandbox:true,sourceRef:ref||'working-tree',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
 if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));}console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
}finally{await browser?.close();await server.close();}
