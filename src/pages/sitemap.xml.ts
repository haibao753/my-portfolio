import type { APIRoute } from "astro";
import routes from "../data/routes.json";

// Experiment URLs remain in the legacy copy bridge until their deliberate migration.
const paths = routes.filter(route => route.sitemap).map(route => route.path);
export const GET: APIRoute = ({ site }) => new Response(
 `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${new URL(path, site)}</loc></url>`).join("")}</urlset>`,
 { headers: { "Content-Type": "application/xml; charset=utf-8" } }
);
