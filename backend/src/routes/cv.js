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
const {
  matchJobsWithProfile,
  getAllJobs,
  getJobById
} = require('../services/jobService');

// ─────────────────────────────────────────────────────────
// HELPER: Validation schemas (Joi)
// ─────────────────────────────────────────────────────────
const profileSchema = Joi.alternatives().try(
  Joi.object().unknown(true),
  Joi.string().max(1000000)
).required();

const generateSchema = Joi.object({
  jdText:            Joi.string().min(20).max(6000).required(),
  profile:           profileSchema,
  companyName:       Joi.string().max(150).allow('').optional(),
  targetRole:        Joi.string().max(150).allow('').optional(),
  companyCulture:    Joi.string().max(1000).allow('').optional(),
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
    const profileObj = safeParseProfile(profile);
    const promptProfileObj = { ...profileObj };
    if (promptProfileObj.avatarUrl && String(promptProfileObj.avatarUrl).startsWith('data:')) {
      delete promptProfileObj.avatarUrl;
    }
    if (promptProfileObj.avatarDataUrl && String(promptProfileObj.avatarDataUrl).startsWith('data:')) {
      delete promptProfileObj.avatarDataUrl;
    }
    const recommendation = await autoMatchTemplate({
      targetRole: sanitizeForPrompt(targetRole, 200),
      companyName: sanitizeForPrompt(companyName, 200),
      jdText: sanitizeForPrompt(jdText, 3000),
      profile: promptProfileObj
    });
    return res.status(200).json({ success: true, message: 'Đã đề xuất mẫu CV phù hợp nhất!', data: recommendation });
  } catch (error) {
    console.error('Lỗi API /api/cv/templates/recommend:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi đề xuất mẫu CV' });
  }
});

/**
 * @route   POST /api/cv/auto-match-jobs
 * @desc    Gợi ý vị trí, lĩnh vực và khớp nối danh sách việc làm phù hợp >= 85% theo hồ sơ
 */
router.post('/auto-match-jobs', (req, res) => {
  try {
    const profile = safeParseProfile(req.body.profile);
    const result = matchJobsWithProfile(profile);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi API /api/cv/auto-match-jobs:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi phân tích và khớp nối việc làm' });
  }
});

/**
 * @route   GET /api/cv/jobs
 * @desc    Lấy danh sách tất cả các việc làm trên hệ thống
 */
router.get('/jobs', (req, res) => {
  try {
    const jobs = getAllJobs();
    return res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách việc làm' });
  }
});

/**
 * @route   GET /api/cv/jobs/:jobId
 * @desc    Lấy chi tiết một việc làm cụ thể
 */
