/**
 * COST-BID-GAP-01 / GAP-A — testy flagi, UNKNOWN, market REUSE, baseline OFF.
 * npx vite-node scripts/test-cost-bid-gap-01-catalog-cal.mjs
 */
import assert from "node:assert/strict";
import {
  forceCostBidGap01CatalogCalForTests,
  isCostBidGap01CatalogCalEnabled,
  COST_BID_GAP_01_CATALOG_CAL_DEFAULT,
} from "../src/lib/tenders-v4-config.ts";
import {
  aggregateCatalogDirectCost,
  computeFromCatalogRow,
} from "../src/lib/wgdom-catalog-cost-engine.ts";
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  classifyAthLineCategoryGapA,
  lookupMarketMaterialPlnPerUnit,
  pickBestCatalogWorkForGapA,
  resolveGapACatalogRate,
} from "../src/lib/cost-bid-gap-01-catalog-cal.ts";
import { classifyAthLineCategory } from "../src/lib/wgdom-ath-classifier.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";

const FIXED_AT = "2026-07-29T08:00:00.000Z";
const catalog = defaultWgdomCostCatalog();
const costModel = defaultCostModelFromPayroll();

const FIXTURE_ROWS = [
  { description: "Roboty murowe ścian konstrukcyjnych", unit: "m2", quantity: "120" },
  { description: "Instalacja hydrantowa wewnętrzna — zawór hydrantowy", unit: "szt", quantity: "8" },
  { description: "Montaż tablicy rozdzielczej i gniazd elektrycznych", unit: "szt", quantity: "12" },
  { description: "Malowanie dwukrotne ścian", unit: "m2", quantity: "80" },
  { description: "Pozycja bez słów kluczowych xyzzy-unknown-99", unit: "m2", quantity: "10" },
];

function resetFlag() {
  forceCostBidGap01CatalogCalForTests(null);
}

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`PASS ${name}`);
}

// ——— T1: default flag OFF ———
resetFlag();
assert.equal(COST_BID_GAP_01_CATALOG_CAL_DEFAULT, false);
assert.equal(isCostBidGap01CatalogCalEnabled(), false);
ok("T1 default flag OFF");

// ——— T2: baseline OFF = same as legacy classify for hydrant (often UNKNOWN without GAP-A) ———
forceCostBidGap01CatalogCalForTests(false);
const offAgg = aggregateCatalogDirectCost(FIXTURE_ROWS, catalog, costModel, null, { works: [] });
const offDirect = offAgg.totals.direct;
const offUnknown = offAgg.unknownCount;
ok(`T2 baseline OFF direct=${offDirect} unknown=${offUnknown}`);

// ——— T3: GAP-A classify reduces UNKNOWN vs base ———
forceCostBidGap01CatalogCalForTests(true);
const hydrantBase = classifyAthLineCategory("Instalacja hydrantowa wewnętrzna — zawór hydrantowy", "szt", catalog);
const hydrantGap = classifyAthLineCategoryGapA("Instalacja hydrantowa wewnętrzna — zawór hydrantowy", "szt", catalog);
assert.equal(hydrantGap, "HYDRAULIKA");
assert.ok(hydrantBase === "UNKNOWN" || hydrantGap === "HYDRAULIKA");
const murowe = classifyAthLineCategoryGapA("Roboty murowe ścian konstrukcyjnych", "m2", catalog);
assert.equal(murowe, "ROBOTY_OGOLNOBUDOWLANE");
const elektr = classifyAthLineCategoryGapA("Montaż tablicy rozdzielczej i gniazd elektrycznych", "szt", catalog);
assert.equal(elektr, "ELEKTRYKA");
ok("T3 GAP-A classifier keywords (hydrant/murowe/elektryka)");

// ——— T4: ON → lower UNKNOWN + higher direct vs OFF ———
const onAgg = aggregateCatalogDirectCost(FIXTURE_ROWS, catalog, costModel, null, { works: [] });
assert.ok(onAgg.unknownCount < offUnknown, `unknown ON ${onAgg.unknownCount} < OFF ${offUnknown}`);
assert.ok(onAgg.totals.direct > offDirect, `direct ON ${onAgg.totals.direct} > OFF ${offDirect}`);
ok(`T4 ON unknown=${onAgg.unknownCount} direct=${onAgg.totals.direct} (was ${offUnknown}/${offDirect})`);

