// interview.js v2 — Security hardened
// ✅ Prompt injection sanitization trên tất cả AI prompts
// ✅ Audio base64 size limit (5MB max)
// ✅ Safe error messages (không leak error.message ra client)
// ✅ Input validation cơ bản trên tất cả routes
// ✅ In-memory store giới hạn 200 entries (tránh memory leak)
const express = require('express');
const router = express.Router();
const { callGeminiJSON, callGeminiText, genAI } = require('../services/geminiService');

// ─── In-memory store: giới hạn 200 entries tránh memory leak ──
const MAX_DEBRIEF_ENTRIES = 200;
const communityDebriefQuestions = [
  {
    id: 'deb-001',
    companyName: 'FPT Software Cần Thơ',
    position: 'Node.js Backend Developer',
    difficultyRating: 4,
    interviewQuestions: [
      'Giải thích cơ chế Event Loop trong Node.js và cách xử lý non-blocking I/O?',
      'Em xử lý xung đột dữ liệu thế nào khi có 1000 request cùng đặt mua một sản phẩm trong 1 giây?',
      'Kinh nghiệm tối ưu query trong PostgreSQL / MongoDB của em là gì?'
    ],
    reviewText: 'Phỏng vấn 2 vòng kỹ thuật rất thực chiến, người phỏng vấn chú trọng tư duy giải quyết vấn đề.',
    sharedAt: new Date().toISOString(),
    awardedCredits: 5
  }
];

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

// ─── TTS Helper ──────────────────────────────────────────────
const MsEdgeTTS = require('msedge-tts');
const { MsEdgeTTS: TTS, OUTPUT_FORMAT } = MsEdgeTTS;

