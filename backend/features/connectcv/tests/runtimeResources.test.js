const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
test('every advertised VI/EN preview exists in the release',()=>{
 const {getAvailableTemplates}=require('../src/services/templateService');
 for(const language of ['vi','en'])for(const template of getAvailableTemplates(language)){
  assert.ok(template.thumbnailUrl.startsWith('/ai/cv-design-previews/'));
  const file=path.resolve(__dirname,'../public',template.thumbnailUrl.slice('/ai/'.length));
  assert.ok(fs.existsSync(file),`${language} ${template.id}: missing preview`);
 }
});
test('malformed AI output does not leak source text in errors',()=>{
 const {extractJSON}=require('../src/services/geminiService');
 assert.throws(()=>extractJSON('PRIVATE_PROFILE_SENTINEL not JSON'),error=>!error.message.includes('PRIVATE_PROFILE_SENTINEL'));
});

test('all 148 native variants brand preview and generated copyright consistently',()=>{
 const {getAvailableTemplates}=require('../src/services/templateService');
 const {renderTopcvSource,load}=require('../src/services/topcvSourceRenderer');
 let count=0;
 for(const language of ['vi','en'])for(const template of getAvailableTemplates(language)){
  const source=load(template.slug,language);
  for(const preview of [true,false]){
   const html=renderTopcvSource(template,{}, {},language,{preview});
   assert.doesNotMatch(html,/(?:©|&copy;|&#169;|&#x0*a9;)\s*topcv\.vn/i,template.slug+' '+language);
   if(/©\s*topcv\.vn/i.test(preview?source.originalBody:source.body))assert.ok(html.includes('© ConnectCV'));
  }
  count++;
 }
 assert.equal(count,148);
});

test('generated CVs load the deployed photo editor and previews contain no scripts',()=>{
 const {getAvailableTemplates}=require('../src/services/templateService');
 const {renderTopcvSource}=require('../src/services/topcvSourceRenderer');
 for(const language of ['vi','en'])for(const t of getAvailableTemplates(language)){
  const html=renderTopcvSource(t,{}, {},language);
  assert.ok(html.includes('src="/ai/js/cv-photo-editor.js"'),t.id);
  assert.ok(fs.existsSync(path.resolve(__dirname,'../public/js/cv-photo-editor.js')));
  assert.doesNotMatch(renderTopcvSource(t,{}, {},language,{preview:true}),/<script\b/i);
 }
});
