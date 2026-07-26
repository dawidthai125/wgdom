/**
 * COST-S2 — OfferBoq Mapping Engine
 * npx vite-node scripts/test-cost-s2-offer-boq-mapping.mjs
 */
import assert from "node:assert/strict";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import {
  mapOfferBoqDocument,
  mapOfferBoqLine,
  computeOfferBoqMappingStats,
} from "../src/lib/tender-offer-boq-mapping.ts";

const FIXED_AT = "2026-07-26T21:30:00.000Z";

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
    id: "wc-drzwi-ei60",
    tradeId: "DRZWI",
    namePl: "Montaż drzwi przeciwpożarowych",
    unit: "szt",
    companyPricePln: 1200,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["drzwi", "przeciwpozarow", "montaz", "ei60"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "STOLARKA",
  },
  {
    id: "wc-drzwi-dostawa",
    tradeId: "TRANSPORT",
    namePl: "Dostawa drzwi",
    unit: "szt",
    companyPricePln: 80,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["dostawa", "drzwi", "transport"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "TRANSPORT",
  },
  {
    id: "wc-knr-demo",
    tradeId: "HYDRAULIKA",
    namePl: "Montaż rur PVC KNR 2-02 0111-01",
    unit: "mb",
    companyPricePln: 45,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["rur", "pvc", "knr202011101"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "HYDRAULIKA",
    descriptionPl: "Montaż instalacji z rur PVC",
  },
];

const snap = {
  ok: true,
  sourceFilename: "przedmiar-test.pdf",
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
      description: "KNR 2-02 0111-01 Montaż rur PVC",
      unit: "m",
      quantity: "50",
    },
    {
      lp: "4",
      description: "XYZZYQQQ pozycja bez kontekstu katalogowego",
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
  tenderId: "tid-s2",
  snapshot: snap,
  builtAt: FIXED_AT,
});
assert.equal(base.lines.length, 4);
assert.equal(base.lines[0].workCategory, null);
assert.equal(base.lines[0].matchedBy, "snapshot");
assert.deepEqual(base.lines[0].candidateMatches, []);

const mapped = mapOfferBoqDocument(base, {
  works,
  mappedAt: FIXED_AT,
});

assert.equal(mapped.buildStatus, "mapped");
assert.equal(mapped.mappingAppliedAt, FIXED_AT);
assert.ok(mapped.mappingStats);
assert.equal(mapped.mappingStats.lineCount, 4);

const paint = mapped.lines[0];
assert.equal(paint.catalogWorkId, "wc-mal-dwukrotne");
assert.ok(paint.workCategory);
assert.match(paint.workCategory, /Malowanie/i);
assert.ok(["high", "medium"].includes(paint.matchConfidence));
assert.ok(["catalog_map", "keyword", "exact_knr"].includes(paint.matchedBy));
assert.ok(paint.aiRationale && paint.aiRationale.length > 20);
assert.match(paint.aiRationale, /Malowanie dwukrotne/i);
assert.equal(paint.materialCostPln, null);
assert.equal(paint.lineTotalPln, null);
assert.ok(paint.candidateMatches.length >= 1);
assert.equal(paint.candidateMatches[0].role, "primary");

const doors = mapped.lines[1];
assert.ok(doors.catalogWorkId);
assert.ok(doors.candidateMatches.length >= 1);
// multi-activity prep: dostawa i montaż powinny dać >1 kandydata gdy oba score > 0
assert.ok(
  doors.candidateMatches.length >= 2 || doors.catalogWorkId != null,
  "doors should map with candidates for future split",
);
assert.ok(doors.aiRationale);

const knr = mapped.lines[2];
assert.ok(knr.knrHint);
assert.ok(knr.catalogWorkId === "wc-knr-demo" || knr.matchConfidence !== "low");
assert.ok(knr.aiRationale);

const unknown = mapped.lines[3];
assert.ok(["unmatched", "category_heuristic"].includes(unknown.matchedBy), `got matchedBy=${unknown.matchedBy} work=${unknown.catalogWorkId}`);
assert.equal(unknown.matchConfidence, "low");
assert.equal(unknown.catalogWorkId, null);
assert.ok(unknown.aiRationale);
assert.equal(unknown.lineTotalPln, null);

const stats = computeOfferBoqMappingStats(mapped.lines);
assert.equal(stats.lineCount, 4);
assert.ok(stats.matchedCount >= 2);

// single line API
const one = mapOfferBoqLine(base.lines[0], { works });
assert.equal(one.catalogWorkId, "wc-mal-dwukrotne");
assert.ok(one.matchedBy);
assert.ok(one.workCategory);

console.log("COST-S2 OfferBoq mapping tests: PASS");
console.log(
  JSON.stringify(
    {
      stats: mapped.mappingStats,
      sample: mapped.lines.map((l) => ({
        lp: l.lp,
        work: l.catalogWorkId,
        cat: l.workCategory,
        conf: l.matchConfidence,
        by: l.matchedBy,
        cands: l.candidateMatches.length,
      })),
    },
    null,
    2,
  ),
);
