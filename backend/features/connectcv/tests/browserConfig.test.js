const test=require('node:test'),assert=require('node:assert/strict');
const {browserPath,launchOptions}=require('../src/services/browserConfig');
test('browser path uses existing configured or pinned executable only',()=>{
 const chromium={executablePath:()=>'/pinned/chromium'};
 assert.equal(browserPath({CHROMIUM_PATH:'/missing'},chromium,p=>p==='/pinned/chromium'),'/pinned/chromium');
 assert.equal(browserPath({},chromium,()=>false),undefined);
});
test('production renderer cannot disable its sandbox using handoff flags',()=>{
 for(const flag of ['--no-sandbox','--disable-setuid-sandbox','--single-process'])assert.throws(()=>launchOptions({args:[flag]},true));
 assert.equal(launchOptions({args:[],env:{CHROMIUM_NO_SANDBOX:'true'}},true).chromiumSandbox,true);
});
