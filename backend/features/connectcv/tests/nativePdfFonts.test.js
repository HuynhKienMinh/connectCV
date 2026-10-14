'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {unifyNativePdfFonts}=require('../src/services/nativePdfFonts');
const root=path.resolve(__dirname,'../assets/topcv-source'),manifest=require('../assets/topcv-source/merged-fonts.json');
const face=(weight,file)=>`@font-face {font-family: 'Be Vietnam Pro';font-style: normal;font-weight: ${weight};src: url(/api/cv/source-assets/${file}) format('woff2');unicode-range: U+0000-00FF;}`;
test('single native font includes both subsets; repeated original declarations cannot win the cascade',()=>{
 const entry=manifest.weights['400'],rules=entry.sources.map(x=>face(400,x.file)).join('');
 const original=`<style>${rules}</style><div data-native-topcv="formal">Ứng viên thử nghiệm</div><style>${rules}</style>`;
 const result=unifyNativePdfFonts(original);
 assert.equal((result.match(/@font-face/g)||[]).length,1);assert.ok(result.includes(entry.file));assert.ok(!result.includes('unicode-range'));assert.ok(result.includes('Ứng viên thử nghiệm'));
 assert.equal(unifyNativePdfFonts(result),result);
});
test('unknown/custom faces, italic variants, non-native documents and candidate text stay unchanged',()=>{
 const file=manifest.weights['400'].sources[0].file,rule=face(400,file);
 for(const html of [rule,`<style>${rule.replace('normal','italic')}</style><div data-native-topcv="formal"></div>`,`<style>${rule.replace(file,'unknown.woff2')}</style><div data-native-topcv="formal"></div>`,`<div data-native-topcv="formal">${rule}</div>`])assert.equal(unifyNativePdfFonts(html),html);
});
test('all four merged assets and their original sources match immutable provenance and include the OFL license',()=>{
 for(const [weight,e] of Object.entries(manifest.weights)){
  assert.ok(['400','500','600','700'].includes(weight));assert.equal(e.glyphCodepoints,325);assert.equal(e.file,e.sha256.slice(0,20)+'.woff2');
  for(const a of [e,...e.sources])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets',a.file))).digest('hex'),a.sha256);
 }
 const license=fs.readFileSync(path.join(root,manifest.license),'utf8');assert.ok(license.includes('Copyright 2021 The Be Vietnam Pro Project Authors'));assert.ok(license.includes('SIL OPEN FONT LICENSE Version 1.1'));
});
