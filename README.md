# J.H. LAB — Astro Foundation (work in progress)

> This branch starts a staged migration. **Main / production has not been replaced.**

## Local usage
```sh
npm install
npm run dev
npm run check
npm run build
npm run preview
```

- Site source: `src/`.
- Design tokens: `src/styles/tokens.css`.
- Navigation and project metadata: `src/data/site.ts`.
- During migration, `scripts/copy-legacy.mjs` includes the existing `/brief/`, `/experiments/`, `/assets/` and `/images/` in the production `dist/` output.
- Daily Brief is still the legacy page and receives published JSON under `brief/data/`. No private tokens should be committed.
- The preview/dev server may not serve every legacy URL until the content is moved into public/ or a preview build is used; use `npm run build && npm run preview` for migration acceptance.

## Deployment
Before merging, update the Cloudflare build command to `npm run build` and output directory to `dist` **only after** verifying a preview deployment. Do not switch the live environment just because this branch exists.

## Remaining work
- Verify build/TypeScript with CI and visual screenshots.
- Migrate remaining long-form content and handwriting animation with original silhouette.
- Migrate /brief/ into Astro without changing JSON feeds.
- Reconcile all legacy navigation and script behavior; test external links.
- Migrate experiments incrementally only after performance checks.
