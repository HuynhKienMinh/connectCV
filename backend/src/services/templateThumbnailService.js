const fs = require('fs');
const path = require('path');
const os = require('os');
const { getTemplatePreviewHtml, getTemplateById, PREVIEW_VERSION } = require('./templateService');
const { getBrowser } = require('./pdfService');
const cacheDir = path.join(os.tmpdir(), 'connectcv-template-previews', PREVIEW_VERSION);
const {prepareCvPage}=require('./cvRenderRuntime');
const pending = new Map();
let workers = 0;
const queue = [];
async function withSlot(fn) {
  if (workers >= 2) await new Promise(resolve => queue.push(resolve));
  workers++;
  try { return await fn(); } finally { workers--; queue.shift()?.(); }
}
async function getTemplateThumbnail(id, language = 'vi') {
  const template = getTemplateById(id, language);
  const immutableFiles=[path.resolve(__dirname,'../../../frontend/public/cv-design-previews',PREVIEW_VERSION,language,template.slug+'.png'),path.resolve(__dirname,'../../public/cv-design-previews',PREVIEW_VERSION,language,template.slug+'.png')];
  for(const candidate of immutableFiles)if(fs.existsSync(candidate))return fs.promises.readFile(candidate);
  const file = path.join(cacheDir, `${template.slug}-${language}.png`);
  if (fs.existsSync(file)) return fs.promises.readFile(file);
  if (pending.has(file)) return pending.get(file);
  const task = withSlot(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await prepareCvPage(page,getTemplatePreviewHtml(id, language),{scale:1});
      const element = await page.$('.cv-page-container');
      const buffer = Buffer.from(await element.screenshot({ type: 'png' }));
      await fs.promises.mkdir(cacheDir, { recursive: true });
      await fs.promises.writeFile(file, buffer);
      return buffer;
    } finally { await page.close().catch(() => {}); }
  });
  pending.set(file, task);
  try { return await task; } finally { pending.delete(file); }
}
module.exports = { getTemplateThumbnail };
