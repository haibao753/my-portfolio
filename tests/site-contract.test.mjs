import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { copyLegacyAssets, legacyDirectories } from "../scripts/site-contract.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "jhlab-contract-"));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test("the copy bridge preserves Astro HTML and publishes the original JSON bytes", t => {
  const root = fixture(t);
  for (const directory of legacyDirectories) mkdirSync(join(root, directory), { recursive: true });
  mkdirSync(join(root, "dist/brief"), { recursive: true });
  writeFileSync(join(root, "dist/brief/index.html"), "Astro reader");
  writeFileSync(join(root, "brief/index.html"), "Old reader");
  const json = '{"dates":["2026-10-21"],"publisher_extension":true}\n';
  writeFileSync(join(root, "brief/data/index.json"), json);
  copyLegacyAssets(root);
  assert.equal(readFileSync(join(root, "dist/brief/index.html"), "utf8"), "Astro reader");
  assert.equal(readFileSync(join(root, "dist/brief/data/index.json"), "utf8"), json);
});

test("a missing source fails before publishing any partial copy", t => {
  const root = fixture(t);
  for (const directory of ["assets", "images", "experiments"]) mkdirSync(join(root, directory), { recursive: true });
  assert.throws(() => copyLegacyAssets(root), /Missing required legacy directory: brief\/data/);
  assert.equal(existsSync(join(root, "dist")), false);
});
