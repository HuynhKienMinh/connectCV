const test=require('node:test'),assert=require('node:assert/strict');
const image=require('../public/js/profile-image');
test('save payload keeps one avatar, crop and all source facts without mutating the draft',async()=>{
 const avatar='data:image/jpeg;base64,/9j/AA==',draft={fullName:'Synthetic',avatarUrl:avatar,avatarDataUrl:avatar,avatarCrop:{zoom:1.4,x:10,y:-5},experience:[{company:'Synthetic',bullets:['Source fact']}]};
 const result=await image.prepare(draft);assert.equal(result.avatarUrl,avatar);assert.equal('avatarDataUrl' in result,false);assert.deepEqual(result.experience,draft.experience);assert.deepEqual(result.avatarCrop,draft.avatarCrop);assert.equal(draft.avatarDataUrl,avatar);
});
test('legacy avatarDataUrl-only and removing an avatar remain compatible',async()=>{
 const avatar='data:image/png;base64,iVBORw==';assert.equal((await image.prepare({avatarDataUrl:avatar})).avatarUrl,avatar);
 assert.deepEqual(await image.prepare({avatarUrl:'',avatarDataUrl:'',summary:'Keep'}),{avatarUrl:'',summary:'Keep'});
});
test('invalid, remote and over-limit legacy images stop before network and preserve draft',async()=>{
 for(const avatar of ['https://example.invalid/avatar.png','data:image/svg+xml;base64,AAAA','data:image/jpeg;base64,'+'A'.repeat(4200001)]){
  const draft={avatarUrl:avatar,summary:'Retained'};await assert.rejects(image.prepare(draft),e=>e.retryable===false&&/bản nháp/.test(e.message));assert.equal(draft.avatarUrl,avatar);
 }
});
test('profile size uses UTF-8 bytes, not string length or silent truncation',()=>{
 const draft={summary:'Ứ'.repeat(400000)};assert.ok(JSON.stringify(draft).length<image.MAX_PROFILE_BYTES);assert.throws(()=>image.checkSize(draft),e=>e.retryable===false&&/rút gọn/.test(e.message));assert.equal(draft.summary.length,400000);
 assert.equal(image.checkSize({summary:'Source'}).summary,'Source');
});
