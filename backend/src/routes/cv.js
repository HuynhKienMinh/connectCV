// [Route - Minh] AI tối ưu hóa CV chuẩn ATS theo JD & Hệ thống quản lý/lựa chọn mẫu CV từ mau_CV
// ✅ v2: Input validation (Joi) + Prompt injection sanitization + templateId path traversal guard
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { callGeminiJSON } = require('../services/geminiService');
const {
  getAvailableTemplates,
  getTemplateById,
  autoMatchTemplate,
  getTemplatePreviewHtml,
  getTemplateDocxPath,
  renderCVDataToTemplateHtml
} = require('../services/templateService');

// ─────────────────────────────────────────────────────────
// HELPER: Validation schemas (Joi)
// ─────────────────────────────────────────────────────────
const profileSchema = Joi.alternatives().try(
  Joi.object().max(50),
  Joi.string().max(6000)
).required();

const generateSchema = Joi.object({
  jdText:            Joi.string().min(20).max(6000).required(),
  profile:           profileSchema,
  companyName:       Joi.string().max(150).allow('').optional(),
  targetRole:        Joi.string().max(150).allow('').optional(),
  language:          Joi.string().valid('vi', 'en').default('vi'),
  templateMode:      Joi.string().valid('auto', 'manual').default('auto'),
  selectedTemplateId: Joi.string().max(100).allow('').optional()
});

const translateSchema = Joi.object({
  cvData:         Joi.object().required(),
  targetLanguage: Joi.string().valid('vi', 'en').default('en')
});

const atsScoreSchema = Joi.object({
  cvText:  Joi.string().min(50).max(8000).required(),
  jdText:  Joi.string().min(20).max(6000).required()
});

// ─────────────────────────────────────────────────────────
// HELPER: Sanitize user input trước khi đưa vào AI prompt
// Ngăn Prompt Injection attacks
// ─────────────────────────────────────────────────────────
function sanitizeForPrompt(input, maxLength = 4000) {
  if (input === null || input === undefined) return '';
  const str = typeof input === 'object' ? JSON.stringify(input) : String(input);
  return str
    .substring(0, maxLength)
    // Xóa các pattern prompt injection phổ biến
    .replace(/ignore\s+(all\s+)?(previous\s+)?instructions?/gi, '[filtered]')
    .replace(/forget\s+(all\s+)?(previous\s+)?instructions?/gi, '[filtered]')
    .replace(/you\s+are\s+now\s+(a\s+)?/gi, '[filtered]')
    .replace(/act\s+as\s+(a\s+)?/gi, '[filtered]')
    .replace(/system\s*prompt/gi, '[filtered]')
    .replace(/jailbreak/gi, '[filtered]')
    .replace(/api[_\s-]?key/gi, '[filtered]')
    .replace(/secret[_\s-]?key/gi, '[filtered]')
    .replace(/process\.env/gi, '[filtered]')
    .replace(/<script[\s\S]*?>/gi, '[filtered]')
    .replace(/union\s+select/gi, '[filtered]')
    .replace(/drop\s+table/gi, '[filtered]');
}

// ─────────────────────────────────────────────────────────
// HELPER: Validate templateId chống path traversal
// ─────────────────────────────────────────────────────────
function validateTemplateId(id) {
  return id && /^[a-zA-Z0-9_-]{1,80}$/.test(String(id));
}

// ─────────────────────────────────────────────────────────
// HELPER: Parse profile an toàn
// ─────────────────────────────────────────────────────────
function safeParseProfile(profile) {
  if (typeof profile === 'object' && profile !== null) return profile;
  if (typeof profile === 'string') {
    try { return JSON.parse(profile); } catch (e) { return {}; }
  }
  return {};
}

/**
 * @route   GET /api/cv/templates
 * @desc    Lấy toàn bộ danh sách mẫu CV ATS
 */
router.get('/templates', (req, res) => {
  try {
    const templates = getAvailableTemplates();
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách mẫu CV thành công!',
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/templates:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách mẫu CV' });
  }
});

