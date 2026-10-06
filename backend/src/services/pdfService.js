const {prepareCvPage}=require('./cvRenderRuntime');
const puppeteer = require('./browserRuntime');
const { getTemplateById, renderCVDataToTemplateHtml } = require('./templateService');

let browserInstance = null;
let browserLaunchingPromise = null;

/**
 * Khởi tạo hoặc tái sử dụng Chromium browser singleton
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserLaunchingPromise) {
    return browserLaunchingPromise;
  }

  const pendingLaunch = (async () => {
    try {
      const endpoint=process.env.CV_BROWSER_WS_ENDPOINT;
      if(endpoint){const uri=new URL(endpoint);if(uri.protocol!=='wss:'||uri.username||uri.password)throw new Error('Configure a secure browser worker endpoint');}
      if(!endpoint&&process.env.NODE_ENV==='production'&&typeof process.getuid==='function'&&process.getuid()===0)throw new Error('Production CV renderer must run as an unprivileged user');
      const browser = endpoint ? await puppeteer.connect({browserWSEndpoint:endpoint,protocolTimeout:30000}).catch(()=>{throw new Error('CV browser worker connection failed');}) : await puppeteer.launch({
        env: Object.assign(Object.fromEntries(['PATH','HOME','TMPDIR','LANG','LD_LIBRARY_PATH','SYSTEMROOT','WINDIR'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),{FONTCONFIG_FILE:require('path').resolve(__dirname,'../../assets/native-system-fonts/fonts.conf')}),
        executablePath: (() => {
          if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
          // Playwright-installed Chromium (Render, Railway, etc.)
          try { return require('playwright-core').chromium.executablePath(); } catch {}
          return '/usr/bin/chromium-browser';
        })(),
        headless: 'new',
        args: [
          ...((process.env.NODE_ENV!=='production'||process.env.CHROMIUM_NO_SANDBOX==='true')?['--no-sandbox','--disable-setuid-sandbox']:[]),
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=max'
        ]
      });

      browser.on('disconnected', () => {
        console.warn('Chromium browser disconnected, will recreate on next request.');
        browserInstance = null;
      });

      browserInstance = browser;
      return browser;
    } catch (err) {
      console.error('Không thể khởi chạy Chromium browser:', err.message);
      throw err;
    }
  })();

  browserLaunchingPromise=pendingLaunch;
  try{return await pendingLaunch;}finally{if(browserLaunchingPromise===pendingLaunch)browserLaunchingPromise=null;}
}

/**
 * Tạo bản PDF Vector A4 chuẩn ATS từ HTML hoặc template + dữ liệu
 * @param {Object} options
 * @param {string} [options.html] HTML hoàn chỉnh từ giao diện client
 * @param {string} [options.templateId] ID mẫu CV
 * @param {Object} [options.cvData] Dữ liệu CV đã điền
 * @param {Object} [options.userProfile] Profile người dùng
 * @param {string} [options.language] 'vi' hoặc 'en'
 * @returns {Promise<Buffer>} Buffer file PDF Vector A4
 */
