'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const registry=require('../../assets/cv-designs/design-registry.json');
const fontsDir=path.resolve(__dirname,'../../assets/cv-designs/fonts');
const cssCache=new Map();
const FONT_FILES={Roboto:[['Regular',400,'normal'],['SemiBold',600,'normal'],['Bold',700,'normal']],Tinos:[['Regular',400,'normal'],['Bold',700,'normal'],['Italic',400,'italic'],['BoldItalic',700,'italic']],'Roboto Mono':[['Regular',400,'normal'],['SemiBold',600,'normal'],['Bold',700,'normal']]};
function getDesign(slug,language='vi'){
 const entry=registry.templates[slug];if(!entry)throw new Error('Missing canonical CV design: '+slug);
 const variant=entry.variants[language==='en'?'en':'vi'];
 return {...variant,style:{...variant.style},slug,referenceStatus:entry.referenceStatus};
}
function fontCss(family){
 if(cssCache.has(family))return cssCache.get(family);
 if(!FONT_FILES[family])throw new Error('Unpackaged CV font: '+family);
 const css=FONT_FILES[family].map(([name,weight,style])=>{
  const filename=family.replace(/ /g,'')+'-'+name+'.woff2';
  const data=fs.readFileSync(path.join(fontsDir,filename)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${data}) format('woff2')}`;
 }).join('');cssCache.set(family,css);return css;
}
const commonCss=`html{color-scheme:light}html,body{margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.cv-page-container{width:210mm!important;min-width:210mm!important;max-width:210mm!important;min-height:297mm!important;height:auto!important;max-height:none!important;overflow:visible!important;box-sizing:border-box;page-break-inside:auto!important;break-inside:auto!important}.cv-page-container img{max-width:100%}.cv-page-container [contenteditable]:hover,.cv-page-container [contenteditable]:focus{background:transparent!important}@media print{html,body,body.in-iframe{width:210mm!important;min-height:0!important;height:auto!important;padding:0!important;margin:0!important;background:#fff!important}.cv-page-container{margin:0!important;box-shadow:none!important}.cv-toolbar,.cv-photo-editor,.no-print{display:none!important}@page{size:A4 portrait;margin:0}}`;
function designCss(design){return fontCss(design.style.font)+commonCss;}
let cachedVersion;
function designVersion(){
 if(cachedVersion)return cachedVersion;
 const hash=crypto.createHash('sha256');hash.update(JSON.stringify(registry));
 for(const file of ['designRegistry.js','templateHtmlBuilder.js','templateCatalogLayouts.js'])hash.update(fs.readFileSync(path.join(__dirname,file)));
 for(const family of Object.keys(FONT_FILES))for(const [label] of FONT_FILES[family])hash.update(fs.readFileSync(path.join(fontsDir,family.replace(/ /g,'')+'-'+label+'.woff2')));
 return cachedVersion=hash.digest('hex').slice(0,16);
}
module.exports={getDesign,designCss,designVersion,commonCss,fontsDir,FONT_FILES};