/**
 * @route   POST /api/cv/templates/recommend
 * @desc    Tự động đề xuất mẫu CV tối ưu nhất (AI Match)
 * @body    { targetRole, companyName, jdText, profile }
 */
router.post('/templates/recommend', async (req, res) => {
  try {
    const { targetRole, companyName, jdText, profile } = req.body;
    const recommendation = await autoMatchTemplate({
      targetRole: sanitizeForPrompt(targetRole, 200),
      companyName: sanitizeForPrompt(companyName, 200),
      jdText: sanitizeForPrompt(jdText, 3000),
      profile: safeParseProfile(profile)
    });
    return res.status(200).json({ success: true, message: 'Đã đề xuất mẫu CV phù hợp nhất!', data: recommendation });
  } catch (error) {
    console.error('Lỗi API /api/cv/templates/recommend:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi đề xuất mẫu CV' });
  }
});

/**
 * @route   GET /api/cv/templates/:templateId/preview
 * @desc    Xem trước giao diện HTML của mẫu CV
 */
router.get('/templates/:templateId/preview', (req, res) => {
  try {
    const { templateId } = req.params;
    if (!validateTemplateId(templateId)) {
      return res.status(400).send('Template ID không hợp lệ');
    }
    const html = getTemplatePreviewHtml(templateId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return res.status(404).send('Không thể tải preview mẫu CV');
  }
});

/**
 * @route   GET /api/cv/templates/:templateId/download-docx
 * @desc    Tải file mẫu Word (.docx) gốc
 */
router.get('/templates/:templateId/download-docx', (req, res) => {
  try {
    const { templateId } = req.params;
    if (!validateTemplateId(templateId)) {
      return res.status(400).json({ success: false, message: 'Template ID không hợp lệ' });
    }
    const docxInfo = getTemplateDocxPath(templateId);
    if (!docxInfo) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file mẫu Word (.docx)' });
    }
    return res.download(docxInfo.path, docxInfo.filename);
  } catch (error) {
    console.error('Lỗi download docx mẫu:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải file mẫu Word' });
  }
});

/**
 * @route   POST /api/cv/generate
 * @desc    Tạo CV độc bản theo JD, kết hợp lựa chọn mẫu CV (Tự động hoặc Thủ công)
 * @body    { jdText, profile, companyName, targetRole, language, templateMode, selectedTemplateId }
 */
