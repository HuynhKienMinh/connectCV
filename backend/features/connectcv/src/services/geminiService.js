const {safeError}=require('./securityError');
// geminiService.js v3 — Hardened Multi-Key Pool & Auto-Failover
const { GoogleGenerativeAI } = require('@google/generative-ai');
const keyManager = require('./keyManager');
require('dotenv').config();

// ─────────────────────────────────────────────────────────
// DYNAMIC GENAI PROXY (Tương thích 100% mã nguồn cũ)
// Tự động cấp client với active key mới nhất từ RAM Key Pool
// ─────────────────────────────────────────────────────────
const genAI = {
  getGenerativeModel(options) {
    const activeKey = keyManager.getActiveKey().apiKey;
    const client = new GoogleGenerativeAI(activeKey);
    return client.getGenerativeModel(options);
  }
};

// ─────────────────────────────────────────────────────────
// HELPER: Trích xuất JSON an toàn từ text LLM
// ─────────────────────────────────────────────────────────
function extractJSON(rawText) {
  if (!rawText) throw new Error('Nội dung từ Gemini AI rỗng.');
  const text = rawText.trim();

  try { return JSON.parse(text); } catch (e) {}

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch (e) {}
  }

  const fb = text.indexOf('{'), fb2 = text.indexOf('[');
  let start = -1, end = -1;
  if (fb !== -1 && (fb2 === -1 || fb < fb2)) { start = fb; end = text.lastIndexOf('}'); }
  else if (fb2 !== -1)                        { start = fb2; end = text.lastIndexOf(']'); }

  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1).trim()); } catch (e) {}
  }

  throw new Error('Không thể trích xuất JSON từ phản hồi AI.');
}

// ─────────────────────────────────────────────────────────
// HELPER: Race giữa Gemini call và timeout (45 giây)
// ─────────────────────────────────────────────────────────
async function withTimeout(promise, ms = 45000, label = 'Gemini') {
  let timer;
  try { return await Promise.race([
    promise,
    new Promise((_, reject) =>
      timer = setTimeout(() => reject(new Error(`[Timeout] ${label} không phản hồi sau ${ms / 1000}s`)), ms)
    )
  ]); } finally { clearTimeout(timer); }
}

// ─────────────────────────────────────────────────────────
// MODEL CHAIN — Tối ưu tốc độ và độ ổn định
// ─────────────────────────────────────────────────────────
const MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Gọi Gemini AI sinh JSON — Kết hợp Auto-Failover Key Pool + Model Fallback
 */
async function callGeminiJSON(prompt, preferredModel = 'gemini-2.5-flash-lite') {
  return keyManager.executeWithRetry(async (activeApiKey) => {
    const client = new GoogleGenerativeAI(activeApiKey);
    const modelsToTry = [preferredModel, ...MODEL_CHAIN.filter(m => m !== preferredModel)];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } }
        }, { timeout: 45000 });

        const result = await withTimeout(
          model.generateContent(prompt),
          45000,
          modelName
        );

        const text = result.response.text();
        return extractJSON(text);
      } catch (error) {
        // Nếu lỗi do Auth (403, key hỏng), ném ra ngay để thu hồi key
        if (keyManager.isAuthError(error)) {
          throw error;
        }
        // Nếu lỗi 429 (hạn mức model), ghi log và thử model tiếp theo trong chuỗi
        if (keyManager.isRateLimitError(error)) {
          console.warn(`[Gemini] Model ${modelName} chạm hạn mức (429), tự động chuyển sang model dự phòng tiếp theo...`);
        } else {
          console.warn(`[Gemini] Model ${modelName} lỗi: ${safeError(error)}`);
        }
        lastError = error;
      }
    }

    console.error('[Gemini] Toàn bộ model đều thất bại:', safeError(lastError));
    throw lastError || new Error('AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
  }, 'callGeminiJSON');
}

/**
 * Gọi Gemini AI sinh text tự do — Kết hợp Auto-Failover Key Pool + Model Fallback
 */
async function callGeminiText(prompt, preferredModel = 'gemini-2.5-flash-lite') {
  return keyManager.executeWithRetry(async (activeApiKey) => {
    const client = new GoogleGenerativeAI(activeApiKey);
    const modelsToTry = [preferredModel, ...MODEL_CHAIN.filter(m => m !== preferredModel)];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = client.getGenerativeModel({ model: modelName, generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } } }, { timeout: 45000 });
        const result = await withTimeout(model.generateContent(prompt), 45000, modelName);
        return result.response.text();
      } catch (error) {
        if (keyManager.isAuthError(error)) {
          throw error;
        }
        if (keyManager.isRateLimitError(error)) {
          console.warn(`[Gemini] Model ${modelName} chạm hạn mức (429), tự động chuyển sang model dự phòng tiếp theo...`);
        } else {
          console.warn(`[Gemini] Model ${modelName} lỗi: ${safeError(error)}`);
        }
        lastError = error;
      }
    }

    throw lastError || new Error('AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
  }, 'callGeminiText');
}

module.exports = {
  genAI,
  keyManager,
  callGeminiJSON,
  callGeminiText,
  extractJSON
};
