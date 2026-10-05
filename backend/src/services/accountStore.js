'use strict';
const crypto = require('node:crypto');
const fail = (status, message) => Object.assign(new Error(message), { status });
class AccountStore {
  constructor(db) { this.db = db; }
  ref(uid) { return this.db.collection('accounts').doc(uid); }
  async ensure(user) {
    const ref = this.ref(user.id);
    return this.db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (snapshot.exists) return snapshot.data();
      const data = { credits: 15, profile: {}, createdAt: new Date().toISOString(), dailyCount: 0, dailyDate: '' };
      tx.create(ref, data);
      return data;
    });
  }
  async saveProfile(user, profile) {
    await this.ensure(user);
    await this.ref(user.id).update({ profile, updatedAt: new Date().toISOString() });
    return profile;
  }
  async consume(uid, cost = 0) {
    const ref = this.ref(uid), day = new Date().toISOString().slice(0, 10);
    return this.db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw fail(403, 'Tài khoản chưa khởi tạo.');
      const account = snapshot.data(), count = account.dailyDate === day ? account.dailyCount || 0 : 0;
      if (count >= 100) throw fail(429, 'Đã đạt giới hạn yêu cầu trong ngày.');
      if ((account.credits || 0) < cost) throw fail(402, 'Không đủ credits.');
      tx.update(ref, { dailyDate: day, dailyCount: count + 1, credits: account.credits - cost });
      if (cost) tx.create(this.db.collection('creditEvents').doc(crypto.randomUUID()), { uid, amount: -cost, type: 'feature', at: new Date().toISOString() });
    });
  }
}
let instance;
function store() { return instance ||= new AccountStore(require('../config/firebase').db()); }
module.exports = { AccountStore, store, fail };
