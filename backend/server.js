// [Server] File khởi động Express server - HARDENED SECURITY VERSION
// ✅ helmet: HTTP security headers (XSS, clickjacking, MIME sniff, ...)
// ✅ express-rate-limit: Chống DDoS & Gemini API abuse
// ✅ compression: gzip responses
// ✅ CORS: whitelist origins
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Hỗ trợ Nginx reverse proxy (giúp express-rate-limit nhận diện đúng client IP)
app.set('trust proxy', process.env.TRUSTED_PROXY_CIDRS ? process.env.TRUSTED_PROXY_CIDRS.split(',').map(x=>x.trim()) : false);

// =========================================================
// 1. SECURITY HEADERS — Helmet (chặn XSS, clickjacking, MIME sniff...)
// =========================================================
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP ở backend vì front-end tự quản lý CSP qua Nginx
  crossOriginEmbedderPolicy: false
}));

// Public, immutable design resources also serve srcdoc/headless PDF pages.
// These files contain only TopCV fonts and template images, never user data.
app.use('/api/cv/source-assets',express.static(require('path').join(__dirname,'assets/topcv-source/assets'),{
  maxAge:'1y',immutable:true,setHeaders:res=>{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  }
}));

// =========================================================
// 2. CORS — Chỉ cho phép các origin được whitelist
// =========================================================
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:80',
      'http://connectcv.io.vn',
      'https://connectcv.io.vn',
      'https://connectcv.id.vn',
      'https://www.connectcv.id.vn',
      'http://www.connectcv.io.vn'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép requests không có origin (curl, server-to-server, health check)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy: Origin không được phép truy cập API này.'));
  },
  credentials: true
}));

// =========================================================
// 3. RESPONSE COMPRESSION — Giảm băng thông ~70%
// =========================================================
app.use(compression());

// =========================================================
// 4. RATE LIMITING — Phân tầng theo mức độ "đắt" của endpoint
// =========================================================

// Tầng 1 — Global: 200 request / 15 phút mỗi IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 15 phút.' },
  // Browsing the 74-template gallery must not consume the API/AI request budget.
  skip: (req) => req.path === '/health' || (req.method === 'GET' &&
    (/^\/api\/cv\/templates\/[a-zA-Z0-9_-]+\/(thumbnail|preview)$/.test(req.path) ||
     /^\/api\/cv\/snapshots\/(vi|en)\/[a-zA-Z0-9_-]+\.webp$/.test(req.path)))
});
app.use(globalLimiter);

// Tầng 2 — AI endpoints (Gemini API): 15 request / 5 phút mỗi IP
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Giới hạn 15 lần gọi AI mỗi 5 phút. Vui lòng thử lại sau ít phút.' }
});

// Tầng 3 — TTS (Audio): 20 request / phút (tránh TTS abuse)
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Giới hạn 20 lần chuyển giọng nói mỗi phút.' }
});

// =========================================================
// 5. BODY PARSER — Conditional limit per route
// =========================================================

