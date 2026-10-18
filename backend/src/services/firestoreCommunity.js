'use strict';
const crypto = require('node:crypto');
const { fail } = require('./accountStore');
const {validId,samePublication,recoveredReceipt}=require('./communityReceipt');
const moderation=require('../../features/connectcv/src/services/communityModeration');
class FirestoreCommunity {
  constructor(db) { this.db = db; }
  async list() {
    const result = await this.db.collection('communityPosts').orderBy('sharedAt', 'desc').limit(200).get();
    return result.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(moderation.isVisible);
  }
  async submit(user, entry, hash) {
    const id = crypto.randomUUID(), now = Date.now();
    const post = this.db.collection('communityPosts').doc(id);
    const duplicate = this.db.collection('communityHashes').doc(hash);
    const account = this.db.collection('accounts').doc(user.id);
    const event = this.db.collection('creditEvents').doc('community-' + id);
    return this.db.runTransaction(async tx => {
      const [previous, owner] = await Promise.all([tx.get(duplicate), tx.get(account)]);
      if (previous.exists) {
        const previousId=previous.data()?.postId;
        if(owner.exists&&validId(previousId)){
          const existingRef=this.db.collection('communityPosts').doc(previousId);
          const existing=await tx.get(existingRef);
          // Check ownership and full public content before reading the reward event.
          if(existing.exists&&existing.data().ownerId===user.id&&samePublication(entry,existing.data())){
            const reward=await tx.get(this.db.collection('creditEvents').doc('community-'+previousId));
            const receipt=recoveredReceipt(user,entry,existing.data(),previousId,reward.exists?reward.data():null,'firestore');
            if(receipt)return receipt; // No writes, no second credit award or cooldown update.
          }
        }
        throw fail(409, 'Nội dung đã được chia sẻ.');
      }
      if (!owner.exists) throw fail(403, 'Tài khoản chưa khởi tạo.');
      const data = owner.data();
      if (data.lastCommunityAt && now - data.lastCommunityAt < 21600000) throw fail(429, 'Vui lòng chờ 6 giờ trước khi chia sẻ tiếp.');
      tx.create(post, { ...entry, ownerId: user.id, likesCount: 0, sharedAt: new Date(now).toISOString() });
      tx.create(duplicate, { postId: id });
      tx.create(event, { uid: user.id, amount: 5, type: 'community', postId: id, at: new Date(now).toISOString() });
      tx.update(account, { credits: (data.credits || 0) + 5, lastCommunityAt: now });
      return { debriefId: id, awardedCredits: 5, pendingCredits: 0, creditStatus: 'awarded', rewardId: event.id, publishedAt:new Date(now).toISOString() };
    });
  }
  async like(user, id) {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw fail(400, 'ID không hợp lệ.');
    const post = this.db.collection('communityPosts').doc(id);
    const like = post.collection('likes').doc(user.id);
    return this.db.runTransaction(async tx => {
      const [snapshot, liked] = await Promise.all([tx.get(post), tx.get(like)]);
      if (!snapshot.exists || !moderation.isVisible(snapshot.data())) throw fail(404, 'Không tìm thấy bài chia sẻ.');
      const count = Math.max(0, (snapshot.data().likesCount || 0) + (liked.exists ? -1 : 1));
      if (liked.exists) tx.delete(like); else tx.create(like, { at: new Date().toISOString() });
      tx.update(post, { likesCount: count });
      return { id, likesCount: count, hasLiked: !liked.exists };
    });
  }
  async report(user,id,body){
    const input=moderation.reportInput(user,id,body);
    const post=this.db.collection('communityPosts').doc(id),report=this.db.collection('communityReports').doc(input.id);
    return this.db.runTransaction(async tx=>{
      const [entry,previous]=await Promise.all([tx.get(post),tx.get(report)]);
      if(!entry.exists||!moderation.isVisible(entry.data()))throw fail(404,'Không tìm thấy bài chia sẻ.');
      if(previous.exists)return moderation.reportReceipt(input.id,true);
      tx.create(report,{postId:id,reporterId:user.id,reason:input.reason,status:'received',createdAt:new Date().toISOString()});
      return moderation.reportReceipt(input.id,false);
    });
  }
  async reports(user){
    moderation.requireAdmin(user);
    const result=await this.db.collection('communityReports').orderBy('createdAt','desc').limit(100).get();
    return result.docs.map(doc=>moderation.reviewEntry(doc.data(),doc.id));
  }
}
module.exports = { FirestoreCommunity };
