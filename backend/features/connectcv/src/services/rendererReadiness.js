'use strict';
const MARKER='CONNECTCV_PDF_CANARY_V1';
const CANARY_HTML='<html><head><style>body{font:16px Arial}.cv-page-container{padding:24px;box-sizing:border-box}</style></head><body><div class="cv-page-container"><h1>ConnectCV renderer check</h1><p>'+MARKER+'</p></div></body></html>';
// Inspect only the tiny PDF created by our trusted canary, never uploaded PDFs.
async function verifyCanary(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length<1000||buffer.length>200000||buffer.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid canary PDF');
 const {PDFDocument}=require('pdf-lib'),pdf=await PDFDocument.load(buffer);
 if(pdf.getPageCount()!==1)throw Error('Unexpected canary page count');
 const size=pdf.getPage(0).getSize();if(Math.abs(size.width-595.28)>2||Math.abs(size.height-841.89)>2)throw Error('Canary is not A4');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const doc=await pdfjs.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,useSystemFonts:true,verbosity:0}).promise;
 try{const text=(await(await doc.getPage(1)).getTextContent()).items.map(item=>item.str||'').join('');if(!text.includes(MARKER))throw Error('Canary text missing');}
 finally{await doc.destroy();}
 return {pages:1,bytes:buffer.length};
}
function createRendererProbe({render,verify=verifyCanary,now=()=>new Date().toISOString()}){
 let state={ready:false,stage:'unverified',checkedAt:null},pending=null,generation=0;
 function invalidate(){generation++;state={ready:false,stage:'unverified',checkedAt:null};}
 function probe(){
  if(pending)return pending;if(state.ready)return Promise.resolve(true);
  const epoch=++generation;state={ready:false,stage:'checking',checkedAt:null};
  const work=(async()=>{try{const result=await verify(await render(CANARY_HTML));if(epoch!==generation)return false;state={ready:true,stage:'verified',checkedAt:now(),pages:result.pages,bytes:result.bytes};return true;}
   catch{if(epoch===generation)state={ready:false,stage:'failed',checkedAt:now()};return false;}})();
  pending=work;work.finally(()=>{if(pending===work)pending=null;});return work;
 }
 return {probe,invalidate,status:()=>({...state})};
}
module.exports={createRendererProbe,verifyCanary,MARKER,CANARY_HTML};
