# J.H. LAB — Repository instructions for AI coding agents

## Goal
Build a maintainable, multilingual, accessible creative portfolio. Prefer restrained Apple-inspired editorial design, original art direction, and fast mobile performance.

## Migration safety
- **Do not replace, delete or deploy the legacy main branch during the refactor.**
- Astro migration lives on `refactor/astro-foundation` until verified, reviewed and merged.
- Keep all existing routes, assets, daily news JSON, email, WeChat and outgoing links working.
- The separate private news automation publishes into `brief/data/`; do not alter its schema or pipeline.
- The legacy /brief/, /experiments/, /assets/ and /images/ directories are copied into dist/ after build. Migrate deliberately later.
- Any future Cloudflare deployment must use the Astro `npm run build` output `dist/`, and should first be verified on preview.

## Component rules
- Reusable structure: `src/components/`; layouts: `src/layouts/`; route pages: `src/pages/`.
- Shared values in `src/styles/tokens.css`; no accumulating override files.
- Links, navigation and project metadata are defined once in `src/data/site.ts`.
- Chinese and English must stay in sync; make both localizations whenever writing UI copy.
- Motion should never interfere with native touch momentum; honor `prefers-reduced-motion`.
- Preserve keyboard focus visibility, sensible touch targets and external link rel attributes.

## Before merging to main
1. Run `npm install`, `npm run check`, `npm run build`.
2. Inspect routes /, /brief/, /experiments/minimal-surfaces-classical.html, /experiments/minimal-surfaces-periodic.html.
3. Check theme, language, copy WeChat, navigation on mobile/desktop, reduced motion.
4. Verify /brief/data/index.json and dated JSON files still work.
5. Confirm Cloudflare deployment settings support a Node build and output dir `dist`.
