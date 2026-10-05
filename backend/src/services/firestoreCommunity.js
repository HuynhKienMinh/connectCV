'use strict';
const crypto = require('node:crypto');
const { fail } = require('./accountStore');
class FirestoreCommunity {
  constructor(db) { this.db = db; }
  async list() {
    const result = await this.db.collection('communityPosts').orderBy('sharedAt', 'desc').limit(200).get();
    return result.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }
  async submit(user, entry, hash) {
    const id = crypto.randomUUID(), now = Date.now();
    const post = this.db.collection('communityPosts').doc(id);
    const duplicate = this.db.collection('communityHashes').doc(hash);
    const account = this.db.collection('accounts').doc(user.id);
    const event = this.db.collection('creditEvents').doc('community-' + id);
    return this.db.runTransaction(async tx => {
      const [previous, owner] = await Promise.all([tx.get(duplicate), tx.get(account)]);
      if (previous.exists) throw fail(409, 'Nội dung đã được chia sẻ.');
      if (!owner.exists) throw fail(403, 'Tài khoản chưa khởi tạo.');
      const data = owner.data();
      if (data.lastCommunityAt && now - data.lastCommunityAt < 21600000) throw fail(429, 'Vui lòng chờ 6 giờ trước khi chia sẻ tiếp.');
      tx.create(post, { ...entry, ownerId: user.id, likesCount: 0, sharedAt: new Date(now).toISOString() });
      tx.create(duplicate, { postId: id });
      tx.create(event, { uid: user.id, amount: 5, type: 'community', postId: id, at: new Date(now).toISOString() });
      tx.update(account, { credits: (data.credits || 0) + 5, lastCommunityAt: now });
      return { debriefId: id, awardedCredits: 5, pendingCredits: 0, creditStatus: 'awarded', rewardId: event.id };
    });
  }
  async like(user, id) {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw fail(400, 'ID không hợp lệ.');
    const post = this.db.collection('communityPosts').doc(id);
    const like = post.collection('likes').doc(user.id);
    return this.db.runTransaction(async tx => {
      const [snapshot, liked] = await Promise.all([tx.get(post), tx.get(like)]);
      if (!snapshot.exists) throw fail(404, 'Không tìm thấy bài chia sẻ.');
      const count = Math.max(0, (snapshot.data().likesCount || 0) + (liked.exists ? -1 : 1));
      if (liked.exists) tx.delete(like); else tx.create(like, { at: new Date().toISOString() });
      tx.update(post, { likesCount: count });
      return { id, likesCount: count, hasLiked: !liked.exists };
    });
  }
}
module.exports = { FirestoreCommunity };
