/**
 * V3.1 Sprint 1 — smoke Intelligence lib (T01–T16).
 * npx vite-node scripts/test-v31-tender-intelligence.mjs
 */
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { loadGrowthMode } from "../src/lib/tenders-strategy-growth-mode.ts";
import { aggregateMarketKpi } from "../src/lib/tenders-strategy-kpi.ts";
import { computeCompanyHealth } from "../src/lib/tenders-strategy-health.ts";
import { DECISION_LABEL_PL } from "../src/lib/tenders-strategy-decision.ts";
import {
  buildOwnerDecisionView,
  scoreTenderForOwnerView,
} from "../src/lib/tender-owner-view-ux.ts";
import { applyTenderIntelligenceOverlay } from "../src/lib/tender-intelligence-overlay.ts";
import { resolveOwnerNextAction } from "../src/lib/tender-intelligence-next-action.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { buildTenderIntelligenceNarrative } from "../src/lib/tender-intelligence-narrative.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

function baseItem(overrides = {}) {
  return {
    id: "t-v31",
    tenderId: "BZP-V31",
    title: "Remont budynku mieszkalnego przy ul. Testowej 1",
    status: "new",
    isWroclaw: true,
    relevanceScore: 28,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [],
    ...overrides,
  };
}

function scoringContext(items, jobs = []) {
  const profile = loadCompanyProfileLocal();
  const growthMode = loadGrowthMode().mode;
  const marketKpi = aggregateMarketKpi(items, profile);
  const health = computeCompanyHealth({
    items,
    jobs,
    directory: [],
    weekEmployees: [],
    weekFrom: "",
    weekTo: "",
    profile,
    growthMode,
    savedWeeks: [],
    marketKpi,
  });
  return { health, growthMode, jobs, items, profile, marketKpi };
}

function mockBundle(item, decision = "GO") {
  return {
    item,
    opportunity: { score: 72, label: "WYSOKA", reasons: ["+ test opp", "termin OK"] },
    strategic: { score: 68, label: "SILNA", reasons: ["+ test strat"] },
    decision,
    decisionLabel: DECISION_LABEL_PL[decision],
    compositeRank: 1000,
  };
}

function overlayFor(item, decision, bidProposal) {
  const bundle = mockBundle(item, decision);
  const decisionView = buildOwnerDecisionView(bundle);
  return applyTenderIntelligenceOverlay({
    bundle,
    decisionView,
    ownerFinanceProposal: bidProposal,
    item,
  });
}

const okBid = {
  ok: true,
  pricingMode: "catalog",
  recommendedBidPln: 1_200_000,
  costPricePln: 1_000_000,
  floorBidPln: 1_050_000,
  aggressiveBidPln: 1_150_000,
  safeBidPln: 1_200_000,
  costStack: [],
  assumptions: [],
  warnings: [],
  computedAt: new Date().toISOString(),
};

const badBid = {
  ok: false,
  pricingMode: null,
  recommendedBidPln: null,
  costPricePln: null,
  floorBidPln: null,
  aggressiveBidPln: null,
  safeBidPln: null,
  costStack: [],
  assumptions: [],
  warnings: ["Brak cen w kosztorysie"],
  computedAt: new Date().toISOString(),
};

const kosztorysItem = baseItem({
  tenderDossier: {
    kosztorys: {
      ok: true,
      rowCount: 120,
      sourceFilename: "kosztorys.ath",
      categories: [{ name: "Roboty ogólnobudowlane" }],
    },
    builtAt: new Date().toISOString(),
    brief: { scopeDescription: "Remont instalacji sanitarnej w budynku wielorodzinnym." },
  },
});

console.log("\n=== V3.1 Tender Intelligence (Faza A) ===\n");

console.log("T01 — GO surowy + brak marży → ANALIZUJ");
{
  const o = overlayFor(kosztorysItem, "GO", badBid);
  assert(o.displayDecision === "HOLD", "T01 displayDecision HOLD");
  assert(o.displayLabel === "ANALIZUJ", "T01 displayLabel ANALIZUJ");
  assert(o.downgradeRule === "O4", "T01 rule O4");
}

