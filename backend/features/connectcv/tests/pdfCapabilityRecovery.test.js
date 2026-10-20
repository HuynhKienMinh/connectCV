const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start=html.includes('    let cvExportOperation')?html.indexOf('    let cvExportOperation'):html.includes('    async function refreshPdfReadinessForExport(')?html.indexOf('    async function refreshPdfReadinessForExport('):html.indexOf('    async function downloadCVPDF(');
const script=html.slice(start,html.indexOf('    function printCV()',start));
function fixture(health){
 const calls=[],timers=new Map();let downloads=0,prints=0,nextTimer=0;
 const scope={latestCVData:{sourceProfile:{}},latestRenderedHtml:'',currentSelectedTemplateId:'default_v2',currentAppliedTemplate:null,currentCVLanguage:'vi',AbortController,console:{error:()=>{}},showToastWarning:()=>{},showToastSuccess:()=>{},printCV:()=>prints++,
  setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  window:{addEventListener:()=>{},connectCVServerPdf:false,URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL:()=>{}}},
  document:{getElementById:id=>id==='cv-profile'?{value:'{"fullName":"Synthetic Export"}'}:id==='cv-rendered-iframe'?{contentDocument:{documentElement:{cloneNode:()=>({querySelector:()=>null,outerHTML:'<html><body><div class="cv-page-container">Synthetic</div></body></html>'})}}}:null,
   createElement:()=>({style:{},click:()=>downloads++}),body:{appendChild:()=>{},removeChild:()=>{}}},
  fetch:async(url,options)=>{calls.push({url,options});if(url==='/api/features/health'){if(health instanceof Error)throw health;if(typeof health==='function')return health(options);return {ok:health.ok!==false,json:async()=>health.body};}return {ok:true,blob:async()=>Buffer.from('synthetic download fixture')};}
 };vm.createContext(scope);vm.runInContext(script,scope);
 return {scope,calls,timers,get downloads(){return downloads;},get prints(){return prints;}};
}
test('actual design download rechecks a stale false capability and uses the recovered server',async()=>{
 const f=fixture({body:{browserConfigured:true,pdfCanaryVerified:true}});await f.scope.downloadCVPDF();
 assert.equal(f.prints,0,'A stale page must not force Browser Print after the server recovered');assert.equal(f.downloads,1);
 assert.equal(f.calls[0].url,'/api/features/health');assert.equal(f.calls[0].options.cache,'no-store');assert.equal(f.calls[1].url,'/api/cv/export-pdf');assert.equal(JSON.parse(f.calls[1].options.body).format,'design');assert.equal(f.scope.window.connectCVServerPdf,true);
 assert.ok(![...f.timers.values()].some(t=>t.ms===3000),'Capability deadline is cleaned up');
});
test('unverified readiness, malformed responses and transport failures retain print fallback',async()=>{
 for(const health of [{body:{browserConfigured:true,pdfCanaryVerified:false}},{body:{browserConfigured:false,pdfCanaryVerified:true}},{body:{}},{ok:false},new Error('Synthetic offline')]){
  const f=fixture(health);await f.scope.downloadCVPDF();assert.equal(f.prints,1);assert.equal(f.downloads,0);assert.equal(f.calls.filter(c=>c.url==='/api/cv/export-pdf').length,0);assert.equal(f.scope.window.connectCVServerPdf,false);assert.equal(f.timers.size,0);
 }
});
test('an already ready page and ATS exports do not issue unnecessary readiness probes',async()=>{
 const f=fixture({body:{}});f.scope.window.connectCVServerPdf=true;await f.scope.downloadCVPDF();assert.equal(f.downloads,1);assert.equal(f.calls.length,1);assert.equal(f.calls[0].url,'/api/cv/export-pdf');
 const ats=fixture({body:{}});await ats.scope.downloadCVPDF('ats');assert.equal(ats.downloads,1);assert.equal(ats.calls.length,1);assert.equal(JSON.parse(ats.calls[0].options.body).format,'ats');
});
test('empty CV does not initiate a readiness request or open print',async()=>{
 const f=fixture({body:{browserConfigured:true,pdfCanaryVerified:true}});f.scope.latestCVData=null;await f.scope.downloadCVPDF();assert.equal(f.calls.length,0);assert.equal(f.prints,0);
});

test('a hung readiness request is aborted after its deadline and releases the fallback',async()=>{
 const f=fixture(options=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('Synthetic abort')),{once:true})));
 const pending=f.scope.downloadCVPDF();const deadline=[...f.timers.values()].find(t=>t.ms===3000);assert.ok(deadline);deadline.fn();await pending;assert.equal(f.prints,1);assert.equal(f.downloads,0);assert.equal(f.timers.size,0);
});
