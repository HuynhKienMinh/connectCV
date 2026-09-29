/**
 * templateHtmlBuilder.js
 * Bộ máy render giao diện HTML trực quan cho 20 mẫu CV ATS chuẩn TopCV.
 * Điền toàn bộ thông tin ứng viên (Họ tên, Vị trí, Liên hệ, Mục tiêu, Kinh nghiệm, Học vấn, Kỹ năng)
 * vào đúng cấu trúc layout, bảng màu và phong cách thiết kế thực tế của từng mẫu CV.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildCvTemplateHtml(tmpl, cvData = {}, userProfile = {}, language = 'vi') {
  // ── i18n labels — dịch section headers theo ngôn ngữ CV
  const isEn = language === 'en' || cvData.language === 'en';

  const formatAddress = (addr, enMode) => {
    if (!addr) return enMode ? 'Can Tho, Vietnam' : 'Cần Thơ, Việt Nam';
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
  const color = tmpl.themeColor || '#00B14F';
  const layout = tmpl.layout || 'single_column_classic';
  const slug = tmpl.slug || 'default_v2';

  // 1. Chuẩn hóa thông tin ứng viên (Đã lọc & vô hiệu hóa triệt để XSS và ký tự độc hại)
  const candidate = escapeHtml(cvData.fullName || userProfile.fullName || (isEn ? 'Huynh Kien Minh' : 'Huỳnh Kiên Minh'));
  const role = escapeHtml(cvData.targetRole || userProfile.targetRole || (isEn ? 'Backend Node.js Developer' : 'Lập trình viên Backend Node.js'));
  const phone = escapeHtml(userProfile.phone || cvData.phone || '(+84) 912 345 678');
  const email = escapeHtml(userProfile.email || cvData.email || 'kienminh.dev@gmail.com');
  const rawAddr = cvData.address || userProfile.address || (isEn ? 'Can Tho, Vietnam' : 'Cần Thơ, Việt Nam');
  const address = escapeHtml(formatAddress(rawAddr, isEn));
  const birth = escapeHtml(userProfile.birth || '24/08/1998');
  const gender = escapeHtml(userProfile.gender || (isEn ? 'Male' : 'Nam'));
  const summary = escapeHtml(cvData.summary || userProfile.summary || (isEn
    ? 'Dedicated Software Engineer with over 4 years of expertise in Backend development, database architecture, and high-performance system optimization. Proficient in Node.js, TypeScript, and cloud-native environments. Proven track record of designing scalable RESTful APIs and improving system latency by 35% using MongoDB and PostgreSQL.'
    : 'Kỹ sư phần mềm giàu nhiệt huyết với nền tảng vững chắc về phát triển hệ thống Backend, thiết kế cơ sở dữ liệu và tối ưu hóa hiệu năng ứng dụng. Mục tiêu trở thành Senior Backend Engineer đóng góp vào các giải pháp công nghệ quy mô lớn.'));

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
  if (technicalSkills.length === 0 && Array.isArray(cvData.matchedKeywords) && cvData.matchedKeywords.length > 0) {
    technicalSkills = cvData.matchedKeywords;
  }
  if (technicalSkills.length === 0 && Array.isArray(userProfile.skills) && userProfile.skills.length > 0) {
    technicalSkills = userProfile.skills;
  }
  if (technicalSkills.length === 0) {
    technicalSkills = isEn
      ? ['Node.js', 'Express', 'JavaScript / TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Git & CI/CD', 'Redis']
      : ['Node.js', 'Express', 'JavaScript / TypeScript', 'PostgreSQL', 'Docker', 'RESTful API', 'Git & CI/CD', 'Redis'];
  }

  // Danh sách kỹ năng: Bắt buộc giữ vững kỹ năng kỹ thuật cốt lõi, không để slogan văn hóa lấn át
  let skills = [...technicalSkills];
  if (skills.length < 8 && softSkills.length > 0) {
    // Chỉ thêm tối đa 2 kỹ năng mềm chuyên nghiệp nếu còn chỗ
    skills.push(...softSkills.slice(0, 2));
  }
  skills = skills.map(sk => escapeHtml(sk));

  // 3. Chuẩn hóa kinh nghiệm làm việc (Ground Truth First: Bảo toàn 100% công ty/dự án thật của ứng viên)
  let rawExpList = [];
  if (Array.isArray(userProfile.experience) && userProfile.experience.length > 0) {
    rawExpList = userProfile.experience;
  } else if (Array.isArray(cvData.tailoredExperience) && cvData.tailoredExperience.length > 0) {
    rawExpList = cvData.tailoredExperience;
  }

  let experience = rawExpList.map((exp, idx) => {
    const profileExp = (Array.isArray(userProfile.experience) && userProfile.experience[idx]) || null;
    const aiExp = (Array.isArray(cvData.tailoredExperience) && cvData.tailoredExperience[idx]) || {};

    const company = (profileExp && (profileExp.company || profileExp.organization)) || aiExp.organization || exp.organization || exp.company || (isEn ? 'ConnectCV Project (AI Career Platform)' : 'ConnectCV (Nền tảng AI Career)');
    const role = (profileExp && (profileExp.role || profileExp.position)) || aiExp.role || exp.role || exp.position || (isEn ? 'Backend Developer' : 'Lập trình viên Backend');
    const time = (profileExp && (profileExp.time || profileExp.duration)) || aiExp.duration || exp.duration || exp.time || (isEn ? '06/2023 - Present' : '06/2023 - Hiện tại');

    // Bullets ưu tiên thành tích được AI may đo theo JD và văn hóa công ty mục tiêu
    let bullets = [];
    if (Array.isArray(aiExp.achievements) && aiExp.achievements.length > 0) {
      bullets = aiExp.achievements;
    } else if (Array.isArray(exp.achievements) && exp.achievements.length > 0) {
      bullets = exp.achievements;
    } else if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
      bullets = exp.bullets;
    } else if (profileExp && Array.isArray(profileExp.bullets)) {
      bullets = profileExp.bullets;
    }

    return {
      company: escapeHtml(company),
      role: escapeHtml(role),
      time: escapeHtml(String(time).replace(/Hiện tại/gi, isEn ? 'Present' : 'Hiện tại')),
      bullets: (bullets || []).map(b => escapeHtml(b))
    };
  });

  if (experience.length === 0) {
    experience = [
      {
        company: escapeHtml(isEn ? 'ConnectCV (AI Career Platform)' : 'ConnectCV (Nền tảng AI Career)'),
        role: escapeHtml(role),
        time: escapeHtml(isEn ? '06/2023 - Present' : '06/2023 - Hiện tại'),
        bullets: [
          escapeHtml(isEn ? "Architected and engineered high-performance RESTful APIs using Node.js & Express, reducing latency by 25%." : "Phát triển nền tảng AI ConnectCV hỗ trợ tối ưu hóa CV và luyện phỏng vấn phục vụ 500+ người dùng."),
          escapeHtml(isEn ? "Built resilient data access layer with PostgreSQL and Redis cache, ensuring ACID integrity." : "Thiết kế và xây dựng hệ thống RESTful API hiệu năng cao bằng Node.js và Express, giảm 25% thời gian phản hồi."),
          escapeHtml(isEn ? "Standardized CI/CD containerization pipeline using Docker and Git, improving deployment safety." : "Ứng dụng PostgreSQL và Docker để chuẩn hóa quy trình triển khai và bảo mật dữ liệu.")
        ]
      }
    ];
  }

  // 4. Chuẩn hóa học vấn (Ground Truth First: Bảo toàn 100% Trường học, Ngành học từ Profile của người dùng)
  let rawEduList = [];
  if (Array.isArray(userProfile.education) && userProfile.education.length > 0) {
    rawEduList = userProfile.education;
  } else if (Array.isArray(cvData.education) && cvData.education.length > 0) {
    rawEduList = cvData.education;
  }

  let education = rawEduList.map((edu, idx) => {
    const profileEdu = (Array.isArray(userProfile.education) && userProfile.education[idx]) || null;
    const aiEdu = (Array.isArray(cvData.education) && cvData.education[idx]) || {};

    const school = (profileEdu && profileEdu.school) || edu.school || aiEdu.school || (isEn ? 'FPT University Can Tho' : 'Đại học FPT Cần Thơ');
    const degree = (profileEdu && profileEdu.degree) || edu.degree || aiEdu.degree || (isEn ? 'Bachelor of Software Engineering' : 'Kỹ sư Kỹ thuật Phần mềm');
    const time = (profileEdu && (profileEdu.time || profileEdu.duration)) || edu.duration || edu.time || '2019 - 2023';
    const highlight = (profileEdu && (profileEdu.highlight || profileEdu.highlights)) || aiEdu.highlights || edu.highlights || edu.highlight || (isEn ? 'Graduated with Honors - GPA 3.6/4.0' : 'Tốt nghiệp loại Giỏi - GPA 3.6/4.0');

    return {
      school: escapeHtml(school),
      degree: escapeHtml(degree),
      time: escapeHtml(String(time).replace(/Hiện tại/gi, isEn ? 'Present' : 'Hiện tại')),
      highlight: escapeHtml(highlight)
    };
  });

  if (education.length === 0) {
    education = [
      {
        school: escapeHtml(isEn ? 'FPT University Can Tho' : 'Đại học FPT Cần Thơ'),
        degree: escapeHtml(isEn ? 'Bachelor of Software Engineering' : 'Kỹ sư Kỹ thuật Phần mềm'),
        time: '2019 - 2023',
        highlight: escapeHtml(isEn ? 'GPA: 3.6/4.0 (Graduated with Honors)' : 'GPA: 3.6/4.0 (Tốt nghiệp loại Giỏi)')
      }
    ];
  }

  // Toolbar HTML
  const toolbarHtml = `
    <div class="cv-toolbar no-print">
        <button onclick="downloadAsPdf()" style="background:#00B14F; color:#fff; border:none; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '📥 Download PDF (A4)' : '📥 Tải PDF (Chuẩn A4)'}
        </button>
        <button onclick="window.print()" style="background:#2563eb; color:#fff; border:none; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '🖨️ Print A4' : '🖨️ In A4'}
        </button>
        <button onclick="saveCurrentCVHtml()" style="background:#fff; border:1px solid #cbd5e1; padding:7px 15px; border-radius:20px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px;">
          ${isEn ? '💾 Save HTML' : '💾 Lưu File HTML'}
        </button>
        <span style="font-size:12px; color:#64748b; font-weight:600;">🎨 ${isEn ? 'Template' : 'Mẫu'}: <b>${escapeHtml(tmpl.title || '')}</b></span>
    </div>
  `;

  // Render Body theo đúng Layout của Mẫu đã chọn
  let bodyContent = '';

  // Layout 1: 1 Cột kinh điển (default_v2)
  if (layout === "single_column_classic") {
    bodyContent = `
      <div class="cv-header" style="display:flex; align-items:center; gap:20px; border-bottom:2px solid ${color}; padding-bottom:15px; margin-bottom:18px;">
          <div style="width:85px; height:85px; border-radius:50%; background:#e2e8f0; overflow:hidden; border:2px solid ${color}; flex-shrink:0;">
              <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/default_v2.jpg';" />
          </div>
          <div>
              <h1 style="font-size:22px; font-weight:800; color:#1e293b; text-transform:uppercase; margin:0;" contenteditable="true">${candidate}</h1>
              <div style="font-size:13px; font-weight:700; color:${color}; text-transform:uppercase; margin-top:3px;" contenteditable="true">${role}</div>
              <div style="font-size:11.5px; color:#64748b; margin-top:6px; display:flex; gap:16px; flex-wrap:wrap;">
                  <span>📞 ${phone}</span>
                  <span>✉️ ${email}</span>
                  <span>📍 ${address}</span>
              </div>
          </div>
      </div>

      <div style="margin-bottom:16px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:8px;">${L.careerObjective}</h2>
          <p style="font-size:11.5px; color:#334155; line-height:1.55; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
      </div>

      <div style="margin-bottom:16px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:8px;">${L.workExperience}</h2>
          ${experience.map(exp => `
          <div style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                  <span style="font-size:12.5px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.company}</span>
                  <span style="font-size:11px; color:#64748b; font-style:italic;" contenteditable="true">${exp.time}</span>
              </div>
              <div style="font-size:11.5px; font-weight:600; color:${color}; margin-bottom:4px;" contenteditable="true">${exp.role}</div>
              <ul style="padding-left:16px; font-size:11.5px; color:#334155; line-height:1.45; margin:0;">
                  ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
              </ul>
          </div>
          `).join('')}
      </div>

      <div style="margin-bottom:16px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:8px;">${L.education}</h2>
          ${education.map(edu => `
          <div style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                  <span style="font-size:12.5px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</span>
                  <span style="font-size:11px; color:#64748b; font-style:italic;" contenteditable="true">${edu.time}</span>
              </div>
              <div style="font-size:11.5px; color:${color}; font-weight:600;" contenteditable="true">${edu.degree}</div>
              ${edu.highlight ? `<div style="font-size:11px; color:#64748b; margin-top:2px;" contenteditable="true">• ${edu.highlight}</div>` : ''}
          </div>
          `).join('')}
      </div>

      <div>
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin-bottom:8px;">${L.skills}</h2>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${skills.map(sk => `<span style="font-size:11px; padding:3px 8px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; color:#334155;" contenteditable="true">${sk}</span>`).join('')}
          </div>
      </div>
    `;
  }
  // Layout 2: 1 Cột Căn Giữa Tiêu Chuẩn Ít Kinh Nghiệm (default_junior)
  else if (layout === "centered_junior") {
    bodyContent = `
      <div style="text-align:center; border-bottom:2px solid ${color}; padding-bottom:16px; margin-bottom:18px;">
          <div style="width:80px; height:80px; border-radius:50%; background:#e2e8f0; overflow:hidden; margin:0 auto 10px auto; border:2px solid ${color};">
              <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/default_junior.jpg';" />
          </div>
          <h1 style="font-size:22px; font-weight:800; color:#1e293b; text-transform:uppercase; margin:0;" contenteditable="true">${candidate}</h1>
          <div style="font-size:13px; font-weight:700; color:${color}; margin-top:3px;" contenteditable="true">${role}</div>
          <div style="font-size:11px; color:#64748b; margin-top:6px; display:flex; justify-content:center; gap:20px;">
              <span>📞 ${phone}</span>
              <span>✉️ ${email}</span>
              <span>📍 ${address}</span>
          </div>
      </div>

      <div style="margin-bottom:15px; text-align:center;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">${L.careerObjective.toUpperCase()}</h2>
          <div style="width:40px; height:2px; background:${color}; margin:0 auto 8px auto;"></div>
          <p style="font-size:11.5px; color:#334155; line-height:1.55; max-width:90%; margin:0 auto;" contenteditable="true">${summary}</p>
      </div>

      <div style="margin-bottom:15px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; text-align:center; letter-spacing:1px; margin-bottom:6px;">${L.education.toUpperCase()}</h2>
          <div style="width:40px; height:2px; background:${color}; margin:0 auto 8px auto;"></div>
          ${education.map(edu => `
          <div style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                  <span style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</span>
                  <span style="font-size:11px; color:#64748b;" contenteditable="true">${edu.time}</span>
              </div>
              <div style="font-size:11.5px; color:${color}; font-weight:600;" contenteditable="true">${edu.degree}</div>
              ${edu.highlight ? `<div style="font-size:11px; color:#475569;" contenteditable="true">• ${edu.highlight}</div>` : ''}
          </div>
          `).join('')}
      </div>

      <div style="margin-bottom:15px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; text-align:center; letter-spacing:1px; margin-bottom:6px;">${L.workExperience.toUpperCase()}</h2>
          <div style="width:40px; height:2px; background:${color}; margin:0 auto 8px auto;"></div>
          ${experience.map(exp => `
          <div style="margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                  <span style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.company}</span>
                  <span style="font-size:11px; color:#64748b;" contenteditable="true">${exp.time}</span>
              </div>
              <div style="font-size:11.5px; color:${color}; font-weight:600;" contenteditable="true">${exp.role}</div>
              <ul style="padding-left:16px; font-size:11px; color:#334155; line-height:1.45; margin-top:3px;">
                  ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
              </ul>
          </div>
          `).join('')}
      </div>

      <div>
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; text-align:center; letter-spacing:1px; margin-bottom:6px;">${L.skills.toUpperCase()}</h2>
          <div style="width:40px; height:2px; background:${color}; margin:0 auto 8px auto;"></div>
          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:6px;">
              ${skills.map(sk => `<span style="font-size:11px; padding:3px 10px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:12px; color:#334155;" contenteditable="true">${sk}</span>`).join('')}
          </div>
      </div>
    `;
  }
  // Layout 3: Sidebar Đen Tối Đỏ Mận (impressive_6_v2)
  else if (layout === "sidebar_dark_burgundy") {
    const sidebarBg = "#39283A";
    const sidebarAccent = "#d4b8d6";
    bodyContent = `
      <div style="display:flex; width:100%; height:296mm; min-height:296mm; max-height:296mm; margin:0; box-sizing:border-box; overflow:hidden;">
          <!-- CỘT TRÁI - SIDEBAR TỐI BURGUNDY -->
          <div style="width:34%; background:${sidebarBg} !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color:#ffffff; padding:24px 18px; display:flex; flex-direction:column; gap:0; flex-shrink:0; height:100%; min-height:296mm; box-sizing:border-box;">
              <div style="text-align:center; margin-bottom:18px;">
                  <div style="width:90px; height:90px; border-radius:50%; overflow:hidden; background:#5a3f5b; margin:0 auto 12px auto; border:3px solid ${sidebarAccent};">
                      <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/impressive_6_v2.jpg';" />
                  </div>
                  <h1 style="font-size:15px; font-weight:800; color:#ffffff; text-transform:uppercase; line-height:1.3; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:10.5px; color:${sidebarAccent}; margin-top:5px;" contenteditable="true">${role}</div>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.15); padding-top:12px; margin-bottom:12px;">
                  <div style="font-size:10px; color:${sidebarAccent}; line-height:1.9;">
                      <div contenteditable="true">📞 ${phone}</div>
                      <div contenteditable="true">✉️ ${email}</div>
                      <div contenteditable="true">📍 ${address}</div>
                  </div>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.15); padding-top:12px; margin-bottom:12px;">
                  <h3 style="font-size:10px; font-weight:800; color:${sidebarAccent}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">${L.skillsUpper}</h3>
                  ${skills.map(sk => `<div style="font-size:10px; color:#e8d5ea; margin-bottom:5px;" contenteditable="true">▸ ${sk}</div>`).join('')}
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.15); padding-top:12px;">
                  <h3 style="font-size:10px; font-weight:800; color:${sidebarAccent}; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px;">${L.educationUpper}</h3>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="font-size:10.5px; font-weight:700; color:#ffffff;" contenteditable="true">${edu.school}</div>
                      <div style="font-size:10px; color:${sidebarAccent};" contenteditable="true">${edu.degree}</div>
                      <div style="font-size:9.5px; color:#b89abc;" contenteditable="true">${edu.time}</div>
                  </div>
                  `).join('')}
              </div>
          </div>

          <!-- CỘT PHẢI - NỘI DUNG -->
          <div style="flex:1; height:100%; min-height:296mm; padding:24px 22px; box-sizing:border-box; overflow:hidden;">
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:13px; font-weight:800; color:${sidebarBg}; text-transform:uppercase; border-bottom:2px solid ${sidebarBg}; padding-bottom:4px; margin-bottom:10px;">${L.careerObjectiveUpper}</h2>
                  <p style="font-size:11.5px; color:#334155; line-height:1.55; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
              </div>

              <div>
                  <h2 style="font-size:13px; font-weight:800; color:${sidebarBg}; text-transform:uppercase; border-bottom:2px solid ${sidebarBg}; padding-bottom:4px; margin-bottom:12px;">${L.workExperienceUpper}</h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:800; color:#1e293b;" contenteditable="true">${exp.company}</span>
                          <span style="font-size:10.5px; color:#64748b;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; font-weight:700; color:${sidebarBg}; margin-bottom:5px;" contenteditable="true">${exp.role}</div>
                      <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.5; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
    `;
  }
  // Layout 4: 2 Cột Sidebar Xanh Rêu có Progress Bars (onepage_impressive_2_v2)
  else if (layout === "sidebar_moss_green_progress_bars") {
    bodyContent = `
      <div style="display:flex; width:100%; height:296mm; min-height:296mm; max-height:296mm; margin:0; box-sizing:border-box; overflow:hidden;">
          <!-- CỘT TRÁI (SIDEBAR SẪM MÀU) -->
          <div style="width:36%; height:100%; min-height:296mm; background:${color} !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color:#ffffff; padding:25px 18px; box-sizing:border-box;">
              <div style="text-align:center; margin-bottom:18px;">
                  <div style="position:relative; width:100px; height:100px; border-radius:50%; margin:0 auto 10px auto; overflow:hidden; border:3px solid #ffffff;">
                      <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/onepage_impressive_2_v2.jpg';" />
                  </div>
                  <h1 style="font-size:19px; font-weight:800; color:#ffffff; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:12px; color:#d1d5db; margin-top:2px;" contenteditable="true">${role}</div>
              </div>

              <div style="font-size:11px; color:#e5e7eb; margin-bottom:18px; line-height:1.6; border-top:1px solid rgba(255,255,255,0.2); padding-top:10px;">
                  <div>📞 ${phone}</div>
                  <div>✉️ ${email}</div>
                  <div>📍 ${address}</div>
                  <div>🎂 ${birth}</div>
              </div>

              <div style="margin-bottom:18px;">
                  <h3 style="font-size:12px; font-weight:700; color:#ffffff; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:3px; margin-bottom:8px;">${L.careerObjectiveUpper}</h3>
                  <p style="font-size:11px; color:#d1d5db; line-height:1.45; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
              </div>

              <div style="margin-bottom:18px;">
                  <h3 style="font-size:12px; font-weight:700; color:#ffffff; text-transform:uppercase; border-bottom:1px solid rgba(255,255,255,0.3); padding-bottom:3px; margin-bottom:8px;">${L.skills}</h3>
                  <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  ${skills.slice(0, 8).map(sk => `
                  <span style="display:inline-block; padding:3px 9px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.28); border-radius:20px; font-size:10.5px; color:#e5e7eb;">${sk}</span>
                  `).join('')}
                  </div>
              </div>
          </div>

          <!-- CỘT PHẢI -->
          <div style="flex:1; height:100%; min-height:296mm; background:#ffffff; padding:25px 22px; box-sizing:border-box; overflow:hidden;">
              <div style="margin-bottom:20px;">
                  <h2 style="font-size:14px; font-weight:800; color:#1e293b; text-transform:uppercase; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:4px; margin-bottom:10px;">
                      <span>🎓 ${L.educationUpper}</span>
                  </h2>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12.5px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</span>
                          <span style="font-size:11px; color:#64748b;" contenteditable="true">${edu.time}</span>
                      </div>
                      <div style="font-size:11.5px; color:#475569; font-weight:600;" contenteditable="true">${edu.degree}</div>
                      ${edu.highlight ? `<div style="font-size:11px; color:#64748b;" contenteditable="true">• ${edu.highlight}</div>` : ''}
                  </div>
                  `).join('')}
              </div>

              <div>
                  <h2 style="font-size:14px; font-weight:800; color:#1e293b; text-transform:uppercase; display:flex; align-items:center; gap:6px; border-bottom:2px solid #e2e8f0; padding-bottom:4px; margin-bottom:10px;">
                      <span>💼 ${L.workExperienceUpper}</span>
                  </h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px; border-left:2px solid ${color}; padding-left:10px; margin-left:2px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12.5px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.role}</span>
                          <span style="font-size:11px; color:#64748b;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; color:${color}; font-weight:600; margin-bottom:4px;" contenteditable="true">${exp.company}</div>
                      <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.45; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
    `;
  }
  // Layout 5: Header Ngang + 3 Cột Nhỏ + Timeline Đỏ (elegant)
  else if (layout === "elegant_3_columns_sub") {
    bodyContent = `
      <div style="display:flex; gap:20px; align-items:center; margin-bottom:18px;">
          <div style="width:110px; height:125px; border-radius:8px; overflow:hidden; background:#e2e8f0; flex-shrink:0;">
              <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/elegant.jpg';" />
          </div>
          <div style="flex:1;">
              <h1 style="font-size:24px; font-weight:800; color:${color}; margin:0;" contenteditable="true">${candidate}</h1>
              <div style="font-size:13.5px; font-weight:700; color:#1e293b; text-transform:uppercase; margin-top:3px; margin-bottom:8px;" contenteditable="true">${role}</div>
              <div style="width:100%; height:2px; background:#1e293b; margin-bottom:8px;"></div>
              <p style="font-size:11px; color:#475569; line-height:1.45; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
          </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; border-top:2px solid ${color}; border-bottom:2px solid ${color}; padding:10px 0; margin-bottom:20px;">
          <div>
              <h4 style="font-size:11.5px; font-weight:800; color:#1e293b; text-transform:uppercase; margin-bottom:6px;">${L.personalInfoUpper}</h4>
              <ul style="list-style:none; padding:0; font-size:10.5px; color:#475569; line-height:1.6; margin:0;">
                  <li contenteditable="true">• ${phone}</li>
                  <li contenteditable="true">• ${email}</li>
                  <li contenteditable="true">• ${address}</li>
              </ul>
          </div>
          <div style="border-left:1px solid #e2e8f0; padding-left:12px;">
              <h4 style="font-size:11.5px; font-weight:800; color:#1e293b; text-transform:uppercase; margin-bottom:6px;">${L.educationUpper}</h4>
              <ul style="list-style:none; padding:0; font-size:10.5px; color:#475569; line-height:1.6; margin:0;">
                  ${education.map(edu => `<li contenteditable="true">• ${edu.school} (${edu.time})</li>`).join('')}
              </ul>
          </div>
          <div style="border-left:1px solid #e2e8f0; padding-left:12px;">
              <h4 style="font-size:11.5px; font-weight:800; color:#1e293b; text-transform:uppercase; margin-bottom:6px;">${L.technicalSkillsUpper}</h4>
              <ul style="list-style:none; padding:0; font-size:10.5px; color:#475569; line-height:1.6; margin:0;">
                  ${skills.slice(0, 4).map(sk => `<li contenteditable="true">• ${sk}</li>`).join('')}
              </ul>
          </div>
      </div>

      <div>
          <h3 style="font-size:13.5px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:1.5px solid ${color}; padding-bottom:3px; margin-bottom:14px;">${L.workExperienceUpper}</h3>
          ${experience.map(exp => `
          <div style="display:flex; gap:16px; margin-bottom:15px;">
              <div style="width:130px; font-size:11px; font-weight:700; color:#64748b; flex-shrink:0;">
                  <div style="color:${color};">● ${exp.time}</div>
                  <div style="color:#1e293b; margin-top:2px;">${exp.company}</div>
              </div>
              <div style="flex:1; border-left:2px solid ${color}; padding-left:14px;">
                  <div style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.role}</div>
                  <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.45; margin-top:4px;">
                      ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                  </ul>
              </div>
          </div>
          `).join('')}
      </div>
    `;
  }
  // Layout 6: Sidebar Than Chì & Cam Hổ Phách (ambitious)
  else if (layout === "sidebar_charcoal_amber_timeline") {
    bodyContent = `
      <div style="display:flex; width:100%; height:296mm; min-height:296mm; max-height:296mm; margin:0; box-sizing:border-box; overflow:hidden;">
          <!-- CỘT TRÁI (THAN CHÌ) -->
          <div style="width:35%; height:100%; min-height:296mm; background:#242c35 !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color:#ffffff; padding:25px 16px; box-sizing:border-box;">
              <div style="margin-bottom:18px;">
                  <div style="width:105px; height:120px; border-radius:8px; overflow:hidden; margin:0 auto 10px auto; border:2px solid ${color};">
                      <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/ambitious.jpg';" />
                  </div>
                  <h1 style="font-size:18px; font-weight:800; color:${color}; text-align:center; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:11px; color:#ffffff; text-align:center; font-weight:600; margin-top:2px;" contenteditable="true">${role}</div>
              </div>

              <div style="font-size:11px; color:#d1d5db; line-height:1.6; margin-bottom:16px;">
                  <div style="color:${color}; font-weight:700; margin-bottom:4px;">${L.personalInfoUpper}</div>
                  <div>📞 ${phone}</div>
                  <div>✉️ ${email}</div>
                  <div>📍 ${address}</div>
              </div>

              <div style="margin-bottom:16px;">
                  <div style="color:${color}; font-weight:700; font-size:11.5px; margin-bottom:6px;">${L.skillsUpper}</div>
                  <ul style="padding-left:14px; font-size:11px; color:#e5e7eb; line-height:1.5; margin:0;">
                      ${skills.map(sk => `<li contenteditable="true">${sk}</li>`).join('')}
                  </ul>
              </div>
          </div>

          <!-- CỘT PHẢI (TIMELINE CAM) -->
          <div style="flex:1; height:100%; min-height:296mm; background:#ffffff; padding:25px 22px; box-sizing:border-box; overflow:hidden;">
              <div style="margin-bottom:18px;">
                  <h3 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.careerObjectiveUpper}</h3>
                  <p style="font-size:11.5px; color:#334155; line-height:1.5; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
              </div>

              <div style="margin-bottom:18px;">
                  <h3 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:10px;">${L.workExperienceUpper}</h3>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.role}</span>
                          <span style="font-size:11px; color:#64748b; font-weight:600;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; color:${color}; font-weight:600; margin-bottom:4px;" contenteditable="true">${exp.company}</div>
                      <ul style="padding-left:16px; font-size:11px; color:#334155; line-height:1.45; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>

              <div>
                  <h3 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.educationUpper}</h3>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</span>
                          <span style="font-size:11px; color:#64748b;" contenteditable="true">${edu.time}</span>
                      </div>
                      <div style="font-size:11px; color:#475569;" contenteditable="true">${edu.degree} • ${edu.highlight}</div>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
    `;
  }
  // Layout 7: 2 Cột Tối Giản Viền Xanh Navy Nét Đứt (minimalism_v2)
  else if (layout === "minimalist_dashed_navy") {
    bodyContent = `
      <div style="border-bottom:3px solid ${color}; padding-bottom:14px; margin-bottom:18px;">
          <div style="display:flex; align-items:center; gap:18px;">
              <div style="width:90px; height:105px; border-radius:6px; overflow:hidden; background:#f1f5f9; flex-shrink:0; border:1px solid #e2e8f0;">
                  <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/minimalism_v2.jpg';" />
              </div>
              <div>
                  <h1 style="font-size:23px; font-weight:800; color:#1e293b; text-transform:uppercase; letter-spacing:1px; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:13px; font-weight:700; color:${color}; margin-top:4px; text-transform:uppercase; letter-spacing:0.5px;" contenteditable="true">${role}</div>
                  <div style="font-size:11px; color:#64748b; margin-top:8px; display:flex; flex-wrap:wrap; gap:14px;">
                      <span>📞 ${phone}</span>
                      <span>✉️ ${email}</span>
                      <span>📍 ${address}</span>
                  </div>
              </div>
          </div>
      </div>

      <div style="display:flex; gap:20px;">
          <div style="flex:2;">
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:1px; border-bottom:1.5px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.workExperienceUpper}</h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:12px; padding-left:10px; border-left:2px solid #e2e8f0;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${exp.company}</span>
                          <span style="font-size:10.5px; color:#64748b;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; font-weight:600; color:${color}; margin-bottom:4px;" contenteditable="true">${exp.role}</div>
                      <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.45; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
          </div>
          <div style="flex:1; border-left:1.5px solid #e2e8f0; padding-left:16px;">
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:1px; border-bottom:1.5px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.careerObjectiveUpper}</h2>
                  <p style="font-size:11px; color:#334155; line-height:1.5; margin:0;" contenteditable="true">${summary}</p>
              </div>
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:1px; border-bottom:1.5px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.educationUpper}</h2>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="font-size:11.5px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</div>
                      <div style="font-size:11px; color:${color}; font-weight:600;" contenteditable="true">${edu.degree}</div>
                      <div style="font-size:10.5px; color:#64748b;" contenteditable="true">${edu.time} • ${edu.highlight}</div>
                  </div>
                  `).join('')}
              </div>
              <div>
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; letter-spacing:1px; border-bottom:1.5px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.skillsUpper}</h2>
                  <ul style="list-style:none; padding:0; font-size:11px; color:#334155; line-height:1.7; margin:0;">
                      ${skills.map(sk => `<li contenteditable="true">→ ${sk}</li>`).join('')}
                  </ul>
              </div>
          </div>
      </div>
    `;
  }
  // Layout 8: Sidebar Coffee Brown (pro_1_v2)
  else if (layout === "sidebar_coffee_brown") {
    bodyContent = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2.5px solid ${color}; padding-bottom:10px; margin-bottom:16px;">
          <h1 style="font-size:24px; font-weight:800; color:#2c1e14; text-transform:none; margin:0;" contenteditable="true">${candidate}</h1>
          <div style="background:${color}; color:#ffffff; font-size:12px; font-weight:700; padding:6px 16px; border-radius:4px; text-transform:uppercase;" contenteditable="true">${role}</div>
      </div>

      <div style="display:flex; gap:20px;">
          <div style="width:34%; flex-shrink:0;">
              <div style="width:100%; height:200px; border-radius:4px; overflow:hidden; background:#d4b8a5; margin-bottom:12px; border:1px solid #d4b8a5;">
                  <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/pro_1_v2.jpg';" />
              </div>
              
              <div style="background:${color}; color:#ffffff; padding:16px 14px; border-radius:4px;">
                  <div style="font-size:10.5px; line-height:1.8; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.25); padding-bottom:10px;">
                      <div style="color:#d4b8a5; font-size:9.5px; font-weight:700;">${L.phone}</div>
                      <div contenteditable="true">${phone}</div>
                      <div style="color:#d4b8a5; font-size:9.5px; font-weight:700; margin-top:4px;">Email</div>
                      <div contenteditable="true">${email}</div>
                      <div style="color:#d4b8a5; font-size:9.5px; font-weight:700; margin-top:4px;">${L.address}</div>
                      <div contenteditable="true">${address}</div>
                  </div>

                  <div style="margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.25); padding-bottom:10px;">
                      <div style="font-size:11px; font-weight:800; text-transform:uppercase; margin-bottom:6px; color:#f5ebe0;">${L.educationUpper}</div>
                      ${education.map(edu => `
                      <div style="margin-bottom:6px;">
                          <div style="font-size:10.5px; font-weight:700;" contenteditable="true">${edu.school}</div>
                          <div style="font-size:10px; color:#e0c9b0;" contenteditable="true">${edu.degree}</div>
                          <div style="font-size:9.5px; color:#c9a882;" contenteditable="true">${edu.time}</div>
                      </div>
                      `).join('')}
                  </div>

                  <div>
                      <div style="font-size:11px; font-weight:800; text-transform:uppercase; margin-bottom:8px; color:#f5ebe0;">${L.skills}</div>
                      <div style="display:flex; flex-wrap:wrap; gap:5px;">
                      ${skills.slice(0, 6).map(sk => `
                      <span style="display:inline-block; padding:3px 9px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:16px; font-size:10px; color:#f5ebe0; margin-bottom:3px;">${sk}</span>
                      `).join('')}
                      </div>
                  </div>
              </div>
          </div>

          <div style="flex:1;">
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:8px;">${L.careerObjectiveUpper}</h2>
                  <p style="font-size:11.5px; color:#334155; line-height:1.55; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
              </div>

              <div style="margin-bottom:16px;">
                  <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:10px;">${L.workExperienceUpper}</h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:800; color:#1e293b;" contenteditable="true">${exp.company}</span>
                          <span style="font-size:10.5px; color:#64748b; font-style:italic;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; font-weight:700; color:${color}; margin-bottom:5px;" contenteditable="true">${exp.role}</div>
                      <ul style="padding-left:16px; font-size:11px; color:#334155; line-height:1.5; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
    `;
  }
  // Layout 10: Harvard Pure Text ATS (senior_v2 - KHÔNG ẢNH)
  else if (layout === "harvard" || layout === "harvard_classic_text_only") {
    bodyContent = `
      <div style="font-family:'Times New Roman', Times, serif; color:#000000; padding:10px 5px;">
          <div style="text-align:center; border-bottom:1.5px solid #000000; padding-bottom:10px; margin-bottom:16px;">
              <h1 style="font-size:24px; font-weight:bold; letter-spacing:1px; margin:0;" contenteditable="true">${candidate.toUpperCase()}</h1>
              <div style="font-size:12px; margin-top:4px;">
                  <span>${address}</span> | <span>${phone}</span> | <span>${email}</span>
              </div>
          </div>

          <div style="margin-bottom:16px;">
              <h2 style="font-size:13px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #000000; padding-bottom:2px; margin-bottom:6px;">${L.summaryUpper}</h2>
              <p style="font-size:11.5px; line-height:1.5; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
          </div>

          <div style="margin-bottom:16px;">
              <h2 style="font-size:13px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #000000; padding-bottom:2px; margin-bottom:8px;">${L.workExperienceUpper}</h2>
              ${experience.map(exp => `
              <div style="margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
                      <span contenteditable="true">${exp.company}</span>
                      <span contenteditable="true">${exp.time}</span>
                  </div>
                  <div style="font-style:italic; font-size:11.5px; margin-bottom:3px;" contenteditable="true">${exp.role}</div>
                  <ul style="padding-left:18px; font-size:11.5px; line-height:1.45; margin:0;">
                      ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                  </ul>
              </div>
              `).join('')}
          </div>

          <div style="margin-bottom:16px;">
              <h2 style="font-size:13px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #000000; padding-bottom:2px; margin-bottom:8px;">${L.educationUpper}</h2>
              ${education.map(edu => `
              <div style="margin-bottom:6px;">
                  <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
                      <span contenteditable="true">${edu.school}</span>
                      <span contenteditable="true">${edu.time}</span>
                  </div>
                  <div style="font-size:11.5px;" contenteditable="true">${edu.degree}</div>
                  ${edu.highlight ? `<div style="font-size:11px; font-style:italic;" contenteditable="true">${edu.highlight}</div>` : ''}
              </div>
              `).join('')}
          </div>

          <div>
              <h2 style="font-size:13px; font-weight:bold; text-transform:uppercase; border-bottom:1px solid #000000; padding-bottom:2px; margin-bottom:6px;">${L.technicalSkillsUpper}</h2>
              <p style="font-size:11px; line-height:1.5; margin:0;" contenteditable="true">${skills.join(' • ')}</p>
          </div>
      </div>
    `;
  }
  // Layout 19: Chuyên Gia Executive ATS (experts - KHÔNG ẢNH)
  else if (layout === "royal_blue_expert") {
    bodyContent = `
      <div style="border-bottom:3px solid ${color}; padding-bottom:14px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px;">
              <div>
                  <h1 style="font-size:24px; font-weight:900; color:#0f172a; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:13px; font-weight:700; color:${color}; margin-top:4px;" contenteditable="true">${role}</div>
              </div>
              <div style="text-align:right; font-size:11px; color:#475569; line-height:1.7;">
                  <div contenteditable="true">📞 ${phone}</div>
                  <div contenteditable="true">✉️ ${email}</div>
                  <div contenteditable="true">📍 ${address}</div>
              </div>
          </div>
      </div>

      <div style="margin-bottom:16px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:10px;">${L.careerObjectiveUpper}</h2>
          <p style="font-size:11.5px; color:#334155; line-height:1.6; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
      </div>

      <div style="margin-bottom:16px;">
          <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:12px;">${L.workExperienceUpper}</h2>
          ${experience.map(exp => `
          <div style="display:flex; gap:16px; margin-bottom:14px;">
              <div style="width:110px; font-size:11px; color:#64748b; flex-shrink:0; text-align:right; padding-top:2px;" contenteditable="true">${exp.time}</div>
              <div style="width:1px; background:${color}; flex-shrink:0;"></div>
              <div style="flex:1;">
                  <div style="font-size:12px; font-weight:800; color:#1e293b;" contenteditable="true">${exp.company}</div>
                  <div style="font-size:11.5px; font-weight:700; color:${color}; margin-bottom:5px;" contenteditable="true">${exp.role}</div>
                  <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.5; margin:0;">
                      ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                  </ul>
              </div>
          </div>
          `).join('')}
      </div>

      <div style="display:flex; gap:20px;">
          <div style="flex:1;">
              <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:10px;">${L.educationUpper}</h2>
              ${education.map(edu => `
              <div style="margin-bottom:8px;">
                  <div style="font-size:12px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</div>
                  <div style="font-size:11.5px; color:${color}; font-weight:600;" contenteditable="true">${edu.degree}</div>
                  <div style="font-size:11px; color:#64748b;" contenteditable="true">${edu.time} • ${edu.highlight}</div>
              </div>
              `).join('')}
          </div>
          <div style="flex:1;">
              <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:10px;">${L.skillsUpper}</h2>
              <div style="columns:2; column-gap:10px;">
                  ${skills.map(sk => `<div style="font-size:11px; color:#334155; margin-bottom:4px; break-inside:avoid;" contenteditable="true">▸ ${sk}</div>`).join('')}
              </div>
          </div>
      </div>
    `;
  }
  // Layout 20: Developer Tech Stack Matrix (dev_1)
  else if (layout === "tech_stack_matrix") {
    bodyContent = `
      <div style="width:100%; height:296mm; min-height:296mm; max-height:296mm; margin:0; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column;">
          <!-- HEADER BANNER TỐI -->
          <div style="background:#0f172a !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; padding:18px 28px 16px 28px; box-sizing:border-box;">
              <div style="display:flex; gap:18px; align-items:center;">
                  <div style="width:80px; height:80px; border-radius:50%; overflow:hidden; background:#1e293b; flex-shrink:0; border:2px solid ${color};">
                      <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/dev_1.jpg';" />
                  </div>
                  <div style="flex:1;">
                      <h1 style="font-size:20px; font-weight:900; color:#f1f5f9; margin:0; font-family:monospace;" contenteditable="true">${candidate}</h1>
                      <div style="font-size:12px; color:${color}; font-weight:700; margin-top:4px; font-family:monospace;" contenteditable="true">$ ${role}</div>
                  </div>
                  <div style="text-align:right; font-size:10px; color:#94a3b8; font-family:monospace;">
                      <div contenteditable="true">📞 ${phone}</div>
                      <div contenteditable="true">✉️ ${email}</div>
                      <div contenteditable="true">📍 ${address}</div>
                  </div>
              </div>
          </div>

      <div style="flex:1; padding:16px 24px; box-sizing:border-box; overflow:hidden;">
          <div style="margin-bottom:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 16px;">
              <div style="font-size:10px; color:#94a3b8; font-family:monospace; margin-bottom:4px;">// ${L.careerObjectiveUpper}</div>
              <p style="font-size:11.5px; color:#334155; line-height:1.55; margin:0;" contenteditable="true">${summary}</p>
          </div>

          <div style="display:flex; gap:20px; margin-bottom:14px;">
              <div style="flex:3;">
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:12px;">// ${L.workExperience.toUpperCase()}</h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:800; color:#1e293b;" contenteditable="true">${exp.company}</span>
                          <span style="font-size:10px; color:#64748b; font-family:monospace;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11px; font-weight:700; color:${color}; margin-bottom:4px; font-family:monospace;" contenteditable="true">// ${exp.role}</div>
                      <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.5; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
              <div style="flex:2;">
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin-bottom:12px;">// ${L.techAndToolsUpper}</h2>
                  <div style="display:flex; flex-direction:column; gap:5px;">
                      ${skills.map(sk => `<div style="font-size:10.5px; color:#334155; font-family:monospace; padding:3px 8px; background:#f1f5f9; border-left:3px solid ${color}; border-radius:0 4px 4px 0;" contenteditable="true">${sk}</div>`).join('')}
                  </div>
                  <h2 style="font-size:12px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:3px; margin:14px 0 10px 0;">// ${L.education.toUpperCase()}</h2>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="font-size:11px; font-weight:700; color:#1e293b;" contenteditable="true">${edu.school}</div>
                      <div style="font-size:10.5px; color:${color}; font-family:monospace;" contenteditable="true">${edu.degree}</div>
                      <div style="font-size:10px; color:#64748b;" contenteditable="true">${edu.time} • ${edu.highlight}</div>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
      </div>
    `;
  }
  // Các layout 2 Cột Sidebar khác (11 clarity, 12 plum wine, 14 corporate grey, 16 teal sidebar, 17 ocean, 18 cyan)
  else {
    const isDarkSidebar = ["sidebar_plum_wine", "teal_sidebar_hr", "modern_clarity_tags", "corporate_silver_grey"].includes(layout);
    const sbBg = layout === "sidebar_plum_wine" ? "#7A415A" 
               : layout === "teal_sidebar_hr" ? "#2C6E6B"
               : layout === "corporate_silver_grey" ? "#4A5568"
               : layout === "modern_clarity_tags" ? "#1A1A2E"
               : layout === "student_youth_ocean" ? "#EFF6FF"
               : color;
    const isLightSidebar = layout === "student_youth_ocean";
    const sbTextColor = isLightSidebar ? "#1e3a8a" : "#ffffff";
    const sbAccentColor = isLightSidebar ? color : (layout === "modern_clarity_tags" ? color : "#d4e6f1");

    bodyContent = `
      <div style="display:flex; width:100%; height:296mm; min-height:296mm; max-height:296mm; margin:0; box-sizing:border-box; overflow:hidden;">
          <!-- SIDEBAR -->
          <div style="width:34%; height:100%; min-height:296mm; background:${sbBg} !important; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color:${sbTextColor}; padding:24px 18px; display:flex; flex-direction:column; gap:0; flex-shrink:0; box-sizing:border-box;">
              <div style="text-align:center; margin-bottom:18px;">
                  <div style="width:95px; height:95px; border-radius:50%; overflow:hidden; background:rgba(255,255,255,0.2); margin:0 auto 12px auto; border:3px solid ${sbAccentColor};">
                      <img src="${candidateAvatar || ('/images/avatars/' + slug + '.jpg')}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/images/avatars/default_v2.jpg';" />
                  </div>
                  <h1 style="font-size:16px; font-weight:800; color:${sbTextColor}; text-transform:uppercase; line-height:1.3; margin:0;" contenteditable="true">${candidate}</h1>
                  <div style="font-size:11px; color:${sbAccentColor}; margin-top:5px;" contenteditable="true">${role}</div>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.2); padding-top:12px; margin-bottom:12px;">
                  <h3 style="font-size:10.5px; font-weight:800; color:${sbAccentColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">${L.contactUpper}</h3>
                  <div style="font-size:10px; color:${sbTextColor}; line-height:1.8;">
                      <div contenteditable="true">📞 ${phone}</div>
                      <div contenteditable="true">✉️ ${email}</div>
                      <div contenteditable="true">📍 ${address}</div>
                  </div>
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.2); padding-top:12px; margin-bottom:12px;">
                  <h3 style="font-size:10.5px; font-weight:800; color:${sbAccentColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">${L.educationUpper}</h3>
                  ${education.map(edu => `
                  <div style="margin-bottom:8px;">
                      <div style="font-size:10.5px; font-weight:700; color:${sbTextColor};" contenteditable="true">${edu.school}</div>
                      <div style="font-size:10px; color:${sbAccentColor};" contenteditable="true">${edu.degree}</div>
                      <div style="font-size:9.5px; opacity:0.85;" contenteditable="true">${edu.time}</div>
                  </div>
                  `).join('')}
              </div>

              <div style="border-top:1px solid rgba(255,255,255,0.2); padding-top:12px;">
                  <h3 style="font-size:10.5px; font-weight:800; color:${sbAccentColor}; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">${L.skillsUpper}</h3>
                  ${skills.map(sk => `<div style="font-size:10px; color:${sbTextColor}; margin-bottom:4px;" contenteditable="true">▸ ${sk}</div>`).join('')}
              </div>
          </div>

          <!-- NỘI DUNG CHÍNH -->
          <div style="flex:1; height:100%; padding:24px 22px; box-sizing:border-box; overflow:hidden;">
              <div style="margin-bottom:16px;">
                  <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:10px;">${L.careerObjectiveUpper}</h2>
                  <p style="font-size:11.5px; color:#334155; line-height:1.55; text-align:justify; margin:0;" contenteditable="true">${summary}</p>
              </div>

              <div>
                  <h2 style="font-size:13px; font-weight:800; color:${color}; text-transform:uppercase; border-bottom:2px solid ${color}; padding-bottom:4px; margin-bottom:12px;">${L.workExperienceUpper}</h2>
                  ${experience.map(exp => `
                  <div style="margin-bottom:14px;">
                      <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span style="font-size:12px; font-weight:800; color:#1e293b;" contenteditable="true">${exp.company}</span>
                          <span style="font-size:10.5px; color:#64748b;" contenteditable="true">${exp.time}</span>
                      </div>
                      <div style="font-size:11.5px; font-weight:700; color:${color}; margin-bottom:5px;" contenteditable="true">${exp.role}</div>
                      <ul style="padding-left:14px; font-size:11px; color:#334155; line-height:1.5; margin:0;">
                          ${exp.bullets.map(b => `<li contenteditable="true">${b}</li>`).join('')}
                      </ul>
                  </div>
                  `).join('')}
              </div>
          </div>
      </div>
    `;
  }

  // Nếu là layout toàn trang (không có sidebar full bleed), bọc padding đều các cạnh A4
  const isEdgeToEdge = [
    "sidebar_dark_burgundy",
    "sidebar_moss_green_progress_bars",
    "sidebar_charcoal_amber_timeline",
    "tech_stack_matrix"
  ].includes(layout) || (
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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="/js/html2pdf.bundle.min.js"></script>
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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
            html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                overflow: hidden !important;
            }
            .no-print, .cv-toolbar {
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
    
    <div class="cv-page-container" id="cv-content">
        ${bodyContent}
    </div>

    <script>
        function downloadAsPdf() {
            const element = document.getElementById('cv-content');
            const opt = {
                margin: 0,
                filename: '${candidate.replace(/\\s+/g, '_')}_CV_ATS.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (window.html2pdf) {
                window.html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf) {
                    var totalPages = pdf.internal.getNumberOfPages();
                    for (var i = totalPages; i > 1; i--) {
                        pdf.deletePage(i);
                    }
                }).save();
            } else {
                window.print();
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
  buildCvTemplateHtml
};
