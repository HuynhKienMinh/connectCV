// [Route - Minh] AI phỏng vấn thử (Mock Interview) & sinh Proposal Freelance & Community Debrief
const express = require('express');
const router = express.Router();
const { callGeminiJSON } = require('../services/geminiService');

// Bộ nhớ in-memory lưu trữ tạm các bài phỏng vấn thực tế do cộng đồng đóng góp
const communityDebriefQuestions = [
  {
    id: "deb-001",
    companyName: "FPT Software Cần Thơ",
    position: "Node.js Backend Developer",
    difficultyRating: 4,
    interviewQuestions: [
      "Giải thích cơ chế Event Loop trong Node.js và cách xử lý non-blocking I/O?",
      "Em xử lý xung đột dữ liệu thế nào khi có 1000 request cùng đặt mua một sản phẩm trong 1 giây?",
      "Kinh nghiệm tối ưu query trong PostgreSQL / MongoDB của em là gì?"
    ],
    reviewText: "Phỏng vấn 2 vòng kỹ thuật rất thực chiến, người phỏng vấn chú trọng tư duy giải quyết vấn đề và tối ưu hệ thống.",
    sharedAt: new Date().toISOString(),
    awardedCredits: 5
  }
];

/**
 * @route   POST /api/interview/start
 * @desc    Tạo bộ câu hỏi phỏng vấn thực chiến + Chiến thuật độc quyền "Gài mồi tích cực" (Intentional Hooking)
 * @body    { jobTitle, jdText, profile }
 */
