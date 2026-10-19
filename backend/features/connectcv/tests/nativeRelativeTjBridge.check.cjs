'use strict';
// Local experiment only: apply independently parsed stream plan without serializing font resources through pypdf.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {PDFDocument,PDFName}=require('pdf-lib');
(async()=>{
 const [source,planPath,target]=process.argv.slice(2);assert.ok(source&&planPath&&target);
 assert.ok(fs.statSync(source).size<16*1024*1024&&fs.statSync(planPath).size<16*1024*1024);
 const input=fs.readFileSync(source),plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
 assert.ok(plan.pages.length<=64);const doc=await PDFDocument.load(input,{updateMetadata:false,ignoreEncryption:false});const seen=new Set();
 for(const item of plan.pages){assert.ok(Number.isInteger(item.page)&&item.page>=0&&item.page<doc.getPageCount()&&!seen.has(item.page));seen.add(item.page);const bytes=Buffer.from(item.contentBase64,'base64');assert.ok(bytes.length<4*1024*1024);doc.getPage(item.page).node.set(PDFName.Contents,doc.context.register(doc.context.flateStream(bytes)));}
 const bytes=plan.pages.length?Buffer.from(await doc.save({useObjectStreams:false,updateFieldAppearances:false,addDefaultPage:false})):input;
 assert.ok(bytes.length<16*1024*1024&&bytes.length<input.length*1.5+128*1024);fs.writeFileSync(target,bytes);
 console.log(JSON.stringify({groups:plan.groups,bytes:bytes.length,runtimeIntegrated:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
