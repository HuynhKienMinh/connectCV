// Actual AuthPage + Router; deferred Firebase adapters only. No real accounts or email.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=process.env.SIGNUP_LIFECYCLE_QA_OUTPUT,ref=process.env.SIGNUP_LIFECYCLE_SOURCE_REF;
const source=ref?execFileSync('git',['show',ref+':frontend/src/pages/AuthPage.jsx'],{cwd:root,encoding:'utf8'}):null;
const sdk=`const request=(kind,user)=>new Promise((resolve,reject)=>window.__qa.calls.push({kind,uid:user?.uid,resolve,reject}));
 export const createUserWithEmailAndPassword=()=>request('create');
 export const updateProfile=(user,profile)=>{window.__qa.effects.push({kind:'profile',uid:user.uid,displayName:profile.displayName});return request('profile',user);};
 export const sendEmailVerification=user=>{window.__qa.effects.push({kind:'verify',uid:user.uid});return request('verify',user);};
 export class GoogleAuthProvider{setCustomParameters(){}}
 export const signInWithEmailAndPassword=()=>request('login');export const sendPasswordResetEmail=()=>request('reset');
 export const signInWithPopup=()=>request('popup');export const signInWithRedirect=()=>request('redirect');export const getRedirectResult=async()=>null;`;
