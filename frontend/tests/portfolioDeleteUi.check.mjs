import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),results=[],observations=[];
const sourceRef=process.env.PORTFOLIO_DELETE_SOURCE_REF,sourceCode=sourceRef?execFileSync('git',['show',sourceRef+':frontend/src/pages/PortfolioPage.jsx'],{cwd:root,encoding:'utf8'}):null;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-portfolio-adapters',enforce:'pre',
 resolveId(id){if(id==='/qa-portfolio.jsx')return '\0portfolio-entry';if(id==='../context/AuthContext')return '\0portfolio-auth';if(id==='../lib/api')return '\0portfolio-api';},
 load(id){
  if(sourceCode&&id.replaceAll('\\','/')===path.join(root,'src/pages/PortfolioPage.jsx').replaceAll('\\','/'))return sourceCode;
  if(id==='\0portfolio-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import PortfolioPage from '/src/pages/PortfolioPage.jsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,null,React.createElement(PortfolioPage))));`;
  if(id==='\0portfolio-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>({user:useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.user),loading:false});`;
  if(id==='\0portfolio-api')return 'export const api=(path,options)=>window.__qa.api(path,options);';
 },
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-portfolio')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-portfolio','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-portfolio.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
const existing={id:'synthetic-existing',title:'Hồ sơ giả đã có',summary:'Mô tả giả',published:true,projects:[{title:'Dự án gốc',description:'Giả',url:'https://example.invalid/project'}]};
let browser;
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check,{items=[existing]}={}){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await page.addInitScript(items=>{
   const qa=window.__qa={user:{uid:'A',emailVerified:true},listeners:new Set(),writes:[],items,reads:0};
   qa.setActor=uid=>{qa.user={uid,emailVerified:true};for(const fn of qa.listeners)fn();};
   qa.api=async(path,options={})=>{
    if(!options.method){qa.reads++;if(qa.failReads)throw Error('Synthetic list failed');return {portfolios:structuredClone(qa.items)};}
    return new Promise((resolve,reject)=>qa.writes.push({actor:qa.user.uid,path,method:options.method,body:options.body?JSON.parse(options.body):null,resolve:()=>{if(options.method==='DELETE')qa.items=qa.items.filter(x=>!path.endsWith('/'+x.id));resolve({success:true,id:'synthetic-saved'});},reject:()=>reject(Error('Synthetic save failed'))}));
   };
  },items);
  try{await page.goto(base+'/qa-portfolio');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).waitFor();await page.waitForFunction(()=>__qa.reads>=2);await check(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,passed:true});}
  catch(e){results.push({name,passed:false,error:e.message.slice(0,700)});}
  finally{await context.close();}
 }

 async function edit(p){await p.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();}
 async function remove(p,{accept=true}={}){p.once('dialog',d=>accept?d.accept():d.dismiss());await p.getByRole('button',{name:'Xóa',exact:true}).click();}
 async function pending(p,n=1){await p.waitForFunction(n=>__qa.writes.length===n,n);}
 async function finish(p,i=0){await p.evaluate(i=>__qa.writes[i].resolve(),i);await p.waitForFunction(()=>!document.querySelector('form button.bg-brand-600')?.disabled);}
 async function save(p){await p.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();}
 await scenario('deleted-edit-draft-can-be-explicitly-saved-as-a-new-private-record',async p=>{
  await edit(p);await remove(p);await pending(p);await finish(p);
  assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),existing.title);
  if(process.env.PORTFOLIO_DELETE_QA_OUTPUT){await fs.mkdir(process.env.PORTFOLIO_DELETE_QA_OUTPUT,{recursive:true});await p.screenshot({path:path.join(process.env.PORTFOLIO_DELETE_QA_OUTPUT,'after-delete-draft.png')});}
  const published=await p.getByRole('checkbox').isChecked();await save(p);await pending(p,2);const w=await p.evaluate(()=>__qa.writes[1]);observations.push({afterDeletedEdit:{method:w.method,path:w.path,publishedBeforeSave:published,publishedInRequest:w.body.published}});assert.equal(w.method,'POST');assert.equal(w.path,'/api/portfolios');assert.equal(published,false,'Deleted record draft must default to private');assert.equal(w.body.published,false);
 });
 await scenario('edits-during-deletion-survive-with-projects-and-private-publication',async p=>{
  await edit(p);await remove(p);await pending(p);await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp mới khi đang xóa');await p.locator('textarea').fill('Nội dung mới giữ lại');await p.getByLabel('Tên dự án',{exact:true}).fill('Dự án vừa chỉnh');await finish(p);
  assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Nháp mới khi đang xóa');assert.equal(await p.locator('textarea').inputValue(),'Nội dung mới giữ lại');assert.equal(await p.getByLabel('Tên dự án',{exact:true}).inputValue(),'Dự án vừa chỉnh');assert.equal(await p.getByRole('checkbox').isChecked(),false);
 });
 await scenario('failed-deletion-keeps-existing-edit-identity-for-explicit-update',async p=>{
  await edit(p);await remove(p);await pending(p);await p.evaluate(()=>__qa.writes[0].reject());await p.getByText('Synthetic save failed',{exact:true}).waitFor();
  assert.equal(await p.getByRole('checkbox').isChecked(),true);await save(p);await pending(p,2);const w=await p.evaluate(()=>__qa.writes[1]);assert.equal(w.method,'PUT');assert.equal(w.path,'/api/portfolios/synthetic-existing');assert.equal(w.body.title,existing.title);
 });
 await scenario('deleting-another-record-preserves-unrelated-new-draft-publication-choice',async p=>{
  await p.getByLabel('Tiêu đề',{exact:true}).fill('Bản nháp độc lập');await p.getByRole('checkbox').check();await remove(p);await pending(p);await finish(p);
  assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Bản nháp độc lập');assert.equal(await p.getByRole('checkbox').isChecked(),true);await save(p);await pending(p,2);assert.equal(await p.evaluate(()=>__qa.writes[1].method),'POST');
 });
 await scenario('cancel-deletion-does-not-send-or-alter-edit-draft',async p=>{
  await edit(p);await remove(p,{accept:false});assert.equal(await p.evaluate(()=>__qa.writes.length),0);assert.equal(await p.getByRole('checkbox').isChecked(),true);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),existing.title);
 });
 await scenario('pending-deletion-locks-other-mutations-including-programmatic-submit',async p=>{
  await edit(p);await remove(p);await pending(p);await p.locator('form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(await p.evaluate(()=>__qa.writes.length),1,'Save cannot race an unfinished deletion');assert.equal(await p.getByRole('button',{name:'Chỉnh sửa',exact:true}).isDisabled(),true);await finish(p);
 });
 await scenario('old-actor-delete-completion-does-not-read-or-alter-new-actor-draft',async p=>{
  await edit(p);await remove(p);await pending(p);await p.evaluate(()=>__qa.setActor('B'));await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp của B');const reads=await p.evaluate(()=>__qa.reads);await p.evaluate(()=>__qa.writes[0].resolve());await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.evaluate(()=>__qa.reads),reads);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Nháp của B');
 });
 await scenario('A-B-A-deletion-completion-cannot-reload-or-unlock-the-new-operation',async p=>{
  await edit(p);await remove(p);await pending(p);await p.evaluate(()=>__qa.setActor('B'));await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp B');await p.evaluate(()=>__qa.setActor('A'));await p.getByLabel('Tiêu đề',{exact:true}).fill('Nháp A mới');await remove(p);await pending(p,2);const reads=await p.evaluate(()=>__qa.reads);await p.evaluate(()=>__qa.writes[0].resolve());await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.evaluate(()=>__qa.reads),reads,'Old session cannot launch a new list request');assert.equal(await p.getByRole('button',{name:/Đang xóa/}).count()>0,true);assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),'Nháp A mới');await p.evaluate(()=>__qa.writes[1].reject());
 });
 await scenario('successful-delete-with-list-read-failure-still-detaches-the-retained-draft',async p=>{
  await edit(p);await remove(p);await pending(p);await p.evaluate(()=>{__qa.failReads=true;__qa.writes[0].resolve();});await p.getByRole('status').filter({hasText:'Không tải được hồ sơ.'}).waitFor();assert.equal(await p.getByLabel('Tiêu đề',{exact:true}).inputValue(),existing.title);assert.equal(await p.getByRole('checkbox').isChecked(),false);await p.evaluate(()=>__qa.failReads=false);await save(p);await pending(p,2);assert.equal(await p.evaluate(()=>__qa.writes[1].method),'POST');
 });
 const out=process.env.PORTFOLIO_DELETE_QA_OUTPUT;if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify({sourceRef:sourceRef||'working-tree',actualReactPage:true,syntheticAuthAndApi:true,firebaseVerified:false,cloudWrites:0,results,observations},null,2));}console.log(JSON.stringify({results,observations,cloudWrites:0,syntheticAuthAndApi:true}));if(results.some(x=>!x.passed))process.exitCode=1;
}finally{if(browser)await browser.close();await server.close();}
