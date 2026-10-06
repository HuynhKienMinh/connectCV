// [Service] supabaseService.js — Tích hợp Supabase Auth & Local Fallback
// Chuẩn hóa quản trị xác thực, phân quyền RBAC và đồng bộ người dùng
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'connectcv_secret_jwt_key_2026';

let supabaseClient = null;
let supabaseAdmin = null;
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    }
    console.log('⚡ [Supabase Auth] Đã kết nối thành công với Supabase Cloud:', SUPABASE_URL);
  } catch (err) {
    console.error('❌ [Supabase Auth] Lỗi khởi tạo Supabase:', err.message);
  }
} else {
  console.log('ℹ️  [Auth Engine] SUPABASE_URL chưa được cấu hình. Đang chạy chế độ Local Dev Auth Engine (Tương thích 100% chuẩn JWT / RBAC).');
}

// ─────────────────────────────────────────────────────────────
// 1. XÁC THỰC TOKEN (VERIFY JWT)
// ─────────────────────────────────────────────────────────────
async function verifyToken(token) {
  if (!token) throw new Error('Token không được để trống.');

  // Nếu kết nối Supabase Cloud thật
  if (isSupabaseConfigured && supabaseClient) {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      if (error || !user) throw new Error(error ? error.message : 'Token Supabase không hợp lệ.');
      
      const role = (user.app_metadata && user.app_metadata.role) ||
                   (user.user_metadata && user.user_metadata.role) ||
                   'CANDIDATE';

      return {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || null,
        role: role.toUpperCase(),
        provider: user.app_metadata?.provider || 'email',
        rawUser: user
      };
    } catch (supabaseErr) {
      // Fallback kiểm tra JWT offline nếu Supabase Cloud gặp độ trễ mạng
      if (process.env.SUPABASE_JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
          return {
            id: decoded.sub,
            email: decoded.email,
            role: (decoded.user_metadata?.role || decoded.app_metadata?.role || 'CANDIDATE').toUpperCase(),
            provider: decoded.app_metadata?.provider || 'supabase_jwt'
          };
        } catch (e) {}
      }
      throw supabaseErr;
    }
  }

  // Chế độ Local / Dev Auth (Ký và giải mã bằng JWT_SECRET)
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      fullName: decoded.fullName || decoded.email?.split('@')[0],
      avatarUrl: decoded.avatarUrl || null,
      role: (decoded.role || 'CANDIDATE').toUpperCase(),
      provider: decoded.provider || 'local'
    };
  } catch (err) {
    throw new Error('Token xác thực không hợp lệ hoặc đã hết hạn.');
  }
}

// ─────────────────────────────────────────────────────────────
// 2. KÝ TOKEN CHO DEV / LOCAL MODE
// ─────────────────────────────────────────────────────────────
function signDevToken(userPayload, expiresIn = '7d') {
  return jwt.sign(
    {
      id: userPayload.id,
      email: userPayload.email,
      fullName: userPayload.fullName,
      role: (userPayload.role || 'CANDIDATE').toUpperCase(),
      provider: userPayload.provider || 'local'
    },
    JWT_SECRET,
    { expiresIn }
  );
}

// ─────────────────────────────────────────────────────────────
// 3. NÂNG / HẠ QUYỀN (SET USER ROLE - CHỈ ADMIN)
// ─────────────────────────────────────────────────────────────
async function setUserRole(userId, newRole) {
  const cleanRole = String(newRole).toUpperCase();
  const validRoles = ['CANDIDATE', 'RECRUITER', 'ADMIN', 'MODERATOR'];
  if (!validRoles.includes(cleanRole)) {
    throw new Error(`Role không hợp lệ. Các role hợp lệ: ${validRoles.join(', ')}`);
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { role: cleanRole }
    });
    if (error) throw new Error(error.message);
    return data.user;
  }

  // Trong Dev mode: Trả về thành công
  return { id: userId, role: cleanRole, updated: true };
}

module.exports = {
  isSupabaseConfigured,
  supabaseClient,
  supabaseAdmin,
  verifyToken,
  signDevToken,
  setUserRole
};
