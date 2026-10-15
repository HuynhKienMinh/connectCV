// Opt-in browser check of the actual AuthPage. SDK/environment adapters exist only in this server.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=process.env.AUTH_UI_QA_OUTPUT;
const mockSdk=`
 export class GoogleAuthProvider {setCustomParameters(p){window.__params=p;}}
 export const signInWithPopup=async()=>{window.__calls.push('popup');throw {code:'auth/popup-blocked'};};
 export const signInWithRedirect=async()=>{window.__calls.push('redirect');throw {code:'auth/network-request-failed'};};
 export const getRedirectResult=async(auth)=>{window.__calls.push('recover');if(window.__recoveryError)throw {code:window.__recoveryError};if(window.__recoveryUser){const user={uid:'synthetic-only'};auth.currentUser=window.__recoveryUser==='current'?user:null;return {user};}return null;};
 export const signInWithEmailAndPassword=async()=>{window.__calls.push('email');throw {code:'auth/network-request-failed'};};
 export const createUserWithEmailAndPassword=async()=>{window.__calls.push('signup');throw {code:'auth/network-request-failed'};};
 export const sendPasswordResetEmail=async()=>{window.__calls.push('reset');};
 export const sendEmailVerification=async()=>{};
 export const updateProfile=async()=>{};
`;
const server=await createServer({root,configFile:false,plugins:[{
 name:'test-only-auth-adapters',enforce:'pre',
 resolveId(id){
  if(id==='/qa-entry.jsx')return '\0qa-entry';
  if(id==='firebase/auth')return '\0auth-sdk-mock';
  if(id==='../lib/firebase')return '\0auth-instance-mock';
  if(id==='../context/AuthContext')return '\0auth-context-mock';
 },
 load(id){
  if(id==='\0qa-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route} from 'react-router-dom';import AuthPage from '/src/pages/AuthPage.jsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,{initialEntries:[window.__mode==='reset'?'/reset-password':'/login']},React.createElement(Routes,null,React.createElement(Route,{path:'/account',element:React.createElement('h1',null,'Synthetic account route')}),React.createElement(Route,{path:'*',element:React.createElement(AuthPage,{mode:window.__mode||'login'})})))));`;
  if(id==='\0auth-sdk-mock')return mockSdk;
  if(id==='\0auth-instance-mock')return 'export const auth={currentUser:null};';
  if(id==='\0auth-context-mock')return 'export const useAuth=()=>({user:null});';
 },
 transform(code,id){if(id.endsWith('/src/pages/AuthPage.jsx'))return code
  .replace('window.location.hostname','window.__authHost')
  .replace('window.location.assign(GOOGLE_LOGIN_URL)','window.__calls.push("handoff:"+GOOGLE_LOGIN_URL)');},
 configureServer(s){s.middlewares.use(async(req,res,next)=>{
  if(req.url==='/qa'){res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-entry.jsx"></script></body></html>'));return;}
  next();
 });}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;
const results=[];
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 const safari='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
 async function scenario(name,{ua=safari,host='connect-cv.web.app',storage=true,recoveryError=null,recoveryUser=null,mode='login'}={},verify){
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:ua});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.addInitScript(({host,storage,recoveryError,recoveryUser,mode})=>{
   window.__authHost=host;window.__calls=[];window.__recoveryError=recoveryError;window.__recoveryUser=recoveryUser;window.__mode=mode;
   if(!storage)Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Denied','SecurityError');}});
  },{host,storage,recoveryError,recoveryUser,mode});
  try{
   await page.goto(base+'/qa');await page.getByRole('heading',{name:recoveryUser==='current'?'Synthetic account route':mode==='reset'?'Đặt lại mật khẩu':'Đăng nhập'}).waitFor();
   await verify(page);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
   assert.deepEqual(errors,[]);
   if(out){await fs.mkdir(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
   results.push({name,passed:true,calls:await page.evaluate(()=>window.__calls)});
  }finally{await context.close();}
 }
 await scenario('zalo',{ua:safari+' Zalo/24.10'},async p=>{
  await p.getByRole('button',{name:'Tiếp tục với Google'}).click();
  await p.getByText('Bạn đang dùng trình duyệt trong Zalo hoặc ứng dụng khác.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),[]);
  assert.equal(await p.getByRole('link',{name:'https://connect-cv.firebaseapp.com/login'}).getAttribute('href'),'https://connect-cv.firebaseapp.com/login');
 });
 await scenario('safari-handoff',{},async p=>{
  await p.getByRole('button',{name:'Tiếp tục với Google'}).click();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['handoff:https://connect-cv.firebaseapp.com/login']);
 });
 await scenario('same-origin-redirect',{host:'connect-cv.firebaseapp.com'},async p=>{
  await p.waitForFunction(()=>window.__calls.length===1);
  await p.getByRole('button',{name:'Tiếp tục với Google'}).click();
  await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['recover','redirect']);
  assert.deepEqual(await p.evaluate(()=>window.__params),{prompt:'select_account'});
  assert.equal(await p.getByRole('button',{name:'Tiếp tục với Google'}).isEnabled(),true);
 });
 await scenario('storage-denied',{host:'connect-cv.firebaseapp.com',storage:false},async p=>{
  await p.getByRole('button',{name:'Tiếp tục với Google'}).click();
  await p.getByText('Trình duyệt không lưu được phiên đăng nhập.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['recover']);
 });
 await scenario('missing-initial-state',{host:'connect-cv.firebaseapp.com',recoveryError:'auth/missing-initial-state'},async p=>{
  await p.getByText('Phiên đăng nhập Google đã bị gián đoạn.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['recover']);
  assert.equal(await p.getByRole('button',{name:'Tiếp tục với Google'}).isEnabled(),true);
 });
 await scenario('redirect-return-current-user',{host:'connect-cv.firebaseapp.com',recoveryUser:'current'},async p=>{
  await p.getByRole('heading',{name:'Synthetic account route'}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['recover']);
 });
 await scenario('stale-result-after-signout',{host:'connect-cv.firebaseapp.com',recoveryUser:'signed-out'},async p=>{
  await p.getByRole('heading',{name:'Đăng nhập',exact:true}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['recover']);
 });
 await scenario('desktop-popup',{ua:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36'},async p=>{
  await p.getByRole('button',{name:'Tiếp tục với Google'}).click();
  await p.getByText('Trình duyệt đang chặn cửa sổ đăng nhập.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['popup']);
 });
 await scenario('email-still-usable',{ua:safari+' Zalo/24'},async p=>{
  await p.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await p.getByLabel('Mật khẩu',{exact:true}).fill('synthetic-only');
  await p.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await p.getByText('Không kết nối được dịch vụ đăng nhập.',{exact:false}).waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['email']);
 });
 await scenario('reset-still-usable',{mode:'reset'},async p=>{
  assert.equal(await p.getByRole('button',{name:'Tiếp tục với Google'}).count(),0);
  await p.getByLabel('Email',{exact:true}).fill('synthetic@example.invalid');await p.getByRole('button',{name:'Gửi hướng dẫn',exact:true}).click();
  await p.getByText('Nếu email hợp lệ, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.').waitFor();
  assert.deepEqual(await p.evaluate(()=>window.__calls),['reset']);
 });
 if(out)await fs.writeFile(path.join(out,'results.json'),JSON.stringify({syntheticSdk:true,realOAuthVerified:false,results},null,2));
 console.log(JSON.stringify({passed:results.length,syntheticSdk:true,realOAuthVerified:false,results}));
}finally{await browser?.close();await server.close();}
