/**
 * P1 — OfferBoq unit-family candidate admission gate.
 * npx vite-node scripts/test-offer-boq-unit-family-gate-p1.mjs
 */
import assert from "node:assert/strict";
import { areOfferBoqUnitFamiliesCompatible } from "../src/lib/tender-offer-boq-unit-family.ts";
import { mapOfferBoqLineCore } from "../src/lib/tender-offer-boq-mapping.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import {
  buildCanonicalFieldsForReconciledPair,
  normalizeBoqLineForMerge,
  canReconcileAthPdfPair,
} from "../src/lib/multi-boq/boq-line-normalize.ts";
import { parseCanonicalQuantity } from "../src/lib/multi-boq/index.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}

// ─── 1. Compatible pairs ───────────────────────────────────────────
const compatible = [
  ["szt", "szt"],
  ["mb", "mb"],
  ["m", "m"],
  ["m", "mb"],
  ["m2", "m2"],
  ["m3", "m³"],
  ["m³", "m3"],
  ["msc", "msc"],
  ["kpl", "kpl"],
  ["kpl.", "kpl"],
  ["szt.", "szt"],
];
for (const [a, b] of compatible) {
  ok(`compatible ${a}↔${b}`, areOfferBoqUnitFamiliesCompatible(a, b) === true);
}

// ─── 2. Incompatible pairs ─────────────────────────────────────────
const incompatible = [
  ["szt", "m2"],
  ["szt", "mb"],
  ["szt", "m3"],
  ["m2", "mb"],
  ["m", "m2"],
  ["mb", "m3"],
  ["szt", "rbh"],
];
for (const [a, b] of incompatible) {
  ok(`incompatible ${a}↔${b}`, areOfferBoqUnitFamiliesCompatible(a, b) === false);
}

// ─── 3. Unknown — conservative KEEP ────────────────────────────────
ok("unknown↔known", areOfferBoqUnitFamiliesCompatible("xyz", "szt") === true);
ok("known↔unknown", areOfferBoqUnitFamiliesCompatible("szt", "foo") === true);
ok("null↔szt", areOfferBoqUnitFamiliesCompatible(null, "szt") === true);
ok("szt↔empty", areOfferBoqUnitFamiliesCompatible("szt", "") === true);
ok("msc↔szt (msc unclassifiable)", areOfferBoqUnitFamiliesCompatible("msc", "szt") === true);

// ─── 4. 6b51a6e8 unit normalization unchanged ──────────────────────
ok("kpl. → szt via normalize", normalizeWgdomCostUnit("kpl.") === "szt");
ok("kpl → szt via normalize", normalizeWgdomCostUnit("kpl") === "szt");

{
  const athDesc =
    "Wymiana wyłączników i gniazd wtykowych wraz z osprzętem instalacyjnym";
  const athNorm = normalizeBoqLineForMerge({
    lp: "5",
    description: athDesc,
    unit: "msc.",
    quantityRaw: "4",
    sourceKind: "ath",
  });
  const pdfNorm = normalizeBoqLineForMerge({
    lp: "5",
    description: "Wymiana",
    unit: "szt",
    quantityRaw: "4,00",
    sourceKind: "pdf",
  });
  const ath = {
    sourceKind: "ath",
    lp: "5",
    description: athDesc,
    unit: "msc.",
    quantityRaw: "4",
    normalized: athNorm,
  };
  const pdf = {
    sourceKind: "pdf",
    lp: "5",
    description: "Wymiana",
    unit: "szt",
    quantityRaw: "4,00",
    normalized: pdfNorm,
  };
  ok("stub pair canReconcile", canReconcileAthPdfPair(ath, pdf));
  const fields = buildCanonicalFieldsForReconciledPair(ath, pdf);
  ok("ATH msc. + PDF szt stub → canonical szt", fields.unit === "szt", fields);
  ok(
    "stub qty unchanged",
    parseCanonicalQuantity(fields.quantityRaw).canonical === "4",
    fields,
  );
}

// ─── 5. Mapping admission: wrong-unit peers dropped before top-4 ───
const FIXED_AT = "2026-09-02T00:00:00.000Z";
const works = [
  {
    id: "wc-zlew-szt",
    tradeId: "HYDRAULIKA",
    namePl: "Montaż zlewozmywaka",
    unit: "szt",
    companyPricePln: 100,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["zlewozmywak", "zlew"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "HYDRAULIKA",
  },
  {
    id: "wc-mal-m2",
    tradeId: "MALOWANIE",
    namePl: "Malowanie zlewozmywaka ścian",
    unit: "m2",
    companyPricePln: 28,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie", "zlewozmywak", "scian"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "MALOWANIE",
  },
  {
    id: "wc-mal-mb",
    tradeId: "MALOWANIE",
    namePl: "Malowanie rur zlewozmywak",
    unit: "mb",
    companyPricePln: 15,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie", "rur", "zlewozmywak"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "MALOWANIE",
  },
];

const mapped = mapOfferBoqLineCore(
  {
    lineId: "t1",
    lp: "7",
    description: "Wymiana zlewozmywaka blaszanego emaliowanego",
    unit: "szt",
    quantity: 1,
    quantityRaw: "1",
    knrHint: null,
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    matchMethod: "unmatched",
    matchedBy: "snapshot",
    matchConfidence: "low",
    aiRationale: "",
    materialCostPln: null,
    laborCostPln: null,
    lineTotalPln: null,
    candidateMatches: [],
    reviewRequired: false,
    editableFields: [],
  },
  { works },
);

const candIds = (mapped.candidateMatches ?? []).map((c) => c.catalogWorkId);
ok("P1 drops m2 competitor", !candIds.includes("wc-mal-m2"), candIds);
ok("P1 drops mb competitor", !candIds.includes("wc-mal-mb"), candIds);
ok("P1 keeps szt competitor", candIds.includes("wc-zlew-szt"), candIds);
ok(
  "P1 does not auto-invent multi ambiguity when only one compatible",
  candIds.length === 1,
  candIds,
);

console.log(`\nP1 unit-family gate: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
assert.ok(pass > 0);
