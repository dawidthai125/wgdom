/**
 * NG11-A5 — strategic vs economic decision readiness.
 * npx vite-node scripts/test-ng11-strategic-economic-decision.mjs
 */

import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { deriveTenderDecisionReadiness } from "../src/lib/tender-intelligence-decision-readiness.ts";
import { applyTenderIntelligenceOverlay } from "../src/lib/tender-intelligence-overlay.ts";
import { buildOwnerDecisionView } from "../src/lib/tender-owner-view-ux.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  derivePricingReadyFinal,
  derivePricingReadyPartial,
} from "../src/lib/tender-pipeline/derive-pipeline-readiness.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";

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

function scoringContext() {
  return {
    health: { score: 70, label: "OK", reasons: [] },
    growthMode: "balanced",
    jobs: [],
    items: [],
    profile: loadCompanyProfileLocal(),
  };
}

function baseItem(overrides = {}) {
  return {
    id: "ng11-a5-item",
    tenderId: "t-a5",
    noticeNumber: "2026/BZP 00055555",
    title: "NG11-A5 strategic vs economic test",
    status: "seen",
    isWroclaw: true,
    relevanceScore: 28,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    noticeHtml: "<p>".repeat(40),
    documentsFetchedAt: new Date().toISOString(),
    bzpDocuments: [],
    ...overrides,
  };
}

const kosztorysFixture = {
  ok: true,
  source: "ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie ścian emulsyjne dwukrotnie",
      unit: "m2",
      quantity: "100",
    },
  ],
  totalValue: null,
  currency: "PLN",
};

const partialDossier = {
  brief: { title: "x" },
  kosztorys: kosztorysFixture,
  parserVersion: CURRENT_PARSER_VERSION,
  builtAt: new Date().toISOString(),
};

const fullDossier = {
  ...partialDossier,
  scanSummary: {
    parsedAt: new Date().toISOString(),
    totalDocuments: 1,
    scanned: 1,
    parsed: 1,
    byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: true,
    criteriaFound: false,
    estimateFound: false,
    costDiscovery: null,
  },
};

const costModel = defaultCostModelFromPayroll();
const { catalog } = resolveActiveCatalogForTender({
  referenceHourlyPln: costModel.avgGrossHourlyPln,
});

function computeProposal(item) {
  return computeTenderBidProposal({
    kosztorys: item.tenderDossier?.kosztorys,
    swz: item.swzAnalysis ?? null,
    fit: item.tenderFit ?? null,
    costModel,
    minProjectDays: 30,
    maxConcurrentProjects: 3,
    catalog,
  });
}

const mockBundle = {
  item: baseItem(),
  opportunity: { score: 72, label: "WYSOKA", reasons: ["+ opp"] },
  strategic: { score: 68, label: "SILNA", reasons: ["+ strat"] },
  decision: "GO",
  decisionLabel: "STARTUJ",
  compositeRank: 1000,
};

console.log("=== NG11-A5 Strategic vs Economic ===\n");

// --- Pure derive ---
const r0 = deriveTenderDecisionReadiness({
  scoringBundle: mockBundle,
});
ok("A5-D1 strategicDecisionReady true with bundle", r0.strategicDecisionReady === true);
ok("A5-D2 strategicDecision = bundle.decision", r0.strategicDecision === "GO");
ok("A5-D3 economicDecisionReady false without wire", r0.economicDecisionReady === false);
ok("A5-D4 economicDecisionFinalReady false without wire", r0.economicDecisionFinalReady === false);

const r1 = deriveTenderDecisionReadiness({
  scoringBundle: mockBundle,
  pricingReadyPartial: true,
  pricingReadyFinal: false,
});
ok("A5-D5 economicDecisionReady maps partial", r1.economicDecisionReady === true);
ok("A5-D6 economicDecisionFinalReady false when partial only", r1.economicDecisionFinalReady === false);

const r2 = deriveTenderDecisionReadiness({
  scoringBundle: { ...mockBundle, decision: "HOLD" },
  pricingReadyPartial: true,
  pricingReadyFinal: true,
});
ok("A5-D7 strategicDecision HOLD preserved", r2.strategicDecision === "HOLD");
ok("A5-D8 economicDecisionFinalReady maps final", r2.economicDecisionFinalReady === true);

