// interview.js v2 — Security hardened
// ✅ Prompt injection sanitization trên tất cả AI prompts
// ✅ Audio base64 size limit (5MB max)
// ✅ Safe error messages (không leak error.message ra client)
// ✅ Input validation cơ bản trên tất cả routes
// ✅ In-memory store giới hạn 200 entries (tránh memory leak)
const express = require('express');
const router = express.Router();
const { callGeminiJSON, callGeminiText, genAI } = require('../services/geminiService');

// ─── Persistent Debrief Store: Lưu vào backend/data/debrief_questions.json ──
const fs = require('fs');
const path = require('path');
const DEBRIEF_FILE = path.resolve(__dirname, '../../data/debrief_questions.json');
const MAX_DEBRIEF_ENTRIES = 500;

let communityDebriefQuestions = [];

function loadDebriefStore() {
  try {
    if (fs.existsSync(DEBRIEF_FILE)) {
      const raw = fs.readFileSync(DEBRIEF_FILE, 'utf8');
      communityDebriefQuestions = JSON.parse(raw);
      console.log(`[Debrief Store] Loaded ${communityDebriefQuestions.length} entries from disk.`);
    } else {
      console.log('[Debrief Store] Initializing empty or default store.');
      communityDebriefQuestions = [];
    }
  } catch (e) {
    console.error('[Debrief Store] Error reading debrief file:', e.message);
    communityDebriefQuestions = [];
  }
}

