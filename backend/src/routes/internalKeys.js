// [Route: internalKeys.js] Quản trị API Key Pool & Giám sát Sức khỏe
// Chỉ cho phép truy cập nội bộ (bảo vệ bởi X-Internal-Secret)
const express = require('express');
const router = express.Router();
const keyManager = require('../services/keyManager');

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE XÁC THỰC NỘI BỘ (INTERNAL ACCESS GUARD)
// ─────────────────────────────────────────────────────────────
function verifyInternalSecret(req, res, next) {
  const configuredSecret = process.env.INTERNAL_ADMIN_SECRET || 'connectcv_internal_secret_key_2026';
  const providedSecret = req.headers['x-internal-secret'] || 
                         (req.headers['authorization'] && req.headers['authorization'].replace(/^Bearer\s+/i, ''));

  if (!providedSecret || providedSecret !== configuredSecret) {
    console.warn(`[Security Alert] Truy cập trái phép vào /api/internal/keys từ IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'Truy cập bị từ chối. Yêu cầu mã bí mật quản trị nội bộ (X-Internal-Secret).'
    });
  }

  next();
}

router.use(verifyInternalSecret);

// ─────────────────────────────────────────────────────────────
// 1. GET /api/internal/keys/health — Xem báo cáo tình trạng Pool
// ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const stats = keyManager.getHealthStats();
  res.json({
    success: true,
    message: 'Báo cáo sức khỏe In-Memory Key Pool',
    timestamp: new Date().toISOString(),
    data: stats
  });
});

// ─────────────────────────────────────────────────────────────
// 2. POST /api/internal/keys/reload — Hot-reload danh sách từ đĩa vào RAM
// ─────────────────────────────────────────────────────────────
router.post('/reload', (req, res) => {
  const stats = keyManager.reloadKeys();
  res.json({
    success: true,
    message: 'Đã nạp lại danh sách API Key vào RAM thành công (Zero Downtime)',
    data: stats
  });
});

// ─────────────────────────────────────────────────────────────
// 3. POST /api/internal/keys/add — Thêm hoặc cập nhật Key mới vào Pool
// Body: { id: "gemini_backup_03", apiKey: "AIzaSy..." }
// ─────────────────────────────────────────────────────────────
router.post('/add', (req, res) => {
  const { id, apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ success: false, message: 'Thiếu trường apiKey' });
  }

  try {
    const stats = keyManager.addKey(id, apiKey);
    res.json({
      success: true,
      message: `Đã thêm thành công Key [${id || 'mới'}] vào In-Memory Pool`,
      data: stats
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 4. DELETE /api/internal/keys/:id — Xóa một Key khỏi Pool
// ─────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const removed = keyManager.removeKey(id);
  if (!removed) {
    return res.status(404).json({ success: false, message: `Không tìm thấy key với id [${id}]` });
  }

  res.json({
    success: true,
    message: `Đã xóa Key [${id}] khỏi Pool`,
    data: keyManager.getHealthStats()
  });
});

// ─────────────────────────────────────────────────────────────
// 5. POST /api/internal/keys/test-failover — Giả lập lỗi 429 để kiểm tra Failover
// ─────────────────────────────────────────────────────────────
router.post('/test-failover', (req, res) => {
  try {
    const currentKey = keyManager.getActiveKey();
    keyManager.markError(currentKey.id, { status: 429, message: 'Simulated 429 Too Many Requests (Manual Test)' });
    
    let nextKey = null;
    try {
      nextKey = keyManager.getActiveKey();
    } catch (e) {
      nextKey = { id: 'NONE_AVAILABLE' };
    }

    res.json({
      success: true,
      message: `Đã giả lập 429 thành công cho [${currentKey.id}]. Đã chuyển sang [${nextKey.id}].`,
      previousKey: currentKey.id,
      newActiveKey: nextKey.id,
      stats: keyManager.getHealthStats()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
