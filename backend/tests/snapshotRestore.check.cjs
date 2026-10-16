'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const manifest=require('../ops/firestoreEmulatorManifest.json'),{seal,open}=require('../ops/snapshotEnvelope.cjs'),{collectSnapshot}=require('../ops/snapshotCollector.cjs'),{restoreToEmulator}=require('../ops/emulatorRestore.cjs');
const {createEncryptedSnapshot}=require('../ops/encryptedSnapshot.cjs');
const ROOT='projects/connect-cv/databases/(default)/documents',DEMO='projects/demo-connectcv-backup/databases/(default)/documents';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
async function binary(stage){
 const filename=process.env.FIRESTORE_EMULATOR_JAR||path.join(stage,manifest.filename);
 if(!process.env.FIRESTORE_EMULATOR_JAR){
  const r=await fetch(manifest.url,{redirect:'error',signal:AbortSignal.timeout(60000)});assert.equal(r.status,200);
  const file=await fsp.open(filename,'wx',0o600);let bytes=0;
  try{for await(const chunk of r.body){bytes+=chunk.length;assert.ok(bytes<=manifest.bytes);await file.write(chunk);}}finally{await file.close();}
 }
 assert.equal((await fsp.stat(filename)).size,manifest.bytes);const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(filename))hash.update(chunk);assert.equal(hash.digest('hex'),manifest.sha256);return filename;
}
function fixture(){const at='2026-10-15T19:22:00.123456Z';return {version:1,projectId:'connect-cv',databaseId:'(default)',readTime:at,collectionPaths:['accounts','communityPosts','communityPosts/ghost/likes'],missingParents:[ROOT+'/communityPosts/ghost'],documents:[
 {name:ROOT+'/accounts/A',fields:{credits:{integerValue:'20'},dailyCount:{integerValue:'0'},name:{stringValue:'Ứng viên GIẢ LẬP'},wide:{integerValue:'9223372036854775807'},bytes:{bytesValue:'AAEC/w=='},at:{timestampValue:at},flag:{booleanValue:true},empty:{nullValue:null},geo:{geoPointValue:{latitude:10.5,longitude:106.7}},ref:{referenceValue:ROOT+'/accounts/B'},items:{arrayValue:{values:[{stringValue:'Dữ liệu giả'},{mapValue:{fields:{score:{doubleValue:3.5}}}}]}}}},
 {name:ROOT+'/accounts/B',fields:{credits:{integerValue:'15'},dailyCount:{integerValue:'0'}}},
 {name:ROOT+'/communityPosts/ghost/likes/B',fields:{at:{timestampValue:at}}}
 ]};}
