# ConnectCV — Firebase integration handoff (2026-10-06)

User decision: retain Firebase Auth and Google Sign-in. Do not migrate production identity to Supabase or enable demo JWT/password accounts.

## Architecture retained
- Firebase Hosting serves the React website and Google/email authentication.
- Render serves the protected feature module. Firebase Admin verifies issuer/project and revoked sessions; email must be verified for AI writes.
- Firestore retains account profiles, portfolios, credits, quotas and community reward transactions.
- API credentials remain backend environment/secret files, not Git or browser application settings.

## Reconciliation
Remote main was replaced by the legacy flat backend/standalone Studio history ending at `202860c`. A merge with both histories retains that handoff history while restoring the previously tested Firebase tree. No force push or team repository mutation is required.

The restored tree includes Google Sign-in, account/portfolio routes, grounded CV translation, live-summary safeguards, 74 native designs with VI/EN previews, and local-compatible compiled Studio CSS. These must not be deleted when importing legacy fixes.

## Browser/PDF integration
Kept the useful browser auto-detection idea, but production sandbox cannot be disabled. Renderer availability is published only after a successful launch probe. Browser Print/Save PDF and editable Word content remain the fallback when a secure renderer is unavailable.

Optional Render browser installation: explicitly set `INSTALL_CHROMIUM_ON_RENDER=true` and rebuild. The installed browser uses the pinned feature Playwright CLI and the same `.render-browsers` location at build/runtime; installation errors fail the build. There is no unpinned npx install or silent `|| true` failure. A successful download does not by itself prove the platform supports the sandbox.

Do not add SUPABASE_JWT_SECRET or CHROMIUM_NO_SANDBOX for this Firebase deployment. No self-ping/uptime schedule is created by this integration.

## Verification
Record deployment and live checks in the accompanying task test report after execution. This file does not claim those steps are complete in advance.
