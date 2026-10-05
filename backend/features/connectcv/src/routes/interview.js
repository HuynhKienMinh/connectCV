const {safeError}=require('../services/securityError');
// interview.js v2 — Security hardened
// ✅ Prompt injection sanitization trên tất cả AI prompts
// ✅ Audio base64 size limit (5MB max)
// ✅ Safe error messages (không leak error.message ra client)
// ✅ Input validation cơ bản trên tất cả routes
// ✅ In-memory store giới hạn 200 entries (tránh memory leak)
const express = require('express');
const router = express.Router();
const { callGeminiJSON, callGeminiText, genAI } = require('../services/geminiService');

const path = require('path');
const {CommunityStore,publicEntry}=require('../services/communityStore');
const communityStore=process.env.FEATURE_STORE_BACKEND==='firestore' ? new (require('../../../../src/services/firestoreCommunity').FirestoreCommunity)(require('../../../../src/config/firebase').db()) : new CommunityStore(process.env.COMMUNITY_STORE_FILE||path.resolve(process.env.FEATURE_STATE_DIR||path.resolve(__dirname,'../../data'),'community-secure.json'));
const legacyFile=path.resolve(__dirname,'../../data/debrief_questions.json');
// Legacy posts can be read without exposing private metadata; they earn no new reward.
if(process.env.FEATURE_STORE_BACKEND!=='firestore'&&!communityStore.entries.length&&require('fs').existsSync(legacyFile)){
 const old=JSON.parse(require('fs').readFileSync(legacyFile,'utf8'));
 if(Array.isArray(old))communityStore.state.entries=old.map(e=>({...publicEntry(e),contentHash:e.contentHash}));
}
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
    const safeProfile = sanitizeForPrompt(require('../services/aiProfilePrivacy').planningProfile(typeof profile === 'string' ? { experience: profile } : profile), 2000);

    const prompt = `
Bạn là chuyên gia phỏng vấn tuyển dụng hàng đầu.
Hãy xây dựng bộ câu hỏi phỏng vấn thực chiến cho vị trí "${safeTitle}".

Bản mô tả công việc (JD):
${safeJD}

Hồ sơ ứng viên:
${safeProfile}

YÊU CẦU: Với mỗi câu hỏi, cung cấp: category (Behavioral/Technical/Situational), difficulty (Easy/Medium/Hard), question, winningAnswerSample (chuẩn STAR).
Mỗi câu trả lời mẫu tối đa 180 từ. Đây là ví dụ GIẢ ĐỊNH để luyện tập, không phải thành tích thật của ứng viên. Nếu minh họa dữ kiện ngoài hồ sơ, ghi rõ "Ví dụ giả định"; không khẳng định ứng viên đã dùng công cụ, làm dự án hoặc đạt số liệu chưa được cung cấp.

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
    console.error('[Interview /start]', safeError(error));
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
      'Cache-Control': 'no-store'
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
    if (typeof audioBase64!=='string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64) || typeof mimeType!=='string') {
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
    console.error('[Interview /transcribe]', safeError(error));
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
      action
    } = req.body;

    const currentMsg   = (userMessage || message || '').trim();
    const rawHistory   = history || conversationHistory || [];
    const safeTitle    = escStr(jobTitle || 'Software Engineer', 100);
    const safeJD       = sanitizeForPrompt(jdText || '', 2500);
    const safeProfile  = sanitizeForPrompt(require('../services/aiProfilePrivacy').planningProfile(candidateProfile) || '', 1500);

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
1. Hãy mở đầu buổi phỏng vấn một cách tự nhiên, lịch thiệp, thân thiện và ấm áp.
2. Chào mừng ứng viên, giới thiệu ngắn gọn lý do buổi phỏng vấn và đưa ra câu hỏi mở đầu (ví dụ: mời ứng viên giới thiệu đôi nét về bản thân hoặc chia sẻ về kinh nghiệm nổi bật nhất liên quan tới vị trí này).
3. Đảm bảo câu thoại súc tích, mạch lạc (khoảng 2-3 câu, tối đa 60 từ), rất thích hợp để phát âm bằng giọng đọc AI tự nhiên (TTS). Tuyệt đối không dùng markdown, dấu sao hay ký tự lạ.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "interviewerReply": "Chào bạn! Rất vui được gặp bạn trong buổi phỏng vấn vị trí ${safeTitle} hôm nay. Để bắt đầu, bạn có thể chia sẻ đôi nét về bản thân và những kinh nghiệm nổi bật nhất của mình không?",
  "quickFeedback": "Bắt đầu buổi phỏng vấn thành công",
  "interviewPhase": "opening"
}
`;

      const result = await callGeminiJSON(prompt);
      const reply = result.interviewerReply || result.reply || `Chào bạn! Rất vui được gặp bạn trong buổi phỏng vấn vị trí ${safeTitle} hôm nay. Để bắt đầu, bạn có thể giới thiệu đôi nét về bản thân và kinh nghiệm nổi bật nhất của mình không?`;
      const quickFeedback = result.quickFeedback || result.quickEvaluation || 'Bắt đầu phiên phỏng vấn';

      return res.status(200).json({
        success: true,
        data: {
          interviewerReply: reply,
          reply: reply,
          quickFeedback: quickFeedback,
          quickEvaluation: quickFeedback,
          interviewPhase: 'opening'
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
1. Đóng vai người phỏng vấn thật: ngắn gọn ghi nhận câu trả lời vừa rồi (khen ngợi điểm mạnh hoặc hỏi sâu vào chi tiết kỹ thuật/giải pháp thực tế).
2. Đưa ra tiếp 1 câu hỏi logic, sắc bén theo mô hình STAR (Situation, Task, Action, Result) để thử thách năng lực giải quyết vấn đề của ứng viên.
3. Câu nói súc tích, tự nhiên (khoảng 2-3 câu, tối đa 70 từ), rất dễ nghe khi đọc qua TTS tiếng Việt. Tuyệt đối không dùng ký tự định dạng markdown như dấu sao hay gạch đầu dòng.
4. Kèm 1 lời nhận xét nhanh (quickFeedback) ngắn gọn để ứng viên biết điểm mạnh hoặc điểm cần cải thiện ngay lập tức.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "interviewerReply": "Câu phản hồi và câu hỏi phỏng vấn tiếp theo...",
  "quickFeedback": "Góp ý nhanh 1 câu...",
  "interviewPhase": "technical"
}
`;

    const result = await callGeminiJSON(prompt);
    const reply = result.interviewerReply || result.reply || 'Cảm ơn câu trả lời của bạn. Bạn có thể chia sẻ cụ thể hơn về một thử thách kỹ thuật lớn nhất bạn từng gặp và cách bạn đã vượt qua nó không?';
    const quickFeedback = result.quickFeedback || result.quickEvaluation || 'Phản hồi tốt';

    return res.status(200).json({
      success: true,
      data: {
        interviewerReply: reply,
        reply: reply,
        quickFeedback: quickFeedback,
        quickEvaluation: quickFeedback,
        interviewPhase: result.interviewPhase || 'technical'
      }
    });
  } catch (error) {
    console.error('[Interview /live-chat]', safeError(error));
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
    const safeProfile = sanitizeForPrompt(require('../services/aiProfilePrivacy').planningProfile(candidateProfile) || '', 1000);

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
    console.error('[Interview /live-summary]', safeError(error));
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
Chỉ đánh giá dựa trên câu trả lời đã cung cấp. improvedAnswer phải giữ nguyên dữ kiện, số liệu và công cụ; không tự thêm thành tích, thời gian hay kết quả chưa được xác nhận. Nếu thiếu thông tin, ghi gợi ý cần bổ sung ngoài câu trả lời.
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
    console.error('[Interview /evaluate]', safeError(error));
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
    console.error('[Interview /proposal]', safeError(error));
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
    if(!req.user?.id)return res.status(401).json({success:false,code:'AUTH_REQUIRED'});
    const { companyName, position, interviewQuestions, difficultyRating = 3, reviewText, anonymous = false } = req.body;

    // ─── 1. Required fields ───────────────────────────────────────
    if (!companyName || !position || !interviewQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: Tên công ty, Vị trí và ít nhất 1 câu hỏi phỏng vấn.'
      });
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
    const authorName = isAnon ? 'Ứng viên Ẩn danh' : String(req.user.fullName || req.user.name || 'Ứng viên').substring(0, 50).trim();
    const authorRole = isAnon ? 'Ứng viên' : String(position).substring(0, 60).trim();
    const authorAvatar = isAnon ? '' : '';

    const debriefEntry = {
      id: '',
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
      likesCount: 0,
      contentHash: hash
    };

    const reward=await communityStore.submit(req.user,debriefEntry,hash);
    return res.status(201).json({
      success: true,
      message: 'Chia sẻ thành công. Yêu cầu thưởng +5 Credits đã được ghi nhận; chờ tích hợp vào số dư tài khoản.',
      data: {
        ...reward,
        companyName: debriefEntry.companyName,
        totalQuestionsContributed: debriefEntry.interviewQuestions.length,
        nextShareAvailableIn: '6 giờ'
      }
    });

  } catch (error) {
    console.error('[Interview /debrief]', safeError(error));
    return res.status(error.status||500).json({ success: false, message: error.status?error.message:'Không thể lưu bài chia sẻ. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/interview/community-questions — MXH: Tìm kiếm & Lọc câu hỏi
// ─────────────────────────────────────────────────────────────────────
router.get('/community-questions', async (req, res) => {
  try {
    const { q, company, position, category, minDifficulty, sort = 'newest' } = req.query;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const entries = communityStore.list ? await communityStore.list() : communityStore.entries;
    let filtered = [...entries];

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
    entries.forEach(i => { if (i.companyName) companiesSet.add(i.companyName); });

    return res.status(200).json({
      success: true,
      totalEntries: filtered.length,
      allTotalCount: entries.length,
      topCompanies: Array.from(companiesSet).slice(0, 10),
      data: filtered.slice(0, limit).map(publicEntry)
    });
  } catch (error) {
    console.error('[Community Questions GET]', safeError(error));
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách câu hỏi cộng đồng.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/community-questions/:id/like — Thả tim / Bỏ thích bài viết
// ─────────────────────────────────────────────────────────────────────
router.post('/community-questions/:id/like',async(req,res)=>{
 if(!req.user?.id)return res.status(401).json({success:false,code:'AUTH_REQUIRED'});
 try{return res.json({success:true,data:await communityStore.like(req.user,req.params.id)});}
 catch(error){return res.status(error.status||500).json({success:false,message:error.status?error.message:'Không thể thả tim lúc này.'});}
});

module.exports = router;