async function generateSpeechMP3(text, voiceName = 'vi-VN-HoaiMyNeural') {
  const tts = new TTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);
  const chunks = [];
  for await (const chunk of audioStream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

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
    const safeVoice = VALID_VOICES.includes(voice) ? voice : 'vi-VN-HoaiMyNeural';

    const audioBuffer = await generateSpeechMP3(safeText, safeVoice);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length, 'Cache-Control': 'public, max-age=86400' });
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
      return res.status(200).json({ success: false, transcript: '[Không nghe rõ]', message: 'Không thể nhận diện giọng nói lúc này.' });
    }
    return res.status(200).json({ success: true, transcript });
  } catch (error) {
    console.error('[Interview /transcribe]', error.message);
    return res.status(500).json({ success: false, transcript: '[Không nghe rõ]', message: 'Lỗi xử lý âm thanh.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/live-chat — Phỏng vấn live theo lượt
// ─────────────────────────────────────────────────────────────────────
router.post('/live-chat', async (req, res) => {
  try {
    const { userMessage, jobTitle, conversationHistory = [], jdText } = req.body;
    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp câu trả lời!' });
    }

    const safeMsg     = sanitizeForPrompt(userMessage, 800);
    const safeTitle   = escStr(jobTitle || 'Software Engineer', 100);
    const safeJD      = sanitizeForPrompt(jdText, 2000);
    const recentHist  = (conversationHistory || []).slice(-6).map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${sanitizeForPrompt(h.content, 300)}`).join('\n');

    const prompt = `
Bạn là Nhà tuyển dụng AI đang phỏng vấn ứng viên vị trí "${safeTitle}".
JD: ${safeJD}

Lịch sử phỏng vấn:
${recentHist || '(Bắt đầu phỏng vấn)'}

Ứng viên vừa nói: "${safeMsg}"

Hãy phản hồi tự nhiên như người phỏng vấn thật: gật đầu với điểm tốt, đào sâu điểm chưa rõ, hỏi câu tiếp theo.
Trả về DUY NHẤT JSON:
{
  "reply": "Phản hồi và câu hỏi tiếp theo của interviewer...",
  "quickEvaluation": "Đánh giá ngắn 1 câu về câu trả lời vừa rồi...",
  "interviewPhase": "opening | technical | behavioral | closing"
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[Interview /live-chat]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi kết nối phỏng vấn AI. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// POST /api/interview/live-summary — Tóm tắt phiên phỏng vấn live
// ─────────────────────────────────────────────────────────────────────
router.post('/live-summary', async (req, res) => {
  try {
    const { conversationHistory = [], jobTitle } = req.body;
    if (!conversationHistory.length) {
      return res.status(400).json({ success: false, message: 'Không có lịch sử phỏng vấn để tóm tắt.' });
    }

    const safeTitle = escStr(jobTitle || 'Software Engineer', 100);
    const safeHist  = conversationHistory.slice(-20).map(h =>
      `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${sanitizeForPrompt(h.content, 500)}`
    ).join('\n');

    const prompt = `
Bạn là chuyên gia đánh giá phỏng vấn.
Phân tích phiên phỏng vấn sau cho vị trí "${safeTitle}":

${safeHist}

Trả về DUY NHẤT JSON:
{
  "overallScore": 7.5,
  "starMethodScore": 8,
  "communicationScore": 7,
  "technicalScore": 8,
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Cần cải thiện 1"],
  "keyMoments": ["Khoảnh khắc nổi bật..."],
  "hiringRecommendation": "Strong Yes | Yes | Maybe | No",
  "overallFeedback": "Nhận xét tổng thể..."
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
// POST /api/interview/debrief — Chia sẻ câu hỏi thực tế nhận Credits
// ─────────────────────────────────────────────────────────────────────
router.post('/debrief', async (req, res) => {
  try {
    const { companyName, position, interviewQuestions, difficultyRating = 3, reviewText, anonymous = false } = req.body;

    if (!companyName || !position || !Array.isArray(interviewQuestions) || interviewQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên công ty, vị trí và ít nhất 1 câu hỏi phỏng vấn!' });
    }

    // Validate question count
    if (interviewQuestions.length > 20) {
      return res.status(400).json({ success: false, message: 'Tối đa 20 câu hỏi mỗi lần chia sẻ.' });
    }

    // Giới hạn in-memory store
    if (communityDebriefQuestions.length >= MAX_DEBRIEF_ENTRIES) {
      communityDebriefQuestions.splice(MAX_DEBRIEF_ENTRIES - 1);
    }

    const debriefEntry = {
      id: 'deb-' + Date.now(),
      companyName: String(companyName).substring(0, 100),
      position: String(position).substring(0, 100),
      difficultyRating: Math.min(5, Math.max(1, Number(difficultyRating) || 3)),
      interviewQuestions: interviewQuestions.slice(0, 20).map(q => String(q).substring(0, 500)),
      reviewText: String(reviewText || 'Trải nghiệm phỏng vấn tích cực').substring(0, 1000),
      anonymous: Boolean(anonymous),
      sharedAt: new Date().toISOString(),
      awardedCredits: 5
    };

    communityDebriefQuestions.unshift(debriefEntry);

    return res.status(201).json({
      success: true,
      message: '🎉 Chia sẻ câu hỏi phỏng vấn thành công! Bạn đã nhận +5 Credits vào tài khoản.',
      data: { awardedCredits: 5, debriefId: debriefEntry.id, companyName: debriefEntry.companyName, totalQuestionsContributed: debriefEntry.interviewQuestions.length }
    });
  } catch (error) {
    console.error('[Interview /debrief]', error.message);
    return res.status(500).json({ success: false, message: 'Không thể lưu bài chia sẻ. Vui lòng thử lại.' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/interview/community-questions — Lấy câu hỏi cộng đồng
// ─────────────────────────────────────────────────────────────────────
router.get('/community-questions', (req, res) => {
  try {
    const { company, position } = req.query;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    let filtered = communityDebriefQuestions;
    if (company)   filtered = filtered.filter(i => i.companyName.toLowerCase().includes(String(company).substring(0,50).toLowerCase()));
    if (position)  filtered = filtered.filter(i => i.position.toLowerCase().includes(String(position).substring(0,50).toLowerCase()));

    return res.status(200).json({ success: true, totalEntries: filtered.length, data: filtered.slice(0, limit) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách câu hỏi cộng đồng.' });
  }
});

module.exports = router;
