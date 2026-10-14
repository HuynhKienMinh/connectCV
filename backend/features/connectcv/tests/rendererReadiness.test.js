const test=require('node:test'),assert=require('node:assert/strict');
const {createRendererProbe,verifyCanary,MARKER}=require('../src/services/rendererReadiness');
const {PDFDocument,StandardFonts}=require('pdf-lib');
async function fixture({text=MARKER,width=595.28,height=841.89,pages=1}={}){const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=0;i<pages;i++)pdf.addPage([width,height]).drawText(text,{x:20,y:height-30,font,size:16});return Buffer.from(await pdf.save({useObjectStreams:false}));}
test('canary validates actual PDF format, A4 page and source text, not just browser launch',async()=>{
 const good=await fixture();const r=await verifyCanary(good);assert.equal(r.pages,1);assert.equal(r.bytes,good.length);
 for(const options of [{text:'OTHER_TEXT'},{width:300},{pages:2}])await assert.rejects(verifyCanary(await fixture(options)));
 await assert.rejects(verifyCanary(Buffer.from('not a PDF')));
});
test('concurrent startup probes share one render and stay unready until PDF verification succeeds',async()=>{
 let complete,calls=0;const p=createRendererProbe({render:()=>{calls++;return new Promise(r=>complete=r);},verify:async()=>({pages:1,bytes:2000})});
 const first=p.probe(),second=p.probe();assert.equal(first,second);assert.equal(p.status().ready,false);complete(Buffer.from('fixture'));assert.equal(await first,true);assert.equal(await p.probe(),true);assert.equal(calls,1);assert.equal(p.status().bytes,2000);
});
test('engine failures stay unready and diagnostics do not expose error text or document content',async()=>{
 let fail=true;const p=createRendererProbe({render:async()=>{if(fail)throw Error('PRIVATE_SENTINEL');return Buffer.from('fixture');},verify:async()=>({pages:1,bytes:2000})});
 assert.equal(await p.probe(),false);assert.equal(p.status().ready,false);assert.ok(!JSON.stringify(p.status()).includes('PRIVATE_SENTINEL'));fail=false;assert.equal(await p.probe(),true);
});
test('disconnect invalidates readiness and a late probe cannot restore stale success',async()=>{
 let complete;const p=createRendererProbe({render:()=>new Promise(r=>complete=r),verify:async()=>({pages:1,bytes:2000})});const old=p.probe();p.invalidate();complete(Buffer.from('fixture'));assert.equal(await old,false);assert.equal(p.status().ready,false);
 const next=p.probe();complete(Buffer.from('fixture'));assert.equal(await next,true);p.invalidate();assert.equal(p.status().ready,false);assert.equal(p.status().checkedAt,null);
});
test('public readiness reports an unverified PDF as false without triggering a render or caching the result',async t=>{
 const express=require('express'),app=express();require('../mount')(app);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>server.close());
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/features/health');const body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(body.browserConfigured,false);assert.equal(body.pdfCanaryVerified,false);assert.equal(require('../src/services/pdfService').getRendererStatus().stage,'unverified');
});
