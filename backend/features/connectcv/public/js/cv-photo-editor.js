(async () => {
  if (window.__cvPhotoEditor) return;
  window.__cvPhotoEditor = true;
  // Previously saved CV HTML includes only this editor script. Load the trusted
  // companion for those documents as well, without regenerating the candidate CV.
  if (typeof window.connectCVPreparePhotos !== 'function') {
    await new Promise((resolve, reject) => {
      const script=document.createElement('script'); script.src='/ai/js/cv-photo-layout.js';
      script.onload=resolve; script.onerror=()=>reject(new Error('Photo layout unavailable'));
      document.head.appendChild(script);
    });
  }
  await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  window.connectCVPreparePhotos();
  let active = null, drag = null;
  const panel = document.createElement('div');
  panel.className = 'cv-photo-editor no-print';
  panel.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;background:white;color:#263445;border:1px solid #cbd5e1;border-radius:12px;padding:14px;box-shadow:0 4px 24px #0003;width:310px;font:13px Arial;display:none';
  panel.innerHTML = '<b>Chỉnh ảnh / Adjust photo</b><div style="margin:8px 0">Kéo ảnh để di chuyển · Lăn chuột để zoom</div><label>Cách đặt ảnh <select data-control="fit"><option value="contain">Toàn ảnh</option><option value="cover">Lấp đầy khung</option></select></label><label>Zoom <input type="range" min="100" max="300" value="100" step="1" data-control="zoom" style="width:220px"></label><div style="display:flex;gap:6px;margin-top:10px"><button data-action="left">←</button><button data-action="up">↑</button><button data-action="down">↓</button><button data-action="right">→</button><button data-action="reset">Đặt lại</button><button data-action="done">Xong</button></div>';
  document.body.appendChild(panel);
  const zoom = panel.querySelector('[data-control="zoom"]');
  const state = img => ({zoom:Number(img.dataset.photoZoom || 1),x:Number(img.dataset.photoX || 0),y:Number(img.dataset.photoY || 0)});
  function update(next) {
    if (!active) return;
    next.zoom = Math.max(1, Math.min(3, next.zoom));
    // Keep the image covering the frame, including at its maximum pan position.
    const limit = (next.zoom - 1) * 50;
    next.x = Math.max(-limit, Math.min(limit, next.x));
    next.y = Math.max(-limit, Math.min(limit, next.y));
    active.dataset.photoZoom = next.zoom; active.dataset.photoX = next.x; active.dataset.photoY = next.y;
    active.style.transform = `translate(${next.x}%, ${next.y}%) scale(${next.zoom})`;
    zoom.value = Math.round(next.zoom * 100);
    window.parent.postMessage({type:'connectcv-photo-change'}, '*');
  }
  function select(img) {
    active = img; panel.style.display='block'; zoom.value=state(img).zoom*100; panel.querySelector('[data-control=fit]').value=img.dataset.photoFit || 'contain';
  }
  document.querySelectorAll('.cv-page-container img').forEach(img => {
    const frame = img.closest('.cv-photo-frame');
    if (!frame) return;
    frame.style.cursor = 'move';
    img.draggable=false; img.title='Nhấp để chỉnh ảnh / Click to adjust photo';
    const saved=state(img);
    img.style.transform=`translate(${saved.x}%, ${saved.y}%) scale(${saved.zoom})`;
    frame.addEventListener('pointerdown', e => {
      if (e.button!==0) return;
      select(img);const s=state(img);drag={x:e.clientX,y:e.clientY,s,frame};frame.setPointerCapture(e.pointerId);e.preventDefault();
    });
    frame.addEventListener('pointermove', e => {
      if (!drag || drag.frame!==frame) return;
      const r=frame.getBoundingClientRect();update({...drag.s,x:drag.s.x+(e.clientX-drag.x)/r.width*100,y:drag.s.y+(e.clientY-drag.y)/r.height*100});
    });
    frame.addEventListener('pointerup',()=>{drag=null;});
    frame.addEventListener('pointercancel',()=>{drag=null;});
    frame.addEventListener('wheel',e=>{if(active!==img)return;e.preventDefault();const s=state(img);update({...s,zoom:s.zoom+(e.deltaY<0?.05:-.05)});},{passive:false});
  });
  panel.querySelector('[data-control=fit]').addEventListener('change', e => {
    if (!active) return; active.dataset.photoFit=e.target.value; active.style.objectFit=e.target.value; update({zoom:1,x:0,y:0});
  });
  zoom.addEventListener('input',()=>{if(active)update({...state(active),zoom:Number(zoom.value)/100});});
  panel.addEventListener('click',e=>{
    const action=e.target.dataset.action;if(!action || !active)return;
    const s=state(active);
    if(action==='done'){panel.style.display='none';active=null;return;}
    if(action==='reset')update({zoom:1,x:0,y:0});
    if(action==='left')update({...s,x:s.x-3});if(action==='right')update({...s,x:s.x+3});
    if(action==='up')update({...s,y:s.y-3});if(action==='down')update({...s,y:s.y+3});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.style.display='none';active=null;drag=null;}});
})();
