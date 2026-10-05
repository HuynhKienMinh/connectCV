/**
 * templateHtmlBuilder.js
 * Bộ máy render 74 bố cục CV theo kho ảnh gốc TopCV.
 * Điền toàn bộ thông tin ứng viên (Họ tên, Vị trí, Liên hệ, Mục tiêu, Kinh nghiệm, Học vấn, Kỹ năng)
 * vào đúng cấu trúc layout, bảng màu và phong cách thiết kế thực tế của từng mẫu CV.
 */

const {getDesign,designCss,designVersion}=require('./designRegistry');
const { groundCv } = require('./cvGroundingService');
const { renderCatalogBody } = require('./templateCatalogLayouts');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeAcademicSchool(school, isEn) {
  if (!school) return '';
  if (!isEn) return school;
  return String(school)
    .replace(/Đại học FPT Cần Thơ|FPT Cần Thơ/gi, 'FPT University Can Tho')
    .replace(/Đại học FPT/gi, 'FPT University')
    .replace(/Đại học Bách Khoa/gi, 'Bach Khoa University')
    .replace(/Đại học Quốc gia/gi, 'Vietnam National University')
    .replace(/Đại học Cần Thơ/gi, 'Can Tho University')
    .replace(/Đại học Kinh tế/gi, 'University of Economics')
    .replace(/Đại học/gi, 'University');
}

function normalizeAcademicDegree(degree, isEn) {
  if (!degree) return '';
  if (!isEn) return degree;
  return String(degree)
    .replace(/Kỹ sư Kỹ thuật Phần mềm/gi, 'Engineer in Software Engineering')
    .replace(/Kỹ thuật Phần mềm/gi, 'Software Engineering')
    .replace(/Kỹ sư Công nghệ Thông tin/gi, 'Engineer in Information Technology')
    .replace(/Công nghệ Thông tin/gi, 'Information Technology')
    .replace(/Khoa học Máy tính/gi, 'Computer Science')
    .replace(/Hệ thống Thông tin/gi, 'Information Systems')
    .replace(/An toàn Thông tin/gi, 'Information Security')
    .replace(/Kỹ sư/gi, 'Engineer in')
    .replace(/Cử nhân/gi, 'Bachelor of');
}

function normalizeAcademicHighlight(highlight, isEn) {
  if (!highlight) return '';
  if (!isEn) return highlight;
  return String(highlight)
    .replace(/Tốt nghiệp loại Xuất sắc/gi, 'Graduated with High Distinction')
    .replace(/Tốt nghiệp loại Giỏi/gi, 'Graduated with Honors')
    .replace(/Tốt nghiệp loại Khá/gi, 'Graduated with Distinction')
    .replace(/Tốt nghiệp/gi, 'Graduated');
}

function normalizeJobRole(role, isEn) {
  if (!role) return '';
  if (!isEn) return role;
  return String(role)
    .replace(/Lập trình viên Backend Node\.js/gi, 'Backend Node.js Developer')
    .replace(/Lập trình viên Backend/gi, 'Backend Developer')
    .replace(/Lập trình viên Frontend/gi, 'Frontend Developer')
    .replace(/Lập trình viên Fullstack/gi, 'Fullstack Developer')
    .replace(/Lập trình viên/gi, 'Software Developer')
    .replace(/Kỹ sư Phần mềm/gi, 'Software Engineer')
    .replace(/Kỹ sư Hệ thống/gi, 'Systems Engineer')
    .replace(/Chuyên viên/gi, 'Specialist');
}

function normalizeCompanyName(company, isEn) {
  if (!company) return '';
  if (!isEn) return company;
  return String(company)
    .replace(/Nền tảng AI Career/gi, 'AI Career Platform')
    .replace(/Nền tảng/gi, 'Platform')
    .replace(/Dự án/gi, 'Project');
}

