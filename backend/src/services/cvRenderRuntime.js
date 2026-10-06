 'use strict';
const fs=require('fs'),path=require('path');
const assetRoot=path.resolve(__dirname,'../../assets/topcv-source/assets');
const handlers=new WeakMap();
const offlineAssets=JSON.parse(fs.readFileSync(path.resolve(assetRoot,'../offline-assets.json'),'utf8'));
const mime={woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
// No user-controlled network or JavaScript is permitted in the export browser.
// Native fonts/images are read from the immutable asset directory in-process.
async function prepareCvPage(page,html,{scale=2}={}){
 if(typeof html!=='string'||Buffer.byteLength(html)>12*1024*1024)throw new Error('Invalid CV document size');
 await page.setJavaScriptEnabled(false);
 await page.setRequestInterception(true);
 let resources=0;
 if(handlers.has(page))page.off('request',handlers.get(page));
 const handler=async request=>{
  if(request.isInterceptResolutionHandled())return;
  try{
   if(++resources>500)return await request.abort();
   const url=new URL(request.url());
   if(url.protocol==='data:'&&/^data:(image\/(png|jpeg|jpg|webp|gif)|font\/(woff2?|ttf|otf));base64,/i.test(request.url())&&request.url().length<8*1024*1024)return await request.continue();
   if(['http:','https:'].includes(url.protocol)&&request.method()==='GET'){
    const localAsset=offlineAssets[url.href];
    if(localAsset&&/^[a-z0-9]+\.(woff2?|ttf|otf|png|jpe?g|webp|gif|svg)$/.test(localAsset)){const file=path.join(assetRoot,localAsset);return await request.respond({status:200,contentType:mime[path.extname(file).slice(1)],headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(file)});}
    const match=/^\/api\/cv\/source-assets\/([a-zA-Z0-9_-]+\.(woff2?|ttf|otf|png|jpe?g|webp|gif|svg))$/.exec(url.pathname);
    if(match){const file=path.join(assetRoot,match[1]);if(fs.existsSync(file))return await request.respond({status:200,contentType:mime[match[2]],headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(file)});}
   }
   await request.abort();
  }catch{if(!request.isInterceptResolutionHandled())await request.abort().catch(()=>{});}
 };handlers.set(page,handler);page.on('request',handler);
 let source=html.replace(/<base\b[^>]*>/gi,'');
 source=source.replace(/<head[^>]*>/i,'$&<base href="https://cv-resources.invalid/">');
 await page.setViewport({width:794,height:1123,deviceScaleFactor:scale});
 await page.emulateMediaType(html.includes('data-native-topcv=')?'screen':'print');
 await page.setContent(source,{waitUntil:'load',timeout:20000});
 await page.evaluate(async()=>{
  // Automation evaluation is trusted code; document scripts remain disabled.
  document.querySelectorAll('script,iframe,frame,object,embed,meta[http-equiv],link[rel="prefetch"],link[rel="preload"]').forEach(e=>e.remove());
  for(const e of document.querySelectorAll('*'))for(const a of [...e.attributes])if(/^on/i.test(a.name)||a.name==='srcdoc'||(a.name==='href'&&!a.value.startsWith('#')))e.removeAttribute(a.name);
  for(const item of [...document.querySelectorAll('.cv-page-container section')].reverse())if(!item.textContent.trim()&&!item.querySelector('img,svg,input,textarea'))item.remove();
  await document.fonts.ready;
  if(document.querySelector('[data-native-topcv]')){
   const failures=[...document.fonts].filter(f=>f.status==='error').map(f=>f.family);
   if(failures.length)throw new Error('Original CV fonts failed to load: '+[...new Set(failures)].join(', '));
  }
  await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  // Reapply saved candidate crop with trusted code; never execute the photo editor
  // script from submitted HTML. Existing edited frames already retain their styles.
  for(const img of document.querySelectorAll('.cv-page-container img[data-photo-zoom]')){
   if(!img.src.startsWith('data:image/'))continue;
   const zoom=Math.max(1,Math.min(3,Number(img.dataset.photoZoom)||1)),limit=(zoom-1)*50;
   const x=Math.max(-limit,Math.min(limit,Number(img.dataset.photoX)||0)),y=Math.max(-limit,Math.min(limit,Number(img.dataset.photoY)||0));
   let frame=img.closest('.cv-photo-frame');
   if(!frame&&zoom>1){const rect=img.getBoundingClientRect(),css=getComputedStyle(img);if(!rect.width||!rect.height)continue;
    frame=document.createElement('div');frame.className='cv-photo-frame';frame.style.cssText=`position:relative;overflow:hidden;width:${rect.width}px;height:${rect.height}px;flex-shrink:0;border-radius:${css.borderRadius};margin:${css.margin};border:${css.border};box-sizing:border-box`;
    img.before(frame);frame.appendChild(img);img.style.cssText='position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;min-width:0;min-height:0;object-fit:cover;border:0;margin:0;display:block;transform-origin:center';
   }
   if(frame)img.style.transform=`translate(${x}%, ${y}%) scale(${zoom})`;
  }
  const root=document.querySelector('.cv-page-container');if(!root)throw new Error('Missing canonical CV document');
  const family=getComputedStyle(root.querySelector('[data-original-layout],.cv-family,.tiktop-layout,.graceful-layout')||root).fontFamily.split(',')[0].replace(/["']/g,'').trim();
  if(['Roboto','Tinos','Roboto Mono'].includes(family)&&!document.fonts.check('12px "'+family+'"'))throw new Error('CV font failed to load: '+family);
 });
}
module.exports={prepareCvPage};
