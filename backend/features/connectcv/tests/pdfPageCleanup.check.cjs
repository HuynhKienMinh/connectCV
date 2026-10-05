const assert=require('node:assert/strict'),fs=require('fs');
const {PDFDocument,StandardFonts}=require('pdf-lib');
const {removeEmptyBoundaryPages}=require('../src/services/pdfPageCleanup');
(async()=>{
 const d=await PDFDocument.create(),font=await d.embedFont(StandardFonts.Helvetica);
 d.addPage();d.addPage().drawText('Docker',{font});d.addPage().drawText('© topcv.vn',{font});d.addPage().drawText('© ConnectCV',{font});
 const raw=Buffer.from(await d.save()),clean=await PDFDocument.load(await removeEmptyBoundaryPages(raw));assert.equal(clean.getPageCount(),1);
 const imageFile=fs.readdirSync('assets/topcv-source/assets').find(f=>/\.jpg$/.test(f));
 const photos=await PDFDocument.create(),photo=await photos.embedJpg(fs.readFileSync('assets/topcv-source/assets/'+imageFile));
 photos.addPage().drawText('Candidate',{font:await photos.embedFont(StandardFonts.Helvetica)});photos.addPage().drawImage(photo,{x:10,y:10,width:100,height:100});photos.addPage();
 const kept=await PDFDocument.load(await removeEmptyBoundaryPages(Buffer.from(await photos.save()),[{width:photo.width,height:photo.height}]));assert.equal(kept.getPageCount(),2);
 console.log('PASS: empty boundary pages removed; one-word facts and photo-only pages preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
