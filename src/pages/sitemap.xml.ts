import type { APIRoute } from "astro";

// Experiment URLs remain in the legacy copy bridge until their deliberate migration.
const paths = ["/", "/brief/", "/experiments/minimal-surfaces-classical.html", "/experiments/minimal-surfaces-periodic.html"];
export const GET: APIRoute = ({ site }) => new Response(
 `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, site)}</loc></url>`).join("")}</urlset>`,
 { headers: { "Content-Type": "application/xml; charset=utf-8" } }
);
