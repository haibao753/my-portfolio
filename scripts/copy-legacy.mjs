/* Preserve existing routes, JSON feed and legacy assets while migrating to Astro.
 * This is a bridge, not permanent architecture. The source paths are deliberately
 * unchanged so the separate news publishing workflow remains compatible. */
import {cpSync,existsSync,mkdirSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd(),out=join(root,"dist");
for(const path of ["assets","images","experiments","brief"]){
 const src=join(root,path);
 if(!existsSync(src))continue;
 const dst=join(out,path);
 mkdirSync(dst,{recursive:true});
 // Brief is not yet migrated: preserve the legacy HTML and its /data/*.json.
 // Assets and experiment pages remain at their historic addresses.
 cpSync(src,dst,{recursive:true,force:true});
}
console.log("Legacy assets, experiments, and /brief/ preserved in Astro dist.");
