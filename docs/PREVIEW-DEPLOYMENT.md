# J.H. LAB / safe refactor preview deployment

## Current state
- Production: `main`, **unchanged**.
- Migration: `refactor/astro-foundation` (draft PR #1).
- Automatic CI builds Astro and runs desktop / Pixel 7 Chromium acceptance tests.
- Each successful CI run uploads `dist/`, screenshots and a browser report as a downloadable workflow artifact. This is a deployable preview bundle, **not automatically a public preview URL**.
- CI overlays current published `main`-branch `brief/data/*.json` into the runner workspace only before building. The preview branch and daily news publisher remain unchanged.

## Option A — Preview in an existing Cloudflare Pages project
If an existing Cloudflare Pages integration is connected to GitHub, configure branch previews for `refactor/astro-foundation` with:
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: repository root
- Build environment: Node.js 22
- Branch preview: **only refactor branch**; do not change production's main branch deployment.
- No tokens are needed by the generated static site. Never expose publishing credentials in client code.

**Important:** The deployed branch should obtain fresh news data. GitHub CI snapshots current `main` news for its uploaded artifact, but a separate Cloudflare build from the branch will use its own checked-out branch data unless an equivalent sync step is configured. Recommended Cloudflare preview build command:
```sh
git fetch --depth=1 origin main && node scripts/sync-news-preview.mjs && npm run build
```
Check that the deployment environment permits fetching the public `main` branch.

## Option B — Manual preview using the CI artifact
Open the latest green GitHub Actions run, download its `astro-refactor-site` artifact and serve the contained `dist/` directory using an ordinary static HTTP server (for example `npx serve dist`). Do **not** open generated HTML as a `file://` URL because the news reader fetches `/brief/data/`.

## Acceptance checklist before changing production
- Compare the legacy and Astro homepages at desktop 1440px and Android 393px, light/dark, ZH/EN.
- Check header, menu hit targets, one-shot signature, mobile native scroll, email/WeChat, visual assets and GPU costs.
- Verify `/brief/`, latest `/brief/data/index.json`, a dated JSON story, archive tabs, and original source links.
- Verify the existing independent 3D experiment pages.
- Confirm hosting mode first: Cloudflare Pages build-output configuration is **not interchangeable** with an existing Workers deployment configuration. Do not replace current Workers configuration without inspecting its actual project setup.
- Keep the PR in draft until preview deployment and visual acceptance have been completed.
