import { cpSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import routes from "../src/data/routes.json" with { type: "json" };

// Astro owns route HTML and public/. The publisher owns brief/data/.
// Never copy the legacy brief/index.html over the Astro reader.
export const legacyDirectories = Object.freeze(["assets", "images", "experiments", "brief/data"]);
export const requiredFiles = Object.freeze([
  ...routes.map(route => route.file),
  "robots.txt", "sitemap.xml", "deployment.json", "brief/data/index.json",
  "assets/jh-orbit.svg", "assets/jhlab-signature.svg", "images/1.jpg",
  "videos/Video_1792127365800_461.mp4", "videos/Video_1792127358357_245.mp4",
  "videos/Image_1792128356424_594.jpg", "videos/Image_1792128445417_362.jpg"
]);

export function copyLegacyAssets(root, out = join(root, "dist")) {
  // Validate every source before copying anything; missing content is a build error.
  for (const directory of legacyDirectories) {
    if (!statSync(join(root, directory), { throwIfNoEntry: false })?.isDirectory()) {
      throw Error(`Missing required legacy directory: ${directory}`);
    }
  }
  for (const directory of legacyDirectories) {
    mkdirSync(join(out, directory), { recursive: true });
    cpSync(join(root, directory), join(out, directory), { recursive: true, force: true });
  }
}
