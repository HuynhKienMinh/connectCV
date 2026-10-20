import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),results=[];
const sourceRef=process.env.PORTFOLIO_READ_SOURCE_REF;
const readSource=file=>sourceRef?execFileSync('git',['show',`${sourceRef}:frontend/${file}`],{encoding:'utf8'}):null;
const selectedSources=new Map(['src/pages/PortfolioPage.jsx','src/lib/portfolioLoader.js'].map(file=>[path.join(root,file).replaceAll('\\','/'),readSource(file)]));
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-portfolio-adapters',enforce:'pre',
 transform(code,id){const selected=selectedSources.get(id.replaceAll('\\','/').split('?')[0]);if(selected)return selected;},
 resolveId(id){if(id==='/qa-portfolio.jsx')return '\0portfolio-entry';if(id==='../context/AuthContext')return '\0portfolio-auth';if(id==='../lib/api')return '\0portfolio-api';},
 load(id){
  if(id==='\0portfolio-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import PortfolioPage from '/src/pages/PortfolioPage.jsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,null,React.createElement(PortfolioPage))));`;
  if(id==='\0portfolio-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>({user:useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.user),loading:false});`;
  if(id==='\0portfolio-api')return 'export const api=(path,options)=>window.__qa.api(path,options);';
 },
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-portfolio')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-portfolio','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-portfolio.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check,{items=[]}={}){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.addInitScript(items=>{
   const qa=window.__qa={user:{uid:'A',emailVerified:true},listeners:new Set(),writes:[],items,reads:0,pendingReads:[],holdReads:false};
   qa.setActor=uid=>{qa.user={uid,emailVerified:true};for(const fn of qa.listeners)fn();};
   qa.api=async(path,options={})=>{
    if(!options.method){qa.reads++;if(qa.holdReads)return new Promise((resolve,reject)=>qa.pendingReads.push({resolve,reject,signal:options.signal}));return {portfolios:structuredClone(qa.items)};}
    return new Promise((resolve,reject)=>qa.writes.push({actor:qa.user.uid,path,method:options.method,body:JSON.parse(options.body),resolve:()=>resolve({success:true,id:'synthetic-saved'}),reject:()=>reject(Error('Synthetic save failed'))}));
   };
  },items);
  try{await page.goto(base+'/qa-portfolio');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).waitFor();await page.waitForFunction(()=>__qa.reads>=2);await check(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,passed:true});}
  catch(e){results.push({name,passed:false,error:e.message.slice(0,900)});}
  finally{await context.close();}
 }
 async function start(p,title='Bản đã gửi'){await p.getByLabel('Tiêu đề',{exact:true}).fill(title);await p.locator('textarea').fill('Dữ kiện giả đã gửi');await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await p.waitForFunction(()=>__qa.writes.length===1);}
 await scenario('newer-draft-survives-successful-create',async p=>{
  await start(p);await p.getByLabel('Tiêu đề',{exact:true}).fill('Bản nháp mới chưa gửi');await p.locator('textarea').fill('Nội dung mới phải giữ');
  await p.getByRole('button',{name:'+ Thêm dự án',exact:true}).click();await p.getByLabel('Tên dự án',{exact:true}).fill('Dự án mới');
  await p.evaluate(()=>__qa.writes[0].resolve());await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).waitFor();await p.waitForFunction(()=>!document.querySelector('form button[type="submit"],form button.bg-brand-600')?.disabled);
  assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Bản nháp mới chưa gửi');assert.equal(await p.locator('textarea').inputValue(),'Nội dung mới phải giữ');assert.equal(await p.getByLabel('Tên dự án',{exact:true}).inputValue(),'Dự án mới');
  assert.equal(await p.evaluate(()=>__qa.writes.length),1);assert.equal(await p.evaluate(()=>__qa.writes[0].body.title),'Bản đã gửi');
 });
 await scenario('pending-update-retains-project-publication-and-original-id',async p=>{
  await p.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await p.waitForFunction(()=>__qa.writes.length===1);
  await p.getByLabel('Tên dự án',{exact:true}).fill('Dự án vừa chỉnh');await p.getByRole('checkbox').check();await p.evaluate(()=>__qa.writes[0].resolve());await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).waitFor();
  assert.equal(await p.getByLabel('Tên dự án',{exact:true}).inputValue(),'Dự án vừa chỉnh');assert.equal(await p.getByRole('checkbox').isChecked(),true);await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await p.waitForFunction(()=>__qa.writes.length===2);
  const saved=await p.evaluate(()=>__qa.writes[1]);assert.equal(saved.method,'PUT');assert.equal(saved.path,'/api/portfolios/synthetic-existing');assert.equal(saved.body.projects[0].title,'Dự án vừa chỉnh');assert.equal(saved.body.published,true);await p.evaluate(()=>__qa.writes[1].resolve());
 },{items:[{id:'synthetic-existing',title:'Hồ sơ giả đã có',summary:'Mô tả giả',published:false,projects:[{title:'Dự án gốc',description:'Giả',url:''}]}]});
 await scenario('unchanged-success-clears-once-and-double-submit-is-ignored',async p=>{
  await start(p);await p.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  assert.equal(await p.evaluate(()=>__qa.writes.length),1);await p.evaluate(()=>__qa.writes[0].resolve());await p.getByText('Đã lưu hồ sơ năng lực.',{exact:true}).waitFor();assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'');
 });
 await scenario('failed-save-keeps-latest-text-and-projects',async p=>{
  await start(p);await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp khi mất mạng');await p.evaluate(()=>__qa.writes[0].reject());await p.getByText('Synthetic save failed',{exact:true}).waitFor();assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Nháp khi mất mạng');assert.equal(await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).isEnabled(),true);
 });
 await scenario('old-account-completion-cannot-clear-new-account-draft',async p=>{
  await start(p);await p.evaluate(()=>__qa.setActor('B'));await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp tài khoản B');await p.evaluate(()=>__qa.writes[0].resolve());await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Nháp tài khoản B');
 });
 await scenario('return-to-same-account-does-not-revive-old-save-or-unlock-new-save',async p=>{
  await start(p);await p.evaluate(()=>__qa.setActor('B'));await p.getByLabel('Tiêu đề',{exact:true}).fill('B');await p.evaluate(()=>__qa.setActor('A'));await p.getByLabel('Tiêu đề',{exact:true}).fill('Phiên A mới');await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await p.waitForFunction(()=>__qa.writes.length===2);await p.locator('textarea').fill('Nháp mới khi gửi');
  await p.evaluate(()=>__qa.writes[0].resolve());await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Phiên A mới');assert.equal(await p.getByRole('button',{name:'Đang lưu…',exact:true}).isDisabled(),true);await p.evaluate(()=>__qa.writes[1].resolve());await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).waitFor();assert.equal(await p.locator('textarea').inputValue(),'Nháp mới khi gửi');
 });
 await scenario('read-deadline-unlocks-form-and-explicit-retry-keeps-draft',async p=>{
  await p.clock.install();await p.evaluate(()=>{__qa.holdReads=true;__qa.setActor('B');});await p.waitForFunction(()=>__qa.pendingReads.length===1);
  await p.getByLabel('Tiêu đề',{exact:true}).fill('Draft retained during stalled read');await p.clock.fastForward(60001);
  assert.equal(await p.locator('form button.bg-brand-600').isEnabled(),true);assert.equal(await p.evaluate(()=>__qa.pendingReads[0].signal?.aborted),true);
  const qaOut=process.env.PORTFOLIO_UI_QA_OUTPUT;if(qaOut){await fs.mkdir(qaOut,{recursive:true});await p.screenshot({path:path.join(qaOut,'read-timeout-retained-draft-390.png')});}
  await p.getByRole('button',{name:'Thử tải lại',exact:true}).waitFor();await p.evaluate(()=>__qa.holdReads=false);await p.getByRole('button',{name:'Thử tải lại',exact:true}).click();
  await p.waitForFunction(()=>!document.querySelector('form button.bg-brand-600').disabled);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Draft retained during stalled read');assert.equal(await p.evaluate(()=>__qa.writes.length),0);
 });
 await scenario('confirmed-save-read-timeout-releases-lock-without-resubmitting-write',async p=>{
  await start(p);await p.getByLabel('Tiêu đề',{exact:true}).fill('Newer unsent draft');await p.clock.install();await p.evaluate(()=>{__qa.holdReads=true;__qa.writes[0].resolve();});await p.waitForFunction(()=>__qa.pendingReads.length===1);await p.clock.fastForward(60001);
  assert.equal(await p.locator('form button.bg-brand-600').isEnabled(),true);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Newer unsent draft');assert.equal(await p.evaluate(()=>__qa.writes.length),1);
  await p.evaluate(()=>__qa.holdReads=false);await p.getByRole('button',{name:'Thử tải lại',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('form button.bg-brand-600').disabled);assert.equal(await p.evaluate(()=>__qa.writes.length),1);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Newer unsent draft');
 });
 await scenario('late-timed-out-read-cannot-populate-or-unlock-new-retry',async p=>{
  await p.clock.install();await p.evaluate(()=>{__qa.holdReads=true;__qa.setActor('B');});await p.waitForFunction(()=>__qa.pendingReads.length===1);await p.clock.fastForward(60001);await p.getByRole('button',{name:'Thử tải lại',exact:true}).click();await p.waitForFunction(()=>__qa.pendingReads.length===2);
  await p.evaluate(()=>__qa.pendingReads[0].resolve({portfolios:[{id:'old',title:'OBSOLETE_READ',summary:'',projects:[]}]}));await p.clock.runFor(5);assert.equal(await p.locator('article').count(),0);assert.equal(await p.locator('form button.bg-brand-600').isDisabled(),true);
  await p.evaluate(()=>__qa.pendingReads[1].resolve({portfolios:[]}));await p.waitForFunction(()=>!document.querySelector('form button.bg-brand-600').disabled);assert.equal(await p.locator('article').count(),0);assert.equal(await p.evaluate(()=>__qa.writes.length),0);
 });
 const out=process.env.PORTFOLIO_UI_QA_OUTPUT;if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify({sourceRef:sourceRef||'working-tree',actualReactPage:true,syntheticAuthAndApi:true,firebaseVerified:false,cloudWrites:0,results},null,2));}console.log(JSON.stringify({results,cloudWrites:0,syntheticAuthAndApi:true}));if(results.some(x=>!x.passed))process.exitCode=1;
}finally{if(browser)await browser.close();await server.close();}
