'use strict';
(() => {
 // Unsaved drafts from a shared browser must not cross account boundaries.
 for(const key of Object.keys(sessionStorage))if(key.startsWith('connectcv_'))sessionStorage.removeItem(key);
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
  if(window.connectCVServerPdf===false)for(const button of document.querySelectorAll('button[onclick]')){
   if((button.getAttribute('onclick')||'').includes('downloadCVDoc(')){
    button.textContent='Word (nội dung)';button.title='Tải Word dạng văn bản chỉnh sửa được. Dùng PDF để giữ thiết kế mẫu.';
   }
   if((button.getAttribute('onclick')||'').includes('downloadCVPDF(')){
    button.textContent='Lưu PDF';button.title='Mở hộp thoại in để lưu PDF theo thiết kế mẫu.';
   }
  }
  const module=new URLSearchParams(location.search).get('module');
  const tabs={cv:'tab-cv-module',interview:'tab-interview-module',social:'tab-debrief',chatbot:'tab-chatbot'};
  if(tabs[module]&&typeof switchTab==='function')switchTab(tabs[module]);
  const textarea=document.getElementById('cv-profile');
  if(!textarea)return;
  const toolbar=document.createElement('div');toolbar.className='p-3 flex gap-3 items-center';
  const save=document.createElement('button');save.type='button';save.textContent='Lưu hồ sơ';save.className='px-4 py-2 rounded-xl bg-blue-600 text-white';
  const status=document.createElement('span');status.setAttribute('role','status');status.id='profile-account-save-status';
  toolbar.append(save,status);
  const wrapper=document.getElementById('cv-profile-raw-wrapper');
  (wrapper?.parentElement||textarea.parentElement).insertBefore(toolbar,wrapper||textarea);
  let edited=false,ready=false;
  const saver=window.createProfileAutosave({
   write:async source=>{
    const response=await fetch('/api/account/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(source)});
    if(!response.ok){const error=new Error(response.status===400?'Dữ liệu hồ sơ không hợp lệ.':response.status===413?'Ảnh hoặc hồ sơ vượt kích thước cho phép.':'Chưa lưu được hồ sơ.');error.retryable=response.status===429||response.status>=500;error.retryAfter=Number(response.headers.get('Retry-After')||5)*1000;throw error;}
   },
   status:(state,error)=>{status.textContent={pending:'Có thay đổi chưa lưu…',saving:'Đang lưu vào tài khoản…',saved:'Đã lưu vào tài khoản.'}[state]||(error?.message||'Chưa lưu được hồ sơ.');const header=document.getElementById('profile-save-header-status');if(header)header.textContent=status.textContent;}
  });
  function changed(){edited=true;if(!ready)return;try{saver.change(JSON.parse(textarea.value));}catch{status.textContent='JSON chưa hợp lệ; hồ sơ chưa được lưu.';}}
  window.addEventListener('connectcv:profile-change',changed);
  textarea.addEventListener('input',changed);
  window.addEventListener('connectcv:logout',()=>saver.dispose());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saver.flush();});
  save.onclick=async()=>{if(!ready)return;syncProfileFormToJSON();save.disabled=true;try{await saver.flush();}finally{save.disabled=false;}};
  try{
   const result=await window.connectCVRefreshAccount();
   if(!edited&&Object.keys(result.profile).length){const profile={...result.profile,birth:result.profile.birth||result.profile.dateOfBirth||''};textarea.value=JSON.stringify(profile,null,2);syncJSONToProfileForm();}
   saver.seed(result.profile);ready=true;
   if(edited)changed();else status.textContent=Object.keys(result.profile).length?'Đã tải hồ sơ tài khoản.':'Hồ sơ sẽ tự động lưu khi nhập.';
  }catch{status.textContent='Không thể tải tài khoản. Vui lòng kiểm tra kết nối rồi mở lại công cụ.';save.disabled=true;}
 });
})();
