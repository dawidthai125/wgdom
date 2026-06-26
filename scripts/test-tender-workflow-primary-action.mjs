/**
 * EPIC C — Sticky Primary CTA (prezentacja + SSOT).
 * npx vite-node scripts/test-tender-workflow-primary-action.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildWorkflowPrimaryActionResolveInput,
  buildWorkflowPrimaryActionView,
} from "../src/lib/tender-workflow-primary-action.ts";
import { resolveOwnerNextAction } from "../src/lib/tender-intelligence-next-action.ts";
import { applyTenderIntelligenceOverlay } from "../src/lib/tender-intelligence-overlay.ts";
import { buildOwnerDecisionView, scoreTenderForOwnerView } from "../src/lib/tender-owner-view-ux.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { loadGrowthMode } from "../src/lib/tenders-strategy-growth-mode.ts";
import { aggregateMarketKpi } from "../src/lib/tenders-strategy-kpi.ts";
import { computeCompanyHealth } from "../src/lib/tenders-strategy-health.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

let pass = 0;
let fail = 0;
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function scoringContext(items) {
  const profile = loadCompanyProfileLocal();
  const growthMode = loadGrowthMode().mode;
  const marketKpi = aggregateMarketKpi(items, profile);
  const health = computeCompanyHealth({
    items,
    jobs: [],
    directory: [],
    weekEmployees: [],
    weekFrom: "",
    weekTo: "",
    profile,
    growthMode,
    savedWeeks: [],
    marketKpi,
  });
  return { health, growthMode, jobs: [], items, profile, marketKpi };
}

const baseItem = {
  id: "t-cta",
  title: "Remont szkoły",
  status: "new",
  isWroclaw: true,
  submittingOffersDate: "2030-12-31T12:00:00.000Z",
  bzpDocuments: [],
};

function overlayFor(item) {
  const bundle = scoreTenderForOwnerView(item, scoringContext([item]));
  const decisionView = buildOwnerDecisionView(bundle);
  return applyTenderIntelligenceOverlay({
    bundle,
    decisionView,
    ownerFinanceProposal: null,
    item,
  });
}

console.log("\n=== EPIC C — Sticky Primary CTA ===\n");

console.log("1. SSOT — resolveOwnerNextAction + progress");
const resolveInput = buildWorkflowPrimaryActionResolveInput({
  item: baseItem,
  overlay: overlayFor(baseItem),
});
const next = resolveOwnerNextAction(resolveInput);
assert(next.ruleId === "P5" || next.tab === "documents", "no docs → kosztorys/documents action");
const viewNoDocs = buildWorkflowPrimaryActionView({
  resolveInput,
  item: baseItem,
  swz: null,
});
assert(viewNoDocs.buttonLabel === "Pobierz dokumenty", "sticky label: Pobierz dokumenty");
assert(viewNoDocs.progressPercent >= 0, "progress percent from computeWorkspaceV2AutoProgress");

console.log("\n2. Przetwarzanie — disabled busy");
const withDocs = {
  ...baseItem,
  bzpDocuments: [{ index: 1, filename: "swz.pdf" }],
};
const busyView = buildWorkflowPrimaryActionView({
  resolveInput: buildWorkflowPrimaryActionResolveInput({
    item: withDocs,
    overlay: overlayFor(withDocs),
  }),
  item: withDocs,
  swz: null,
  autoRunning: true,
});
assert(busyView.busy === true, "autoRunning → busy");
assert(busyView.disabled === true, "busy → disabled");
assert(busyView.buttonLabel.includes("Przetwarzam"), "busy label: Przetwarzam dokumenty…");

console.log("\n3. P6 / P8 sticky labels");
const kosztorysItem = {
  ...withDocs,
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 12 },
    brief: null,
    parserVersion: "1",
  },
};
const p6View = buildWorkflowPrimaryActionView({
  resolveInput: buildWorkflowPrimaryActionResolveInput({
    item: kosztorysItem,
    overlay: overlayFor(kosztorysItem),
  }),
  item: kosztorysItem,
  swz: { source: "test" },
});
assert(p6View.nextAction.ruleId === "P6", "kosztorys ready → P6");
assert(p6View.buttonLabel === "Policz wycenę", "sticky label: Policz wycenę");

console.log("\n4. UI wiring");
const hub = readSrc("src/app/TenderWorkflowHubPanel.tsx");
const cta = readSrc("src/app/TenderWorkflowPrimaryAction.tsx");
const lib = readSrc("src/lib/tender-workflow-primary-action.ts");
assert(hub.includes("TenderWorkflowPrimaryAction"), "hub embeds primary action");
assert(hub.indexOf("TenderWorkflowProcessStrip") < hub.indexOf("TenderWorkflowPrimaryAction"), "CTA under process strip");
assert(cta.includes("data-tender-workflow-primary-action"), "sticky marker");
assert(cta.includes("sticky top-0"), "sticky positioning");
assert(cta.includes("buildWorkflowPrimaryActionView"), "component uses SSOT builder");
assert(lib.includes("resolveOwnerNextAction"), "lib calls resolveOwnerNextAction");
assert(lib.includes("buildTenderAnalysisStatusRows"), "lib calls buildTenderAnalysisStatusRows");
assert(lib.includes("computeWorkspaceV2AutoProgress"), "lib calls computeWorkspaceV2AutoProgress");
assert(cta.includes("data-workflow-primary-cta"), "single CTA button marker");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
