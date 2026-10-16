# J.H. Lab — Living Editorial implementation guide

Track delivery in [GitHub issue #23](https://github.com/haibao753/my-portfolio/issues/23).

## Editorial north star
**Discover → Understand → Experiment.** A feature stays only if it helps readers learn something that ordinary text cannot show as well. Motion follows reader intent; focused reading stays still.

## Release boundaries
- Astro src is the only production source. Build dist. Do not edit legacy brief HTML or daily-brief automation.
- No generic spatial news sphere. Previously built experimental graph is excluded from public default.
- A mathematical experiment lives on its own route first. No compulsory popups or homepage reorganization.
- GitHub CI validates implementation; review actual mobile rendering before a public navigation link.
- Keep bilingual content, keyboard navigation, reduced-motion settings, theme and copyable text.
- Reuse native browser rendering where possible; do not add Three.js until there is a real 3D visualization requiring it.

## M0 — stabilize
- [x] Hide ineffective general-purpose graph from ordinary readers (PR #22).
- [ ] Capture visual baseline on mobile and desktop; confirm public daily brief is unaffected.

## M1 — living reading
- [ ] Emphasize one lead story, other stories progressively disclosed.
- [ ] Preserve focus and article position through expansion/collapse.
- [ ] Review Chinese and English content hierarchy and remove redundant notices.
- [ ] Mobile 390px, keyboard, dark/light and accessibility acceptance.

## M2 — Lab 001: SO(3) noncommutativity
- [x] Identify an experimental question with a concrete learning payoff.
- [x] Build two matrix-driven cube visualizations for X→Y versus Y→X.
- [x] Angle controls, camera controls, reset, and numerical comparison.
- [x] Text/math comparison remains accessible without canvas.
- [ ] Desktop/mobile Playwright tests pass.
- [ ] Check mobile screenshot and tap/drag behavior in preview.
- [ ] Publicly link it only after visual acceptance.

**Math convention:** column vectors, so X→Y = Ry·Rx. At 90° on both axes, the initial front vector eZ ends at (0,-1,0) in the first order and (1,0,0) in the second. Matrix difference is measured by Frobenius norm.

## M3 — integrate without interrupting reading
- [ ] Add one clearly relevant article link to its experiment (only after contextual review).
- [ ] No autoplay/3D modal, restore reading location, accessible back navigation.

## M4 — credible knowledge links
- [ ] Start from 5–10 editorially reviewed concept/related research/application links.
- [ ] Each link explains the relationship and gives a primary source.
- [ ] No unverified automatic semantic lines.

## M5 — quality and sustainable publishing
- [ ] Mobile overflow 390x844 and desktop 1440x900 tested.
- [ ] Theme, bilingual, reduced motion, keyboard, graphic-disabled fallback.
- [ ] Check idle CPU: no persistent frame loop while not interacting.
- [ ] Reader evaluation: can a first-time visitor explain what they learned?
- [ ] Maintain only features that meaningfully improve discovery, understanding or experimentation.

## PR acceptance report template
**Changed:** files and visible behavior.
**Tested:** precise CI run and viewport.
**Unverified:** actual phone/browser visual checks.
**Rollback:** revert the single feature PR; data pipeline untouched.
