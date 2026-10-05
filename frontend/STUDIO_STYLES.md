# AI Studio style contract

The local AI Lab uses Tailwind 3.4.17. Its embedded Studio stylesheet must preserve that version's dimensions, spacing, palette and preflight defaults. The main React website continues to use its own Tailwind 4 configuration; iframe isolation keeps the two style systems separate.

Deploy the committed `backend/features/connectcv/public/css/studio.css`. Every frontend build runs `node build-studio.cjs --check` to reject missing critical height, scrolling, grid and color rules. Do not replace the Studio artifact with the React site's stylesheet or a Tailwind 4 scan of the Studio HTML.

If Studio utilities change, regenerate with `build-studio.cjs` using an external Tailwind 3.4.17 compiler directory, supplied through `STUDIO_TAILWIND_COMPILER`. The script passes trusted repository HTML as raw content and includes the runtime color variants. The compiler and its dependency tree are intentionally not part of application dependencies or the deployed backend. Review and commit the CSS artifact, then run the normal build and audit checks.

Layout verification compares the local reference and public iframe: template list max-height 460px, overflow-y auto, gap 12px, padding 6px/8px; profile input font 14px, padding 8px/12px, slate-300 border. Compare desktop/mobile breakpoints as well as screenshots. The site's outer navigation occupies additional viewport space, so viewport-relative panel heights are based on the iframe's available height.