router.post('/generate', async (req, res) => {
  try {
    // ── 1. Validate input với Joi
    const { error, value } = generateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ',
        details: error.details.map(d => d.message)
      });
    }

    const { jdText, profile, companyName, targetRole, language, templateMode, selectedTemplateId } = value;

    // ── 2. Sanitize chống Prompt Injection
    const safeJD       = sanitizeForPrompt(jdText, 5000);
    const safeCompany  = sanitizeForPrompt(companyName, 150);
    const safeRole     = sanitizeForPrompt(targetRole, 150);
    const profileObj   = safeParseProfile(profile);
    const safeProfile  = sanitizeForPrompt(JSON.stringify(profileObj), 4000);

    // ── 3. Xác định mẫu CV áp dụng
    let appliedTemplate  = null;
    let templateMatchInfo = null;

    if (templateMode === 'auto') {
      const matchResult = await autoMatchTemplate({ targetRole: safeRole, companyName: safeCompany, jdText: safeJD, profile: profileObj });
      appliedTemplate   = matchResult.template;
      templateMatchInfo = { mode: 'auto', matchScore: matchResult.matchScore, reasons: matchResult.reasons };
    } else {
      if (!validateTemplateId(selectedTemplateId)) {
        return res.status(400).json({ success: false, message: 'Template ID không hợp lệ' });
      }
      appliedTemplate   = getTemplateById(selectedTemplateId);
      templateMatchInfo = { mode: 'manual', matchScore: 100, reasons: ['Người dùng lựa chọn mẫu thủ công'] };
    }

    const isEn = language === 'en';

    // ── 4. Xây dựng prompt với dữ liệu đã sanitize
    const prompt = `
Bạn là chuyên gia tư vấn nghề nghiệp cấp cao và chuyên gia tối ưu hóa CV chuẩn ATS quốc tế.
Nhiệm vụ: Phân tích JD và Hồ sơ ứng viên để tạo CV độc bản đạt điểm ATS >90%.

MẪU CV: "${appliedTemplate.title}" — Phong cách: "${appliedTemplate.style}" — Ngành: "${appliedTemplate.industry}"

HỒ SƠ ỨNG VIÊN (PROFILE):
${safeProfile}

BẢN MÔ TẢ CÔNG VIỆC (JD):
${safeJD}

YÊU CẦU:
1. NGÔN NGỮ: ${isEn
  ? 'TOÀN BỘ nội dung CV phải bằng TIẾNG ANH CHUYÊN NGHIỆP (Professional Resume English). Dịch tất cả thông tin sang thuật ngữ tiếng Anh quốc tế. Tuyệt đối không để lẫn tiếng Việt.'
  : 'TOÀN BỘ nội dung CV phải bằng TIẾNG VIỆT CHUẨN MỰC, chuyên nghiệp (giữ nguyên thuật ngữ kỹ thuật quốc tế như Node.js, Docker, API, Git...).'
}
2. Tối ưu từ khóa ATS: Lồng ghép từ khóa từ JD vào summary, skills, experience — trung thực với năng lực.
3. Văn phong: Action Verbs, định lượng thành tích (phương pháp STAR).
4. BẮT BUỘC trả về DUY NHẤT một JSON hợp lệ theo cấu trúc:
{
  "language": "${isEn ? 'en' : 'vi'}",
  "fullName": "Họ tên ứng viên",
  "atsScore": 95,
  "targetRole": "${safeRole || (isEn ? 'Target Job Title' : 'Vị trí ứng tuyển')}",
  "company": "${safeCompany || (isEn ? 'Target Employer' : 'Doanh nghiệp')}",
  "summary": "Tóm tắt chuyên nghiệp 3-4 câu...",
  "highlightedSkills": {
    "technical": ["Skill 1", "Skill 2"],
    "soft": ["Soft Skill 1"]
  },
  "tailoredExperience": [
    {
      "role": "Vị trí công việc",
      "organization": "Tên công ty",
      "duration": "${isEn ? 'Jan 2023 - Present' : '01/2023 - Hiện tại'}",
      "achievements": ["Thành tích 1 có số liệu đo lường...", "Thành tích 2..."]
    }
  ],
  "education": [
    {
      "degree": "${isEn ? 'Bachelor of Science' : 'Cử nhân'}",
      "school": "Tên trường",
      "highlights": "GPA hoặc thành tích nổi bật"
    }
  ],
  "matchedKeywords": ["Keyword 1", "Keyword 2"],
  "missingKeywords": ["Keyword cần thêm"],
  "atsRecommendations": ["Lời khuyên cải thiện ATS score 1", "Lời khuyên 2"]
}
`;

    // ── 5. Gọi AI
    const aiResult = await callGeminiJSON(prompt);

    // ── 6. Render HTML
    const renderedHtml = renderCVDataToTemplateHtml(appliedTemplate, aiResult, profileObj, language);

    return res.status(200).json({
      success: true,
      message: 'Tạo CV độc bản chuẩn ATS và áp dụng mẫu thành công!',
      data: aiResult,
      appliedTemplate: {
        id: appliedTemplate.id,
        slug: appliedTemplate.slug,
        title: appliedTemplate.title,
        style: appliedTemplate.style,
        themeColor: appliedTemplate.themeColor,
        layout: appliedTemplate.layout,
        industry: appliedTemplate.industry,
        matchInfo: templateMatchInfo
      },
      renderedHtml
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/generate:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo CV qua AI. Vui lòng thử lại.' });
  }
});

/**
 * @route   POST /api/cv/render
 * @desc    Đổi mẫu CV hoặc render lại bản CV có sẵn với mẫu khác
 * @body    { cvData, templateId, profile, language }
 */
