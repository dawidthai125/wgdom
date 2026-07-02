#!/usr/bin/env node
/**
 * TI-B4 — Smoke agregat Przetargi NG-01–NG-04 (R-02 · Z-04)
 * Thin wrapper — spawn only, zero importów src/lib (#027).
 *
 * Uruchom:
 *   npx vite-node scripts/test-tenders-stabilization-smoke.mjs
 *   npm run test:infra -- --suite smoke-stabilization-ng01-04
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** SSOT kolejności child scripts — DESIGN FREEZE TI-B4 v1.0 (#028) */
const CHILD_SCRIPTS = [
  "scripts/test-tender-trust-layer.mjs",
  "scripts/test-tender-pipeline-automation-p0.mjs",
  "scripts/test-tender-documents-bootstrap-retry.mjs",
  "scripts/test-unified-attachment-gate.mjs",
  "scripts/test-tender-dossier-heavy-lifecycle.mjs",
  "scripts/test-ng-03-2-command-layer.mjs",
  "scripts/test-p0-tender-detail-ssot-tab.mjs",
  "scripts/test-ng04-kosztorys-boq-explorer.mjs",
  "scripts/test-ng04-2-benchmark-per-line.mjs",
  "scripts/test-ng04-3-ath-fidelity.mjs",
  "scripts/test-ng04-4-polish-epic-close.mjs",
  "scripts/test-tender-kosztorys-process-health.mjs",
];

function main() {
  console.log("\n=== SMOKE-TENDERS-NG01-04 (TI-B4) ===\n");

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
      console.error(`\n=== SMOKE-TENDERS-NG01-04: ${passed}/${total} PASS — ABORT ===\n`);
      process.exit(1);
    }

    passed++;
    console.log(`\nPASS ${label} (${ms}ms)\n`);
  }

  console.log(`\n=== SMOKE-TENDERS-NG01-04: ${passed}/${total} PASS ===\n`);
  process.exit(0);
}

main();
