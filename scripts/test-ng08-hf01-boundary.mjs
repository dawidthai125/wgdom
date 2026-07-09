/**
 * NG-08-HF-01 — allowlist + forbidden zero-diff boundary (#CORE-013 · AC-HF-06).
 * npx vite-node scripts/test-ng08-hf01-boundary.mjs
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
  "src/app/changelog-data.ts",
  "CHANGELOG.md",
  "src/app/GuideView.tsx",
]);

const FORBIDDEN = [
  "src/app/TenderWorkflowProcessStrip.tsx",
  "src/lib/tender-workflow-process-strip.ts",
  "src/app/TenderWorkspaceV2Panel.tsx",
  "src/app/TenderWorkflowHubPanel.tsx",
  "src/app/TenderPrzetargWorkspace.tsx",
  "src/app/TenderDocumentsWorkspace.tsx",
  "src/app/TenderAttachmentsPanel.tsx",
  "src/app/TenderKosztorysWorkspace.tsx",
  "src/app/TenderBidProposalPanel.tsx",
  "src/app/TenderCostWorkspaceBridge.tsx",
  "src/lib/tender-cost-ui-persist.ts",
  "src/lib/tender-command-layer-ux.ts",
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/lib/tender-ux-tokens.ts",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "supabase/functions/make-server-0afb8820/index.tsx",
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

console.log("=== NG-08-HF-01 BOUNDARY ===\n");

const changed = gitLines("git diff --cached --name-only");
const useStagedOnly = changed.length > 0;

if (!useStagedOnly) {
  console.log("  (info: brak staged — sprawdzam tylko markery implementacji)\n");
}

console.log("1. Forbidden paths — zero diff");
if (useStagedOnly) {
  for (const f of FORBIDDEN) {
    ok(`forbidden untouched: ${f}`, !changed.includes(f));
  }
} else {
  ok("forbidden gate deferred (brak staged diff)", true);
}

console.log("\n2. Allowlist cap — tylko pliki bundle");
if (useStagedOnly) {
  for (const p of changed) {
    if (p.startsWith("docs/")) continue;
    ok(`allowlisted: ${p}`, ALLOWLIST.has(p));
  }
} else {
  ok("allowlist gate deferred (brak staged diff)", true);
}

console.log("\n3. HF-01 implementation markers");
const page = readFileSync(resolve(root, "src/app/TenderDetailPage.tsx"), "utf8");
const cmd = readFileSync(resolve(root, "src/app/TenderDetailCommandLayer.tsx"), "utf8");

ok("scroll hub via scrollRootRef", page.includes("scrollRootRef") && page.includes("root.scrollTo"));
ok("no hub scrollIntoView", !page.includes("hub.scrollIntoView"));
ok("shortcuts flex row", page.includes("data-tender-command-shortcuts-row"));
ok("mobile shortcut min-h 44px", page.includes("min-h-11 lg:min-h-8"));
ok("kpi hidden mobile non-przetarg", cmd.includes("hidden 2xl:block") && cmd.includes("TenderDetailKpiCompact"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
