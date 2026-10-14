# J.H. LAB — Astro Foundation (work in progress)

> This branch starts a staged migration. **Main / production has not been replaced.**

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
Before merging, update the Cloudflare build command to `npm run build` and output directory to `dist` **only after** verifying a preview deployment. Do not switch the live environment just because this branch exists.

## Remaining work
- Inspect GitHub Actions Playwright screenshots and perform manual Android/Windows visual checks.
- Migrate remaining long-form content and handwriting animation with original silhouette.
- Verify the new Astro /brief/ page against the daily publishing workflow; keep its JSON feed stable.
- Reconcile all legacy navigation and script behavior; test external links.
- Migrate experiments incrementally only after performance checks.