function buildCvTemplateHtml(tmpl, cvData = {}, userProfile = {}, language = 'vi') {
  if (Object.keys(userProfile).length) cvData = groundCv(userProfile, cvData, language, cvData.sourceContext || {targetRole:cvData.targetRole});
  return require('./topcvSourceRenderer').renderTopcvSource(tmpl,cvData,userProfile,language);
  // ── i18n labels — dịch section headers theo ngôn ngữ CV
  const isEn = language === 'en' || cvData.language === 'en';

  const formatAddress = (addr, enMode) => {
    if (!addr) return '';
    if (!enMode) return addr;
    return addr
      .replace(/Việt Nam|Viet Nam/gi, 'Vietnam')
      .replace(/Cần Thơ/gi, 'Can Tho')
      .replace(/Hà Nội/gi, 'Hanoi')
      .replace(/TP\.?\s*Hồ Chí Minh|Hồ Chí Minh/gi, 'Ho Chi Minh City')
      .replace(/Đà Nẵng/gi, 'Da Nang')
      .replace(/Hải Phòng/gi, 'Hai Phong')
      .replace(/Quận\s*(\d+)/gi, 'District $1');
  };

  const L = {
    careerObjective:      isEn ? 'Career Objective'           : 'Mục tiêu nghề nghiệp',
    careerObjectiveUpper: isEn ? 'CAREER OBJECTIVE'           : 'MỤC TIÊU NGHỀ NGHIỆP',
    summary:              isEn ? 'Professional Summary'       : 'Mục tiêu nghề nghiệp',
    summaryUpper:         isEn ? 'PROFESSIONAL SUMMARY'       : 'MỤC TIÊU NGHỀ NGHIỆP',
    workExperience:       isEn ? 'Work Experience'            : 'Kinh nghiệm làm việc',
    workExperienceUpper:  isEn ? 'WORK EXPERIENCE'           : 'KINH NGHIỆM LÀM VIỆC',
    education:            isEn ? 'Education'                  : 'Học vấn',
    educationUpper:       isEn ? 'EDUCATION'                  : 'HỌC VẤN',
    skills:               isEn ? 'Skills'                     : 'Kỹ năng',
    skillsUpper:          isEn ? 'SKILLS'                     : 'KỸ NĂNG',
    technicalSkills:      isEn ? 'Technical Skills'           : 'Kỹ năng chuyên môn',
    technicalSkillsUpper: isEn ? 'TECHNICAL SKILLS'           : 'KỸ NĂNG CHỦ ĐẠO',
    techAndToolsUpper:    isEn ? 'TECHNICAL SKILLS'           : 'KỸ THUẬT & CÔNG NGHỆ',
    contact:              isEn ? 'Contact'                    : 'Liên hệ',
    contactUpper:         isEn ? 'CONTACT'                    : 'LIÊN HỆ',
    personalInfo:         isEn ? 'Personal Information'       : 'Thông tin cá nhân',
    personalInfoUpper:    isEn ? 'PERSONAL INFORMATION'       : 'THÔNG TIN CÁ NHÂN',
    info:                 isEn ? 'Information'                : 'Thông tin',
    infoUpper:            isEn ? 'INFORMATION'                : 'THÔNG TIN',
    phone:                isEn ? 'Phone'                      : 'Số điện thoại',
    phoneUpper:           isEn ? 'PHONE'                      : 'SỐ ĐIỆN THOẠI',
    email:                isEn ? 'Email'                      : 'Email',
    emailUpper:           isEn ? 'EMAIL'                      : 'EMAIL',
    address:              isEn ? 'Address'                    : 'Địa chỉ',
    addressUpper:         isEn ? 'ADDRESS'                    : 'ĐỊA CHỈ',
    present:              isEn ? 'Present'                    : 'Hiện tại',
  };
  const design=getDesign(tmpl.slug || tmpl.id,language);
  const color = design.style.a;
  const layout = tmpl.layout || 'single_column_classic';
  const slug = tmpl.slug || 'default_v2';

  // 1. Chuẩn hóa thông tin ứng viên (Đã lọc & vô hiệu hóa triệt để XSS và ký tự độc hại)
  const candidate = escapeHtml(userProfile.fullName || cvData.fullName || '');
  const rawRole = cvData.targetRole || userProfile.targetRole || '';
  const role = escapeHtml(rawRole);
  const phone = escapeHtml(userProfile.phone || cvData.phone || '');
  const email = escapeHtml(userProfile.email || cvData.email || '');
  const address = escapeHtml(formatAddress(cvData.address || userProfile.address || '', isEn));
  const birth = escapeHtml(userProfile.birth || cvData.birth || '');
  const gender = escapeHtml(cvData.gender || userProfile.gender || '');
  const summary = escapeHtml(cvData.summary || userProfile.summary || '');

  // Avatar cá nhân của người dùng (hỗ trợ base64 upload hoặc link ảnh đã sanitize)
  let rawAvatar = userProfile.avatarUrl || userProfile.avatarDataUrl || cvData.avatarUrl || cvData.avatarDataUrl || '';
  let candidateAvatar = '';
  if (rawAvatar && typeof rawAvatar === 'string') {
    const trimmed = rawAvatar.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/')) {
      candidateAvatar = escapeHtml(trimmed);
    }
  }

  // 2. Chuẩn hóa danh sách kỹ năng (Ưu tiên kỹ năng kỹ thuật thực tế từ Profile & JD)
  let technicalSkills = [];
  let softSkills = [];
  if (cvData.highlightedSkills) {
    if (Array.isArray(cvData.highlightedSkills.technical)) technicalSkills.push(...cvData.highlightedSkills.technical);
    if (Array.isArray(cvData.highlightedSkills.soft)) softSkills.push(...cvData.highlightedSkills.soft);
  }
  if (technicalSkills.length === 0 && Array.isArray(userProfile.skills)) technicalSkills = userProfile.skills;

  // Danh sách kỹ năng: Bắt buộc giữ vững kỹ năng kỹ thuật cốt lõi, không để slogan văn hóa lấn át
  let skills = [...technicalSkills];
  if (skills.length < 8 && softSkills.length > 0) {
    // Chỉ thêm tối đa 2 kỹ năng mềm chuyên nghiệp nếu còn chỗ
    skills.push(...softSkills.slice(0, 2));
  }
  skills = skills.map(sk => escapeHtml(sk));

  // 3. Chuẩn hóa kinh nghiệm làm việc (Ground Truth First: Bảo toàn 100% công ty/dự án thật của ứng viên & chuẩn hóa ngôn ngữ)
  let rawExpList = [];
  if (Array.isArray(cvData.tailoredExperience) && cvData.tailoredExperience.length > 0) {
    rawExpList = cvData.tailoredExperience;
  } else if (Array.isArray(userProfile.experience) && userProfile.experience.length > 0) {
    rawExpList = userProfile.experience;
  }

  const experience = rawExpList.map(exp => ({
    company:escapeHtml(exp.organization || exp.company || ''), role:escapeHtml(exp.role || exp.position || ''),
    time:escapeHtml(exp.duration || exp.time || ''), bullets:(exp.achievements || exp.bullets || []).map(escapeHtml)
  }));
  const rawEduList = Array.isArray(cvData.education) ? cvData.education : (userProfile.education || []);
  const education = rawEduList.map(edu=>({school:escapeHtml(edu.school || ''),degree:escapeHtml(edu.degree || ''),
    time:escapeHtml(edu.duration || edu.time || ''),highlight:escapeHtml(edu.highlights || edu.highlight || '')}));

  // Toolbar HTML
  const toolbarHtml = `
    <div class="cv-toolbar no-print">
        <button onclick="downloadAsPdf()" style="background:#00B14F; color:#fff; border:none; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '📥 Download PDF (A4)' : '📥 Tải PDF (Chuẩn A4)'}
        </button>
        <button onclick="downloadAsDocx()" style="background:#2563eb; color:#fff; border:none; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '📄 Download Word (.docx)' : '📄 Tải Word (.docx)'}
        </button>
        <button onclick="window.print()" style="background:#475569; color:#fff; border:none; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '🖨️ Print A4' : '🖨️ In A4'}
        </button>
        <button onclick="saveCurrentCVHtml()" style="background:#fff; border:1px solid #cbd5e1; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '💾 Save HTML' : '💾 Lưu File HTML'}
        </button>
        <span style="font-size:12px; color:#64748b; font-weight:700;">🎨 ${isEn ? 'Template' : 'Mẫu'}: <b>${escapeHtml(tmpl.title || '')}</b></span>
    </div>
  `;

  // Render Body theo đúng Layout của Mẫu đã chọn
  let bodyContent = '';

  const catalogBody = renderCatalogBody(slug, {candidate,role,phone,email,address,birth,gender,summary,skills,experience,education,L,isEn,userProfile,cvData,candidateAvatar});
  if (catalogBody) {
    bodyContent = catalogBody;
  } else if (slug === 'tiktop') {
    const section = text => `<h2 class="tiktop-heading" contenteditable="true">${text}</h2>`;
    const extra = (items) => (Array.isArray(items) ? items : []).map(item => {
      const text = typeof item === 'string' ? item : [item.name || item.title || item.organization, item.role, item.year || item.date || item.duration, item.description].filter(Boolean).join(' · ');
      return `<p class="tiktop-extra" contenteditable="true">${escapeHtml(text)}</p>`;
    }).join('');
    const activities = extra(cvData.activities || userProfile.activities);
    const certifications = extra(cvData.certifications || userProfile.certifications);
    const awards = extra(cvData.awards || userProfile.awards);
    bodyContent = `<style>
      .cv-page-container:has(.tiktop-layout){background:#000!important;height:auto!important;max-height:none!important;overflow:visible!important}
      .tiktop-layout{background:#000;color:#fff;min-height:296mm;padding:20px 22px 30px;font:12px/1.5 Roboto,sans-serif}
      .tiktop-top{display:grid;grid-template-columns:38% minmax(0,1fr);gap:24px;margin-bottom:32px}
      .tiktop-photo{height:390px;position:relative;overflow:hidden;border-radius:20px;background:#202020}
      .tiktop-photo img{width:100%;height:100%;object-fit:cover;display:block}
      .tiktop-social{position:absolute;right:12px;bottom:15px;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;font-size:25px;text-shadow:0 1px 3px #0006}
      .tiktop-social span{display:block}.tiktop-social small{font-size:10px;display:block;text-align:center}
      .tiktop-photo-caption{position:absolute;left:18px;bottom:21px;font-size:10px;text-shadow:0 1px 3px #000}
      .tiktop-name{font-size:26px;line-height:1.25;font-weight:500;margin:0 0 12px;overflow-wrap:anywhere}
      .tiktop-contact{display:flex;align-items:baseline;gap:10px;margin:10px 0;font-size:11px;overflow-wrap:anywhere}
      .tiktop-icon{background:white;color:#111;border:1px solid #63dfcc;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px}
      .tiktop-objective{margin-top:17px}.tiktop-objective p{margin-top:12px}
      .tiktop-columns{display:grid;grid-template-columns:38% minmax(0,1fr);gap:24px}
      .tiktop-heading{font-size:15px;line-height:1.3;font-weight:700;text-transform:uppercase;position:relative;padding-bottom:10px;margin:0 0 16px}
      .tiktop-heading:after{content:'';position:absolute;bottom:0;left:0;width:38px;height:3px;background:linear-gradient(90deg,#69e4da 0 16%,white 16% 82%,#ee4271 82%)}
      .tiktop-item{margin:0 0 26px}.tiktop-item p{margin:5px 0}.tiktop-date{font-size:10px;color:#ccc;text-transform:uppercase;margin:8px 0}
      .tiktop-item ul{padding-left:16px;margin-top:10px}.tiktop-item li{margin-bottom:4px}.tiktop-extra{margin:0 0 12px}
    </style><div class="tiktop-layout" data-template="tiktop">
      <div class="tiktop-top">
        <div class="tiktop-photo"><img src="${candidateAvatar || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${candidate}">
          <div style="position:absolute;top:16px;left:0;right:0;text-align:center;font-size:10px;pointer-events:none">${isEn ? 'Following | For you' : 'Đang theo dõi | Dành cho bạn'}</div>
          <div class="tiktop-photo-caption">${isEn ? 'Your career story' : 'Câu chuyện nghề nghiệp'}</div>
          <div class="tiktop-social"><span style="color:#ff5a4e">♥</span><span>●<small>•••</small></span><span>↗</span><span style="color:#61d4b5">♫</span></div>
        </div>
        <header><h1 class="tiktop-name" contenteditable="true">${candidate}</h1>
          ${[['✉', 'Email', email], ['☎', L.phone, phone], ['⌖', L.address, address]].map(([icon,label,value])=>`<div class="tiktop-contact"><span class="tiktop-icon">${icon}</span><span contenteditable="true">${label}: &nbsp;${value}</span></div>`).join('')}
          <div class="tiktop-objective"><div class="tiktop-contact"><span class="tiktop-icon">i</span><span contenteditable="true">${isEn ? 'BACKGROUND/CAREER OBJECTIVES' : 'MỤC TIÊU NGHỀ NGHIỆP'}</span></div><p contenteditable="true">${summary}</p></div>
        </header>
      </div>
      <div class="tiktop-columns"><aside>
        ${section(L.educationUpper)}${education.map(e=>`<div class="tiktop-item"><p contenteditable="true"><span class="tiktop-icon">▣</span> <b>${e.school}</b>, ${e.degree}</p><p class="tiktop-date" contenteditable="true">${e.time}</p><p contenteditable="true">${e.highlight}</p></div>`).join('')}
        ${activities ? section(isEn?'ACTIVITIES':'HOẠT ĐỘNG')+activities : ''}
        ${section(L.skillsUpper)}${skills.map(s=>`<p class="tiktop-extra" contenteditable="true">${s}</p>`).join('')}
        ${awards ? section(isEn?'HONORS & AWARDS':'DANH HIỆU & GIẢI THƯỞNG')+awards : ''}
      </aside><main>
        ${section(L.workExperienceUpper)}${experience.map(e=>`<div class="tiktop-item"><p contenteditable="true"><span class="tiktop-icon">▣</span> <b>${e.company}</b>, ${e.role}</p><p class="tiktop-date" contenteditable="true">${e.time}</p><ul>${e.bullets.map(b=>`<li contenteditable="true">${b}</li>`).join('')}</ul></div>`).join('')}
        ${certifications ? section(isEn?'CERTIFICATIONS':'CHỨNG CHỈ')+certifications : ''}
      </main></div>
    </div>`;
  } else if (slug === 'senior_2') {
    const heading = title => `<h2 style="text-align:center;font-size:17px;margin:22px 0 10px;font-weight:700">${title}</h2>`;
    bodyContent = `<style>.cv-page-container:has(.cv-family) {height:auto!important;max-height:none!important;overflow:visible!important;}</style>
      <div class="cv-family" data-template="senior_2" style="min-height:296mm;padding:32px 48px;color:#000;font:13px/1.35 Tinos,serif">
        <header style="text-align:center;border-bottom:1px solid #000;padding-bottom:10px">
          <h1 style="font-size:21px;margin-bottom:6px" contenteditable="true">${candidate}</h1>
          <p contenteditable="true">${address}</p><p contenteditable="true">${phone} · ${email}</p>
        </header>
        ${heading(isEn ? 'BACKGROUND/CAREER OBJECTIVES' : 'MỤC TIÊU NGHỀ NGHIỆP')}
        <p contenteditable="true">${summary}</p>
        ${heading(L.educationUpper)}
        ${education.map(e=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:12px"><span contenteditable="true"><b>${e.school}</b> — <i>${e.degree}</i></span><span contenteditable="true">${e.time}</span></div><p contenteditable="true">${e.highlight}</p></div>`).join('')}
        ${heading(L.workExperienceUpper)}
        ${experience.map(e=>`<div style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;gap:12px"><span contenteditable="true"><b>${e.company}</b> — <i>${e.role}</i></span><span contenteditable="true">${e.time}</span></div><ul style="padding-left:17px">${e.bullets.map(b=>`<li contenteditable="true">${b}</li>`).join('')}</ul></div>`).join('')}
        ${heading(L.skillsUpper)}${skills.map(s=>`<p contenteditable="true">${s}</p>`).join('')}
      </div>`;
  } else if (slug === 'bright') {
    const title = text => `<h2 style="font-size:20px;font-weight:700;margin:20px 0 16px;border-bottom:1px solid #bbb;padding-bottom:10px">${text}</h2>`;
    bodyContent = `<style>.cv-page-container:has(.cv-family) {height:auto!important;max-height:none!important;overflow:visible!important;}</style>
      <div class="cv-family" data-template="bright" style="display:grid;grid-template-columns:38.5% minmax(0,1fr);min-height:296mm;color:#2b3028;font-size:12.5px;line-height:1.5;background:#faf9f7">
        <aside><div style="background:${design.style.side || '#e8dfd4'};padding:32px 30px 18px">
          <div style="width:210px;height:210px;max-width:100%;margin:0 auto 28px;border-radius:50%;overflow:hidden;background:white"><img src="${candidateAvatar || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" style="width:100%;height:100%;object-fit:cover;display:block" alt="${candidate}"></div>
          ${[['☎',phone],['✉',email],['◎',escapeHtml(userProfile.website||userProfile.linkedin||'')],['⌖',address],['▣',escapeHtml(userProfile.birth||'')]].filter(([,t])=>t).map(([icon,text])=>`<div style="display:flex;gap:12px;align-items:center;border-top:1px solid #a1a396;padding:10px 0"><span style="display:inline-flex;justify-content:center;align-items:center;border:1px solid ${color};border-radius:50%;width:27px;height:27px;flex-shrink:0">${icon}</span><span contenteditable="true" style="overflow-wrap:anywhere">${text}</span></div>`).join('')}
        </div><div style="padding:12px 30px 28px">
          ${title(isEn?'Skills':'Kỹ năng')}${skills.map(s=>`<p style="margin:14px 0" contenteditable="true">✦ ${s}</p>`).join('')}
          ${title(isEn?'Education':'Học vấn')}${education.map(e=>`<div style="margin-bottom:16px"><p contenteditable="true"><b>${e.school}</b></p><p contenteditable="true">${e.degree}</p><p contenteditable="true">${e.time}</p><p contenteditable="true">${e.highlight}</p></div>`).join('')}
        </div></aside>
        <main style="min-width:0"><header style="background:${color};color:white;padding:42px 36px 32px">
          <h1 style="font-size:31px;line-height:1.3;font-weight:700;margin-bottom:14px;overflow-wrap:anywhere" contenteditable="true">${candidate}</h1>
          <p style="font-size:16px;margin-bottom:12px" contenteditable="true">${role}</p><div style="width:100px;border-top:1px solid white;margin-bottom:12px"></div><p contenteditable="true">${summary}</p>
        </header><div style="padding:12px 32px 32px">
          ${title(isEn?'Work experience':'Kinh nghiệm làm việc')}${experience.map(e=>`<div style="margin-bottom:24px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;margin-bottom:6px"><b contenteditable="true">${e.company}</b><span style="background:${color};color:white;border-radius:20px;padding:2px 10px;white-space:nowrap;font-size:11px" contenteditable="true">${e.time}</span></div><p style="text-transform:uppercase;font-size:11px;margin-bottom:12px" contenteditable="true">${e.role}</p><ul style="padding-left:16px">${e.bullets.map(b=>`<li contenteditable="true">${b}</li>`).join('')}</ul></div>`).join('')}
        </div></main>
      </div>`;
  }
  // Graceful has a pale header and a framed white sidebar, not a solid dark one.
  else if (layout === 'bordeaux_balanced' || slug === 'graceful') {
    const sidebarTitle = text => `<h2 class="graceful-sidebar-title">${text}</h2>`;
    const contact = (icon, text) => text ? `<div class="graceful-contact"><span class="graceful-contact-icon">${icon}</span><span contenteditable="true">${text}</span></div>` : '';
    const website = escapeHtml(userProfile.website || userProfile.linkedin || cvData.website || cvData.linkedin || '');
    const certifications = cvData.certifications || userProfile.certifications || [];
    const awards = cvData.awards || userProfile.awards || [];
    const extraItems = items => (Array.isArray(items) ? items : []).map(item => {
      const text = typeof item === 'string' ? item : [item.year || item.date, item.name || item.title, item.issuer || item.organization].filter(Boolean).join(' · ');
      return `<p contenteditable="true">${escapeHtml(text)}</p>`;
    }).join('');
    bodyContent = `
      <style>
        .cv-page-container:has(.graceful-layout) { height:auto !important; max-height:none !important; overflow:visible !important; }
        .graceful-layout { --graceful-accent:${color}; --graceful-pale:color-mix(in srgb, ${color} 20%, white); position:relative; display:grid; grid-template-columns:34% minmax(0,1fr); min-height:296mm; padding:32px 28px 24px; gap:32px; color:#293b47; font-size:12.5px; line-height:1.6; }
        .graceful-layout:before { content:''; position:absolute; top:0; left:0; right:0; height:168px; background:var(--graceful-pale); }
        .graceful-sidebar { position:relative; border:2px solid var(--graceful-pale); padding:16px; min-width:0; }
        .graceful-avatar { display:block; width:100%; aspect-ratio:1; object-fit:cover; border:2px solid var(--graceful-pale); margin:0 0 32px; }
        .graceful-contact { display:flex; align-items:center; gap:12px; margin-bottom:8px; overflow-wrap:anywhere; }
        .graceful-contact-icon { display:inline-flex; justify-content:center; align-items:center; flex:0 0 26px; height:26px; border:1px solid var(--graceful-accent); border-radius:50%; color:var(--graceful-accent); }
        .graceful-sidebar-title { background:var(--graceful-pale); color:var(--graceful-accent); font-size:18px; font-weight:700; padding:6px 14px; margin:24px 0 16px; }
        .graceful-sidebar p { margin-bottom:10px; overflow-wrap:anywhere; }
        .graceful-main { position:relative; min-width:0; }
        .graceful-header { min-height:168px; padding-top:12px; padding-bottom:36px; color:var(--graceful-accent); }
        .graceful-header h1 { font-size:34px; line-height:1.3; font-weight:700; margin:0 0 20px; overflow-wrap:anywhere; }
        .graceful-header p { font-size:21px; font-weight:700; line-height:1.35; }
        .graceful-main h2 { font-size:20px; font-weight:700; margin:0 0 16px; }
        .graceful-main section { margin-bottom:24px; }
        .graceful-job { margin-bottom:24px; break-inside:avoid; }
        .graceful-job h3 { font-size:13px; margin-bottom:8px; }
        .graceful-job p { margin-bottom:14px; }
        .graceful-job ol { padding-left:20px; }
        @media print {
          html:has(.graceful-layout), body:has(.graceful-layout) { height:auto !important; overflow:visible !important; }
          .graceful-layout { min-height:296mm; }
        }
      </style>
      <div class="graceful-layout" data-template="graceful">
        <aside class="graceful-sidebar">
          <img class="graceful-avatar" src="${candidateAvatar || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='}" alt="${candidate}">
          ${contact('▣', escapeHtml(userProfile.birth || cvData.birth || ''))}
          ${contact('☎', phone)}${contact('✉', email)}${contact('◎', website)}${contact('⌖', address)}
          ${sidebarTitle(isEn ? 'Education' : 'Học vấn')}
          ${education.map(edu => `<div style="margin-bottom:20px"><p><b contenteditable="true">${edu.school}</b></p><p contenteditable="true">${edu.degree}</p><p contenteditable="true">${edu.time}</p>${edu.highlight ? `<p contenteditable="true">${edu.highlight}</p>` : ''}</div>`).join('')}
          ${sidebarTitle(isEn ? 'Skills' : 'Kỹ năng')}
          ${skills.map(sk => `<p style="font-weight:700;margin-bottom:20px" contenteditable="true">${sk}</p>`).join('')}
          ${Array.isArray(certifications) && certifications.length ? sidebarTitle(isEn ? 'Certifications' : 'Chứng chỉ') + extraItems(certifications) : ''}
          ${Array.isArray(awards) && awards.length ? sidebarTitle(isEn ? 'Honors & Awards' : 'Danh hiệu & Giải thưởng') + extraItems(awards) : ''}
        </aside>
        <main class="graceful-main">
          <header class="graceful-header"><h1 contenteditable="true">${candidate}</h1><p contenteditable="true">${role}</p></header>
          <section><h2>${isEn ? 'Objective' : 'Mục tiêu'}</h2><p contenteditable="true">${summary}</p></section>
          <section><h2>${isEn ? 'Work experience' : 'Kinh nghiệm làm việc'}</h2>
            ${experience.map(exp => `<div class="graceful-job"><h3 contenteditable="true">${exp.company} ( ${exp.time} )</h3><p contenteditable="true">${exp.role}</p><ol>${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}</ol></div>`).join('')}
          </section>
        </main>
      </div>`;
  }
  // Layout 1: 1 Cột kinh điển (default_v2)

  const crop = userProfile.avatarCrop || {};
  const cropZoom = Math.max(1, Math.min(3, Number(crop.zoom) || 1));
  const cropLimit = (cropZoom - 1) * 50;
  const cropX = Math.max(-cropLimit, Math.min(cropLimit, Number(crop.x) || 0));
  const cropY = Math.max(-cropLimit, Math.min(cropLimit, Number(crop.y) || 0));
  bodyContent = bodyContent.replace(/<img /g, `<img data-photo-zoom="${cropZoom}" data-photo-x="${cropX}" data-photo-y="${cropY}" `);

  // Nếu là layout toàn trang (không có sidebar full bleed), bọc padding đều các cạnh A4
  const isEdgeToEdge = [
    "sidebar_dark_burgundy",
    "sidebar_moss_green_progress_bars",
    "sidebar_charcoal_amber_timeline",
    "tech_stack_matrix"
  ].includes(layout) || !!catalogBody || slug === 'tiktop' || (
    !["single_column_classic", "centered_junior", "elegant_3_columns_sub", "minimalist_dashed_navy", "sidebar_coffee_brown", "harvard", "harvard_classic_text_only", "royal_blue_expert"].includes(layout)
  );

  if (!isEdgeToEdge) {
    bodyContent = `
      <div style="width:100%; height:296mm; min-height:296mm; max-height:296mm; padding:15mm 20mm; box-sizing:border-box; overflow:hidden;">
        ${bodyContent}
      </div>
    `;
  }

  // Toàn bộ trang hoàn chỉnh
  return `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'vi'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${candidate} - ${isEn ? 'ATS Standard Resume' : 'CV Chuẩn ATS'} [${tmpl.title}]</title>
    <script src="/js/html2pdf.bundle.min.js"></script>
    <script src="/js/cv-photo-editor.js" defer></script>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        @page {
            size: A4 portrait;
            margin: 0mm !important;
        }
        html, body {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #cbd5e1;
            font-family: '${design.style.font}',sans-serif;
            color: #334155;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        body {
            padding: 20px 0;
        }
        body.in-iframe {
            padding: 8px 0 !important;
            background: #cbd5e1 !important;
        }
        body.in-iframe .cv-toolbar {
            display: none !important;
        }
        .cv-page-container {
            width: 210mm;
            min-width: 210mm;
            max-width: 210mm;
            height: 296mm;
            min-height: 296mm;
            max-height: 296mm;
            background: #ffffff;
            margin: 0 auto;
            padding: 0 !important;
            box-shadow: 0 8px 30px rgba(0,0,0,0.18);
            position: relative;
            box-sizing: border-box;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
        }
        .cv-toolbar {
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-radius: 30px;
            padding: 8px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10000;
            border: 1px solid #e2e8f0;
        }
        [contenteditable="true"] { outline: none; border-radius: 2px; }
        [contenteditable="true"]:hover { background: rgba(0,0,0,0.03); }
        [contenteditable="true"]:focus { background: rgba(0,0,0,0.05); }
        @media print {
            html, body, body.in-iframe {
                width: 210mm !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                overflow: visible !important;
            }
            .no-print, .cv-toolbar, .cv-photo-editor {
                display: none !important;
            }
            .cv-page-container {
                margin: 0 !important;
                box-shadow: none !important;
                padding: 0 !important;
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                height: 296mm !important;
                min-height: 296mm !important;
                max-height: 296mm !important;
                overflow: hidden !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
            }
        }
    </style>
    <style id="cv-canonical-design">${designCss(design)}</style>
</head>
<body>
    <script>
        if (window.self !== window.top) {
            document.body.classList.add('in-iframe');
            window.addEventListener('DOMContentLoaded', function() {
                var tb = document.querySelector('.cv-toolbar');
                if (tb) tb.style.display = 'none';
            });
        }
    </script>

    ${toolbarHtml}

    <div class="cv-page-container" id="cv-content" data-template="${escapeHtml(slug)}" data-layout="${escapeHtml(layout)}" data-design-version="${designVersion()}">
        ${bodyContent}
    </div>

    <script>
        async function downloadAsPdf() {
            try {
                const clone = document.documentElement.cloneNode(true);
                const tb = clone.querySelector('.cv-toolbar');
                if (tb) tb.remove();

                const response = await fetch('/api/cv/export-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        html: '<!DOCTYPE html>' + clone.outerHTML,
                        fileName: '${candidate.replace(/\s+/g, '_')}_CV_ATS'
                    })
                });

                if (!response.ok) throw new Error('Server returned ' + response.status);

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '${candidate.replace(/\s+/g, '_')}_CV_ATS.pdf';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            } catch (err) {
                console.warn('Lỗi xuất PDF qua máy chủ, chuyển sang in trình duyệt:', err);
                window.print();
            }
        }

        async function downloadAsDocx() {
            try {
                const response = await fetch('/api/cv/export-docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        html: '<!DOCTYPE html>' + document.documentElement.outerHTML,
                        templateId: '${tmpl.id || 'default_v2'}',
                        language: '${isEn ? 'en' : 'vi'}',
                        fileName: '${candidate.replace(/\s+/g, '_')}_CV_ATS'
                    })
                });

                if (!response.ok) throw new Error('Server returned ' + response.status);

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = '${candidate.replace(/\s+/g, '_')}_CV_ATS.docx';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            } catch (err) {
                console.warn('Lỗi xuất file Word (.docx):', err);
            }
        }

        function saveCurrentCVHtml() {
            const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '${candidate.replace(/\\s+/g, '_')}_CV_ATS.html';
            a.click();
        }
    </script>
</body>
</html>`;
}

module.exports = {
  buildCvTemplateHtml,
  normalizeAcademicSchool,
  normalizeAcademicDegree,
  normalizeAcademicHighlight,
  normalizeJobRole,
  normalizeCompanyName
};
