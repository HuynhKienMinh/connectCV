// geminiService.js v2 — Thêm timeout per-request để tránh treo server
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️  CẢNH BÁO: GEMINI_API_KEY chưa được cấu hình trong .env!');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

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
// HELPER: Race giữa Gemini call và timeout
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
// MODEL CHAIN — fallback nếu model đầu lỗi
// ─────────────────────────────────────────────────────────
const MODEL_CHAIN = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest'
];

/**
 * Gọi Gemini AI sinh JSON — tự động fallback model + timeout 45s mỗi model
 */
async function callGeminiJSON(prompt, preferredModel = 'gemini-2.5-flash-lite') {
  const modelsToTry = [preferredModel, ...MODEL_CHAIN.filter(m => m !== preferredModel)];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
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
      console.warn(`[Gemini] Model ${modelName} lỗi: ${error.message}`);
      lastError = error;
    }
  }

  console.error('[Gemini] Toàn bộ model đều thất bại:', lastError?.message);
  throw new Error('AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
}

/**
 * Gọi Gemini AI sinh text tự do — với timeout 45s
 */
async function callGeminiText(prompt, preferredModel = 'gemini-2.5-flash-lite') {
  const modelsToTry = [preferredModel, ...MODEL_CHAIN.filter(m => m !== preferredModel)];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model  = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(model.generateContent(prompt), 45000, modelName);
      return result.response.text();
    } catch (error) {
      console.warn(`[Gemini] Model ${modelName} lỗi: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error('AI tạm thời không khả dụng. Vui lòng thử lại sau ít phút.');
}

module.exports = { genAI, callGeminiJSON, callGeminiText, extractJSON };
