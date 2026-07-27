/**
 * COST-S3 — AI Cost Intelligence Engine
 * npx vite-node scripts/test-cost-s3-cost-intelligence.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import { mapOfferBoqDocument } from "../src/lib/tender-offer-boq-mapping.ts";
import {
  analyzeOfferBoqLineCostIntelligence,
  applyOfferBoqCostIntelligence,
  countDecompositionElements,
} from "../src/lib/tender-offer-boq-cost-intelligence.ts";

const FIXED_AT = "2026-07-27T06:00:00.000Z";

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
  },
  {
    id: "wc-ups-montaz",
    tradeId: "ELEKTRYKA",
    namePl: "Montaż UPS",
    unit: "szt",
    companyPricePln: 800,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["ups", "montaz", "zasilacz"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "ELEKTRYKA",
  },
  {
    id: "wc-ups-dostawa",
    tradeId: "TRANSPORT",
    namePl: "Dostawa UPS",
    unit: "szt",
    companyPricePln: 120,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["ups", "dostawa", "transport"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "TRANSPORT",
  },
];

const snap = {
  ok: true,
  sourceFilename: "przedmiar-s3.pdf",
  rowCount: 5,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie dwukrotne ścian farbą lateksową",
      unit: "m2",
      quantity: "120",
    },
    {
      lp: "2",
      description: "Dostawa i montaż UPS 10 kVA",
      unit: "szt",
      quantity: "2",
    },
    {
      lp: "3",
      description: "Wymiana instalacji elektrycznej w budynku biurowym",
      unit: "kpl",
      quantity: "1",
    },
    {
      lp: "4",
      description: "Oprawa LED natynkowa 36W",
      unit: "szt",
      quantity: "40",
    },
    {
      lp: "5",
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
  tenderId: "tid-s3",
  snapshot: snap,
  builtAt: FIXED_AT,
});
assert.equal(base.lines[0].costIntelligence, null);
assert.equal(base.costIntelligenceStats, null);

const mapped = mapOfferBoqDocument(base, { works, mappedAt: FIXED_AT });
const analyzed = applyOfferBoqCostIntelligence(mapped, { analyzedAt: FIXED_AT });

assert.equal(analyzed.buildStatus, "analyzed");
assert.ok(analyzed.costIntelligenceStats);
assert.equal(analyzed.costIntelligenceStats.withIntelligence, 5);
assert.equal(analyzed.costIntelligenceAppliedAt, FIXED_AT);

const paint = analyzed.lines[0];
assert.ok(paint.costIntelligence);
assert.equal(paint.costIntelligence.lineKind, "MaterialInstallation");
assert.equal(paint.costIntelligence.requiresDecomposition, false);
assert.equal(countDecompositionElements(paint.costIntelligence), 0);
assert.ok(paint.costIntelligence.pricingComponents.includes("material"));
assert.ok(paint.costIntelligence.pricingComponents.includes("labor"));
assert.match(paint.costIntelligence.aiRationale, /Malowanie|materiał/i);
assert.equal(paint.lineTotalPln, null);
assert.equal(paint.materialCostPln, null);

const ups = analyzed.lines[1];
assert.equal(ups.costIntelligence.lineKind, "SupplyInstallation");
assert.equal(ups.costIntelligence.requiresDecomposition, true);
assert.ok(countDecompositionElements(ups.costIntelligence) >= 5);
assert.ok(ups.costIntelligence.pricingStrategyId === "supply_and_install" || ups.costIntelligence.requiresDecomposition);
assert.ok(ups.costIntelligence.plannedEngines.includes("transport"));
assert.ok(ups.costIntelligence.aiRationale.length > 40);

const install = analyzed.lines[2];
assert.equal(install.costIntelligence.lineKind, "CompleteSystem");
assert.equal(install.costIntelligence.requiresDecomposition, true);
assert.ok(countDecompositionElements(install.costIntelligence) >= 6);
assert.ok(
  install.costIntelligence.decompositionElements.some((e) => /przewod|puszk|pomiar/i.test(e.labelPl)),
);

const led = analyzed.lines[3];
assert.equal(led.costIntelligence.lineKind, "Equipment");
assert.equal(led.costIntelligence.requiresDecomposition, false);
assert.match(led.costIntelligence.aiRationale, /opraw|LED|produkt/i);

const meas = analyzed.lines[4];
assert.equal(meas.costIntelligence.lineKind, "Measurement");
assert.equal(meas.costIntelligence.requiresDecomposition, false);
assert.ok(meas.costIntelligence.pricingComponents.includes("labor"));
assert.ok(meas.costIntelligence.plannedEngines.includes("labour"));

// API linii
const one = analyzeOfferBoqLineCostIntelligence(mapped.lines[0], { analyzedAt: FIXED_AT });
assert.equal(one.lineKind, "MaterialInstallation");
assert.ok(one.lineKindLabelPl);
assert.ok(one.pricingStrategyLabelPl);

assert.ok(analyzed.costIntelligenceStats.decomposedCount >= 2);
assert.equal(analyzed.lines.every((l) => l.costIntelligence != null), true);

console.log("COST-S3 Cost Intelligence tests: PASS");
console.log(
  JSON.stringify(
    {
      stats: analyzed.costIntelligenceStats,
      sample: analyzed.lines.map((l) => ({
        lp: l.lp,
        kind: l.costIntelligence.lineKind,
        strategy: l.costIntelligence.pricingStrategyId,
        decomp: l.costIntelligence.requiresDecomposition,
        elems: countDecompositionElements(l.costIntelligence),
        conf: l.costIntelligence.confidence,
      })),
    },
    null,
    2,
  ),
);