const server=await createServer({root,configFile:false,plugins:[{name:'synthetic-signup-adapters',enforce:'pre',
 resolveId(id){if(id==='/qa-signup.jsx')return '\0signup-entry';if(id==='firebase/auth')return '\0signup-sdk';if(id==='../lib/firebase')return '\0signup-instance';if(id==='../context/AuthContext')return '\0signup-observer';},
 load(id){
  if(source&&id.replaceAll('\\','/')===path.join(root,'src/pages/AuthPage.jsx').replaceAll('\\','/'))return source;
  if(id==='\0signup-sdk')return sdk;
  if(id==='\0signup-instance')return 'export const auth=window.__qa.auth;';
  if(id==='\0signup-observer')return 'export const useAuth=()=>({user:null});';
  if(id==='\0signup-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,Link,useLocation} from 'react-router-dom';import AuthPage from '/src/pages/AuthPage.jsx';import '/src/index.css';function Marker(){const l=useLocation();return React.createElement('output',{'data-testid':'route'},l.pathname);}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,{initialEntries:['/signup']},React.createElement(Marker),React.createElement(Link,{to:'/outside'},'Trang khác'),React.createElement(Routes,null,React.createElement(Route,{path:'/signup',element:React.createElement(AuthPage,{mode:'signup'})}),React.createElement(Route,{path:'/login',element:React.createElement(AuthPage)}),React.createElement(Route,{path:'/reset-password',element:React.createElement(AuthPage,{mode:'reset'})}),React.createElement(Route,{path:'/account',element:React.createElement('h1',null,'Tài khoản giả')}),React.createElement(Route,{path:'/outside',element:React.createElement('h1',null,'Trang khác giả')})))));`;
 },configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-signup')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-signup','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-signup.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;const results=[];
try{
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage(),errors=[];
  p.setDefaultTimeout(4000);p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await p.addInitScript(()=>{window.__qa={auth:{currentUser:null},calls:[],effects:[],created:{uid:'synthetic-created'}};});
  try{await p.goto(origin+'/qa-signup');await p.getByLabel('Họ tên',{exact:true}).waitFor();await check(p);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,passed:true});}
  catch(e){results.push({name,passed:false,error:e.message.slice(0,600),route:await p.getByTestId('route').textContent(),effects:await p.evaluate(()=>__qa.effects)});}
  finally{await context.close();}
 }
 const pause=p=>p.evaluate(()=>new Promise(r=>setTimeout(r,50)));
 async function nav(p,name){const l=p.getByRole('link',{name,exact:true}),to=await l.getAttribute('href');await l.click();await p.waitForFunction(to=>document.querySelector('[data-testid="route"]').textContent===to,to);}
 async function start(p,count=1){await p.getByLabel('Họ tên',{exact:true}).fill('Tên đăng ký giả');await p.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await p.getByLabel(/^Mật khẩu/).fill('Synthetic-only-123!');await p.getByRole('button',{name:'Tạo tài khoản',exact:true}).click();await p.waitForFunction(n=>__qa.calls.filter(c=>c.kind==='create').length===n,count);}
 async function created(p,index=0,actor='same'){await p.evaluate(({index,actor})=>{__qa.auth.currentUser=actor==='same'?__qa.created:actor==='none'?null:{uid:actor==='same-uid'?'synthetic-created':'synthetic-other'};__qa.calls.filter(c=>c.kind==='create')[index].resolve({user:__qa.created});},{index,actor});await pause(p);}
 async function finish(p,kind){await p.waitForFunction(kind=>__qa.calls.some(c=>c.kind===kind),kind);await p.evaluate(kind=>__qa.calls.find(c=>c.kind===kind).resolve(),kind);await pause(p);}
 const noEffects=async p=>assert.deepEqual(await p.evaluate(()=>__qa.effects),[]);
 async function fail(p,kind){await p.evaluate(kind=>__qa.calls.find(c=>c.kind===kind).reject({code:'auth/network-request-failed',message:'PRIVATE_PROVIDER_SENTINEL'}),kind);await pause(p);}
 await scenario('abandoned-create-does-not-update-profile-or-send-email',async p=>{await start(p);await nav(p,'Trang khác');await created(p);await noEffects(p);assert.equal(await p.getByTestId('route').textContent(),'/outside');});
 await scenario('return-to-signup-does-not-revive-old-create',async p=>{await start(p);await nav(p,'Đăng nhập');await nav(p,'Đăng ký');await p.getByLabel('Họ tên',{exact:true}).fill('Nháp mới');await created(p);await noEffects(p);assert.equal(await p.getByLabel('Họ tên',{exact:true}).inputValue(),'Nháp mới');});
 await scenario('changed-SDK-actor-stops-create-followups',async p=>{await start(p);await created(p,0,'other');await noEffects(p);assert.equal(await p.getByTestId('route').textContent(),'/signup');});
 await scenario('same-UID-new-SDK-object-stops-create-followups',async p=>{await start(p);await created(p,0,'same-uid');await noEffects(p);});
 await scenario('departure-during-profile-update-stops-verification',async p=>{await start(p);await created(p);await p.waitForFunction(()=>__qa.calls.some(c=>c.kind==='profile'));await nav(p,'Trang khác');await finish(p,'profile');assert.deepEqual(await p.evaluate(()=>__qa.effects.map(e=>e.kind)),['profile']);});
 await scenario('SDK-replacement-during-profile-update-stops-verification',async p=>{await start(p);await created(p);await p.evaluate(()=>{__qa.auth.currentUser={uid:'synthetic-other'};__qa.auth.currentUser={uid:'synthetic-created'};});await finish(p,'profile');assert.deepEqual(await p.evaluate(()=>__qa.effects.map(e=>e.kind)),['profile']);});
 await scenario('SDK-change-during-email-does-not-navigate',async p=>{await start(p);await created(p);await finish(p,'profile');await p.waitForFunction(()=>__qa.calls.some(c=>c.kind==='verify'));await p.evaluate(()=>{__qa.auth.currentUser={uid:'synthetic-other'};});await finish(p,'verify');assert.equal(await p.getByTestId('route').textContent(),'/signup');});
 await scenario('current-signup-completes-name-email-and-navigation-once',async p=>{await start(p);await created(p);await finish(p,'profile');await finish(p,'verify');await p.getByRole('heading',{name:'Tài khoản giả',exact:true}).waitFor();assert.deepEqual(await p.evaluate(()=>__qa.effects),[{kind:'profile',uid:'synthetic-created',displayName:'Tên đăng ký giả'},{kind:'verify',uid:'synthetic-created'}]);});
 await scenario('old-create-finally-cannot-unlock-new-signup',async p=>{await start(p);await nav(p,'Đăng nhập');await nav(p,'Đăng ký');await start(p,2);await created(p,0);await noEffects(p);assert.equal(await p.getByRole('button',{name:'Đang xử lý…',exact:true}).isDisabled(),true);});
 await scenario('signed-out-before-create-completion-stops-followups',async p=>{await start(p);await created(p,0,'none');await noEffects(p);});
 for(const kind of ['profile','verify'])await scenario('old-'+kind+'-error-does-not-clear-new-actor-draft',async p=>{await start(p);await created(p);if(kind==='verify')await finish(p,'profile');await p.waitForFunction(kind=>__qa.calls.some(c=>c.kind===kind),kind);await p.evaluate(()=>{__qa.auth.currentUser={uid:'synthetic-other'};});await p.getByLabel(/^Mật khẩu/).fill('New-synthetic-draft-123!');await fail(p,kind);assert.equal(await p.getByLabel(/^Mật khẩu/).inputValue(),'New-synthetic-draft-123!');assert.equal(await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).count(),0);assert.equal(await p.getByText('PRIVATE_PROVIDER_SENTINEL',{exact:false}).count(),0);});
 await scenario('current-profile-error-is-safe-and-does-not-send-email',async p=>{await start(p);await created(p);await fail(p,'profile');await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).waitFor();assert.equal(await p.getByText('PRIVATE_PROVIDER_SENTINEL',{exact:false}).count(),0);assert.deepEqual(await p.evaluate(()=>__qa.effects.map(e=>e.kind)),['profile']);assert.equal(await p.getByLabel('Họ tên',{exact:true}).inputValue(),'Tên đăng ký giả');assert.equal(await p.getByLabel('Email',{exact:true}).inputValue(),'synthetic@example.invalid');});
 const report={actualReactPage:true,actualRouter:true,syntheticSdk:true,cloudAuthCalls:0,realFirebaseVerified:false,sourceRef:ref||'working-tree',results,passed:results.filter(r=>r.passed).length};
 if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report));if(results.some(r=>!r.passed))process.exitCode=1;
}finally{await browser?.close();await server.close();}
