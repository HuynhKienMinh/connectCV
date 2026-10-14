'use strict';
// Use the same hermetic browser directory during Render build and startup.
// A remote worker or explicit opt-out keeps installation disabled.
function configureRenderBrowser(env){
 const install=env.RENDER==='true'&&env.INSTALL_CHROMIUM_ON_RENDER!=='false'&&!env.CV_BROWSER_WS_ENDPOINT;
 if(install&&!env.PLAYWRIGHT_BROWSERS_PATH)env.PLAYWRIGHT_BROWSERS_PATH='0';
 return install;
}
module.exports={configureRenderBrowser};
