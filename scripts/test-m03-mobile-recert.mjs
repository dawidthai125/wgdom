/**
 * M-03 — Mobile Re-certification boundary + implementation markers.
 * npx vite-node scripts/test-m03-mobile-recert.mjs
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

const ALLOWLIST = new Set([
  "src/app/TenderDetailPage.tsx",
  "src/app/TenderDetailCommandLayer.tsx",
  "e2e/audit-p0-tender-freeze.spec.ts",
  "scripts/test-ng08-hf01-boundary.mjs",
  "scripts/test-p0-command-layer-height.mjs",
  "scripts/test-m03-mobile-recert.mjs",
]);

const FORBIDDEN = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/app/App.tsx",
  "src/lib/tender-ux-tokens.ts",
  "src/lib/tender-workflow-primary-action.ts",
  "src/lib/tender-command-layer-ux.ts",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/TenderStatusRibbon.tsx",
  "src/app/TenderWorkflowProcessStrip.tsx",
  "src/app/TenderDetailTabBar.tsx",
  "src/app/TenderWorkflowPrimaryAction.tsx",
];

function norm(p) {
  return normalize(p).replace(/\\/g, "/");
}

function gitLines(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map(norm);
  } catch {
    return [];
  }
}

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("=== M-03 MOBILE RECERT ===\n");

const changed = gitLines("git diff --cached --name-only");
const useStagedOnly = changed.length > 0;

if (!useStagedOnly) {
  console.log("  (info: brak staged — sprawdzam markery implementacji)\n");
}

console.log("1. Forbidden paths — zero diff");
if (useStagedOnly) {
  for (const f of FORBIDDEN) {
    ok(`forbidden untouched: ${f}`, !changed.includes(f));
  }
} else {
  ok("forbidden gate deferred (brak staged diff)", true);
}

console.log("\n2. Allowlist cap");
if (useStagedOnly) {
  for (const p of changed) {
    if (p.startsWith("docs/")) continue;
    ok(`allowlisted: ${p}`, ALLOWLIST.has(p));
  }
} else {
  ok("allowlist gate deferred (brak staged diff)", true);
}

console.log("\n3. M-03 implementation markers");
const page = read("src/app/TenderDetailPage.tsx");
const cmd = read("src/app/TenderDetailCommandLayer.tsx");
const e2e = read("e2e/audit-p0-tender-freeze.spec.ts");

ok("no legacy 391 breakpoint in cmd", !cmd.includes("max-[391px]"));
ok("phone breakpoint 430 in cmd", cmd.includes("max-[430px]:"));
ok("kpi max-lg hidden", cmd.includes("hidden 2xl:block"));
ok("shortcut min-h-11 lg", page.includes("min-h-11 lg:min-h-8"));
ok("shortcut row max-430 gap", page.includes("max-[430px]:gap-1"));
ok("phone padding parity unified shell", cmd.includes("max-[430px]:px-3 max-[430px]:py-1 max-[430px]:space-y-0.5"));
ok("compact breadcrumb hidden phone", cmd.includes("max-[430px]:hidden") && cmd.includes("data-tender-workspace-breadcrumb-compact"));
ok("HF-01 scroll root preserved", page.includes("scrollRootRef"));
ok("M-03 cta phone harmonization", page.includes("max-[430px]:[&_[data-teux7d-cta-description]]:hidden"));
ok("e2e tab delta helper", e2e.includes("measureCommandLayerTabDelta"));
ok("e2e viewport 430", e2e.includes("430"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
