'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),path=require('node:path');
const express=require('express');
const app=express();require('../mount')(app);
(async()=>{const s=await new Promise(r=>{const server=app.listen(0,'127.0.0.1',()=>r(server));});const base='http://127.0.0.1:'+s.address().port;let checks=[];
try{
 const health=await (await fetch(base+'/api/features/health')).json();assert.equal(health.authenticationIntegrated,false);checks.push('upstream auth placeholder fails closed');
 for(const p of ['/api/cv/generate','/api/cv/export-pdf','/api/interview/start','/api/interview/debrief','/api/chatbot/message','/api/upload/avatar']){
  const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer forged','x-user-id':'admin'},body:JSON.stringify({userId:'admin'})});assert.equal(r.status,503);assert.equal((await r.json()).code,'AUTH_INTEGRATION_REQUIRED');
 }checks.push('all owned writes refuse spoofed identity');assert.equal((await fetch(base+'/api/cv/templates/classic_1/download-docx')).status,503);checks.push('public GET cannot start expensive Word rendering');
 for(const lang of ['vi','en']){const list=await (await fetch(base+'/api/cv/templates?lang='+lang)).json();const templates=list.data||list.templates;assert.equal(templates.length,74);for(const t of templates){const r=await fetch(base+t.thumbnailUrl);assert.equal(r.status,200,t.thumbnailUrl);assert(r.headers.get('content-type').includes('image/png'));}}
 checks.push('all 148 gallery previews available from packaged paths');
 const ui=await (await fetch(base+'/ai/')).text();assert(!ui.includes('initConnectCVAuth'));assert(!ui.includes('Huỳnh Kiên Minh'));assert(!ui.includes('kienminh.dev@gmail.com'));assert(!ui.includes('id="btn-tab-freelance-module"'));checks.push('no development login, personal defaults or portfolio navigation');
 const compiled=[...ui.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);for(const js of compiled)new (require('vm').Script)(js);checks.push('packaged UI scripts compile');
 require('fs').writeFileSync(path.join(require('os').tmpdir(),'feature-integration-results.json'),JSON.stringify({checks,publicDeploymentReady:false,authSourceChanged:false,reactSourceChanged:false},null,2));console.log('PASS integration',checks);
}finally{s.close();}})().catch(e=>{console.error(e);process.exitCode=1});
