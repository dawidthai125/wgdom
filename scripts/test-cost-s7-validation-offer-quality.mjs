/**
 * COST-S7 — AI Validation & Offer Quality
 * npx vite-node scripts/test-cost-s7-validation-offer-quality.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqExplainabilityView } from "../src/lib/tender-offer-boq-explainability.ts";

const FIXED_AT = "2026-07-27T12:30:00.000Z";

const item = {
  id: "tid-s7",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-s7.pdf",
      rowCount: 2,
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
          description: "Dostawa i montaż opraw awaryjnych LED",
          unit: "szt",
          quantity: "18",
        },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
    swz: {
      implementationDays: 40,
      estimatedValuePln: 120000,
    },
    fit: {
      priceWeightPct: 65,
    },
  },
};

const view = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT });
assert.equal(view.available, true);
assert.ok(view.offerReadiness?.available);
assert.ok(view.aiQuality?.available);

const readiness = view.offerReadiness;
assert.ok(readiness.completenessPct >= 0 && readiness.completenessPct <= 100);
assert.ok(readiness.qualityScore >= 0 && readiness.qualityScore <= 100);
assert.ok(["ready", "review_required", "not_ready"].includes(readiness.status));
assert.ok(readiness.recommendationCount >= 0);

const quality = view.aiQuality;
assert.ok(quality.completeness.recognizedPct >= 0);
assert.ok(quality.completeness.classifiedPct >= 0);
assert.ok(quality.completeness.pricedPct >= 0);
assert.ok(quality.completeness.passedToBidPct >= 0);
assert.ok(Array.isArray(quality.qualityExplainability.reasoningPl));
assert.ok(quality.qualityExplainability.reasoningPl.length >= 2);
assert.ok(Array.isArray(quality.recommendations));

console.log("COST-S7 validation & offer quality: PASS", {
  completeness: readiness.completenessPct,
  score: readiness.qualityScore,
  status: readiness.status,
  recommendations: readiness.recommendationCount,
});
