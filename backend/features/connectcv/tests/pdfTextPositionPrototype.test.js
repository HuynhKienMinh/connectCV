'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {foldStream,foldPdf,LIMITS}=require('../tools/pdfTextPositionPrototype.cjs');
const {PDFDocument,PDFName}=require('pdf-lib');
const sample='BT /F1 12 Tf 1 0 0 -1 0 70 Tm 20 0 Td (word) Tj ET';
test('folds only the known origin+horizontal-offset pattern, preserving exact numeric literals',()=>{
 const r=foldStream(Buffer.from('BT 1.0 0 -0 -1 0 70.125 Tm +20.50 0 Td (word) Tj ET'));assert.equal(r.folded,1);assert.equal(r.bytes.toString(),'BT 1.0 0 -0 -1 +20.50 70.125 Tm (word) Tj ET');
 assert.equal(foldStream(Buffer.from(sample)).bytes.toString(),'BT /F1 12 Tf 1 0 0 -1 20 70 Tm (word) Tj ET');
});
test('preserves strings, escapes, hex data, names, comments and composite operands',()=>{
 const prefix='(BT 1 0 0 -1 0 9 Tm 4 0 Td \\(x\\)) Tj <425420546d205464> Tj /Tm /Td [1 0 0 -1 0 9 (Tm)] TJ << /Tm (Td) >> DP\n% BT Tm Td\n';
 const r=foldStream(Buffer.from(prefix+sample));assert.equal(r.folded,1);assert.ok(r.bytes.toString().startsWith(prefix));
});
test('skips rotated/sheared/vertical offsets, separated operators and outside text',()=>{
 for(const text of ['1 0 0 -1 0 70 Tm 20 0 Td','BT 0 1 -1 0 0 70 Tm 20 0 Td ET','BT 1 0 0 1 0 70 Tm 20 0 Td ET','BT 1 .2 0 -1 0 70 Tm 20 0 Td ET','BT 1 0 0 -1 0 70 Tm 20 1 Td ET','BT 1 0 0 -1 0 70 Tm /F1 12 Tf 20 0 Td ET']){
  const r=foldStream(Buffer.from(text));assert.equal(r.folded,0,text);assert.equal(r.bytes.toString(),text);
 }
});
test('rejects whole stream on malformed/nested state, inline images and resource limits',()=>{
 for(const tail of ['BI /W 1 ID binary EI','(unterminated','<abzz>','[1','BT BT ET ET','BT','ET','<< /A 2 ]','1']){
  const text=sample+' '+tail,r=foldStream(Buffer.from(text));assert.equal(r.folded,0,text);assert.ok(r.reason,text);assert.equal(r.bytes.toString(),text);
 }
 assert.equal(foldStream(Buffer.from('q '.repeat(LIMITS.tokens+1))).reason,'token_limit');
 const huge=Buffer.alloc(LIMITS.streamBytes+1,32);assert.equal(foldStream(huge).reason,'stream_limit');
});
test('multiple supported runs remain stable on a second pass',()=>{
 const r=foldStream(Buffer.from(sample+'\n'+sample));assert.equal(r.folded,2);const again=foldStream(r.bytes);assert.equal(again.folded,0);assert.deepEqual(again.bytes,r.bytes);
});
test('all-or-nothing PDF rewrite and no-change byte identity for unsupported or invalid documents',async()=>{
 const doc=await PDFDocument.create();for(const text of [sample,sample+' BI /W 1 ID text EI']){const page=doc.addPage();page.node.set(PDFName.Contents,doc.context.register(doc.context.flateStream(text)));}
 const bytes=Buffer.from(await doc.save());const r=await foldPdf(bytes);assert.equal(r.folded,0);assert.equal(r.reason,'inline_image');assert.deepEqual(r.bytes,bytes);
 const invalid=Buffer.from('not a PDF');assert.deepEqual((await foldPdf(invalid)).bytes,invalid);
});
test('PDF wrapper applies supported changes and retains page dimensions',async()=>{
 const doc=await PDFDocument.create(),page=doc.addPage([595.28,841.89]);page.node.set(PDFName.Contents,doc.context.register(doc.context.flateStream(sample)));
 const r=await foldPdf(Buffer.from(await doc.save()));assert.equal(r.folded,1);assert.equal(r.reason,null);const reopened=await PDFDocument.load(r.bytes);assert.deepEqual(reopened.getPage(0).getSize(),{width:595.28,height:841.89});
});


test('rejects Forms, multi-stream pages and oversized decompression without partial rewrite',async()=>{
 for(const mode of ['form','multi','inflate','filter']){
  const doc=await PDFDocument.create(),page=doc.addPage();
  let stream=doc.context.flateStream(mode==='inflate'?Buffer.alloc(LIMITS.streamBytes+1,32):sample);
  if(mode==='filter')stream.dict.set(PDFName.of('Filter'),PDFName.of('LZWDecode'));
  const ref=doc.context.register(stream);
  page.node.set(PDFName.Contents,mode==='multi'?doc.context.obj([ref,ref]):ref);
  if(mode==='form'){
   const form=doc.context.register(doc.context.flateStream('',{Type:'XObject',Subtype:'Form',BBox:[0,0,1,1]}));
   page.node.set(PDFName.of('Resources'),doc.context.obj({XObject:{X:form}}));
  }
  const bytes=Buffer.from(await doc.save()),r=await foldPdf(bytes);
  assert.equal(r.folded,0,mode);assert.ok(r.reason,mode);assert.deepEqual(r.bytes,bytes,mode);
 }
});


test('adds actual Chrome nonzero origins as bounded exact decimals without floating rounding',()=>{
 for(const [left,right,sum] of [['146.671875','19.199997','165.871872'],['.1','.2','0.3'],['-1.20','+.15','-1.05'],['0.000000000000000001','0.000000000000000002','0.000000000000000003']]){
  const r=foldStream(Buffer.from('BT 1 0 0 -1 '+left+' 87 Tm '+right+' 0 Td ET'));
  assert.equal(r.folded,1);assert.equal(r.bytes.toString(),'BT 1 0 0 -1 '+sum+' 87 Tm ET');
 }
});
