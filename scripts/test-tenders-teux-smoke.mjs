#!/usr/bin/env node
/**
 * TEUX-7z — Smoke agregat NG-06-TEUX (SMOKE-TEUX-NG06)
 * Thin wrapper — spawn only, zero importów src/lib (#027).
 *
 * Uruchom:
 *   npx vite-node scripts/test-tenders-teux-smoke.mjs
 *   npm run test:infra -- --suite smoke-teux
 */
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** SSOT kolejności child scripts — NG-06-TEUX Design Freeze § TEUX-7z (#028) */
const CHILD_SCRIPTS = [
  "scripts/test-tender-detail-nav-teux1.mjs",
  "scripts/test-tender-ux-tokens-teux2.mjs",
  "scripts/test-tender-list-cards-teux3.mjs",
  "scripts/test-tender-mobile-teux4.mjs",
  "scripts/test-tender-loading-teux5.mjs",
  "scripts/test-tender-empty-states-teux6.mjs",
  "scripts/test-tender-filters-teux7a.mjs",
  "scripts/test-tender-command-teux7b.mjs",
  "scripts/test-tender-a11y-teux7c.mjs",
  "scripts/test-tender-copy-teux7d.mjs",
  "scripts/test-tender-strategy-teux7e.mjs",
  "scripts/test-tender-hosted-deprecation-teux7f.mjs",
];

function main() {
  console.log("\n=== SMOKE-TEUX-NG06 (TEUX-7z) ===\n");

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
      console.error(`\n=== SMOKE-TEUX-NG06: ${passed}/${total} PASS — ABORT ===\n`);
      process.exit(1);
    }

    passed++;
    console.log(`\nPASS ${label} (${ms}ms)\n`);
  }

  console.log(`\n=== SMOKE-TEUX-NG06: ${passed}/${total} PASS ===\n`);
  process.exit(0);
}

main();
