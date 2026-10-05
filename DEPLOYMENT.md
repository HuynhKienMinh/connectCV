# ConnectCV independent deployment

Frontend: Firebase Hosting `connect-cv` (Spark). Backend: a separate Render Free Node web service from this repository, root `backend`, build `npm ci --omit=dev`, start `node server.js`, health `/health`.

## Configuration

Set `FIREBASE_PROJECT_ID=connect-cv`, `NODE_ENV=production`, `WEB_ORIGINS=https://connect-cv.web.app,https://connect-cv.firebaseapp.com`, `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/firebase-admin.json`. Add a dedicated Firebase Admin service-account JSON as a **Render secret file**, never in this repository. Its permissions must allow Firestore data access and Firebase Auth user lookups/revocation. Add `GEMINI_API_KEY` and a random independent `CV_TRANSLATION_SIGNING_SECRET` only in Render environment settings. Never use a browser-exposed Gemini key or Firebase CLI user refresh token in production.

Build frontend with `VITE_API_BASE_URL` set to the exact Render HTTPS service URL. Run `npm ci && npm run build` in `frontend`, then `firebase deploy --only firestore:rules,hosting --project connect-cv` from root.

## Data and security boundaries

Firebase Authentication validates identity. Backend verifies the project and revoked tokens; email verification is required for AI and public writes. Profile/credits use Firestore transactions. Initial balance is granted once; community duplicate hashes and a six-hour cooldown prevent repeated rewards. Credits and quota are never accepted from the browser. All direct client Firestore access is denied. A public portfolio exposes only title, description and projects after explicit publication.

The feature iframe uses an exact origin/source/request-ID message bridge. Tokens stay out of URLs and feature local storage. The Firebase web SDK config is public configuration, not a Gemini key or Admin credential. API error responses hide implementation and credential details. Uploads, request size, history size and rendering concurrency are limited.

## Trial limitations

Render Free can sleep and has no durable local disk; Firestore stores account state. Without an isolated sandboxed Chromium worker, PDF uses the browser's Save as PDF dialog with original layout CSS. Word exports editable text. A configured sandboxed renderer can enable direct native PDF/Word layout export; production browser sandbox must never be disabled. Local PDF renderer testing does not certify Render Chromium compatibility.

The landing page preserves the earlier interface and labels its illustrative job/candidate/testimonial content. Job ingestion, paid subscriptions and employer recruitment workflows are outside this initial five-feature integration. AI grounding refuses unsupported facts or unverified translations; live Gemini success must be tested after the server key is configured.

## Validation

`node --test backend/tests/account.test.cjs` validates identity, verification, isolated profiles, quota and atomic rewards. `npm test --prefix backend/features/connectcv` validates grounding for 74 layouts in both languages. Native export security checks are in `backend/features/connectcv/tests/featureSecurity.check.cjs`; run with a localhost backend and `CHROMIUM_PATH` for a local browser. Dependency audits cover frontend, backend and the isolated feature bundle. Deployment is complete only after live login/profile/community/AI smoke tests succeed.