async function saveDebriefStore() {
  try {
    const dir = path.dirname(DEBRIEF_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await fs.promises.writeFile(DEBRIEF_FILE, JSON.stringify(communityDebriefQuestions, null, 2), 'utf8');
  } catch (e) {
    console.error('[Debrief Store] Error saving debrief file:', e.message);
  }
}

// Khởi động nạp dữ liệu từ file
loadDebriefStore();


// ─── Helper: Sanitize user input trước khi nhúng vào AI prompt ──
function sanitizeForPrompt(input, maxLength = 3000) {
  if (!input) return '';
  const str = typeof input === 'object' ? JSON.stringify(input) : String(input);
  return str
    .substring(0, maxLength)
    .replace(/ignore\s+(all\s+)?(previous\s+)?instructions?/gi, '[filtered]')
    .replace(/forget\s+(all\s+)?(previous\s+)?instructions?/gi, '[filtered]')
    .replace(/you\s+are\s+now/gi, '[filtered]')
    .replace(/act\s+as\s+/gi, '[filtered]')
    .replace(/system\s*prompt/gi, '[filtered]')
    .replace(/jailbreak/gi, '[filtered]')
    .replace(/api[_\s-]?key/gi, '[filtered]')
    .replace(/process\.env/gi, '[filtered]')
    .replace(/<script[\s\S]*?>/gi, '[filtered]')
    .replace(/union\s+select/gi, '[filtered]');
}

// ─── Helper: Escape text an toàn để render trong JSON prompt ──
function escStr(s, max = 200) {
  return sanitizeForPrompt(String(s || ''), max).replace(/"/g, '\\"');
}

// ─── TTS Helper (sử dụng service chuẩn có caching và clean text) ──
const { generateSpeechMP3 } = require('../services/ttsService');

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/start — Tạo bộ câu hỏi phỏng vấn STAR
// ─────────────────────────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  try {
    const { jobTitle, jdText, profile } = req.body;
    if (!jobTitle || !jdText) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp chức danh (jobTitle) và bản mô tả công việc (jdText)!' });
    }

    // Validate kích thước input
    if (String(jdText).length > 5000) {
      return res.status(400).json({ success: false, message: 'Bản mô tả công việc quá dài (tối đa 5000 ký tự).' });
    }

    const safeTitle   = escStr(jobTitle, 150);
    const safeJD      = sanitizeForPrompt(jdText, 4000);
    const safeProfile = sanitizeForPrompt(typeof profile === 'object' ? JSON.stringify(profile) : (profile || 'Chưa cung cấp hồ sơ'), 2000);

    const prompt = `
Bạn là chuyên gia phỏng vấn tuyển dụng hàng đầu.
Hãy xây dựng bộ câu hỏi phỏng vấn thực chiến cho vị trí "${safeTitle}".

Bản mô tả công việc (JD):
${safeJD}

Hồ sơ ứng viên:
${safeProfile}

YÊU CẦU: Với mỗi câu hỏi, cung cấp: category (Behavioral/Technical/Situational), difficulty (Easy/Medium/Hard), question, winningAnswerSample (chuẩn STAR).

BẮT BUỘC trả về duy nhất JSON:
{
  "jobTitle": "${safeTitle}",
  "totalQuestions": 3,
  "questions": [
    {
      "id": 1,
      "category": "Technical",
      "difficulty": "Medium",
      "question": "Nội dung câu hỏi...",
      "winningAnswerSample": "Dạ, trong dự án X... (S) Nhiệm vụ... (T) Em đã... (A) Kết quả... (R)"
    }
  ]
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, message: 'Tạo bộ câu hỏi phỏng vấn thành công!', data: result });
  } catch (error) {
    console.error('[Interview /start]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo bộ câu hỏi. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/tts — Chuyển đổi văn bản sang giọng nói
// ─────────────────────────────────────────────────────────────────────
router.post('/tts', async (req, res) => {
  try {
    const { text, voice = 'vi-VN-HoaiMyNeural' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung văn bản (text)!' });
    }
    // Giới hạn TTS text 1000 chars tránh abuse
    const safeText = String(text).trim().substring(0, 1000);

    const VALID_VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];
    const safeVoice = VALID_VOICES.includes(voice) ? voice : 'vi-VN-NamMinhNeural';

    const audioBuffer = await generateSpeechMP3(safeText, safeVoice);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.end(audioBuffer);
  } catch (err) {
    console.error('[Interview /tts]', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo âm thanh giọng đọc AI.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/transcribe — Nhận diện giọng nói → văn bản
// ─────────────────────────────────────────────────────────────────────
router.post('/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu âm thanh (audioBase64)!' });
    }

    // ✅ FIX: Giới hạn kích thước base64 audio (5MB = ~6.7MB base64)
    const MAX_AUDIO_B64 = 7 * 1024 * 1024; // 7MB base64 ≈ 5MB audio
    if (audioBase64.length > MAX_AUDIO_B64) {
      return res.status(400).json({ success: false, message: 'File âm thanh quá lớn. Giới hạn 5MB mỗi đoạn ghi âm.' });
    }

    // Validate mimeType (whitelist)
    const ALLOWED_MIME = ['audio/webm', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
    if (!ALLOWED_MIME.includes(cleanMimeType)) {
      return res.status(400).json({ success: false, message: 'Định dạng âm thanh không được hỗ trợ.' });
    }

    const candidateModels = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    let transcript = '';
    let lastError  = null;

    const transcribePrompt = `Bạn là trợ lý nhận diện giọng nói tiếng Việt.
Nhiệm vụ: Phiên âm CHÍNH XÁC lời nói trong âm thanh. CHỈ trả về văn bản thuần túy.
KHÔNG xuất SRT, timestamp, số thứ tự. Nếu im lặng hoàn toàn, trả về: [Không nghe rõ]`;

    for (const modelName of candidateModels) {
      try {
        const model  = genAI.getGenerativeModel({ model: modelName });
        const result = await Promise.race([
          model.generateContent([{ inlineData: { mimeType: cleanMimeType, data: audioBase64 } }, { text: transcribePrompt }]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 30s')), 30000))
        ]);
        transcript = result.response.text().trim()
          .replace(/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/gi, '')
          .replace(/^\s*\d+\s*$/gm, '')
          .trim();
        if (!transcript || transcript.length < 2) transcript = '[Không nghe rõ]';
        if (transcript) { lastError = null; break; }
      } catch (err) {
        console.warn(`[Transcribe] Model ${modelName}:`, err.message);
        lastError = err;
      }
    }

    if (!transcript && lastError) {
      return res.status(200).json({ success: false, transcript: '[Không nghe rõ]', data: { transcript: '[Không nghe rõ]' }, message: 'Không thể nhận diện giọng nói lúc này.' });
    }
    return res.status(200).json({ success: true, transcript, data: { transcript } });
  } catch (error) {
    console.error('[Interview /transcribe]', error.message);
    return res.status(500).json({ success: false, transcript: '[Không nghe rõ]', data: { transcript: '[Không nghe rõ]' }, message: 'Lỗi xử lý âm thanh.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/live-chat — Phỏng vấn live theo lượt (Start & Reply)
// ─────────────────────────────────────────────────────────────────────
router.post('/live-chat', async (req, res) => {
  try {
    const {
      userMessage,
      message,
      jobTitle,
      conversationHistory,
      history,
      jdText,
      candidateProfile,
      action,
      voice
    } = req.body;

    const VALID_VOICES = ['vi-VN-NamMinhNeural', 'vi-VN-HoaiMyNeural'];
    const safeVoice    = VALID_VOICES.includes(voice) ? voice : 'vi-VN-NamMinhNeural';

    const currentMsg   = (userMessage || message || '').trim();
    const rawHistory   = history || conversationHistory || [];
    const safeTitle    = escStr(jobTitle || 'Software Engineer', 100);
    const safeJD       = sanitizeForPrompt(jdText || '', 2500);
    const safeProfile  = sanitizeForPrompt(candidateProfile || '', 1500);

    const isStart = action === 'start' || (!currentMsg && rawHistory.length === 0);

    if (!isStart && !currentMsg) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp câu trả lời!' });
    }

    if (isStart) {
      const prompt = `
Bạn là Trưởng nhóm Tuyển dụng AI (Senior Technical Hiring Manager) tại công ty hàng đầu.
Bạn đang trực tiếp phỏng vấn ứng viên cho vị trí: "${safeTitle}".

MÔ TẢ CÔNG VIỆC (JD):
${safeJD || 'Phỏng vấn đánh giá năng lực chuyên môn và xử lý tình huống thực tế.'}

THÔNG TIN ỨNG VIÊN:
${safeProfile || 'Ứng viên vừa tham gia buổi phỏng vấn.'}

NHIỆM VỤ:
1. Mở đầu tự nhiên, lịch thiệp và thân thiện như một HR ngoài đời thực.
2. Chào mừng ứng viên và đưa ngay câu hỏi mở đầu súc tích (ví dụ: mời ứng viên giới thiệu ngắn gọn về bản thân hoặc kinh nghiệm nổi bật nhất).
3. ĐẶC BIỆT QUAN TRỌNG: Câu thoại thật ngắn gọn, súc tích (1-2 câu, tối đa 35 từ), vào thẳng trọng tâm, tuyệt đối không rườm rà dài dòng để AI phản hồi tức thì và đọc thoại tự nhiên nhất. Không dùng markdown hay ký tự lạ.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "interviewerReply": "Chào bạn! Rất vui được gặp bạn trong buổi phỏng vấn vị trí ${safeTitle}. Bạn có thể giới thiệu nhanh về bản thân và kinh nghiệm nổi bật nhất không?",
  "quickFeedback": "Bắt đầu buổi phỏng vấn thành công",
  "interviewPhase": "opening"
}
`;

      const t0 = Date.now();
      const result = await callGeminiJSON(prompt, 'gemini-flash-lite-latest', { maxOutputTokens: 180, temperature: 0.6 });
      const geminiTime = Date.now() - t0;
      const reply = result.interviewerReply || result.reply || `Chào bạn! Rất vui được gặp bạn trong buổi phỏng vấn vị trí ${safeTitle}. Bạn có thể giới thiệu nhanh về bản thân và kinh nghiệm nổi bật nhất không?`;
      const quickFeedback = result.quickFeedback || result.quickEvaluation || 'Bắt đầu phiên phỏng vấn';

      let audioBase64 = null;
      const t1 = Date.now();
      try {
        const audioBuffer = await generateSpeechMP3(reply, safeVoice);
        if (audioBuffer && audioBuffer.length > 0) {
          audioBase64 = audioBuffer.toString('base64');
        }
      } catch (ttsErr) {
        console.warn('[Interview /live-chat start TTS warning]:', ttsErr.message);
      }
      const ttsTime = Date.now() - t1;
      console.log(`[Live-Chat Start] Gemini: ${geminiTime}ms | TTS: ${ttsTime}ms | Total: ${Date.now() - t0}ms`);

      return res.status(200).json({
        success: true,
        data: {
          interviewerReply: reply,
          reply: reply,
          quickFeedback: quickFeedback,
          quickEvaluation: quickFeedback,
          interviewPhase: 'opening',
          audioBase64: audioBase64,
          voice: safeVoice
        }
      });
    }

    // Xử lý lượt phản hồi (action === 'reply')
    const safeMsg = sanitizeForPrompt(currentMsg, 800);
    const recentHist = rawHistory.slice(-8).map(h => {
      const r = h.role === 'interviewer' ? 'Interviewer' : 'Candidate';
      const text = h.message || h.content || '';
      return `${r}: ${sanitizeForPrompt(text, 400)}`;
    }).join('\n');

    const prompt = `
