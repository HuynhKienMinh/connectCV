'use strict';
const express = require('express'), Joi = require('joi');
const { requireAuth } = require('../middlewares/firebaseAuth');
const { store: defaultStore } = require('../services/accountStore');
const {profileVersion}=require('../services/profileVersion');
function createAccountRouter({accountStore=defaultStore,authenticate=requireAuth,revokeSessions=uid=>require('../config/firebase').auth().revokeRefreshTokens(uid)}={}){
const store=accountStore,router = express.Router();
router.use(authenticate);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(express.json({ limit: '900kb' }));
const profileSchema = Joi.object({
  email: Joi.string().email().max(254).allow(''), birth:Joi.string().max(40).allow(''), dateOfBirth:Joi.string().max(40).allow(''), avatarUrl:Joi.string().max(350000).pattern(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).allow(''), avatarDataUrl:Joi.string().max(350000).pattern(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).allow(''),
  projects:Joi.array().max(30).items(Joi.object().unknown(true)), certifications:Joi.array().max(40).items(Joi.any()), activities:Joi.array().max(40).items(Joi.any()), awards:Joi.array().max(40).items(Joi.any()), interests:Joi.array().max(40).items(Joi.string().max(200)), references:Joi.array().max(20).items(Joi.any()), languages:Joi.array().max(30).items(Joi.any()), website:Joi.string().max(500).allow(''), linkedin:Joi.string().max(500).allow(''), github:Joi.string().max(500).allow(''), gender:Joi.string().max(50).allow(''), avatarCrop:Joi.object({zoom:Joi.number().min(1).max(5),x:Joi.number().min(-100).max(100),y:Joi.number().min(-100).max(100)}),
  fullName:Joi.string().max(150).allow(''), phone: Joi.string().max(40).allow(''), address: Joi.string().max(300).allow(''),
  targetRole: Joi.string().max(150).allow(''), summary: Joi.string().max(6000).allow(''), skills: Joi.array().items(Joi.string().max(100)).max(100),
  experience: Joi.array().items(Joi.object({ company: Joi.string().max(200).allow(''), role: Joi.string().max(200).allow(''), period: Joi.string().max(100).allow(''), time:Joi.string().max(100).allow(''), bullets: Joi.array().items(Joi.string().max(3000)).max(30) })).max(30),
  education: Joi.array().items(Joi.object({ school: Joi.string().max(200).allow(''), degree: Joi.string().max(200).allow(''), period: Joi.string().max(100).allow(''), time:Joi.string().max(100).allow(''), highlight: Joi.string().max(1000).allow('') })).max(20)
}).unknown(false);
router.get('/me', async (req, res, next) => {
  try { const account = await store().ensure(req.user); const version=profileVersion(req.user.id,account.profile||{}); res.set('ETag',version).json({ success: true, user: req.user, profile: account.profile || {}, profileVersion:version, credits: account.credits || 0 }); } catch (error) { next(error); }
});
router.put('/profile', async (req, res, next) => {
  const { value, error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: 'Hồ sơ không hợp lệ.' });
  try { const result=await store().saveProfile(req.user, value, req.headers['if-match']); res.set('ETag',result.profileVersion).json({ success: true, ...result }); } catch (error) { if(['PROFILE_CONFLICT','PROFILE_VERSION_REQUIRED'].includes(error.code))return res.status(error.status).json({success:false,code:error.code,message:error.message});next(error); }
});
router.post('/logout-all', async (req, res, next) => {
  try { await revokeSessions(req.user.id); res.json({ success: true }); } catch (error) { next(error); }
});
return router;
}
module.exports = createAccountRouter();
module.exports.createAccountRouter=createAccountRouter;
