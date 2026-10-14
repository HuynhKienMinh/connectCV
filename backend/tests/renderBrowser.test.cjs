'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {configureRenderBrowser}=require('../scripts/render-browser-config.cjs');
test('Render build and startup resolve the same hermetic browser without an extra opt-in flag',()=>{
 for(const flag of [undefined,'true']){const env={RENDER:'true',...(flag?{INSTALL_CHROMIUM_ON_RENDER:flag}:{})};assert.equal(configureRenderBrowser(env),true);assert.equal(env.PLAYWRIGHT_BROWSERS_PATH,'0');assert.equal(configureRenderBrowser(env),true);}
});
test('explicit browser path, remote worker and opt-out are preserved without installing on local development',()=>{
 const explicit={RENDER:'true',PLAYWRIGHT_BROWSERS_PATH:'/pinned/shared'};assert.equal(configureRenderBrowser(explicit),true);assert.equal(explicit.PLAYWRIGHT_BROWSERS_PATH,'/pinned/shared');
 for(const env of [{},{RENDER:'true',INSTALL_CHROMIUM_ON_RENDER:'false'},{RENDER:'true',CV_BROWSER_WS_ENDPOINT:'wss://worker.example'}]){assert.equal(configureRenderBrowser(env),false);assert.equal(env.PLAYWRIGHT_BROWSERS_PATH,undefined);}
});
