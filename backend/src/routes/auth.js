// [Route: auth.js] API Xác thực & Quản lý Tài khoản (Supabase & Dev Engine)
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { 
  isSupabaseConfigured, 
  supabaseClient, 
  signDevToken, 
  setUserRole 
} = require('../services/supabaseService');
const { requireAuth, requireRole } = require('../middlewares/authMiddleware');

// Lưu trữ tài khoản người dùng cho Dev / Local Mode (In-Memory Mock Store)
const localUsersStore = new Map([
  [
    'admin@connectcv.io.vn',
    {
      id: 'usr_admin_001',
      email: 'admin@connectcv.io.vn',
      passwordHash: crypto.createHash('sha256').update('Admin@123').digest('hex'),
      fullName: 'Quản Trị Viên Hệ Thống',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin+ConnectCV&background=4f46e5&color=fff',
      role: 'ADMIN',
      provider: 'local'
    }
  ],
  [
    'recruiter@fpt.com',
    {
      id: 'usr_recruiter_001',
      email: 'recruiter@fpt.com',
      passwordHash: crypto.createHash('sha256').update('Recruiter@123').digest('hex'),
      fullName: 'HR Tuyển Dụng FPT',
      avatarUrl: 'https://ui-avatars.com/api/?name=FPT+HR&background=0284c7&color=fff',
      role: 'RECRUITER',
      provider: 'local'
    }
  ],
  [
    'student@fpt.edu.vn',
    {
      id: 'usr_student_001',
      email: 'student@fpt.edu.vn',
      passwordHash: crypto.createHash('sha256').update('Student@123').digest('hex'),
      fullName: 'Huỳnh Kiên Minh (Sinh viên FPT)',
      avatarUrl: 'https://ui-avatars.com/api/?name=Kien+Minh&background=10b981&color=fff',
      role: 'CANDIDATE',
      provider: 'local'
    }
  ]
]);

// ─────────────────────────────────────────────────────────────
// 1. GET /api/auth/config — Cấu hình Public cho Frontend SDK
// ─────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  res.json({
    success: true,
    mode: isSupabaseConfigured ? 'supabase' : 'local_dev',
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null
  });
});

// ─────────────────────────────────────────────────────────────
// 2. POST /api/auth/register — Đăng ký tài khoản
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, fullName, requestedRole } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email và mật khẩu.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' });
  }

  // ✅ NGUYÊN TẮC BẢO MẬT: Chặn form public tự gán quyền ADMIN
  let safeRole = 'CANDIDATE';
  if (requestedRole && requestedRole.toUpperCase() === 'RECRUITER') {
    safeRole = 'RECRUITER';
  }

  const cleanEmail = email.toLowerCase().trim();

  // Kịch bản 1: Đăng ký qua Supabase Cloud
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName || cleanEmail.split('@')[0],
            role: safeRole
          }
        }
      });

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt hoặc đăng nhập.',
        session: data.session,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: safeRole
        }
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: e.message });
    }
  }

  // Kịch bản 2: Đăng ký trong Local / Dev Mode
  if (localUsersStore.has(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Email này đã được sử dụng. Vui lòng đăng nhập.' });
  }

  const newUserId = 'usr_' + Date.now();
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const newUser = {
    id: newUserId,
    email: cleanEmail,
    passwordHash,
    fullName: fullName || cleanEmail.split('@')[0],
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || cleanEmail)}&background=6366f1&color=fff`,
    role: safeRole,
    provider: 'local'
  };

  localUsersStore.set(cleanEmail, newUser);

  const token = signDevToken(newUser);

  return res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản thành công!',
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      avatarUrl: newUser.avatarUrl
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 3. POST /api/auth/login — Đăng nhập Email & Password
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Kịch bản 1: Đăng nhập qua Supabase Cloud
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error || !data.session) {
        // Trả về generic error message chống Username Enumeration
        return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
      }

      const role = (data.user.app_metadata && data.user.app_metadata.role) ||
                   (data.user.user_metadata && data.user.user_metadata.role) ||
                   'CANDIDATE';

      return res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          role: role.toUpperCase()
        }
      });
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }
  }

  // Kịch bản 2: Đăng nhập trong Local / Dev Mode
  const user = localUsersStore.get(cleanEmail);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) {
    return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
  }

  const token = signDevToken(user);

  return res.json({
    success: true,
    message: 'Đăng nhập thành công!',
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 4. GET /api/auth/me — Lấy thông tin tài khoản hiện tại
// ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// ─────────────────────────────────────────────────────────────
// 5. POST /api/auth/admin/set-role — Phân quyền tài khoản (Chỉ ADMIN)
// ─────────────────────────────────────────────────────────────
router.post('/admin/set-role', requireAuth, requireRole(['ADMIN']), async (req, res) => {
  const { targetEmail, newRole } = req.body;

  if (!targetEmail || !newRole) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp targetEmail và newRole.' });
  }

  const cleanEmail = targetEmail.toLowerCase().trim();
  const cleanRole = String(newRole).toUpperCase();

  try {
    if (isSupabaseConfigured) {
      // Trong Supabase, tìm user và update role
      const user = await setUserRole(cleanEmail, cleanRole);
      return res.json({
        success: true,
        message: `Đã cập nhật vai trò của [${cleanEmail}] thành [${cleanRole}] thành công.`,
        data: user
      });
    }

    // Local / Dev Mode
    const user = localUsersStore.get(cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, message: `Không tìm thấy tài khoản với email [${cleanEmail}].` });
    }

    user.role = cleanRole;
    return res.json({
      success: true,
      message: `Đã cập nhật vai trò của [${cleanEmail}] thành [${cleanRole}] thành công (Local Mode).`,
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. POST /api/auth/logout — Đăng xuất
// ─────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Đăng xuất thành công.' });
});

module.exports = router;
