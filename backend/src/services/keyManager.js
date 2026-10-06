const {safeError}=require('./securityError');
// [KeyManager] In-Memory Multi-Key Pool & Auto-Failover Service
// Designed for ConnectCV AI Core — High Availability & Zero-Downtime Key Rotation
const fs = require('fs');
const path = require('path');
const https = require('https');

class KeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.keyFilePath = path.resolve(__dirname, '../../.keys.json');
    this.cooldownDurationMs = parseInt(process.env.GEMINI_KEY_COOLDOWN_MS, 10) || 10 * 60 * 1000; // 10 phút mặc định

    // Khởi tạo nạp danh sách Key vào RAM
    this.loadKeysFromStorage();

    // Đăng ký POSIX SIGHUP Signal cho Docker/Linux zero-downtime hot-reload
    if (typeof process.on === 'function') {
      try {
        process.on('SIGHUP', () => {
          console.log('\n🔄 [KeyManager] [SIGHUP Received] Đang nạp lại danh sách API Key vào RAM trong 0.001s...');
          this.reloadKeys();
        });
      } catch (e) {
        // Windows hoặc môi trường không hỗ trợ SIGHUP bỏ qua lỗi
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1. NẠP KHÓA VÀO BỘ NHỚ RAM (IN-MEMORY)
  // ─────────────────────────────────────────────────────────────
  loadKeysFromStorage() {
    let loadedList = [];

    // Ưu tiên 1: File backend/.keys.json
    if (process.env.NODE_ENV !== 'production' && fs.existsSync(this.keyFilePath)) {
      try {
        const raw = fs.readFileSync(this.keyFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedList = parsed.map((item, idx) => ({
            id: item.id || `key_${idx + 1}`,
            apiKey: String(item.apiKey || '').trim()
          })).filter(k => k.apiKey.length > 10);
        }
      } catch (err) {
        console.error('Key storage read failed:', safeError(err));
      }
    }

    // Ưu tiên 2: Biến môi trường GEMINI_API_KEYS (danh sách cách nhau bằng dấu phẩy)
    if (loadedList.length === 0 && process.env.GEMINI_API_KEYS) {
      const keysArray = process.env.GEMINI_API_KEYS.split(',').map(s => s.trim()).filter(Boolean);
      loadedList = keysArray.map((k, idx) => ({
        id: `env_key_${idx + 1}`,
        apiKey: k
      }));
    }

    // Ưu tiên 3: Biến đơn GEMINI_API_KEY
    if (loadedList.length === 0 && process.env.GEMINI_API_KEY) {
      loadedList = [
        {
          id: 'env_gemini_main',
          apiKey: process.env.GEMINI_API_KEY.trim()
        }
      ];
    }

    // Nạp vào pool trong RAM, giữ lại metrics nếu key đã tồn tại từ trước
    const existingMap = new Map(this.keys.map(k => [k.id, k]));
    this.keys = loadedList.map(k => {
      const existing = existingMap.get(k.id);
      return {
        id: k.id,
        apiKey: k.apiKey,
        status: existing ? existing.status : 'ACTIVE',
        coolingUntil: existing ? existing.coolingUntil : null,
        totalSuccess: existing ? existing.totalSuccess : 0,
        totalErrors: existing ? existing.totalErrors : 0,
        consecutiveRateLimits: existing ? existing.consecutiveRateLimits : 0,
        lastUsedAt: existing ? existing.lastUsedAt : null,
        lastError: existing ? existing.lastError : null
      };
    });

    console.log(`🛡️  [KeyManager] In-Memory Pool đã nạp ${this.keys.length} API Key(s) sẵn sàng hoạt động.`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. HELPER: MASK KEY BẢO MẬT KHI LOG / HIỂN THỊ
  // ─────────────────────────────────────────────────────────────
  maskKey(keyStr) {
    if (!keyStr || keyStr.length < 12) return '***';
    return `${keyStr.substring(0, 6)}...${keyStr.substring(keyStr.length - 4)}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. LẤY KEY ĐANG ACTIVE (ROUND-ROBIN VỚI AUTO-RECOVERY)
  // ─────────────────────────────────────────────────────────────
  getActiveKey() {
    const now = Date.now();

    // Tự động phục hồi các key đã hết thời gian cooling-down
    for (const k of this.keys) {
      if (k.status === 'COOLING_DOWN' && k.coolingUntil && now >= k.coolingUntil) {
        k.status = 'ACTIVE';
        k.coolingUntil = null;
        k.consecutiveRateLimits = 0;
        console.log(`♻️  [KeyManager] Key [${k.id}] đã hết thời gian cách ly (${Math.round(this.cooldownDurationMs / 60000)}p). Đưa lại vào Pool ACTIVE.`);
      }
    }

    // Lọc danh sách các key đang ACTIVE
    const activeKeys = this.keys.filter(k => k.status === 'ACTIVE');

    if (activeKeys.length === 0) {
      // Trường hợp khẩn cấp: Tất cả các key đều đang bị cooling down
      const coolingKeys = this.keys.filter(k => k.status === 'COOLING_DOWN');
      if (coolingKeys.length > 0) {
        coolingKeys.sort((a, b) => (a.coolingUntil || 0) - (b.coolingUntil || 0));
        const earliest = coolingKeys[0];
        const waitSec = Math.max(1, Math.round((earliest.coolingUntil - now) / 1000));
        console.warn(`⚠️  [KeyManager] Toàn bộ Key đều đang Cooling-down. Key sớm nhất [${earliest.id}] sẽ mở sau ${waitSec}s.`);
        throw new Error(`Dịch vụ AI đang bận vì toàn bộ API Key chạm hạn mức (Quota). Vui lòng thử lại sau ${waitSec} giây.`);
      }
      throw new Error('Không có Gemini API Key nào khả dụng trong hệ thống. Vui lòng liên hệ quản trị viên.');
    }

    // Round-robin chọn key tiếp theo
    this.currentIndex = (this.currentIndex + 1) % activeKeys.length;
    const selected = activeKeys[this.currentIndex];
    selected.lastUsedAt = now;
    return selected;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. KIỂM TRA PHÂN LOẠI LỖI (ERROR DETECTION)
  // ─────────────────────────────────────────────────────────────
  isRateLimitError(err) {
    if (!err) return false;
    const msg = String(err.message || '').toLowerCase();
    const status = err.status || (err.response && err.response.status);
    return (
      status === 429 ||
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('resource_exhausted') ||
      msg.includes('too many requests')
    );
  }

  isAuthError(err) {
    if (!err) return false;
    const msg = String(err.message || '').toLowerCase();
    const status = err.status || (err.response && err.response.status);
    return (
      status === 400 ||
      status === 403 ||
      msg.includes('api_key_invalid') ||
      msg.includes('api key not valid') ||
      msg.includes('permission_denied') ||
      msg.includes('unregistered project')
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 5. GHI NHẬN LỖI & THỰC THI FAILOVER
  // ─────────────────────────────────────────────────────────────
  markError(keyId, err) {
    const keyObj = this.keys.find(k => k.id === keyId);
    if (!keyObj) return;

    keyObj.totalErrors++;
    keyObj.lastError = safeError(err);

    if (this.isRateLimitError(err)) {
      keyObj.status = 'COOLING_DOWN';
      keyObj.consecutiveRateLimits++;

      // Trích xuất retryDelay từ thông báo lỗi của Google nếu có (ví dụ: "retry in 33.39s" hoặc "retryDelay": "33s")
      let dynamicCooldownMs = this.cooldownDurationMs;
      const errMsg = String(err ? err.message : '');
      const retryMatch = errMsg.match(/retry in ([\d\.]+)s/i) || errMsg.match(/"retryDelay":\s*"(\d+)s"/i);
      if (retryMatch && retryMatch[1]) {
        dynamicCooldownMs = Math.max(10000, Math.ceil(parseFloat(retryMatch[1]) * 1000) + 2000);
      } else if (this.keys.length === 1) {
        // Nếu chỉ có 1 key duy nhất trong pool, chỉ cách ly 45 giây để phục hồi theo chu kỳ RPM của Google
        dynamicCooldownMs = 45000;
      }

      keyObj.coolingUntil = Date.now() + dynamicCooldownMs;
      const durationSec = Math.round(dynamicCooldownMs / 1000);
      console.warn(`🚨 [KeyManager] [AUTO-FAILOVER TRIGGERED] Key [${keyObj.id}] dính 429 Quota Exceeded! Cách ly ${durationSec}s.`);
      this.sendTelegramAlert(`🚨 [ConnectCV AI Alert]\nKey: ${keyObj.id} (${this.maskKey(keyObj.apiKey)})\nLỗi: Chạm hạn mức Quota (429 Too Many Requests)\nTrạng thái: Đang cách ly ${durationSec}s. Hệ thống tự động chuyển sang Key dự phòng.`);
    } else if (this.isAuthError(err)) {
      keyObj.status = 'REVOKED';
      console.error(`❌ [KeyManager] Key [${keyObj.id}] không hợp lệ hoặc bị Google khóa vĩnh viễn. Đã thu hồi khỏi Pool.`);
      this.sendTelegramAlert(`❌ [ConnectCV AI Alert Khẩn Cấp]\nKey: ${keyObj.id} bị Google khóa hoặc không hợp lệ (400/403)!\nĐã thu hồi vĩnh viễn khỏi Pool.`);
    }
  }

  markSuccess(keyId) {
    const keyObj = this.keys.find(k => k.id === keyId);
    if (keyObj) {
      keyObj.totalSuccess++;
      keyObj.consecutiveRateLimits = 0;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. TRÁI TIM FAILOVER: EXECUTE WITH AUTO-RETRY
  // ─────────────────────────────────────────────────────────────
  /**
   * Thực thi lệnh gọi Gemini với cơ chế tự động thử lại trên Key dự phòng nếu dính Rate Limit
   * @param {Function} operationFn - Hàm nhận `apiKey` và trả về Promise kết quả
   * @param {string} label - Tên tác vụ để log
   */
  async executeWithRetry(operationFn, label = 'AI Operation') {
    const activePoolCount = Math.max(1, this.keys.filter(k => k.status === 'ACTIVE').length);
    const maxRetries = Math.min(activePoolCount, 3); // Thử tối đa qua 3 key dự phòng
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      let currentKeyObj = null;

      try {
        currentKeyObj = this.getActiveKey();
      } catch (err) {
        throw err;
      }

      try {
        const result = await operationFn(currentKeyObj.apiKey);
        this.markSuccess(currentKeyObj.id);
        return result;
      } catch (err) {
        lastError = err;
        const isRate = this.isRateLimitError(err);
        const isAuth = this.isAuthError(err);

        if (isRate || isAuth) {
          this.markError(currentKeyObj.id, err);
          console.warn(`🔄 [KeyManager] [Auto-Failover] ${label}: Đang chuyển sang Key kế tiếp... (Lần thử ${attempt}/${maxRetries})`);
          continue; // Lặp lại vòng while để lấy key kế tiếp
        } else {
          // Lỗi do nội dung prompt, network timeout hoặc logic model thì throw ngay
          throw err;
        }
      }
    }

    throw new Error(`Hệ thống AI tạm thời quá tải sau ${maxRetries} lần chuyển key dự phòng: ${safeError(lastError)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. HOT-RELOAD VÀ THÊM/SỬA/XÓA KEY
  // ─────────────────────────────────────────────────────────────
  reloadKeys() {
    this.loadKeysFromStorage();
    return this.getHealthStats();
  }

  addKey(id, apiKey) {
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('API Key không hợp lệ (độ dài quá ngắn).');
    }
    const cleanId = String(id || `key_${Date.now()}`).trim();
    const cleanKey = apiKey.trim();

    // Kiểm tra trùng
    const idx = this.keys.findIndex(k => k.id === cleanId || k.apiKey === cleanKey);
    if (idx !== -1) {
      this.keys[idx].apiKey = cleanKey;
      this.keys[idx].status = 'ACTIVE';
      this.keys[idx].coolingUntil = null;
    } else {
      this.keys.push({
        id: cleanId,
        apiKey: cleanKey,
        status: 'ACTIVE',
        coolingUntil: null,
        totalSuccess: 0,
        totalErrors: 0,
        consecutiveRateLimits: 0,
        lastUsedAt: null,
        lastError: null
      });
    }

    this.persistKeysToDisk();
    console.log(`✅ [KeyManager] Đã thêm/cập nhật Key [${cleanId}]: ${this.maskKey(cleanKey)}`);
    return this.getHealthStats();
  }

  removeKey(id) {
    const initialLen = this.keys.length;
    this.keys = this.keys.filter(k => k.id !== id);
    if (this.keys.length !== initialLen) {
      this.persistKeysToDisk();
      console.log(`🗑️  [KeyManager] Đã xóa Key [${id}] khỏi Pool.`);
      return true;
    }
    return false;
  }

  persistKeysToDisk() {
    try {
      const dataToSave = this.keys.map(k => ({ id: k.id, apiKey: k.apiKey }));
      fs.writeFileSync(this.keyFilePath, JSON.stringify(dataToSave, null, 2), { mode: 0o600 });
    } catch (e) {
      console.error('Key storage write failed:', safeError(e));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. BÁO CÁO SỨC KHỎE POOL (HEALTH METRICS)
  // ─────────────────────────────────────────────────────────────
  getHealthStats() {
    const now = Date.now();
    return {
      totalKeys: this.keys.length,
      activeCount: this.keys.filter(k => k.status === 'ACTIVE').length,
      coolingCount: this.keys.filter(k => k.status === 'COOLING_DOWN').length,
      revokedCount: this.keys.filter(k => k.status === 'REVOKED').length,
      keys: this.keys.map(k => ({
        id: k.id,
        status: k.status,
        maskedKey: this.maskKey(k.apiKey),
        totalSuccess: k.totalSuccess,
        totalErrors: k.totalErrors,
        coolingRemainingSec: k.coolingUntil && k.coolingUntil > now ? Math.round((k.coolingUntil - now) / 1000) : 0,
        lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
        lastError: k.lastError ? k.lastError.substring(0, 100) : null
      }))
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 9. TELEGRAM ALERTING (TÙY CHỌN, HOÀN TOÀN TỰ ĐỘNG)
  // ─────────────────────────────────────────────────────────────
  sendTelegramAlert(messageText) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    try {
      const payload = JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
      });

      const req = https.request({
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      });
      req.on('error', () => {}); // Không crash nếu telegram timeout
      req.write(payload);
      req.end();
    } catch (e) {}
  }
}

// Xuất Singleton duy nhất cho toàn bộ hệ thống
module.exports = new KeyManager();
