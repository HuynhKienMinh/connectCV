'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {seal,open,digest,MAX_BYTES}=require('../ops/snapshotEnvelope.cjs');
const root='projects/connect-cv/databases/(default)/documents/';
function fixture(){return {version:1,projectId:'connect-cv',databaseId:'(default)',readTime:'2026-10-15T18:52:33.123456Z',collectionPaths:['accounts','communityPosts','communityPosts/missing-parent/likes'],missingParents:[root+'communityPosts/missing-parent'],documents:[
 {name:root+'accounts/synthetic-A',fields:{name:{stringValue:'PRIVATE_SYNTHETIC_NAME'},balance:{integerValue:'9223372036854775807'},created:{timestampValue:'2026-10-15T18:52:33.123456789Z'},null:{nullValue:null},yes:{booleanValue:true},bytes:{bytesValue:'AAEC/w=='},point:{geoPointValue:{latitude:10.5,longitude:106.7}},reference:{referenceValue:root+'accounts/synthetic-B'},special:{doubleValue:'NaN'},list:{arrayValue:{values:[{doubleValue:'Infinity'},{mapValue:{fields:{nested:{stringValue:'Thông tin giả có dấu'}}}}]}}}},
 {name:root+'communityPosts/missing-parent/likes/synthetic-B',fields:{at:{timestampValue:'2026-10-15T18:00:00Z'}}}
 ]};}
test('offline typed snapshot round trip preserves int64, nanoseconds, bytes, references and missing-parent subcollections',()=>{
 const snapshot=fixture(),key=crypto.randomBytes(32),keyId=crypto.randomUUID(),before=structuredClone(snapshot),sealed=seal(snapshot,key,keyId),result=open(sealed.archive,key);
 assert.deepEqual(result.snapshot,snapshot);assert.equal(result.keyId,keyId);assert.deepEqual(snapshot,before);
 const target=new Map(result.snapshot.documents.map(doc=>[doc.name,structuredClone(doc.fields)]));assert.equal(target.size,2);assert.deepEqual(target.get(root+'accounts/synthetic-A'),snapshot.documents[0].fields);assert.equal(target.has(snapshot.missingParents[0]),false);
 assert.equal(digest(result.snapshot),digest(snapshot));assert.doesNotMatch(JSON.stringify(sealed.catalog),/PRIVATE_|synthetic-A|synthetic-B|readTime|referenceValue|bytesValue/);assert.equal(sealed.catalog.documentCount,2);assert.equal(sealed.catalog.missingParentCount,1);
 key.fill(0);
});
test('fresh random nonce produces different authenticated ciphertext for the same snapshot and key',()=>{
 const key=crypto.randomBytes(32),id=crypto.randomUUID(),a=seal(fixture(),key,id),b=seal(fixture(),key,id);assert.notDeepEqual(a.archive,b.archive);assert.notEqual(a.catalog.sha256,b.catalog.sha256);assert.deepEqual(open(a.archive,key),open(b.archive,key));assert.equal(a.archive.includes(Buffer.from('PRIVATE_SYNTHETIC_NAME')),false);key.fill(0);
});
test('wrong key, header/ciphertext/tag modification, truncation and appended bytes all fail without plaintext error echo',()=>{
 const key=crypto.randomBytes(32),original=seal(fixture(),key,crypto.randomUUID()).archive,offset=12+original.readUInt32BE(8);
 const wrong=crypto.randomBytes(32);assert.throws(()=>open(original,wrong),/^Error: BACKUP_ARCHIVE_INVALID$/);wrong.fill(0);
 for(const index of [0,9,20,offset,offset+12,original.length-1]){const changed=Buffer.from(original);changed[index]^=1;assert.throws(()=>open(changed,key),/^Error: BACKUP_ARCHIVE_INVALID$/);}
 for(const changed of [original.subarray(0,40),original.subarray(0,-1),Buffer.concat([original,Buffer.from('x')])])assert.throws(()=>open(changed,key),/^Error: BACKUP_ARCHIVE_INVALID$/);key.fill(0);
});
test('strict scope, inventory, duplicate paths and non-JSON SDK objects are rejected before sealing',()=>{
 const key=crypto.randomBytes(32),id=crypto.randomUUID();
 for(const mutate of [s=>s.projectId='other-project',s=>s.databaseId='other-db',s=>s.documents[0].name=root+'accounts/../escape',s=>s.documents.push(s.documents[0]),s=>s.collectionPaths=[],s=>s.missingParents.push(s.documents[0].name),s=>s.documents[0].fields.when=new Date(),s=>s.documents[0].fields.value=NaN,s=>s.documents[0].fields.value=undefined]){const s=fixture();mutate(s);assert.throws(()=>seal(s,key,id),/^Error: BACKUP_SNAPSHOT_INVALID$/);}
 key.fill(0);
});
test('capacity and key contract fail closed without weakening limits or accepting password strings',()=>{
 const key=crypto.randomBytes(32),s=fixture(),id=crypto.randomUUID(),archive=seal(s,key,id).archive;
 assert.throws(()=>seal(s,key,id,{maxBytes:32}),/BACKUP_CAPACITY_EXCEEDED/);assert.throws(()=>open(archive,key,{maxBytes:32}),/BACKUP_ARCHIVE_INVALID/);
 for(const value of [0,MAX_BYTES+1,Infinity])assert.throws(()=>seal(s,key,id,{maxBytes:value}),/BACKUP_LIMIT_INVALID/);
 for(const value of ['password',Buffer.alloc(16),undefined])assert.throws(()=>seal(s,value,id),/BACKUP_KEY_INVALID/);assert.throws(()=>seal(s,key,'owner-email@example.invalid'),/BACKUP_KEY_ID_INVALID/);key.fill(0);
});
test('canonical digest keeps map key order independent without coercing Firestore wire types',()=>{
 const a=fixture(),b=fixture();b.documents[0].fields=Object.fromEntries(Object.entries(b.documents[0].fields).reverse());assert.equal(digest(a),digest(b));b.documents[0].fields.balance={stringValue:'9223372036854775807'};assert.notEqual(digest(a),digest(b));
});
test('negative zero remains distinguishable and sparse arrays/invalid metadata cannot silently change on round trip',()=>{
 const key=crypto.randomBytes(32),id=crypto.randomUUID(),s=fixture();s.documents[0].fields.negativeZero={doubleValue:-0};
 const restored=open(seal(s,key,id).archive,key).snapshot;assert.equal(Object.is(restored.documents[0].fields.negativeZero.doubleValue,-0),true);
 for(const mutate of [s=>s.documents[0].fields.sparse={arrayValue:{values:new Array(2)}},s=>s.collectionPaths.push({}),s=>s.collectionPaths.push(s.collectionPaths[0]),s=>s.missingParents.push(root+'unknown/missing')]){const value=fixture();mutate(value);assert.throws(()=>seal(value,key,id),/BACKUP_SNAPSHOT_INVALID/);}
 assert.throws(()=>seal(s,key,id+'\n'),/BACKUP_KEY_ID_INVALID/);key.fill(0);
});
