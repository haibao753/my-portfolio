/* Preserve existing routes, JSON feed and legacy assets while migrating to Astro.
 * This is a bridge, not permanent architecture. The source paths are deliberately
 * unchanged so the separate news publishing workflow remains compatible. */
import {cpSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {join} from "node:path";
const root=process.cwd(),out=join(root,"dist");
for(const path of ["assets","images","experiments"]){
 const src=join(root,path);
 if(!existsSync(src))continue;
 const dst=join(out,path);
 mkdirSync(dst,{recursive:true});
 // Keep the existing assets and experiment pages at their historic addresses.
 cpSync(src,dst,{recursive:true,force:true});
}
// Only copy the JSON feed. Astro owns dist/brief/index.html; never overwrite it.
const briefData=join(root,"brief","data");
if(existsSync(briefData)){
 const target=join(out,"brief","data");
 mkdirSync(target,{recursive:true});
 cpSync(briefData,target,{recursive:true,force:true});
}
console.log("Astro owns /brief/; preserved legacy assets, experiments and /brief/data/*.json.");
const commit=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
writeFileSync(join(out,"deployment.json"),JSON.stringify({version:1,commit,built_at:new Date().toISOString()},null,2)+"\n");