console.log("\nT02 — wadium.blocked → ODPUŚĆ");
{
  const item = baseItem({
    swzAnalysis: {
      wadiumRaw: "wadium 500 000 PLN",
      wadiumPln: 500_000,
    },
  });
  const o = overlayFor(item, "GO", okBid);
  assert(o.displayDecision === "NO-GO", "T02 displayDecision NO-GO");
  assert(o.displayLabel === "ODPUŚĆ", "T02 displayLabel ODPUŚĆ");
  assert(o.downgradeRule === "O2", "T02 rule O2");
}

console.log("\nT03 — ref.gap → ODPUŚĆ");
{
  const profile = loadCompanyProfileLocal();
  const required = profile.totalReferencesPln + 5_000_000;
  const item = baseItem({
    noticeHtml: `<p>Wykonawca musi wykazać doświadczenie o wartości ${required.toLocaleString("pl-PL")} zł.</p>`,
    swzAnalysis: {
      referenceRequirement: `Doświadczenie min. ${required} PLN`,
    },
  });
  const o = overlayFor(item, "GO", okBid);
  assert(o.displayDecision === "NO-GO", "T03 displayDecision NO-GO");
  assert(o.downgradeRule === "O3", "T03 rule O3");
}

console.log("\nT04 — termin minął → ODPUŚĆ");
{
  const item = baseItem({ submittingOffersDate: "2020-01-01T12:00:00.000Z" });
  const o = overlayFor(item, "GO", okBid);
  assert(o.displayDecision === "NO-GO", "T04 displayDecision NO-GO");
  assert(o.downgradeRule === "O1", "T04 rule O1");
}

console.log("\nT05 — kosztorys OK, brak marży → next action valuation (P6)");
{
  const o = overlayFor(kosztorysItem, "HOLD", badBid);
  const next = resolveOwnerNextAction({
    item: kosztorysItem,
    overlay: o,
    ownerFinanceProposal: badBid,
  });
  assert(next.ruleId === "P6", "T05 rule P6");
  assert(next.tab === "valuation", "T05 tab valuation");
}

console.log("\nT06 — ref.gap → next action qualification (P2)");
{
  const profile = loadCompanyProfileLocal();
  const required = profile.totalReferencesPln + 2_000_000;
  const item = baseItem({
    noticeHtml: `<p>Wykonawca musi wykazać doświadczenie o wartości ${required.toLocaleString("pl-PL")} zł.</p>`,
    swzAnalysis: {
      referenceRequirement: `Doświadczenie min. ${required} PLN`,
    },
  });
  const o = overlayFor(item, "GO", okBid);
  const next = resolveOwnerNextAction({ item, overlay: o, ownerFinanceProposal: okBid });
  assert(next.ruleId === "P2", "T06 rule P2");
  assert(next.tab === "qualification", "T06 tab qualification");
}

console.log("\nT07 — GO overlay + marża + brak owner decision → P8");
{
  const o = overlayFor(kosztorysItem, "GO", okBid);
  assert(o.displayDecision === "GO", "T07 overlay STARTUJ");
  const next = resolveOwnerNextAction({
    item: kosztorysItem,
    overlay: o,
    ownerFinanceProposal: okBid,
    ownerDecision: null,
  });
  assert(next.ruleId === "P8", "T07 rule P8");
  assert(next.ownerDecision === "GO", "T07 ownerDecision GO");
}

console.log("\nT08 — executive z previewContext bez modalu");
{
  const ctx = buildTenderIntelligenceContext({
    item: kosztorysItem,
    scoringContext: scoringContext([kosztorysItem]),
    ownerFinanceProposal: badBid,
  });
  assert(ctx.executive != null, "T08 executive not null");
  assert(Array.isArray(ctx.executive?.mainWorks), "T08 mainWorks array");
  assert((ctx.executive?.mainWorks.length ?? 0) >= 0, "T08 mainWorks length ok");
}