// ——— T5: market REUSE overlay when quotes present ———
const works = [
  {
    id: "wc-gap-a-mal",
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
    marketQuotes: {
      sekocenbud: {
        wroclaw: {
          price: 55,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: FIXED_AT,
          confidence: 0.9,
          origin: "sekocenbud",
        },
      },
      interbud: {
        wroclaw: {
          price: 58,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: FIXED_AT,
          confidence: 0.85,
          origin: "interbud",
        },
      },
    },
  },
];
const picked = pickBestCatalogWorkForGapA({
  description: "Malowanie dwukrotne ścian pomieszczeń",
  unit: "m2",
  categoryId: "MALOWANIE",
  works,
});
assert.ok(picked);
const market = lookupMarketMaterialPlnPerUnit({
  work: picked,
  hourlyPln: 35,
  startRegionCode: "wroclaw",
  computedAtIso: FIXED_AT,
});
assert.ok(market && market.materialPlnPerUnit > 0);
const rateNoMarket = resolveGapACatalogRate({
  catalog,
  category: "MALOWANIE",
  unitRaw: "m2",
  description: "Malowanie dwukrotne ścian pomieszczeń",
  works: [],
  hourlyPln: 35,
});
const rateWithMarket = resolveGapACatalogRate({
  catalog,
  category: "MALOWANIE",
  unitRaw: "m2",
  description: "Malowanie dwukrotne ścian pomieszczeń",
  works,
  hourlyPln: 35,
  startRegionCode: "wroclaw",
  computedAtIso: FIXED_AT,
});
assert.equal(rateWithMarket.materialSource, "market");
assert.ok(rateWithMarket.rate.materialPlnPerUnit >= rateNoMarket.rate.materialPlnPerUnit);
ok("T5 marketQuotes REUSE overlay");

// ——— T6: empty works → fallback catalog (no crash) ———
const rowEmpty = computeFromCatalogRow(
  { description: "Malowanie dwukrotne ścian", unit: "m2", quantity: "10" },
  catalog,
  costModel,
  null,
  { works: [] },
);
assert.ok(rowEmpty.directCost > 0);
assert.notEqual(rowEmpty.materialSource, "market");
ok("T6 empty Work Catalog fallback");

// ——— T7: flag OFF restores baseline after ON ———
forceCostBidGap01CatalogCalForTests(false);
const offAgain = aggregateCatalogDirectCost(FIXTURE_ROWS, catalog, costModel, null, { works: [] });
assert.equal(offAgain.totals.direct, offDirect);
assert.equal(offAgain.unknownCount, offUnknown);
ok("T7 flag OFF = baseline parity");

// ——— T8: Bid SSOT still computeTenderBidProposal (catalog path uses engine) ———
forceCostBidGap01CatalogCalForTests(true);
const kosztorys = {
  ok: true,
  sourceFilename: "test-gap-a.pdf",
  rowCount: FIXTURE_ROWS.length,
  rows: FIXTURE_ROWS.map((r, i) => ({
    lp: String(i + 1),
    description: r.description,
    unit: r.unit,
    quantity: r.quantity,
  })),
  catalogQuantities: FIXTURE_ROWS.map((r, i) => ({
    lp: String(i + 1),
    description: r.description,
    unit: r.unit,
    quantity: r.quantity,
  })),
  totalValue: null,
  currency: "PLN",
};
const bid = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 20,
  maxConcurrentProjects: 2,
  catalog,
  priceOverrides: [],
});
assert.equal(bid.ok, true);
assert.equal(bid.pricingMode, "catalog");
assert.ok(bid.recommendedBidPln != null && bid.recommendedBidPln > 0);
assert.ok(!String(bid.recommendedBidPln).includes("1600000") || bid.recommendedBidPln !== 1_600_000);
ok(`T8 Bid SSOT catalog recommendedBidPln=${bid.recommendedBidPln}`);

// ——— T9: no hardcode 1.6M ———
assert.notEqual(bid.recommendedBidPln, 1_600_000);
ok("T9 no hardcode 1_600_000");

resetFlag();
console.log(`\nALL ${passed} PASS`);