router.post('/start', async (req, res) => {
  try {
    const { jobTitle, jdText, profile } = req.body;

    if (!jobTitle || !jdText) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp chức danh (jobTitle) và bản mô tả công việc (jdText)!'
      });
    }

    const prompt = `
Bạn là chuyên gia phỏng vấn tuyển dụng hàng đầu.
Hãy xây dựng bộ câu hỏi phỏng vấn thực chiến cho vị trí "${jobTitle}".
Bản mô tả công việc (JD):
${jdText}
Hồ sơ ứng viên:
${typeof profile === 'object' ? JSON.stringify(profile, null, 2) : (profile || 'Chưa cung cấp hồ sơ cụ thể')}

ĐẶC BIỆT LƯU Ý - TÀI SẢN TRÍ TUỆ ĐỘC QUYỀN CỦA CONNECTCV:
Với mỗi câu hỏi, hãy cung cấp:
1. "intentionalHookingTip": Mẹo hướng dẫn ứng viên kỹ thuật "Chủ động gài mồi / bẫy tích cực" (Intentional Hooking) - gieo từ khóa then chốt hoặc một tình huống sự cố kỹ thuật nhưng có bài học sâu sắc trong câu trả lời mở đầu để kích thích HR hỏi sâu đúng vào phần chuyên môn thế mạnh chuẩn bị sẵn.
2. "genericTrap": Lỗi trả lời bị động thông thường mà 95% ứng viên mắc phải.
3. "winningAnswerSample": Câu trả lời mẫu xuất sắc theo mô hình STAR (Situation, Task, Action, Result).

BẮT BUỘC trả về duy nhất định dạng JSON:
{
  "jobTitle": "${jobTitle}",
  "totalQuestions": 3,
  "questions": [
    {
      "id": 1,
      "category": "Behavioral / Technical / Situational",
      "difficulty": "Easy / Medium / Hard",
      "question": "Nội dung câu hỏi phỏng vấn...",
      "genericTrap": "Cách trả lời bị động thông thường khiến ứng viên bị hỏi khó...",
      "intentionalHookingTip": "Mẹo gài mồi: Hãy chủ động nhắc đến một sự cố cụ thể và kỹ thuật bạn tự tối ưu để HR tò mò hỏi tiếp...",
      "winningAnswerSample": "Dạ em chuyên sâu về... Một dự án nổi bật của em đã gặp [sự cố X], em đã dùng [kỹ thuật Y] để giải quyết đạt [kết quả Z]..."
    }
  ]
}
`;

    const result = await callGeminiJSON(prompt);

    return res.status(200).json({
      success: true,
      message: 'Khởi tạo phiên phỏng vấn thử thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/interview/start:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể khởi tạo câu hỏi phỏng vấn qua AI',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/interview/evaluate
 * @desc    Đánh giá và chấm điểm câu trả lời theo mô hình STAR & Kiểm tra kỹ thuật gài mồi
 * @body    { question, candidateAnswer, category }
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { question, candidateAnswer, category = 'General' } = req.body;

    if (!question || !candidateAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung câu hỏi (question) và câu trả lời của ứng viên (candidateAnswer)!'
      });
    }

    const prompt = `
Bạn là giám khảo tuyển dụng cấp cao đang đánh giá ứng viên.
Câu hỏi: "${question}"
Phân loại: "${category}"
Câu trả lời của ứng viên: "${candidateAnswer}"

HÃY ĐÁNH GIÁ THEO CÁC TIÊU CHÍ:
1. Điểm tổng thể (Thang 10).
2. Đánh giá chi tiết 4 phần mô hình STAR:
   - Situation (Bối cảnh): Ứng viên có nêu rõ hoàn cảnh không?
   - Task (Nhiệm vụ): Nhiệm vụ cụ thể cần giải quyết là gì?
   - Action (Hành động): Ứng viên đã trực tiếp làm gì (kỹ năng, phương pháp)?
   - Result (Kết quả): Kết quả có đo lường được bằng số liệu không?
3. Đánh giá kỹ thuật "Gài mồi tích cực" (Intentional Hooking): Ứng viên có gieo được chi tiết mở lửng khiến HR muốn đào sâu không?
4. Đưa ra phiên bản câu trả lời tối ưu hơn (improvedAnswer).

Trả về duy nhất định dạng JSON:
{
  "score": 8.5,
  "starEvaluation": {
    "situation": "Đánh giá bối cảnh...",
    "task": "Đánh giá nhiệm vụ...",
    "action": "Đánh giá hành động...",
    "result": "Đánh giá kết quả..."
  },
  "intentionalHookingEvaluation": {
    "applied": true,
    "feedback": "Ứng viên đã khéo léo gieo từ khóa sự cố dữ liệu..."
  },
  "strengths": ["Tự tin", "Có số liệu đo lường cụ thể"],
  "improvements": ["Nên nhấn mạnh hơn vào vai trò cá nhân thay vì dùng từ 'chúng em'"],
  "improvedAnswer": "Phiên bản câu trả lời hoàn thiện điểm 10..."
}
`;

    const result = await callGeminiJSON(prompt);

    return res.status(200).json({
      success: true,
      message: 'Đánh giá câu trả lời thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/interview/evaluate:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể đánh giá câu trả lời qua AI',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/interview/proposal
 * @desc    Tự động sinh Proposal chào thầu Freelance hoặc Thư xin việc (Cover Letter) ấn tượng
 * @body    { projectTitle, clientRequirement, freelancerSkills, tone }
 */
router.post('/proposal', async (req, res) => {
  try {
    const { projectTitle, clientRequirement, freelancerSkills, tone = 'professional' } = req.body;

    if (!projectTitle || !clientRequirement) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tiêu đề dự án (projectTitle) và yêu cầu khách hàng (clientRequirement)!'
      });
    }

    const prompt = `
Bạn là chuyên gia viết Proposal Freelance (Upwork/Fiverr) và Cover Letter xin việc hàng đầu.
Hãy viết một bản Proposal / Thư ứng tuyển thuyết phục tuyệt đối cho dự án/công việc sau:

TIÊU ĐỀ: ${projectTitle}
YÊU CẦU CỦA KHÁCH HÀNG / NHÀ TUYỂN DỤNG:
${clientRequirement}

KỸ NĂNG & KINH NGHIỆM CỦA ỨNG VIÊN:
${freelancerSkills || 'Thành thạo công nghệ, có tư duy giải quyết vấn đề nhanh'}

YÊU CẦU:
- Thu hút khách hàng ngay trong 3 dòng đầu tiên (Hook opening).
- Đưa ra giải pháp kỹ thuật cụ thể cho bài toán của khách hàng.
- Kêu gọi hành động (Call to action) tự nhiên, chuyên nghiệp.
- Tone giọng: ${tone}.

Trả về duy nhất định dạng JSON:
{
  "subject": "Tiêu đề thư ứng tuyển / Proposal",
  "openingHook": "3 dòng mở đầu đắt giá...",
  "proposedSolution": "Giải pháp kỹ thuật và lộ trình thực hiện...",
  "relevantExperience": "Kinh nghiệm tương đồng...",
  "callToAction": "Lời mời trao đổi chi tiết...",
  "fullProposalText": "Toàn văn thư proposal hoàn chỉnh sẵn sàng gửi..."
}
`;

    const result = await callGeminiJSON(prompt);

    return res.status(200).json({
      success: true,
      message: 'Tạo Proposal / Cover Letter thành công!',
      data: result
    });
  } catch (error) {
    console.error('Lỗi API /api/interview/proposal:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo proposal qua AI',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/interview/debrief
 * @desc    Chia sẻ câu hỏi sau khi phỏng vấn thực tế tại công ty thật để NHẬN CREDIT MIỄN PHÍ (+5 Free Credits)
 * @body    { companyName, position, interviewQuestions, difficultyRating, reviewText, anonymous }
 */
router.post('/debrief', async (req, res) => {
  try {
    const { companyName, position, interviewQuestions, difficultyRating = 3, reviewText, anonymous = false } = req.body;

    if (!companyName || !position || !interviewQuestions || !Array.isArray(interviewQuestions) || interviewQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên công ty, vị trí và danh sách ít nhất 1 câu hỏi phỏng vấn thực tế!'
      });
    }

    const awardedCredits = 5;

    const debriefEntry = {
      id: "deb-" + Date.now(),
      companyName,
      position,
      difficultyRating: Number(difficultyRating),
      interviewQuestions,
      reviewText: reviewText || 'Trải nghiệm phỏng vấn tích cực',
      anonymous: Boolean(anonymous),
      sharedAt: new Date().toISOString(),
      awardedCredits
    };

    communityDebriefQuestions.unshift(debriefEntry);

    return res.status(201).json({
      success: true,
      message: `🎉 Chúc mừng bạn! Chia sẻ câu hỏi phỏng vấn thành công. Bạn đã nhận được +${awardedCredits} Credits miễn phí vào tài khoản!`,
      data: {
        awardedCredits,
        debriefId: debriefEntry.id,
        companyName,
        totalQuestionsContributed: interviewQuestions.length
      }
    });
  } catch (error) {
    console.error('Lỗi API /api/interview/debrief:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/interview/community-questions
 * @desc    Lấy danh sách câu hỏi phỏng vấn thực tế do cộng đồng đóng góp
 * @query   company, position, limit
 */
router.get('/community-questions', (req, res) => {
  try {
    const { company, position, limit = 10 } = req.query;

    let filtered = communityDebriefQuestions;

    if (company) {
      filtered = filtered.filter(item => item.companyName.toLowerCase().includes(company.toLowerCase()));
    }
    if (position) {
      filtered = filtered.filter(item => item.position.toLowerCase().includes(position.toLowerCase()));
    }

    return res.status(200).json({
      success: true,
      totalEntries: filtered.length,
      data: filtered.slice(0, Number(limit))
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
