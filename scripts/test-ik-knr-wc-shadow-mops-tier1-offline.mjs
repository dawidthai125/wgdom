#!/usr/bin/env node
/**
 * IK-KNR-WC SHADOW MOPS — Tier-1 offline orchestrator (spawn-only · TI-B4 pattern)
 *
 * npx node scripts/test-ik-knr-wc-shadow-mops-tier1-offline.mjs
 *
 * MOPS SHADOW PATH = CREATE 0 (P1 dry-run).
 * P3 regression harness contains isolated mock CREATE in test environment only —
 * not MOPS authority CREATE and not production CREATE.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** SSOT child order — REAL TENDER SHADOW TEST #01 */
const CHILD_SCRIPTS = [
  "scripts/test-ik-knr-wc-identity-bridge-p1.mjs",
  "scripts/test-ik-knr-wc-identity-bridge-p21-persist.mjs",
  "scripts/test-ik-knr-wc-identity-bridge-p22.mjs",
  "scripts/test-ik-knr-wc-identity-bridge-p2ui.mjs",
  "scripts/test-ik-knr-wc-identity-bridge-p3.mjs",
];

function main() {
  console.log("\n=== IK-KNR-WC SHADOW MOPS TIER-1 OFFLINE ===\n");
  console.log(
    "NOTE: P1 = MOPS shadow dry-run / CREATE=0.\n" +
      "P3 contains isolated T-P3-* CREATE in mock/test environment only —\n" +
      "not MOPS authority CREATE and not production CREATE.\n" +
      "Do not report 'TIER-1 = ZERO CREATE' — use:\n" +
      "  MOPS SHADOW PATH = CREATE 0;\n" +
      "  P3 regression harness contains isolated mock CREATE.\n",
  );

  for (const rel of CHILD_SCRIPTS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(`FAIL setup: missing child script ${rel}`);
      process.exit(1);
    }
  }

  let passed = 0;
  const total = CHILD_SCRIPTS.length;

  for (let i = 0; i < CHILD_SCRIPTS.length; i++) {
    const rel = CHILD_SCRIPTS[i];
    const label = `[${i + 1}/${total}] ${rel}`;
    console.log(`\n--- ${label} ---\n`);
    const started = Date.now();
    const result = spawnSync("npx", ["vite-node", rel], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
    const ms = Date.now() - started;

    if (result.status !== 0) {
      console.error(`\nFAIL ${label} (${ms}ms)\n`);
      console.error(`\n=== IK-KNR-WC SHADOW MOPS TIER-1: ${passed}/${total} PASS — ABORT ===\n`);
      process.exit(1);
    }

    passed++;
    console.log(`\nPASS ${label} (${ms}ms)\n`);
  }

  console.log(`\n=== IK-KNR-WC SHADOW MOPS TIER-1: ${passed}/${total} PASS ===\n`);
  process.exit(0);
}

main();
