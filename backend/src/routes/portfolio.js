// [Route: portfolio.js] v2 — Bảo mật nâng cao
// ✅ avatarUrl XSS fix: dùng sanitizeUrl()
// ✅ unpublish path traversal fix: validate username regex
// ✅ fs.writeFile async thay vì sync
// ✅ Error messages không leak internal info
const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const PORTFOLIOS_DIR = process.env.PORTFOLIOS_DIR ||
  (fs.existsSync('/app/portfolios') ? '/app/portfolios' : path.resolve(__dirname, '../../../frontend/public/portfolios'));

if (!fs.existsSync(PORTFOLIOS_DIR)) {
  fs.mkdirSync(PORTFOLIOS_DIR, { recursive: true });
}

const RESERVED_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'auth', 'mail', 'support', 'billing', 'dev', 'cdn',
  'root', 'dashboard', 'connectcv', 'www', 'test', 'staging', 'static', 'system',
  'null', 'undefined', 'portal', 'proxy', 'login', 'register', 'status', 'assets'
]);

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ✅ FIX: sanitizeUrl được dùng cho cả avatarUrl (trước đây bị bỏ sót → Stored XSS)
function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed.replace(/"/g, '%22').replace(/'/g, '%27').replace(/</g, '%3C').replace(/>/g, '%3E');
  }
  return '#';
}

function validateUsername(username) {
  return username && USERNAME_REGEX.test(username);
}

