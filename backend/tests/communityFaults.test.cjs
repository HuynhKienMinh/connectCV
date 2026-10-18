'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PortfolioTestDB}=require('./helpers/portfolioFixture.cjs');
const {FirestoreCommunity}=require('../src/services/firestoreCommunity');
const {AccountStore}=require('../src/services/accountStore');
const {publicEntry}=require('../features/connectcv/src/services/communityStore');

// Transaction boundary model, not a Firestore emulator or evidence of cloud isolation.
class FaultDB extends PortfolioTestDB{
 constructor(){super();this.failWrite=0;this.failAfterCommit=false;this.retryCallback=false;this.attempts=[];}
 runTransaction(fn){
  const execute=async tx=>{
   let writes=0;const trace=[];
   const wrapped={...tx};
   for(const name of ['create','update','delete'])wrapped[name]=(ref,...args)=>{
    trace.push(name+':'+ref.path);
    if(++writes===this.failWrite){this.failWrite=0;throw Error('SYNTHETIC_PRECOMMIT_FAILURE');}
    return tx[name](ref,...args);
   };
   try{return await fn(wrapped);}finally{this.attempts.push(trace);}
  };
  return super.runTransaction(async tx=>{
   if(this.retryCallback){
    this.retryCallback=false;
    const discarded=new Map([...this.records].map(([k,v])=>[k,structuredClone(v)]));
    await execute({get:async ref=>({exists:discarded.has(ref.path),data:()=>structuredClone(discarded.get(ref.path))}),create:(r,v)=>discarded.set(r.path,structuredClone(v)),update:(r,v)=>discarded.set(r.path,{...discarded.get(r.path),...structuredClone(v)}),delete:r=>discarded.delete(r.path)});
   }
   return execute(tx);
  }).then(result=>{if(this.failAfterCommit){this.failAfterCommit=false;throw Error('SYNTHETIC_RESPONSE_LOST_AFTER_COMMIT');}return result;});
 }
}
const entry={authorName:'Ứng viên Ẩn danh',authorAvatar:'',authorRole:'Ứng viên',anonymous:true,companyName:'Công ty giả lập',position:'Chuyên viên bán lẻ',interviewQuestions:['Bạn xử lý yêu cầu đổi hàng như thế nào?'],reviewText:'Dữ kiện giả để kiểm thử giao dịch.'};
const count=(db,prefix)=>[...db.records.keys()].filter(k=>k.startsWith(prefix+'/')).length;
async function fixture(){const db=new FaultDB(),accounts=new AccountStore(db);await accounts.ensure({id:'A'});await accounts.ensure({id:'B'});db.attempts=[];return {db,posts:new FirestoreCommunity(db)};}
function awardedOnce(db){assert.equal(count(db,'communityPosts'),1);assert.equal(count(db,'communityHashes'),1);assert.equal(count(db,'creditEvents'),1);assert.equal(db.records.get('accounts/A').credits,20);assert.equal(db.records.get('accounts/B').credits,15);assert.equal(db.records.get('accounts/A').dailyCount,0);}

test('failure at any publication write rolls back post, hash, credit event and balance; retry awards once',async()=>{
 for(const boundary of [1,2,3,4]){
  const {db,posts}=await fixture(),initial=structuredClone([...db.records]);db.failWrite=boundary;
  await assert.rejects(posts.submit({id:'A'},entry,'synthetic-hash'),/SYNTHETIC_PRECOMMIT_FAILURE/);
  assert.deepEqual([...db.records],initial,'no partial transaction at write '+boundary);
  const result=await posts.submit({id:'A'},entry,'synthetic-hash');assert.equal(result.creditStatus,'awarded');assert.equal(result.awardedCredits,5);awardedOnce(db);
 }
});

test('lost response for an incomplete historical post cannot award again or fabricate a confirmed receipt',async()=>{
 const {db,posts}=await fixture();db.failAfterCommit=true;
 await assert.rejects(posts.submit({id:'A'},entry,'synthetic-hash'),/SYNTHETIC_RESPONSE_LOST_AFTER_COMMIT/);awardedOnce(db);
 const postId=[...db.records.keys()].find(k=>k.startsWith('communityPosts/')).split('/')[1];
 await assert.rejects(posts.submit({id:'A'},entry,'synthetic-hash'),e=>e.status===409);awardedOnce(db);
 assert.ok(db.records.has('communityPosts/'+postId));
 // Missing historical rating/time evidence must remain 409, not fabricate confirmation.
});

test('SDK-style callback replay reuses the same post/event IDs and commits one reward',async()=>{
 const {db,posts}=await fixture();db.retryCallback=true;
 const result=await posts.submit({id:'A'},entry,'synthetic-hash');awardedOnce(db);
 assert.equal(db.attempts.length,2);assert.deepEqual(db.attempts[0],db.attempts[1]);
 assert.ok(db.records.has('communityPosts/'+result.debriefId));assert.ok(db.records.has('creditEvents/'+result.rewardId));
});

test('different drafts racing on one account obey cooldown; global duplicate does not reward a second owner',async()=>{
 const {db,posts}=await fixture();
 const results=await Promise.allSettled(Array.from({length:8},(_,i)=>posts.submit({id:'A'},entry,'different-draft-'+i)));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.status===429).length,7);awardedOnce(db);
 const winningHash=[...db.records.keys()].find(k=>k.startsWith('communityHashes/')).slice('communityHashes/'.length);
 await assert.rejects(posts.submit({id:'B'},entry,winningHash),e=>e.status===409);awardedOnce(db);
});

test('public projection excludes ownership, dedupe, likes identities and reward metadata',()=>{
 const publicPost=publicEntry({...entry,id:'synthetic-post',ownerId:'PRIVATE_OWNER_SENTINEL',contentHash:'PRIVATE_HASH_SENTINEL',likedUsers:['PRIVATE_LIKER_SENTINEL'],likedIps:['PRIVATE_IP_SENTINEL'],ledger:{uid:'PRIVATE_LEDGER_SENTINEL'},credits:5,profile:{email:'PRIVATE_PROFILE_SENTINEL'}});
 assert.equal(publicPost.authorName,'Ứng viên Ẩn danh');assert.equal(publicPost.authorAvatar,'');assert.equal(publicPost.reviewText,entry.reviewText);
 assert.doesNotMatch(JSON.stringify(publicPost),/PRIVATE_/);
});
