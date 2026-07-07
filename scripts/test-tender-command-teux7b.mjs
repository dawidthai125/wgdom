/**
 * TEUX-7b — Command Layer: CTA disabled reason, collapsible trust ribbon, mobile context.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

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

function readSrc(rel) {
  return readFileSync(`${ROOT}/${rel}`, "utf8");
}

console.log("=== TEUX-7b TENDER COMMAND LAYER ===\n");

const ux = readSrc("src/lib/tender-command-layer-ux.ts");
ok("tender-command-layer-ux exists", ux.includes("export function resolvePrimaryActionDisabledReason"));
ok("trust ribbon collapsed key", ux.includes("TENDERS_COMMAND_TRUST_RIBBON_COLLAPSED_KEY"));
ok("loadTrustRibbonCollapsed export", ux.includes("export function loadTrustRibbonCollapsed"));
ok("no resolveOwnerNextAction import", !ux.includes("resolveOwnerNextAction"));

const commandLayer = readSrc("src/app/TenderDetailCommandLayer.tsx");
ok("mobile context data attr", commandLayer.includes("data-teux7b-mobile-context"));
ok("mobile context md:hidden", commandLayer.includes("md:hidden"));
ok("desktop breadcrumb preserved", commandLayer.includes('aria-label="Breadcrumb"'));

const primaryAction = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
ok("disabled reason data attr", primaryAction.includes("data-teux7b-disabled-reason"));
ok("aria-describedby wiring", primaryAction.includes("aria-describedby"));
ok("resolvePrimaryActionDisabledReason import", primaryAction.includes("resolvePrimaryActionDisabledReason"));
ok("role status on reason", primaryAction.includes('role="status"'));

const ribbon = readSrc("src/app/TenderStatusRibbon.tsx");
ok("collapsible data attr", ribbon.includes("data-tender-command-collapsible"));
ok("trust collapsible marker", ribbon.includes("data-teux7b-trust-collapsible"));
ok("trust toggle aria-expanded", ribbon.includes("aria-expanded"));
ok("ProcessStrip outside collapsible", (() => {
  const body = ribbon.split("export function TenderStatusRibbon")[1] || ribbon;
  return body.indexOf("data-teux7b-trust-collapsible") < body.indexOf("<TenderWorkflowProcessStrip");
})());
ok("ProcessStrip always rendered", ribbon.includes("<TenderWorkflowProcessStrip"));
ok("loadTrustRibbonCollapsed used", ribbon.includes("loadTrustRibbonCollapsed"));

const tabBar = readSrc("src/app/TenderDetailTabBar.tsx");
ok("scroll shadow hook regressed", tabBar.includes("useHorizontalScrollShadow"));
ok("scroll shadow data attr", tabBar.includes("data-tender-detail-tabs-scroll-shadow"));
ok("gradient shadow left/right", tabBar.includes("data-tender-detail-tabs-shadow"));

const detailPage = readSrc("src/app/TenderDetailPage.tsx");
ok("przetarg slot has ribbon + CTA", detailPage.includes("TenderStatusRibbon") && detailPage.includes("TenderWorkflowPrimaryAction"));
ok("ProcessStrip not duplicated in page", (detailPage.match(/TenderWorkflowProcessStrip/g) || []).length === 0);

ok("tokens frozen", !readSrc("src/lib/tender-ux-tokens.ts").includes("teux7b"));
ok("workflow primary action lib untouched", !readSrc("src/lib/tender-workflow-primary-action.ts").includes("teux7b"));
ok("intelligence next action untouched", !readSrc("src/lib/tender-intelligence-next-action.ts").includes("teux7b"));

const forbidden = [
  "src/lib/cloud-sync.ts",
  "src/app/CloudLoader.tsx",
  "src/app/hooks/useTenderPipelineRuntime.ts",
  "src/app/hooks/useTenderDocumentsBootstrap.ts",
  "src/app/tenders/strategy/hooks/useTendersPipeline.ts",
  "src/app/App.tsx",
];
for (const p of forbidden) {
  const src = readSrc(p);
  ok(`forbidden ${p} no teux7b`, !src.includes("teux7b"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exit(1);