// Dùng một middleware duy nhất với limit động theo path
// Transcribe audio: 7MB base64 ≈ 5MB audio (+ JSON overhead)
// Mọi route khác: 2MB
app.use((req, res, next) => {
  const isLargeBody = req.path.startsWith('/api/interview/transcribe') || req.url.startsWith('/api/interview/transcribe')
    || req.path.startsWith('/api/cv/export-pdf') || req.url.startsWith('/api/cv/export-pdf')
    || req.path.startsWith('/api/cv/export-docx') || req.url.startsWith('/api/cv/export-docx');
  const limit = isLargeBody ? '15mb' : '2mb';
  express.json({ limit })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// =========================================================
// 6. REQUEST LOGGING — Ghi log mọi request (IP, path, time)
// =========================================================
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.socket.remoteAddress || 'unknown';
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms — IP: ${ip}`);
    }
  });
  next();
});

// =========================================================
// 7. HEALTH CHECK
// =========================================================
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running securely!', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: '🚀 ConnectCV AI Backend — Secured & Ready.', version: '2.0.0' });
});

// =========================================================
// 8. MOUNT ROUTES (với AI rate limiter & Input Token Guard)
// =========================================================

// Token Flooding & Character Guard — Ngăn chặn cạn kiệt Quota do input quá dài
const aiInputGuard = (req, res, next) => {
  if (req.body) {
    const { jdText, profile, message, answer } = req.body;
    if (jdText && String(jdText).length > 8000) {
      return res.status(400).json({ success: false, message: 'Bản mô tả công việc (JD) quá dài (tối đa 8.000 ký tự).' });
    }
    if (profile) {
      // Bóc tách ảnh đại diện base64 trước khi đo lường độ dài ký tự văn bản của Profile
      let cleanProfileText = '';
      if (typeof profile === 'object' && profile !== null) {
        try {
          const clone = { ...profile };
          if (clone.avatarUrl && String(clone.avatarUrl).startsWith('data:')) delete clone.avatarUrl;
          if (clone.avatarDataUrl && String(clone.avatarDataUrl).startsWith('data:')) delete clone.avatarDataUrl;
          cleanProfileText = JSON.stringify(clone);
        } catch (_) {
          cleanProfileText = String(profile);
        }
      } else {
        cleanProfileText = String(profile).replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '');
      }
      if (cleanProfileText.length > 25000) {
        return res.status(400).json({ success: false, message: 'Hồ sơ ứng viên quá dài (tối đa 25.000 ký tự văn bản).' });
      }
    }
    if (message && String(message).length > 2500) {
      return res.status(400).json({ success: false, message: 'Nội dung tin nhắn quá dài (tối đa 2.500 ký tự).' });
    }
    if (answer && String(answer).length > 4000) {
      return res.status(400).json({ success: false, message: 'Câu trả lời phỏng vấn quá dài (tối đa 4.000 ký tự).' });
    }
  }
  next();
};

// Auth middleware: Trích xuất danh tính người dùng (nếu có)
const { optionalAuth } = require('./src/middlewares/authMiddleware');
const { featureSecurity } = require('./src/middlewares/featureSecurity');

// Auth routes: Đăng ký, Đăng nhập, Profile me, Admin set-role (Supabase / Dev)
const authRouter = require('./src/routes/auth');
app.use('/api/auth', authRouter);

// CV routes: generate, translate, ats-score dùng AI limiter + Input Guard + Optional Auth
const cvRouter = require('./src/routes/cv');
app.use('/api/cv', optionalAuth, featureSecurity, aiInputGuard);
app.use('/api/cv/generate', aiLimiter);
app.use('/api/cv/translate', aiLimiter);
app.use('/api/cv/ats-score', aiLimiter);
app.use('/api/cv', cvRouter);

// Interview routes: start, live-chat, evaluate, proposal, transcribe dùng AI/TTS limiter + Optional Auth
const interviewRouter = require('./src/routes/interview');
app.use('/api/interview', optionalAuth, featureSecurity, aiInputGuard);
app.use('/api/interview/tts', ttsLimiter);
app.use('/api/interview/transcribe', aiLimiter);
app.use('/api/interview/start', aiLimiter);
app.use('/api/interview/live-chat', aiLimiter);
app.use('/api/interview/evaluate', aiLimiter);
app.use('/api/interview/proposal', aiLimiter);
app.use('/api/interview', interviewRouter);

// Chatbot: AI limiter + Optional Auth
const chatbotRouter = require('./src/routes/chatbot');
app.use('/api/chatbot', optionalAuth, featureSecurity, aiInputGuard);
app.use('/api/chatbot/message', aiLimiter);
app.use('/api/chatbot', chatbotRouter);

// Portfolio: no AI call, global limiter đủ
app.use('/api/portfolio', require('./src/routes/portfolio'));

// Upload: file upload với rate limiter riêng (10 lần/15 phút)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn đã upload quá nhiều ảnh. Vui lòng thử lại sau 15 phút.' }
});
app.use('/api/upload', optionalAuth, (req,res,next)=>req.user?.id?next():res.status(401).json({success:false,code:'AUTH_REQUIRED',message:'Vui lòng đăng nhập để tải ảnh CV.'}), uploadLimiter);
// Upload route cần body parser riêng cho multipart (multer tự xử lý)
// KHÔNG dùng express.json() cho route này
app.use('/api/upload', require('./src/routes/upload'));

// Quản trị nội bộ In-Memory Key Pool (Bảo vệ bởi X-Internal-Secret)
const internalKeysRouter = require('./src/routes/internalKeys');
if(process.env.NODE_ENV!=='production')app.use('/api/internal/keys', internalKeysRouter);

// =========================================================
// 9. GLOBAL ERROR HANDLER — Không leak stack trace ra client
// =========================================================
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.status || 500;

  if (isDev) {
    console.error('[Error]', err);
  } else {
    // Production: chỉ log server-side, không gửi chi tiết ra client
    console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);
  }

  // CORS error cụ thể
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(statusCode).json({
    success: false,
    message: isDev ? err.message : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại.',
    ...(isDev && { error: err.message })
  });
});

// =========================================================
// 10. GRACEFUL SHUTDOWN — Tránh crash bất ngờ
// =========================================================
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
});


// =========================================================
// 11. START SERVER
// =========================================================
app.listen(PORT, () => {
  console.log('=============================================');
  console.log(`🛡️  ConnectCV Backend v2.0 — SECURED`);
  console.log(`🚀  Listening on port ${PORT}`);
  console.log(`🌍  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒  Rate Limit: 200 req/15min (global), 15 req/5min (AI)`);
  console.log(`📍  Health: http://localhost:${PORT}/health`);
  console.log('=============================================');

  // ── Anti-sleep: tự ping /health mỗi 12 phút để Render Free không ngủ ──
  // Bổ sung UptimeRobot (uptime.robot.com) ping từ bên ngoài để chắc chắn hơn.
  const selfPingUrl = process.env.SELF_PING_URL; // ví dụ: https://connectcv-api-minh.onrender.com
  if (selfPingUrl) {
    const https = require('https');
    const http = require('http');
    const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 phút
    setInterval(() => {
      const url = new URL('/health', selfPingUrl);
      const client = url.protocol === 'https:' ? https : http;
      const req = client.get(url.href, { timeout: 10000 }, (res) => {
        console.log(`[Self-Ping] /health → HTTP ${res.statusCode}`);
        res.resume();
      });
      req.on('error', (err) => console.warn('[Self-Ping] Lỗi:', err.message));
      req.end();
    }, PING_INTERVAL_MS);
    console.log(`⏰  Anti-sleep self-ping: ${selfPingUrl}/health mỗi 12 phút`);
  }
});
