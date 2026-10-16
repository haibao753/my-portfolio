# Hu Jinhai — independent portfolio preview

Open `/lab/` on the branch preview. The production homepage and existing routes
remain available. This draft awaits visual review before homepage promotion.

The opening identifies the owner and the site's purpose immediately: a personal
portfolio of mathematical animations, interactive experiments and photography.
Two prominent actions let visitors view the work index or launch the real
geometry experiment directly. The sculpture has visible play instructions;
its palette controls are explicitly lighting controls. Project cards use
functional names and explain that opening a card reveals details and its
full-project link. The visual treatment remains the same optical composition.

Native scrolling now controls a reversible reading journey. On wide screens the
opening holds briefly while the actual optical shader turns, reshapes and draws
back; phones retain the normal flowing opening. Project posters settle into
place as they are read. A small glass navigation guide shows reading progress
and links directly to the introduction, work and contact sections. Scroll work
is event-driven and coalesced into one frame, with no wheel interception or idle
animation loop. Reduced motion removes pinning and entrance transforms; pausing
the sculpture also disables its scroll deformation. Without JavaScript the
ordinary layout and all original project links remain available.

The full-height opening combines original typography, an orbital light plate and
a living three-dimensional optical sculpture. Its signed-distance field blends
two joined rings with a soft body; a bounded ray march finds the surface and its
normal. The shader extends the shared optical kernel's vertex interface with
scene-texture refraction, RGB dispersion, Schlick Fresnel reflection and an
analytical light environment. It is an optical approximation, not a path tracer
or fluid simulation. Only the controlled canvas plate is sampled, not browser
composited DOM. No generated bitmap or external visual service is required.

Pointer movement changes the sculpture's orientation. Touch, click, Enter or
Space on its native button changes form and sends a visible pulse. Three worlds
change palette, environment and form: Mercury, Prism and Aurora. Pause freezes
the animation clock; palette and keyboard controls remain available. Native
vertical phone scrolling is preserved. A single bounded framebuffer (maximum
680px desktop / 400px phone dimension) limits GPU work; the 30/20 draw scheduling
caps are not measured frame-rate guarantees. Hidden/offscreen scenes stop the
loop. Reduced motion starts paused. Context loss uses the static CSS sculpture;
project links remain functional without JavaScript.

The immersive header uses a legible transparent treatment. The ordinary DOM
raster adapters skip this route because they cannot sample its canvas world;
navigation on the existing homepage retains its optical material. Shared menu,
locale, theme and contact controls remain available.

Below the opening, four original editorial posters reuse real project data.
Desktop visitors can curate their positions with the grip or keyboard. Phone
posters follow normal document flow and shuffle their order. The four-stop
discovery trail, non-modal details, focus restoration and session-only progress
remain supported. Theme and locale work throughout.

The earlier draggable, rotating two-dimensional glass studies are retained at
`/lab/glass/`, including full circle/capsule/droplet morphing, background and
depth controls. Both renderers preserve the current production optical defaults.
Private Brief data and its schema, production commands, domains and DNS are
unchanged.

Local review: `npm ci`, `npm run validate`,
`npm run preview -- --host 127.0.0.1 --port 4324`.
Browser coverage: `optical-universe.spec.ts`, `exploration-desk.spec.ts` and
`liquid-motion.spec.ts`, alongside the existing homepage and optical regressions.
