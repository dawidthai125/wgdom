/**
 * COST-S4.1 — Explainability ViewModel (RO)
 * npx vite-node scripts/test-cost-s4.1-explainability.mjs
 */
import assert from "node:assert/strict";
import {
  buildOfferBoqExplainabilityView,
  resolveOfferBoqExplainConfidenceBadge,
} from "../src/lib/tender-offer-boq-explainability.ts";

const FIXED_AT = "2026-07-27T08:00:00.000Z";

const high = resolveOfferBoqExplainConfidenceBadge("high");
assert.equal(high.emoji, "🟢");
assert.match(high.labelPl, /Wysoka/i);

const mid = resolveOfferBoqExplainConfidenceBadge("medium");
assert.equal(mid.emoji, "🟡");
assert.match(mid.labelPl, /weryfikacji/i);

const low = resolveOfferBoqExplainConfidenceBadge("low");
assert.equal(low.emoji, "🔴");

const forced = resolveOfferBoqExplainConfidenceBadge("high", true);
assert.equal(forced.emoji, "🟡");

const emptyItem = {
  id: "t-empty",
  tenderDossier: { kosztorys: null },
};
const empty = buildOfferBoqExplainabilityView({ item: emptyItem, builtAt: FIXED_AT });
assert.equal(empty.available, false);
assert.ok(empty.emptyReasonPl);

const item = {
  id: "tid-s41",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-s41.pdf",
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
assert.ok(view.summary);
assert.equal(view.summary.lineCount, 2);
assert.ok(view.summary.directCostDisplay);
assert.ok(view.summary.averageConfidenceBadge.emoji);
assert.equal(view.lines.length, 2);

for (const line of view.lines) {
  assert.ok(line.lineKindLabelPl);
  assert.ok(line.pricingStrategyLabelPl);
  assert.ok(line.whyAiDecisionPl.length > 20);
  assert.ok(line.confidenceBadge.labelPl);
  assert.ok(Array.isArray(line.components));
  assert.ok(line.componentCount >= 1);
  for (const c of line.components) {
    assert.ok(c.namePl);
    assert.ok(c.categoryLabelPl);
    assert.ok(c.sourceLabelPl);
    assert.ok(c.aiRationale);
    assert.ok(c.confidenceBadge.emoji);
    assert.equal(typeof c.requiresUserReview, "boolean");
  }
}

const paint = view.lines[0];
assert.match(paint.whyAiDecisionPl, /malowan|Materiał|strateg/i);
assert.ok(paint.decompositionLabelPl);

const ups = view.lines.find((l) => /UPS/i.test(l.description));
assert.ok(ups);
assert.ok(ups.componentCount >= 2);

// document present for future edit prep — read only in S4.1
assert.ok(view.document);
assert.equal(view.document.totals.recommendedBidPln, null);
assert.equal(view.document.totals.marginPln, null);

console.log("COST-S4.1 Explainability tests: PASS");
console.log(
  JSON.stringify(
    {
      summary: view.summary,
      lines: view.lines.map((l) => ({
        lp: l.lp,
        kind: l.lineKindLabelPl,
        comps: l.componentCount,
        badge: l.confidenceBadge.labelPl,
        review: l.requiresUserReview,
      })),
    },
    null,
    2,
  ),
);