Bạn là Trưởng nhóm Tuyển dụng AI (Senior Technical Hiring Manager) đang phỏng vấn ứng viên cho vị trí "${safeTitle}".

MÔ TẢ CÔNG VIỆC (JD):
${safeJD}

THÔNG TIN ỨNG VIÊN:
${safeProfile}

LỊCH SỬ ĐỐI THOẠI GẦN ĐÂY:
${recentHist || '(Chưa có đối thoại trước đó)'}

ỨNG VIÊN VỪA TRẢ LỜI:
"${safeMsg}"

NHIỆM VỤ:
1. Đóng vai HR thực tế: phản xạ nhanh và súc tích (1 câu ngắn ghi nhận/khen ngợi khoảng 5-10 từ).
2. Đưa ra tiếp 1 câu hỏi trọng tâm, sắc bén theo mô hình STAR (Situation, Task, Action, Result) để thử thách năng lực giải quyết vấn đề.
3. ĐẶC BIỆT QUAN TRỌNG: Câu thoại cực kỳ súc tích (1-2 câu ngắn, tối đa 35-40 từ), không dài dòng văn vở, phù hợp đàm thoại giọng nói thời gian thực. Tuyệt đối không dùng markdown, dấu sao hay ký tự lạ.
4. Kèm 1 lời nhận xét nhanh (quickFeedback) 1 câu ngắn gọn.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "interviewerReply": "Phản hồi ngắn và câu hỏi tiếp theo...",
  "quickFeedback": "Góp ý nhanh 1 câu...",
  "interviewPhase": "technical"
}
`;

    const t0 = Date.now();
    const result = await callGeminiJSON(prompt, 'gemini-flash-lite-latest', { maxOutputTokens: 200, temperature: 0.6 });
    const geminiTime = Date.now() - t0;
    const reply = result.interviewerReply || result.reply || 'Cảm ơn câu trả lời của bạn. Bạn có thể chia sẻ cụ thể hơn về một thử thách kỹ thuật lớn nhất bạn từng gặp và cách bạn đã vượt qua nó không?';
    const quickFeedback = result.quickFeedback || result.quickEvaluation || 'Phản hồi tốt';

    let audioBase64 = null;
    const t1 = Date.now();
    try {
      const audioBuffer = await generateSpeechMP3(reply, safeVoice);
      if (audioBuffer && audioBuffer.length > 0) {
        audioBase64 = audioBuffer.toString('base64');
      }
    } catch (ttsErr) {
      console.warn('[Interview /live-chat reply TTS warning]:', ttsErr.message);
    }
    const ttsTime = Date.now() - t1;
    console.log(`[Live-Chat Reply] Gemini: ${geminiTime}ms | TTS: ${ttsTime}ms | Total: ${Date.now() - t0}ms`);

    return res.status(200).json({
      success: true,
      data: {
        interviewerReply: reply,
        reply: reply,
        quickFeedback: quickFeedback,
        quickEvaluation: quickFeedback,
        interviewPhase: result.interviewPhase || 'technical',
        audioBase64: audioBase64,
        voice: safeVoice
      }
    });
  } catch (error) {
    console.error('[Interview /live-chat]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi kết nối phỏng vấn AI. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/live-summary — Tóm tắt & Báo cáo STAR hoàn chỉnh
// ─────────────────────────────────────────────────────────────────────
router.post('/live-summary', async (req, res) => {
  try {
    const { history, conversationHistory, jobTitle, jdText, candidateProfile } = req.body;
    const rawHist = history || conversationHistory || [];
    if (!rawHist.length) {
      return res.status(400).json({ success: false, message: 'Không có lịch sử phỏng vấn để tóm tắt.' });
    }

    const safeTitle   = escStr(jobTitle || 'Software Engineer', 100);
    const safeJD      = sanitizeForPrompt(jdText || '', 2000);
    const safeProfile = sanitizeForPrompt(candidateProfile || '', 1000);

    const safeHistStr = rawHist.slice(-20).map(h => {
      const r = h.role === 'interviewer' ? 'Interviewer' : 'Candidate';
      const text = h.message || h.content || '';
      return `${r}: ${sanitizeForPrompt(text, 500)}`;
    }).join('\n');

    const prompt = `
