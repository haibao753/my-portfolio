# Explorable studio concept

Open `/lab/` on the PR preview. This is a separate, functional homepage concept;
the existing `/`, Brief and experiments remain available. Promotion to the
homepage follows visual review.

Four objects use the existing project data: a newspaper, a mathematical orbit,
a photograph and a glass geometry study. Open an object to see a question,
project context and its real destination. Discovery follows a four-part trail,
remembered only for the current browser session. Surprise selects an unexplored
object first; completing the trail exposes a reset so visitors can start again.

Desktop grip buttons support pointer capture and arrow-key movement. Curated
shuffle layouts preserve space around the headline. Phone layouts use a normal
document grid: shuffle changes object order, with no touch, wheel or scroll
interception. The note is a non-modal dialog, dismissible with Escape; closing
restores focus to its trigger. Theme, locale and reduced motion remain shared
with the rest of the site. Without JavaScript, objects are direct project links.

The first screen is an optical playground. Three freely moving GPU lenses reuse
the shared engine over a controlled canvas plate. Their source is sampled using
the inverse of each lens's translation and rotation, so the clear body stays
aligned with the actual visible scene. Spectrum, photographs and typography are
different plates; depth adjusts the bevel. Dragging and rotation work with mouse,
touch and keyboard. Vertical phone gestures continue to scroll the document.

Optional lensPower, shapeWobble and shapePhase extend the shared kernel for convex
body magnification and a bounded, softly changing droplet contour. Defaults are
zero, preserving existing navigation optics. This remains an optical
approximation over a controlled scene, not compositor capture or a fluid solver.

Motion is capped at 30 desktop/20 phone draws per second; these are scheduling
caps, not measured GPU frame-rate guarantees. Pause, an offscreen stage or a
hidden document stops the animation loop. Reduced motion starts paused, with an
explicit play control. GPU context loss leaves a usable static CSS fallback.
The smaller glass study on the desk remains CSS. No third-party service,
analytics, backend or production deployment setting is added.

Local review: `npm ci`, `npm run validate`, then
`npm run preview -- --host 127.0.0.1 --port 4324` and open `/lab/`.
Interaction coverage lives in `tests/e2e/exploration-desk.spec.ts`.
