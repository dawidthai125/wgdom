/**
 * NG-03.4 — Workspace density: compact V2, accordions, operator collapse.
 * npx vite-node scripts/test-ng-03-4-workspace-density.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

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

console.log("=== NG-03.4 WORKSPACE DENSITY ===\n");

const v2 = readFileSync(resolve(root, "src/app/TenderWorkspaceV2Panel.tsx"), "utf8");
const hub = readFileSync(resolve(root, "src/app/TenderWorkflowHubPanel.tsx"), "utf8");
const przetarg = readFileSync(resolve(root, "src/app/TenderPrzetargWorkspace.tsx"), "utf8");
const monitoring = readFileSync(resolve(root, "src/app/TenderMonitoringBanner.tsx"), "utf8");

console.log("1. V2 hub density");
ok("hubDensity prop", v2.includes("hubDensity"));
ok("hide timeline when density", v2.includes("!hubDensity"));
ok("checklist compact export", v2.includes("TenderWorkspaceV2ChecklistCompact"));
ok("compact marker", v2.includes("data-tender-workspace-v2-checklist-compact"));
ok("max 5 preview", v2.includes("HUB_CHECKLIST_PREVIEW = 5"));

console.log("\n2. Hub accordion content");
ok("hub passes hubDensity", hub.includes("hubDensity={commandLayerActive}"));
ok("hub uses checklist compact", hub.includes("TenderWorkspaceV2ChecklistCompact"));
ok("no operator in hub", !hub.includes("operatorSection"));

console.log("\n3. Przetarg layout order");
ok("info accordion", przetarg.includes("data-tender-info-accordion"));
ok("operator accordion", przetarg.includes("data-tender-operator-accordion"));
ok("operator default closed (no open attr)", !przetarg.includes('data-tender-operator-accordion"\n        open'));
ok("decyzja link in przetarg", przetarg.includes("onNavigateTab(\"decyzja\")"));
ok("participation preview limit", przetarg.includes("PARTICIPATION_PREVIEW_LINES"));
ok("kwalifikacja deep link", przetarg.includes('decyzjaWorkspace: "qualification"'));

console.log("\n4. Monitoring compact");
ok("compact prop", monitoring.includes("compact"));
ok("compact marker", monitoring.includes('data-tender-monitoring-banner'));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
