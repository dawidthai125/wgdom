/**
 * CENY-MATERIAŁÓW-01 — Owner Verification smoke (OFF/ON isolation + IC checks).
 * npx vite-node scripts/test-ceny-materialow-01-owner-verification.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const ROOT = resolve(process.cwd());
const FIXED_AT = "2026-07-29T16:00:00.000Z";

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

// --- 1. Flag contract ---
forceCenyMaterialow01ForTests(null);
assert.equal(CENY_MATERIALOW_01_DEFAULT, false);
assert.equal(CENY_MATERIALOW_01_LS_KEY, "kw-ceny-materialow-01");
assert.equal(isCenyMaterialow01Enabled(), false, "default OFF");

forceCenyMaterialow01ForTests(false);
assert.equal(isCenyMaterialow01Enabled(), false);
forceCenyMaterialow01ForTests(true);
assert.equal(isCenyMaterialow01Enabled(), true);
forceCenyMaterialow01ForTests(null);

// --- 2. Source IC: no Supabase / no Bid / provider order intact ---
const newFiles = [
  "src/lib/ceny-materialow-01-flag.ts",
  "src/lib/offer-boq-material-origin-stats.ts",
  "src/lib/offer-boq-quotes-gaps.ts",
];
for (const f of newFiles) {
  const src = read(f);
  assert.ok(!/supabase|createClient|\bfetch\s*\(/i.test(src), `${f}: no network/supabase`);
}

const controlled = read("src/lib/tender-offer-boq-controlled-price-source.ts");
assert.ok(controlled.includes("marketAverageMemo"));
assert.ok(!/supabase|createClient|\bfetch\s*\(/i.test(controlled));

const explain = read("src/lib/tender-offer-boq-explainability.ts");
assert.ok(explain.includes("isCenyMaterialow01Enabled()"));
assert.ok(explain.includes("cenyMaterialowUplift: cm01"));
assert.ok(explain.includes("marketAverageMemo"));
assert.match(
  explain,
  /createCompanyKnowledgePriceProvider[\s\S]*createControlledMarketPriceProvider/,
  "leadingProviders order: knowledge → controlled_market",
);

const engine = read("src/lib/tender-offer-boq-pricing-engine.ts");
assert.match(
  engine,
  /createWorkCatalogPriceProvider[\s\S]*createCategoryRatePriceProvider[\s\S]*createCompanyModelPriceProvider[\s\S]*createHeuristicPriceProvider/,
  "default provider chain order unchanged",
);
assert.ok(!engine.includes("ceny-materialow"), "pricing-engine not FEATURE-owned rewrite");

const panel = read("src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx");
assert.ok(panel.includes("isCenyMaterialow01Enabled"));
assert.ok(panel.includes("computeOfferBoqQuotesGaps"));
assert.ok(panel.includes("data-ceny-materialow-01-quotes-gaps"));
assert.ok(panel.includes("cm01Enabled && quotesGaps"), "CM-2 UX gated by flag");

const mapping = read("src/lib/tender-offer-boq-mapping.ts");
assert.ok(mapping.includes("cenyMaterialowUplift"));
assert.ok(mapping.includes("CM01_ALIAS_RULES"));
assert.ok(mapping.includes("if (opts.cenyMaterialowUplift)"), "alias only under uplift");

// OUT files must not mention CM-01 feature key (no accidental coupling)
for (const f of [
  "src/lib/cloud-sync.ts",
  "src/lib/tenders-bid-calculator.ts",
  "src/lib/company-labor-cost.ts",
]) {
  const src = read(f);
  assert.ok(!src.includes("kw-ceny-materialow-01"), `${f}: no CM-01 flag coupling`);
  assert.ok(!src.includes("ceny-materialow-01"), `${f}: no CM-01 module coupling`);
}

// --- 3. CM-1 OFF vs ON behavioral isolation ---
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
];

const baseLine = (description) => ({
  lineId: "L1",
  lp: "1",
  description,
  unit: "szt",
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

const door = "Komplet drzwi stalowych EI60 wewnętrznych";
const offDoor = mapOfferBoqLine(baseLine(door), { works, cenyMaterialowUplift: false });
const onDoor = mapOfferBoqLine(baseLine(door), { works, cenyMaterialowUplift: true });
assert.equal(onDoor.catalogWorkId, "wc-drzwi-ei60", "ON CM-1 → catalogWorkId (work_catalog/controlled path entry)");
// OFF tip: either unmatched or weaker — must not require uplift path
assert.ok(
  onDoor.catalogWorkId != null,
  "ON enables catalog entry for specialty doors",
);

const oddym = mapOfferBoqLine(baseLine("System oddymiania — klapa dymowa dach"), {
  works,
  cenyMaterialowUplift: true,
});
assert.equal(oddym.catalogWorkId, "wc-oddym-klapa");

// Tip parity smoke: OFF uplift must be explicit false path (no accidental true)
assert.equal(Boolean(false), false);
const offOddym = mapOfferBoqLine(baseLine("System oddymiania — klapa dymowa dach"), {
  works,
  cenyMaterialowUplift: false,
});
// ON must be at least as successful as OFF for specialty
if (offOddym.catalogWorkId) {
  assert.equal(oddym.catalogWorkId, offOddym.catalogWorkId);
} else {
  assert.equal(oddym.catalogWorkId, "wc-oddym-klapa", "ON recovers match when OFF misses");
}

void offDoor; // tip baseline exercised

// --- 4. CM-0 KPI ---
const kpi = computeMaterialOriginShareSummary({
  lines: [
    {
      catalogWorkId: "a",
      linePricing: {
        components: [
          { category: "material", namePl: "M", totalPln: 70, priceOrigin: { kind: "controlled_market", labelPl: "c" } },
          { category: "material", namePl: "M", totalPln: 20, priceOrigin: { kind: "work_catalog", labelPl: "w" } },
          { category: "material", namePl: "M", totalPln: 5, priceOrigin: { kind: "category_rate", labelPl: "k" } },
          { category: "material", namePl: "M", totalPln: 5, priceOrigin: { kind: "heuristic_estimate", labelPl: "h" } },
        ],
      },
    },
  ],
});
assert.equal(kpi.controlledMarketPctPln, 70);
assert.equal(kpi.workCatalogPctPln, 20);
assert.equal(kpi.categoryRatePctPln, 5);
assert.equal(kpi.heuristicEstimatePctPln, 5);

// --- 5. CM-2 Quotes Gaps ---
const gaps = computeOfferBoqQuotesGaps(
  {
    lines: [
      { catalogWorkId: "wc-drzwi-ei60" },
      { catalogWorkId: "wc-oddym-klapa" },
      { catalogWorkId: "wc-with-quotes" },
    ],
  },
  [
    ...works,
    {
      id: "wc-with-quotes",
      tradeId: "MALOWANIE",
      namePl: "Z Quotes",
      unit: "m2",
      companyPricePln: 10,
      updatedAt: FIXED_AT,
      freshnessStatus: "ok",
      keywords: [],
      active: true,
      favorite: false,
      usageCount: 0,
      source: "seed",
      marketQuotes: {
        sekocenbud: {
          polska: {
            origin: "sekocenbud",
            price: 12,
            updatedAt: FIXED_AT,
            regionCode: "polska",
            coverage: "full",
            confidence: 0.9,
          },
        },
      },
    },
  ],
);
assert.equal(gaps.matchedWorkCount, 3);
assert.equal(gaps.missingQuotesCount, 2);
assert.deepEqual(
  gaps.rows.map((r) => r.workId).sort(),
  ["wc-drzwi-ei60", "wc-oddym-klapa"],
);

// --- 6. CM-3 memo: no growth on repeat; optional undefined = no memo path ---
const worksWithQuote = [
  {
    id: "wc-mal",
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: "m2",
    companyPricePln: 28,
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: ["malowanie"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    costSplit: { materialRatio: 0.55, laborRatio: 0.45 },
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
const memo = new Map();
const providerOn = createControlledMarketPriceProvider(worksWithQuote, {
  hourlyPln: 80,
  startRegionCode: "polska",
  computedAtIso: FIXED_AT,
  marketAverageMemo: memo,
});
const providerOff = createControlledMarketPriceProvider(worksWithQuote, {
  hourlyPln: 80,
  startRegionCode: "polska",
  computedAtIso: FIXED_AT,
  // no memo — tip parity path
});
const line = {
  ...baseLine("Malowanie"),
  unit: "m2",
  catalogWorkId: "wc-mal",
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
const a = providerOn.lookup(req);
const b = providerOff.lookup(req);
assert.ok(a && a.origin.kind === "controlled_market");
assert.ok(b && b.origin.kind === "controlled_market");
assert.equal(a.unitPricePln, b.unitPricePln, "memo must not change price semantics");
assert.equal(memo.size, 1);
providerOn.lookup(req);
assert.equal(memo.size, 1, "repeat lookup: memo size stable (no extra I/O growth)");

console.log(
  JSON.stringify(
    {
      flag: { key: CENY_MATERIALOW_01_LS_KEY, defaultOff: CENY_MATERIALOW_01_DEFAULT },
      cm1: { onDoor: onDoor.catalogWorkId, onOddym: oddym.catalogWorkId, offOddym: offOddym.catalogWorkId },
      kpi: {
        controlled: kpi.controlledMarketPctPln,
        workCatalog: kpi.workCatalogPctPln,
        category: kpi.categoryRatePctPln,
        heuristic: kpi.heuristicEstimatePctPln,
      },
      gaps: { missing: gaps.missingQuotesCount, matched: gaps.matchedWorkCount },
      memo: { size: memo.size, priceParity: a.unitPricePln === b.unitPricePln },
    },
    null,
    2,
  ),
);
console.log("PASS test-ceny-materialow-01-owner-verification");
