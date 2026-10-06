// [Middleware] authMiddleware.js — Kiểm soát xác thực và phân quyền RBAC / ABAC
const { verifyToken } = require('../services/supabaseService');

/**
 * Trích xuất Bearer Token từ Header Authorization hoặc Cookie
 */
function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.substring(7).trim();
  }
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'];
  }
  // Hỗ trợ trích xuất từ cookie nếu client gửi qua HttpOnly cookie
  if (req.cookies && req.cookies['sb-access-token']) {
    return req.cookies['sb-access-token'];
  }
  return null;
}

/**
 * 1. BẮT BUỘC ĐĂNG NHẬP (REQUIRE AUTH)
 * Chặn các request chưa đăng nhập, trả về 401 Unauthorized
 */
async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Vui lòng đăng nhập để thực hiện chức năng này.'
    });
  }

  try {
    const user = await verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: err.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }
}

/**
 * 2. PHÂN QUYỀN THEO VAI TRÒ (RBAC - ROLE-BASED ACCESS CONTROL)
 * @param {string[]} allowedRoles - Danh sách role được phép (VD: ['ADMIN', 'RECRUITER'])
 */
function requireRole(allowedRoles = []) {
  const normalizedRoles = allowedRoles.map(r => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Yêu cầu đăng nhập trước khi kiểm tra quyền hạn.'
      });
    }

    const userRole = (req.user.role || 'CANDIDATE').toUpperCase();

    // ADMIN luôn có toàn quyền (Superuser)
    if (userRole === 'ADMIN' || normalizedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: `Từ chối truy cập: Bạn không có quyền thực hiện hành động này. Yêu cầu vai trò: [${normalizedRoles.join(', ')}], vai trò hiện tại của bạn: [${userRole}].`
    });
  };
}

/**
 * 3. XÁC THỰC TÙY CHỌN (OPTIONAL AUTH)
 * Dùng cho các route cho phép cả khách (Guest) và User đăng nhập (để tính quota cá nhân)
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const user = await verifyToken(token);
    req.user = user;
  } catch (e) {
    req.user = null; // Token lỗi thì xem như Guest, không chặn request
  }
  next();
}

/**
 * 4. PHÒNG THỦ CHỐNG BOLA / IDOR (RESOURCE OWNERSHIP GUARD)
 * Kiểm tra xem người dùng có phải là chủ sở hữu của bản ghi không
 * @param {Function} getResourceOwnerIdFn - Hàm async (resourceId) => ownerUserId
 * @param {string} paramName - Tên biến param trên URL (VD: 'cvId')
 */
function requireOwnership(getResourceOwnerIdFn, paramName = 'id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
    }

    // Admin có quyền truy cập mọi tài nguyên
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const resourceId = req.params[paramName];
    if (!resourceId) {
      return res.status(400).json({ success: false, message: `Thiếu tham số ${paramName}.` });
    }

    try {
      const ownerId = await getResourceOwnerIdFn(resourceId);
      if (!ownerId) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên.' });
      }

      if (String(ownerId) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          code: 'IDOR_BLOCKED',
          message: 'Bảo mật: Bạn không có quyền thao tác trên tài nguyên của người dùng khác.'
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền sở hữu: ' + err.message });
    }
  };
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
  requireOwnership
};
