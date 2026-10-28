import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {requiredFiles} from "./site-contract.mjs";
const paths=requiredFiles.map(path=>join("dist",path));
let failed=false;
for(const path of paths){
 const exists=existsSync(path);
 console.log(`${exists?"OK":"MISSING"} ${path}`);
 if(!exists)failed=true;
}
if(!failed){
 // The archive grows daily: validate index references rather than pinning a single date.
 const dataRoot=join("dist","brief","data");
 let index;
 try{
  index=JSON.parse(readFileSync(join(dataRoot,"index.json"),"utf8"));
  if(!Array.isArray(index.dates)||index.dates.length===0)throw Error("empty or missing dates");
  if(new Set(index.dates).size!==index.dates.length)throw Error("duplicate dates");
  if(index.dates.some(date=>!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)))throw Error("invalid date");
  if(index.dates.some((date,i)=>i>0&&date>index.dates[i-1]))throw Error("dates not newest-first");
  for(const date of index.dates){
   const issuePath=join(dataRoot,`${date}.json`);
   if(!existsSync(issuePath))throw Error(`missing issue ${date}`);
   const issue=JSON.parse(readFileSync(issuePath,"utf8"));
   if(issue.date!==date||!Array.isArray(issue.items))throw Error(`invalid issue schema ${date}`);
  }
  console.log(`OK archive: ${index.dates.length} issues, newest ${index.dates[0]}`);
 }catch(error){console.error("Invalid published news archive:",error);failed=true;}
}
if(!failed){
 const html=readFileSync(join("dist","index.html"),"utf8");
 const images=[...html.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]).filter(image=>image.includes("data-portfolio-photo"));
 if(images.length!==3||images.some(image=>!image.includes("srcset=")||!image.includes(".webp")||image.includes('/images/'))){
  console.error("Photo strip must contain three responsive optimized images");failed=true;
 }
 for(const path of ["index.html","brief/index.html"]){
  const page=readFileSync(join("dist",path),"utf8");
  const url=path==="index.html"?"https://hujinhai.com/":"https://hujinhai.com/brief/";
  if(!page.includes(`rel="canonical" href="${url}"`)||!page.includes(`property="og:url" content="${url}"`)){
   console.error("Incorrect production canonical or sharing URL:",path);failed=true;
  }
 }
 for(const url of ["/brief/","https://space.bilibili.com/1572685586","https://zhengyifan.win/","/experiments/minimal-surfaces-classical.html","/experiments/minimal-surfaces-periodic.html","https://entropy-sandbox.pages.dev/"]){
  // Astro may serialize or escape attributes; check URL presence.
  if(!html.includes(url)){console.error("Missing portfolio URL:",url);failed=true;}
 }
}
if(!failed){
 const brief=readFileSync(join("dist","brief","index.html"),"utf8");
 if(!brief.includes("id=\"stories\"")||!brief.includes("id=\"issues\"")||!brief.includes("id=\"tabs\"")){
  console.error("Missing Astro Brief app mount nodes");failed=true;
 }
 if(!brief.includes("data-theme-toggle")||!brief.includes("data-language-toggle")){
  console.error("Shared navigation controls missing from Brief");failed=true;
 }
 if(!brief.includes("brief-reader")&&!brief.includes("news-card")){
  // Note: compiled JS is emitted as a separate hashed script by Astro.
  console.log("Brief interactive reader emitted as Astro script bundle.");
 }
}
if(failed)process.exitCode=1;
