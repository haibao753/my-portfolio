# Liquid Glass 3.0 — mobile acceptance

The owner approved promoting the reviewed preview on 2026-10-15 and requested matching glass styling on the toolbar. It combines CSS-backed glass navigation with a separate WebGL optics lab. It does **not** capture or refract live website DOM pixels. Main-branch deployment still requires verification after merging.

## Functional checks (Android Chrome, plus iOS Safari if available)

1. Open the preview on a phone. Scroll to the middle of the home page and open the top-right menu.
2. Swipe **outside** the menu while it is open: content must keep scrolling, and both the menu and sticky site navigation must remain visible.
3. Swipe **inside** a menu on a very short viewport: links must remain reachable; the document should not jump.
4. Toggle light/dark and Chinese/English while the menu is open; links and button controls must remain available.
5. Close via menu button and Escape (with hardware keyboard). Activate a link and confirm it navigates.
6. Rotate portrait/landscape or resize above 1180px: the overlay must close and leave the desktop links accessible.
7. Enable Android reduce-motion accessibility setting: menu must remain usable without relying on animation.

## Optical lab

Navigate to `/experiments/liquid-glass-optics.html`.

- Adjust refraction/dispersion sliders; drag with mouse or pen. Touch swiping should remain native page scrolling.
- Check that glass fallback navigation remains readable if WebGL is unavailable or the rendering context is lost.
- Compare phone battery/thermal behavior with no interaction versus scrolling the lab. Shader is event-driven and limited to at most 1.5 device pixel ratio.
- Observe that scene behind the refractive body is *shader-generated*, not live DOM content.
- The raster budget is at most 1,000,000 pixels, with depth, stencil and multisample buffers disabled. No idle render loop is used.
- Context loss/restoration deliberately keeps the CSS fallback until reload, because old WebGL resource handles are invalid after restoration.

## Preview and automated checks

- Stable independent Cloudflare Pages preview: https://experiment-liquid-glass-3d-o.jhlab-preview.pages.dev/
- GitHub Actions validates the full build, preserved routes, preview Worker bundle and Chromium desktop/Pixel 7 tests. The mobile scroll test sends a native Chromium touch scroll gesture.
- The production Worker build check is separate from Pages. A successful Pages preview does not prove that production Workers configuration is correct.
- Changes in experiments, tests, assets and Wrangler configuration must also trigger CI.
- The closed/closing menu is inert, so its links cannot receive keyboard focus during the exit animation.

## Acceptance boundary

CI covers navigation, scrolling, accessibility regression, and build integrity. Visual resemblance to Apple's Liquid Glass, native-device frame pacing, and optical accuracy require manual device review. The owner has accepted the existing phone preview; retain this distinction in release notes.
