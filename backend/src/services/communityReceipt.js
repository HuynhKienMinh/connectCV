'use strict';
// A coarse duplicate hash is only a lookup key, never proof of an exact retry.
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(id);
const fields=['companyName','position','interviewQuestions','reviewText','anonymous','difficultyRating'];
function samePublication(a,b){
  const valid=p=>p&&['companyName','position','reviewText'].every(k=>typeof p[k]==='string')&&
    typeof p.anonymous==='boolean'&&Number.isInteger(p.difficultyRating)&&p.difficultyRating>=1&&p.difficultyRating<=5&&
    Array.isArray(p.interviewQuestions)&&p.interviewQuestions.length>0&&p.interviewQuestions.every(q=>typeof q==='string');
  return Boolean(valid(a)&&valid(b)&&fields.every(k=>JSON.stringify(a[k])===JSON.stringify(b[k])));
}
function recoveredReceipt(user,entry,stored,id,event,mode,lastShareAt){
  if(!user?.id||!validId(id)||stored?.ownerId!==user.id||!samePublication(entry,stored))return null;
  if(stored.moderationStatus!==undefined&&stored.moderationStatus!=='visible')return null;
  const published=Date.parse(stored.sharedAt);
  if(!Number.isFinite(published)||published<=0)return null;
  if(lastShareAt!==undefined&&(!Number.isSafeInteger(lastShareAt)||lastShareAt<0||lastShareAt>8640000000000000))return null;
  const cooldownStartedAt=new Date(Math.max(published,lastShareAt||0)).toISOString();
  if(mode==='firestore'){
    if(event?.uid!==user.id||event?.postId!==id||event?.amount!==5||event?.type!=='community')return null;
    return {debriefId:id,awardedCredits:0,pendingCredits:0,creditStatus:'awarded',rewardId:'community-'+id,alreadyShared:true,publishedAt:stored.sharedAt,cooldownStartedAt};
  }
  if(mode!=='file'||event?.userId!==user.id||event?.id!=='community:'+id||event?.amount!==5||event?.status!=='pending')return null;
  return {debriefId:id,awardedCredits:0,pendingCredits:5,creditStatus:'pending',rewardId:event.id,alreadyShared:true,publishedAt:stored.sharedAt,cooldownStartedAt};
}
module.exports={validId,samePublication,recoveredReceipt};
