/**
 * COST-S1 — OfferBoq from TenderKosztorysSnapshot
 * npx vite-node scripts/test-cost-s1-offer-boq.mjs
 */
import assert from "node:assert/strict";
import {
  OFFER_BOQ_SCHEMA_VERSION,
  buildOfferBoqFromSnapshot,
  markOfferBoqLineEdited,
  replaceOfferBoqLine,
  parseOfferBoqQuantity,
  buildOfferBoqLineId,
} from "../src/lib/tender-offer-boq.ts";

const FIXED_AT = "2026-07-26T15:00:00.000Z";

function snapCatalog() {
  return {
    ok: true,
    sourceFilename: "przedmiar.pdf",
    rowCount: 2,
    rows: [],
    catalogQuantities: [
      {
        lp: "1.1",
        description: "KNR 2-02 0111-01 Montaż rur PVC",
        unit: "m",
        quantity: "120,5",
      },
      {
        lp: "1.2",
        description: "Roboty ziemne",
        unit: "m3",
        quantity: "10",
      },
    ],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: FIXED_AT,
    currency: "PLN",
  };
}

function snapRowsOnly() {
  return {
    ok: true,
    sourceFilename: "koszt.ath",
    rowCount: 1,
    rows: [
      {
        lp: "3",
        description: "Posadzka",
        unit: "m2",
        quantity: "25",
        unitPrice: "45,00",
        total: "1 125,00",
      },
    ],
    przedmiar: [],
    categories: [],
    warnings: ["ATH preview truncated"],
    parsedAt: FIXED_AT,
  };
}

// --- parse helpers ---
assert.equal(parseOfferBoqQuantity("120,5"), 120.5);
assert.equal(parseOfferBoqQuantity(""), 0);
assert.ok(buildOfferBoqLineId("t1", "1", "x", 0).startsWith("obl_"));

// --- catalog path ---
const doc = buildOfferBoqFromSnapshot({
  tenderId: "tid-cost-s1",
  snapshot: snapCatalog(),
  builtAt: FIXED_AT,
});

assert.equal(doc.schemaVersion, OFFER_BOQ_SCHEMA_VERSION);
assert.equal(doc.tenderId, "tid-cost-s1");
assert.equal(doc.buildStatus, "structural_only");
assert.equal(doc.lines.length, 2);
assert.equal(doc.totals.lineCount, 2);
assert.equal(doc.totals.pricedLineCount, 0);
assert.equal(doc.totals.recommendedBidPln, null);
assert.equal(doc.parserSnapshotRef.sourceFilename, "przedmiar.pdf");
assert.equal(doc.parserSnapshotRef.kosztorysParsedAt, FIXED_AT);

const l0 = doc.lines[0];
assert.equal(l0.lp, "1.1");
assert.equal(l0.quantity, 120.5);
assert.equal(l0.unit, "m");
assert.equal(l0.materialCostPln, null);
assert.equal(l0.laborCostPln, null);
assert.equal(l0.equipmentCostPln, null);
assert.equal(l0.kpPln, null);
assert.equal(l0.marginPln, null);
assert.equal(l0.lineTotalPln, null);
assert.equal(l0.userEdited, false);
assert.deepEqual(l0.editedFields, []);
assert.equal(l0.materialSource.kind, "unknown");
assert.equal(l0.aiRationale, null);
assert.equal(l0.matchMethod, "snapshot");
assert.equal(l0.matchedBy, "snapshot");
assert.equal(l0.workCategory, null);
assert.deepEqual(l0.candidateMatches, []);
assert.equal(doc.mappingStats, null);
assert.ok(l0.knrHint); // KNR hint from description
assert.ok(l0.pricingSourceLabelPl.length > 0);
assert.ok(doc.recomputeToken.startsWith("rt_"));
assert.equal(doc.schemaVersion, OFFER_BOQ_SCHEMA_VERSION);
const both = buildOfferBoqFromSnapshot({
  tenderId: "t2",
  snapshot: {
    ...snapCatalog(),
    rows: [
      {
        lp: "9",
        description: "ignored row",
        unit: "szt",
        quantity: "1",
        unitPrice: "",
        total: "",
      },
    ],
  },
  builtAt: FIXED_AT,
});
assert.equal(both.lines[0].lp, "1.1");
assert.equal(both.lines.length, 2);

// --- rows fallback + ATH seed not used as offer price ---
const fromRows = buildOfferBoqFromSnapshot({
  tenderId: "t3",
  snapshot: snapRowsOnly(),
  builtAt: FIXED_AT,
});
assert.equal(fromRows.lines.length, 1);
assert.ok(fromRows.warnings.some((w) => /catalogQuantities/i.test(w)));
assert.equal(fromRows.lines[0].lineTotalPln, null);
assert.equal(fromRows.lines[0].athUnitPricePln, 45);
assert.equal(fromRows.lines[0].athTotalPln, 1125);
assert.ok(fromRows.lines[0].warnings.some((w) => /ATH/i.test(w)));

// --- empty ---
const empty = buildOfferBoqFromSnapshot({ tenderId: "t4", snapshot: null, builtAt: FIXED_AT });
assert.equal(empty.buildStatus, "empty");
assert.equal(empty.lines.length, 0);

// --- edit prep (no recompute) ---
const edited = markOfferBoqLineEdited(l0, "material", { materialUnitPln: 12.5 });
assert.equal(edited.userEdited, true);
assert.deepEqual(edited.editedFields, ["material"]);
assert.equal(edited.materialUnitPln, 12.5);
assert.equal(edited.materialSource.kind, "manual");
assert.equal(edited.lineTotalPln, null); // S1: no calc

const bumped = replaceOfferBoqLine(doc, edited);
assert.equal(bumped.version, doc.version + 1);
assert.notEqual(bumped.recomputeToken, doc.recomputeToken);
assert.equal(bumped.lines[0].materialUnitPln, 12.5);

console.log("COST-S1 OfferBoq tests: PASS");
