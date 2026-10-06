 'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const publicKeys=['id','authorName','authorRole','authorAvatar','companyName','position','difficultyRating','category','tags','interviewQuestions','reviewText','anonymous','sharedAt','likesCount'];
const publicEntry=e=>Object.fromEntries(publicKeys.filter(k=>e[k]!==undefined).map(k=>[k,e[k]]));
class CommunityStore{
 constructor(file){this.file=file;this.queue=Promise.resolve();this.state={entries:[],ledger:[]};
  if(fs.existsSync(file)){const s=JSON.parse(fs.readFileSync(file,'utf8'));this.state=Array.isArray(s)?{entries:s,ledger:[]}:s;}
 }
 get entries(){return this.state.entries;}
 transaction(fn){const run=this.queue.then(async()=>{const draft=JSON.parse(JSON.stringify(this.state));const result=fn(draft);const dir=path.dirname(this.file);await fs.promises.mkdir(dir,{recursive:true});const tmp=this.file+'.'+crypto.randomUUID()+'.tmp';try{await fs.promises.writeFile(tmp,JSON.stringify(draft),{encoding:'utf8',mode:0o600});await fs.promises.rename(tmp,this.file);}catch(e){await fs.promises.unlink(tmp).catch(()=>{});throw e;}this.state=draft;return result;});this.queue=run.catch(()=>{});return run;}
 submit(user,entry,hash){return this.transaction(s=>{
  if(s.entries.some(e=>e.contentHash===hash))throw Object.assign(new Error('Nội dung đã được chia sẻ.'),{status:409});
  if(s.ledger.some(e=>e.userId===user.id&&Date.now()-e.at<21600000))throw Object.assign(new Error('Vui lòng chờ 6 giờ trước khi chia sẻ tiếp.'),{status:429});
  if(s.entries.length>=10000)throw Object.assign(new Error('Kho cộng đồng đã đầy. Vui lòng thử lại sau.'),{status:503});
  const id='deb-'+crypto.randomUUID();
  s.entries.unshift({...entry,id,ownerId:user.id,contentHash:hash,likedUsers:[],likesCount:0});
  // Durable feature reward ledger; central balance integration consumes this ID
  // exactly once, never trusts client +5, and must not increment twice on retry.
  s.ledger.push({id:'community:'+id,userId:user.id,amount:5,at:Date.now(),status:'pending'});
  return {debriefId:id,awardedCredits:0,pendingCredits:5,creditStatus:'pending',rewardId:'community:'+id};
 });}
 like(user,id){return this.transaction(s=>{const e=s.entries.find(e=>e.id===id);if(!e)throw Object.assign(new Error('Không tìm thấy bài chia sẻ.'),{status:404});
  const users=e.likedUsers||[];const index=users.indexOf(user.id);if(index<0){if(users.length>=10000)throw Object.assign(new Error('Giới hạn lượt thích.'),{status:429});users.push(user.id);}else users.splice(index,1);
  e.likedUsers=users;e.likesCount=users.length;delete e.likedIps;
  return {id,likesCount:e.likesCount,hasLiked:index<0};
 });}
}
module.exports={CommunityStore,publicEntry};
