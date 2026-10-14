'use strict';
const manifest=require('../../assets/topcv-source/merged-fonts.json');
const weights=new Map(Object.entries(manifest.weights));

// Use a single font object for Latin/Vietnamese characters when exporting.
// Only known original @font-face resources are substituted. Custom faces,
// non-native documents and candidate text are left alone. No runtime font
// processing, user-supplied file paths or additional network access is needed.
function unifyNativePdfFonts(html){
 if(!html.includes('data-native-topcv='))return html;
 const seen=new Set();
 return html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,style=>style.replace(/@font-face\s*\{[^}]*\}/gi,rule=>{
  if(!/font-family:\s*(['"])Be Vietnam Pro\1\s*;/i.test(rule)||!/font-style:\s*normal\s*;/i.test(rule))return rule;
  const weight=rule.match(/font-weight:\s*(\d+)\s*;/i)?.[1],entry=weights.get(weight);
  if(!entry)return rule;
  const src=rule.match(/src:\s*url\(\s*(['"]?)(\/api\/cv\/source-assets\/([a-z0-9]+\.woff2))\1\s*\)\s*format\((['"])woff2\4\)\s*;/i);
  if(!src||!entry.sources.some(x=>x.file===src[3]))return rule;
  if(seen.has(weight))return '';
  seen.add(weight);
  return rule.replace(src[0],`src: url(/api/cv/source-assets/${entry.file}) format('woff2');`).replace(/unicode-range:[^;]*;/i,'');
 }));
}
module.exports={unifyNativePdfFonts};
