/**
 * FND-03 COMPLETE — agregator suite (03a + 03b + final).
 * Run: npx vite-node scripts/test-foundation-fnd-03.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const suites = [
  "scripts/test-foundation-fnd-03a-create.mjs",
  "scripts/test-foundation-fnd-03b-serialize.mjs",
  "scripts/test-foundation-fnd-03-final.mjs",
];

let failed = 0;

console.log("=== FND-03 FULL PACKAGE ===\n");

for (const rel of suites) {
  console.log(`\n--- running ${rel} ---\n`);
  const r = spawnSync("npx", ["vite-node", rel], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    failed += 1;
    console.log(`\nSUITE FAIL ${rel} exit=${r.status}`);
  } else {
    console.log(`\nSUITE PASS ${rel}`);
  }
}

console.log(`\n=== FND-03 PACKAGE ${failed === 0 ? "COMPLETE PASS" : `FAIL (${failed} suites)`} ===`);
if (failed > 0) process.exit(1);
