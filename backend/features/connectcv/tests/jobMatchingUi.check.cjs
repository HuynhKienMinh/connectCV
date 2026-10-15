'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core'),{matchJobsWithProfile}=require('../src/services/jobService');
const profiles=require('./fixtures/job-match-profiles.json').filter(p=>p.jobId.endsWith('-01'));
const source=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const controller=source.slice(source.indexOf("    let currentJobInputMode = 'automatch'"),source.indexOf('    // Render thanh chuyển đổi giữa các bản CV đã tạo'));
const escape=source.slice(source.indexOf('    function escapeForHtml(str)'),source.indexOf('    let currentEducationList'));
const ids=['automatch-suggested-roles','automatch-suggested-fields','automatch-extracted-keywords','badge-selected-jobs-count','btn-generate-top-text','btn-generate-bottom-text','automatch-jobs-list'];
const modalIds=['company','role','match-badge','salary','location','worktype','culture','fitreason','keywords','responsibilities','requirements','benefits'];
const html='<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style"></head><body class="p-6 bg-slate-50"><main class="max-w-4xl mx-auto"><h1 class="text-xl font-bold">Job giả · local UI test</h1><p>100 job giả định / 10 ngành. Không AI, không profile thật, không tuyển dụng.</p><label>Hồ sơ giả <select id="persona" onchange="loadPersona()">'+profiles.map((p,i)=>'<option value="'+i+'">'+p.industry+'</option>').join('')+'</select></label><textarea id="cv-profile" hidden></textarea><label><input id="chk-select-all-jobs" type="checkbox" onchange="toggleSelectAllJobs(this.checked)">Chọn tất cả</label>'+ids.map(id=>'<div id="'+id+'"></div>').join('')+'<div id="modal-job-detail" class="hidden border p-4 bg-white"><button onclick="closeJobDetailModal()">Đóng</button><img id="modal-job-logo">'+modalIds.map(id=>'<div id="modal-job-'+id+'"></div>').join('')+'</div></main><script>'+escape+controller+'\nconst fixtureProfiles='+JSON.stringify(profiles)+';function showToastSuccess(){};function loadPersona(){document.getElementById("cv-profile").value=JSON.stringify(fixtureProfiles[Number(document.getElementById("persona").value)].profile);return refreshAutoMatchJobs();}loadPersona();</script></body></html>';
let posts=0;
const server=http.createServer((req,res)=>{
 if(req.url==='/style'){res.setHeader('Content-Type','text/css');return res.end(fs.readFileSync(path.resolve(__dirname,'../public/css/studio.css')));}
 if(req.url==='/api/cv/auto-match-jobs'&&req.method==='POST'){let body='';req.on('data',b=>body+=b);req.on('end',()=>{posts++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(matchJobsWithProfile(JSON.parse(body).profile)));});return;}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 if(process.env.CV_PREVIEW_SERVE==='1'){console.log(base);return;}
 const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()}),page=await browser.newPage({viewport:{width:1000,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const rows=[];
 try{
  await page.goto(base);
  for(let i=0;i<profiles.length;i++){
   const f=profiles[i];await page.locator('#persona').selectOption(String(i));await page.locator('#chk-job-'+f.jobId).waitFor();await page.locator('#chk-job-'+f.jobId).check();assert.match(await page.locator('#badge-selected-jobs-count').innerText(),/Đang chọn: 1\//);await page.getByRole('button',{name:'Chi tiết',exact:true}).first().click();assert.match(await page.locator('#modal-job-company').innerText(),/GIẢ LẬP/);assert.equal(await page.locator('#modal-job-role').innerText(),f.profile.targetRole);assert.match(await page.locator('#modal-job-match-badge').innerText(),/100\/100 · từ khóa/);rows.push({industry:f.industry,topJob:f.jobId,selection:true,detail:true});await page.getByRole('button',{name:'Đóng',exact:true}).click();
  }
  assert.deepEqual(errors,[]);const out=process.env.JOB_UI_QA_OUTPUT;assert.ok(out);fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'job-match.png')});fs.writeFileSync(path.join(out,'job-ui.json'),JSON.stringify({synthetic:true,realAiCalls:0,cloudWrites:0,localMatchRequests:posts,rows,errors},null,2));console.log(JSON.stringify({rows,errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});
