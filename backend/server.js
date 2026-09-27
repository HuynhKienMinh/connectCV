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
app.set('trust proxy', 1);

// =========================================================
// 1. SECURITY HEADERS — Helmet (chặn XSS, clickjacking, MIME sniff...)
// =========================================================
app.use(helmet({
  contentSecurityPolicy: false, // Tắt CSP ở backend vì front-end tự quản lý CSP qua Nginx
  crossOriginEmbedderPolicy: false
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
  skip: (req) => req.path === '/health' // Bỏ qua health check
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
  const isTranscribe = req.path === '/api/interview/transcribe' || req.url === '/api/interview/transcribe';
  const limit = isTranscribe ? '10mb' : '2mb';
  express.json({ limit })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// =========================================================
// 6. REQUEST LOGGING — Ghi log mọi request (IP, path, time)
// =========================================================
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
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
// 8. MOUNT ROUTES (với AI rate limiter áp dụng đúng chỗ)
// =========================================================

// CV routes: generate, translate, ats-score dùng AI limiter
const cvRouter = require('./src/routes/cv');
app.use('/api/cv/generate', aiLimiter);
app.use('/api/cv/translate', aiLimiter);
app.use('/api/cv/ats-score', aiLimiter);
app.use('/api/cv', cvRouter);

// Interview routes: start, live-chat, evaluate, proposal, transcribe dùng AI/TTS limiter
const interviewRouter = require('./src/routes/interview');
app.use('/api/interview/tts', ttsLimiter);
app.use('/api/interview/transcribe', aiLimiter);
app.use('/api/interview/start', aiLimiter);
app.use('/api/interview/live-chat', aiLimiter);
app.use('/api/interview/evaluate', aiLimiter);
app.use('/api/interview/proposal', aiLimiter);
app.use('/api/interview', interviewRouter);

// Chatbot: AI limiter
const chatbotRouter = require('./src/routes/chatbot');
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
app.use('/api/upload', uploadLimiter);
// Upload route cần body parser riêng cho multipart (multer tự xử lý)
// KHÔNG dùng express.json() cho route này
app.use('/api/upload', require('./src/routes/upload'));

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
});