async function generateCvPdfUnchecked({ html, templateId, cvData, userProfile, language = 'vi', documentFormat = 'design' }) {
  let finalHtml = html;

  if (!finalHtml) {
    const tmplId = templateId || 'default_v2';
    const tmpl = getTemplateById(tmplId, language);
    finalHtml = renderCVDataToTemplateHtml(tmpl, cvData || {}, userProfile || {}, language);
  }

  // Tiêm Base href nếu chưa có để Chromium phân giải chính xác ảnh /images/...
  if (!finalHtml.includes('<base ') && !finalHtml.includes('<BASE ')) {
    finalHtml = finalHtml.replace(/<head>/i, '<head><base href="http://connectcv-frontend/">');
  }

  // Tiêm CSS in ấn bắt buộc để đảm bảo A4 100% không viền, không rớt trang
  const injectionCss = documentFormat === 'ats' ? `<style>@page{size:A4;margin:15mm!important}html,body{margin:0!important;padding:0!important;width:180mm!important;height:auto!important}.cv-page-container{width:180mm!important;min-width:0!important;max-width:180mm!important;min-height:0!important;height:auto!important;padding:0!important;margin:0!important;overflow:visible!important}</style>` : `
    <style id="pdf-export-rules">
      @page {
        size: A4 portrait !important;
        margin: 0 !important;
      }
      html, body, body.in-iframe {
        width: 210mm !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      /* Source editor print breaks apply to its own page manager. Let Chromium
         paginate the filled content without forcing empty sheets. */
      #cvo-main, #cvo-body, .cvo-page, .cvo-subpage {
        break-after: auto !important;
        page-break-after: auto !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      .no-print, .cv-toolbar, .cv-photo-editor {
        display: none !important;
      }
      .cv-page-container {
        margin: 0 !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        height: auto !important;
        min-height: 296mm !important;
        max-height: none !important;
        overflow: visible !important;
        break-after: auto !important;
        break-inside: auto !important;
      }
    </style>
  `;

  if (finalHtml.includes('</head>')) {
    finalHtml = finalHtml.replace('</head>', injectionCss + '</head>');
  } else {
    finalHtml = injectionCss + finalHtml;
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await prepareCvPage(page,finalHtml);

    // Template backgrounds/padding must not create a trailing empty sheet.
    // Count pages from visible candidate text and photos, then trim only the
    // unused tail of the design. Long CVs keep every page containing content.
    const contentPages = await page.evaluate(() => {
      const root = document.querySelector('.cv-page-container');
      if (!root) return null;
      const top = root.getBoundingClientRect().top;
      let bottom = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, el = node.parentElement;
        if (!node.textContent.trim() || el.closest('.no-print,.cv-toolbar,.cv-photo-editor,.view-cv__watermark,#cv-watermark') || ['STYLE','SCRIPT'].includes(el.tagName) || getComputedStyle(el).display === 'none') continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of range.getClientRects()) if (rect.width && rect.height) bottom = Math.max(bottom, rect.bottom - top);
      }
      root.querySelectorAll('img').forEach(img => { if (getComputedStyle(img).display !== 'none') bottom = Math.max(bottom, (img.closest('.cv-photo-frame') || img).getBoundingClientRect().bottom - top); });
      return Math.max(1, Math.ceil((bottom + .5) / (297 * 96 / 25.4)));
    });
    // For multi-page documents Chromium moves unbreakable entries across
    // page boundaries. Their printed height can exceed the DOM measurement;
    // let it paginate naturally so the final achievements cannot be clipped.
    if (documentFormat !== 'ats' && contentPages === 1) {
      const height = contentPages * 297 * 96 / 25.4 - 1;
      await page.addStyleTag({ content: `.cv-page-container.cv-page-container.cv-page-container {height:${height}px!important;min-height:${height}px!important;max-height:${height}px!important;overflow:hidden!important}` });
    }
    const pdfBuffer = await page.pdf({
      format: 'A4',
      // Native fixed-height design shells can paginate an empty trailing sheet.
      // Restrict only documents whose candidate content fits on the first page.
      ...(documentFormat !== 'ats' && contentPages === 1 ? {pageRanges: '1'} : {}),
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      preferCSSPageSize: true
    });

    const buffer = Buffer.from(pdfBuffer);
    if (!finalHtml.includes('data-native-topcv=')) return buffer;
    const photoSizes = await page.evaluate(() => [...document.images].map(img => ({width: img.naturalWidth, height: img.naturalHeight})).filter(size => size.width && size.height));
    return await require('./pdfPageCleanup').removeEmptyBoundaryPages(buffer, photoSizes);
  } finally {
    await page.close().catch(() => {});
  }
}

async function generateCvPdf(options){return require('./renderCapacity').withRenderSlot(()=>generateCvPdfUnchecked(options));}
module.exports = {
  getBrowser,
  generateCvPdf
};