(async()=>{
 const parent=path.resolve(process.env.RUNNER_TEMP||path.join(__dirname,'../..')),stage=await fsp.mkdtemp(path.join(parent,'.tmp-connectcv-restore-'));
 let child,logs='',exit,key;
 try{
  const disk=await fsp.statfs(stage);assert.ok(disk.bavail*disk.bsize>=512*1024*1024,'EMULATOR_STAGING_CAPACITY_REQUIRED');
  const jar=await binary(stage),p=await port(),web=await port(),socket=await port(),origin='http://127.0.0.1:'+p;
  const rules=path.join(stage,'fixture.rules');await fsp.writeFile(rules,"rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /{document=**} { allow read, write: if true; } } }");
  const env={...process.env,GCLOUD_PROJECT:'demo-connectcv-backup',GOOGLE_CLOUD_PROJECT:'demo-connectcv-backup'};delete env.GOOGLE_APPLICATION_CREDENTIALS;delete env.FIREBASE_CONFIG;
  // Windows javapath may be a launcher spawning an orphan JVM. Require the
  // direct JDK executable there so the process we own is also the one we kill.
  const java=process.env.JAVA_EXECUTABLE||(process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'):(process.platform==='win32'?null:'java'));
  assert.ok(java,'DIRECT_JAVA_EXECUTABLE_REQUIRED');
  child=spawn(java,['-Djava.awt.headless=true','-Duser.language=en','-jar',jar,'--host','127.0.0.1','--port',String(p),'--webchannel_port',String(web),'--websocket_port',String(socket),'--project_id','demo-connectcv-backup','--single_project_mode','true','--rules',rules],{cwd:stage,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  exit=new Promise(r=>{child.once('close',r);child.once('error',r);});for(const stream of [child.stdout,child.stderr])stream.on('data',b=>logs=(logs+b.toString()).slice(-4000));
  let ready=false;for(let i=0;i<300;i++){
   if(child.exitCode!==null)break;
   try{const r=await fetch(origin+'/v1/'+DEMO+':listCollectionIds',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:'{}',signal:AbortSignal.timeout(500)});await r.body?.cancel();if(r.status===200){ready=true;break;}}catch{}await delay(100);
  }
  assert.ok(ready,'EMULATOR_START_FAILED '+logs);
  const snapshot=fixture();key=crypto.randomBytes(32);const archive=seal(snapshot,key,crypto.randomUUID()).archive,rows=[];
  let requests=0;const counted=async(...args)=>{requests++;return fetch(...args);};
  const damaged=Buffer.from(archive);damaged[damaged.length-1]^=1;
  await assert.rejects(restoreToEmulator({archive:damaged,key,origin,fetchImpl:counted}),/PREFLIGHT_FAILED/);assert.equal(requests,0);rows.push('tamper-before-any-write');
  for(const bad of ['https://connectcv-api-minh.onrender.com','http://localhost:8080','http://127.0.0.1:8080/path'])await assert.rejects(restoreToEmulator({archive,key,origin:bad,fetchImpl:counted}),/PREFLIGHT_FAILED/);assert.equal(requests,0);rows.push('non-demo-origin-rejected');
  const restored=await restoreToEmulator({archive,key,origin,fetchImpl:counted});assert.equal(restored.written,3);rows.push('real-emulator-restore');
  await assert.rejects(restoreToEmulator({archive,key,origin}),/TARGET_NOT_EMPTY/);rows.push('refuse-existing-target');
  // The emulator is quiescent: no concurrent writers. This adapter deliberately
  // omits historical readTime; it does not prove production readTime semantics.
  const request=async spec=>{
   const localPath=spec.path.replace('/v1/'+ROOT,'/v1/'+DEMO),url=new URL(origin+localPath),input={...(spec.body||spec.query)};delete input.readTime;
   if(spec.method==='GET')for(const [k,v]of Object.entries(input))url.searchParams.set(k,String(v));
   const r=await fetch(url,{method:spec.method,headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},...(spec.method==='POST'?{body:JSON.stringify(input)}:{}),signal:spec.signal,redirect:'error'});
   const body=await r.json();if(body.documents)for(const doc of body.documents)doc.name=doc.name.replace(DEMO+'/',ROOT+'/');
   return {status:r.status,body:Buffer.from(JSON.stringify(body))};
  };
  const copied=await collectSnapshot({request,readTime:new Date(Date.now()-1000).toISOString()});
  const values=s=>Object.fromEntries(s.documents.map(d=>[d.name,d.fields]));assert.deepEqual(values(copied),values(snapshot));assert.deepEqual(copied.missingParents,snapshot.missingParents);assert.deepEqual(copied.collectionPaths,snapshot.collectionPaths);rows.push('reexport-all-paths-types-and-missing-parent');
  const again=open(seal(copied,key,crypto.randomUUID()).archive,key).snapshot;assert.deepEqual(values(again),values(snapshot));rows.push('reexport-encrypt-readback');
  // Exercise the whole wrapper against this owned, quiescent emulator. The
  // adapter never follows the production URL: it asserts fixed scope then maps
  // to the loopback instance just spawned above. No real credential is used.
  let credentialCalls=0,zeroQueries=0;
  const wrapperFetch=async(address,options)=>{
   const cloud=new URL(address);assert.equal(cloud.origin,'https://firestore.googleapis.com');assert.ok(cloud.pathname.startsWith('/v1/'+ROOT));
   assert.equal(options.headers.Authorization,'Bearer SYNTHETIC_WRAPPER_ACCESS_TOKEN');
   const local=new URL(origin+cloud.pathname.replace('/v1/'+ROOT,'/v1/'+DEMO));
   for(const [k,v]of cloud.searchParams)if(k!=='readTime')local.searchParams.set(k,v);
   let body=options.body?JSON.parse(options.body):undefined;if(body)delete body.readTime;
   if(local.pathname.endsWith(':runQuery')){assert.equal(body.structuredQuery.limit,0);zeroQueries++;}
   const response=await fetch(local,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},...(body?{body:JSON.stringify(body)}:{})});
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;assert.ok(size<=65536,'SYNTHETIC_RESPONSE_CAP');chunks.push(Buffer.from(part.value));}}finally{await reader.cancel();reader.releaseLock();}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(data.documents)for(const doc of data.documents)doc.name=doc.name.replace(DEMO+'/',ROOT+'/');
   return new Response(JSON.stringify(data),{status:response.status,headers:{'Content-Type':'application/json'}});
  };
  const exported=await createEncryptedSnapshot({key,keyId:crypto.randomUUID(),custody:{status:'OWNER_CONFIRMED',method:'owner-offline',recoveryVerified:true},credential:{getAccessToken:async()=>{credentialCalls++;return {access_token:'SYNTHETIC_WRAPPER_ACCESS_TOKEN',expires_in:3600};}},fetchImpl:wrapperFetch});
  const decoded=open(exported.archive,key).snapshot;
  assert.equal(zeroQueries,1);assert.equal(credentialCalls,1);assert.deepEqual(values(decoded),values(snapshot));assert.deepEqual(decoded.missingParents,snapshot.missingParents);assert.deepEqual(decoded.collectionPaths,snapshot.collectionPaths);assert.equal(exported.catalog.localReadbackVerified,true);assert.equal(exported.catalog.cloudVerified,false);assert.equal(exported.catalog.restoreVerified,false);rows.push('wrapper-real-zero-query-and-typed-export');
  // Official emulator-only flush endpoint, only on our child instance and fixed
  // demo project. No flush helper is exposed by the application/ops modules.
  assert.equal(child.exitCode,null);assert.equal(child.signalCode,null);
  const flushed=await fetch(origin+'/emulator/v1/'+DEMO,{method:'DELETE',headers:{Authorization:'Bearer owner'},redirect:'error',signal:AbortSignal.timeout(10000)});assert.equal(flushed.status,200);await flushed.body?.cancel();
  const second=await restoreToEmulator({archive:exported.archive,key,origin});assert.equal(second.written,3);rows.push('wrapper-archive-restored-to-empty-emulator');
  const twice=await collectSnapshot({request,readTime:new Date(Date.now()-1000).toISOString()});assert.deepEqual(values(twice),values(decoded));assert.deepEqual(twice.missingParents,decoded.missingParents);assert.deepEqual(twice.collectionPaths,decoded.collectionPaths);rows.push('wrapper-restored-reexport-all-values-and-inventory');
  console.log(JSON.stringify({synthetic:true,cloudReads:0,cloudWrites:0,emulatorVersion:manifest.version,jarSha256:manifest.sha256,documents:copied.documents.length,missingParents:copied.missingParents.length,wrapperEmulatorCompositionVerified:true,emulatorZeroQueryVerified:true,productionReadTimeVerified:false,sourceSystemMetadataRestored:false,rows,passed:true}));
 }catch(error){console.error(error.stack);if(logs)console.error('SYNTHETIC_EMULATOR_LOG '+logs);process.exitCode=1;}
 finally{
  key?.fill(0);if(child&&child.exitCode===null){child.kill();await Promise.race([exit,delay(5000)]);if(child.exitCode===null){child.kill('SIGKILL');await exit;}}
  const resolved=path.resolve(stage);assert.ok(resolved.startsWith(parent+path.sep+'.tmp-connectcv-restore-'));await fsp.rm(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:500});
 }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
