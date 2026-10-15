import test from "node:test";
import assert from "node:assert/strict";
import {assertPreviewCommand} from "../scripts/build-workers-preview.mjs";

test("default deploy cannot publish an unapproved experimental design",()=>{
 assert.throws(()=>assertPreviewCommand("deploy"),/Production deployment blocked/);
 assert.throws(()=>assertPreviewCommand(undefined),/Production deployment blocked/);
});

test("version uploads and isolated previews can build without production promotion",()=>{
 assert.doesNotThrow(()=>assertPreviewCommand("versions upload"));
 assert.doesNotThrow(()=>assertPreviewCommand("preview"));
});
