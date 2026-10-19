'use strict';
// Offline/opt-in only. No application export route imports this prototype.
const zlib=require('node:zlib');
const {PDFDocument,PDFName,PDFRawStream,PDFArray,PDFDict}=require('pdf-lib');
const LIMITS=Object.freeze({inputBytes:16*1024*1024,streamBytes:4*1024*1024,totalBytes:16*1024*1024,tokens:200000,pairs:20000,pages:64});
const ws=c=>c===0||c===9||c===10||c===12||c===13||c===32;
const delimiter=c=>ws(c)||[40,41,60,62,91,93,123,125,47,37].includes(c);
const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
// Exact decimal addition for the one supported affine case; never round via Number.
function addDecimal(left,right){
 if(left.length>64||right.length>64)return null;
 const parts=s=>{const negative=s[0]==='-';s=s.replace(/^[+-]/,'');const [whole,fraction='']=s.split('.');return {negative,whole:whole||'0',fraction};};
 const a=parts(left),b=parts(right),scale=Math.max(a.fraction.length,b.fraction.length);
 const integer=p=>BigInt(p.whole+p.fraction.padEnd(scale,'0'))*(p.negative?-1n:1n);
 const value=integer(a)+integer(b),sign=value<0n?'-':'',digits=(value<0n?-value:value).toString().padStart(scale+1,'0');
 return sign+(scale?digits.slice(0,-scale)+'.'+digits.slice(-scale):digits);
}
function foldStream(input){
 const bytes=Buffer.from(input);if(bytes.length>LIMITS.streamBytes)return {bytes,folded:0,reason:'stream_limit'};
 const tokens=[],groups=[];let i=0;
 const reject=reason=>({bytes,folded:0,reason});
 while(i<bytes.length){
  if(tokens.length>=LIMITS.tokens)return reject('token_limit');
  if(ws(bytes[i])){i++;continue;}
  if(bytes[i]===37){while(i<bytes.length&&bytes[i]!==10&&bytes[i]!==13)i++;continue;}
  const start=i,depth=groups.length;
  if(bytes[i]===40){
   let nested=1;i++;
   while(i<bytes.length&&nested){
    if(bytes[i]===92){i++;if(i<bytes.length){if(bytes[i]===13&&bytes[i+1]===10)i++;i++;}continue;}
    if(bytes[i]===40&&++nested>32)return reject('literal_depth');
    else if(bytes[i]===41)nested--;
    i++;
   }
   if(nested)return reject('unterminated_literal');tokens.push({kind:'opaque',start,end:i,depth});continue;
  }
  if(bytes[i]===60&&bytes[i+1]!==60){
   i++;while(i<bytes.length&&bytes[i]!==62){if(!ws(bytes[i])&&!/[0-9a-f]/i.test(String.fromCharCode(bytes[i])))return reject('invalid_hex');i++;}
   if(i===bytes.length)return reject('unterminated_hex');i++;tokens.push({kind:'opaque',start,end:i,depth});continue;
  }
  if(bytes[i]===47){i++;while(i<bytes.length&&!delimiter(bytes[i]))i++;tokens.push({kind:'name',start,end:i,depth});continue;}
  const pair=bytes.subarray(i,i+2).toString('latin1');
  if(pair==='<<'||bytes[i]===91){groups.push(pair==='<<'?'dict':'array');if(groups.length>32)return reject('group_depth');i+=pair==='<<'?2:1;tokens.push({kind:'group',start,end:i,depth});continue;}
  if(pair==='>>'||bytes[i]===93){const wanted=pair==='>>'?'dict':'array';if(groups.pop()!==wanted)return reject('unbalanced_group');i+=pair==='>>'?2:1;tokens.push({kind:'group',start,end:i,depth});continue;}
  if(delimiter(bytes[i]))return reject('unsupported_delimiter');
  while(i<bytes.length&&!delimiter(bytes[i])){if(bytes[i]<33||bytes[i]>126)return reject('invalid_token');i++;}
  const raw=bytes.subarray(start,i).toString('latin1'),kind=numeric.test(raw)?'number':'operator';
  if(kind==='operator'&&depth===0&&['BI','ID','EI'].includes(raw))return reject('inline_image');
  tokens.push({kind,raw,start,end:i,depth});
 }
 if(groups.length)return reject('unbalanced_group');
 let inside=false,pending=[],matrix=null,folded=0;const replacements=[];
 for(const token of tokens){
  if(token.kind!=='operator'||token.depth!==0){pending.push(token);continue;}
  if(token.raw==='BT'){if(inside||pending.length)return reject('text_state');inside=true;}
  if(token.raw==='ET'){if(!inside||pending.length)return reject('text_state');inside=false;}
  if(inside&&token.raw==='Td'&&matrix&&pending.length===2&&pending.every(t=>t.kind==='number')&&Number(pending[1].raw)===0){
   const tx=Number(pending[0].raw),x=Number(matrix.values[4].raw),y=Number(matrix.values[5].raw);
   const sum=addDecimal(matrix.values[4].raw,pending[0].raw);
   if(sum!==null&&Number.isFinite(tx)&&Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(tx)<=1e7&&Math.abs(x)<=1e7&&Math.abs(y)<=1e7){
    if(++folded>LIMITS.pairs)return reject('pair_limit');
    replacements.push({start:matrix.start,end:token.end,value:matrix.values.slice(0,4).map(t=>t.raw).join(' ')+' '+(x===0?pending[0].raw:sum)+' '+matrix.values[5].raw+' Tm'});
   }
  }
  matrix=inside&&token.raw==='Tm'&&pending.length===6&&pending.every(t=>t.kind==='number')&&[1,0,0,-1].every((v,j)=>Number(pending[j].raw)===v)?{start:pending[0].start,values:pending}:null;
  pending=[];
 }
 if(inside||pending.length)return reject('text_state');
 if(!folded)return {bytes,folded:0,reason:null};
 const chunks=[];let cursor=0;
 for(const r of replacements){chunks.push(bytes.subarray(cursor,r.start),Buffer.from(r.value,'ascii'));cursor=r.end;}
 chunks.push(bytes.subarray(cursor));return {bytes:Buffer.concat(chunks),folded,reason:null};
}
function decoded(stream){
 if(!(stream instanceof PDFRawStream))throw Error('unsupported_stream');
 if(stream.dict.has(PDFName.of('DecodeParms')))throw Error('decode_parameters');
 const filter=stream.dict.get(PDFName.of('Filter'));
 if(!filter)return Buffer.from(stream.getContents());
 if(!(filter instanceof PDFName)||filter.asString()!=='/FlateDecode')throw Error('unsupported_filter');
 return zlib.inflateSync(stream.getContents(),{maxOutputLength:LIMITS.streamBytes});
}
async function foldPdf(input){
 const original=Buffer.from(input),unchanged=reason=>({bytes:original,folded:0,reason});
 if(original.length>LIMITS.inputBytes)return unchanged('input_limit');
 try{
  const doc=await PDFDocument.load(original,{updateMetadata:false,ignoreEncryption:false,throwOnInvalidObject:true});
  const pages=doc.getPages();if(pages.length>LIMITS.pages)return unchanged('page_limit');
  let total=0,count=0;const planned=[];
  for(const page of pages){
   const resources=page.node.Resources(),xobjects=resources?.lookup(PDFName.of('XObject'));
   if(xobjects instanceof PDFDict)for(const [,ref] of xobjects.entries()){
    const x=doc.context.lookup(ref);if(x instanceof PDFRawStream&&x.dict.get(PDFName.of('Subtype'))===PDFName.of('Form'))return unchanged('form_xobject');
   }
   let stream=page.node.Contents();
   if(stream instanceof PDFArray){if(stream.size()!==1)return unchanged('multiple_contents');stream=stream.lookup(0);}
   if(!stream)continue;
   const data=decoded(stream);total+=data.length;if(total>LIMITS.totalBytes)return unchanged('decoded_limit');
   const result=foldStream(data);if(result.reason)return unchanged(result.reason);
   if(result.folded){count+=result.folded;if(count>LIMITS.pairs)return unchanged('pair_limit');planned.push({page,result});}
  }
  if(!count)return unchanged(null);
  for(const {page,result} of planned)page.node.set(PDFName.Contents,doc.context.register(doc.context.flateStream(result.bytes)));
  const bytes=Buffer.from(await doc.save({useObjectStreams:false,updateFieldAppearances:false,addDefaultPage:false}));
  if(bytes.length>LIMITS.inputBytes||bytes.length>original.length*1.5+128*1024)return unchanged('output_limit');
  return {bytes,folded:count,reason:null};
 }catch{return unchanged('unsupported_or_invalid_pdf');}
}
module.exports={foldStream,foldPdf,LIMITS};
if(require.main===module){
 const fs=require('node:fs');const [source,target]=process.argv.slice(2);
 if(!source||!target)throw Error('Provide owned source and target PDF paths');
 foldPdf(fs.readFileSync(source)).then(r=>{fs.writeFileSync(target,r.bytes);console.log(JSON.stringify({folded:r.folded,reason:r.reason,bytes:r.bytes.length,prototypeOnly:true}));}).catch(()=>{process.exitCode=1;});
}
