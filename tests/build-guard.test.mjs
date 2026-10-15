import test from "node:test";
import assert from "node:assert/strict";
import {assertWorkerCommand} from "../scripts/build-cloudflare.mjs";

test("default deploy cannot publish an unapproved experimental design",()=>{
 assert.throws(()=>assertWorkerCommand("deploy","experiment/liquid-glass-3d-optics"),/Production deployment blocked/);
 assert.throws(()=>assertWorkerCommand("deploy",undefined),/Production deployment blocked/);
 assert.throws(()=>assertWorkerCommand(undefined,"main"),/Production deployment blocked/);
});

test("version uploads and isolated previews can build without production promotion",()=>{
 assert.doesNotThrow(()=>assertWorkerCommand("versions upload","experiment/liquid-glass-3d-optics"));
 assert.doesNotThrow(()=>assertWorkerCommand("preview","experiment/liquid-glass-3d-optics"));
});

test("the owner-approved main branch may publish production",()=>{
 assert.doesNotThrow(()=>assertWorkerCommand("deploy","main"));
});
