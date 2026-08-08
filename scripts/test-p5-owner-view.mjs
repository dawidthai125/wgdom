/**
 * P5 Owner View + P5.1 recovery — smoke helperów Owner View.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOwnerDecisionView,
  buildOwnerFinanceView,
  buildOwnerPositionsFileView,
  buildOwnerPrepStatusView,
  buildOwnerRiskTermRows,
  scoreTenderForOwnerView,
} from "../src/lib/tender-owner-view-ux.ts";
import { resolvedCostStatusDisplay, PRZEDMIAR_VALUATION_READY_LABEL } from "../src/lib/tender-data-ssot.ts";
import { loadGrowthMode } from "../src/lib/tenders-strategy-growth-mode.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { aggregateMarketKpi } from "../src/lib/tenders-strategy-kpi.ts";
import { computeCompanyHealth } from "../src/lib/tenders-strategy-health.ts";
import { DECISION_LABEL_PL } from "../src/lib/tenders-strategy-decision.ts";

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

function baseItem(overrides = {}) {
  return {
    id: "t1",
    tenderId: "BZP-1",
    title: "Test",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [],
    ...overrides,
  };
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

console.log("\n=== P5 Owner View + P5.1 Recovery ===\n");

console.log("\n1. UI wiring (V3.1 Intelligence / EPIC A Hub — DecisionView SSOT)");
const panelSrc = readSrc("src/app/TenderDetailPanel.tsx");
const decisionSrc = readSrc("src/app/TenderDecisionView.tsx");
const hubSrc = readSrc("src/app/TenderWorkflowHubSections.tsx");
assert(panelSrc.includes("TenderDecisionView"), "TenderDetailPanel uses TenderDecisionView on Decyzja");
assert(panelSrc.includes("TenderPrzetargWorkspace"), "TenderDetailPanel Workflow Hub on Przetarg");
assert(panelSrc.includes("buildTenderIntelligenceContext"), "panel builds intelligence context");
assert(panelSrc.includes("scoringContext"), "panel uses scoringContext SSOT");
assert(!panelSrc.includes("TenderOwnerView"), "panel: no TenderOwnerView consumer");
assert(decisionSrc.includes("TENDER_INTELLIGENCE_SECTION_COPY"), "Decision view section copy (Decyzja)");
assert(decisionSrc.includes("intelligenceCtx"), "Decision view intelligenceCtx prop");
assert(hubSrc.includes("TENDER_INTELLIGENCE_SECTION_COPY"), "Hub blockers section copy (Przetarg)");
assert(hubSrc.includes("WorkflowHubPrepStatusDisplay"), "prep status on Workflow Hub");
assert(hubSrc.includes("statusLine"), "positions status line on hub");
assert(!decisionSrc.includes("<details"), "no collapsed Więcej on Decyzja (DecisionView)");
assert(!decisionSrc.includes("OwnerNextSteps"), "OwnerNextSteps absent from DecisionView");
assert(!panelSrc.includes("TenderOverviewShortcuts"), "overview shortcuts removed from main");

console.log("\n2. Decision labels");
const item = baseItem();
const bundle = scoreTenderForOwnerView(item, scoringContext([item]));
const decision = buildOwnerDecisionView(bundle);
assert(Object.values(DECISION_LABEL_PL).includes(decision.label), "decision label PL");
assert(decision.reasons.length <= 3, "max 3 reasons");

console.log("\n3. Finance states");
const emptyFinance = buildOwnerFinanceView(baseItem(), null);
assert(!emptyFinance.ready, "no proposal → not ready");
assert(emptyFinance.mode !== "ready", "no proposal → not ready mode");
assert(emptyFinance.revenueDisplay === "—", "empty revenue dash");

const readyFinance = buildOwnerFinanceView(baseItem(), {
  ok: true,
  recommendedBidPln: 1_000_000,
  costPricePln: 800_000,
  floorBidPln: null,
  aggressiveBidPln: null,
  safeBidPln: null,
  costStack: [],
  assumptions: [],
  warnings: [],
  computedAt: new Date().toISOString(),
});
assert(readyFinance.ready, "proposal with numbers → ready");
assert(readyFinance.mode === "ready", "proposal with numbers → ready mode");
assert(readyFinance.marginPct != null && readyFinance.marginPct > 0, "positive margin");

const przedmiarItem = baseItem({
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 221, sourceFilename: "x.ath" },
    builtAt: new Date().toISOString(),
  },
});
const przedmiarFinance = buildOwnerFinanceView(przedmiarItem, {
  ok: false,
  pricingMode: null,
  recommendedBidPln: null,
  floorBidPln: null,
  aggressiveBidPln: null,
  safeBidPln: null,
  costPricePln: null,
  costStack: [],
  assumptions: [],
  warnings: ["Brak cen w kosztorysie i brak ilości do wyceny katalogowej — wczytaj przedmiar ATH."],
  computedAt: new Date().toISOString(),
});
assert(przedmiarFinance.mode === "intermediate", "P5.1 przedmiar → intermediate finance");
assert(
  przedmiarFinance.message?.includes("Nie można") || przedmiarFinance.hint?.includes("Brak cen"),
  "P5.1 przedmiar finance message from SSOT",
);

console.log("\n4. Positions file states (full SSOT)");
const missing = buildOwnerPositionsFileView(baseItem());
assert(missing.state === "missing", "no attachments → missing");
assert(missing.statusLine === resolvedCostStatusDisplay(baseItem()).display, "missing uses SSOT display");

const przedmiar = buildOwnerPositionsFileView(przedmiarItem);
assert(przedmiar.state === "przedmiar", "FOUND_NO_VALUE → przedmiar");
assert(przedmiar.rowCount === 221, "P5.1 przedmiar row count on view model");
assert(
  przedmiar.statusLine === resolvedCostStatusDisplay(przedmiarItem).display,
  "P5.1 przedmiar statusLine = SSOT display",
);
assert(
  przedmiar.statusLine === PRZEDMIAR_VALUATION_READY_LABEL ||
    przedmiar.statusLine.toLowerCase().includes("przedmiar"),
  "P5.1 przedmiar statusLine signals przedmiar/wycena ready",
);
assert(przedmiar.hint != null, "P5.1 przedmiar SSOT hint");
assert(przedmiar.ctaLabel === "Otwórz przedmiar" || przedmiar.ctaLabel === null, "przedmiar CTA");

const kosztorysItem = baseItem({
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 50, totalValue: "100 000", currency: "PLN", sourceFilename: "k.ath" },
    builtAt: new Date().toISOString(),
  },
});
const kosztorys = buildOwnerPositionsFileView(kosztorysItem);
assert(kosztorys.state === "kosztorys", "FOUND_WITH_VALUE → kosztorys");
assert(
  kosztorys.statusLine === resolvedCostStatusDisplay(kosztorysItem).display,
  "P5.1 kosztorys statusLine = SSOT display",
);
assert(kosztorys.statusLine.length > 0, "P5.1 kosztorys statusLine non-empty");

const awaiting = buildOwnerPositionsFileView(baseItem({
  bzpDocuments: [{ filename: "swz.zip", downloadUrl: "https://x" }],
}));
assert(awaiting.state === "awaiting", "attachments pending → awaiting");
assert(awaiting.statusIcon === "pending", "awaiting icon pending");

console.log("\n5. Prep status strip (P5.1)");
const prepMissing = buildOwnerPrepStatusView(baseItem(), null);
assert(prepMissing.kosztorys.text === "brak", "prep kosztorys brak");
assert(prepMissing.pricing.text === "wymaga analizy", "prep pricing wymaga analizy");

const prepFound = buildOwnerPrepStatusView(przedmiarItem, null);
assert(prepFound.kosztorys.text === "znaleziony", "prep kosztorys znaleziony");
assert(prepFound.pricing.text === "wymaga analizy", "prep pricing wymaga analizy when no calc");

const prepReady = buildOwnerPrepStatusView(przedmiarItem, {
  ok: true,
  recommendedBidPln: 1_000_000,
  costPricePln: 800_000,
  floorBidPln: null,
  aggressiveBidPln: null,
  safeBidPln: null,
  costStack: [],
  assumptions: [],
  warnings: [],
  computedAt: new Date().toISOString(),
});
assert(prepReady.pricing.text === "gotowa", "prep pricing gotowa when proposal ok");

console.log("\n6. Risk rows");
const riskRows = buildOwnerRiskTermRows(item, null, { fitLabel: "good", fitScore: 72, reasons: [] });
assert(riskRows.some((r) => r.id === "termin"), "termin row");
assert(!riskRows.some((r) => r.id === "wadium"), "P5-004: wadium only in Hero, not Risk");
assert(riskRows.some((r) => r.id === "ryzyko"), "dopasowanie row");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
