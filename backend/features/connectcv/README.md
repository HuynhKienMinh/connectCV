# ConnectCV owned AI features

This additive bundle preserves the existing React website and all account-team source files. `/ai/` is the feature UI on the backend origin. `/api/features/health` reports integration readiness; a successful health check does not mean AI is enabled.

## Required production integration

- Install root backend dependencies: the postinstall hook installs this bundle from its lockfile.
- Supply server-only `GEMINI_API_KEY`, a stable random `CV_TRANSLATION_SIGNING_SECRET` (at least 32 random bytes), `FEATURE_STATE_DIR` on persistent disk, and `FEATURE_SINGLE_PROCESS=true` with exactly one process/instance. Translation signatures use an ephemeral key when the stable secret is absent and will not survive a restart.
- Pass `authenticate: trustedRequireAuth` into `createApp` in `backend/app.js` only after the account team provides middleware that verifies the token and sets `req.user.id`. Current upstream middleware is a placeholder; writes deliberately return 503. Never accept userId from the browser or enable the development JWT fallback.
- Use a sandboxed, isolated Chromium worker via `CV_BROWSER_WS_ENDPOINT=wss://...`. No key/profile data in its environment; only the local immutable assets may be loaded. The worker must have the same bundled fonts. Keep the worker authenticated, network isolated and resource limited. Do not disable Chromium sandbox to make deployment pass.
- Community rewards are persisted as pending unique `community:<postId>` events. The central credits team must credit them transactionally and idempotently; this module does not claim that a pending event increased a balance.
- The shared server mounts `/api/` and `/ai/` before the React static files and SPA fallback. The team's root `npm run build` and `npm start` commands remain available. React pages, original interviews/social feed and login are untouched. The account team supplies `window.connectCVGetAccessToken` in memory when using this UI; no demo login is shipped here.

## Deployment

Do not merge until all production requirements above are verified. Render automatic deploy occurs only if its service is configured to track the merged branch. GitHub push alone cannot establish hosting configuration or secrets.

CV/PDF, community abuse, SSRF/XSS, and source-fact tests are included. Local synthetic tests do not substitute for a staging test using the actual auth and browser worker.

After installing both lockfiles and building frontend, run `NODE_ENV=production node backend/tests/fullstack.check.cjs` to verify shared routing. The feature workflow runs this check along with grounding and packaged integration tests. It runs once per PR update, with a manual trigger, rather than duplicate push and PR runs.

Upstream frontend dependencies currently report 9 npm audit findings (6 high in build tooling, 3 moderate). Their fixes include major Tailwind/Vite/router migrations; this bundle preserves the team's frontend dependencies and does not claim the complete repository is vulnerability-free.

Production demo jobs are disabled. Connect the jobs team's trusted data adapter; manual job descriptions remain supported.
