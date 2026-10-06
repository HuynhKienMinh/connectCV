(() => {
  if (window.__cvPhotoEditor) return;
  window.__cvPhotoEditor = true;
  let active = null, drag = null;
  const panel = document.createElement('div');
  panel.className = 'cv-photo-editor no-print';
  panel.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;background:white;color:#263445;border:1px solid #cbd5e1;border-radius:12px;padding:14px;box-shadow:0 4px 24px #0003;width:310px;font:13px Arial;display:none';
  panel.innerHTML = '<b>Chỉnh ảnh / Adjust photo</b><div style="margin:8px 0">Kéo ảnh để di chuyển · Lăn chuột để zoom</div><label>Zoom <input type="range" min="100" max="300" value="100" step="1" data-control="zoom" style="width:220px"></label><div style="display:flex;gap:6px;margin-top:10px"><button data-action="left">←</button><button data-action="up">↑</button><button data-action="down">↓</button><button data-action="right">→</button><button data-action="reset">Đặt lại</button><button data-action="done">Xong</button></div>';
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
    active = img; panel.style.display='block'; zoom.value=state(img).zoom*100;
  }
  document.querySelectorAll('.cv-page-container img').forEach(img => {
    let frame = img.closest('.cv-photo-frame');
    if (!frame) {
      const rect=img.getBoundingClientRect(), css=getComputedStyle(img);
      if (!rect.width || !rect.height) return;
      frame=document.createElement('div');frame.className='cv-photo-frame';
      frame.style.cssText=`position:relative;overflow:hidden;width:${rect.width}px;height:${rect.height}px;flex-shrink:0;border-radius:${css.borderRadius};margin:${css.margin};border:${css.border};box-sizing:border-box;touch-action:none;cursor:move`;
      img.before(frame);frame.appendChild(img);
      img.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;min-width:0;min-height:0;object-fit:cover;border:0;margin:0;display:block;transform-origin:center;user-select:none';
    }
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
