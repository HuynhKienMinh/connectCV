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
