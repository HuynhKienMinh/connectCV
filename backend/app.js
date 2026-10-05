'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');

function createApp({ frontendDistPath = path.join(__dirname, '../frontend/dist'), authenticate } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(require('helmet')({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false}));
  const origins = new Set((process.env.WEB_ORIGINS || 'http://localhost:5173').split(',').map(v=>v.trim()).filter(Boolean));
  if(process.env.PUBLIC_API_ORIGIN||process.env.RENDER_EXTERNAL_URL)origins.add(new URL(process.env.PUBLIC_API_ORIGIN||process.env.RENDER_EXTERNAL_URL).origin);
  app.use((req,res,next)=>{
    const origin=req.headers.origin;
    if(origin && !origins.has(origin))return res.status(403).json({success:false,code:'ORIGIN_DENIED'});
    if(origin){res.set('Access-Control-Allow-Origin',origin);res.vary('Origin');}
    res.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers','Content-Type,Authorization');
    if(req.method==='OPTIONS')return res.sendStatus(204);
    next();
  });
  app.use('/api',require('express-rate-limit').rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
  app.get('/ai/runtime.js',(req,res)=>{res.type('application/javascript').set('Cache-Control','no-store').send('window.connectCVParentOrigins='+JSON.stringify([...origins])+';window.connectCVServerPdf='+JSON.stringify(!!(process.env.CHROMIUM_PATH||process.env.CV_BROWSER_WS_ENDPOINT))+';');});
  app.use('/api/account',require('./src/routes/account'));
  app.use('/api/portfolios',require('./src/routes/portfolios'));
  const {requireAuth, requireVerified}=require('./src/middlewares/firebaseAuth');
  const verifiedFeature=authenticate || ((req,res,next)=>requireAuth(req,res,()=>requireVerified(req,res,async()=>{
    try{await require('./src/services/accountStore').store().ensure(req.user);next();}catch(error){next(error);}
  })));
  app.all('/health', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({ status: 'OK', message: 'Backend & Frontend service is running!', timestamp: new Date().toISOString() });
  });

  // Feature routes own their parser and identity checks. Mount before the global
  // parser and React fallback so large CV requests and APIs reach the right code.
  require('./features/connectcv/mount')(app, { authenticate: verifiedFeature });
  app.use(express.json());
  app.use('/api', (req, res) => res.status(404).json({ success: false, code: 'API_NOT_FOUND' }));
  app.use('/ai', (req, res) => res.status(404).send('AI resource not found.'));

  if (fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res) => res.sendFile(path.join(frontendDistPath, 'index.html')));
  } else {
    app.get('/', (req, res) => res.send('ConnectCV API is ready. (Frontend chưa được build, hãy chạy "npm run build")'));
  }
  app.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    const status=[400,401,402,403,404,409,413,429].includes(error.status)?error.status:503;
    res.status(status).json({success:false,message:status===503?'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.':'Không thể xử lý yêu cầu.'});
  });
  return app;
}
module.exports = { createApp };
