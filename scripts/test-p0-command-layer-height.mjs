/**
 * P0 — Command Layer height regression (Design Freeze §2.1).
 * npx vite-node scripts/test-p0-command-layer-height.mjs
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

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

console.log("=== P0 COMMAND LAYER HEIGHT ===\n");

console.log("1. Design Freeze — bez scrollu Command Layer");
const cmd = read("src/app/TenderDetailCommandLayer.tsx");
ok("command layer bez overflow-y-auto", !cmd.includes("overflow-y-auto"));
ok("command layer marker", cmd.includes("data-tender-command-layer"));
ok("przetarg chrome tighter spacing", cmd.includes("data-tender-command-przetarg"));
ok("kpi ukryte na tab przetarg", cmd.includes("!przetargChrome"));

console.log("\n2. Compact / Ultra Compact Ribbon + WF-02 strip");
const ribbon = read("src/app/TenderStatusRibbon.tsx");
const page = read("src/app/TenderDetailPage.tsx");
ok("ribbon density compact marker", ribbon.includes('data-tender-ribbon-density="compact"'));
ok("trust ribbon only (no strip in ribbon)", ribbon.includes("data-tender-trust-ribbon-only"));
ok("strip not in trust ribbon", !ribbon.includes("TenderWorkflowProcessStrip"));
ok("strip ribbon in workspace command slot", page.includes("TenderWorkflowProcessStrip") && page.includes('variant="ribbon"'));
ok("trust chips hidden ≤390px w ribbon", ribbon.includes("max-[390px]:hidden") && ribbon.includes("TrustChipRow"));
ok("analysis strip NIE w ribbon", !ribbon.includes("TenderAnalysisStatusStrip"));
ok("ultra compact spacing", ribbon.includes("max-[390px]:space-y-1"));

const strip = read("src/app/TenderWorkflowProcessStrip.tsx");
ok("process strip ribbon variant", strip.includes('variant?: "default" | "ribbon"'));
ok("ribbon nowrap horizontal scroll", strip.includes("flex-nowrap") && strip.includes("overflow-x-auto"));
ok("ultra compact stage buttons touch-safe", strip.includes("min-h-[44px]") && strip.includes("touch-manipulation"));

console.log("\n3. Analysis Strip → Szczegóły postępu");
const hub = read("src/app/TenderWorkflowHubPanel.tsx");
ok("analysis strip w hub gdy commandLayerActive", hub.includes("commandLayerActive") && hub.includes("TenderAnalysisStatusStrip"));
ok("progress accordion marker", hub.includes("data-tender-progress-accordion"));
ok("progress accordion id anchor", hub.includes('id="tender-progress-accordion"'));
ok("v2 compact row outside accordion", hub.includes("TenderWorkspaceV2ProgressCompact"));

console.log("\n4. Primary CTA — Command Layer chrome");
const cta = read("src/app/TenderWorkflowPrimaryAction.tsx");
ok("commandLayerChrome prop", cta.includes("commandLayerChrome"));
ok("bez sticky gdy command layer", cta.includes('commandLayerChrome ?') && cta.includes("sticky top-0"));
ok("page passes commandLayerChrome", page.includes("commandLayerChrome"));

console.log("\n6. NG-08-HF-01 + M-03 remediation markers");
ok("HF-01 scroll hub via scroll root", page.includes("scrollRootRef") && page.includes("root.scrollTo"));
ok("HF-01 shortcuts flex row", page.includes("data-tender-command-shortcuts-row"));
ok("M-03 mobile shortcut 44px", page.includes("min-h-11 lg:min-h-8"));
ok("M-03 kpi hidden detail chrome", cmd.includes("hidden 2xl:block") && cmd.includes("TenderDetailKpiCompact"));
ok("M-03 phone breakpoint 430", cmd.includes("max-[430px]:"));
ok("M-03 kpi 2xl visible guard", cmd.includes("2xl:block"));

console.log("\n7. E2E regression spec");
const e2e = read("e2e/audit-p0-tender-freeze.spec.ts");
ok("e2e asserts command layer height", e2e.includes("commandLayerH") && e2e.includes("280"));
ok("e2e asserts content scroll > 120", e2e.includes("contentScrollH") && e2e.includes("120"));
ok("e2e mobile 50vh limit", e2e.includes("0.5") && e2e.includes("viewportHeight"));
ok("e2e KPI-UX-01 hub viewport", e2e.includes("hubInScrollRootViewport"));
ok("e2e scroll root selector", e2e.includes("data-tender-detail-scroll-root"));
ok("e2e M-03 tab delta gate", e2e.includes("measureCommandLayerTabDelta"));
ok("e2e M-03 viewport 412", e2e.includes("412"));

console.log("\n8. Mobile immersive detail (moduł chrome)");
const module = read("src/app/tenders/TendersModule.tsx");
ok("hide module header on mobile v4 detail", module.includes('v4Detail ? "max-lg:hidden shrink-0"'));
ok("hide module tabs on mobile v4 detail", module.includes("TendersTabBar") && module.includes("max-lg:hidden"));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
