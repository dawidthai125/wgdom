/**
 * P5-OWNER-VIEW-SPRINT-1 — smoke helperów Owner View.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildOwnerDecisionView,
  buildOwnerFinanceView,
  buildOwnerPositionsFileView,
  buildOwnerRiskTermRows,
  scoreTenderForOwnerView,
} from "../src/lib/tender-owner-view-ux.ts";
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

console.log("\n=== P5 Owner View Sprint 1 ===\n");

console.log("1. UI wiring");
const panelSrc = readSrc("src/app/TenderDetailPanel.tsx");
const ownerSrc = readSrc("src/app/TenderOwnerView.tsx");
assert(panelSrc.includes("TenderOwnerView"), "TenderDetailPanel uses TenderOwnerView");
assert(ownerSrc.includes("TENDER_OWNER_VIEW_COPY"), "Owner view language SSOT");
assert(ownerSrc.includes("TENDER_OWNER_NEXT_STEP_CTA"), "Co dalej uses business CTA SSOT");
assert(ownerSrc.includes("<details"), "Więcej collapsed section");
assert(!panelSrc.includes("TenderOverviewShortcuts"), "overview shortcuts removed from main");

console.log("\n2. Decision labels");
const item = baseItem();
const bundle = scoreTenderForOwnerView(item, scoringContext([item]));
const decision = buildOwnerDecisionView(bundle);
assert(Object.values(DECISION_LABEL_PL).includes(decision.label), "decision label PL");
assert(decision.reasons.length <= 3, "max 3 reasons");

console.log("\n3. Finance states");
const emptyFinance = buildOwnerFinanceView(null);
assert(!emptyFinance.ready, "no proposal → not ready");
assert(emptyFinance.revenueDisplay === "—", "empty revenue dash");

const readyFinance = buildOwnerFinanceView({
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
assert(readyFinance.marginPct != null && readyFinance.marginPct > 0, "positive margin");

console.log("\n4. Positions file states");
const missing = buildOwnerPositionsFileView(baseItem());
assert(missing.state === "missing", "no attachments → missing");

const przedmiar = buildOwnerPositionsFileView(baseItem({
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 221, sourceFilename: "x.ath" },
    builtAt: new Date().toISOString(),
  },
}));
assert(przedmiar.state === "przedmiar", "FOUND_NO_VALUE → przedmiar");
assert(przedmiar.title === "Przedmiar znaleziony", "przedmiar title");
assert(przedmiar.ctaLabel === "Otwórz przedmiar" || przedmiar.ctaLabel === null, "przedmiar CTA");

const kosztorys = buildOwnerPositionsFileView(baseItem({
  tenderDossier: {
    kosztorys: { ok: true, rowCount: 50, totalValue: "100 000", currency: "PLN", sourceFilename: "k.ath" },
    builtAt: new Date().toISOString(),
  },
}));
assert(kosztorys.state === "kosztorys", "FOUND_WITH_VALUE → kosztorys");
assert(kosztorys.title === "Kosztorys znaleziony", "kosztorys title");

console.log("\n5. Risk rows");
const riskRows = buildOwnerRiskTermRows(item, null, { fitLabel: "good", fitScore: 72, reasons: [] });
assert(riskRows.some((r) => r.id === "termin"), "termin row");
assert(!riskRows.some((r) => r.id === "wadium"), "P5-004: wadium only in Hero, not Risk");
assert(riskRows.some((r) => r.id === "ryzyko"), "dopasowanie row");

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
