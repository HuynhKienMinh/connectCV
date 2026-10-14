'use strict';
// Local-only browser lifecycle regression. No cloud data, auth or AI.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {getBrowser,generateCvPdf,probeRenderer,isRendererReady,getRendererStatus}=require('../src/services/pdfService');
const {CANARY_HTML,verifyCanary}=require('../src/services/rendererReadiness');
(async()=>{
 assert.equal(process.env.NODE_ENV,'production');
 let before,after,second;
 try{
  assert.equal(await probeRenderer(),true);before=getRendererStatus();
  await (await getBrowser()).close();assert.equal(isRendererReady(),false);
  await assert.rejects(generateCvPdf({html:'<html><body>invalid synthetic document</body></html>'}),/Missing canonical CV document/);
  assert.equal(isRendererReady(),false,'Invalid user output cannot establish readiness');
  const buffers=await Promise.all([generateCvPdf({html:CANARY_HTML}),generateCvPdf({html:CANARY_HTML})]);
  const output=await Promise.all(buffers.map(verifyCanary));
  second=await getBrowser();after=getRendererStatus();
  const report={scope:'production sandbox local lifecycle; invalid output then two concurrent fresh valid outputs',startup:before,relaunchedConnected:second.isConnected(),invalidOutputKeptUnready:true,concurrentExports:buffers.length,output,afterRelaunch:after};
  if(process.env.CV_RECONNECT_REPORT)fs.writeFileSync(process.env.CV_RECONNECT_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  assert.equal(isRendererReady(),true,'A successfully recreated renderer must restore verified readiness');
 }finally{if(second)await second.close();else await (await getBrowser()).close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
