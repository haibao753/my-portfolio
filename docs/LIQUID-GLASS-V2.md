# Liquid Glass V2

The homepage and Brief use V2 by default. `?opticalEngine=0` disables the GPU
material, `?opticalEngine=1` selects the classic comparison, and
`?opticalEngine=2` explicitly selects V2. Explicit choices stay in internal
navigation links; ordinary URLs remain clean. Reduced motion keeps the CSS
fallback, and context loss or a change to reduced transparency returns to it.

The rounded-rectangle distance field, meniscus width, inward displacement and
subpixel RGB dispersion are measured in CSS pixels. The centre remains clear
and the bevel stays the same size across aspect ratios and device pixel ratios.
The shader samples the existing reconstructed scene, with a directional Fresnel
highlight. Normal alpha compositing preserves colour instead of multiplying it.

Pointer lighting redraws existing GPU input without repainting or uploading the
scene. Navigation text chooses between light and dark ink using nine samples of
the reconstructed background beneath each control. Theme and locale changes
invalidate the source; the end of a theme transition refreshes its final colour.
There is no idle animation loop.

The navbar uses the WebGL material. The mobile disclosure has matching CSS glass
styling and accessible HTML links. The source adapter is still an approximate
DOM reconstruction, not browser-compositor capture or a general ray tracer;
unsupported CSS effects and third-party media do not become exact scene pixels.

Validation: Astro check and build, preserved-route validation and three release
guard tests pass. All 122 Chromium desktop/mobile tests pass locally without
retries or skips. New coverage checks the unchanged centre, displaced edges,
rounded-corner transparency, DPR consistency, GPU upload reuse, adaptive ink,
theme updates, context loss and reduced motion. Simulated mobile is not a native
device or visual acceptance claim. Coverage also verifies default activation on
both routes, clean default navigation links and the explicit disable option.
