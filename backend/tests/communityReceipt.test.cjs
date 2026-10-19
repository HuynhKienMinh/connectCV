'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PortfolioTestDB}=require('./helpers/portfolioFixture.cjs');
const {FirestoreCommunity}=require('../src/services/firestoreCommunity');
const {CommunityStore}=require('../features/connectcv/src/services/communityStore');
const {samePublication}=require('../src/services/communityReceipt');
const entry={companyName:'Công ty Giả Lập',position:'Chuyên viên bán lẻ',reviewText:'Buổi phỏng vấn giả định.',interviewQuestions:Array.from({length:6},(_,i)=>'Bạn xử lý tình huống bán lẻ số '+i+' như thế nào?'),anonymous:true,difficultyRating:3,sharedAt:'2026-10-18T13:00:00.000Z',authorName:'Ứng viên Ẩn danh'};
async function fixture(){const db=new PortfolioTestDB();db.records.set('accounts/A',{credits:15,dailyCount:0});db.records.set('accounts/B',{credits:15,dailyCount:0});
 const run=db.runTransaction.bind(db);db.writes=[];db.runTransaction=fn=>run(tx=>fn({...tx,...Object.fromEntries(['create','update','delete'].map(method=>[method,(ref,...args)=>{db.writes.push(method+':'+ref.path);return tx[method](ref,...args);}]))}));
 return {db,store:new FirestoreCommunity(db)};}
