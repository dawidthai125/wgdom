/**
 * COST-S5 — edycja komponentów + przeliczenie
 * npx vite-node scripts/test-cost-s5-component-edit.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqExplainabilityView, presentOfferBoqExplainabilityView } from "../src/lib/tender-offer-boq-explainability.ts";
import {
  approveOfferBoqComponentInDocument,
  patchOfferBoqComponentInDocument,
  computeOfferBoqUserEditStats,
} from "../src/lib/tender-offer-boq-component-edit.ts";

const FIXED_AT = "2026-07-27T09:00:00.000Z";

const item = {
  id: "tid-s5",
  tenderDossier: {
    kosztorys: {
      ok: true,
      sourceFilename: "przedmiar-s5.pdf",
      rowCount: 1,
      rows: [],
      catalogQuantities: [
        {
          lp: "1",
          description: "Malowanie dwukrotne ścian farbą lateksową",
          unit: "m2",
          quantity: "10",
        },
      ],
      przedmiar: [],
      categories: [],
      warnings: [],
      parsedAt: FIXED_AT,
    },
  },
};

const baseline = buildOfferBoqExplainabilityView({ item, builtAt: FIXED_AT, positionCostCutover: false });
assert.ok(baseline.document);
assert.ok(baseline.summary);
assert.equal(baseline.summary.aiOnlyCount >= 1, true);
assert.equal(baseline.summary.approvedCount, 0);
assert.equal(baseline.summary.changedCount, 0);

let doc = baseline.document;
const line = doc.lines[0];
assert.ok(line.linePricing);
const comp = line.linePricing.components[0];
assert.ok(comp);
const beforeDirect = line.linePricing.aggregates.lineDirectPln;

doc = patchOfferBoqComponentInDocument(
  doc,
  line.lineId,
  comp.componentId,
  { unitPricePln: 99, quantity: 10 },
  FIXED_AT,
);

const updated = doc.lines[0].linePricing.components.find((c) => c.componentId === comp.componentId);
assert.ok(updated);
assert.equal(updated.unitPricePln, 99);
assert.equal(updated.totalPln, 990);
assert.equal(updated.editStatus, "user_changed");
assert.ok((updated.changeHistory?.length ?? 0) >= 1);
assert.ok(updated.changeHistory.some((h) => h.field === "unitPricePln"));
assert.notEqual(doc.lines[0].linePricing.aggregates.lineDirectPln, beforeDirect);
assert.equal(doc.totals.recommendedBidPln, null);
assert.equal(doc.totals.marginPln, null);
assert.equal(doc.totals.kpPln, null);

const stats1 = computeOfferBoqUserEditStats(doc);
assert.equal(stats1.changedCount >= 1, true);

doc = approveOfferBoqComponentInDocument(
  doc,
  line.lineId,
  doc.lines[0].linePricing.components[1]?.componentId ?? comp.componentId,
  FIXED_AT,
);
const stats2 = computeOfferBoqUserEditStats(doc);
assert.equal(stats2.approvedCount + stats2.changedCount >= 1, true);

const presented = presentOfferBoqExplainabilityView(doc, FIXED_AT);
assert.equal(presented.summary.changedCount, stats2.changedCount);
assert.equal(presented.summary.approvedCount, stats2.approvedCount);
assert.ok(presented.lines[0].components.some((c) => c.editStatus === "user_changed" || c.editStatus === "user_approved"));

// historia nie jest kasowana przy kolejnej zmianie
const histLen = updated.changeHistory.length;
doc = patchOfferBoqComponentInDocument(
  doc,
  line.lineId,
  comp.componentId,
  { namePl: "Materiał — korekta" },
  "2026-07-27T09:01:00.000Z",
);
const again = doc.lines[0].linePricing.components.find((c) => c.componentId === comp.componentId);
assert.ok((again.changeHistory?.length ?? 0) > histLen);

console.log("COST-S5 component edit tests: PASS");
console.log(
  JSON.stringify(
    {
      stats: doc.userEditStats,
      direct: doc.totals.directPln,
      bid: doc.totals.recommendedBidPln,
    },
    null,
    2,
  ),
);
