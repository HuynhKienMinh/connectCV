/**
 * upload.js — Secure File Upload API
 * ✅ Multer v2 với memory storage
 * ✅ Whitelist MIME type (jpg, png, webp, gif — chỉ ảnh thật)
 * ✅ Magic bytes validation (không tin vào extension)
 * ✅ File size limit 3MB
 * ✅ Sanitize filename (chặn path traversal, shell injection)
 * ✅ Chuyển đổi sang base64 DataURL để trả về frontend
 * ✅ Không lưu file tạm trên disk (memory storage → tránh leftover)
 */
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');

// ─── Cấu hình multer — Memory Storage (không ghi disk) ─────────────────
const storage = multer.memoryStorage();

// ─── Whitelist MIME type ────────────────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_EXT  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// ─── Magic Bytes (file signature) map ──────────────────────────────────
const MAGIC_BYTES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, extraCheck: (buf) => buf.slice(8,12).toString('ascii') === 'WEBP' },
];

function checkMagicBytes(buffer) {
  for (const sig of MAGIC_BYTES) {
    const slice = sig.bytes;
    let match = true;
    for (let i = 0; i < slice.length; i++) {
      if (buffer[i + (sig.offset || 0)] !== slice[i]) { match = false; break; }
    }
    if (match) {
      if (sig.extraCheck && !sig.extraCheck(buffer)) continue;
      return sig.mime;
    }
  }
  return null;
}

// ─── fileFilter — chặn từ multer level ──────────────────────────────────
function fileFilter(req, file, cb) {
  // Kiểm tra MIME type từ browser
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Chỉ chấp nhận ảnh định dạng: JPG, PNG, WEBP, GIF'));
  }
  // Kiểm tra extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Phần mở rộng file không hợp lệ'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,  // 3MB max
    files: 1,                    // Chỉ 1 file mỗi lần
    fieldSize: 1024,             // Field name/value max 1KB
  }
});

// ─── Helper: Sanitize filename ───────────────────────────────────────────
function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')  // Chỉ cho phép alphanumeric, dot, dash, underscore
    .replace(/\.{2,}/g, '.')             // Chặn ../..
    .substring(0, 100);                   // Giới hạn độ dài
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/upload/avatar
// Body: multipart/form-data với field "avatar"
// Trả về: { success: true, dataUrl: "data:image/jpeg;base64,..." }
// ─────────────────────────────────────────────────────────────────────────
router.post('/avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một file ảnh để upload.' });
    }

    const file = req.file;

    // ✅ CRITICAL: Validate magic bytes (kiểm tra nội dung thật của file, không tin extension)
    const detectedMime = checkMagicBytes(file.buffer);
    if (!detectedMime) {
      return res.status(400).json({
        success: false,
        message: 'File không phải là ảnh hợp lệ. Nội dung file không khớp với định dạng ảnh.'
      });
    }

    // Đảm bảo MIME từ browser khớp với magic bytes
    if (detectedMime !== file.mimetype) {
      return res.status(400).json({
        success: false,
        message: 'File bị giả mạo định dạng. Vui lòng upload đúng file ảnh.'
      });
    }

    // ✅ Sanitize filename (chỉ để log, không dùng trực tiếp cho filesystem)
    const safeFilename = sanitizeFilename(file.originalname);

    // ✅ Chuyển sang base64 DataURL (an toàn, không cần lưu file trên server)
    const base64Data = file.buffer.toString('base64');
    const dataUrl    = `data:${detectedMime};base64,${base64Data}`;

    // ✅ Log (không log buffer content)
    console.log(`[Upload] Avatar: ${safeFilename}, size: ${file.size}B, type: ${detectedMime}`);

    return res.status(200).json({
      success:  true,
      dataUrl,
      filename: safeFilename,
      size:     file.size,
      type:     detectedMime
    });

  } catch (error) {
    console.error('[Upload /avatar] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể xử lý ảnh. Vui lòng thử lại.' });
  }
});

// ─── Global error handler cho Multer ───────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Ảnh quá lớn. Kích thước tối đa cho phép là 3MB.' });
    }
    return res.status(400).json({ success: false, message: `Lỗi upload: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'Lỗi không xác định khi upload file.' });
  }
  next();
});

module.exports = router;
