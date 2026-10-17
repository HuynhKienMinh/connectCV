// Actual React AuthPage/Router lifecycle. Only Firebase SDK and auth observer are synthetic.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRevision=process.env.AUTH_REQUEST_SOURCE_REV;
const source=sourceRevision?execFileSync('git',['show',`${sourceRevision}:frontend/src/pages/AuthPage.jsx`],{cwd:root,encoding:'utf8'}):null;
const sdk=`
 export class GoogleAuthProvider {setCustomParameters(){}}
 const request=(kind,args)=>new Promise((resolve,reject)=>window.__qa.calls.push({kind,args,resolve,reject}));
 export const signInWithEmailAndPassword=(_auth,email)=>request('login',{email});
 export const createUserWithEmailAndPassword=(_auth,email)=>request('signup',{email});
 export const sendPasswordResetEmail=(_auth,email)=>request('reset',{email});
 export const signInWithPopup=()=>request('popup',{});
 export const signInWithRedirect=()=>request('redirect',{});
 export const getRedirectResult=async()=>null;
 export const updateProfile=async(user,profile)=>{window.__qa.effects.push({kind:'profile',uid:user.uid,profile});};
 export const sendEmailVerification=async(user)=>{window.__qa.effects.push({kind:'verify',uid:user.uid});};
`;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-auth-request-adapters',enforce:'pre',
 resolveId(id){if(id==='/qa-auth-request.jsx')return '\0auth-request-entry';if(id==='firebase/auth')return '\0auth-request-sdk';if(id==='../lib/firebase')return '\0auth-request-instance';if(id==='../context/AuthContext')return '\0auth-request-context';},
 load(id){
  if(id==='\0auth-request-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,Link,useLocation} from 'react-router-dom';import AuthPage from '/src/pages/AuthPage.jsx';import '/src/index.css';function Marker(){const l=useLocation();return React.createElement('output',{'data-testid':'route'},l.pathname);}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,{initialEntries:[window.__qa.start]},React.createElement(Marker),React.createElement(Link,{to:'/outside'},'Trang khác'),React.createElement(Routes,null,React.createElement(Route,{path:'/login',element:React.createElement(AuthPage)}),React.createElement(Route,{path:'/signup',element:React.createElement(AuthPage,{mode:'signup'})}),React.createElement(Route,{path:'/reset-password',element:React.createElement(AuthPage,{mode:'reset'})}),React.createElement(Route,{path:'/account',element:React.createElement('h1',null,'Tài khoản giả')}),React.createElement(Route,{path:'/outside',element:React.createElement('h1',null,'Trang khác giả')})))));`;
  if(id==='\0auth-request-sdk')return sdk;
  if(id==='\0auth-request-instance')return 'export const auth={currentUser:null};';
  if(id==='\0auth-request-context')return 'export const useAuth=()=>({user:null});';
 },
 transform(code,id){if(source&&id.endsWith('/src/pages/AuthPage.jsx'))return source;},
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-auth-request')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-auth-request','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-auth-request.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;const results=[],out=process.env.AUTH_REQUEST_QA_OUTPUT;
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,start,check,width=390){
  const context=await browser.newContext({viewport:{width,height:844},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36'}),p=await context.newPage(),errors=[];
  p.setDefaultTimeout(3000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await p.addInitScript(start=>{window.__qa={start,calls:[],effects:[]};},start);
  try{await p.goto(base+'/qa-auth-request');await p.getByLabel('Email',{exact:true}).waitFor();await check(p);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,passed:true});}
  catch(e){results.push({name,passed:false,error:e.message,route:await p.getByTestId('route').textContent()});}
  finally{if(out){await fs.mkdir(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});}await context.close();}
 }
 const email=p=>p.getByLabel('Email',{exact:true});
 const button=(p,name)=>p.getByRole('button',{name,exact:true});
 const nav=(p,name)=>p.getByRole('link',{name,exact:true}).click();
 async function start(p,kind){await email(p).fill('synthetic@example.invalid');if(kind!=='reset')await p.getByLabel(/^Mật khẩu/).fill('Synthetic-only-123!');if(kind==='signup')await p.getByLabel('Họ tên',{exact:true}).fill('Người dùng giả');await button(p,kind==='reset'?'Gửi hướng dẫn':kind==='signup'?'Tạo tài khoản':'Đăng nhập').click();await p.waitForFunction(()=>__qa.calls.length===1);}
 async function settle(p,index,{code=null}={}){await p.evaluate(({index,code})=>{const c=__qa.calls[index];if(code)c.reject({code,message:'PRIVATE_PROVIDER_SENTINEL'});else c.resolve({user:{uid:'synthetic-created'}});},{index,code});await p.evaluate(()=>new Promise(r=>setTimeout(r,60)));}
 await scenario('pending-reset-does-not-lock-login','/reset-password',async p=>{await start(p,'reset');await nav(p,'Đăng nhập');assert.equal(await button(p,'Đăng nhập').isEnabled(),true);await settle(p,0);assert.equal(await p.getByText('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',{exact:true}).count(),0);});
 await scenario('obsolete-login-error-cannot-redirect-password-recovery','/login',async p=>{await start(p,'login');await nav(p,'Quên mật khẩu');await email(p).fill('new-draft@example.invalid');await settle(p,0,{code:'auth/invalid-credential'});assert.equal(await p.getByTestId('route').textContent(),'/reset-password');assert.equal(await email(p).inputValue(),'new-draft@example.invalid');});
 await scenario('return-to-same-mode-does-not-unlock-new-request','/reset-password',async p=>{await start(p,'reset');await nav(p,'Đăng nhập');await nav(p,'Quên mật khẩu');assert.equal(await button(p,'Gửi hướng dẫn').isEnabled(),true);await button(p,'Gửi hướng dẫn').click();await p.waitForFunction(()=>__qa.calls.length===2);await settle(p,0,{code:'auth/network-request-failed'});assert.equal(await button(p,'Đang xử lý…').isDisabled(),true);assert.equal(await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).count(),0);await settle(p,1);await p.getByText('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',{exact:true}).waitFor();});
 await scenario('synchronous-duplicate-submit-ignored','/reset-password',async p=>{await email(p).fill('synthetic@example.invalid');await p.locator('form').evaluate(f=>{f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});assert.equal(await p.evaluate(()=>__qa.calls.length),1);await settle(p,0);});
 await scenario('current-reset-failure-retains-email-and-explicit-retry','/reset-password',async p=>{await start(p,'reset');await settle(p,0,{code:'auth/network-request-failed'});await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).waitFor();assert.equal(await email(p).inputValue(),'synthetic@example.invalid');assert.equal(await button(p,'Gửi hướng dẫn').isEnabled(),true);assert.equal(await p.getByText('PRIVATE_PROVIDER_SENTINEL',{exact:false}).count(),0);await button(p,'Gửi hướng dẫn').click();await p.waitForFunction(()=>__qa.calls.length===2);await settle(p,1);await p.getByText('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',{exact:true}).waitFor();},360);
 await scenario('current-signup-still-updates-name-and-sends-verification','/signup',async p=>{await start(p,'signup');await settle(p,0);await p.getByRole('heading',{name:'Tài khoản giả',exact:true}).waitFor();assert.deepEqual(await p.evaluate(()=>__qa.effects),[{kind:'profile',uid:'synthetic-created',profile:{displayName:'Người dùng giả'}},{kind:'verify',uid:'synthetic-created'}]);},1366);
 await scenario('late-google-error-cannot-overwrite-reset-page','/login',async p=>{await button(p,'Tiếp tục với Google').click();await p.waitForFunction(()=>__qa.calls.length===1);await nav(p,'Quên mật khẩu');await settle(p,0,{code:'auth/popup-blocked'});assert.equal(await p.getByTestId('route').textContent(),'/reset-password');assert.equal(await p.getByText('Trình duyệt đang chặn cửa sổ đăng nhập.',{exact:false}).count(),0);assert.equal(await button(p,'Gửi hướng dẫn').isEnabled(),true);});
 await scenario('late-email-success-cannot-navigate-after-leaving-form','/login',async p=>{await start(p,'login');await nav(p,'Trang khác');await settle(p,0);assert.equal(await p.getByTestId('route').textContent(),'/outside');});
 const report={actualReactPage:true,actualRouter:true,syntheticSdk:true,realFirebaseVerified:false,cloudAuthCalls:0,sourceRevision:sourceRevision||'working-tree',passed:results.filter(r=>r.passed).length,results};
 if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));}console.log(JSON.stringify(report));if(results.some(r=>!r.passed))process.exitCode=1;
}finally{await browser?.close();await server.close();}
