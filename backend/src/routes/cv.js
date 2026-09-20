// [Route - Minh] AI tối ưu hóa CV chuẩn ATS theo JD: nhận { jdText, profile } → LLM xử lý → trả kết quả + link PDF
const express = require('express');
const router = express.Router();
const { callGeminiJSON } = require('../services/geminiService');

/**
 * @route   POST /api/cv/generate
 * @desc    Tạo CV độc bản theo JD, tối ưu hóa từ khóa chuẩn ATS (>90%)
 * @body    { jdText, profile, companyName, language }
 */
router.post('/generate', async (req, res) => {
  try {
    const { jdText, profile, companyName, language = 'vi' } = req.body;

    if (!jdText || !profile) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin JD công việc (jdText) và Hồ sơ ứng viên (profile)!'
      });
    }

    const prompt = `
Bạn là chuyên gia tư vấn nghề nghiệp cấp cao và chuyên gia tối ưu hóa CV chuẩn ATS (Applicant Tracking System) quốc tế.
Nhiệm vụ của bạn là phân tích sâu Bản mô tả công việc (JD) của công ty "${companyName || 'Nhà tuyển dụng'}" và Hồ sơ ứng viên để tạo ra một bản CV độc bản, cá nhân hóa sâu sắc, đạt điểm số ATS vượt trội (>90%).

HỒ SƠ ỨNG VIÊN (PROFILE):
${typeof profile === 'object' ? JSON.stringify(profile, null, 2) : profile}

BẢN MÔ TẢ CÔNG VIỆC (JD):
${jdText}

YÊU CẦU CHI TIẾT:
1. Ngôn ngữ trình bày: ${language === 'en' ? 'Tiếng Anh chuyên nghiệp (English)' : 'Tiếng Việt chuẩn mực'}.
2. Tối ưu hóa từ khóa ATS: Khéo léo lồng ghép các từ khóa then chốt từ JD vào các phần tóm tắt, kỹ năng và kinh nghiệm của ứng viên nhưng tuyệt đối trung thực với năng lực thực tế.
3. Văn phong: Chuyên nghiệp, định lượng hóa các thành tích bằng con số hoặc tỷ lệ phần trăm.
4. ĐỊNH DẠNG TRẢ VỀ: BẮT BUỘC trả về duy nhất một đối tượng JSON hợp lệ (không kèm bất kỳ văn bản giải thích nào ngoài JSON) theo cấu trúc sau:
{
  "atsScore": 95,
  "targetRole": "Tên vị trí ứng tuyển",
  "company": "${companyName || 'Doanh nghiệp'}",
  "summary": "Đoạn tóm tắt giới thiệu bản thân nổi bật (3-4 câu)...",
  "highlightedSkills": {
    "technical": ["Kỹ năng chuyên môn 1", "Kỹ năng 2"],
    "soft": ["Kỹ năng mềm 1", "Kỹ năng mềm 2"]
  },
  "tailoredExperience": [
    {
      "role": "Vị trí công việc",
      "organization": "Tên công ty/Tổ chức",
      "duration": "Thời gian",
      "achievements": [
        "Thành tích 1 đo lường cụ thể có số liệu...",
        "Thành tích 2 tối ưu từ khóa khớp với JD..."
      ]
    }
  ],
  "education": [
    {
      "degree": "Bằng cấp/Chuyên ngành",
      "school": "Tên trường",
      "highlights": "Điểm GPA, giải thưởng hoặc đồ án tiêu biểu"
    }
  ],
  "matchedKeywords": ["Từ khóa 1", "Từ khóa 2", "Từ khóa 3"],
  "missingKeywords": ["Từ khóa nên bổ sung thêm"],
  "atsRecommendations": ["Lời khuyên để tối ưu thêm 1", "Lời khuyên 2"]
}
`;

    const result = await callGeminiJSON(prompt);

    return res.status(200).json({
      success: true,
      message: 'Tạo CV độc bản chuẩn ATS thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/generate:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo CV qua AI',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cv/ats-score
 * @desc    Đo lường và chấm điểm một bản CV có sẵn so với JD (0 - 100 điểm)
 * @body    { cvText, jdText }
 */
router.post('/ats-score', async (req, res) => {
  try {
    const { cvText, jdText } = req.body;

    if (!cvText || !jdText) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung CV (cvText) và bản mô tả công việc (jdText)!'
      });
    }

    const prompt = `
Bạn là hệ thống Applicant Tracking System (ATS) thông minh kết hợp chuyên gia tuyển dụng.
Hãy đánh giá mức độ tương thích và chấm điểm bản CV sau đây so với bản mô tả công việc (JD).

NỘI DUNG CV:
${cvText}

BẢN MÔ TẢ CÔNG VIỆC (JD):
${jdText}

YÊU CẦU ĐÁNH GIÁ:
1. Chấm điểm tương thích tổng thể từ 0 đến 100.
2. Liệt kê các từ khóa quan trọng đã khớp (matchedKeywords) và các từ khóa trọng yếu còn thiếu (missingKeywords).
3. Đưa ra điểm mạnh, điểm yếu và 3 lời khuyên hành động cụ thể để nâng điểm ATS.

Trả về duy nhất định dạng JSON:
{
  "atsScore": 82,
  "matchRatePercent": 82,
  "matchedKeywords": ["Node.js", "PostgreSQL", "REST API"],
  "missingKeywords": ["Docker", "Redis", "CI/CD"],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"],
  "actionableRecommendations": [
    "Bổ sung thêm từ khóa Docker vào phần kinh nghiệm dự án",
    "Định lượng kết quả làm việc bằng phần trăm cải thiện hiệu năng"
  ]
}
`;

    const result = await callGeminiJSON(prompt);

    return res.status(200).json({
      success: true,
      message: 'Chấm điểm ATS thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/cv/ats-score:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể chấm điểm ATS qua AI',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cv/export-data
 * @desc    Chuẩn bị dữ liệu CV hoàn chỉnh để Frontend render template hoặc xuất PDF
 */
router.post('/export-data', async (req, res) => {
  try {
    const { cvData, templateStyle = 'modern_ats' } = req.body;

    if (!cvData) {
      return res.status(400).json({ success: false, message: 'Thiếu dữ liệu CV để xuất!' });
    }

    return res.status(200).json({
      success: true,
      message: 'Dữ liệu CV đã sẵn sàng xuất PDF',
      exportPayload: {
        templateStyle,
        cvData,
        generatedAt: new Date().toISOString(),
        pdfDownloadReady: true
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