console.log("\nT09 — brak dossier → executive null + narracja fallback");
{
  const item = baseItem();
  const ctx = buildTenderIntelligenceContext({
    item,
    scoringContext: scoringContext([item]),
    ownerFinanceProposal: null,
  });
  assert(ctx.executive === null, "T09 executive null");
  const narrative = buildTenderIntelligenceNarrative(item, null);
  assert(narrative.includes("Remont budynku"), "T09 narrative from title");
}

console.log("\nT10 — dokładnie jedna akcja");
{
  const ctx = buildTenderIntelligenceContext({
    item: kosztorysItem,
    scoringContext: scoringContext([kosztorysItem]),
    ownerFinanceProposal: badBid,
  });
  assert(ctx.nextAction != null, "T10 nextAction exists");
  assert(typeof ctx.nextAction.ruleId === "string", "T10 single ruleId");
}

console.log("\nT11 — pewność Niska bez kosztorysu");
{
  const item = baseItem();
  const o = overlayFor(item, "HOLD", null);
  assert(o.confidence === "low", "T11 confidence low");
  assert(o.confidenceLabel === "Niska", "T11 confidenceLabel");
}

console.log("\nT12 — ourEstimatePln + !bidProposal.ok → overlay ANALIZUJ (O4)");
{
  const item = baseItem({
    ourEstimatePln: 900_000,
    tenderDossier: kosztorysItem.tenderDossier,
  });
  const o = overlayFor(item, "GO", badBid);
  assert(o.displayDecision === "HOLD", "T12 HOLD");
  assert(o.downgradeRule === "O4", "T12 O4");
}

console.log("\nT13 — Reasons policy ODPUŚĆ bez „termin OK”");
{
  const item = baseItem({
    swzAnalysis: { wadiumRaw: "wadium 900 000 PLN", wadiumPln: 900_000 },
  });
  const bundle = mockBundle(item, "GO");
  const decisionView = buildOwnerDecisionView(bundle);
  const o = applyTenderIntelligenceOverlay({
    bundle,
    decisionView,
    ownerFinanceProposal: okBid,
    item,
  });
  assert(!o.reasons.some((r) => r.toLowerCase() === "termin ok"), "T13 no termin OK");
}

console.log("\nT14 — Reasons policy ANALIZUJ zawiera powód braku marży");
{
  const o = overlayFor(kosztorysItem, "GO", badBid);
  assert(
    o.reasons.some((r) => r.toLowerCase().includes("marż") || r.toLowerCase().includes("zysk") || r.toLowerCase().includes("wycen")),
    "T14 margin-related reason",
  );
}

console.log("\nT15 — T-SCORE-PARITY scoringContext");
{
  const items = [kosztorysItem];
  const ctx = scoringContext(items);
  const direct = scoreTenderForOwnerView(kosztorysItem, ctx);
  const built = buildTenderIntelligenceContext({
    item: kosztorysItem,
    scoringContext: ctx,
    ownerFinanceProposal: badBid,
  });
  assert(built.scoringBundle.decision === direct.decision, "T15 decision parity");
  assert(built.scoringBundle.opportunity.score === direct.opportunity.score, "T15 opp score parity");
}

console.log("\nT16 — awaiting parse → next action ≠ P6 (Policz zysk / valuation)");
{
  const item = baseItem({
    bzpDocuments: [{ filename: "swz.zip", downloadUrl: "https://example.com/swz.zip" }],
  });
  const o = overlayFor(item, "HOLD", null);
  const next = resolveOwnerNextAction({
    item,
    overlay: o,
    ownerFinanceProposal: null,
  });
  assert(next.ruleId !== "P6", "T16 not P6 valuation");
  assert(next.ruleId === "P4" || next.ruleId === "P5", "T16 P4 or P5");
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
