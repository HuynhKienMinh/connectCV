(function () {
  const observers = new WeakMap();
  function mount(iframe) {
    const doc = iframe.contentDocument, win = iframe.contentWindow;
    if (!doc?.querySelector('.cv-page-container')) return;
    observers.get(iframe)?.disconnect();
    doc.querySelectorAll('[data-cv-preview]').forEach(el => el.remove());
    const style = doc.createElement('style'); style.dataset.cvPreview = 'true';
    // Screen-only presentation: exported A4 dimensions and edited text stay canonical.
    style.textContent = '@media screen{html,body{width:100%!important;min-width:0!important;background:#e2e8f0!important}body{overflow-x:hidden!important}.cv-page-container{zoom:var(--cv-preview-scale,1);margin:16px auto!important}#cvo-document{margin-left:auto!important;margin-right:auto!important;box-shadow:0 2px 12px #0002!important}}';
    doc.head.appendChild(style);
    const fit = () => {
      const page = doc.querySelector('.cv-page-container');
      if (!page || !iframe.isConnected) return;
      const width = page.offsetWidth || 794;
      const scale = Math.min(1, Math.max(0.1, (doc.documentElement.clientWidth - 32) / width));
      doc.documentElement.style.setProperty('--cv-preview-scale', String(scale));
    };
    fit();
    const observer = new ResizeObserver(fit); observer.observe(iframe); observers.set(iframe, observer);
    doc.fonts?.ready.then(fit);
    win.addEventListener('resize', fit);
  }
  function clean(doc) {
    doc.querySelectorAll('[data-cv-preview]').forEach(el => el.remove());
    (doc.documentElement || doc).style.removeProperty('--cv-preview-scale');
  }
  window.connectCVPreview = { mount, clean };
})();
