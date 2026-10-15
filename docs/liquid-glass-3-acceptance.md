# Liquid Glass 3.0 — mobile acceptance

This PR is a **preview**, not a production release. It combines a CSS-backed glass menu with a separate WebGL optics lab. It does **not** capture or refract live website DOM pixels.

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

## Acceptance boundary

CI covers navigation, scrolling, accessibility regression, and build integrity. Visual resemblance to Apple's Liquid Glass, native-device frame pacing, and optical accuracy **require manual device review**. Do not merge this experimental PR into `main` merely because CI is green.
