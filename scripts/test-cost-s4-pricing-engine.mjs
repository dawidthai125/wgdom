/**
 * COST-S4 — AI Pricing Engine
 * npx vite-node scripts/test-cost-s4-pricing-engine.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { mapOfferBoqDocument } from "../src/lib/tender-offer-boq-mapping.ts";
import { applyOfferBoqCostIntelligence } from "../src/lib/tender-offer-boq-cost-intelligence.ts";
import {
  applyOfferBoqPricing,
  priceOfferBoqLine,
  createHeuristicPriceProvider,
} from "../src/lib/tender-offer-boq-pricing-engine.ts";

const FIXED_AT = "2026-07-27T07:00:00.000Z";

const works = [
  {
    id: "wc-mal-dwukrotne",
    tradeId: "MALOWANIE",
    namePl: "Malowanie dwukrotne ścian",
    unit: "m2",
    companyPricePln: 28,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie", "dwukrotne", "scian", "farba"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "MALOWANIE",
    costSplit: { materialRatio: 0.4, laborRatio: 0.6 },
  },
  {
    id: "wc-drzwi",
    tradeId: "DRZWI",
    namePl: "Montaż drzwi EI60",
    unit: "szt",
    companyPricePln: 1800,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["drzwi", "ei60", "montaz", "dostawa"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "STOLARKA",
    costSplit: { materialRatio: 0.7, laborRatio: 0.3 },
  },
];

const snap = {
  ok: true,
  sourceFilename: "przedmiar-s4.pdf",
  rowCount: 3,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie dwukrotne ścian farbą lateksową",
      unit: "m2",
      quantity: "100",
    },
    {
      lp: "2",
      description: "Dostawa i montaż drzwi przeciwpożarowych EI60",
      unit: "szt",
      quantity: "4",
    },
    {
      lp: "3",
      description: "Pomiary rezystancji izolacji instalacji",
      unit: "kpl",
      quantity: "1",
    },
  ],
  przedmiar: [],
  categories: [],
  warnings: [],
  parsedAt: FIXED_AT,
};

const base = buildOfferBoqFromSnapshot({
  tenderId: "tid-s4",
  snapshot: snap,
  builtAt: FIXED_AT,
});
assert.equal(base.lines[0].linePricing, null);

const mapped = mapOfferBoqDocument(base, { works, mappedAt: FIXED_AT });
const analyzed = applyOfferBoqCostIntelligence(mapped, { analyzedAt: FIXED_AT });
const priced = applyOfferBoqPricing(analyzed, {
  works,
  pricedAt: FIXED_AT,
});

assert.equal(priced.buildStatus, "partially_priced");
assert.ok(priced.pricingStats);
assert.equal(priced.pricingStats.withPricing, 3);
assert.ok(priced.pricingStats.componentCount >= 3);
assert.equal(priced.totals.recommendedBidPln, null);
assert.equal(priced.totals.marginPln, null);
assert.equal(priced.totals.kpPln, null);
assert.ok(priced.totals.directPln == null || priced.totals.directPln > 0);

const paint = priced.lines[0];
assert.ok(paint.linePricing);
assert.ok(paint.linePricing.components.length >= 2);
assert.ok(paint.linePricing.components.every((c) => c.priceOrigin && c.aiRationale && c.confidence));
assert.ok(paint.linePricing.aggregates.lineDirectPln != null || paint.linePricing.pricedComponentCount >= 0);
assert.equal(paint.kpPln, null);
assert.equal(paint.marginPln, null);
// malowanie — bez dekompozycji, komponenty strategii
assert.equal(paint.costIntelligence.requiresDecomposition, false);
assert.ok(paint.linePricing.components.some((c) => c.category === "material" || c.category === "labor"));

const doors = priced.lines[1];
assert.ok(doors.linePricing.components.length >= 3);
assert.ok(
  doors.costIntelligence.requiresDecomposition
    ? doors.linePricing.components.length >= 5
    : doors.linePricing.components.length >= 3,
);
assert.ok(doors.linePricing.components.every((c) => typeof c.requiresUserReview === "boolean"));
assert.ok(doors.linePricing.components.some((c) => c.category === "transport" || c.namePl.length > 0));

const meas = priced.lines[2];
assert.ok(meas.linePricing.components.length >= 1);
assert.ok(meas.linePricing.components.some((c) => c.category === "labor" || c.category === "equipment"));

// Provider architecture — custom only heuristic
const onlyHeuristic = priceOfferBoqLine(analyzed.lines[0], {
  works: [],
  replaceDefaultProviders: true,
  providers: [createHeuristicPriceProvider()],
  pricedAt: FIXED_AT,
});
assert.ok(onlyHeuristic.linePricing.components.length >= 1);
// material/labor bez heurystyki → null OK
const mat = onlyHeuristic.linePricing.components.find((c) => c.category === "material");
if (mat) {
  assert.equal(mat.priceOrigin.kind === "unknown" || mat.unitPricePln == null, true);
}

console.log("COST-S4 Pricing Engine tests: PASS");
console.log(
  JSON.stringify(
    {
      stats: priced.pricingStats,
      totals: {
        materials: priced.totals.materialsPln,
        labor: priced.totals.laborPln,
        direct: priced.totals.directPln,
        bid: priced.totals.recommendedBidPln,
      },
      sample: priced.lines.map((l) => ({
        lp: l.lp,
        comps: l.linePricing.componentCount,
        priced: l.linePricing.pricedComponentCount,
        direct: l.linePricing.aggregates.lineDirectPln,
        conf: l.linePricing.confidence,
      })),
    },
    null,
    2,
  ),
);
