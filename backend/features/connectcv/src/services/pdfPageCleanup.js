'use strict';
const {PDFDocument}=require('pdf-lib');
let parser;
// Inspect Chromium's own PDF output, never an uploaded PDF. Keep every page
// containing text (including a single skill) or a candidate photograph.
async function removeEmptyBoundaryPages(buffer,photoSizes=[]){
 const pdfjs=await(parser||(parser=import('pdfjs-dist/legacy/build/pdf.mjs')));
 const task=pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:true,verbosity:0});
 const source=await task.promise;
 try{
  if(source.numPages<2)return buffer;
  async function empty(index){
   const page=await source.getPage(index+1),content=await page.getTextContent();
   const text=content.items.map(x=>x.str||'').join('').replace(/\s/g,'');
   if(text && !/^©?(?:topcv\.vn|ConnectCV)$/i.test(text))return false;
   if(!photoSizes.length)return true;
   const ops=await page.getOperatorList();
   for(let i=0;i<ops.fnArray.length;i++){
    const fn=ops.fnArray[i],args=ops.argsArray[i];
    if(fn===pdfjs.OPS.paintImageXObject||fn===pdfjs.OPS.paintImageXObjectRepeat){
     const width=args[1],height=args[2];
     if(!width||!height||photoSizes.some(s=>s.width===width&&s.height===height))return false;
    }else if(fn===pdfjs.OPS.paintInlineImageXObject){
     const img=args[0];if(!img||photoSizes.some(s=>s.width===img.width&&s.height===img.height))return false;
    }
   }
   return true;
  }
  let first=0,last=source.numPages-1;
  while(first<last&&await empty(first))first++;
  while(last>first&&await empty(last))last--;
  if(first===0&&last===source.numPages-1)return buffer;
  const result=await PDFDocument.load(buffer,{updateMetadata:false});
  for(let i=result.getPageCount()-1;i>=0;i--)if(i<first||i>last)result.removePage(i);
  return Buffer.from(await result.save());
 }finally{await source.destroy()}
}
module.exports={removeEmptyBoundaryPages};