Bạn là Hội đồng Giám khảo Tuyển dụng Cấp cao chuyên gia phỏng vấn theo phương pháp STAR.
Hãy đánh giá toàn diện buổi phỏng vấn sau cho vị trí "${safeTitle}":

JD VỊ TRÍ:
${safeJD}

HỒ SƠ ỨNG VIÊN:
${safeProfile}

LỊCH SỬ ĐỐI THOẠI TRỰC TIẾP:
${safeHistStr}

YÊU CẦU ĐÁNH GIÁ:
1. Chấm điểm tổng thể (overallScore) trên thang điểm 10 (ví dụ: 8.5).
2. Xếp loại (rating): "Xuất Sắc" (>=8.5), "Rất Tốt" (>=7.0), hoặc "Cần Trau Dồi Thêm" (<7.0).
3. Nhận định tổng quan (summary): 2-3 câu đúc kết năng lực và mức độ phù hợp.
4. Điểm mạnh nổi bật (strengths): Mảng 2-3 chuỗi điểm sáng.
5. Kỹ năng cần trau dồi (improvements): Mảng 2-3 chuỗi góp ý cải thiện.
6. Chi tiết từng lượt hỏi đáp (qaBreakdown): Mảng các object:
   - question: câu hỏi của người phỏng vấn
   - candidateAnswer: câu trả lời của ứng viên
   - score: điểm số 1-10
   - critique: nhận xét cụ thể ưu/nhược điểm
   - suggestedStarAnswer: gợi ý trả lời xuất sắc theo cấu trúc { situation, task, action, result }
