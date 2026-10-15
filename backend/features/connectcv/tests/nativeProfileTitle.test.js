'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {getAvailableTemplates,renderCVDataToTemplateHtml}=require('../src/services/templateService');
const {renderTopcvSource,load}=require('../src/services/topcvSourceRenderer');
const affected=['classic_1','schoolarship_standard','senior_2','software_engineer'];
const profile={fullName:'Fixture Candidate',targetRole:'ROLE_SOURCE_QUALITY_ENGINEER'};
for(const language of ['vi','en'])test('all native '+language+' layouts retain the candidate target role',()=>{
 const templates=getAvailableTemplates(language);assert.equal(templates.length,74);
 for(const t of templates){
  const html=renderCVDataToTemplateHtml(t,{targetRole:profile.targetRole},profile,language);
  const body=html.slice(html.indexOf('<body'),html.indexOf('</body>'));
  assert.ok(body.includes(profile.targetRole),t.slug+' loses source target role');
 }
});
test('added role is one editable escaped field, omitted for empty input, and respects CV role precedence',()=>{
 for(const language of ['vi','en'])for(const slug of affected){
  const t={slug,title:'Fixture'},role='<img src=x onerror=alert(1)> & Quality';
  const html=renderTopcvSource(t,{targetRole:role},profile,language);
  assert.equal((html.match(/id="cvo-profile-title"/g)||[]).length,1);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; Quality'));
  assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes(profile.targetRole));
  assert.ok(/id="cvo-profile-title" contenteditable="true"/.test(html));
  const empty=renderTopcvSource(t,{}, {...profile,targetRole:'   '},language);
  assert.ok(!empty.includes('id="cvo-profile-title"'));
  const preview=renderTopcvSource(t,{},profile,language,{preview:true});
  assert.ok(!preview.includes('id="cvo-profile-title"'));
  assert.ok(!load(slug,language).body.includes('{{profile.title}}'),'keep original source asset unchanged');
 }
});
