'use strict';
// Read planner/parser only: request transport must be injected. No default fetch,
// credential discovery, file/Drive access or database mutation is provided here.
const {performance}=require('node:perf_hooks');
const {serializedSize,MAX_BYTES}=require('./snapshotEnvelope.cjs');
const ROOT='projects/connect-cv/databases/(default)/documents';
const defaults={maxBytes:MAX_BYTES,maxPageBytes:2*1024*1024,maxPages:1000,maxDocuments:100000,maxCollections:100000,maxDepth:100,timeoutMs:10000,deadlineMs:120000};
const fail=code=>new Error('SNAPSHOT_'+code);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function segment(value){if(typeof value!=='string'||!value||value==='.'||value==='..'||value.includes('/')||Buffer.byteLength(value)>1500)throw fail('RESPONSE_INVALID');try{encodeURIComponent(value);}catch{throw fail('RESPONSE_INVALID');}return value;}
function resource(relative){return '/v1/'+ROOT+(relative?'/'+relative.split('/').map(encodeURIComponent).join('/'):'');}
function validateCollectorLimits(limits={}){
 if(!object(limits))throw fail('CONFIG_INVALID');const config={...defaults};
 for(const [name,value]of Object.entries(limits)){if(!Object.hasOwn(defaults,name)||!Number.isSafeInteger(value)||value<1||value>defaults[name])throw fail('LIMIT_INVALID');config[name]=value;}
 return config;
}
async function collectSnapshot({request,readTime,clock=Date.now,limits={},signal}={}){
 if(typeof request!=='function'||typeof clock!=='function'||!object(limits))throw fail('CONFIG_INVALID');
 const config=validateCollectorLimits(limits);
 if(typeof readTime!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(readTime))throw fail('READ_TIME_INVALID');
 const timestamp=Date.parse(readTime);if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,19)!==readTime.slice(0,19))throw fail('READ_TIME_INVALID');
 const started=performance.now();let pages=0,rawBytes=0;
 const snapshot={version:1,projectId:'connect-cv',databaseId:'(default)',readTime,collectionPaths:[],missingParents:[],documents:[]};
 let retainedBytes=Buffer.byteLength(JSON.stringify(snapshot));
 if(retainedBytes>config.maxBytes)throw fail('CAPACITY_EXCEEDED');
 function check(){
  if(signal?.aborted)throw fail('CANCELLED');
  const age=clock()-timestamp;if(!Number.isFinite(age)||age<0||age>=59*60000)throw fail('READ_WINDOW_EXPIRED');
  if(performance.now()-started>=config.deadlineMs)throw fail('DEADLINE');
 }
 function retain(value){retainedBytes+=Buffer.byteLength(JSON.stringify(value))+1;if(retainedBytes>config.maxBytes)throw fail('CAPACITY_EXCEEDED');}
 async function read(spec){
  check();if(++pages>config.maxPages)throw fail('PAGE_LIMIT');
  const controller=new AbortController();let timer,cancel;
  try{
   const wait=Math.max(1,Math.ceil(Math.min(config.timeoutMs,config.deadlineMs-(performance.now()-started))));
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('TIMEOUT'));},wait);});
   const cancelled=new Promise((_,reject)=>{cancel=()=>{controller.abort();reject(fail('CANCELLED'));};signal?.addEventListener('abort',cancel,{once:true});});
   const operation=Promise.resolve().then(()=>request({...spec,signal:controller.signal,maxResponseBytes:config.maxPageBytes})).catch(()=>{throw fail('READ_FAILED');});
   const response=await Promise.race([operation,timeout,cancelled]);check();
   if(!response||response.status!==200){const code={401:'AUTH_REQUIRED',403:'PERMISSION_DENIED',429:'RATE_LIMITED'}[response?.status]||'READ_FAILED';throw fail(code);}
   if(!Buffer.isBuffer(response.body)||response.body.length>config.maxPageBytes)throw fail('PAGE_CAPACITY_EXCEEDED');
   rawBytes+=response.body.length;if(rawBytes>config.maxBytes)throw fail('CAPACITY_EXCEEDED');
   let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(response.body));}catch{throw fail('RESPONSE_INVALID');}
   if(!object(body))throw fail('RESPONSE_INVALID');return body;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 async function paginate(spec,key,consume){
  let token;const tokens=new Set();
  do{
   const body=await read(spec(token));
   if(Object.keys(body).some(name=>name!==key&&name!=='nextPageToken'))throw fail('RESPONSE_INVALID');
   if(Object.hasOwn(body,key)&&!Array.isArray(body[key]))throw fail('RESPONSE_INVALID');
   for(const value of body[key]||[])consume(value);
   token=body.nextPageToken;
   if(token!==undefined&&token!==''){
    if(typeof token!=='string'||token.length>4096)throw fail('RESPONSE_INVALID');
    if(tokens.has(token))throw fail('CURSOR_LOOP');tokens.add(token);
   }
  }while(token);
 }
 const parents=[''],documents=new Set(),collections=new Set();
 for(let at=0;at<parents.length;at++){
  const parent=parents[at],children=[];
  await paginate(token=>({method:'POST',path:resource(parent)+':listCollectionIds',body:{pageSize:100,readTime,...(token?{pageToken:token}:{})}}),'collectionIds',id=>{
   segment(id);const name=parent?parent+'/'+id:id;
   if(name.split('/').length>config.maxDepth)throw fail('DEPTH_LIMIT');
   if(collections.has(name))throw fail('DUPLICATE_RECORD');
   if(collections.size>=config.maxCollections)throw fail('COLLECTION_LIMIT');
   retain(name);collections.add(name);snapshot.collectionPaths.push(name);children.push(name);
  });
  for(const collection of children){
   await paginate(token=>({method:'GET',path:resource(collection),query:{pageSize:100,readTime,showMissing:true,...(token?{pageToken:token}:{})}}),'documents',doc=>{
    if(!object(doc)||typeof doc.name!=='string'||!doc.name.startsWith(ROOT+'/'))throw fail('RESPONSE_INVALID');
    const relative=doc.name.slice(ROOT.length+1),parts=relative.split('/');parts.forEach(segment);
    if(parts.length%2||parts.slice(0,-1).join('/')!==collection)throw fail('RESPONSE_INVALID');
    if(parts.length>config.maxDepth)throw fail('DEPTH_LIMIT');
    if(documents.has(doc.name))throw fail('DUPLICATE_RECORD');
    if(documents.size>=config.maxDocuments)throw fail('DOCUMENT_LIMIT');
    if(!Object.hasOwn(doc,'fields')&&!Object.hasOwn(doc,'createTime')&&!Object.hasOwn(doc,'updateTime')){retain(doc.name);snapshot.missingParents.push(doc.name);}
    else{
     const fields=Object.hasOwn(doc,'fields')?doc.fields:{};if(!object(fields))throw fail('RESPONSE_INVALID');
     const record={name:doc.name,fields};
     for(const key of ['createTime','updateTime'])if(Object.hasOwn(doc,key)){if(typeof doc[key]!=='string')throw fail('RESPONSE_INVALID');record[key]=doc[key];}
     retain(record);snapshot.documents.push(record);
    }
    documents.add(doc.name);parents.push(relative);
   });
  }
 }
 check();snapshot.collectionPaths.sort();snapshot.missingParents.sort();snapshot.documents.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 let bytes;try{bytes=serializedSize(snapshot);}catch{throw fail('CONTENT_INVALID');}
 if(bytes>config.maxBytes)throw fail('CAPACITY_EXCEEDED');
 return snapshot;
}
module.exports={collectSnapshot,validateCollectorLimits};
