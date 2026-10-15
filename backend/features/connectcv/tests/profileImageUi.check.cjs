'use strict';
// Actual avatar handlers + account bridge + autosave + account router; in-memory synthetic identity/DB only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),express=require('express');
const {chromium}=require('playwright-core');
const {AccountStore}=require('../../../src/services/accountStore');
const {PortfolioTestDB}=require('../../../tests/helpers/portfolioFixture.cjs');
const {createAccountRouter}=require('../../../src/routes/account');
const {profileVersion}=require('../../../src/services/profileVersion');
const root=path.resolve(__dirname,'..'),studio=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const avatar=studio.slice(studio.indexOf('  const AVATAR_MAX_BYTES'),studio.indexOf('  // ─── Portfolio Avatar Handler'));
const sync=studio.slice(studio.indexOf('    function syncProfileFormToJSON()'),studio.indexOf('    function syncJSONToProfileForm()'));
const db=new PortfolioTestDB(),store=new AccountStore(db),user={id:'synthetic-image-A'};
const auth=(req,res,next)=>{req.user=user;next();};
const app=express();let attempts=0,rejectSave=false,holdUpload=false,releaseUpload,uploadArrived;
app.use('/api/account',(req,res,next)=>{if(req.method==='PUT'){attempts++;if(rejectSave)return res.status(413).json({success:false});}next();},createAccountRouter({accountStore:()=>store,authenticate:auth}));
app.use('/api/upload',auth,(req,res,next)=>{if(!holdUpload)return next();uploadArrived?.();releaseUpload=()=>next();},require('../src/routes/upload'));
app.use('/ai',express.static(path.join(root,'public')));
app.get('/',(req,res)=>res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ai/css/studio.css"><script src="/ai/js/profile-autosave.js"></script><script src="/ai/js/profile-image.js"></script><script src="/ai/js/account-bridge.js"></script></head><body class="p-6 bg-slate-50"><main class="max-w-3xl mx-auto bg-white border rounded-xl p-6"><h1 class="font-bold">Kiểm thử lưu hồ sơ · dữ liệu và ảnh giả</h1><label>Họ tên<input class="border p-2 block" id="prof-fullname" value="Ứng viên giả lập" oninput="syncProfileFormToJSON()"></label><label>Giới thiệu<textarea id="prof-summary" class="border p-2 block" oninput="syncProfileFormToJSON()">Dữ kiện giả cần giữ.</textarea></label><img id="cv-avatar-preview-img" class="hidden" style="width:120px;height:160px;object-fit:contain" alt="Ảnh thử"><span id="cv-avatar-empty-icon">Chưa có ảnh</span><span id="cv-avatar-btn-label">Tải ảnh lên</span><button id="cv-avatar-remove-btn" onclick="removeCvAvatar(event)">Xóa ảnh</button><input type="file" id="cv-avatar-file" onchange="handleCvAvatarUpload(event)"><p id="cv-avatar-error" class="hidden" role="alert"></p><div id="cv-profile-raw-wrapper" class="hidden"><textarea id="cv-profile">{}</textarea></div></main><script>let currentEducationList=[],currentExperienceList=[];const sanitizeInput=s=>s,scheduleAutoRecommendation=()=>{},scheduleAutoMatchRefresh=()=>{},showToastSuccess=()=>{},syncJSONToProfileForm=()=>{};${avatar}\n${sync}</script></body></html>`));
app.use((e,req,res,next)=>res.status(e.status||500).json({success:false}));
const out=process.env.PROFILE_IMAGE_QA_OUTPUT,rows=[];
(async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:chromium.executablePath()});const page=await browser.newPage({viewport:{width:1000,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.route('**/*',r=>r.request().url().startsWith(base)||r.request().url().startsWith('data:')?r.continue():r.abort());
 try{
  await page.goto(base);await page.getByText('Hồ sơ sẽ tự động lưu khi nhập.').waitFor();
  const data=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=1200;c.height=1600;const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);let seed=12345;
   for(let i=0;i<im.data.length;i+=4){for(let k=0;k<3;k++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;im.data[i+k]=seed>>>24;}im.data[i+3]=255;}ctx.putImageData(im,0,0);
   return c.toDataURL('image/jpeg',.94);
  });
  const raw=Buffer.from(data.split(',')[1],'base64');assert.ok(raw.length<3*1024**2&&data.length>900*1024);
  const legacy={fullName:'Ứng viên giả lập',summary:'Dữ kiện giả cần giữ.',avatarUrl:data,avatarDataUrl:data};
  const before=await fetch(base+'/api/account/profile',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':profileVersion(user.id,{})},body:JSON.stringify(legacy)});assert.equal(before.status,413);assert.deepEqual(db.records.get('accounts/'+user.id).profile,{});rows.push({phase:'before',imageBytes:raw.length,payloadBytes:Buffer.byteLength(JSON.stringify(legacy)),status:413});
  await page.locator('#cv-avatar-file').setInputFiles({name:'synthetic-portrait.jpg',mimeType:'image/jpeg',buffer:raw});
  await page.waitForFunction(()=>window.currentCvAvatarDataUrl&&document.getElementById('cv-avatar-btn-label').textContent==='Thay ảnh');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Đã lưu vào tài khoản.',{exact:true}).waitFor();
  let saved=db.records.get('accounts/'+user.id).profile;assert.equal(saved.fullName,legacy.fullName);assert.equal(saved.summary,legacy.summary);assert.equal('avatarDataUrl' in saved,false);assert.ok(saved.avatarUrl.length<=240000);
  const dimensions=await page.locator('#cv-avatar-preview-img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));assert.deepEqual(dimensions,{width:576,height:768});rows.push({phase:'new-upload',avatarChars:saved.avatarUrl.length,payloadBytes:Buffer.byteLength(JSON.stringify(saved)),dimensions,passed:true});
  // An old unsaved duplicate draft is repaired at save time, too.
  await page.evaluate(d=>{document.getElementById('cv-profile').value=JSON.stringify({...d,fullName:'Bản nháp cũ giữ nguyên'});window.currentCvAvatarDataUrl=d.avatarUrl;document.getElementById('prof-fullname').value='Bản nháp cũ giữ nguyên';window.dispatchEvent(new Event('connectcv:profile-change'));},legacy);
  await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Đã lưu vào tài khoản.',{exact:true}).waitFor();saved=db.records.get('accounts/'+user.id).profile;assert.equal(saved.fullName,'Bản nháp cũ giữ nguyên');assert.ok(saved.avatarUrl.length<=240000);assert.equal('avatarDataUrl' in saved,false);assert.equal(await page.locator('#cv-profile').evaluate(e=>'avatarDataUrl' in JSON.parse(e.value)),false);rows.push({phase:'legacy-draft-repaired',passed:true});
  // A failed PUT must retain text/photo and allow an explicit retry.
  rejectSave=true;await page.locator('#prof-summary').fill('Bản nháp không được xóa khi lỗi.');await page.locator('#prof-summary').dispatchEvent('input');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Ảnh hoặc hồ sơ vượt kích thước cho phép.',{exact:true}).waitFor();assert.equal(await page.locator('#prof-summary').inputValue(),'Bản nháp không được xóa khi lỗi.');rejectSave=false;await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Đã lưu vào tài khoản.',{exact:true}).waitFor();assert.equal(db.records.get('accounts/'+user.id).profile.summary,'Bản nháp không được xóa khi lỗi.');rows.push({phase:'413-keeps-draft-and-retry',passed:true});
  // Removing a photo while its upload is in flight must win over the late response.
  holdUpload=true;const arrived=new Promise(r=>uploadArrived=r);await page.locator('#cv-avatar-file').setInputFiles({name:'synthetic-second.jpg',mimeType:'image/jpeg',buffer:raw});await arrived;await page.getByRole('button',{name:'Xóa ảnh',exact:true}).click();const uploadDone=page.waitForResponse(r=>r.url().endsWith('/api/upload/avatar'));releaseUpload();holdUpload=false;await uploadDone;await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Đã lưu vào tài khoản.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.currentCvAvatarDataUrl),'');assert.equal(db.records.get('accounts/'+user.id).profile.avatarUrl,'');rows.push({phase:'late-upload-does-not-restore-removed-photo',passed:true});
  await store.saveProfile(user,{summary:'Another tab'},profileVersion(user.id,db.records.get('accounts/'+user.id).profile));await page.locator('#prof-summary').fill('Stale draft retained');await page.locator('#prof-summary').dispatchEvent('input');await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();await page.getByText('Xung đột hồ sơ: chưa ghi đè.',{exact:true}).waitFor();assert.equal(db.records.get('accounts/'+user.id).profile.summary,'Another tab');assert.equal(await page.locator('#prof-summary').inputValue(),'Stale draft retained');rows.push({phase:'if-match-conflict-keeps-draft',passed:true});
  assert.deepEqual(errors,[]);if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'retained-draft-conflict.png'),fullPage:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({syntheticIdentityAndDb:true,liveUserWrites:0,rows,errors,attempts},null,2));}console.log(JSON.stringify({rows,errors,attempts}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
