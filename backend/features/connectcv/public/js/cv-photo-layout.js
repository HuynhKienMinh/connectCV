// Shared by the editor and the trusted PDF renderer. No network or document scripts.
(function (root) {
  function preparePhotos() {
    for (const img of document.querySelectorAll('.cv-page-container img[data-photo-zoom]')) {
      const css = getComputedStyle(img);
      let frame = img.closest('.cv-photo-frame');
      if (!frame) {
        // Layout dimensions, not the zoomed screen rectangle, define the export box.
        const width = img.offsetWidth, height = img.offsetHeight;
        if (!width || !height) continue;
        frame = document.createElement('div'); frame.className = 'cv-photo-frame';
        frame.style.cssText = `position:relative;overflow:hidden;display:block;width:${width}px;height:${height}px;flex-shrink:0;border-radius:${css.borderRadius};margin:${img.style.margin || css.margin};border:${css.border};box-sizing:border-box;touch-action:none`;
        // Preserve inline-image centering in native text-align containers.
        if (getComputedStyle(img.parentElement).textAlign === 'center') frame.style.marginInline = 'auto';
        img.before(frame); frame.appendChild(img);
      }
      const fit = img.dataset.photoFit === 'cover' ? 'cover' : 'contain';
      const zoom = Math.max(1, Math.min(3, Number(img.dataset.photoZoom) || 1));
      const limit = (zoom - 1) * 50;
      const x = Math.max(-limit, Math.min(limit, Number(img.dataset.photoX) || 0));
      const y = Math.max(-limit, Math.min(limit, Number(img.dataset.photoY) || 0));
      Object.assign(img.dataset, {photoZoom:zoom, photoX:x, photoY:y, photoFit:fit});
      img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;min-width:0;min-height:0;object-fit:${fit};object-position:center;border:0;margin:0;display:block;transform-origin:center;user-select:none;transform:translate(${x}%, ${y}%) scale(${zoom})`;
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = preparePhotos;
  else root.connectCVPreparePhotos = preparePhotos;
})(typeof window === 'object' ? window : this);
