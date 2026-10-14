import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";
const paths=[
 "dist/index.html",
 "dist/brief/index.html",
 "dist/brief/data/index.json",
 "dist/experiments/minimal-surfaces-classical.html",
 "dist/experiments/minimal-surfaces-periodic.html",
 "dist/assets/jh-orbit.svg",
 "dist/assets/jhlab-signature.svg",
 "dist/images/1.jpg"
];
let failed=false;
for(const path of paths){
 const exists=existsSync(path);
 console.log(`${exists?"OK":"MISSING"} ${path}`);
 if(!exists)failed=true;
}
if(!failed){
 const html=readFileSync(join("dist","index.html"),"utf8");
 for(const url of ["/brief/","https://space.bilibili.com/1572685586","https://zhengyifan.win/","/experiments/minimal-surfaces-classical.html","/experiments/minimal-surfaces-periodic.html","https://entropy-sandbox.pages.dev/"]){
  // Astro may serialize or escape attributes; check URL presence.
  if(!html.includes(url)){console.error("Missing portfolio URL:",url);failed=true;}
 }
}
if(failed)process.exitCode=1;
