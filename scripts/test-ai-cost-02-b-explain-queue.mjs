/**
 * AI-COST-02-B — Explain enrichment + Queue + flag (default OFF)
 * npx vite-node scripts/test-ai-cost-02-b-explain-queue.mjs
 */
import assert from "node:assert/strict";
import {
  AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT,
  AI_COST_02_B_EXPLAIN_QUEUE_LS_KEY,
  forceAiCost02bExplainQueueForTests,
  isAiCost02bExplainQueueEnabled,
} from "../src/lib/ai-cost-02-b-flag.ts";
import { buildOfferBoq02bQueue } from "../src/lib/tender-offer-boq-02b-queue.ts";
import {
  buildOfferBoq02bExplainEnrichment,
  buildOfferBoqExplainabilityView,
} from "../src/lib/tender-offer-boq-explainability.ts";
import { forceCostBidGap01CatalogCalForTests } from "../src/lib/tenders-v4-config.ts";

const FIXED_AT = "2026-07-29T12:00:00.000Z";

// --- Flag default OFF ---
forceAiCost02bExplainQueueForTests(null);
assert.equal(AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT, false);
assert.equal(AI_COST_02_B_EXPLAIN_QUEUE_LS_KEY, "kw-ai-cost-02-b-explain-queue");
assert.equal(isAiCost02bExplainQueueEnabled(), false);

forceAiCost02bExplainQueueForTests(true);
assert.equal(isAiCost02bExplainQueueEnabled(), true);
forceAiCost02bExplainQueueForTests(false);
assert.equal(isAiCost02bExplainQueueEnabled(), false);
forceAiCost02bExplainQueueForTests(null);

// --- Queue: severity then lineDirect; no impactScore formula touch ---
const lines = [
  {
    lineId: "L1",
    lp: "1",
    description: "Mała",
    lineKindLabelPl: "X",
    pricingStrategyLabelPl: "Y",
    requiresDecomposition: false,
    decompositionLabelPl: "Nie",
    decompositionElementCount: 0,
    componentCount: 1,
    confidenceBadge: { status: "review", emoji: "🟡", labelPl: "rev" },
    sourceLabelsPl: ["katalog"],
    requiresUserReview: true,
    reviewLabelPl: "rev",
    whyAiDecisionPl: "why",
    lineDirectDisplay: "100",
    lineDirectPln: 100,
    components: [],
  },
  {
    lineId: "L2",
    lp: "2",
    description: "Duża warning",
    lineKindLabelPl: "X",
    pricingStrategyLabelPl: "Y",
    requiresDecomposition: false,
    decompositionLabelPl: "Nie",
    decompositionElementCount: 0,
    componentCount: 1,
    confidenceBadge: { status: "review", emoji: "🟡", labelPl: "rev" },
    sourceLabelsPl: ["katalog"],
    requiresUserReview: true,
    reviewLabelPl: "rev",
    whyAiDecisionPl: "why",
    lineDirectDisplay: "9000",
    lineDirectPln: 9000,
    components: [],
  },
  {
    lineId: "L3",
    lp: "3",
    description: "Krytyczna mała",
    lineKindLabelPl: "X",
    pricingStrategyLabelPl: "Y",
    requiresDecomposition: false,
    decompositionLabelPl: "Nie",
    decompositionElementCount: 0,
    componentCount: 1,
    confidenceBadge: { status: "low", emoji: "🔴", labelPl: "low" },
    sourceLabelsPl: [],
    requiresUserReview: true,
    reviewLabelPl: "rev",
    whyAiDecisionPl: "why",
    lineDirectDisplay: "50",
    lineDirectPln: 50,
    components: [],
  },
];

const queue = buildOfferBoq02bQueue({
  lines,
  issues: [
    {
      id: "a",
      severity: "warning",
      code: "component_review_required",
      lineId: "L1",
      componentId: "c1",
      titlePl: "Review L1",
      detailPl: "d",
    },
    {
      id: "b",
      severity: "warning",
      code: "component_review_required",
      lineId: "L2",
      componentId: "c2",
      titlePl: "Review L2",
      detailPl: "d",
    },
    {
      id: "c",
      severity: "critical",
      code: "line_not_priced",
      lineId: "L3",
      componentId: null,
      titlePl: "Brak ceny L3",
      detailPl: "d",
    },
  ],
});

assert.equal(queue.items[0].lineId, "L3"); // critical first
assert.equal(queue.items[1].lineId, "L2"); // warning + higher direct
assert.equal(queue.items[2].lineId, "L1");
assert.equal(queue.remainingCount, 3);
assert.equal(queue.totalReviewLines, 3);

const queueResolved = buildOfferBoq02bQueue({
  lines: lines.map((l) =>
    l.lineId === "L3" ? { ...l, requiresUserReview: false } : l,
  ),
  issues: [
    {
      id: "c",
      severity: "critical",
      code: "line_not_priced",
      lineId: "L3",
      componentId: null,
      titlePl: "Brak ceny L3",
      detailPl: "d",
    },
  ],
});
assert.equal(queueResolved.remainingCount, 0);
assert.equal(queueResolved.resolvedCount, 1);

// --- Enrichment Top-5 + assumptions ---
forceCostBidGap01CatalogCalForTests(false);
const enrichment = buildOfferBoq02bExplainEnrichment({
  lines,
  item: {
    id: "t1",
    tenderDossier: {
      kosztorys: { ok: true, sourceFilename: "Z1.zip → a.ath" },
      scanSummary: {
        costDiscovery: { found: true, type: "zip_ath", source: "Z1.zip → a.ath" },
        costCandidateSources: ["Z1.zip → a.ath", "Z1.zip → b.ath"],
      },
    },
  },
  bidProposalAvailable: true,
});
assert.equal(enrichment.topImpact.length, 3);
assert.equal(enrichment.topImpact[0].lineId, "L2");
assert.ok(enrichment.topImpact[0].sharePct > 50);
assert.equal(enrichment.documents.sourceFilename, "Z1.zip → a.ath");
assert.match(enrichment.assumptions.aiDirectOnlyPl, /bez Kp/i);
assert.match(enrichment.assumptions.gapAStatusPl, /wyłączona/i);
assert.match(enrichment.assumptions.bidLayerPl, /Bid Proposal/i);

forceCostBidGap01CatalogCalForTests(true);
const enrichmentOn = buildOfferBoq02bExplainEnrichment({
  lines,
  item: null,
  bidProposalAvailable: false,
});
assert.match(enrichmentOn.assumptions.gapAStatusPl, /włączona/i);
forceCostBidGap01CatalogCalForTests(null);

// --- View attaches cost02b without mutating pricing path ---
const item = {
  id: "tid-02b",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-02b.pdf",
      rowCount: 2,
      rows: [],
      catalogQuantities: [
        {
          lp: "1",
          description: "Malowanie dwukrotne ścian farbą lateksową",
          unit: "m2",
          quantity: "50",
        },
        {
          lp: "2",
          description: "Dostawa i montaż UPS 10 kVA",
          unit: "szt",
          quantity: "1",
        },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
  },
};

const view = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT });
assert.equal(view.available, true);
assert.ok(view.cost02b);
assert.ok(view.cost02b.topImpact.length <= 5);
assert.ok(view.cost02b.topImpact.length >= 1);
assert.equal(typeof view.lines[0].lineDirectPln === "number" || view.lines[0].lineDirectPln === null, true);
for (const c of view.lines.flatMap((l) => l.components)) {
  assert.ok(c.sourceKind);
  assert.ok(c.sourceLabelPl);
}

console.log("AI-COST-02-B explain-queue tests: PASS");
