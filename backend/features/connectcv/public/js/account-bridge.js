'use strict';
(() => {
 const allowed=new Set(window.connectCVParentOrigins||[]),pending=new Map();
 const parentOrigin=(()=>{try{return new URL(document.referrer).origin;}catch{return '';}})();
 window.addEventListener('message',e=>{
  if(e.source!==parent||e.origin!==parentOrigin||!allowed.has(e.origin)||e.data?.type!=='connectcv:token-response')return;
  const action=pending.get(e.data.requestId);if(!action)return;pending.delete(e.data.requestId);action(e.data.token||null);
 });
 window.connectCVGetAccessToken=()=>new Promise(resolve=>{
  if(parent===window||!allowed.has(parentOrigin)){resolve(null);return;}
  const requestId=crypto.randomUUID();pending.set(requestId,resolve);
  parent.postMessage({type:'connectcv:token-request',requestId},parentOrigin);
  setTimeout(()=>{if(pending.delete(requestId))resolve(null);},10000);
 });
 window.connectCVRefreshAccount=async()=>{
  const response=await fetch('/api/account/me');if(!response.ok)throw new Error('Không thể tải tài khoản.');
  const result=await response.json();
  const balance=document.getElementById('creditBalance');if(balance)balance.textContent=result.credits;
  if(typeof credits!=='undefined')credits=result.credits;
  return result;
 };
 window.addEventListener('load',async()=>{
  const module=new URLSearchParams(location.search).get('module');
  const tabs={cv:'tab-cv-module',interview:'tab-interview-module',social:'tab-debrief',chatbot:'tab-chatbot'};
  if(tabs[module]&&typeof switchTab==='function')switchTab(tabs[module]);
  try{
   const result=await window.connectCVRefreshAccount();
   const profile={...result.profile,birth:result.profile.birth||result.profile.dateOfBirth||''};
   const textarea=document.getElementById('cv-profile');
   if(textarea&&Object.keys(result.profile).length){textarea.value=JSON.stringify(profile,null,2);syncJSONToProfileForm();}
   const toolbar=document.createElement('div');toolbar.className='p-3 flex gap-3 items-center';
   const save=document.createElement('button');save.textContent='Lưu hồ sơ vào tài khoản';save.className='px-4 py-2 rounded-xl bg-blue-600 text-white';
   const status=document.createElement('span');status.setAttribute('role','status');
   save.onclick=async()=>{save.disabled=true;try{
    syncProfileFormToJSON();const source=JSON.parse(textarea.value);
    const response=await fetch('/api/account/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(source)});
    status.textContent=response.ok?'Đã lưu hồ sơ.':'Hồ sơ chưa được lưu. Kiểm tra kích thước ảnh và dữ liệu.';
   }catch{status.textContent='Không thể lưu hồ sơ.';}finally{save.disabled=false;}};
   if(textarea){toolbar.append(save,status);textarea.parentElement.append(toolbar);}
  }catch{const balance=document.getElementById('creditBalance');if(balance)balance.textContent='—';}
 });
})();