function generatePortfolioHtml(data) {
  const {
    username,
    fullName = 'Ứng viên Tài Năng',
    title = 'Software Engineer & AI Enthusiast',
    bio = 'Đam mê phát triển sản phẩm công nghệ chất lượng cao.',
    avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    atsScore = 95,
    location = 'Cần Thơ, Việt Nam',
    email = 'contact@connectcv.io.vn',
    phone = '0901 234 567',
    github = 'https://github.com',
    linkedin = 'https://linkedin.com',
    facebook = '',
    website = '',
    projects = [],
    experience = [],
    skills = [],
    education = []
  } = data;

  const safeName      = sanitizeText(fullName);
  const safeTitle     = sanitizeText(title);
  const safeBio       = sanitizeText(bio);
  const safeLocation  = sanitizeText(location);
  const safeEmail     = sanitizeText(email);
  const safePhone     = sanitizeText(phone);
  const safeScore     = parseInt(atsScore, 10) || 90;
  // ✅ FIX: avatarUrl qua sanitizeUrl() — chặn javascript: data: XSS vectors
  const safeAvatarUrl = sanitizeUrl(avatarUrl) || 'https://ui-avatars.com/api/?name=User&size=300&background=4f46e5&color=fff';

  return `<!DOCTYPE html>
<html lang="vi" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} | ${safeTitle} - Portfolio</title>
  <meta name="title" content="${safeName} - ${safeTitle} | Portfolio">
  <meta name="description" content="${safeBio.substring(0, 160)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://${sanitizeText(username)}.connectcv.io.vn">
  <meta property="og:title" content="${safeName} - ${safeTitle} | Portfolio">
  <meta property="og:description" content="${safeBio.substring(0, 160)}">
  <meta property="og:image" content="${safeAvatarUrl}">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:title" content="${safeName} - ${safeTitle}">
  <meta property="twitter:description" content="${safeBio.substring(0, 160)}">
  <meta property="twitter:image" content="${safeAvatarUrl}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: { extend: { fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] }, colors: { brand: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' } } } }
    }
  </script>
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass-card { background: rgba(30,41,59,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
    .glass-card-hover:hover { border-color: rgba(99,102,241,0.4); transform: translateY(-2px); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
  </style>
</head>
<body class="bg-[#0b0f19] text-slate-100 min-h-screen">
  <div class="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>
  <div class="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10"></div>

  <header class="sticky top-0 z-50 bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-800/80">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <a href="#hero" class="flex items-center space-x-2.5 font-bold text-lg text-white">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-md"><i class="fa-solid fa-code"></i></span>
        <span class="tracking-tight">${safeName}</span>
      </a>
      <nav class="hidden md:flex items-center space-x-6 text-sm text-slate-300 font-medium">
        <a href="#about" class="hover:text-indigo-400 transition">Giới Thiệu</a>
        <a href="#projects" class="hover:text-indigo-400 transition">Dự Án</a>
        <a href="#experience" class="hover:text-indigo-400 transition">Kinh Nghiệm</a>
        <a href="#skills" class="hover:text-indigo-400 transition">Kỹ Năng</a>
        <a href="#contact" class="hover:text-indigo-400 transition">Liên Hệ</a>
      </nav>
      <a href="#contact" class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/20 flex items-center">
        <i class="fa-solid fa-paper-plane mr-1.5"></i> Kết Nối
      </a>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16">
    <section id="hero" class="pt-6 pb-4">
      <div class="glass-card p-8 sm:p-12 rounded-3xl relative overflow-hidden">
        <div class="flex flex-col-reverse md:flex-row items-center justify-between gap-8">
          <div class="space-y-4 max-w-2xl text-center md:text-left">
            <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sẵn sàng đón nhận cơ hội việc làm mới</span>
            </div>
            <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Xin chào, tôi là <span class="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">${safeName}</span>
            </h1>
            <p class="text-lg text-indigo-200/90 font-medium">${safeTitle}</p>
            <p class="text-sm text-slate-400 leading-relaxed max-w-xl">${safeBio}</p>
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <span class="text-xs text-slate-400 flex items-center bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <i class="fa-solid fa-location-dot text-indigo-400 mr-1.5"></i> ${safeLocation}
              </span>
              <span class="text-xs text-emerald-400 flex items-center bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                <i class="fa-solid fa-certificate mr-1.5"></i> ConnectCV ATS Score: <b class="ml-1 font-bold">${safeScore}/100</b>
              </span>
            </div>
            <div class="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <a href="#projects" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30 flex items-center">
                <i class="fa-solid fa-diagram-project mr-2"></i> Xem Dự Án Nổi Bật
              </a>
              <a href="mailto:${safeEmail}" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center">
                <i class="fa-solid fa-envelope mr-2"></i> Gửi Email Phỏng Vấn
              </a>
            </div>
          </div>
          <div class="relative flex-shrink-0">
            <div class="w-40 h-40 sm:w-52 sm:h-52 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
              <img src="${safeAvatarUrl}" alt="${safeName}" class="w-full h-full object-cover rounded-full bg-slate-800"
                   onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&size=300&background=4f46e5&color=fff'">
            </div>
            <div class="absolute -bottom-2 right-4 px-3 py-1 bg-slate-900/90 border border-indigo-500/40 rounded-full text-[11px] font-mono text-indigo-300 shadow-lg flex items-center">
              <i class="fa-solid fa-globe mr-1.5 text-indigo-400"></i> ${sanitizeText(username)}.connectcv.io.vn
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="about" class="space-y-6">
      <h2 class="text-xl sm:text-2xl font-bold text-white flex items-center">
        <i class="fa-solid fa-user-astronaut text-indigo-500 mr-2.5"></i> Về Bản Thân & Năng Lực
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-card glass-card-hover p-6 rounded-2xl md:col-span-2 space-y-3">
          <h3 class="text-sm font-bold text-indigo-300 uppercase tracking-wider">Định vị nghề nghiệp</h3>
          <p class="text-sm text-slate-300 leading-relaxed">${safeBio}</p>
          <div class="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div><span class="text-slate-400 block text-[11px]">Email liên hệ:</span><span class="font-medium text-slate-200">${safeEmail}</span></div>
            <div><span class="text-slate-400 block text-[11px]">Số điện thoại:</span><span class="font-medium text-slate-200">${safePhone}</span></div>
            <div><span class="text-slate-400 block text-[11px]">Khu vực làm việc:</span><span class="font-medium text-slate-200">${safeLocation}</span></div>
          </div>
        </div>
        <div class="glass-card glass-card-hover p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h3 class="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">Chứng thực ConnectCV</h3>
            <div class="flex items-center space-x-3">
              <div class="text-4xl font-extrabold text-emerald-400">${safeScore}<span class="text-lg text-slate-400">/100</span></div>
              <div class="text-xs text-slate-300"><span class="font-bold text-white block">ATS Compatibility</span><span class="text-emerald-400 text-[11px]">Đã qua thẩm định tiêu chuẩn</span></div>
            </div>
          </div>
          <div class="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <i class="fa-solid fa-shield-halved text-indigo-400 mr-1.5"></i> Hồ sơ tối ưu từ khóa khớp chuẩn JD doanh nghiệp.
          </div>
        </div>
      </div>
    </section>

    <section id="projects" class="space-y-6">
      <h2 class="text-xl sm:text-2xl font-bold text-white flex items-center">
        <i class="fa-solid fa-rocket text-indigo-500 mr-2.5"></i> Dự Án Tiêu Biểu (${projects.length})
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${projects.length === 0 ? `
          <div class="glass-card p-8 rounded-2xl text-center text-slate-400 col-span-2 text-sm italic">Chưa có dự án nào được cập nhật.</div>
        ` : projects.map((p, idx) => `
          <div class="glass-card glass-card-hover p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-white">${sanitizeText(p.name || `Dự án #${idx+1}`)}</h3>
                <span class="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">Project #${idx+1}</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">${sanitizeText(p.description || '')}</p>
              ${p.tags && p.tags.length > 0 ? `
                <div class="flex flex-wrap gap-1.5 pt-2">
                  ${p.tags.map(t => `<span class="px-2 py-0.5 bg-slate-800 text-indigo-300 text-[11px] font-medium rounded-md border border-slate-700/60">${sanitizeText(t)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
            <div class="pt-3 border-t border-slate-800/80 flex items-center space-x-3 text-xs">
              ${p.demoUrl ? `<a href="${sanitizeUrl(p.demoUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 font-bold flex items-center"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i> Demo</a>` : ''}
              ${p.repoUrl ? `<a href="${sanitizeUrl(p.repoUrl)}" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white font-medium flex items-center"><i class="fa-brands fa-github mr-1"></i> Mã Nguồn</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section id="experience" class="space-y-6">
      <h2 class="text-xl sm:text-2xl font-bold text-white flex items-center">
        <i class="fa-solid fa-briefcase text-indigo-500 mr-2.5"></i> Kinh Nghiệm & Học Vấn
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="glass-card p-6 rounded-2xl space-y-4">
          <h3 class="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center"><i class="fa-solid fa-laptop-code mr-2"></i> Lộ Trình Công Việc</h3>
          <div class="space-y-4">
            ${experience.length === 0 ? '<p class="text-xs text-slate-400 italic">Chưa có kinh nghiệm.</p>' : experience.map(exp => `
              <div class="border-l-2 border-indigo-500/60 pl-3.5 space-y-1">
                <div class="text-xs font-bold text-white">${sanitizeText(exp.role)}</div>
                <div class="text-[11px] text-indigo-300">${sanitizeText(exp.organization)} • <span class="text-slate-400 font-normal">${sanitizeText(exp.duration)}</span></div>
                <p class="text-xs text-slate-300 leading-relaxed pt-1">${sanitizeText(exp.description || '')}</p>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="glass-card p-6 rounded-2xl space-y-4">
          <h3 class="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center"><i class="fa-solid fa-graduation-cap mr-2"></i> Quá Trình Đào Tạo</h3>
          <div class="space-y-4">
            ${education.length === 0 ? `
              <div class="border-l-2 border-purple-500/60 pl-3.5 space-y-1">
                <div class="text-xs font-bold text-white">Đại học FPT Phân hiệu Cần Thơ</div>
                <div class="text-[11px] text-purple-300">Kỹ thuật Phần mềm • <span class="text-slate-400">2022 - 2026</span></div>
              </div>
            ` : education.map(edu => `
              <div class="border-l-2 border-purple-500/60 pl-3.5 space-y-1">
                <div class="text-xs font-bold text-white">${sanitizeText(edu.school)}</div>
                <div class="text-[11px] text-purple-300">${sanitizeText(edu.major)} • <span class="text-slate-400">${sanitizeText(edu.year || '')}</span></div>
                ${edu.gpa ? `<div class="text-[11px] text-slate-400">GPA: <span class="text-emerald-400 font-bold">${sanitizeText(edu.gpa)}</span></div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>

    <section id="skills" class="space-y-6">
      <h2 class="text-xl sm:text-2xl font-bold text-white flex items-center">
        <i class="fa-solid fa-layer-group text-indigo-500 mr-2.5"></i> Kỹ Năng & Công Nghệ
      </h2>
      <div class="glass-card p-6 rounded-2xl">
        <div class="flex flex-wrap gap-2">
          ${(skills.length === 0 ? ['JavaScript', 'Node.js', 'Express', 'React', 'Docker', 'MongoDB', 'PostgreSQL', 'Git', 'RESTful API', 'Gemini AI', 'Tailwind CSS'] : skills).map(s => `
            <span class="px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-300 border border-slate-700/80 rounded-xl text-xs font-medium transition flex items-center space-x-1.5">
              <i class="fa-solid fa-check text-indigo-400 text-[10px]"></i>
              <span>${sanitizeText(s)}</span>
            </span>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="contact" class="space-y-6 pb-8">
      <div class="glass-card p-8 sm:p-10 rounded-3xl text-center space-y-6">
        <div class="max-w-xl mx-auto space-y-2">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white">Hãy Cùng Nhau Hợp Tác!</h2>
          <p class="text-xs sm:text-sm text-slate-400">Tôi luôn chào đón các cơ hội việc làm, dự án freelance hoặc lời mời hợp tác công nghệ.</p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a href="mailto:${safeEmail}" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center">
            <i class="fa-solid fa-envelope mr-2"></i> ${safeEmail}
          </a>
          <a href="tel:${safePhone}" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center">
            <i class="fa-solid fa-phone mr-2"></i> ${safePhone}
          </a>
        </div>
        <div class="pt-4 flex items-center justify-center space-x-4 text-lg text-slate-400">
          ${github  ? `<a href="${sanitizeUrl(github)}"   target="_blank" rel="noopener noreferrer" class="hover:text-white transition"        title="GitHub"><i class="fa-brands fa-github"></i></a>` : ''}
          ${linkedin? `<a href="${sanitizeUrl(linkedin)}" target="_blank" rel="noopener noreferrer" class="hover:text-indigo-400 transition"    title="LinkedIn"><i class="fa-brands fa-linkedin"></i></a>` : ''}
          ${facebook? `<a href="${sanitizeUrl(facebook)}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition"      title="Facebook"><i class="fa-brands fa-facebook"></i></a>` : ''}
          ${website ? `<a href="${sanitizeUrl(website)}"  target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400 transition"   title="Website"><i class="fa-solid fa-globe"></i></a>` : ''}
        </div>
      </div>
    </section>
  </main>

  <footer class="border-t border-slate-800/80 py-8 bg-[#070a12] text-center text-xs text-slate-500">
    <div class="max-w-6xl mx-auto px-4 space-y-2">
      <p>&copy; ${new Date().getFullYear()} <b>${safeName}</b>. All rights reserved.</p>
      <p class="text-[11px] text-slate-600">Portfolio tạo bởi <span class="text-indigo-400 font-semibold">ConnectCV AI Copilot</span></p>
    </div>
  </footer>
</body>
</html>`;
}

// ── GET /:username — Lấy thông tin Portfolio
router.get('/:username', (req, res) => {
  try {
    const rawUsername = String(req.params.username || '').toLowerCase().trim();
    if (!validateUsername(rawUsername)) {
      return res.status(400).json({ success: false, message: 'Username không hợp lệ (3-30 ký tự chữ và số)' });
    }
    const userDir  = path.join(PORTFOLIOS_DIR, rawUsername);
    const jsonPath = path.join(userDir, 'portfolio.json');
    if (fs.existsSync(jsonPath)) {
      const data        = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const isPublished = fs.existsSync(path.join(userDir, 'index.html'));
      return res.json({ success: true, isPublished, data });
    }
    return res.json({ success: true, isPublished: false, data: null });
  } catch (error) {
    console.error('[Portfolio GET]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi đọc thông tin portfolio' });
  }
});

// ── POST /publish — Xuất bản Portfolio (async fs)
router.post('/publish', async (req, res) => {
  try {
    const { username, portfolioData } = req.body;
    const cleanUsername = String(username || '').toLowerCase().trim();

    if (!validateUsername(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username không hợp lệ! Chỉ dùng chữ thường, số, dấu gạch nối (-), từ 3 đến 30 ký tự.' });
    }
    if (RESERVED_SUBDOMAINS.has(cleanUsername)) {
      return res.status(403).json({ success: false, message: `Subdomain '${cleanUsername}' đã được hệ thống đặt trước. Vui lòng chọn tên khác.` });
    }
    if (!portfolioData || typeof portfolioData !== 'object') {
      return res.status(400).json({ success: false, message: 'Dữ liệu portfolio không hợp lệ!' });
    }

    portfolioData.username = cleanUsername;

    const userDir  = path.join(PORTFOLIOS_DIR, cleanUsername);
    const htmlPath = path.join(userDir, 'index.html');
    const jsonPath = path.join(userDir, 'portfolio.json');

    await fsPromises.mkdir(userDir, { recursive: true });

    const htmlContent = generatePortfolioHtml(portfolioData);
    // ✅ FIX: Dùng async writeFile thay vì writeFileSync — không block event loop
    await Promise.all([
      fsPromises.writeFile(htmlPath, htmlContent, 'utf8'),
      fsPromises.writeFile(jsonPath, JSON.stringify(portfolioData, null, 2), 'utf8')
    ]);

    const fileStats = await fsPromises.stat(htmlPath);
    return res.json({
      success: true,
      message: '🎉 Xuất bản Portfolio tĩnh thành công!',
      data: {
        username: cleanUsername,
        subdomainUrl: `http://${cleanUsername}.connectcv.io.vn:3000`,
        subdomainLocalUrl: `http://${cleanUsername}.localhost:3000`,
        pathUrl: `/portfolios/${cleanUsername}/index.html`,
        fileSizeBytes: fileStats.size,
        publishedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Portfolio PUBLISH]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi xuất bản portfolio. Vui lòng thử lại.' });
  }
});

// ── POST /unpublish — Hủy xuất bản
router.post('/unpublish', async (req, res) => {
  try {
    const { username } = req.body;
    const cleanUsername = String(username || '').toLowerCase().trim();

    // ✅ FIX: Validate username TRƯỚC khi dùng làm đường dẫn — chặn path traversal
    if (!validateUsername(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username không hợp lệ' });
    }

    const userDir  = path.join(PORTFOLIOS_DIR, cleanUsername);
    const htmlPath = path.join(userDir, 'index.html');

    // Double-check path không thoát ra ngoài PORTFOLIOS_DIR (defense in depth)
    if (!htmlPath.startsWith(PORTFOLIOS_DIR)) {
      return res.status(400).json({ success: false, message: 'Đường dẫn không hợp lệ' });
    }

    if (fs.existsSync(htmlPath)) {
      await fsPromises.unlink(htmlPath);
      return res.json({ success: true, message: 'Đã hủy xuất bản trang portfolio thành công!' });
    }
    return res.json({ success: true, message: 'Trang portfolio chưa được xuất bản hoặc đã bị xóa.' });
  } catch (error) {
    console.error('[Portfolio UNPUBLISH]', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi hủy xuất bản' });
  }
});

module.exports = router;
