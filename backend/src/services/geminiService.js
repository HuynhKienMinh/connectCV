const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ CẢNH BÁO: GEMINI_API_KEY chưa được cấu hình trong .env!');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

/**
 * Gọi Gemini AI sinh nội dung và tự động parse JSON an toàn
 * @param {string} prompt - Câu lệnh gửi cho AI
 * @param {string} modelName - Tên mô hình (mặc định 'gemini-1.5-flash' hoặc 'gemini-2.5-flash')
 * @returns {Promise<any>} Dữ liệu JSON hoặc Object
 */
async function callGeminiJSON(prompt, modelName = 'gemini-1.5-flash') {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    if (modelName !== 'gemini-2.5-flash') {
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await fallbackModel.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        return JSON.parse(cleanedText);
      } catch (fallbackError) {
        console.error('Lỗi Gemini API Fallback:', fallbackError.message);
        throw new Error('Lỗi từ Gemini AI: ' + fallbackError.message);
      }
    }
    console.error('Lỗi Gemini API:', error.message);
    throw new Error('Lỗi từ Gemini AI: ' + error.message);
  }
}

/**
 * Gọi Gemini AI sinh văn bản tự do (Markdown / Text)
 */
async function callGeminiText(prompt, modelName = 'gemini-1.5-flash') {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Lỗi Gemini API (Text):', error.message);
    throw new Error('Lỗi từ Gemini AI: ' + error.message);
  }
}

module.exports = {
  genAI,
  callGeminiJSON,
  callGeminiText
};
