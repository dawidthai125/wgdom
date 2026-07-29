/**
 * CENY-MATERIAŁÓW-01 — Phase 1 (flag · mapping uplift · KPI · quotes gaps · memo).
 * npx vite-node scripts/test-ceny-materialow-01.mjs
 */
import assert from "node:assert/strict";
import {
  forceCenyMaterialow01ForTests,
  isCenyMaterialow01Enabled,
  CENY_MATERIALOW_01_DEFAULT,
  CENY_MATERIALOW_01_LS_KEY,
} from "../src/lib/ceny-materialow-01-flag.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { computeMaterialOriginShareSummary } from "../src/lib/offer-boq-material-origin-stats.ts";
import { computeOfferBoqQuotesGaps } from "../src/lib/offer-boq-quotes-gaps.ts";
import { createControlledMarketPriceProvider } from "../src/lib/tender-offer-boq-controlled-price-source.ts";
import { computeMarketAverageForWork } from "../src/lib/work-catalog/market-average-engine.ts";

const FIXED_AT = "2026-07-29T12:00:00.000Z";

// --- Flag default OFF ---
forceCenyMaterialow01ForTests(null);
assert.equal(CENY_MATERIALOW_01_DEFAULT, false);
assert.equal(CENY_MATERIALOW_01_LS_KEY, "kw-ceny-materialow-01");
assert.equal(isCenyMaterialow01Enabled(), false);

forceCenyMaterialow01ForTests(true);
assert.equal(isCenyMaterialow01Enabled(), true);
forceCenyMaterialow01ForTests(false);
assert.equal(isCenyMaterialow01Enabled(), false);
forceCenyMaterialow01ForTests(null);

const works = [
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
    id: "wc-oddym-klapa",
    tradeId: "WENTYLACJA",
    namePl: "Klapa oddymiająca dachowa",
    unit: "szt",
    companyPricePln: 2800,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["klapa", "oddymianie", "dach"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "WENTYLACJA",
  },
  {
    id: "wc-mal-dwukrotne",
    tradeId: "MALOWANIE",
    namePl: "Malowanie dwukrotne ścian",
    unit: "m2",
    companyPricePln: 28,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie", "dwukrotne", "scian"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    legacyCategoryId: "MALOWANIE",
    marketQuotes: {
      sekocenbud: {
        polska: {
          origin: "sekocenbud",
          price: 30,
          updatedAt: FIXED_AT,
          regionCode: "polska",
          coverage: "indicative",
          confidence: 0.8,
        },
      },
    },
  },
];

const baseLine = (description, unit = "szt") => ({
  lineId: "L1",
  lp: "1",
  description,
  unit,
  quantity: 1,
  knrHint: null,
  catalogWorkId: null,
  workCategory: null,
  matchedBy: "snapshot",
  matchConfidence: "low",
  matchMethod: "unmatched",
  aiRationale: "",
  candidateMatches: [],
  materialCostPln: null,
  laborCostPln: null,
  equipmentCostPln: null,
  lineTotalPln: null,
  linePricing: null,
  requiresUserReview: false,
  decomposition: null,
});

// --- CM-1: OFF tip — may or may not match; ON must uplift doors/oddym ---
const doorDesc = "Drzwi wewnętrzne stalowe EI60 komplet";
const onDoor = mapOfferBoqLine(baseLine(doorDesc), { works, cenyMaterialowUplift: true });
assert.equal(onDoor.catalogWorkId, "wc-drzwi-ei60", "ON: drzwi → stolarka work");
assert.ok(
  onDoor.catalogWorkId != null,
  "ON mapping assigns catalogWorkId for doors",
);
// OFF must not throw; tip parity for paint still works without uplift
const paintOff = mapOfferBoqLine(baseLine("Malowanie dwukrotne ścian wewnętrznych", "m2"), {
  works,
  cenyMaterialowUplift: false,
});
assert.equal(paintOff.catalogWorkId, "wc-mal-dwukrotne");

const oddymOn = mapOfferBoqLine(baseLine("Klapa dymowa / system oddymiania dachu"), {
  works,
  cenyMaterialowUplift: true,
});
assert.equal(oddymOn.catalogWorkId, "wc-oddym-klapa");

// --- CM-0 KPI ---
const fakeDoc = {
  lines: [
    {
      catalogWorkId: "wc-mal-dwukrotne",
      linePricing: {
        components: [
          {
            category: "material",
            namePl: "Materiał",
            totalPln: 100,
            priceOrigin: { kind: "category_rate", labelPl: "kat" },
          },
          {
            category: "material",
            namePl: "Materiał B",
            totalPln: 50,
            priceOrigin: { kind: "heuristic_estimate", labelPl: "h" },
          },
          {
            category: "labor",
            namePl: "Robocizna",
            totalPln: 999,
            priceOrigin: { kind: "work_catalog", labelPl: "wc" },
          },
        ],
      },
    },
    {
      catalogWorkId: null,
      linePricing: {
        components: [
          {
            category: "material",
            namePl: "Materiał",
            totalPln: 50,
            priceOrigin: { kind: "controlled_market", labelPl: "cm" },
          },
        ],
      },
    },
  ],
};

const kpi = computeMaterialOriginShareSummary(fakeDoc);
assert.equal(kpi.materialComponentCount, 3);
assert.equal(kpi.materialTotalPln, 200);
assert.equal(kpi.categoryRatePctPln, 50);
assert.equal(kpi.heuristicEstimatePctPln, 25);
assert.equal(kpi.controlledMarketPctPln, 25);
assert.equal(kpi.workCatalogPctPln, 0);
assert.ok(kpi.catalogWorkIdLinePct === 50);

// --- CM-2 quotes gaps ---
const gapDoc = {
  lines: [
    { catalogWorkId: "wc-drzwi-ei60" },
    { catalogWorkId: "wc-drzwi-ei60" },
    { catalogWorkId: "wc-mal-dwukrotne" },
  ],
};
const gaps = computeOfferBoqQuotesGaps(gapDoc, works);
assert.equal(gaps.matchedWorkCount, 2);
assert.equal(gaps.missingQuotesCount, 1);
assert.equal(gaps.rows[0].workId, "wc-drzwi-ei60");
assert.equal(gaps.rows[0].matchedLineCount, 2);

// --- CM-3 memo: same result, second lookup hits memo (no throw) ---
const memo = new Map();
const provider = createControlledMarketPriceProvider(works, {
  hourlyPln: 80,
  startRegionCode: "polska",
  computedAtIso: FIXED_AT,
  marketAverageMemo: memo,
});
const line = {
  ...baseLine("Malowanie", "m2"),
  catalogWorkId: "wc-mal-dwukrotne",
  quantity: 10,
};
const req = {
  category: "material",
  namePl: "Materiał",
  unit: "m2",
  quantity: 10,
  line,
  pricingComponentKind: "material",
};
const r1 = provider.lookup(req);
assert.ok(r1 == null || r1.origin.kind === "controlled_market");
assert.ok(memo.size >= 1, "memo populated after first lookup with catalog work");
const sizeAfter = memo.size;
provider.lookup(req);
assert.equal(memo.size, sizeAfter, "memo must not grow on repeat lookup");

// Sanity: computeMarketAverageForWork still pure for paint work
const avg = computeMarketAverageForWork(works[2], { computedAtIso: FIXED_AT });
assert.ok(avg.pricePln == null || avg.pricePln > 0);

console.log("PASS test-ceny-materialow-01");
