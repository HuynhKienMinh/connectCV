'use strict';
process.env.FEATURE_STORE_BACKEND = 'firestore';
if(process.env.RENDER==='true'&&process.env.INSTALL_CHROMIUM_ON_RENDER==='true'&&!process.env.PLAYWRIGHT_BROWSERS_PATH)process.env.PLAYWRIGHT_BROWSERS_PATH=require('path').join(__dirname,'.render-browsers');
if(process.env.NODE_ENV === 'production' && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('Emulators are forbidden in production');
const { createApp } = require('./app');
const app = createApp();
let server;
(async()=>{
 if(process.env.RENDER==='true'||process.env.CHROMIUM_PATH||process.env.CV_BROWSER_WS_ENDPOINT){const ready=await require('./features/connectcv/src/services/pdfService').probeRenderer();console.log('Server PDF renderer ready:',ready);}
 server=app.listen(process.env.PORT || 5000,'0.0.0.0',()=>console.log('ConnectCV Firebase backend ready'));
})().catch(()=>{console.error('Backend startup failed');process.exitCode=1;});
process.on('SIGTERM',()=>server?server.close(()=>process.exit(0)):process.exit(0));
