'use strict';
(() => {
 function init(){
  const dialog=document.createElement('dialog');dialog.id='community-report-dialog';
  dialog.setAttribute('aria-labelledby','community-report-title');dialog.setAttribute('aria-describedby','community-report-note');
  dialog.innerHTML=`<form><h2 id="community-report-title">Báo cáo bài chia sẻ</h2>
   <p id="community-report-note">Lý do và tài khoản gửi được lưu cùng báo cáo để người có quyền kiểm duyệt xem xét, không hiển thị ở bảng tin. Báo cáo không tự ẩn bài và không thay đổi Credits.</p>
   <label for="community-report-reason">Lý do báo cáo</label>
   <select id="community-report-reason" required><option value="">Chọn lý do</option>
    <option value="personal-information">Thông tin cá nhân</option><option value="harassment">Quấy rối hoặc xúc phạm</option>
    <option value="spam">Spam hoặc quảng cáo</option><option value="misleading">Nội dung gây hiểu nhầm</option><option value="other">Lý do khác</option></select>
   <p id="community-report-status" role="status" aria-live="polite"></p>
   <div class="community-report-actions"><button type="button" data-report-close>Đóng</button><button type="submit">Gửi báo cáo</button></div></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form'),reason=dialog.querySelector('select'),send=dialog.querySelector('[type=submit]'),close=dialog.querySelector('[data-report-close]'),status=dialog.querySelector('[role=status]');
  let postId=null,trigger=null,busy=false,generation=0,controller=null;
  function reset(){generation++;controller?.abort();controller=null;busy=false;postId=null;reason.value='';reason.disabled=false;send.disabled=false;close.disabled=false;status.textContent='';form.removeAttribute('aria-busy');}
  document.addEventListener('click',event=>{
   const button=event.target.closest('[data-community-report]');if(!button||dialog.open)return;
   const id=button.dataset.communityReport;if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return;
   reset();postId=id;trigger=button;dialog.showModal();reason.focus();
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{reset();if(trigger?.isConnected)trigger.focus();trigger=null;});
  reason.addEventListener('change',()=>{if(!busy)status.textContent='';});
  window.addEventListener('connectcv:logout',()=>{reset();if(dialog.open)dialog.close();});
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||!postId||!form.reportValidity())return;
   const version=++generation,id=postId;busy=true;reason.disabled=true;send.disabled=true;close.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Đang gửi báo cáo…';
   const activeController=new AbortController();controller=activeController;let timer;
   try{
    const request=async()=>{
     const response=await window.fetch('/api/interview/community-questions/'+encodeURIComponent(id)+'/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason.value}),signal:activeController.signal});
     const result=await response.json();return {response,result};
    };
    const {response,result}=await Promise.race([request(),new Promise((_,reject)=>{timer=setTimeout(()=>{activeController.abort();reject(new Error('REPORT_TIMEOUT'));},10000);})]);
    if(version!==generation)return;
    if(!response.ok||!result.success){
     const messages={401:'Vui lòng đăng nhập rồi thử lại.',403:'Vui lòng xác minh email và đăng nhập lại trước khi báo cáo.',404:'Chức năng báo cáo chưa sẵn sàng hoặc bài không còn hiển thị.',429:'Bạn gửi quá nhanh. Vui lòng chờ vài phút rồi thử lại.'};
     status.textContent=messages[response.status]||'Chưa gửi được báo cáo. Lựa chọn vẫn được giữ; bạn có thể thử lại.';reason.disabled=false;send.disabled=false;return;
    }
    if(result.data?.status!=='received'||!/^[a-f0-9]{64}$/.test(result.data?.reportId||''))throw new Error('INVALID_REPORT_RECEIPT');
    status.textContent=result.data.alreadyReported?'Bạn đã gửi báo cáo cho bài này. Báo cáo trước vẫn được giữ.':'Đã nhận báo cáo để xem xét. Bài chưa tự động bị ẩn.';
   }catch{
    if(version===generation){status.textContent='Chưa xác nhận được báo cáo đã gửi. Lựa chọn vẫn được giữ. Bạn có thể thử lại; báo cáo trùng không tạo thêm bản ghi.';reason.disabled=false;send.disabled=false;}
   }finally{
    clearTimeout(timer);if(version===generation){busy=false;controller=null;close.disabled=false;form.removeAttribute('aria-busy');}
   }
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