router.post('/render', (req, res) => {
  try {
    const { cvData, templateId, profile, language = 'vi' } = req.body;
    if (!cvData) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp cvData!' });
    }
    if (!validateTemplateId(templateId)) {
      return res.status(400).json({ success: false, message: 'Template ID không hợp lệ' });
    }

    const template    = getTemplateById(templateId);
    const profileObj  = safeParseProfile(profile);
    const html        = renderCVDataToTemplateHtml(template, cvData, profileObj, language);

    return res.status(200).json({
      success: true,
      template: { id: template.id, slug: template.slug, title: template.title, themeColor: template.themeColor, style: template.style },
      renderedHtml: html
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/render:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi render CV' });
  }
});

/**
 * @route   POST /api/cv/translate
 * @desc    Dịch chuyển đổi ngôn ngữ bản CV giữa Tiếng Việt và Tiếng Anh
 */
router.post('/translate', async (req, res) => {
  try {
    const { error, value } = translateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', details: error.details.map(d => d.message) });
    }

    const { cvData, targetLanguage } = value;
    const isEn = targetLanguage === 'en';

    const prompt = `
Bạn là chuyên gia dịch thuật CV quốc tế.
Hãy dịch toàn bộ nội dung JSON CV sau sang ${isEn ? 'TIẾNG ANH CHUYÊN NGHIỆP (Professional Resume English)' : 'TIẾNG VIỆT CHUẨN MỰC cho CV tuyển dụng tại Việt Nam'}.

YÊU CẦU:
1. Dịch chính xác, tự nhiên, chuẩn thuật ngữ CV quốc tế. Thuật ngữ kỹ thuật (Node.js, Docker, API...) giữ nguyên.
2. Bảo toàn 100% cấu trúc JSON và số liệu thành tích.
3. Trường "language" đặt là "${targetLanguage}".
4. BẮT BUỘC trả về DUY NHẤT một JSON hợp lệ.

DỮ LIỆU CV:
${JSON.stringify(cvData, null, 2).substring(0, 5000)}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({
      success: true,
      message: `Đã chuyển đổi CV sang ${isEn ? 'Tiếng Anh' : 'Tiếng Việt'} thành công!`,
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/translate:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi dịch CV. Vui lòng thử lại.' });
  }
});

/**
 * @route   POST /api/cv/ats-score
 * @desc    Đo lường và chấm điểm một bản CV có sẵn so với JD (0–100)
 */
router.post('/ats-score', async (req, res) => {
  try {
    const { error, value } = atsScoreSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', details: error.details.map(d => d.message) });
    }

    const { cvText, jdText } = value;
    const prompt = `
Bạn là hệ thống ATS thông minh. Hãy đánh giá mức độ tương thích CV với JD.

NỘI DUNG CV:
${sanitizeForPrompt(cvText, 5000)}

BẢN MÔ TẢ CÔNG VIỆC (JD):
${sanitizeForPrompt(jdText, 3000)}

YÊU CẦU: Chấm điểm 0-100, liệt kê từ khóa đã khớp và còn thiếu, đưa 3 lời khuyên hành động cụ thể.

Trả về DUY NHẤT JSON:
{
  "atsScore": 82,
  "matchRatePercent": 82,
  "matchedKeywords": ["Node.js", "PostgreSQL", "REST API"],
  "missingKeywords": ["Docker", "Redis", "CI/CD"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1"],
  "actionableRecommendations": [
    "Bổ sung Docker vào phần kinh nghiệm dự án",
    "Định lượng kết quả làm việc bằng tỷ lệ % cải thiện hiệu năng",
    "Thêm từ khóa Redis vào phần kỹ năng"
  ]
}
`;

    const result = await callGeminiJSON(prompt);
    return res.status(200).json({ success: true, message: 'Chấm điểm ATS thành công!', data: result });
  } catch (error) {
    console.error('Lỗi API /api/cv/ats-score:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể chấm điểm ATS. Vui lòng thử lại.' });
  }
});

module.exports = router;
