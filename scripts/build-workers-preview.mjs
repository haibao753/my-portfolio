// This root config is for the experimental branch's Workers VERSION/PREVIEW
// check. It must never turn an accidental default deploy into a production
// design release. The dedicated preview config remains independently usable.
import {execFileSync} from "node:child_process";
import {pathToFileURL} from "node:url";

export function assertPreviewCommand(command){
 if(!["versions upload","preview","dev","types"].includes(command)){
  throw new Error("Production deployment blocked on the experimental branch. Use Workers preview/version upload or the isolated jhlab-preview config; main/design promotion requires approval.");
 }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 assertPreviewCommand(process.env.WRANGLER_COMMAND);
 execFileSync("git",["fetch","--no-tags","--depth=1","origin","main:refs/remotes/origin/main"],{stdio:"inherit"});
 execFileSync(process.execPath,["scripts/sync-news-preview.mjs"],{stdio:"inherit"});
 execFileSync("npm",["run","build"],{stdio:"inherit"});
}
