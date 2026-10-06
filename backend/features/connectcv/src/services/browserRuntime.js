 'use strict';
// Chromium stays the rendering engine. This adapter avoids browser download,
// archive extraction and PAC/FTP dependencies in the application runtime.
const {chromium}=require('playwright-core');
function wrapBrowser(browser){
 return {isConnected:()=>browser.isConnected(),on:(...args)=>browser.on(...args),close:()=>browser.close(),async newPage(){
  const context=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block',viewport:{width:794,height:1123},deviceScaleFactor:2});
  const page=await context.newPage();
  const listeners=new Map();let intercept=false;let routing=Promise.resolve();
  return {
   setJavaScriptEnabled:async value=>{if(value)throw new Error('Document JavaScript is forbidden');},
   setRequestInterception:async value=>{intercept=value;},
   async setViewport({width,height,deviceScaleFactor=2}){await page.setViewportSize({width,height});const cdp=await context.newCDPSession(page);try{await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor,mobile:false});}finally{await cdp.detach();}},
   emulateMediaType:media=>page.emulateMedia({media}),
   $:(...args)=>page.$(...args),$eval:(...args)=>page.$eval(...args),
   setContent:async(...args)=>{await routing;return page.setContent(...args);},evaluate:(...args)=>page.evaluate(...args),
   addStyleTag:({content})=>page.evaluate(css=>{const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);},content),pdf:options=>page.pdf({...options,waitForFonts:false,timeout:30000}),
   screenshot:({captureBeyondViewport,...options})=>page.screenshot({...options,fullPage:!!captureBeyondViewport,timeout:30000}),
   close:()=>context.close(),
   on(event,handler){if(event!=='request')throw new Error('Unsupported browser event');
    const wrapped=async route=>{let handled=false;const request=route.request();const finish=async(action)=>{if(handled)return;handled=true;return action();};
     await handler({url:()=>request.url(),method:()=>request.method(),isInterceptResolutionHandled:()=>handled,
      abort:()=>finish(()=>route.abort()),continue:()=>finish(()=>route.continue()),
      respond:({status,contentType,headers,body})=>finish(()=>route.fulfill({status,contentType,headers,body}))});
     if(!handled)await route.abort();
    };listeners.set(handler,wrapped);if(intercept)routing=routing.then(()=>context.route('**/*',wrapped));
   },
   off(event,handler){const wrapped=listeners.get(handler);if(wrapped){routing=routing.then(()=>context.unroute('**/*',wrapped));listeners.delete(handler);}}
  };
 }};
}
module.exports={async launch(options){return wrapBrowser(await chromium.launch(require('./browserConfig').launchOptions(options,process.env.NODE_ENV==='production')));},async connect({browserWSEndpoint}){return wrapBrowser(await chromium.connectOverCDP(browserWSEndpoint,{timeout:30000}));}};
