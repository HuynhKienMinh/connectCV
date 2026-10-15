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
  const conflict=document.createElement('div');conflict.className='hidden p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 space-y-2';conflict.setAttribute('role','alert');
  const explanation=document.createElement('p');explanation.textContent='Hồ sơ trên tài khoản đã thay đổi. Bản nháp trong tab này vẫn được giữ; tự động lưu đã dừng. Tải bản nháp trước khi nạp hồ sơ mới.';
  const download=document.createElement('button');download.type='button';download.textContent='Tải bản nháp dự phòng';download.className='px-3 py-2 rounded-lg border';
  const reload=document.createElement('button');reload.type='button';reload.textContent='Nạp hồ sơ mới từ tài khoản';reload.className='px-3 py-2 rounded-lg border';
  conflict.append(explanation,download,reload);toolbar.after(conflict);
  let edited=false,ready=false,version=null;
  const saver=window.createProfileAutosave({
   write:async source=>{
    const prepared=await window.connectCVProfileImage.prepare(source);
    const response=await fetch('/api/account/profile',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':version||''},body:JSON.stringify(prepared)});
    if(!response.ok){const error=new Error(response.status===409||response.status===428?'Hồ sơ đã thay đổi; bản nháp đang được giữ.':response.status===400?'Dữ liệu hồ sơ không hợp lệ.':response.status===413?'Ảnh hoặc hồ sơ vượt kích thước cho phép.':'Chưa lưu được hồ sơ.');error.conflict=response.status===409||response.status===428;error.retryable=response.status===429||response.status>=500;error.retryAfter=Number(response.headers.get('Retry-After')||5)*1000;throw error;}
    const result=await response.json();version=result.profileVersion;
    // A legacy oversized draft may have been compacted. Preserve all newer text edits.
    try{const current=JSON.parse(textarea.value);if((current.avatarUrl||current.avatarDataUrl||'')===(source.avatarUrl||source.avatarDataUrl||'')){
     textarea.value=JSON.stringify(window.connectCVProfileImage.canonical(current,prepared.avatarUrl||''),null,2);
     window.currentCvAvatarDataUrl=prepared.avatarUrl||'';
     const preview=document.getElementById('cv-avatar-preview-img');if(preview&&prepared.avatarUrl)preview.src=prepared.avatarUrl;
    }}catch{}
   },
   status:(state,error)=>{conflict.classList.toggle('hidden',state!=='conflict');status.textContent=state==='conflict'?'Xung đột hồ sơ: chưa ghi đè.':{pending:'Có thay đổi chưa lưu…',saving:'Đang lưu vào tài khoản…',saved:'Đã lưu vào tài khoản.'}[state]||(error?.message||'Chưa lưu được hồ sơ.');const header=document.getElementById('profile-save-header-status');if(header)header.textContent=status.textContent;}
  });
  download.onclick=()=>{
   const url=URL.createObjectURL(new Blob([textarea.value],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='connectcv-profile-draft.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  reload.onclick=async()=>{
   if(!confirm('Nạp hồ sơ mới sẽ thay nội dung đang nhập trong tab này. Hãy tải bản nháp dự phòng trước nếu muốn giữ. Tiếp tục?'))return;
   const before=textarea.value;reload.disabled=true;
   try{const result=await window.connectCVRefreshAccount();
    if(textarea.value!==before){status.textContent='Bạn vừa sửa bản nháp; chưa áp dụng hồ sơ mới. Hãy thử nạp lại khi sẵn sàng.';return;}
    if(!result.profileVersion)throw Error('Không nhận được phiên bản hồ sơ. Hãy tải lại trang.');
    version=result.profileVersion;textarea.value=JSON.stringify(result.profile||{},null,2);syncJSONToProfileForm();saver.replace(result.profile||{});edited=false;
   }catch(error){status.textContent=error.message||'Chưa nạp được hồ sơ mới; bản nháp vẫn giữ.';}finally{reload.disabled=false;}
  };
  function changed(){edited=true;if(!ready)return;try{saver.change(JSON.parse(textarea.value));}catch{status.textContent='JSON chưa hợp lệ; hồ sơ chưa được lưu.';}}
  window.addEventListener('connectcv:profile-change',changed);
  textarea.addEventListener('input',changed);
  window.addEventListener('connectcv:logout',()=>saver.dispose());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saver.flush();});
  save.onclick=async()=>{if(!ready)return;syncProfileFormToJSON();save.disabled=true;try{await saver.flush();}finally{save.disabled=false;}};
  try{
   const result=await window.connectCVRefreshAccount();
   if(!edited&&Object.keys(result.profile).length){const profile={...result.profile,birth:result.profile.birth||result.profile.dateOfBirth||''};textarea.value=JSON.stringify(profile,null,2);syncJSONToProfileForm();}
   if(!result.profileVersion)throw Error('Missing profile version');
   version=result.profileVersion;saver.seed(result.profile);ready=true;
   if(edited)changed();else status.textContent=Object.keys(result.profile).length?'Đã tải hồ sơ tài khoản.':'Hồ sơ sẽ tự động lưu khi nhập.';
  }catch{status.textContent='Không thể tải tài khoản. Vui lòng kiểm tra kết nối rồi mở lại công cụ.';save.disabled=true;}
 });
})();