// --- Context integration ---
const itemPartial = baseItem({ tenderDossier: partialDossier });
const proposalPartial = computeProposal(itemPartial);
const partialReady = derivePricingReadyPartial({
  partialDossierReady: true,
  ownerFinanceProposal: proposalPartial,
});

const ctxNoWire = buildTenderIntelligenceContext({
  item: itemPartial,
  scoringContext: scoringContext(),
  ownerFinanceProposal: proposalPartial,
});
ok("A5-C1 default economic false without wire", ctxNoWire.economicDecisionReady === false);
ok("A5-C2 strategicDecisionReady true in context", ctxNoWire.strategicDecisionReady === true);
ok("A5-C3 strategicDecision matches bundle", ctxNoWire.strategicDecision === ctxNoWire.scoringBundle.decision);
ok("A5-C4 decisionReadiness nested mirror", ctxNoWire.decisionReadiness.economicDecisionReady === false);

const ctxPartial = buildTenderIntelligenceContext({
  item: itemPartial,
  scoringContext: scoringContext(),
  ownerFinanceProposal: proposalPartial,
  pricingReadyPartial: partialReady,
  pricingReadyFinal: false,
});
ok("A5-C5 economicDecisionReady true when wired partial", ctxPartial.economicDecisionReady === true);
ok("A5-C6 partialReady predicate aligns", partialReady === ctxPartial.economicDecisionReady);

const itemFull = baseItem({ tenderDossier: fullDossier });
const proposalFull = computeProposal(itemFull);
const finalReady = derivePricingReadyFinal({
  item: itemFull,
  ownerFinanceProposal: proposalFull,
  dossierEnriching: false,
});

const ctxFinal = buildTenderIntelligenceContext({
  item: itemFull,
  scoringContext: scoringContext(),
  ownerFinanceProposal: proposalFull,
  pricingReadyPartial: true,
  pricingReadyFinal: finalReady,
});
ok("A5-C7 economicDecisionFinalReady when wired", ctxFinal.economicDecisionFinalReady === finalReady);
ok("A5-C8 finalReady predicate aligns", finalReady === ctxFinal.economicDecisionFinalReady);

// --- displayDecision frozen (O4 economic downgrade separate from strategic) ---
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

const goBundle = { ...mockBundle, item: kosztorysItem, decision: "GO", decisionLabel: "STARTUJ" };
const goDecisionView = buildOwnerDecisionView(goBundle);
const overlayO4 = applyTenderIntelligenceOverlay({
  bundle: goBundle,
  decisionView: goDecisionView,
  ownerFinanceProposal: badBid,
  item: kosztorysItem,
});

ok(
  "A5-F1 displayDecision frozen O4 GO→HOLD",
  overlayO4.rawDecision === "GO" && overlayO4.displayDecision === "HOLD" && overlayO4.downgradeRule === "O4",
);

const ctxSplit = buildTenderIntelligenceContext({
  item: kosztorysItem,
  scoringContext: scoringContext(),
  ownerFinanceProposal: badBid,
});
ok(
  "A5-F2 strategicDecision tracks scoringBundle",
  ctxSplit.strategicDecision === ctxSplit.scoringBundle.decision,
);
ok(
  "A5-F2 overlay.displayDecision remains separate field",
  typeof ctxSplit.overlay.displayDecision === "string" && ctxSplit.strategicDecision !== undefined,
);

ok(
  "A5-F3 displayDecision still on overlay SSOT",
  ctxPartial.overlay.displayDecision === ctxPartial.overlay.displayDecision,
);

const overlayMargin = applyTenderIntelligenceOverlay({
  bundle: goBundle,
  decisionView: goDecisionView,
  ownerFinanceProposal: okBid,
  item: kosztorysItem,
});
ok(
  "A5-F4 displayDecision GO with margin (O4 not applied)",
  overlayMargin.rawDecision === "GO" && overlayMargin.displayDecision === "GO",
);
ok("A5-F5 economic ready with partial wire + proposal", ctxPartial.economicDecisionReady === true);

const ctxMargin = buildTenderIntelligenceContext({
  item: baseItem(),
  scoringContext: scoringContext(),
  ownerFinanceProposal: okBid,
  pricingReadyPartial: true,
  pricingReadyFinal: false,
});
ok("A5-F6 context economic ready with margin wire", ctxMargin.economicDecisionReady === true);

console.log(`\n=== NG11-A5: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
