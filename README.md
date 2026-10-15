# J.H. LAB — Astro portfolio and daily briefing

## Performance and reliability
- `npm run validate` runs Astro diagnostics, deployment guards, the production build and artifact checks.
- `npm ci` installs the committed dependency lockfile reproducibly.
- The homepage photo strip uses Astro-generated WebP at 320/640/960px. Historic `/images/*.jpg` URLs remain available to legacy pages.
- Production pages emit canonical/sharing metadata plus `/robots.txt` and `/sitemap.xml`.
- Brief filtering keeps keyboard focus, validates incoming JSON, cancels outdated requests and clears stale cards on a failed issue load. The publishing JSON schema is unchanged.

The owner approved promoting the reviewed Liquid Glass preview to production on 2026-10-15. The site uses Astro static output, shared glass navigation, and a separately generated daily briefing archive.

## Local usage
```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
npm run test:e2e # after installing Playwright Chromium
```

- Site source: `src/`.
- Design tokens: `src/styles/tokens.css`.
- Navigation and project metadata: `src/data/site.ts`.
- During migration, `scripts/copy-legacy.mjs` includes the existing `/experiments/`, `/assets/` and `/images/`, and separately copies `/brief/data/` in the production `dist/` output.
- Daily Brief is now an Astro route at `src/pages/brief/index.astro`, with a typed reader in `src/lib/brief-reader.ts`; published JSON remains at `brief/data/`. No private tokens should be committed.
- The preview/dev server may not serve every legacy URL until the content is moved into public/ or a preview build is used; use `npm run build && npm run preview` for migration acceptance.

## Deployment
For Cloudflare Workers Builds, set the dashboard Build command to `npm run build:cloudflare`, the production Deploy command to `npx wrangler deploy`, and the Preview command to `npx wrangler preview`. The explicit build synchronizes the published news JSON and generates `dist/`. Workers Builds does not honor Wrangler custom-build settings, so a successful CLI custom build alone does not verify the dashboard configuration. The root Wrangler custom build remains available for direct CLI use and preserves its production branch guard. The existing Worker and domain remain `my-portfolio` and `hujinhai.com`.

## Remaining work
- Inspect GitHub Actions Playwright screenshots and perform manual Android/Windows visual checks.
- Migrate remaining long-form content and handwriting animation with original silhouette.
- Verify the new Astro /brief/ page against the daily publishing workflow; keep its JSON feed stable.
- Reconcile all legacy navigation and script behavior; test external links.
- Migrate experiments incrementally only after performance checks.

## Reviewable staging output
Every successful GitHub Action uploads a `dist/` artifact alongside screenshots; see [deployment details](docs/PREVIEW-DEPLOYMENT.md). CI previews sync current `main` news data without committing generated changes. Independent preview: https://experiment-liquid-glass-3d-o.jhlab-preview.pages.dev/
