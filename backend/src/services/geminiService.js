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

  throw new Error(`Không thể trích xuất JSON từ phản hồi AI: ${text.slice(0, 150)}...`);
}

// ─────────────────────────────────────────────────────────
// HELPER: Race giữa Gemini call và timeout (45 giây)
// ─────────────────────────────────────────────────────────
function withTimeout(promise, ms = 45000, label = 'Gemini') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[Timeout] ${label} không phản hồi sau ${ms / 1000}s`)), ms)
    )
  ]);
}

// ─────────────────────────────────────────────────────────
// MODEL CHAIN — Tối ưu tốc độ và độ ổn định
// ─────────────────────────────────────────────────────────
const MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest'
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
          generationConfig: { responseMimeType: 'application/json' }
        });

        const result = await withTimeout(
          model.generateContent(prompt),
          45000,
          modelName
        );

        const text = result.response.text();
        return extractJSON(text);
      } catch (error) {
        // Nếu lỗi do Quota / Rate limit (429) hoặc Auth (403), ném lỗi ra ngoài ngay
        // để keyManager kích hoạt chuyển sang Key dự phòng
        if (keyManager.isRateLimitError(error) || keyManager.isAuthError(error)) {
          throw error;
        }
        console.warn(`[Gemini] Model ${modelName} lỗi: ${error.message}`);
        lastError = error;
      }
    }

    console.error('[Gemini] Toàn bộ model đều thất bại:', lastError?.message);
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
        const model = client.getGenerativeModel({ model: modelName });
        const result = await withTimeout(model.generateContent(prompt), 45000, modelName);
        return result.response.text();
      } catch (error) {
        if (keyManager.isRateLimitError(error) || keyManager.isAuthError(error)) {
          throw error;
        }
        console.warn(`[Gemini] Model ${modelName} lỗi: ${error.message}`);
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
