const fs = require('fs');
const path = require('path');
const {
  buildCvTemplateHtml,
  normalizeAcademicSchool,
  normalizeAcademicDegree,
  normalizeAcademicHighlight,
  normalizeJobRole,
  normalizeCompanyName
} = require('./templateHtmlBuilder');

// ÄÆ°á»ng dáº«n thÆ° má»¥c máº«u CV theo yÃªu cáº§u cá»§a dá»± Ã¡n (há»— trá»£ cáº£ Windows vÃ  Docker)
function resolveTemplatesDir() {
  // Uu tien env var - dung khi deploy cloud (Koyeb, Railway, GCP...)
  if (process.env.TEMPLATES_DIR) return process.env.TEMPLATES_DIR;
  const candidates = [
    'D:\\TL_CN\\K_7\\EXE_101\\mau_CV',
    '/mau_CV',
    '/app/mau_CV',
    '/mnt/d/TL_CN/K_7/EXE_101/mau_CV',
    path.resolve(__dirname, '../../../../K_7/EXE_101/mau_CV')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}
const TEMPLATES_DIR = resolveTemplatesDir();
const PREVIEW_VERSION = require('./topcvSourceRenderer').sourceVersion();

// Äá»‹nh nghÄ©a thÃ´ng tin danh má»¥c 20 máº«u CV ATS chuáº©n TopCV vá»›i 20 layout kiáº¿n trÃºc Ä‘á»™c láº­p
const TEMPLATE_METADATA = [
  {
    id: "01_CV_ATS_Tieu_Chuan_default_v2",
    slug: "default_v2",
    title: "Máº«u CV ATS TiÃªu Chuáº©n - LÃª Quang DÅ©ng (B2B Sales)",
    industry: "Kinh doanh & BÃ¡n hÃ ng",
    targetRoles: ["Business Development", "Sales Executive", "B2B Sales", "Account Manager", "Kinh doanh", "PhÃ¡t triá»ƒn thá»‹ trÆ°á»ng"],
    companyTypes: ["Doanh nghiá»‡p B2B", "Táº­p Ä‘oÃ n ThÆ°Æ¡ng máº¡i", "CÃ´ng ty PhÃ¢n phá»‘i", "SaaS / Dá»‹ch vá»¥ B2B"],
    style: "1 Cá»™t TiÃªu Chuáº©n Kinh Äiá»ƒn",
    layout: "single_column_classic",
    themeColor: "#00B14F",
    tags: ["ATS Chuáº©n", "B2B Sales", "1 Cá»™t", "TopCV Classic"],
    description: "Bá»‘ cá»¥c 1 cá»™t truyá»n thá»‘ng kinh Ä‘iá»ƒn cá»§a TopCV, tá»‘i Æ°u hÃ³a cÃ¡c con sá»‘ KPI doanh thu, tÄƒng trÆ°á»Ÿng pháº§n trÄƒm vÃ  ká»¹ nÄƒng Ä‘Ã m phÃ¡n há»£p Ä‘á»“ng.",
    baseHtmlFile: "01_CV_ATS_Tieu_Chuan_default_v2.html",
    baseDocxFile: "01_CV_ATS_Tieu_Chuan_default_v2.docx"
  },
  {
    id: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior",
    slug: "default_junior",
    title: "Máº«u CV ATS TiÃªu Chuáº©n (Ãt Kinh Nghiá»‡m) - Nguyá»…n Minh Trang (Kiá»ƒm toÃ¡n)",
    industry: "TÃ i chÃ­nh & Káº¿ toÃ¡n",
    targetRoles: ["Audit Intern", "Junior Auditor", "Thá»±c táº­p sinh Kiá»ƒm toÃ¡n", "Trá»£ lÃ½ Káº¿ toÃ¡n", "Sinh viÃªn má»›i tá»‘t nghiá»‡p", "Fresher"],
    companyTypes: ["Big 4 (PwC, Deloitte, EY, KPMG)", "CÃ´ng ty Kiá»ƒm toÃ¡n A&C, BDO, RSM", "Doanh nghiá»‡p dá»‹ch vá»¥ káº¿ toÃ¡n"],
    style: "1 Cá»™t CÄƒn Giá»¯a Tinh Giáº£n",
    layout: "centered_junior",
    themeColor: "#1A5276",
    tags: ["Junior", "Kiá»ƒm toÃ¡n", "Há»c váº¥n ná»•i báº­t", "Hoáº¡t Ä‘á»™ng CLB"],
    description: "Bá»‘ cá»¥c cÄƒn giá»¯a trang nhÃ£ Æ°u tiÃªn thÃ nh tÃ­ch há»c thuáº­t, chá»©ng chá»‰ nghá» nghiá»‡p ACCA, giáº£i thÆ°á»Ÿng sinh viÃªn vÃ  hoáº¡t Ä‘á»™ng CLB.",
    baseHtmlFile: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior.html",
    baseDocxFile: "02_CV_ATS_Tieu_Chuan_It_Kinh_Nghiem_default_junior.docx"
  },
  {
    id: "03_CV_ATS_An_Tuong_6_impressive_6_v2",
    slug: "impressive_6_v2",
    title: "Máº«u CV ATS áº¤n TÆ°á»£ng 6 - Tráº§n Máº¡nh DÅ©ng (Content Leader)",
    industry: "Marketing & Truyá»n thÃ´ng",
    targetRoles: ["Content Leader", "Marketing Specialist", "Copywriter", "SEO Manager", "Social Media Lead", "Truyá»n thÃ´ng"],
    companyTypes: ["Agency Truyá»n thÃ´ng", "Startup CÃ´ng nghá»‡", "Doanh nghiá»‡p BÃ¡n láº»", "BÃ¡o chÃ­ & Táº¡p chÃ­"],
    style: "2 Cá»™t Sidebar Äá» Máº­n Äáº­m (Burgundy)",
    layout: "sidebar_dark_burgundy",
    themeColor: "#574040",
    tags: ["áº¤n tÆ°á»£ng 6", "Marketing", "SÃ¡ng táº¡o", "2 Cá»™t Sidebar"],
    description: "Bá»‘ cá»¥c 2 cá»™t vá»›i sidebar mÃ u Ä‘á» máº­n sang trá»ng, lÃ m ná»•i báº­t thÃ´ng tin liÃªn há»‡, má»¥c tiÃªu vÃ  ká»¹ nÄƒng Ä‘o lÆ°á»ng chuyá»ƒn Ä‘á»•i sá»‘.",
    baseHtmlFile: "03_CV_ATS_An_Tuong_6_impressive_6_v2.html",
    baseDocxFile: "03_CV_ATS_An_Tuong_6_impressive_6_v2.docx"
  },
  {
    id: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2",
    slug: "onepage_impressive_2_v2",
    title: "Máº«u CV ATS áº¤n TÆ°á»£ng 2 - LÃª Chiáº¿n (Láº­p trÃ¬nh viÃªn)",
    industry: "CÃ´ng nghá»‡ ThÃ´ng tin",
    targetRoles: ["Front End Developer", "Mobile Developer", "Láº­p trÃ¬nh viÃªn Web", "Full-Stack Developer", "Software Engineer", "Láº­p trÃ¬nh viÃªn"],
    companyTypes: ["CÃ´ng ty Pháº§n má»m (FPT, VNG, Viettel, VNPT)", "Tech Startup", "Product Tech", "Fintech"],
    style: "2 Cá»™t Xanh RÃªu Äáº­m & Thanh Ká»¹ NÄƒng (Progress Bars)",
    layout: "sidebar_moss_green_progress_bars",
    themeColor: "#3B443B",
    tags: ["áº¤n tÆ°á»£ng 2", "IT / Dev", "Thanh Ká»¹ NÄƒng", "Sidebar Xanh RÃªu"],
    description: "Bá»‘ cá»¥c 2 cá»™t Ä‘áº·c trÆ°ng TopCV vá»›i sidebar xanh rÃªu Ä‘áº­m, avatar trÃ²n vÃ  thanh pháº§n trÄƒm nÄƒng lá»±c trá»±c quan (85%, 95%).",
    baseHtmlFile: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2.html",
    baseDocxFile: "04_CV_ATS_An_Tuong_2_onepage_impressive_2_v2.docx"
  },
  {
    id: "05_CV_ATS_Thanh_Lich_elegant",
    slug: "elegant",
    title: "Máº«u CV ATS Thanh Lá»‹ch - Nguyá»…n Quá»³nh NhÆ° (Quáº£n lÃ½ NhÃ  hÃ ng)",
    industry: "KhÃ¡ch sáº¡n & NhÃ  hÃ ng",
    targetRoles: ["Quáº£n lÃ½ nhÃ  hÃ ng", "Restaurant Manager", "F&B Manager", "Quáº£n lÃ½ KhÃ¡ch sáº¡n", "Hospitality Leader"],
    companyTypes: ["KhÃ¡ch sáº¡n & Resort 4-5 sao", "Chuá»—i NhÃ  hÃ ng Cao cáº¥p", "Doanh nghiá»‡p Dá»‹ch vá»¥ F&B"],
    style: "3 Cá»™t ThÃ´ng Tin ÄÃ³ng Khung Viá»n Äá» & Timeline Kinh Nghiá»‡m",
    layout: "elegant_3_columns_sub",
    themeColor: "#B82A38",
    tags: ["Thanh lá»‹ch", "F&B / Hospitality", "Khung 3 Cá»™t", "Timeline Äá»"],
    description: "Thiáº¿t káº¿ cao cáº¥p vá»›i áº£nh Ä‘áº¡i diá»‡n trang nhÃ£, 3 Ã´ thÃ´ng tin Ä‘Ã³ng khung viá»n Ä‘á» (CÃ¡ nhÃ¢n, Há»c váº¥n, Chá»©ng chá»‰) vÃ  dÃ²ng timeline sá»± nghiá»‡p.",
    baseHtmlFile: "05_CV_ATS_Thanh_Lich_elegant.html",
    baseDocxFile: "05_CV_ATS_Thanh_Lich_elegant.docx"
  },
  {
    id: "06_CV_ATS_Tham_Vong_ambitious",
    slug: "ambitious",
    title: "Máº«u CV ATS Tham Vá»ng - VÅ© TÃ¹ng DÆ°Æ¡ng (Senior Digital Marketing)",
    industry: "Marketing & Truyá»n thÃ´ng",
    targetRoles: ["Digital Marketing Specialist", "Growth Hacker", "Senior Digital Marketing", "Paid Ads Lead", "Media Buyer"],
    companyTypes: ["Agency Digital", "Startup TÄƒng trÆ°á»Ÿng", "SÃ n TMÄT", "Doanh nghiá»‡p BÃ¡n láº»"],
    style: "Sidebar XÃ¡m Than & Äiá»ƒm Nháº¥n Cam Há»• PhÃ¡ch (Amber Timeline)",
    layout: "sidebar_charcoal_amber_timeline",
    themeColor: "#EC8F00",
    tags: ["Tham vá»ng", "Digital MKT", "Cam Há»• PhÃ¡ch", "Cá»™t Má»‘c Tag"],
    description: "Bá»‘ cá»¥c máº¡nh máº½ vá»›i sidebar xÃ¡m than, avatar vuÃ´ng bo gÃ³c, timeline sá»± nghiá»‡p vá»›i cÃ¡c tháº» nÄƒm cam há»• phÃ¡ch ná»•i báº­t.",
    baseHtmlFile: "06_CV_ATS_Tham_Vong_ambitious.html",
    baseDocxFile: "06_CV_ATS_Tham_Vong_ambitious.docx"
  },
  {
    id: "07_CV_ATS_Toi_Gian_2_minimalism_v2",
    slug: "minimalism_v2",
    title: "Máº«u CV ATS Tá»‘i Giáº£n 2 - Pháº¡m ThÃºy HÃ  (Káº¿ toÃ¡n ná»™i bá»™)",
    industry: "TÃ i chÃ­nh & Káº¿ toÃ¡n",
    targetRoles: ["NhÃ¢n viÃªn Káº¿ toÃ¡n ná»™i bá»™", "Káº¿ toÃ¡n viÃªn tá»•ng há»£p", "Káº¿ toÃ¡n thuáº¿", "ChuyÃªn viÃªn TÃ i chÃ­nh - Káº¿ toÃ¡n", "Káº¿ toÃ¡n cÃ´ng ná»£"],
    companyTypes: ["Doanh nghiá»‡p ThÆ°Æ¡ng máº¡i", "CÃ´ng ty Cá»• pháº§n", "Táº­p Ä‘oÃ n PhÃ¢n phá»‘i", "Doanh nghiá»‡p Dá»‹ch vá»¥"],
    style: "Tá»‘i Giáº£n Viá»n Xanh Navy NÃ©t Äá»©t (Minimalist Dashed)",
    layout: "minimalist_dashed_navy",
    themeColor: "#263A4D",
    tags: ["Tá»‘i giáº£n 2", "Káº¿ toÃ¡n ná»™i bá»™", "Xanh Navy", "NÃ©t Äá»©t Tinh Táº¿"],
    description: "Bá»‘ cá»¥c 2 cá»™t tá»‘i giáº£n vá»›i cÃ¡c Ä‘Æ°á»ng phÃ¢n cÃ¡ch nÃ©t Ä‘á»©t mÃ u xanh navy, tá»‘i Æ°u hiá»ƒn thá»‹ nghiá»‡p vá»¥ káº¿ toÃ¡n ná»™i bá»™, káº¿ toÃ¡n thuáº¿ vÃ  bÃ¡o cÃ¡o tÃ i chÃ­nh.",
    baseHtmlFile: "07_CV_ATS_Toi_Gian_2_minimalism_v2.html",
    baseDocxFile: "07_CV_ATS_Toi_Gian_2_minimalism_v2.docx"
  },
  {
    id: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2",
    slug: "pro_1_v2",
    title: "Máº«u CV ATS ChuyÃªn Nghiá»‡p 1 - Nguyá»…n Mai Loan (Quáº£n lÃ½ phÃ²ng hÃ nh chÃ­nh)",
    industry: "HÃ nh chÃ­nh & NhÃ¢n sá»±",
    targetRoles: ["Quáº£n lÃ½ phÃ²ng hÃ nh chÃ­nh", "TrÆ°á»Ÿng phÃ²ng hÃ nh chÃ­nh", "Administration Manager", "ChuyÃªn viÃªn hÃ nh chÃ­nh tá»•ng há»£p", "Quáº£n trá»‹ vÄƒn phÃ²ng"],
    companyTypes: ["Táº­p Ä‘oÃ n Äa ngÃ nh", "Doanh nghiá»‡p FDI", "CÃ´ng ty Cá»• pháº§n ThÆ°Æ¡ng máº¡i", "Tá»• chá»©c & CÆ¡ quan"],
    style: "Sidebar NÃ¢u CÃ  PhÃª & Header TÃªn Ná»•i Báº­t (Coffee Brown)",
    layout: "sidebar_coffee_brown",
    themeColor: "#6B4E37",
    tags: ["ChuyÃªn nghiá»‡p 1", "HÃ nh chÃ­nh", "NÃ¢u CÃ  PhÃª", "Quáº£n lÃ½ HÃ nh chÃ­nh"],
    description: "Bá»‘ cá»¥c thanh lá»‹ch vá»›i sidebar nÃ¢u cÃ  phÃª vÃ  header ná»•i báº­t, tÃ´n vinh nÄƒng lá»±c quáº£n trá»‹ hÃ nh chÃ­nh, kiá»ƒm soÃ¡t chi phÃ­ vÃ  tá»‘i Æ°u quy trÃ¬nh vÄƒn phÃ²ng.",
    baseHtmlFile: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2.html",
    baseDocxFile: "08_CV_ATS_Chuyen_Nghiep_1_pro_1_v2.docx"
  },
  {
    id: "09_CV_ATS_Sang_Tao_creative",
    slug: "creative",
    title: "Máº«u CV ATS SÃ¡ng Táº¡o - Nguyá»…n TrÃºc Anh (Livestream & KOC)",
    industry: "SÃ¡ng táº¡o & Nghá»‡ thuáº­t",
    targetRoles: ["Content Creator", "KOC / Host Livestream", "Creative Lead", "Social Media Executive"],
    companyTypes: ["Agency Má»¹ pháº©m & Thá»i trang", "TikTok MCN", "E-commerce Studio"],
    style: "Xanh Cá»‘m Pastel Studio (Creative Clean)",
    layout: "creative_pastel_studio",
    themeColor: "#7D8C75",
    tags: ["SÃ¡ng táº¡o", "Livestream", "KOC", "Xanh Cá»‘m Pastel"],
    description: "Bá»‘ cá»¥c nghá»‡ thuáº­t tinh táº¿ vá»›i tÃ´ng xanh cá»‘m pastel, tÃ´n vinh ká»· lá»¥c doanh sá»‘ bÃ¡n hÃ ng vÃ  kháº£ nÄƒng hoáº¡t ngÃ´n.",
    baseHtmlFile: "09_CV_ATS_Sang_Tao_creative.html",
    baseDocxFile: "09_CV_ATS_Sang_Tao_creative.docx"
  },
  {
    id: "10_CV_ATS_Senior_Harvard_senior_v2",
    slug: "senior_v2",
    title: "Máº«u CV ATS Senior Chuáº©n Harvard - Äáº·ng Ngá»c Linh (NhÃ¢n viÃªn tÆ° váº¥n)",
    industry: "TÆ° váº¥n & ChÄƒm sÃ³c khÃ¡ch hÃ ng",
    targetRoles: ["NhÃ¢n viÃªn tÆ° váº¥n", "Tá»•ng Ä‘Ã i viÃªn ChÄƒm sÃ³c khÃ¡ch hÃ ng", "Customer Service Specialist", "TÆ° váº¥n giáº£i phÃ¡p pháº§n má»m", "TÆ° váº¥n tuyá»ƒn sinh"],
    companyTypes: ["Tá»• chá»©c GiÃ¡o dá»¥c", "Doanh nghiá»‡p Pháº§n má»m & CÃ´ng nghá»‡", "Trung tÃ¢m ChÄƒm sÃ³c khÃ¡ch hÃ ng", "CÃ´ng ty Dá»‹ch vá»¥"],
    style: "Harvard Ivy League Pure Text ATS (Äen Tráº¯ng Cá»• Äiá»ƒn - KhÃ´ng áº¢nh)",
    layout: "harvard",
    themeColor: "#000000",
    tags: ["Senior", "Chuáº©n Harvard", "100% ATS Safe", "TÆ° váº¥n / CSKH"],
    description: "Chuáº©n tuyá»ƒn dá»¥ng Harvard Ä‘á»‹nh dáº¡ng vÄƒn báº£n thuáº§n tÃºy khÃ´ng áº£nh Ä‘áº¡i diá»‡n, 100% chuáº©n ATS thÃ¢n thiá»‡n, nháº¥n máº¡nh thÃ nh tÃ­ch duy trÃ¬ 95% má»©c Ä‘á»™ hÃ i lÃ²ng khÃ¡ch hÃ ng.",
    baseHtmlFile: "10_CV_ATS_Senior_Harvard_senior_v2.html",
    baseDocxFile: "10_CV_ATS_Senior_Harvard_senior_v2.docx"
  },
  {
    id: "11_CV_ATS_Clarity_clarity",
    slug: "clarity",
    title: "Máº«u CV ATS Clarity - HoÃ ng TÆ°á»ng Vy (Content Marketing)",
    industry: "Marketing & Truyá»n thÃ´ng",
    targetRoles: ["Content Marketing", "ChuyÃªn viÃªn Ná»™i dung", "Copywriter", "Social Media Executive", "Content Creator"],
    companyTypes: ["Tá»• chá»©c GiÃ¡o dá»¥c & ÄÃ o táº¡o", "Agency Truyá»n thÃ´ng", "Startup CÃ´ng nghá»‡", "Doanh nghiá»‡p Dá»‹ch vá»¥"],
    style: "Modern Clarity Tháº» Ká»¹ NÄƒng Tá»‘i Giáº£n",
    layout: "modern_clarity_tags",
    themeColor: "#2E2E2E",
    tags: ["Clarity", "Content Marketing", "Tháº» Ká»¹ NÄƒng", "Hiá»‡n Ä‘áº¡i"],
    description: "Thiáº¿t káº¿ hiá»‡n Ä‘áº¡i chuáº©n má»±c vá»›i há»‡ thá»‘ng tháº» ká»¹ nÄƒng trá»±c quan, tá»‘i Æ°u cho vá»‹ trÃ­ Content Marketing vá»›i sá»‘ liá»‡u tÄƒng trÆ°á»Ÿng traffic áº¥n tÆ°á»£ng.",
    baseHtmlFile: "11_CV_ATS_Clarity_clarity.html",
    baseDocxFile: "11_CV_ATS_Clarity_clarity.docx"
  },
  {
    id: "12_CV_ATS_Hien_Dai_6_modern_6_v2",
    slug: "modern_6_v2",
    title: "Máº«u CV ATS Hiá»‡n Äáº¡i 6 - Nguyá»…n Huyá»n Trang (ChuyÃªn viÃªn Sales Admin)",
    industry: "Kinh doanh & BÃ¡n hÃ ng",
    targetRoles: ["ChuyÃªn viÃªn Sales Admin", "Sales Administrator", "Há»— trá»£ Kinh doanh", "Quáº£n lÃ½ Ä‘Æ¡n hÃ ng", "Sales Support Specialist"],
    companyTypes: ["Doanh nghiá»‡p PhÃ¢n phá»‘i", "CÃ´ng ty ThÆ°Æ¡ng máº¡i", "Táº­p Ä‘oÃ n BÃ¡n láº»", "Doanh nghiá»‡p Sáº£n xuáº¥t"],
    style: "Sidebar RÆ°á»£u Máº­n Sang Trá»ng (Plum Wine)",
    layout: "sidebar_plum_wine",
    themeColor: "#7A415A",
    tags: ["Hiá»‡n Ä‘áº¡i 6", "Sales Admin", "ERP / SAP", "Sidebar Máº­n"],
    description: "Bá»‘ cá»¥c 2 cá»™t tÃ´ng mÃ u rÆ°á»£u máº­n thanh nhÃ£, lÃ m ná»•i báº­t kháº£ nÄƒng Ä‘iá»u phá»‘i xá»­ lÃ½ Ä‘Æ¡n hÃ ng giÃ¡ trá»‹ cao vÃ  thao tÃ¡c ERP mÆ°á»£t mÃ .",
    baseHtmlFile: "12_CV_ATS_Hien_Dai_6_modern_6_v2.html",
    baseDocxFile: "12_CV_ATS_Hien_Dai_6_modern_6_v2.docx"
  },
  {
    id: "13_CV_ATS_Thanh_Nha_graceful",
    slug: "graceful",
    title: "Máº«u CV ATS Thanh NhÃ£ - Tráº§n Ngá»c Anh (Káº¿ toÃ¡n viÃªn)",
    industry: "TÃ i chÃ­nh & Káº¿ toÃ¡n",
    targetRoles: ["Káº¿ toÃ¡n viÃªn", "Káº¿ toÃ¡n tá»•ng há»£p", "Káº¿ toÃ¡n ná»™i bá»™", "ChuyÃªn viÃªn Káº¿ toÃ¡n - Thuáº¿", "Káº¿ toÃ¡n viÃªn ACCA"],
    companyTypes: ["Doanh nghiá»‡p XÃ¢y dá»±ng & ThÆ°Æ¡ng máº¡i", "Táº­p Ä‘oÃ n Báº¥t Ä‘á»™ng sáº£n", "CÃ´ng ty Dá»‹ch vá»¥ Káº¿ toÃ¡n", "Doanh nghiá»‡p Cá»• pháº§n"],
    style: "Bordeaux CÃ¢n Äá»‘i & Trang NhÃ£",
    layout: "bordeaux_balanced",
    themeColor: "#661D1D",
    tags: ["Thanh nhÃ£", "Káº¿ toÃ¡n tá»•ng há»£p", "ACCA", "Äá» Bordeaux"],
    description: "Bá»‘ cá»¥c Ä‘á»‘i xá»©ng cÃ¢n báº±ng tÃ´ng Ä‘á» Bordeaux trang nhÃ£, chuyÃªn biá»‡t hÃ³a cho káº¿ toÃ¡n tá»•ng há»£p vá»›i kinh nghiá»‡m xá»­ lÃ½ hÃ³a Ä‘Æ¡n, cÃ´ng ná»£ vÃ  quyáº¿t toÃ¡n thuáº¿.",
    baseHtmlFile: "13_CV_ATS_Thanh_Nha_graceful.html",
    baseDocxFile: "13_CV_ATS_Thanh_Nha_graceful.docx"
  },
  {
    id: "14_CV_ATS_Basic_1_basic_1_v2",
    slug: "basic_1_v2",
    title: "Máº«u CV ATS Basic 1 - Nguyá»…n TÃ¹ng DÆ°Æ¡ng (Váº­n hÃ nh sÃ n TMÄT)",
    industry: "ThÆ°Æ¡ng máº¡i Äiá»‡n tá»­ & BÃ¡n láº»",
    targetRoles: ["ChuyÃªn viÃªn Váº­n hÃ nh TMÄT", "E-commerce Operations Specialist", "Quáº£n lÃ½ Gian hÃ ng Shopee / Lazada / TikTok Shop", "Váº­n hÃ nh SÃ n"],
    companyTypes: ["ThÆ°Æ¡ng hiá»‡u D2C", "Doanh nghiá»‡p BÃ¡n láº» Äa kÃªnh", "Táº­p Ä‘oÃ n ThÆ°Æ¡ng máº¡i Äiá»‡n tá»­", "Agency TMÄT"],
    style: "Báº¡c XÃ¡m Doanh Nghiá»‡p (Corporate Silver Grey)",
    layout: "corporate_silver_grey",
    themeColor: "#4A5568",
    tags: ["Basic 1", "TMÄT / E-commerce", "Shopee / TikTok Shop", "XÃ¡m Báº¡c"],
    description: "Thiáº¿t káº¿ chuáº©n chá»‰nh tÃ´ng xÃ¡m báº¡c, tá»‘i Æ°u hiá»ƒn thá»‹ cÃ¡c chá»‰ sá»‘ váº­n hÃ nh gian hÃ ng 4.8/5.0, cháº¡y quáº£ng cÃ¡o ná»™i sÃ n vÃ  tÄƒng tá»· lá»‡ chuyá»ƒn Ä‘á»•i Ä‘Æ¡n hÃ ng.",
    baseHtmlFile: "14_CV_ATS_Basic_1_basic_1_v2.html",
    baseDocxFile: "14_CV_ATS_Basic_1_basic_1_v2.docx"
  },
  {
    id: "15_CV_ATS_Hien_Dai_1_modern_1_v2",
    slug: "modern_1_v2",
    title: "Máº«u CV ATS Hiá»‡n Äáº¡i 1 - Äá»— Quá»³nh Mai (NhÃ¢n ViÃªn Lá»… TÃ¢n HÃ nh ChÃ­nh)",
    industry: "HÃ nh chÃ­nh & NhÃ¢n sá»±",
    targetRoles: ["NhÃ¢n ViÃªn Lá»… TÃ¢n HÃ nh ChÃ­nh", "Lá»… tÃ¢n VÄƒn phÃ²ng", "Front Desk Officer", "NhÃ¢n viÃªn HÃ nh chÃ­nh Tá»•ng há»£p", "ChuyÃªn viÃªn Lá»… tÃ¢n"],
    companyTypes: ["Táº­p Ä‘oÃ n Äa quá»‘c gia", "Cao á»‘c VÄƒn phÃ²ng & TÃ²a nhÃ ", "Doanh nghiá»‡p TÃ i chÃ­nh & Äáº§u tÆ°", "KhÃ¡ch sáº¡n & Trung tÃ¢m Sá»± kiá»‡n"],
    style: "Äá» Gáº¡ch Hiá»‡n Äáº¡i & NÄƒng Äá»™ng",
    layout: "brick_red_gradient",
    themeColor: "#A94A4B",
    tags: ["Hiá»‡n Ä‘áº¡i 1", "Lá»… tÃ¢n HÃ nh chÃ­nh", "Äá» Gáº¡ch", "Giao tiáº¿p & VÄƒn phÃ²ng"],
    description: "TÃ´ng mÃ u Ä‘á» gáº¡ch nÄƒng Ä‘á»™ng vá»›i banner tiÃªu Ä‘á» hiá»‡n Ä‘áº¡i, lÃ m ná»•i báº­t kinh nghiá»‡m trá»±c tá»•ng Ä‘Ã i tiáº¿p Ä‘Ã³n khÃ¡ch VIP vÃ  tá»• chá»©c sá»± kiá»‡n ná»™i bá»™.",
    baseHtmlFile: "15_CV_ATS_Hien_Dai_1_modern_1_v2.html",
    baseDocxFile: "15_CV_ATS_Hien_Dai_1_modern_1_v2.docx"
  },
  {
    id: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2",
    slug: "onepage_impressive_3_v2",
    title: "Máº«u CV ATS áº¤n TÆ°á»£ng 4 - Nguyá»…n LÃª TÃº Anh (GiÃ¡o viÃªn tiáº¿ng Anh)",
    industry: "GiÃ¡o dá»¥c & ÄÃ o táº¡o",
    targetRoles: ["GiÃ¡o viÃªn tiáº¿ng Anh", "English Teacher", "Giáº£ng viÃªn Luyá»‡n thi IELTS / TOEIC", "GiÃ¡o viÃªn Tiáº¿ng Anh Giao tiáº¿p", "Gia sÆ° Tiáº¿ng Anh"],
    companyTypes: ["Trung tÃ¢m Ngoáº¡i ngá»¯ Quá»‘c táº¿", "TrÆ°á»ng Quá»‘c táº¿ & Song ngá»¯", "Tá»• chá»©c GiÃ¡o dá»¥c trá»±c tuyáº¿n", "Doanh nghiá»‡p ÄÃ o táº¡o Anh ngá»¯"],
    style: "Sidebar Xanh Cá»• Vá»‹t Tinh Táº¿ (Teal Sidebar)",
    layout: "teal_sidebar_hr",
    themeColor: "#316160",
    tags: ["áº¤n tÆ°á»£ng 4", "GiÃ¡o viÃªn Tiáº¿ng Anh", "IELTS / TOEIC", "Xanh Cá»• Vá»‹t"],
    description: "Sidebar mÃ u xanh cá»• vá»‹t dá»‹u máº¯t, nháº¥n máº¡nh thÃ nh tÃ­ch giáº£ng dáº¡y 25+ lá»›p há»c, Ä‘Ã o táº¡o 200+ há»c viÃªn Ä‘áº¡t Ä‘iá»ƒm TOEIC trung bÃ¬nh 750 Ä‘iá»ƒm.",
    baseHtmlFile: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2.html",
    baseDocxFile: "16_CV_ATS_An_Tuong_4_onepage_impressive_3_v2.docx"
  },
  {
    id: "17_CV_ATS_Sinh_Vien_3_student_3",
    slug: "student_3",
    title: "Máº«u CV ATS Sinh ViÃªn 3 - VÅ© HoÃ ng Viá»‡t (Thá»±c táº­p sinh Kiá»ƒm toÃ¡n)",
    industry: "TÃ i chÃ­nh & Káº¿ toÃ¡n",
    targetRoles: ["Thá»±c táº­p sinh Kiá»ƒm toÃ¡n", "Audit Intern", "Trá»£ lÃ½ Kiá»ƒm toÃ¡n viÃªn", "Thá»±c táº­p sinh TÃ i chÃ­nh", "Sinh viÃªn má»›i tá»‘t nghiá»‡p FTU"],
    companyTypes: ["Big 4 Kiá»ƒm toÃ¡n (PwC, EY, KPMG, Deloitte)", "CÃ´ng ty Kiá»ƒm toÃ¡n Quá»‘c táº¿", "Táº­p Ä‘oÃ n TÃ i chÃ­nh & NgÃ¢n hÃ ng"],
    style: "Xanh Äáº¡i DÆ°Æ¡ng Tráº» Trung (Student Youth Ocean)",
    layout: "student_youth_ocean",
    themeColor: "#0359AB",
    tags: ["Sinh viÃªn 3", "Kiá»ƒm toÃ¡n FTU", "Audit Intern", "Xanh Äáº¡i DÆ°Æ¡ng"],
    description: "Bá»‘ cá»¥c tráº» trung mÃ u xanh Ä‘áº¡i dÆ°Æ¡ng dÃ nh cho sinh viÃªn xuáº¥t sáº¯c FTU, ná»•i báº­t Ä‘iá»ƒm sá»‘ GPA 3.6 cÃ¡c mÃ´n kiá»ƒm toÃ¡n káº¿ toÃ¡n vÃ  hoáº¡t Ä‘á»™ng CLB Nguá»“n nhÃ¢n lá»±c.",
    baseHtmlFile: "17_CV_ATS_Sinh_Vien_3_student_3.html",
    baseDocxFile: "17_CV_ATS_Sinh_Vien_3_student_3.docx"
  },
  {
    id: "18_CV_ATS_Basic_4_basic_4_v2",
    slug: "basic_4_v2",
    title: "Máº«u CV ATS Basic 4 - NGUYá»„N KHÃNH HUYá»€N (TRÆ¯á»žNG NHÃ“M TESTER)",
    industry: "CÃ´ng nghá»‡ ThÃ´ng tin",
    targetRoles: ["TrÆ°á»Ÿng nhÃ³m Tester", "QA Lead", "Senior Software Tester", "Test Manager", "Automation QA Lead"],
    companyTypes: ["CÃ´ng ty Pháº§n má»m Xuáº¥t kháº©u (FPT, KMS, TMA)", "Tech Unicorn", "NgÃ¢n hÃ ng Sá»‘ / Fintech", "Doanh nghiá»‡p Sáº£n pháº©m CÃ´ng nghá»‡"],
    style: "Tháº» Module Xanh Cyan Ká»¹ Thuáº­t (Cyan Modular Cards)",
    layout: "cyan_modular_cards",
    themeColor: "#0A7EB5",
    tags: ["Basic 4", "Tester Leader", "QA / Automation", "Tháº» Module Cyan"],
    description: "Bá»‘ cá»¥c dáº¡ng tháº» module xanh cyan ká»¹ thuáº­t, tá»‘i Æ°u trÃ¬nh bÃ y chá»©ng chá»‰ quá»‘c táº¿ CAST/CETPA, ká»¹ nÄƒng kiá»ƒm thá»­ API Postman vÃ  dáº«n dáº¯t Ä‘á»™i ngÅ© Tester.",
    baseHtmlFile: "18_CV_ATS_Basic_4_basic_4_v2.html",
    baseDocxFile: "18_CV_ATS_Basic_4_basic_4_v2.docx"
  },
  {
    id: "19_CV_ATS_Chuyen_Gia_experts",
    slug: "experts",
    title: "Máº«u CV ATS ChuyÃªn Gia - Nguyá»…n TÃ¹ng DÆ°Æ¡ng (GiÃ¡m Ä‘á»‘c Quan há»‡ KH Doanh nghiá»‡p)",
    industry: "Kinh doanh & BÃ¡n hÃ ng",
    targetRoles: ["GiÃ¡m Ä‘á»‘c Quan há»‡ KhÃ¡ch hÃ ng Doanh nghiá»‡p", "B2B Sales Director", "GiÃ¡m Ä‘á»‘c Kinh doanh VÃ¹ng", "Head of Corporate Sales", "Business Development Director"],
    companyTypes: ["Táº­p Ä‘oÃ n BÃ¡n láº» & Thá»i trang", "Táº­p Ä‘oÃ n CÃ´ng nghá»‡ Äa quá»‘c gia", "Doanh nghiá»‡p B2B Enterprise"],
    style: "Xanh HoÃ ng Gia Äáº³ng Cáº¥p ChuyÃªn Gia (Royal Blue Expert - KhÃ´ng áº¢nh)",
    layout: "royal_blue_expert",
    themeColor: "#003161",
    tags: ["ChuyÃªn gia", "B2B Director", "GiÃ¡m Ä‘á»‘c Kinh doanh", "Xanh HoÃ ng Gia"],
    description: "Äá»‹nh dáº¡ng chuyÃªn gia cao cáº¥p chuáº©n ATS khÃ´ng áº£nh Ä‘áº¡i diá»‡n, mÃ u xanh hoÃ ng gia sang trá»ng, ná»•i báº­t thÃ nh tÃ­ch 15 nÄƒm kinh nghiá»‡m vÃ  Ä‘Ã³ng gÃ³p 42% doanh thu B2B toÃ n cÃ´ng ty.",
    baseHtmlFile: "19_CV_ATS_Chuyen_Gia_experts.html",
    baseDocxFile: "19_CV_ATS_Chuyen_Gia_experts.docx"
  },
  {
    id: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1",
    slug: "dev_1",
    title: "Máº«u CV ATS Láº­p TrÃ¬nh ViÃªn - Nguyá»…n Mai Anh (Ká»¹ SÆ° Pháº§n Má»m IT)",
    industry: "CÃ´ng nghá»‡ ThÃ´ng tin",
    targetRoles: ["Láº­p trÃ¬nh viÃªn Backend", "Software Engineer", "Backend Developer", "Full-Stack Engineer", "Ká»¹ sÆ° pháº§n má»m IT", "Láº­p trÃ¬nh viÃªn"],
    companyTypes: ["Tech Unicorn", "Global Software Enterprise", "Fintech Platform", "SaaS Startup"],
    style: "Ma Tráº­n CÃ´ng Nghá»‡ Cao Cáº¥p (Tech Stack Matrix)",
    layout: "tech_stack_matrix",
    themeColor: "#0984E3",
    tags: ["Láº­p trÃ¬nh viÃªn", "Full-Stack", "Tech Matrix", "AWS / Docker"],
    description: "Máº«u thiáº¿t káº¿ chuyÃªn biá»‡t cho vá»‹ trÃ­ Láº­p trÃ¬nh viÃªn Backend vÃ  Ká»¹ sÆ° pháº§n má»m IT, lÃ m ná»•i báº­t cÃ¡c ká»¹ nÄƒng cÃ´ng nghá»‡ nhÆ° Node.js, Python, PostgreSQL, Docker, tá»‘i Æ°u hÃ³a cÃ¡c vÃ²ng lá»c há»“ sÆ¡ ká»¹ thuáº­t cá»§a FPT Software, VNG, Viettel.",
    baseHtmlFile: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1.html",
    baseDocxFile: "20_CV_ATS_Dev_Lap_Trinh_Vien_dev_1.docx"
  }
];

/**
 * Láº¥y toÃ n bá»™ danh sÃ¡ch cÃ¡c máº«u CV cÃ³ sáºµn trong thÆ° má»¥c D:\TL_CN\K_7\EXE_101\mau_CV
 * Há»— trá»£ cáº£ 74 máº«u CV ATS TopCV (ká»ƒ cáº£ Pro/Cao cáº¥p) vÃ  tá»± Ä‘á»™ng Ä‘á»•i song ngá»¯ (VI / EN)
 */
function buildAvailableTemplates(language = 'vi') {
  const isEn = language === 'en';
  const dirExists = fs.existsSync(TEMPLATES_DIR);
  const manifestPath = path.join(TEMPLATES_DIR, 'topcv_ats_templates_manifest.json');

  let manifestTemplates = [];
  if (dirExists && fs.existsSync(manifestPath)) {
    try {
      const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (Array.isArray(manifestData.templates)) {
        manifestTemplates = manifestData.templates;
      }
    } catch (e) {
      console.warn('Lá»—i Ä‘á»c manifest máº«u CV:', e.message);
    }
  }

  // Báº£ng tra cá»©u meta bá»• sung cho cÃ¡c máº«u Ä‘Ã£ Ä‘á»‹nh nghÄ©a chi tiáº¿t
  const metaMap = {};
  for (const m of TEMPLATE_METADATA) {
    metaMap[m.slug] = m;
  }

  if (manifestTemplates.length > 0) {
    return manifestTemplates.map((t, idx) => {
      const meta = metaMap[t.slug] || {};
      const slug = t.slug;
      const numStr = String(idx + 1).padStart(2, '0');
      const htmlFile = isEn ? (t.html_en || `${numStr}_CV_ATS_${slug}_en.html`) : (t.html_vi || `${numStr}_CV_ATS_${slug}_vi.html`);
      const docxFile = isEn ? (t.docx_en || `${numStr}_CV_ATS_${slug}_en.docx`) : (t.docx_vi || `${numStr}_CV_ATS_${slug}_vi.docx`);

      const htmlFullPath = path.join(TEMPLATES_DIR, htmlFile);
      const docxFullPath = path.join(TEMPLATES_DIR, docxFile);
      const snapshotLanguage = fs.existsSync(path.join(TEMPLATES_DIR, 'snapshots', language, `${slug}.webp`))
        ? language : (isEn ? 'vi' : 'en');

      const title = isEn 
        ? (t.title_en || meta.title || t.title_vi || slug) 
        : (t.title_vi || meta.title || slug);

      const themeColor = (t.colors && t.colors[0]) ? ('#' + t.colors[0].replace('#', '')) : (meta.themeColor || '#00B14F');

      return {
        id: slug,
        slug: slug,
        index: t.index || idx + 1,
        title: title,
        title_vi: t.title_vi || meta.title || slug,
        title_en: t.title_en || meta.title || slug,
        industry: meta.industry || (t.is_pro ? "ChuyÃªn nghiá»‡p & Cao cáº¥p" : "Äa ngÃ nh nghá» ATS"),
        targetRoles: meta.targetRoles || ["ChuyÃªn viÃªn", "Ká»¹ sÆ°", "NhÃ¢n viÃªn", "Quáº£n lÃ½"],
        companyTypes: meta.companyTypes || ["Doanh nghiá»‡p B2B", "Táº­p Ä‘oÃ n Äa quá»‘c gia", "Tech Startup"],
        style: meta.style || (t.is_pro ? "Máº«u Cao Cáº¥p TopCV Pro" : "Chuáº©n ATS TopCV"),
        layout: `original_${slug}`,
        themeColor: themeColor,
        tags: Array.from(new Set([...(t.tags || []), ...(meta.tags || []), ...(t.is_pro ? ['Cao cáº¥p', 'Pro'] : [])])),
        isPro: !!t.is_pro,
        thumbnailUrl: `/cv-design-previews/${PREVIEW_VERSION}/${isEn?"en":"vi"}/${slug}.png`,
        designVersion: PREVIEW_VERSION,
        previewUrl: `/api/cv/templates/${slug}/preview?lang=${isEn ? "en" : "vi"}&v=${PREVIEW_VERSION}`,
        sourceThumbnailUrl: `/api/cv/snapshots/${snapshotLanguage}/${slug}.webp`,
        isAvailableInFolder: dirExists && fs.existsSync(htmlFullPath),
        hasDocx: dirExists && fs.existsSync(docxFullPath),
        htmlPath: htmlFullPath,
        docxPath: docxFullPath,
        baseHtmlFile: htmlFile,
        baseDocxFile: docxFile,
        html_vi: t.html_vi,
        html_en: t.html_en,
        docx_vi: t.docx_vi,
        docx_en: t.docx_en,
        paletteColors: (t.colors && t.colors.length > 0)
          ? t.colors.map(c => '#' + c.replace('#', ''))
          : [themeColor, '#1E293B', '#0284C7', '#059669', '#D97706']
      };
    });
  }

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
 * Láº¥y chi tiáº¿t má»™t máº«u CV cá»¥ thá»ƒ theo ID hoáº·c Slug, há»— trá»£ chá»n ngÃ´n ngá»¯
 */
const catalogueCache = new Map();
function getAvailableTemplates(language = 'vi') {
  const lang = language === 'en' ? 'en' : 'vi';
  let cached = catalogueCache.get(lang);
  if (!cached || Date.now() - cached.created > 60000) {
    cached = { created: Date.now(), templates: buildAvailableTemplates(lang) };
    catalogueCache.set(lang, cached);
  }
  // Callers may customize colors; do not let one CV mutate the cached catalogue.
  return cached.templates.map(t => ({...t,tags:[...t.tags],paletteColors:[...(t.paletteColors||[])],targetRoles:[...(t.targetRoles||[])],companyTypes:[...(t.companyTypes||[])]}));
}

function getTemplateById(templateId, language = 'vi') {
  const templates = getAvailableTemplates(language);
  if (!templateId) return templates[0];
  const query = String(templateId).toLowerCase().trim();
  const template = templates.find(t =>
    t.id.toLowerCase() === query ||
    t.slug.toLowerCase() === query ||
    t.baseHtmlFile?.toLowerCase() === query ||
    TEMPLATE_METADATA.some(meta => meta.id.toLowerCase() === query && meta.slug === t.slug)
  );
  if (!template) throw new Error('KhÃ´ng tÃ¬m tháº¥y máº«u CV: ' + templateId);
  return template;
}

/**
 * Thuáº­t toÃ¡n phÃ¢n tÃ­ch tá»« khÃ³a vÃ  so khá»›p máº«u CV báº±ng Rule-based (nhanh & chÃ­nh xÃ¡c)
 */
function semanticMatchTemplate({ targetRole = '', companyName = '', jdText = '', profile = '', language = 'vi' }) {
  const textToAnalyze = `${targetRole} ${companyName} ${jdText} ${typeof profile === 'string' ? profile : JSON.stringify(profile)}`.toLowerCase();
  const templates = getAvailableTemplates(language);

  let bestMatch = templates[0];
  let highestScore = -1;
  let matchReasons = [];

  for (const tmpl of templates) {
    let score = 0;
    const reasons = [];

    // 1. Kiá»ƒm tra vá»‹ trÃ­ á»©ng tuyá»ƒn (Target Role)
    for (const role of tmpl.targetRoles) {
      if (textToAnalyze.includes(role.toLowerCase())) {
        score += 35;
        reasons.push(`Vá»‹ trÃ­ "${role}" khá»›p chÃ­nh xÃ¡c vá»›i Ä‘á»‹nh hÆ°á»›ng cá»§a máº«u`);
        break;
      }
    }

    // 2. Kiá»ƒm tra loáº¡i cÃ´ng ty á»©ng tuyá»ƒn (Company Types)
    for (const compType of tmpl.companyTypes) {
      const keywords = compType.toLowerCase().split(/[\s,()]+/);
      const matchedKw = keywords.filter(kw => kw.length > 2 && textToAnalyze.includes(kw));
      if (matchedKw.length > 0) {
        score += 20;
        reasons.push(`PhÃ¹ há»£p vá»›i Ä‘áº·c thÃ¹ tuyá»ƒn dá»¥ng cá»§a nhÃ³m ${compType}`);
        break;
      }
    }

    // 3. PhÃ¢n biá»‡t theo cáº¥p báº­c á»©ng viÃªn (Executive vs Fresher / Junior)
    const isExecutive = /giÃ¡m Ä‘á»‘c|director|coo|ceo|head of|trÆ°á»Ÿng ban|leader|quáº£n lÃ½ cáº¥p cao|senior/i.test(textToAnalyze);
    const isInternOrFresher = /thá»±c táº­p|intern|fresher|sinh viÃªn|má»›i tá»‘t nghiá»‡p|junior/i.test(textToAnalyze);

    if (isExecutive && (tmpl.id.includes('senior') || tmpl.id.includes('pro_1') || tmpl.id.includes('experts'))) {
      score += 30;
      reasons.push(`Phong cÃ¡ch thiáº¿t káº¿ chuáº©n má»±c, uy tÃ­n phÃ¹ há»£p cho cáº¥p báº­c Quáº£n lÃ½ & LÃ£nh Ä‘áº¡o`);
    } else if (isInternOrFresher && (tmpl.id.includes('junior') || tmpl.id.includes('student'))) {
      score += 30;
      reasons.push(`Táº­p trung lÃ m ná»•i báº­t há»c váº¥n vÃ  Ä‘á»“ Ã¡n thá»±c táº¿ dÃ nh cho á»©ng viÃªn má»›i tá»‘t nghiá»‡p`);
    }

    // 4. Æ¯u tiÃªn chuáº©n Harvard cho cÃ¡c táº­p Ä‘oÃ n lá»›n / Äa quá»‘c gia / Big 4
    if (/harvard|big 4|pwc|deloitte|ey|kpmg|fpt|viettel|táº­p Ä‘oÃ n|multinational/i.test(textToAnalyze) && ['senior_v2','senior_2','schoolarship_standard'].includes(tmpl.slug)) {
      score += 15;
      reasons.push(`Bá»‘ cá»¥c Harvard Æ°u tiÃªn tiÃªu Ä‘á» rÃµ rÃ ng vÃ  ná»™i dung theo tá»«ng má»¥c`);
    }

    // 5. NgÃ nh nghá» khá»›p
    if (textToAnalyze.includes(tmpl.industry.toLowerCase())) {
      score += 15;
      reasons.push(`ÄÃºng ngÃ nh nghá» chuyÃªn mÃ´n: ${tmpl.industry}`);
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
      `Máº«u "${bestMatch.title}" cÃ³ bá»‘ cá»¥c chuáº©n ATS tá»‘i Æ°u nháº¥t cho vá»‹ trÃ­ ${targetRole || 'chuyÃªn mÃ´n'} táº¡i ${companyName || 'doanh nghiá»‡p'}`
    ]
  };
}

/**
 * Äá» xuáº¥t tá»± Ä‘á»™ng máº«u CV báº±ng Semantic Matching thÃ´ng minh (siÃªu tá»‘c 0ms, khÃ´ng tiÃªu hao Quota AI)
 */
async function autoMatchTemplate({ targetRole, companyName, jdText, profile, language = 'vi' }) {
  const matchResult = semanticMatchTemplate({ targetRole, companyName, jdText, profile, language });
  return {
    mode: 'auto',
    template: matchResult.template,
    matchScore: matchResult.matchScore,
    reasons: matchResult.reasons
  };
}

/**
 * Äá»c ná»™i dung HTML gá»‘c cá»§a má»™t máº«u CV Ä‘á»ƒ phá»¥c vá»¥ xem trÆ°á»›c (Preview) theo Ä‘Ãºng ngÃ´n ngá»¯ (VI / EN)
 */
function getTemplatePreviewHtml(templateId, language = 'vi') {
  const tmpl = getTemplateById(templateId, language);
  return require('./topcvSourceRenderer').renderTopcvSource(tmpl,{}, {},language,{preview:true});
  const isEn = language === 'en';
  const demo = {
    fullName: isEn ? 'Nguyen Minh An' : 'Nguyá»…n Minh An',
    language, targetRole: isEn ? 'Software Engineer' : 'Ká»¹ sÆ° pháº§n má»m',
    summary: isEn ? 'Software engineer experienced in developing reliable applications and APIs. Seeking opportunities to contribute technical expertise and collaborate with a professional team.' : 'Ká»¹ sÆ° pháº§n má»m cÃ³ kinh nghiá»‡m phÃ¡t triá»ƒn á»©ng dá»¥ng vÃ  API. Mong muá»‘n Ä‘Ã³ng gÃ³p chuyÃªn mÃ´n vÃ  há»£p tÃ¡c cÃ¹ng Ä‘á»™i ngÅ© chuyÃªn nghiá»‡p.',
    tailoredExperience: [
      { organization: 'ConnectCV', role: isEn ? 'Software Engineer' : 'Ká»¹ sÆ° pháº§n má»m', duration: '2023 - 2026', achievements: isEn ? ['Developed reliable APIs and improved application performance.', 'Collaborated with the team to deliver products on schedule.', 'Automated testing and deployment workflows.'] : ['PhÃ¡t triá»ƒn API vÃ  cáº£i thiá»‡n hiá»‡u nÄƒng á»©ng dá»¥ng.', 'Há»£p tÃ¡c vá»›i Ä‘á»™i ngÅ© Ä‘á»ƒ bÃ n giao sáº£n pháº©m Ä‘Ãºng tiáº¿n Ä‘á»™.', 'Tá»± Ä‘á»™ng hÃ³a kiá»ƒm thá»­ vÃ  quy trÃ¬nh triá»ƒn khai.'] },
      { organization: isEn ? 'Technology Company' : 'CÃ´ng ty CÃ´ng nghá»‡', role: isEn ? 'Junior Developer' : 'Láº­p trÃ¬nh viÃªn', duration: '2021 - 2023', achievements: isEn ? ['Built web applications and maintained databases.', 'Improved reliability through monitoring and testing.'] : ['XÃ¢y dá»±ng á»©ng dá»¥ng web vÃ  quáº£n lÃ½ cÆ¡ sá»Ÿ dá»¯ liá»‡u.', 'Cáº£i thiá»‡n Ä‘á»™ á»•n Ä‘á»‹nh qua giÃ¡m sÃ¡t vÃ  kiá»ƒm thá»­.'] }
    ],
    education: [{ school: isEn ? 'FPT University' : 'Äáº¡i há»c FPT', degree: isEn ? 'Software Engineering' : 'Ká»¹ thuáº­t pháº§n má»m', duration: '2017 - 2021', highlights: isEn ? 'Graduated with Honors' : 'Tá»‘t nghiá»‡p loáº¡i Giá»i' }],
    highlightedSkills: { technical: ['JavaScript', 'Node.js', 'PostgreSQL', 'Docker'], soft: isEn ? ['Communication', 'Teamwork'] : ['Giao tiáº¿p', 'LÃ m viá»‡c nhÃ³m'] }
  };
  const profile={fullName:demo.fullName,targetRole:demo.targetRole,summary:demo.summary,phone:'090 123 4567',email:'example@example.com',address:isEn?'Hanoi, Vietnam':'HÃ  Ná»™i, Viá»‡t Nam',avatarUrl:'/images/avatars/'+(fs.existsSync(path.join(TEMPLATES_DIR,'avatars',tmpl.slug+'.jpg'))?tmpl.slug:'default_v2')+'.jpg',skills:demo.highlightedSkills.technical,
    experience:demo.tailoredExperience.map(e=>({company:e.organization,role:e.role,time:e.duration,bullets:e.achievements})),education:demo.education.map(e=>({school:e.school,degree:e.degree,time:e.duration,highlight:e.highlights}))};
  return buildCvTemplateHtml(tmpl, demo, profile, language)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/contenteditable="true"/g, 'contenteditable="false"')
    .replace('</head>', '<style>.cv-toolbar{display:none!important}body,body.in-iframe{padding:0!important;background:white!important}.cv-page-container{margin:0!important;box-shadow:none!important}</style></head>');
}

/**
 * Äiá»n toÃ n diá»‡n dá»¯ liá»‡u CV Ä‘Æ°á»£c AI sinh ra vÃ o cáº¥u trÃºc HTML chuáº©n xÃ¡c cá»§a máº«u Ä‘Ã£ chá»n
 */
function renderCVDataToTemplateHtml(tmpl, cvData, userProfile = {}, language = 'vi') {
  return buildCvTemplateHtml(tmpl, cvData, userProfile, language);
}

/**
 * Láº¥y Ä‘Æ°á»ng dáº«n file Word (.docx) chuáº©n xÃ¡c theo ngÃ´n ngá»¯ Ä‘Ã£ chá»n
 */
function getTemplateDocxPath(templateId, language = 'vi') {
  const isEn = language === 'en';
  const tmpl = getTemplateById(templateId, language);

  const candidateFiles = isEn
    ? [tmpl.docx_en, tmpl.baseDocxFile, `${tmpl.slug}_en.docx`, `${tmpl.id}_en.docx`]
    : [tmpl.docx_vi, tmpl.baseDocxFile, `${tmpl.slug}_vi.docx`, `${tmpl.id}_vi.docx`];

  for (const filename of candidateFiles) {
    if (!filename) continue;
    const p = path.join(TEMPLATES_DIR, filename);
    if (fs.existsSync(p)) {
      return { path: p, filename };
    }
  }

  if (fs.existsSync(TEMPLATES_DIR)) {
    const dirFiles = fs.readdirSync(TEMPLATES_DIR);
    const matched = dirFiles.find(f => f.includes(tmpl.slug) && (isEn ? f.endsWith('_en.docx') : f.endsWith('_vi.docx')));
    if (matched) {
      return { path: path.join(TEMPLATES_DIR, matched), filename: matched };
    }
  }

  return null;
}

module.exports = {
  TEMPLATES_DIR,
  PREVIEW_VERSION,
  getAvailableTemplates,
  getTemplateById,
  semanticMatchTemplate,
  autoMatchTemplate,
  getTemplatePreviewHtml,
  getTemplateDocxPath,
  renderCVDataToTemplateHtml,
  normalizeAcademicSchool,
  normalizeAcademicDegree,
  normalizeAcademicHighlight,
  normalizeJobRole,
  normalizeCompanyName
};
