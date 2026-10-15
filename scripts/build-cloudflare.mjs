// Production promotion was approved by the owner on 2026-10-15. Only main
// may use the default deploy command; feature branches stay on previews.
import {execFileSync,execSync} from "node:child_process";
import {pathToFileURL} from "node:url";

export function assertWorkerCommand(command,branch){
 if(command==="deploy"&&branch==="main")return;
 if(!["versions upload","preview","dev","types"].includes(command)){
  throw new Error("Production deployment blocked outside approved main. Use Workers preview/version upload or the isolated jhlab-preview config.");
 }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.some(arg=>arg!=="--build-only"))throw new Error("Unknown Cloudflare build argument");
 const buildOnly=args.includes("--build-only");
 const branch=process.env.WORKERS_CI_BRANCH||process.env.GITHUB_REF_NAME||
  execFileSync("git",["branch","--show-current"],{encoding:"utf8"}).trim();
 // The dashboard Build command compiles every branch without uploading.
 // Wrangler's custom-build entry still enforces the existing release guard.
 if(!buildOnly)assertWorkerCommand(process.env.WRANGLER_COMMAND,branch);
 // Refresh only a remote-tracking ref. Shallow builds may otherwise reject an
 // actual fast-forward because the new parent history is outside their depth.
 execFileSync("git",["fetch","--no-tags","--depth=1","origin","+main:refs/remotes/origin/main"],{stdio:"inherit"});
 execFileSync(process.execPath,["scripts/sync-news-preview.mjs"],{stdio:"inherit"});
 // This literal command also resolves npm.cmd correctly on Windows.
 execSync("npm run build",{stdio:"inherit"});
}
