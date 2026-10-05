'use strict';
const express = require('express'), Joi = require('joi');
const { requireAuth, requireVerified } = require('../middlewares/firebaseAuth');
const { db } = require('../config/firebase');
const router = express.Router();
const schema = Joi.object({ title: Joi.string().min(2).max(150).required(), summary: Joi.string().max(6000).allow('').default(''), published: Joi.boolean().default(false), projects: Joi.array().items(Joi.object({ title: Joi.string().max(150).required(), description: Joi.string().max(3000).allow('').default(''), url: Joi.string().uri({ scheme: ['https'] }).allow('').default('') })).max(30).default([]) }).unknown(false);
const idValid = id => /^[a-zA-Z0-9-]{1,100}$/.test(id);
router.get('/public/:id', async (req, res, next) => {
  if (!idValid(req.params.id)) return res.sendStatus(404);
  try {
    const item = await db().collection('portfolios').doc(req.params.id).get();
    if (!item.exists || !item.data().published) return res.status(404).json({ success: false });
    const { title, summary, projects } = item.data();
    res.json({ success: true, portfolio: { id: item.id, title, summary, projects } });
  } catch (error) { next(error); }
});
router.use(requireAuth, express.json({ limit: '200kb' }));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', async (req, res, next) => {
  try { const items = await db().collection('portfolios').where('ownerId', '==', req.user.id).limit(30).get(); res.json({ success: true, portfolios: items.docs.map(item => ({ id: item.id, ...item.data(), ownerId: undefined })) }); } catch (error) { next(error); }
});
router.post('/', requireVerified, async (req, res, next) => {
  const { value, error } = schema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: 'Hồ sơ năng lực không hợp lệ.' });
  try {
    await require('../services/accountStore').store().ensure(req.user);
    const account = db().collection('accounts').doc(req.user.id);
    const item = db().collection('portfolios').doc();
    await db().runTransaction(async tx => {
      const existing = await tx.get(account);
      if (!existing.exists || (existing.data().portfolioCount || 0) >= 30) throw Object.assign(new Error('Giới hạn hồ sơ năng lực.'), { status: 429 });
      tx.create(item, { ...value, ownerId: req.user.id, createdAt: new Date().toISOString() });
      tx.update(account, { portfolioCount: (existing.data().portfolioCount || 0) + 1 });
    });
    res.status(201).json({ success: true, id: item.id });
  } catch (error) { next(error); }
});
router.put('/:id', requireVerified, async (req, res, next) => {
  const { value, error } = schema.validate(req.body);
  if (error || !idValid(req.params.id)) return res.status(400).json({ success: false });
  try {
    const ref = db().collection('portfolios').doc(req.params.id);
    await db().runTransaction(async tx => {
      const item = await tx.get(ref);
      if (!item.exists || item.data().ownerId !== req.user.id) throw Object.assign(new Error('Không tìm thấy.'), { status: 404 });
      tx.update(ref, { ...value, updatedAt: new Date().toISOString() });
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  if (!idValid(req.params.id)) return res.sendStatus(404);
  try {
    const ref = db().collection('portfolios').doc(req.params.id), account = db().collection('accounts').doc(req.user.id);
    await db().runTransaction(async tx => {
      const [item, owner] = await Promise.all([tx.get(ref), tx.get(account)]);
      if (!item.exists || item.data().ownerId !== req.user.id) throw Object.assign(new Error('Không tìm thấy.'), { status: 404 });
      tx.delete(ref);
      if (owner.exists) tx.update(account, { portfolioCount: Math.max(0, (owner.data().portfolioCount || 0) - 1) });
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});
module.exports = router;
