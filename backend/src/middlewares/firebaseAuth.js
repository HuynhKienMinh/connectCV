'use strict';
function createRequireAuth(verify) {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]{20,8192})$/.exec(req.headers.authorization || '');
    if (!match) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Vui lòng đăng nhập.' });
    try {
      const token = await verify(match[1], true);
      if (!token.uid || token.aud !== (process.env.FIREBASE_PROJECT_ID || 'connect-cv')) throw new Error('Invalid identity');
      req.user = { id: token.uid, email: token.email || '', name: token.name || '', avatar: token.picture || '', emailVerified: token.email_verified === true, role: token.admin === true ? 'admin' : token.employer === true ? 'employer' : 'candidate' };
      req.featureIdentityVerified = true;
      next();
    } catch { return res.status(401).json({ success: false, code: 'SESSION_INVALID', message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }); }
  };
}
const requireAuth = createRequireAuth((token, revoked) => require('../config/firebase').auth().verifyIdToken(token, revoked));
function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) return res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Vui lòng xác minh email trước khi sử dụng chức năng này.' });
  next();
}
module.exports = { createRequireAuth, requireAuth, requireVerified };
