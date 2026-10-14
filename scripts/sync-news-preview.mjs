/* Preview-only: use latest main-branch news files in CI workspace.
 * Does not commit data, touch the publisher, or alter any git branch.
 * Local builds can continue using the checked-out snapshot. */
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {dirname} from "node:path";
const root="brief/data/";
function git(...args){return execFileSync("git",args,{encoding:"utf8",maxBuffer:12*1024*1024});}
let files=[];
try{
 files=git("ls-tree","-r","--name-only","origin/main","--",root).trim().split("\n")
  .filter(p=>p.startsWith(root)&&/^brief\/data\/(?:index|\d{4}-\d{2}-\d{2})\.json$/.test(p));
}catch(error){
 console.error("Cannot read main branch news files. Preview build stopped.",error);
 process.exit(1);
}
if(!files.includes("brief/data/index.json")){
 console.error("Missing main branch news index; not publishing a stale preview.");
 process.exit(1);
}
for(const path of files){
 const contents=git("show",`origin/main:${path}`);
 JSON.parse(contents);
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,contents);
}
const index=JSON.parse(git("show","origin/main:brief/data/index.json"));
console.log(`Preview news synchronized: ${files.length} JSON files, latest index ${(index.dates??[])[0]??"empty"}`);
