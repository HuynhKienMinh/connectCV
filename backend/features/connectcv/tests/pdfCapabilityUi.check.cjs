'use strict';
// Opt-in local UI fixture: actual download controller, mocked API/print/saving.
// This does not verify Firebase identity, renderer layout or production export.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {PDFDocument,StandardFonts}=require('pdf-lib');
const repo=path.resolve(__dirname,'../../../..');
const current=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const baseline=execFileSync('git',['show','15daaa7:backend/features/connectcv/public/index.html'],{cwd:repo,encoding:'utf8'});
function controller(html){
 const helper='    async function refreshPdfReadinessForExport(',download='    async function downloadCVPDF(';
 const start=html.includes(helper)?html.indexOf(helper):html.indexOf(download),end=html.indexOf('    function printCV()',start);
 if(start<0||end<0)throw Error('Actual export controller not found');
 return html.slice(start,end);
}
function fixture(route){return `<!doctype html><html><head><meta charset="utf-8"><title>ConnectCV local PDF recovery fixture</title></head><body>
 <h1>Local synthetic PDF recovery — ${route}</h1>
 <p>API, print and file saving are fixtures. No Firebase or AI.</p>
 <button onclick="startDesignDownload()">Download design PDF</button>
 <p id="toast" role="status">Ready to test</p><pre id="evidence"></pre>
 <input id="cv-profile" type="hidden" value='{"fullName":"Synthetic Export"}'>
 <iframe id="cv-rendered-iframe" sandbox="allow-same-origin" srcdoc="&lt;html&gt;&lt;body&gt;&lt;div class='cv-page-container'&gt;Synthetic CV&lt;/div&gt;&lt;/body&gt;&lt;/html&gt;"></iframe>
 <script>
 window.connectCVServerPdf=false;
 const latestCVData={sourceProfile:{}},latestRenderedHtml='',currentSelectedTemplateId='default_v2',currentCVLanguage='vi';
 const result={route:${JSON.stringify(route)},prints:0,downloads:0,requests:[],formats:[],finished:false};
 function evidence(){document.getElementById('evidence').textContent=JSON.stringify({...result,readyFlag:window.connectCVServerPdf});}
 function printCV(){result.prints++;evidence();}
 function showToastWarning(message){document.getElementById('toast').textContent=message;}
 function showToastSuccess(message){document.getElementById('toast').textContent=message;evidence();}
 const nativeFetch=window.fetch.bind(window);
 window.fetch=(url,options={})=>{
  if(!['/api/features/health','/api/cv/export-pdf'].includes(url))throw Error('Fixture egress denied');
  result.requests.push(url);if(options.body)result.formats.push(JSON.parse(options.body).format);evidence();
  return nativeFetch(url+'?scenario='+${JSON.stringify(route)},options);
 };
 document.addEventListener('click',event=>{if(event.target.tagName==='A'&&event.target.download){event.preventDefault();result.downloads++;evidence();}});
 ${controller(route==='before'?baseline:current)}
 async function startDesignDownload(){const start=performance.now();await downloadCVPDF();result.elapsedMs=Math.round(performance.now()-start);result.finished=true;evidence();}
 evidence();
 </script></body></html>`;}
(async()=>{
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 pdf.addPage([595.28,841.89]).drawText('Synthetic local controller fixture',{x:20,y:800,font,size:16});
 const buffer=Buffer.from(await pdf.save({useObjectStreams:false}));
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&url.pathname==='/api/features/health'){
   if(url.searchParams.get('scenario')==='hung')return;
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({browserConfigured:true,pdfCanaryVerified:url.searchParams.get('scenario')!=='unverified'}));
  }
  if(req.method==='POST'&&url.pathname==='/api/cv/export-pdf'){
   req.resume();res.setHeader('Content-Type','application/pdf');return res.end(buffer);
  }
  const route=url.pathname.slice(1);
  if(req.method==='GET'&&['before','after','unverified','hung'].includes(route)){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture(route));}
  res.statusCode=404;res.end('Fixture route not found');
 });
 server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({localFixtureOrigin:'http://127.0.0.1:'+server.address().port,mockedApis:true,cloudUserWrites:0,aiCalls:0,downloadIntercepted:true})));
 process.on('SIGINT',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
})().catch(error=>{console.error(error.message);process.exitCode=1;});
