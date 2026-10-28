/* Preserve existing routes, JSON feed and legacy assets while migrating to Astro.
 * This is a bridge, not permanent architecture. The source paths are deliberately
 * unchanged so the separate news publishing workflow remains compatible. */
import {writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
import {copyLegacyAssets} from "./site-contract.mjs";
const root=process.cwd(),out=join(root,"dist");
copyLegacyAssets(root,out);
console.log("Astro owns /brief/; preserved legacy assets, experiments and /brief/data/*.json.");
const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
writeFileSync(join(out,"deployment.json"),JSON.stringify({version:1,commit,built_at:new Date().toISOString()},null,2)+"\n");