7. Lời khuyên chiến lược cho buổi phỏng vấn thật (finalAdvice): 1-2 câu lời khuyên quý giá.

BẮT BUỘC trả về DUY NHẤT một JSON hợp lệ theo cấu trúc:
{
  "overallScore": 8.5,
  "rating": "Rất Tốt",
  "summary": "Ứng viên nắm vững kiến thức chuyên môn và trình bày mạch lạc...",
  "strengths": ["Nắm chắc kiến trúc hệ thống", "Tự tin trong giao tiếp"],
  "improvements": ["Cần định lượng kết quả cụ thể bằng số liệu %"],
  "qaBreakdown": [
    {
      "question": "Câu hỏi của NTD...",
      "candidateAnswer": "Câu trả lời của bạn...",
      "score": 8,
      "critique": "Nhận xét...",
      "suggestedStarAnswer": {
        "situation": "Bối cảnh tình huống...",
        "task": "Mục tiêu nhiệm vụ...",
        "action": "Giải pháp hành động...",
        "result": "Kết quả đo lường được..."
      }
    }
  ],
  "finalAdvice": "Hãy luôn mang theo số liệu đo lường thực tế để tăng tính thuyết phục..."
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[Interview /live-summary]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo tóm tắt phỏng vấn.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/evaluate — Đánh giá câu trả lời theo STAR
// ─────────────────────────────────────────────────────────────────────
router.post('/evaluate', async (req, res) => {
  try {
    const { question, candidateAnswer, category = 'General' } = req.body;
    if (!question || !candidateAnswer) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp câu hỏi và câu trả lời!' });
    }

    // Input size limit
    if (String(candidateAnswer).length > 3000) {
      return res.status(400).json({ success: false, message: 'Câu trả lời quá dài (tối đa 3000 ký tự).' });
    }

    const safeQ   = escStr(question, 500);
    const safeA   = sanitizeForPrompt(candidateAnswer, 2000);
    const safeCat = escStr(category, 50);

    const prompt = `
Bạn là giám khảo tuyển dụng cấp cao.
Câu hỏi: "${safeQ}"
Phân loại: "${safeCat}"
Câu trả lời của ứng viên: "${safeA}"

Đánh giá theo: STAR (Situation/Task/Action/Result) + Intentional Hooking.
Trả về DUY NHẤT JSON:
{
  "score": 8.5,
  "starEvaluation": {
    "situation": "Đánh giá bối cảnh...",
    "task": "Đánh giá nhiệm vụ...",
    "action": "Đánh giá hành động...",
    "result": "Đánh giá kết quả..."
  },
  "intentionalHookingEvaluation": { "applied": true, "feedback": "..." },
  "strengths": ["Điểm mạnh 1"],
  "improvements": ["Cần cải thiện 1"],
  "improvedAnswer": "Phiên bản câu trả lời hoàn thiện..."
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, message: 'Đánh giá câu trả lời thành công!', data: result });
  } catch (error) {
    console.error('[Interview /evaluate]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể đánh giá câu trả lời lúc này.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/proposal — Sinh Proposal/Cover Letter
// ─────────────────────────────────────────────────────────────────────
router.post('/proposal', async (req, res) => {
  try {
    const { projectTitle, clientRequirement, freelancerSkills, tone = 'professional' } = req.body;
    if (!projectTitle || !clientRequirement) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề dự án và yêu cầu khách hàng!' });
    }

    const VALID_TONES = ['professional', 'friendly', 'confident', 'creative'];
    const safeTone    = VALID_TONES.includes(tone) ? tone : 'professional';

    const prompt = `
Bạn là chuyên gia viết Proposal Freelance (Upwork/Fiverr) và Cover Letter.
Viết Proposal thuyết phục cho:

TIÊU ĐỀ: ${sanitizeForPrompt(projectTitle, 200)}
YÊU CẦU KHÁCH HÀNG: ${sanitizeForPrompt(clientRequirement, 2000)}
KỸ NĂNG ỨNG VIÊN: ${sanitizeForPrompt(freelancerSkills || 'Thành thạo công nghệ, tư duy giải quyết vấn đề', 1000)}
TONE: ${safeTone}

Yêu cầu: Hook 3 dòng đầu, giải pháp kỹ thuật cụ thể, CTA tự nhiên.
Trả về DUY NHẤT JSON:
{
  "subject": "Tiêu đề thư",
  "openingHook": "3 dòng mở đầu đắt giá...",
  "proposedSolution": "Giải pháp kỹ thuật...",
  "relevantExperience": "Kinh nghiệm tương đồng...",
  "callToAction": "Lời mời trao đổi...",
  "fullProposalText": "Toàn văn Proposal hoàn chỉnh..."
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, message: 'Tạo Proposal/Cover Letter thành công!', data: result });
  } catch (error) {
    console.error('[Interview /proposal]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo Proposal lúc này.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// DEBRIEF ANTI-SPAM SYSTEM
// ─────────────────────────────────────────────────────────────────────

// Per-IP cooldown: 1 lần/6 giờ — chặn spam liên tục từ cùng IP
// Map<ip, lastSubmitTimestamp>
const ipDebriefCooldown = new Map();
const DEBRIEF_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 giờ

// Bộ hash nội dung đã submit — chặn duplicate content
// Set<contentHash>
const submittedContentHashes = new Set();
const MAX_HASH_STORE = 10000;

// Helper: tạo hash fingerprint từ nội dung bài chia sẻ
const crypto = require('crypto');
function contentHash(companyName, position, questions) {
  const normalized = [
    companyName.toLowerCase().trim(),
    position.toLowerCase().trim(),
    ...questions.map(q => q.toLowerCase().trim().replace(/\s+/g, ' '))
  ].join('|');
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
}

// Helper: kiểm tra chất lượng nội dung (chặn random/gibberish)
function validateContentQuality(text, fieldName, minLen = 10) {
  const t = String(text || '').trim();

  // Độ dài tối thiểu
  if (t.length < minLen) {
    return `${fieldName} quá ngắn (tối thiểu ${minLen} ký tự).`;
  }

  // Tỷ lệ ký tự có nghĩa — ít nhất 50% là chữ cái / số / dấu cách
  const meaningfulChars = (t.match(/[\p{L}\p{N}\s]/gu) || []).length;
  if (meaningfulChars / t.length < 0.5) {
    return `${fieldName} chứa quá nhiều ký tự đặc biệt vô nghĩa.`;
  }

  // Phát hiện mẫu random (ký tự lặp liên tiếp nhiều lần, VD: zsxdfgdg...)
  // Nếu không có khoảng trắng VÀ không phải tên công ty viết liền (không có chữ hoa) thì reject
  if (!t.includes(' ') && t.length > 15 && !/[A-Z]/.test(t) && fieldName !== 'Câu hỏi') {
    return `${fieldName} có vẻ là dữ liệu ngẫu nhiên, không hợp lệ.`;
  }

  // Không được toàn số
  if (/^\d+$/.test(t)) {
    return `${fieldName} không thể là toàn số.`;
  }

  // Unique char ratio — chuỗi random thường có entropy cao nhưng không có space
  // Tính tỷ lệ ký tự duy nhất: nếu > 80% là duy nhất VÀ không có space → random
  const chars = t.replace(/\s/g, '');
  const uniqueChars = new Set(chars.toLowerCase()).size;
  if (chars.length > 12 && uniqueChars / chars.length > 0.75 && !t.includes(' ')) {
    return `${fieldName} có vẻ là chuỗi ký tự ngẫu nhiên, không hợp lệ.`;
  }

  return null; // valid
}

// Helper: Validate câu hỏi phỏng vấn
function validateQuestionList(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'Cần ít nhất 1 câu hỏi phỏng vấn.';
  }
  if (questions.length > 20) {
    return 'Tối đa 20 câu hỏi mỗi lần chia sẻ.';
  }

  for (let i = 0; i < questions.length; i++) {
    const q = String(questions[i] || '').trim();
    if (q.length < 15) {
      return `Câu hỏi ${i + 1} quá ngắn (tối thiểu 15 ký tự). Vui lòng nhập câu hỏi thực tế.`;
    }
    if (q.length > 500) {
      return `Câu hỏi ${i + 1} quá dài (tối đa 500 ký tự).`;
    }
    // Kiểm tra quality từng câu hỏi
    const err = validateContentQuality(q, `Câu hỏi ${i + 1}`, 15);
    if (err) return err;

    // Câu hỏi nên chứa dấu hỏi HOẶC dạng mệnh đề (không bắt buộc nhưng check cơ bản)
    const meaningfulWords = q.split(/\s+/).filter(w => w.length > 2).length;
    if (meaningfulWords < 3) {
      return `Câu hỏi ${i + 1} quá đơn giản. Vui lòng nhập câu hỏi phỏng vấn thực tế.`;
    }
  }

  return null; // valid
}

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/debrief — Chia sẻ câu hỏi thực tế nhận Credits
// ─────────────────────────────────────────────────────────────────────
router.post('/debrief', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const { companyName, position, interviewQuestions, difficultyRating = 3, reviewText, anonymous = false } = req.body;

    // ─── 1. Required fields ───────────────────────────────────────
    if (!companyName || !position || !interviewQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Tên công ty, Vị trí và ít nhất 1 câu hỏi phỏng vấn.'
      });
    }

    // ─── 2. Per-IP Rate Limit: 1 lần / 6 giờ ────────────────────
    const lastSubmit = ipDebriefCooldown.get(ip);
    if (lastSubmit) {
      const elapsed = Date.now() - lastSubmit;
      if (elapsed < DEBRIEF_COOLDOWN_MS) {
        const remaining = Math.ceil((DEBRIEF_COOLDOWN_MS - elapsed) / 60000);
        return res.status(429).json({
          success: false,
          message: `Bạn đã chia sẻ gần đây. Vui lòng chờ thêm ${remaining} phút trước khi chia sẻ tiếp.`,
          retryAfterMinutes: remaining
        });
      }
    }

    // ─── 3. Content Quality Validation ──────────────────────────
    const companyErr = validateContentQuality(companyName, 'Tên công ty', 3);
    if (companyErr) return res.status(400).json({ success: false, message: companyErr });

    const positionErr = validateContentQuality(position, 'Vị trí phỏng vấn', 5);
    if (positionErr) return res.status(400).json({ success: false, message: positionErr });

    // Parse questions: có thể là array hoặc string phân tách bởi \n
    let questions = Array.isArray(interviewQuestions)
      ? interviewQuestions
      : String(interviewQuestions).split('\n').map(s => s.trim()).filter(Boolean);

    const questionErr = validateQuestionList(questions);
    if (questionErr) return res.status(400).json({ success: false, message: questionErr });

    // reviewText: không bắt buộc nhưng nếu có phải có ý nghĩa
    if (reviewText && String(reviewText).trim().length > 0) {
      const reviewErr = validateContentQuality(String(reviewText), 'Đánh giá', 10);
      if (reviewErr) return res.status(400).json({ success: false, message: reviewErr });
    }

    // ─── 4. Duplicate Detection — Hash-based ────────────────────
    const hash = contentHash(
      String(companyName),
      String(position),
      questions.slice(0, 5) // hash 5 câu đầu đủ để detect trùng
    );

    if (submittedContentHashes.has(hash)) {
      return res.status(409).json({
        success: false,
        message: 'Nội dung này đã được chia sẻ trước đó. Mỗi bài chia sẻ phải là thông tin phỏng vấn thực tế mới và độc đáo.'
      });
    }

    // ─── 5. Store entry ──────────────────────────────────────────
    if (communityDebriefQuestions.length >= MAX_DEBRIEF_ENTRIES) {
      communityDebriefQuestions.splice(MAX_DEBRIEF_ENTRIES - 1);
    }

    // Tự động nhận diện tags từ câu hỏi và vị trí
    const combinedText = `${position} ${questions.join(' ')}`.toLowerCase();
    const potentialTags = [
      'Node.js', 'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Golang',
      'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS',
      'System Design', 'Microservices', 'Clean Architecture', 'API', 'Security', 'Testing',
      'Data Analysis', 'Product', 'Marketing', 'Behavioral', 'STAR Method'
    ];
    const detectedTags = potentialTags.filter(tag => combinedText.includes(tag.toLowerCase())).slice(0, 5);
    if (detectedTags.length === 0) detectedTags.push('Kỹ Năng Chung');

    // Nhận diện category
    const isIT = /(developer|engineer|coder|lập trình|backend|frontend|fullstack|devops|security|qa|tester|ai|data)/i.test(position);
    const category = isIT ? 'IT' : 'Business';

    const isAnon = Boolean(anonymous);
    const authorName = isAnon ? 'Ứng viên Ẩn danh' : String(req.body.authorName || 'Huỳnh Kiên Minh').substring(0, 50).trim();
    const authorRole = isAnon ? 'Ứng viên' : String(req.body.authorRole || position).substring(0, 60).trim();
    const authorAvatar = isAnon ? '' : String(req.body.authorAvatar || '').substring(0, 500);

    const debriefEntry = {
      id: 'deb-' + Date.now(),
      authorName,
      authorRole,
      authorAvatar,
      companyName: String(companyName).substring(0, 100).trim(),
      position: String(position).substring(0, 100).trim(),
      difficultyRating: Math.min(5, Math.max(1, Number(difficultyRating) || 3)),
      category,
      tags: detectedTags,
      interviewQuestions: questions.slice(0, 20).map(q => String(q).substring(0, 500).trim()),
      reviewText: String(reviewText || '').substring(0, 1000).trim() || 'Phỏng vấn thực tế',
      anonymous: isAnon,
      sharedAt: new Date().toISOString(),
      likesCount: 1, // Khởi tạo 1 like động viên
      likedIps: [ip],
      awardedCredits: 5,
      contentHash: hash
    };

    communityDebriefQuestions.unshift(debriefEntry);

    // Lưu bền vững vào file JSON
    await saveDebriefStore();

    // ─── 6. Ghi nhận IP cooldown & hash ─────────────────────────
    ipDebriefCooldown.set(ip, Date.now());

    // Dọn dẹp hash store nếu quá lớn
    if (submittedContentHashes.size >= MAX_HASH_STORE) {
      const first = submittedContentHashes.values().next().value;
      submittedContentHashes.delete(first);
    }
    submittedContentHashes.add(hash);

    console.log(`[Debrief] ✅ New entry: "${debriefEntry.companyName}" / "${debriefEntry.position}" — IP: ${ip}`);

    return res.status(201).json({
      success: true,
      message: '🎉 Chia sẻ thành công! Bạn đã nhận +5 Credits. Cảm ơn đóng góp cho cộng đồng!',
      data: {
        awardedCredits: 5,
        debriefId: debriefEntry.id,
        companyName: debriefEntry.companyName,
        totalQuestionsContributed: debriefEntry.interviewQuestions.length,
        nextShareAvailableIn: '6 giờ'
      }
    });

  } catch (error) {
    console.error('[Interview /debrief]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể lưu bài chia sẻ. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/interview/community-questions — MXH: Tìm kiếm & Lọc câu hỏi
// ─────────────────────────────────────────────────────────────────────
router.get('/community-questions', (req, res) => {
  try {
    const { q, company, position, category, minDifficulty, sort = 'newest' } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    let filtered = [...communityDebriefQuestions];

    // 1. Tìm kiếm tổng quát (q): khớp trong company, position, câu hỏi, review, tags
    if (q && typeof q === 'string' && q.trim()) {
      const kw = q.trim().toLowerCase();
      filtered = filtered.filter(item => {
        const inCompany = item.companyName?.toLowerCase().includes(kw);
        const inPosition = item.position?.toLowerCase().includes(kw);
        const inReview = item.reviewText?.toLowerCase().includes(kw);
        const inTags = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(kw));
        const inQuestions = Array.isArray(item.interviewQuestions) && item.interviewQuestions.some(ques => ques.toLowerCase().includes(kw));
        return inCompany || inPosition || inReview || inTags || inQuestions;
      });
    }

    // 2. Lọc theo Company
    if (company && typeof company === 'string' && company.trim()) {
      filtered = filtered.filter(i => i.companyName.toLowerCase().includes(company.trim().toLowerCase()));
    }

    // 3. Lọc theo Position
    if (position && typeof position === 'string' && position.trim()) {
      filtered = filtered.filter(i => i.position.toLowerCase().includes(position.trim().toLowerCase()));
    }

    // 4. Lọc theo Category (IT, Business...)
    if (category && category !== 'ALL') {
      filtered = filtered.filter(i => i.category === category);
    }

    // 5. Lọc theo độ khó tối thiểu
    if (minDifficulty && Number(minDifficulty)) {
      filtered = filtered.filter(i => (i.difficultyRating || 3) >= Number(minDifficulty));
    }

    // 6. Sắp xếp
    if (sort === 'popular') {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else {
      // Mặc định: Mới nhất
      filtered.sort((a, b) => new Date(b.sharedAt || 0) - new Date(a.sharedAt || 0));
    }

    // Danh sách công ty nổi bật để gợi ý tìm kiếm
    const companiesSet = new Set();
    communityDebriefQuestions.forEach(i => { if (i.companyName) companiesSet.add(i.companyName); });

    return res.status(200).json({
      success: true,
      totalEntries: filtered.length,
      allTotalCount: communityDebriefQuestions.length,
      topCompanies: Array.from(companiesSet).slice(0, 10),
      data: filtered.slice(0, limit)
    });
  } catch (error) {
    console.error('[Community Questions GET]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách câu hỏi cộng đồng.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/community-questions/:id/like — Thả tim / Bỏ thích bài viết
// ─────────────────────────────────────────────────────────────────────
router.post('/community-questions/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    const item = communityDebriefQuestions.find(i => i.id === id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài chia sẻ.' });
    }

    if (!Array.isArray(item.likedIps)) item.likedIps = [];
    if (typeof item.likesCount !== 'number') item.likesCount = item.likedIps.length;

    const hasLiked = item.likedIps.includes(ip);
    if (hasLiked) {
      // Bỏ like
      item.likedIps = item.likedIps.filter(x => x !== ip);
      item.likesCount = Math.max(0, item.likesCount - 1);
    } else {
      // Like
      item.likedIps.push(ip);
      item.likesCount = (item.likesCount || 0) + 1;
    }

    // Lưu lại trạng thái
    await saveDebriefStore();

    return res.status(200).json({
      success: true,
      data: {
        id: item.id,
        likesCount: item.likesCount,
        hasLiked: !hasLiked
      }
    });
  } catch (error) {
    console.error('[Community Like POST]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể thả tim lúc này.' });
  }
});

module.exports = router;


