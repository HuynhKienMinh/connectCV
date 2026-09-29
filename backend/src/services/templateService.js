const fs = require('fs');
const path = require('path');
const { callGeminiJSON } = require('./geminiService');
const { buildCvTemplateHtml } = require('./templateHtmlBuilder');

// Đường dẫn thư mục mẫu CV theo yêu cầu của dự án (hỗ trợ cả Windows và Docker)
function resolveTemplatesDir() {
  const candidates = [
    'D:\\TL_CN\\K_7\\EXE_101\\mau_CV',
    '/mau_CV',
    '/mnt/d/TL_CN/K_7/EXE_101/mau_CV',
    path.resolve(__dirname, '../../../../K_7/EXE_101/mau_CV')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}
const TEMPLATES_DIR = resolveTemplatesDir();

// Định nghĩa thông tin danh mục 20 mẫu CV ATS chuẩn TopCV với 20 layout kiến trúc độc lập
const TEMPLATE_METADATA = [
  {
    id: "01_CV_ATS_Tieu_Chuan_default_v2",
    slug: "default_v2",
    title: "Mẫu CV ATS Tiêu Chuẩn - Lê Quang Dũng (B2B Sales)",
    industry: "Kinh doanh & Bán hàng",
    targetRoles: ["Business Development", "Sales Executive", "B2B Sales", "Account Manager", "Kinh doanh", "Phát triển thị trường"],
    companyTypes: ["Doanh nghiệp B2B", "Tập đoàn Thương mại", "Công ty Phân phối", "SaaS / Dịch vụ B2B"],
    style: "1 Cột Tiêu Chuẩn Kinh Điển",
    layout: "single_column_classic",
    themeColor: "#00B14F",
    tags: ["ATS Chuẩn", "B2B Sales", "1 Cột", "TopCV Classic"],
    description: "Bố cục 1 cột truyền thống kinh điển của TopCV, tối ưu hóa các con số KPI doanh thu, tăng trưởng phần trăm và kỹ năng đàm phán hợp đồng.",
    baseHtmlFile: "01_CV_ATS_Tieu_Chuan_default_v2.html",
    baseDocxFile: "01_CV_ATS_Tieu_Chuan_default_v2.docx"
  },
  {
    id: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior",
    slug: "default_junior",
    title: "Mẫu CV ATS Tiêu Chuẩn (Ít Kinh Nghiệm) - Nguyễn Minh Trang (Kiểm toán)",
    industry: "Tài chính & Kế toán",
    targetRoles: ["Audit Intern", "Junior Auditor", "Thực tập sinh Kiểm toán", "Trợ lý Kế toán", "Sinh viên mới tốt nghiệp", "Fresher"],
    companyTypes: ["Big 4 (PwC, Deloitte, EY, KPMG)", "Công ty Kiểm toán A&C, BDO, RSM", "Doanh nghiệp dịch vụ kế toán"],
    style: "1 Cột Căn Giữa Tinh Giản",
    layout: "centered_junior",
    themeColor: "#1A5276",
    tags: ["Junior", "Kiểm toán", "Học vấn nổi bật", "Hoạt động CLB"],
    description: "Bố cục căn giữa trang nhã ưu tiên thành tích học thuật, chứng chỉ nghề nghiệp ACCA, giải thưởng sinh viên và hoạt động CLB.",
    baseHtmlFile: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior.html",
    baseDocxFile: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior.docx"
  },
  {
    id: "03_CV_ATS_An_Tuong_6_impressive_6_v2",
    slug: "impressive_6_v2",
    title: "Mẫu CV ATS Ấn Tượng 6 - Trần Mạnh Dũng (Content Leader)",
    industry: "Marketing & Truyền thông",
    targetRoles: ["Content Leader", "Marketing Specialist", "Copywriter", "SEO Manager", "Social Media Lead", "Truyền thông"],
    companyTypes: ["Agency Truyền thông", "Startup Công nghệ", "Doanh nghiệp Bán lẻ", "Báo chí & Tạp chí"],
    style: "2 Cột Sidebar Đỏ Mận Đậm (Burgundy)",
    layout: "sidebar_dark_burgundy",
    themeColor: "#574040",
    tags: ["Ấn tượng 6", "Marketing", "Sáng tạo", "2 Cột Sidebar"],
    description: "Bố cục 2 cột với sidebar màu đỏ mận sang trọng, làm nổi bật thông tin liên hệ, mục tiêu và kỹ năng đo lường chuyển đổi số.",
    baseHtmlFile: "03_CV_ATS_An_Tuong_6_impressive_6_v2.html",
    baseDocxFile: "03_CV_ATS_An_Tuong_6_impressive_6_v2.docx"
  },
  {
    id: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2",
    slug: "onepage_impressive_2_v2",
    title: "Mẫu CV ATS Ấn Tượng 2 - Lê Chiến (Lập trình viên)",
    industry: "Công nghệ Thông tin",
    targetRoles: ["Front End Developer", "Mobile Developer", "Lập trình viên Web", "Full-Stack Developer", "Software Engineer", "Lập trình viên"],
    companyTypes: ["Công ty Phần mềm (FPT, VNG, Viettel, VNPT)", "Tech Startup", "Product Tech", "Fintech"],
    style: "2 Cột Xanh Rêu Đậm & Thanh Kỹ Năng (Progress Bars)",
    layout: "sidebar_moss_green_progress_bars",
    themeColor: "#3B443B",
    tags: ["Ấn tượng 2", "IT / Dev", "Thanh Kỹ Năng", "Sidebar Xanh Rêu"],
    description: "Bố cục 2 cột đặc trưng TopCV với sidebar xanh rêu đậm, avatar tròn và thanh phần trăm năng lực trực quan (85%, 95%).",
    baseHtmlFile: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2.html",
    baseDocxFile: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2.docx"
  },
  {
    id: "05_CV_ATS_Thanh_Lich_elegant",
    slug: "elegant",
    title: "Mẫu CV ATS Thanh Lịch - Nguyễn Quỳnh Như (Quản lý Nhà hàng)",
    industry: "Khách sạn & Nhà hàng",
    targetRoles: ["Quản lý nhà hàng", "Restaurant Manager", "F&B Manager", "Quản lý Khách sạn", "Hospitality Leader"],
    companyTypes: ["Khách sạn & Resort 4-5 sao", "Chuỗi Nhà hàng Cao cấp", "Doanh nghiệp Dịch vụ F&B"],
    style: "3 Cột Thông Tin Đóng Khung Viền Đỏ & Timeline Kinh Nghiệm",
    layout: "elegant_3_columns_sub",
    themeColor: "#B82A38",
    tags: ["Thanh lịch", "F&B / Hospitality", "Khung 3 Cột", "Timeline Đỏ"],
    description: "Thiết kế cao cấp với ảnh đại diện trang nhã, 3 ô thông tin đóng khung viền đỏ (Cá nhân, Học vấn, Chứng chỉ) và dòng timeline sự nghiệp.",
    baseHtmlFile: "05_CV_ATS_Thanh_Lich_elegant.html",
    baseDocxFile: "05_CV_ATS_Thanh_Lich_elegant.docx"
  },
  {
    id: "06_CV_ATS_Tham_Vong_ambitious",
    slug: "ambitious",
    title: "Mẫu CV ATS Tham Vọng - Vũ Tùng Dương (Senior Digital Marketing)",
    industry: "Marketing & Truyền thông",
    targetRoles: ["Digital Marketing Specialist", "Growth Hacker", "Senior Digital Marketing", "Paid Ads Lead", "Media Buyer"],
    companyTypes: ["Agency Digital", "Startup Tăng trưởng", "Sàn TMĐT", "Doanh nghiệp Bán lẻ"],
    style: "Sidebar Xám Than & Điểm Nhấn Cam Hổ Phách (Amber Timeline)",
    layout: "sidebar_charcoal_amber_timeline",
    themeColor: "#EC8F00",
    tags: ["Tham vọng", "Digital MKT", "Cam Hổ Phách", "Cột Mốc Tag"],
    description: "Bố cục mạnh mẽ với sidebar xám than, avatar vuông bo góc, timeline sự nghiệp với các thẻ năm cam hổ phách nổi bật.",
    baseHtmlFile: "06_CV_ATS_Tham_Vong_ambitious.html",
    baseDocxFile: "06_CV_ATS_Tham_Vong_ambitious.docx"
  },
  {
    id: "07_CV_ATS_Toi_Gian_2_minimalism_v2",
    slug: "minimalism_v2",
    title: "Mẫu CV ATS Tối Giản 2 - Phạm Thúy Hà (Kế toán nội bộ)",
    industry: "Tài chính & Kế toán",
    targetRoles: ["Nhân viên Kế toán nội bộ", "Kế toán viên tổng hợp", "Kế toán thuế", "Chuyên viên Tài chính - Kế toán", "Kế toán công nợ"],
    companyTypes: ["Doanh nghiệp Thương mại", "Công ty Cổ phần", "Tập đoàn Phân phối", "Doanh nghiệp Dịch vụ"],
    style: "Tối Giản Viền Xanh Navy Nét Đứt (Minimalist Dashed)",
    layout: "minimalist_dashed_navy",
    themeColor: "#263A4D",
    tags: ["Tối giản 2", "Kế toán nội bộ", "Xanh Navy", "Nét Đứt Tinh Tế"],
    description: "Bố cục 2 cột tối giản với các đường phân cách nét đứt màu xanh navy, tối ưu hiển thị nghiệp vụ kế toán nội bộ, kế toán thuế và báo cáo tài chính.",
    baseHtmlFile: "07_CV_ATS_Toi_Gian_2_minimalism_v2.html",
    baseDocxFile: "07_CV_ATS_Toi_Gian_2_minimalism_v2.docx"
  },
  {
    id: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2",
    slug: "pro_1_v2",
    title: "Mẫu CV ATS Chuyên Nghiệp 1 - Nguyễn Mai Loan (Quản lý phòng hành chính)",
    industry: "Hành chính & Nhân sự",
    targetRoles: ["Quản lý phòng hành chính", "Trưởng phòng hành chính", "Administration Manager", "Chuyên viên hành chính tổng hợp", "Quản trị văn phòng"],
    companyTypes: ["Tập đoàn Đa ngành", "Doanh nghiệp FDI", "Công ty Cổ phần Thương mại", "Tổ chức & Cơ quan"],
    style: "Sidebar Nâu Cà Phê & Header Tên Nổi Bật (Coffee Brown)",
    layout: "sidebar_coffee_brown",
    themeColor: "#6B4E37",
    tags: ["Chuyên nghiệp 1", "Hành chính", "Nâu Cà Phê", "Quản lý Hành chính"],
    description: "Bố cục thanh lịch với sidebar nâu cà phê và header nổi bật, tôn vinh năng lực quản trị hành chính, kiểm soát chi phí và tối ưu quy trình văn phòng.",
    baseHtmlFile: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2.html",
    baseDocxFile: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2.docx"
  },
  {
    id: "09_CV_ATS_Sang_Tao_creative",
    slug: "creative",
    title: "Mẫu CV ATS Sáng Tạo - Nguyễn Trúc Anh (Livestream & KOC)",
    industry: "Sáng tạo & Nghệ thuật",
    targetRoles: ["Content Creator", "KOC / Host Livestream", "Creative Lead", "Social Media Executive"],
    companyTypes: ["Agency Mỹ phẩm & Thời trang", "TikTok MCN", "E-commerce Studio"],
    style: "Xanh Cốm Pastel Studio (Creative Clean)",
    layout: "creative_pastel_studio",
    themeColor: "#7D8C75",
    tags: ["Sáng tạo", "Livestream", "KOC", "Xanh Cốm Pastel"],
    description: "Bố cục nghệ thuật tinh tế với tông xanh cốm pastel, tôn vinh kỷ lục doanh số bán hàng và khả năng hoạt ngôn.",
    baseHtmlFile: "09_CV_ATS_Sang_Tao_creative.html",
    baseDocxFile: "09_CV_ATS_Sang_Tao_creative.docx"
  },
  {
    id: "10_CV_ATS_Senior_Harvard_senior_v2",
    slug: "senior_v2",
    title: "Mẫu CV ATS Senior Chuẩn Harvard - Đặng Ngọc Linh (Nhân viên tư vấn)",
    industry: "Tư vấn & Chăm sóc khách hàng",
    targetRoles: ["Nhân viên tư vấn", "Tổng đài viên Chăm sóc khách hàng", "Customer Service Specialist", "Tư vấn giải pháp phần mềm", "Tư vấn tuyển sinh"],
    companyTypes: ["Tổ chức Giáo dục", "Doanh nghiệp Phần mềm & Công nghệ", "Trung tâm Chăm sóc khách hàng", "Công ty Dịch vụ"],
    style: "Harvard Ivy League Pure Text ATS (Đen Trắng Cổ Điển - Không Ảnh)",
    layout: "harvard",
    themeColor: "#000000",
    tags: ["Senior", "Chuẩn Harvard", "100% ATS Safe", "Tư vấn / CSKH"],
    description: "Chuẩn tuyển dụng Harvard định dạng văn bản thuần túy không ảnh đại diện, 100% chuẩn ATS thân thiện, nhấn mạnh thành tích duy trì 95% mức độ hài lòng khách hàng.",
    baseHtmlFile: "10_CV_ATS_Senior_Harvard_senior_v2.html",
    baseDocxFile: "10_CV_ATS_Senior_Harvard_senior_v2.docx"
  },
  {
    id: "11_CV_ATS_Clarity_clarity",
    slug: "clarity",
    title: "Mẫu CV ATS Clarity - Hoàng Tường Vy (Content Marketing)",
    industry: "Marketing & Truyền thông",
    targetRoles: ["Content Marketing", "Chuyên viên Nội dung", "Copywriter", "Social Media Executive", "Content Creator"],
    companyTypes: ["Tổ chức Giáo dục & Đào tạo", "Agency Truyền thông", "Startup Công nghệ", "Doanh nghiệp Dịch vụ"],
    style: "Modern Clarity Thẻ Kỹ Năng Tối Giản",
    layout: "modern_clarity_tags",
    themeColor: "#2E2E2E",
    tags: ["Clarity", "Content Marketing", "Thẻ Kỹ Năng", "Hiện đại"],
    description: "Thiết kế hiện đại chuẩn mực với hệ thống thẻ kỹ năng trực quan, tối ưu cho vị trí Content Marketing với số liệu tăng trưởng traffic ấn tượng.",
    baseHtmlFile: "11_CV_ATS_Clarity_clarity.html",
    baseDocxFile: "11_CV_ATS_Clarity_clarity.docx"
  },
  {
    id: "12_CV_ATS_Hien_Dai_6_modern_6_v2",
    slug: "modern_6_v2",
    title: "Mẫu CV ATS Hiện Đại 6 - Nguyễn Huyền Trang (Chuyên viên Sales Admin)",
    industry: "Kinh doanh & Bán hàng",
    targetRoles: ["Chuyên viên Sales Admin", "Sales Administrator", "Hỗ trợ Kinh doanh", "Quản lý đơn hàng", "Sales Support Specialist"],
    companyTypes: ["Doanh nghiệp Phân phối", "Công ty Thương mại", "Tập đoàn Bán lẻ", "Doanh nghiệp Sản xuất"],
    style: "Sidebar Rượu Mận Sang Trọng (Plum Wine)",
    layout: "sidebar_plum_wine",
    themeColor: "#7A415A",
    tags: ["Hiện đại 6", "Sales Admin", "ERP / SAP", "Sidebar Mận"],
    description: "Bố cục 2 cột tông màu rượu mận thanh nhã, làm nổi bật khả năng điều phối xử lý đơn hàng giá trị cao và thao tác ERP mượt mà.",
    baseHtmlFile: "12_CV_ATS_Hien_Dai_6_modern_6_v2.html",
    baseDocxFile: "12_CV_ATS_Hien_Dai_6_modern_6_v2.docx"
  },
  {
    id: "13_CV_ATS_Thanh_Nha_graceful",
    slug: "graceful",
    title: "Mẫu CV ATS Thanh Nhã - Trần Ngọc Anh (Kế toán viên)",
    industry: "Tài chính & Kế toán",
    targetRoles: ["Kế toán viên", "Kế toán tổng hợp", "Kế toán nội bộ", "Chuyên viên Kế toán - Thuế", "Kế toán viên ACCA"],
    companyTypes: ["Doanh nghiệp Xây dựng & Thương mại", "Tập đoàn Bất động sản", "Công ty Dịch vụ Kế toán", "Doanh nghiệp Cổ phần"],
    style: "Bordeaux Cân Đối & Trang Nhã",
    layout: "bordeaux_balanced",
    themeColor: "#661D1D",
    tags: ["Thanh nhã", "Kế toán tổng hợp", "ACCA", "Đỏ Bordeaux"],
    description: "Bố cục đối xứng cân bằng tông đỏ Bordeaux trang nhã, chuyên biệt hóa cho kế toán tổng hợp với kinh nghiệm xử lý hóa đơn, công nợ và quyết toán thuế.",
    baseHtmlFile: "13_CV_ATS_Thanh_Nha_graceful.html",
    baseDocxFile: "13_CV_ATS_Thanh_Nha_graceful.docx"
  },
  {
    id: "14_CV_ATS_Basic_1_basic_1_v2",
    slug: "basic_1_v2",
    title: "Mẫu CV ATS Basic 1 - Nguyễn Tùng Dương (Vận hành sàn TMĐT)",
    industry: "Thương mại Điện tử & Bán lẻ",
    targetRoles: ["Chuyên viên Vận hành TMĐT", "E-commerce Operations Specialist", "Quản lý Gian hàng Shopee / Lazada / TikTok Shop", "Vận hành Sàn"],
    companyTypes: ["Thương hiệu D2C", "Doanh nghiệp Bán lẻ Đa kênh", "Tập đoàn Thương mại Điện tử", "Agency TMĐT"],
    style: "Bạc Xám Doanh Nghiệp (Corporate Silver Grey)",
    layout: "corporate_silver_grey",
    themeColor: "#4A5568",
    tags: ["Basic 1", "TMĐT / E-commerce", "Shopee / TikTok Shop", "Xám Bạc"],
    description: "Thiết kế chuẩn chỉnh tông xám bạc, tối ưu hiển thị các chỉ số vận hành gian hàng 4.8/5.0, chạy quảng cáo nội sàn và tăng tỷ lệ chuyển đổi đơn hàng.",
    baseHtmlFile: "14_CV_ATS_Basic_1_basic_1_v2.html",
    baseDocxFile: "14_CV_ATS_Basic_1_basic_1_v2.docx"
  },
  {
    id: "15_CV_ATS_Hien_Dai_1_modern_1_v2",
    slug: "modern_1_v2",
    title: "Mẫu CV ATS Hiện Đại 1 - Đỗ Quỳnh Mai (Nhân Viên Lễ Tân Hành Chính)",
    industry: "Hành chính & Nhân sự",
    targetRoles: ["Nhân Viên Lễ Tân Hành Chính", "Lễ tân Văn phòng", "Front Desk Officer", "Nhân viên Hành chính Tổng hợp", "Chuyên viên Lễ tân"],
    companyTypes: ["Tập đoàn Đa quốc gia", "Cao ốc Văn phòng & Tòa nhà", "Doanh nghiệp Tài chính & Đầu tư", "Khách sạn & Trung tâm Sự kiện"],
    style: "Đỏ Gạch Hiện Đại & Năng Động",
    layout: "brick_red_gradient",
    themeColor: "#A94A4B",
    tags: ["Hiện đại 1", "Lễ tân Hành chính", "Đỏ Gạch", "Giao tiếp & Văn phòng"],
    description: "Tông màu đỏ gạch năng động với banner tiêu đề hiện đại, làm nổi bật kinh nghiệm trực tổng đài tiếp đón khách VIP và tổ chức sự kiện nội bộ.",
    baseHtmlFile: "15_CV_ATS_Hien_Dai_1_modern_1_v2.html",
    baseDocxFile: "15_CV_ATS_Hien_Dai_1_modern_1_v2.docx"
  },
  {
    id: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2",
    slug: "onepage_impressive_3_v2",
    title: "Mẫu CV ATS Ấn Tượng 4 - Nguyễn Lê Tú Anh (Giáo viên tiếng Anh)",
    industry: "Giáo dục & Đào tạo",
    targetRoles: ["Giáo viên tiếng Anh", "English Teacher", "Giảng viên Luyện thi IELTS / TOEIC", "Giáo viên Tiếng Anh Giao tiếp", "Gia sư Tiếng Anh"],
    companyTypes: ["Trung tâm Ngoại ngữ Quốc tế", "Trường Quốc tế & Song ngữ", "Tổ chức Giáo dục trực tuyến", "Doanh nghiệp Đào tạo Anh ngữ"],
    style: "Sidebar Xanh Cổ Vịt Tinh Tế (Teal Sidebar)",
    layout: "teal_sidebar_hr",
    themeColor: "#316160",
    tags: ["Ấn tượng 4", "Giáo viên Tiếng Anh", "IELTS / TOEIC", "Xanh Cổ Vịt"],
    description: "Sidebar màu xanh cổ vịt dịu mắt, nhấn mạnh thành tích giảng dạy 25+ lớp học, đào tạo 200+ học viên đạt điểm TOEIC trung bình 750 điểm.",
    baseHtmlFile: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2.html",
    baseDocxFile: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2.docx"
  },
  {
    id: "17_CV_ATS_Sinh_Vien_3_student_3",
    slug: "student_3",
    title: "Mẫu CV ATS Sinh Viên 3 - Vũ Hoàng Việt (Thực tập sinh Kiểm toán)",
    industry: "Tài chính & Kế toán",
    targetRoles: ["Thực tập sinh Kiểm toán", "Audit Intern", "Trợ lý Kiểm toán viên", "Thực tập sinh Tài chính", "Sinh viên mới tốt nghiệp FTU"],
    companyTypes: ["Big 4 Kiểm toán (PwC, EY, KPMG, Deloitte)", "Công ty Kiểm toán Quốc tế", "Tập đoàn Tài chính & Ngân hàng"],
    style: "Xanh Đại Dương Trẻ Trung (Student Youth Ocean)",
    layout: "student_youth_ocean",
    themeColor: "#0359AB",
    tags: ["Sinh viên 3", "Kiểm toán FTU", "Audit Intern", "Xanh Đại Dương"],
    description: "Bố cục trẻ trung màu xanh đại dương dành cho sinh viên xuất sắc FTU, nổi bật điểm số GPA 3.6 các môn kiểm toán kế toán và hoạt động CLB Nguồn nhân lực.",
    baseHtmlFile: "17_CV_ATS_Sinh_Vien_3_student_3.html",
    baseDocxFile: "17_CV_ATS_Sinh_Vien_3_student_3.docx"
  },
  {
    id: "18_CV_ATS_Basic_4_basic_4_v2",
    slug: "basic_4_v2",
    title: "Mẫu CV ATS Basic 4 - NGUYỄN KHÁNH HUYỀN (TRƯỞNG NHÓM TESTER)",
    industry: "Công nghệ Thông tin",
    targetRoles: ["Trưởng nhóm Tester", "QA Lead", "Senior Software Tester", "Test Manager", "Automation QA Lead"],
    companyTypes: ["Công ty Phần mềm Xuất khẩu (FPT, KMS, TMA)", "Tech Unicorn", "Ngân hàng Số / Fintech", "Doanh nghiệp Sản phẩm Công nghệ"],
    style: "Thẻ Module Xanh Cyan Kỹ Thuật (Cyan Modular Cards)",
    layout: "cyan_modular_cards",
    themeColor: "#0A7EB5",
    tags: ["Basic 4", "Tester Leader", "QA / Automation", "Thẻ Module Cyan"],
    description: "Bố cục dạng thẻ module xanh cyan kỹ thuật, tối ưu trình bày chứng chỉ quốc tế CAST/CETPA, kỹ năng kiểm thử API Postman và dẫn dắt đội ngũ Tester.",
    baseHtmlFile: "18_CV_ATS_Basic_4_basic_4_v2.html",
    baseDocxFile: "18_CV_ATS_Basic_4_basic_4_v2.docx"
  },
  {
    id: "19_CV_ATS_Chuyen_Gia_experts",
    slug: "experts",
    title: "Mẫu CV ATS Chuyên Gia - Nguyễn Tùng Dương (Giám đốc Quan hệ KH Doanh nghiệp)",
    industry: "Kinh doanh & Bán hàng",
    targetRoles: ["Giám đốc Quan hệ Khách hàng Doanh nghiệp", "B2B Sales Director", "Giám đốc Kinh doanh Vùng", "Head of Corporate Sales", "Business Development Director"],
    companyTypes: ["Tập đoàn Bán lẻ & Thời trang", "Tập đoàn Công nghệ Đa quốc gia", "Doanh nghiệp B2B Enterprise"],
    style: "Xanh Hoàng Gia Đẳng Cấp Chuyên Gia (Royal Blue Expert - Không Ảnh)",
    layout: "royal_blue_expert",
    themeColor: "#003161",
    tags: ["Chuyên gia", "B2B Director", "Giám đốc Kinh doanh", "Xanh Hoàng Gia"],
    description: "Định dạng chuyên gia cao cấp chuẩn ATS không ảnh đại diện, màu xanh hoàng gia sang trọng, nổi bật thành tích 15 năm kinh nghiệm và đóng góp 42% doanh thu B2B toàn công ty.",
    baseHtmlFile: "19_CV_ATS_Chuyen_Gia_experts.html",
    baseDocxFile: "19_CV_ATS_Chuyen_Gia_experts.docx"
  },
  {
    id: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1",
    slug: "dev_1",
    title: "Mẫu CV ATS Lập Trình Viên - Nguyễn Mai Anh (Kỹ Sư Phần Mềm IT)",
    industry: "Công nghệ Thông tin",
    targetRoles: ["Lập trình viên Backend", "Software Engineer", "Backend Developer", "Full-Stack Engineer", "Kỹ sư phần mềm IT", "Lập trình viên"],
    companyTypes: ["Tech Unicorn", "Global Software Enterprise", "Fintech Platform", "SaaS Startup"],
    style: "Ma Trận Công Nghệ Cao Cấp (Tech Stack Matrix)",
    layout: "tech_stack_matrix",
    themeColor: "#0984E3",
    tags: ["Lập trình viên", "Full-Stack", "Tech Matrix", "AWS / Docker"],
    description: "Mẫu thiết kế chuyên biệt cho vị trí Lập trình viên Backend và Kỹ sư phần mềm IT, làm nổi bật các kỹ năng công nghệ như Node.js, Python, PostgreSQL, Docker, tối ưu hóa các vòng lọc hồ sơ kỹ thuật của FPT Software, VNG, Viettel.",
    baseHtmlFile: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1.html",
    baseDocxFile: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1.docx"
  }
];

/**
 * Lấy toàn bộ danh sách các mẫu CV có sẵn trong thư mục D:\TL_CN\K_7\EXE_101\mau_CV
 */
function getAvailableTemplates() {
  const dirExists = fs.existsSync(TEMPLATES_DIR);

  return TEMPLATE_METADATA.map(meta => {
    const htmlFullPath = path.join(TEMPLATES_DIR, meta.baseHtmlFile);
    const docxFullPath = path.join(TEMPLATES_DIR, meta.baseDocxFile);
    const pngName = `${meta.slug}.png`;

    return {
      ...meta,
      thumbnailUrl: `/images/templates/${pngName}`,
      isAvailableInFolder: dirExists && fs.existsSync(htmlFullPath),
      hasDocx: dirExists && fs.existsSync(docxFullPath),
      htmlPath: htmlFullPath,
      docxPath: docxFullPath,
      paletteColors: [
        meta.themeColor || '#00B14F',
        '#1E293B',
        '#0284C7',
        '#059669',
        '#D97706'
      ]
    };
  });
}

/**
 * Lấy chi tiết một mẫu CV cụ thể theo ID
 */
function getTemplateById(templateId) {
  const templates = getAvailableTemplates();
  if (!templateId) return templates[0];
  const query = templateId.toLowerCase().trim();
  return templates.find(t => 
    t.id.toLowerCase() === query || 
    t.slug.toLowerCase() === query ||
    t.id.toLowerCase().includes(query)
  ) || templates[0];
}

/**
 * Thuật toán phân tích từ khóa và so khớp mẫu CV bằng Rule-based (nhanh & chính xác)
 */
function semanticMatchTemplate({ targetRole = '', companyName = '', jdText = '', profile = '' }) {
  const textToAnalyze = `${targetRole} ${companyName} ${jdText} ${typeof profile === 'string' ? profile : JSON.stringify(profile)}`.toLowerCase();
  const templates = getAvailableTemplates();

  let bestMatch = templates[0];
  let highestScore = -1;
  let matchReasons = [];

  for (const tmpl of templates) {
    let score = 0;
    const reasons = [];

    // 1. Kiểm tra vị trí ứng tuyển (Target Role)
    for (const role of tmpl.targetRoles) {
      if (textToAnalyze.includes(role.toLowerCase())) {
        score += 35;
        reasons.push(`Vị trí "${role}" khớp chính xác với định hướng của mẫu`);
        break;
      }
    }

    // 2. Kiểm tra loại công ty ứng tuyển (Company Types)
    for (const compType of tmpl.companyTypes) {
      const keywords = compType.toLowerCase().split(/[\s,()]+/);
      const matchedKw = keywords.filter(kw => kw.length > 2 && textToAnalyze.includes(kw));
      if (matchedKw.length > 0) {
        score += 20;
        reasons.push(`Phù hợp với đặc thù tuyển dụng của nhóm ${compType}`);
        break;
      }
    }

    // 3. Phân biệt theo cấp bậc ứng viên (Executive vs Fresher / Junior)
    const isExecutive = /giám đốc|director|coo|ceo|head of|trưởng ban|leader|quản lý cấp cao|senior/i.test(textToAnalyze);
    const isInternOrFresher = /thực tập|intern|fresher|sinh viên|mới tốt nghiệp|junior/i.test(textToAnalyze);

    if (isExecutive && (tmpl.id.includes('senior') || tmpl.id.includes('pro_1') || tmpl.id.includes('experts'))) {
      score += 30;
      reasons.push(`Phong cách thiết kế chuẩn mực, uy tín phù hợp cho cấp bậc Quản lý & Lãnh đạo`);
    } else if (isInternOrFresher && (tmpl.id.includes('junior') || tmpl.id.includes('student'))) {
      score += 30;
      reasons.push(`Tập trung làm nổi bật học vấn và đồ án thực tế dành cho ứng viên mới tốt nghiệp`);
    }

    // 4. Ưu tiên chuẩn Harvard cho các tập đoàn lớn / Đa quốc gia / Big 4
    if (/harvard|big 4|pwc|deloitte|ey|kpmg|fpt|viettel|tập đoàn|multinational/i.test(textToAnalyze) && tmpl.layout === 'harvard') {
      score += 15;
      reasons.push(`Mẫu Harvard vượt qua 100% các hệ thống lọc tự động của tập đoàn đa quốc gia`);
    }

    // 5. Ngành nghề khớp
    if (textToAnalyze.includes(tmpl.industry.toLowerCase())) {
      score += 15;
      reasons.push(`Đúng ngành nghề chuyên môn: ${tmpl.industry}`);
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = tmpl;
      matchReasons = reasons;
    }
  }

  return {
    template: bestMatch,
    matchScore: Math.min(99, Math.max(85, 80 + Math.floor(highestScore / 2))),
    reasons: matchReasons.length > 0 ? matchReasons : [
      `Mẫu "${bestMatch.title}" có bố cục chuẩn ATS tối ưu nhất cho vị trí ${targetRole || 'chuyên môn'} tại ${companyName || 'doanh nghiệp'}`
    ]
  };
}

/**
 * Đề xuất tự động mẫu CV bằng AI (Gemini) kết hợp phân tích chuyên sâu
 */
async function autoMatchTemplate({ targetRole, companyName, jdText, profile }) {
  // Lấy kết quả đề xuất sơ bộ từ Semantic Matcher
  const fallback = semanticMatchTemplate({ targetRole, companyName, jdText, profile });

  try {
    const templatesSummary = TEMPLATE_METADATA.map(t => ({
      id: t.id,
      title: t.title,
      industry: t.industry,
      targetRoles: t.targetRoles.slice(0, 3),
      style: t.style
    }));

    const cleanProfile = (typeof profile === 'object' && profile !== null)
      ? (() => {
          const c = { ...profile };
          delete c.avatarUrl;
          delete c.avatarDataUrl;
          return c;
        })()
      : profile;

    const prompt = `
Bạn là chuyên gia tư vấn tuyển dụng và cấu trúc CV ATS cao cấp.
Hãy phân tích thông tin vị trí ứng tuyển "${targetRole || 'Không ghi'}", công ty ứng tuyển "${companyName || 'Doanh nghiệp'}" và bản mô tả công việc (JD) dưới đây để CHỌN DUY NHẤT 1 MẪU CV ATS PHÙ HỢP NHẤT trong danh sách sau:

DANH SÁCH MẪU CV HIỆN CÓ:
${JSON.stringify(templatesSummary, null, 2)}

MÔ TẢ CÔNG VIỆC (JD):
${(jdText || '').slice(0, 1000)}

HỒ SƠ ỨNG VIÊN:
${typeof cleanProfile === 'object' ? JSON.stringify(cleanProfile).slice(0, 1000) : String(cleanProfile || '').slice(0, 1000)}

YÊU CẦU:
1. Chọn mã "recommendedTemplateId" phù hợp nhất từ danh sách.
2. Đưa ra "matchScore" từ 90 đến 99%.
3. Đưa ra 2-3 "reasons" giải thích ngắn gọn, thuyết phục tại sao mẫu này giúp ứng viên vượt qua vòng quét hồ sơ của công ty này.

Trả về duy nhất định dạng JSON:
{
  "recommendedTemplateId": "${fallback.template.id}",
  "matchScore": 96,
  "reasons": [
    "Lý do 1 liên quan đến công ty và văn hóa doanh nghiệp",
    "Lý do 2 liên quan đến yêu cầu đặc thù của vị trí công việc"
  ]
}
`;

    const aiResult = await callGeminiJSON(prompt);
    if (aiResult && aiResult.recommendedTemplateId) {
      const foundTemplate = getTemplateById(aiResult.recommendedTemplateId);
      return {
        mode: 'auto',
        template: foundTemplate,
        matchScore: aiResult.matchScore || fallback.matchScore,
        reasons: aiResult.reasons || fallback.reasons
      };
    }
  } catch (error) {
    console.warn('AI Template Matcher gặp lỗi, chuyển sang bộ quy tắc Semantic:', error.message);
  }

  return {
    mode: 'auto',
    template: fallback.template,
    matchScore: fallback.matchScore,
    reasons: fallback.reasons
  };
}

/**
 * Đọc nội dung HTML gốc của một mẫu CV để phục vụ xem trước (Preview)
 */
function getTemplatePreviewHtml(templateId) {
  const tmpl = getTemplateById(templateId);
  const htmlPath = path.join(TEMPLATES_DIR, tmpl.baseHtmlFile);

  if (fs.existsSync(htmlPath)) {
    return fs.readFileSync(htmlPath, 'utf-8');
  }

  // Fallback nếu chưa có file
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Mẫu CV: ${tmpl.title}</h2><p>Đang chuẩn bị hiển thị mẫu...</p></body></html>`;
}

/**
 * Điền dữ liệu CV được AI sinh ra vào cấu trúc HTML tương tác của mẫu đã chọn
 */
/**
 * Điền toàn diện dữ liệu CV được AI sinh ra vào cấu trúc HTML chuẩn xác của mẫu đã chọn
 */
function renderCVDataToTemplateHtml(tmpl, cvData, userProfile = {}, language = 'vi') {
  return buildCvTemplateHtml(tmpl, cvData, userProfile, language);
}

function getTemplateDocxPath(templateId) {
  const tmpl = getTemplateById(templateId);
  const docxPath = path.join(TEMPLATES_DIR, tmpl.baseDocxFile);
  if (fs.existsSync(docxPath)) {
    return { path: docxPath, filename: tmpl.baseDocxFile };
  }
  return null;
}

module.exports = {
  TEMPLATES_DIR,
  getAvailableTemplates,
  getTemplateById,
  semanticMatchTemplate,
  autoMatchTemplate,
  getTemplatePreviewHtml,
  getTemplateDocxPath,
  renderCVDataToTemplateHtml
};