const conflict=e=>e.status===409&&!/rewardId|debriefId|ownerId/.test(JSON.stringify(e));
test('concurrent exact owner retries return one original receipt and award only once across service restart',async()=>{
 const {db,store}=await fixture();const results=await Promise.all(Array.from({length:8},()=>store.submit({id:'A'},entry,'coarse-hash')));
 assert.equal(results.filter(r=>r.awardedCredits===5).length,1);assert.equal(results.filter(r=>r.alreadyShared&&r.awardedCredits===0).length,7);
 assert.equal(new Set(results.map(r=>r.debriefId)).size,1);assert.equal(db.records.get('accounts/A').credits,20);assert.equal(db.records.get('accounts/B').credits,15);
 assert.equal(db.writes.length,4);db.writes=[];
 const before=structuredClone([...db.records]),receipt=await new FirestoreCommunity(db).submit({id:'A'},entry,'coarse-hash');assert.deepEqual([...db.records],before);assert.deepEqual(db.writes,[]);assert.equal(receipt.awardedCredits,0);assert.equal(receipt.creditStatus,'awarded');assert.equal(receipt.publishedAt,results[0].publishedAt);
 assert.deepEqual(Object.keys(receipt).sort(),['alreadyShared','awardedCredits','cooldownStartedAt','creditStatus','debriefId','pendingCredits','publishedAt','rewardId']);
});
test('coarse hash collisions never confirm edited review, sixth question, privacy, rating or case changes',async()=>{
 const {db,store}=await fixture();await store.submit({id:'A'},entry,'coarse-hash');const before=structuredClone([...db.records]);
 for(const changed of [{reviewText:'Bản đánh giá đã thay đổi.'},{interviewQuestions:[...entry.interviewQuestions.slice(0,5),'Bạn hỗ trợ nhân viên mới trong ca trực như thế nào?']},{anonymous:false},{difficultyRating:4},{companyName:entry.companyName.toUpperCase()},{position:entry.position.toUpperCase()}])await assert.rejects(store.submit({id:'A'},{...entry,...changed},'coarse-hash'),conflict);
 assert.deepEqual([...db.records],before);
});
test('another actor cannot recover the owner receipt even with full matching public content',async()=>{
 const {db,store}=await fixture();await store.submit({id:'A'},entry,'coarse-hash');const before=structuredClone([...db.records]);await assert.rejects(store.submit({id:'B'},entry,'coarse-hash'),conflict);assert.deepEqual([...db.records],before);
});
test('missing or inconsistent reward evidence fails closed without repairing data or awarding credits',async()=>{
 for(const mutation of [null,{uid:'B'},{postId:'other'},{type:'other'},{amount:999}]){
  const {db,store}=await fixture(),first=await store.submit({id:'A'},entry,'coarse-hash'),key='creditEvents/'+first.rewardId;
  if(mutation===null)db.records.delete(key);else Object.assign(db.records.get(key),mutation);
  const before=structuredClone([...db.records]);await assert.rejects(store.submit({id:'A'},entry,'coarse-hash'),conflict);assert.deepEqual([...db.records],before);
 }
});
test('orphaned/unsafe hash pointers and missing accounts return no receipt and write nothing',async()=>{
 for(const change of ['missing-post','unsafe-id','missing-account']){
  const {db,store}=await fixture(),first=await store.submit({id:'A'},entry,'coarse-hash');
  if(change==='missing-post')db.records.delete('communityPosts/'+first.debriefId);
  if(change==='unsafe-id')db.records.get('communityHashes/coarse-hash').postId='../../accounts/A';
  if(change==='missing-account')db.records.delete('accounts/A');
  const before=structuredClone([...db.records]);await assert.rejects(store.submit({id:'A'},entry,'coarse-hash'),conflict);assert.deepEqual([...db.records],before);
 }
});
test('hidden/unknown posts and malformed historical records are not treated as confirmed public retries',async()=>{
 for(const change of [{moderationStatus:'hidden'},{moderationStatus:'future-state'},{sharedAt:'invalid'},{difficultyRating:undefined},{anonymous:undefined}]){
  const {db,store}=await fixture(),first=await store.submit({id:'A'},entry,'coarse-hash');Object.assign(db.records.get('communityPosts/'+first.debriefId),change);
  const before=structuredClone([...db.records]);await assert.rejects(store.submit({id:'A'},entry,'coarse-hash'),conflict);assert.deepEqual([...db.records],before);
 }
});
test('file fallback recovers pending receipt after restart without duplicating ledger or promising credited balance',async t=>{
 const tempRoot=path.resolve(__dirname,'../../tmp');fs.mkdirSync(tempRoot,{recursive:true});const dir=fs.mkdtempSync(path.join(tempRoot,'community-receipt-'));
 t.after(()=>{assert.ok(dir.startsWith(tempRoot+path.sep));assert.equal(fs.lstatSync(dir).isSymbolicLink(),false);fs.rmSync(dir,{recursive:true,force:true});});
 const file=path.join(dir,'store.json'),store=new CommunityStore(file);const initial=await store.submit({id:'A'},entry,'coarse-hash'),before=fs.readFileSync(file,'utf8');
 const retry=await new CommunityStore(file).submit({id:'A'},entry,'coarse-hash');assert.equal(retry.debriefId,initial.debriefId);assert.equal(retry.awardedCredits,0);assert.equal(retry.pendingCredits,5);assert.equal(retry.creditStatus,'pending');assert.equal(retry.alreadyShared,true);assert.equal(fs.readFileSync(file,'utf8'),before);
 await assert.rejects(new CommunityStore(file).submit({id:'B'},entry,'coarse-hash'),conflict);await assert.rejects(new CommunityStore(file).submit({id:'A'},{...entry,anonymous:false},'coarse-hash'),conflict);
});
test('profile display metadata changes are not mistaken for edits to publication content; malformed content cannot match',()=>{
 assert.equal(samePublication(entry,{...entry,authorName:'Tên hiển thị thay đổi',likesCount:9,sharedAt:'later'}),true);
 for(const value of [null,{}, {...entry,interviewQuestions:[]},{...entry,reviewText:undefined},{...entry,difficultyRating:'3'}])assert.equal(samePublication(entry,value),false);
});
test('old receipt uses latest account publication time without changing that account',async()=>{
 const {db,store}=await fixture(),first=await store.submit({id:'A'},entry,'coarse-hash');
 const later=Date.parse(first.publishedAt)+21600001;db.records.get('accounts/A').lastCommunityAt=later;
 const before=structuredClone([...db.records]);db.writes=[];const receipt=await store.submit({id:'A'},entry,'coarse-hash');
 assert.equal(receipt.publishedAt,first.publishedAt);assert.equal(receipt.cooldownStartedAt,new Date(later).toISOString());assert.deepEqual([...db.records],before);assert.deepEqual(db.writes,[]);
});
