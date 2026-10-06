# ConnectCV — Progress & Handoff Report
> Last updated: 2026-10-06 | Agent: Antigravity (Google DeepMind)

---

## 🌐 URLs

| Service | URL | Status |
|:---|:---|:---:|
| Frontend | https://connect-cv.web.app | ✅ Live |
| Backend API | https://connectcv-api-minh.onrender.com | ✅ Live |
| GitHub (personal) | https://github.com/HuynhKienMinh/connectCV | branch: `main` |
| GitHub (team) | https://github.com/khoaddce190369-creator/connectcv | branch: `feature/minh-ai-core` |
| Supabase | https://kktkftjsdgiheycemqco.supabase.co | ✅ Created |

---

## 🏗️ Architecture

```
[Firebase Hosting] connect-cv.web.app
        ↓ fetch('/api/...') with Authorization: Bearer <token>
[Render Free Tier] connectcv-api-minh.onrender.com
        ↓ Node.js + Playwright Chromium
        ↓ PDF (Vector A4) + DOCX export
[Supabase] Auth (JWT) + PostgreSQL
[Google Gemini API] AI CV grounding + translation
```

**Stack:**
- Frontend: Vanilla JS SPA (`frontend/public/index.html`) — 7000+ lines
- Backend: Node.js Express (`backend/server.js`) — 287 lines
- PDF: Playwright-core + Chromium headless (vector, không bitmap)
- Auth: Supabase JWT + local fallback
- Deploy: Firebase Hosting (frontend) + Render Free (backend)

---

## ✅ Completed This Session

### 1. Anti-sleep (Render Free)
- **Self-ping**: `server.js` tự gọi `/health` mỗi 12 phút khi `SELF_PING_URL` env set
- **UptimeRobot**: Đã setup monitor `connectcv-api-minh.onrender.com/health` mỗi 5 phút
- **Env cần set**: `SELF_PING_URL=https://connectcv-api-minh.onrender.com`

### 2. Chromium trên Render (PDF fix)
- `package.json` postinstall: `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`
- `pdfService.js`: auto-detect Chromium path (`playwright-core.chromium.executablePath()` fallback)
- `browserRuntime.js`: `CHROMIUM_NO_SANDBOX=true` env support

### 3. Assets bundled vào GitHub
- `backend/assets/cv-designs/` — design-registry.json, fonts, CSS
- `backend/assets/topcv-source/` — offline assets, templates (EN + VI), fonts
- `backend/assets/native-system-fonts/` — fonts.conf

### 4. Auth fix (featureSecurity gate)
**Vấn đề:** `featureSecurity.js` line 8 chặn TẤT CẢ POST trong production:
```js
if (process.env.NODE_ENV === 'production' && req.featureIdentityVerified !== true)
  return res.status(503).json({ code: 'AUTH_INTEGRATION_REQUIRED' });
```
**Fix:**
- `authMiddleware.js` `optionalAuth()`: set `req.featureIdentityVerified = true` sau khi verify token thành công
- `index.html`: `export-pdf` và `export-docx` fetch giờ gửi `Authorization: Bearer <token>` từ `localStorage.getItem('connectcv_auth_token')`

### 5. Supabase project tạo mới
- Project: `connectcv` tại `https://kktkftjsdgiheycemqco.supabase.co`
- Organization: ConnectCV (FREE tier)
- Region: Asia-Pacific

### 6. Frontend deployed Firebase
- `firebase.json` + `.firebaserc` tạo mới tại `frontend/`
- Deployed: `https://connect-cv.web.app` ✅

---

## ⏳ Còn lại (TODO)

### 🔴 URGENT — Render cần Supabase env vars

Vào **Render → connectcv-api-minh → Environment → Add:**

| Key | Value | Lấy từ đâu |
|:---|:---|:---|
| `SUPABASE_URL` | `https://kktkftjsdgiheycemqco.supabase.co` | Supabase dashboard |
| `SUPABASE_ANON_KEY` | `sb_publishable_t_a1tuPvlwyoPOV3HPeEiw_YtuhrDF1` | Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | *(cần lấy)* | Supabase → Settings → API → JWT Settings |
| `SELF_PING_URL` | `https://connectcv-api-minh.onrender.com` | Hardcode |
| `CHROMIUM_NO_SANDBOX` | `true` | Hardcode |

Sau khi save → **Manual Deploy** trên Render.

### 🟡 Cần test sau khi deploy
1. Đăng nhập trên `connect-cv.web.app`
2. Tạo CV → chọn mẫu → nhấn "Tải PDF"
3. Kiểm tra PDF download về đúng tỷ lệ A4, sắc nét

---

## 📁 Key Files

| File | Mục đích |
|:---|:---|
| `backend/server.js` | Express server, anti-sleep self-ping |
| `backend/package.json` | postinstall playwright chromium |
| `backend/src/services/pdfService.js` | PDF generation với Chromium |
| `backend/src/services/browserRuntime.js` | Playwright-as-Puppeteer adapter |
| `backend/src/services/templateService.js` | CV template management (74 mẫu) |
| `backend/src/middlewares/featureSecurity.js` | ⚠️ Production gate (featureIdentityVerified) |
| `backend/src/middlewares/authMiddleware.js` | JWT verify, sets featureIdentityVerified |
| `backend/src/services/supabaseService.js` | Supabase auth + local JWT fallback |
| `frontend/public/index.html` | Full SPA (7000+ lines) |
| `frontend/firebase.json` | Firebase Hosting config |

---

## 🔑 Environment Variables (Render)

```env
# Đã set
NODE_ENV=production
CHROMIUM_NO_SANDBOX=true
SELF_PING_URL=https://connectcv-api-minh.onrender.com
GEMINI_API_KEYS=<set>
FIREBASE_PROJECT_ID=<set>
CV_TRANSLATION_SIGNING_SECRET=<set>
WEB_ORIGINS=<set>

# CẦN ADD
SUPABASE_URL=https://kktkftjsdgiheycemqco.supabase.co
SUPABASE_ANON_KEY=sb_publishable_t_a1tuPvlwyoPOV3HPeEiw_YtuhrDF1
SUPABASE_JWT_SECRET=<lấy từ Supabase Settings → API → JWT Settings>
```

---

## ⚠️ Known Issues

1. **Render Free sleep**: Đã có UptimeRobot + self-ping, nhưng cold start đầu tiên vẫn mất ~50s
2. **Playwright Chromium trên Render**: postinstall cài tự động, nhưng nếu Render cache build cũ thì cần clear cache hoặc đổi 1 ký tự trong postinstall để force reinstall
3. **mau_CV (351 files)**: Chưa push lên GitHub (24MB, gitignore), backend tìm tại `/mau_CV` (volume mount local) hoặc `TEMPLATES_DIR` env → trên Render hiện chỉ có 20 mẫu ATS built-in từ `templateService.js`

---

## 📝 Git History (Recent)

```
c481be9  fix(auth): send Bearer token in export-pdf/docx + featureIdentityVerified
3e89e8e  fix(auth): set featureIdentityVerified=true when token verified
2ea1a2c  fix(render): add missing assets + fix playwright install (no --with-deps)
fe31e79  merge: feature/minh-ai-core -> main (Chromium fix + anti-sleep)
5fa87c9  fix: Render anti-sleep + Chromium auto-install via playwright postinstall
```
