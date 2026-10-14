# Browser acceptance checks

On the `refactor/astro-foundation` branch:

```bash
npm install
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright setup boots `astro preview` on localhost:4322. Two browsers
profiles are exercised: Chromium desktop at 1440x900 and Pixel 7 emulation.

Tests cover navigation, language and theme persistence, JSON-backed Daily
Brief rendering/category filtering, links, legacy routes, and horizontal
overflow. Full-page screenshots (home and brief, light/dark, both profiles)
are uploaded by GitHub Actions as artifacts for visual inspection. Passing
checks do not replace manual inspection on actual Android and Windows devices.

Do not merge or switch Cloudflare production until that manual comparison is done.
