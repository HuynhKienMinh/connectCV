'use strict';
// Offline envelope only. No credential discovery, database/network, file writes or restore mutation.
const crypto=require('node:crypto');
const MAGIC=Buffer.from('CCVDB01\n'),MAX_BYTES=32*1024*1024,MAX_DOCUMENTS=100000;
const scope={projectId:'connect-cv',databaseId:'(default)'};
const root='projects/connect-cv/databases/(default)/documents/';
const invalid=()=>new Error('BACKUP_SNAPSHOT_INVALID');
function canonical(value,depth=0){
 if(depth>40)throw invalid();
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'){if(!Number.isFinite(value))throw invalid();return Object.is(value,-0)?'-0':JSON.stringify(value);}
 if(Array.isArray(value)){for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw invalid();return '['+value.map(v=>canonical(v,depth+1)).join(',')+']';}
 if(typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value)))return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 throw invalid();
}
function relativePath(name,document){
 if(typeof name!=='string'||!name.startsWith(root))throw invalid();
 const relative=name.slice(root.length),parts=relative.split('/');
 if(parts.length%2!==(document?0:1)||parts.some(p=>!p||p==='.'||p==='..'||Buffer.byteLength(p)>1500))throw invalid();
 return relative;
}
function validate(snapshot){
 if(!snapshot||snapshot.version!==1||snapshot.projectId!==scope.projectId||snapshot.databaseId!==scope.databaseId||typeof snapshot.readTime!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(snapshot.readTime))throw invalid();
 if(!Array.isArray(snapshot.documents)||snapshot.documents.length>MAX_DOCUMENTS||!Array.isArray(snapshot.collectionPaths)||!Array.isArray(snapshot.missingParents)||snapshot.collectionPaths.length>MAX_DOCUMENTS||snapshot.missingParents.length>MAX_DOCUMENTS)throw invalid();
 const collections=new Set(),names=new Set(),missing=new Set();
 for(const name of snapshot.collectionPaths){if(typeof name!=='string')throw invalid();relativePath(root+name,false);if(collections.has(name))throw invalid();collections.add(name);}
 for(const doc of snapshot.documents){
  if(!doc||!doc.fields||Array.isArray(doc.fields)||typeof doc.fields!=='object')throw invalid();
  const name=relativePath(doc.name,true);if(names.has(name)||!collections.has(name.slice(0,name.lastIndexOf('/'))))throw invalid();names.add(name);
 }
 for(const name of snapshot.missingParents){const relative=relativePath(name,true);if(names.has(relative)||missing.has(relative)||!collections.has(relative.slice(0,relative.lastIndexOf('/'))))throw invalid();missing.add(relative);}
 return snapshot;
}
function checkKey(key){if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('BACKUP_KEY_INVALID');}
function cap(maxBytes){if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_BYTES)throw new Error('BACKUP_LIMIT_INVALID');return maxBytes;}
function digest(snapshot){return crypto.createHash('sha256').update(canonical(validate(snapshot))).digest('hex');}
function serializedSize(snapshot){return Buffer.byteLength(canonical(validate(snapshot)));}
function seal(snapshot,key,keyId,{maxBytes=MAX_BYTES}={}){
 checkKey(key);cap(maxBytes);validate(snapshot);
 if(typeof keyId!=='string'||keyId.length!==36||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(keyId))throw new Error('BACKUP_KEY_ID_INVALID');
 const plain=Buffer.from(canonical(snapshot));
 try{
  if(plain.length>maxBytes)throw new Error('BACKUP_CAPACITY_EXCEEDED');
  const header=Buffer.from(JSON.stringify({version:1,algorithm:'aes-256-gcm',keyId,...scope})),length=Buffer.alloc(4);length.writeUInt32BE(header.length);
  const nonce=crypto.randomBytes(12),prefix=Buffer.concat([MAGIC,length,header,nonce]),cipher=crypto.createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
  cipher.setAAD(prefix);const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]),archive=Buffer.concat([prefix,encrypted,cipher.getAuthTag()]);
  return {archive,catalog:{formatVersion:1,...scope,keyId,sha256:crypto.createHash('sha256').update(archive).digest('hex'),bytes:archive.length,documentCount:snapshot.documents.length,collectionCount:snapshot.collectionPaths.length,missingParentCount:snapshot.missingParents.length}};
 }finally{plain.fill(0);}
}
function open(archive,key,{maxBytes=MAX_BYTES}={}){
 checkKey(key);cap(maxBytes);let chunk,plain;
 try{
  if(!Buffer.isBuffer(archive)||archive.length<64||archive.length>maxBytes+2100||!archive.subarray(0,MAGIC.length).equals(MAGIC))throw invalid();
  const headerSize=archive.readUInt32BE(MAGIC.length),offset=MAGIC.length+4+headerSize;
  if(headerSize<2||headerSize>2048||offset+12+16>=archive.length||archive.length-offset-12-16>maxBytes)throw invalid();
  const header=JSON.parse(archive.subarray(MAGIC.length+4,offset).toString('utf8'));
  if(header.version!==1||header.algorithm!=='aes-256-gcm'||header.projectId!==scope.projectId||header.databaseId!==scope.databaseId)throw invalid();
  const nonce=archive.subarray(offset,offset+12),decipher=crypto.createDecipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
  decipher.setAAD(archive.subarray(0,offset+12));decipher.setAuthTag(archive.subarray(-16));
  chunk=decipher.update(archive.subarray(offset+12,-16));const end=decipher.final();
  plain=Buffer.concat([chunk,end]);const snapshot=validate(JSON.parse(plain.toString('utf8')));
  // Never expose plaintext or a decoded snapshot before authentication succeeds.
  return {snapshot,keyId:header.keyId};
 }catch{throw new Error('BACKUP_ARCHIVE_INVALID');}
 finally{chunk?.fill(0);plain?.fill(0);}
}
module.exports={seal,open,digest,serializedSize,MAX_BYTES};