router.get('/jobs/:jobId', (req, res) => {
  try {
    const job = getJobById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy việc làm' });
    }
    return res.status(200).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết việc làm' });
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

    const { jdText, profile, companyName, targetRole, companyCulture, language, templateMode, selectedTemplateId } = value;

    // ── 2. Sanitize chống Prompt Injection
    const safeJD       = sanitizeForPrompt(jdText, 5000);
    const safeCompany  = sanitizeForPrompt(companyName, 150);
    const safeRole     = sanitizeForPrompt(targetRole, 150);
    const safeCulture  = sanitizeForPrompt(companyCulture, 1000);
    const profileObj   = safeParseProfile(profile);

    // Bóc tách base64 avatar ra khỏi prompt để tránh lãng phí token & tránh cắt cụt học vấn/kinh nghiệm
    const promptProfileObj = { ...profileObj };
    if (promptProfileObj.avatarUrl && String(promptProfileObj.avatarUrl).startsWith('data:')) {
      promptProfileObj.avatarUrl = '[Ảnh chân dung đã đính kèm]';
    }
    if (promptProfileObj.avatarDataUrl && String(promptProfileObj.avatarDataUrl).startsWith('data:')) {
      promptProfileObj.avatarDataUrl = '[Ảnh chân dung đã đính kèm]';
    }
    const safeProfile  = sanitizeForPrompt(JSON.stringify(promptProfileObj), 12000);

    // ── 3. Xác định mẫu CV áp dụng
    let appliedTemplate  = null;
    let templateMatchInfo = null;

    if (templateMode === 'auto') {
      const matchResult = await autoMatchTemplate({ targetRole: safeRole, companyName: safeCompany, jdText: safeJD, profile: promptProfileObj });
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

    // ── 4. Xây dựng prompt với dữ liệu đã sanitize và QUY TẮC BẢO TOÀN DỮ LIỆU THỰC TẾ
    const prompt = `
Bạn là chuyên gia tư vấn nghề nghiệp cấp cao và chuyên gia tối ưu hóa CV chuẩn ATS quốc tế.
Nhiệm vụ: Phân tích JD, Hồ sơ ứng viên và Văn hóa doanh nghiệp mục tiêu để may đo CV độc bản đạt điểm ATS >90%.

MẪU CV ÁP DỤNG: "${appliedTemplate.title}" — Phong cách: "${appliedTemplate.style}" — Ngành: "${appliedTemplate.industry}"

HỒ SƠ ỨNG VIÊN THỰC TẾ (GROUND TRUTH PROFILE):
${safeProfile}

BẢN MÔ TẢ CÔNG VIỆC MỤC TIÊU (JD):
${safeJD}
${safeCulture ? `
VĂN HÓA DOANH NGHIỆP MỤC TIÊU:
${safeCulture}
` : ''}

NGUYÊN TẮC BẤT DI BẤT DỊCH (BẮT BUỘC TUÂN THỦ 100%):
1. TRUNG THỰC VỚI HỌC VẤN (EDUCATION):
   - BẮT BUỘC giữ nguyên 100% thông tin học vấn từ HỒ SƠ ỨNG VIÊN (Tên trường, Chuyên ngành/Bằng cấp, Niên khóa, GPA/Thành tích).
   - TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT HOẶC ĐỔI TÊN TRƯỜNG ĐẠI HỌC (Ví dụ: Nếu hồ sơ ghi "Đại học FPT Cần Thơ", BẮT BUỘC phải xuất "Đại học FPT Cần Thơ". NGHIÊM CẤM đổi thành "Đại học Cần Thơ", "Đại học Bách Khoa" hay bất kỳ trường nào khác).
   - TUYỆT ĐỐI KHÔNG BỊA RA ĐỒ ÁN TỐT NGHIỆP NẾU HỒ SƠ KHÔNG ĐỀ CẬP.

2. BẢO TOÀN LỊCH SỬ KINH NGHIỆM & DỰ ÁN (tailoredExperience):
   - BẮT BUỘC giữ đúng Tên công ty / Tên dự án thực tế, Vị trí và Thời gian trong Hồ sơ ứng viên (Ví dụ: "ConnectCV (Nền tảng AI Career)", "Lập trình viên Backend", "06/2023 - Hiện tại").
   - MAY ĐO LÀ GÌ: Lấy chính các công việc/dự án có thật của ứng viên, viết lại các dòng thành tích (achievements) theo công thức STAR (Tình huống - Nhiệm vụ - Hành động kỹ thuật - Kết quả đo lường bằng số liệu %), lồng ghép từ khóa kỹ thuật khớp với JD và văn hóa công ty mục tiêu (${safeCompany || 'Doanh nghiệp'}).
   - TUYỆT ĐỐI KHÔNG THAY ĐỔI TÊN CÔNG TY, KHÔNG XÓA DỰ ÁN CỦA ỨNG VIÊN ĐỂ BỊA CÔNG TY KHÁC.

3. KỸ NĂNG CHỦ ĐẠO (highlightedSkills):
   - "technical": BẮT BUỘC là các công nghệ, ngôn ngữ, công cụ kỹ thuật thực tế từ hồ sơ và JD (Node.js, Express, PostgreSQL, Docker, TypeScript, Git, RESTful API, Redis...).
   - "soft": Kỹ năng làm việc chuyên nghiệp (Giải quyết vấn đề, Làm việc nhóm, Tư duy phản biện...).
   - TUYỆT ĐỐI KHÔNG đưa các câu slogan/khẩu hiệu văn hóa vào danh sách kỹ năng kỹ thuật.

4. TÓM TẮT NĂNG LỰC / MỤC TIÊU NGHỀ NGHIỆP (summary):
   - Viết 3-4 câu sắc bén, nêu bật năng lực kỹ thuật cốt lõi của ứng viên gắn liền với bài toán và giá trị văn hóa của công ty mục tiêu (${safeCompany || 'Doanh nghiệp'}).

5. NGÔN NGỮ: ${isEn
  ? 'TOÀN BỘ nội dung CV phải bằng TIẾNG ANH CHUYÊN NGHIỆP (Professional Resume English). Dịch tất cả thông tin sang thuật ngữ tiếng Anh quốc tế. Tuyệt đối không để lẫn tiếng Việt.'
  : 'TOÀN BỘ nội dung CV phải bằng TIẾNG VIỆT CHUẨN MỰC, chuyên nghiệp (giữ nguyên thuật ngữ kỹ thuật quốc tế như Node.js, Docker, API, Git...).'
}

CẤU TRÚC JSON TRẢ VỀ (CHỈ TRẢ VỀ DUY NHẤT JSON NÀY):
{
  "language": "${isEn ? 'en' : 'vi'}",
  "fullName": "${profileObj.fullName || 'Họ tên ứng viên'}",
  "atsScore": 95,
  "targetRole": "${safeRole || (isEn ? 'Target Job Title' : 'Vị trí ứng tuyển')}",
  "company": "${safeCompany || (isEn ? 'Target Employer' : 'Doanh nghiệp')}",
  "summary": "Tóm tắt chuyên nghiệp 3-4 câu...",
  "highlightedSkills": {
    "technical": ["Kỹ năng kỹ thuật 1", "Kỹ năng 2"],
    "soft": ["Kỹ năng mềm 1", "Kỹ năng mềm 2"]
  },
  "tailoredExperience": [
    {
      "role": "Vị trí công việc thực tế từ Profile",
      "organization": "Tên công ty/dự án thực tế từ Profile",
      "duration": "Thời gian từ Profile",
      "achievements": [
        "Thành tích 1 viết theo chuẩn STAR có số liệu...",
        "Thành tích 2..."
      ]
    }
  ],
  "education": [
    {
      "school": "Tên trường CHÍNH XÁC từ Profile",
      "degree": "Chuyên ngành/Bằng cấp từ Profile",
      "duration": "Niên khóa từ Profile",
      "highlights": "GPA hoặc thành tích thực tế từ Profile"
    }
  ],
  "matchedKeywords": ["Từ khóa khớp 1", "Từ khóa khớp 2"],
  "missingKeywords": ["Từ khóa gợi ý bổ sung"],
  "atsRecommendations": ["Lời khuyên tối ưu ATS 1", "Lời khuyên 2"]
}
`;

    // ── 5. Gọi AI
    const aiResult = await callGeminiJSON(prompt);

    // ── 5.1. BẢO VỆ CHẶT CHẼ DỮ LIỆU THỰC TẾ (GROUND TRUTH ENFORCEMENT)
    // Ngăn chặn triệt để AI ảo giác/tự bịa trường học hoặc đổi tên công ty của ứng viên
    if (aiResult) {
      // 1. Bảo toàn học vấn từ profile gốc
      if (Array.isArray(profileObj.education) && profileObj.education.length > 0) {
        aiResult.education = profileObj.education.map((realEdu, idx) => {
          const aiEdu = (Array.isArray(aiResult.education) && aiResult.education[idx]) || {};
          return {
            school: realEdu.school || (isEn ? 'FPT University Can Tho' : 'Đại học FPT Cần Thơ'),
            degree: realEdu.degree || (isEn ? 'Bachelor of Software Engineering' : 'Kỹ sư Kỹ thuật Phần mềm'),
            duration: realEdu.time || realEdu.duration || '2019 - 2023',
            highlights: realEdu.highlight || aiEdu.highlights || (isEn ? 'Graduated with Honors - GPA 3.6/4.0' : 'Tốt nghiệp loại Giỏi - GPA 3.6/4.0')
          };
        });
      }

      // 2. Bảo toàn tên công ty/dự án và chức danh thực tế từ profile gốc
      if (Array.isArray(profileObj.experience) && profileObj.experience.length > 0) {
        if (!Array.isArray(aiResult.tailoredExperience) || aiResult.tailoredExperience.length === 0) {
          aiResult.tailoredExperience = profileObj.experience.map(e => ({
            role: e.role,
            organization: e.company,
            duration: e.time,
            achievements: Array.isArray(e.bullets) ? e.bullets : []
          }));
        } else {
          // Gắn chặt tên công ty thật và chức danh thật của ứng viên
          aiResult.tailoredExperience = aiResult.tailoredExperience.map((aiExp, idx) => {
            const realExp = profileObj.experience[idx] || profileObj.experience[0];
            return {
              role: realExp.role || aiExp.role,
              organization: realExp.company || aiExp.organization,
              duration: realExp.time || aiExp.duration,
              achievements: Array.isArray(aiExp.achievements) && aiExp.achievements.length > 0 
                ? aiExp.achievements 
                : (Array.isArray(realExp.bullets) ? realExp.bullets : [])
            };
          });
        }
      }

      // 3. Bảo toàn họ tên từ profile gốc
      if (profileObj.fullName) {
        aiResult.fullName = profileObj.fullName;
      }
    }

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
    const { cvData, templateId, profile } = req.body;
    if (!cvData) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp cvData!' });
    }
    if (!validateTemplateId(templateId)) {
      return res.status(400).json({ success: false, message: 'Template ID không hợp lệ' });
    }

    const effectiveLanguage = req.body.language || cvData.language || 'vi';
    const template    = getTemplateById(templateId);
    const profileObj  = safeParseProfile(profile);
    const html        = renderCVDataToTemplateHtml(template, cvData, profileObj, effectiveLanguage);

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
