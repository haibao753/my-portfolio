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

The existing optical engine and all production deployment settings are reused.
The glass study on the desk is a CSS material, while the navigation keeps the
existing WebGL engine. No third-party service, analytics or backend is added.

Local review: `npm ci`, `npm run validate`, then
`npm run preview -- --host 127.0.0.1 --port 4324` and open `/lab/`.
Interaction coverage lives in `tests/e2e/exploration-desk.spec.ts`.
