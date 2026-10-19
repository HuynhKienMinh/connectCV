// Actual PortfolioPage/Router/loader. Auth observer and API transport are local fixtures.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url),{chromium}=require('../../backend/features/connectcv/node_modules/playwright-core');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=process.env.PORTFOLIO_PUBLIC_QA_OUTPUT;
const server=await createServer({root,configFile:false,plugins:[{
 name:'synthetic-public-portfolio',enforce:'pre',
 resolveId(id){if(id==='/qa-public-portfolio.jsx')return '\0public-portfolio-entry';if(id==='../context/AuthContext')return '\0public-portfolio-auth';if(id==='../lib/api')return '\0public-portfolio-api';},
 load(id){
  if(id==='\0public-portfolio-entry')return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,Link,useLocation} from 'react-router-dom';import PortfolioPage from '/src/pages/PortfolioPage.jsx';import '/src/index.css';function Marker(){return React.createElement('output',{'data-testid':'route'},useLocation().pathname);}createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(MemoryRouter,{initialEntries:['/portfolio/public-A']},React.createElement(Marker),React.createElement('nav',null,...[['A','/portfolio/public-A'],['B','/portfolio/public-B'],['Missing','/portfolio/missing'],['Owner','/portfolio']].map(([label,to])=>React.createElement(Link,{key:to,to},'QA '+label))),React.createElement(Routes,null,React.createElement(Route,{path:'/portfolio/:id',element:React.createElement(PortfolioPage,{publicView:true})}),React.createElement(Route,{path:'/portfolio',element:React.createElement(PortfolioPage)}),React.createElement(Route,{path:'/login',element:React.createElement('h1',null,'Đăng nhập giả')})))));`;
  if(id==='\0public-portfolio-auth')return `import {useSyncExternalStore} from 'react';export const useAuth=()=>useSyncExternalStore(fn=>{window.__qa.listeners.add(fn);return()=>window.__qa.listeners.delete(fn);},()=>window.__qa.auth);`;
  if(id==='\0public-portfolio-api')return 'export const api=(path,options)=>window.__qa.api(path,options);';
 },
 configureServer(s){s.middlewares.use(async(req,res,next)=>{if(req.url!=='/qa-public-portfolio')return next();res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/qa-public-portfolio','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-public-portfolio.jsx"></script></body></html>'));});}
},react()],optimizeDeps:{include:['react','react-dom/client','react-router-dom']},server:{host:'127.0.0.1',port:0,open:false}});
let browser;const results=[];
try{
 await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});
 async function scenario(name,check,width=390){
  const context=await browser.newContext({viewport:{width,height:844}}),p=await context.newPage(),errors=[];
  p.setDefaultTimeout(4000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await p.addInitScript(()=>{
   const qa=window.__qa={auth:{user:null,loading:false},listeners:new Set(),reads:[],writes:0};
   qa.setActor=uid=>{qa.auth={user:uid?{uid,emailVerified:true}:null,loading:false};for(const fn of qa.listeners)fn();};
   qa.api=(path,options={})=>{if(options.method){qa.writes++;throw Error('Unexpected synthetic mutation');}return new Promise((resolve,reject)=>qa.reads.push({path,actor:qa.auth.user?.uid||'visitor',settled:false,resolve,reject}));};
  });
  try{await p.goto(base+'/qa-public-portfolio');await p.waitForFunction(()=>__qa.reads.length===2);await check(p);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>__qa.writes),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({name,pass:true});}
  catch(e){results.push({name,pass:false,error:e.message});}
  finally{if(out&&name==='anonymous-public-page-has-no-owner-controls'){await fs.mkdir(out,{recursive:true});await p.screenshot({path:path.join(out,'public-visitor-390.png'),fullPage:true});}await context.close();}
 }
 const publicPath=id=>'/api/portfolios/public/'+id;
 const item=(id,title,projects=[])=>({id,title,summary:'Dữ kiện portfolio giả, không có thông tin cá nhân.',projects,published:true});
 async function settle(p,index,data,{status=null}={}){
  await p.evaluate(({index,data,status})=>{const r=__qa.reads[index];r.settled=true;if(status)r.reject(Object.assign(Error('SYNTHETIC_PRIVATE_TRANSPORT_ERROR'),{status}));else r.resolve({portfolio:data});},{index,data,status});
  // Drain the promise and React rendering before checking the visible transition.
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 async function latest(p,id){const pathname=publicPath(id);await p.waitForFunction(path=>__qa.reads.some(r=>r.path===path&&!r.settled),pathname);return p.evaluate(path=>__qa.reads.findLastIndex(r=>r.path===path&&!r.settled),pathname);}
 async function nav(p,label,path){await p.getByRole('link',{name:'QA '+label,exact:true}).click();await p.waitForFunction(path=>document.querySelector('[data-testid="route"]')?.textContent===path,path);}
 async function noPortfolio(p){assert.equal(await p.locator('article').count(),0);}
 await scenario('anonymous-public-page-has-no-owner-controls',async p=>{
  await settle(p,1,item('public-A','Portfolio công khai giả A',[{title:'Dự án giả',description:'Nội dung minh họa',url:'https://example.invalid/project'}]));await p.getByRole('heading',{name:'Portfolio công khai giả A',exact:true}).waitFor();
  assert.equal(await p.locator('form').count(),0);assert.equal(await p.getByRole('button',{name:'Chỉnh sửa',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'Xóa',exact:true}).count(),0);
  const link=p.getByRole('link',{name:'Xem dự án',exact:true});assert.equal(await link.getAttribute('href'),'https://example.invalid/project');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');assert.equal(await link.getAttribute('target'),'_blank');
  assert.deepEqual(await p.evaluate(()=>__qa.reads.map(r=>r.path)),[publicPath('public-A'),publicPath('public-A')]);
 });
 await scenario('route-change-hides-A-before-B-and-ignores-old-A-success',async p=>{
  await settle(p,1,item('public-A','Public A trước chuyển'));await p.getByRole('heading',{name:'Public A trước chuyển',exact:true}).waitFor();await nav(p,'B','/portfolio/public-B');const b=await latest(p,'public-B');await noPortfolio(p);await p.getByRole('status').filter({hasText:'Đang tải hồ sơ năng lực…'}).waitFor();
  await settle(p,0,item('public-A','A cũ tuyệt đối không hồi lại'));await noPortfolio(p);await settle(p,b,item('public-B','Public B mới'));await p.getByRole('heading',{name:'Public B mới',exact:true}).waitFor();assert.equal(await p.getByText('A cũ tuyệt đối không hồi lại',{exact:true}).count(),0);
 });
 await scenario('hidden-or-missing-response-removes-old-public-content',async p=>{
  await settle(p,1,item('public-A','A đã được công khai'));await nav(p,'Missing','/portfolio/missing');const missing=await latest(p,'missing');await noPortfolio(p);await settle(p,missing,null,{status:404});await p.getByRole('status').filter({hasText:'Không tải được hồ sơ.'}).waitFor();await noPortfolio(p);assert.equal(await p.getByText('SYNTHETIC_PRIVATE_TRANSPORT_ERROR',{exact:false}).count(),0);
  await settle(p,0,item('public-A','A cũ không được khôi phục'));await noPortfolio(p);
 });
 await scenario('return-to-same-public-id-does-not-revive-old-generation',async p=>{
  await nav(p,'B','/portfolio/public-B');const oldB=await latest(p,'public-B');await nav(p,'A','/portfolio/public-A');const newA=await latest(p,'public-A');assert.ok(newA>1);await settle(p,1,item('public-A','A request trước'));await settle(p,oldB,item('public-B','B request trước'));await noPortfolio(p);await settle(p,newA,item('public-A','A phiên route mới'));await p.getByRole('heading',{name:'A phiên route mới',exact:true}).waitFor();
 });
 await scenario('transport-error-can-recover-with-explicit-browser-reload',async p=>{
  await settle(p,1,null,{status:503});await p.getByRole('status').filter({hasText:'Không tải được hồ sơ.'}).waitFor();await noPortfolio(p);await p.reload();await p.waitForFunction(()=>__qa.reads.length===2);await settle(p,1,item('public-A','Đã phục hồi sau tải lại'));await p.getByRole('heading',{name:'Đã phục hồi sau tải lại',exact:true}).waitFor();
 });
 await scenario('account-switch-keeps-public-route-and-never-adds-owner-controls',async p=>{
  await settle(p,1,item('public-A','Public visitor'));await p.evaluate(()=>__qa.setActor('B'));await p.waitForFunction(()=>__qa.reads.length===3);await noPortfolio(p);await settle(p,0,item('public-A','Visitor result cũ'));await noPortfolio(p);await settle(p,2,item('public-A','Public tài khoản B'));await p.getByRole('heading',{name:'Public tài khoản B',exact:true}).waitFor();assert.equal(await p.locator('form').count(),0);assert.equal(await p.getByRole('button').count(),0);assert.equal(await p.evaluate(()=>__qa.reads.every(r=>r.path.startsWith('/api/portfolios/public/'))),true);
 });
 await scenario('anonymous-owner-navigation-clears-public-view-and-requires-login',async p=>{
  await settle(p,1,item('public-A','Public trước login'));await nav(p,'Owner','/login');await p.getByRole('heading',{name:'Đăng nhập giả',exact:true}).waitFor();await settle(p,0,item('public-A','Old public late'));assert.equal(await p.locator('article').count(),0);assert.equal(await p.locator('form').count(),0);assert.equal(await p.evaluate(()=>__qa.reads.some(r=>r.path==='/api/portfolios')),false);
 });
 await scenario('empty-projects-public-profile-renders-without-private-form',async p=>{await settle(p,1,item('public-A','Portfolio giả chưa thêm dự án'));await p.getByRole('heading',{name:'Portfolio giả chưa thêm dự án',exact:true}).waitFor();assert.equal(await p.locator('article').count(),1);assert.equal(await p.getByRole('link',{name:'Xem dự án',exact:true}).count(),0);assert.equal(await p.locator('form').count(),0);},1366);
 const report={actualReactPortfolioPage:true,actualRouter:true,actualPortfolioLoader:true,syntheticAuthAndApi:true,realFirebaseVerified:false,cloudWrites:0,externalNetworkBlocked:true,chromiumSandbox:true,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results};
 if(out){await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));}console.log(JSON.stringify(report));if(report.failed)process.exitCode=1;
}finally{await browser?.close();await server.close();}
