/**
 * P2-G.1A + P2-G.1B — Tender Cost Intelligence (katalog + integracja kalkulatora).
 * npx vite-node scripts/test-tender-cost-intelligence.mjs
 */
import { classifyAthLineCategory, foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";
import {
  CATALOG_QUANTITIES_CAP,
  athPreviewToSnapshot,
  buildCatalogQuantitiesFromPreview,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  defaultWgdomCostCatalog,
  defaultWgdomCostCatalogStore,
  getCategoryRate,
  normalizeWgdomCostUnit,
  WGDOM_COST_CATEGORY_IDS,
} from "../src/lib/wgdom-cost-catalog.ts";
import {
  aggregateCatalogDirectCost,
  computeFromCatalogRow,
} from "../src/lib/wgdom-catalog-cost-engine.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  computeTenderBidProposal,
  resolveCatalogQuantities,
  resolveTenderBidPricingMode,
} from "../src/lib/tenders-bid-calculator.ts";
import { buildOurEstimateDisplaySsot } from "../src/lib/tender-data-ssot.ts";

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function assertEq(actual, expected, label) {
  assert(actual === expected, `${label} (expected ${expected}, got ${actual})`);
}

function assertGt(actual, min, label) {
  assert(actual > min, `${label} (${actual} > ${min})`);
}

function assertGte(actual, min, label) {
  assert(actual >= min, `${label} (${actual} >= ${min})`);
}

const costModel = defaultCostModelFromPayroll();

const CATALOG_DESCRIPTIONS = [
  "Malowanie ścian farbą emulsyjną",
  "Gładź gipsowa ścian",
  "Układanie płytek ceramicznych",
  "Wykładina podłogowa",
  "Punkt gniazda wtyczkowego",
  "Instalacja wod-kan",
  "Demontaż posadzki",
  "Montaż drzwi wewnętrznych",
];

function makeCatalogQuantities(count) {
  return Array.from({ length: count }, (_, i) => ({
    lp: String(i + 1),
    description: CATALOG_DESCRIPTIONS[i % CATALOG_DESCRIPTIONS.length],
    unit: i % 7 === 4 ? "szt" : "m2",
    quantity: String(8 + (i % 12)),
  }));
}

function makeNoPriceKosztorys(count = 221) {
  const catalogQuantities = makeCatalogQuantities(count);
  return {
    ok: true,
    sourceFilename: "tbs-przedmiar.ath",
    rowCount: count,
    rows: catalogQuantities.slice(0, 40).map((q) => ({
      ...q,
      unitPrice: "",
      total: "",
    })),
    catalogQuantities,
    totalValue: "",
    currency: "PLN",
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-13T00:00:00.000Z",
  };
}

function makePricedKosztorys() {
  return {
    ok: true,
    sourceFilename: "priced.ath",
    rowCount: 4,
    rows: [
      { lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "500", unitPrice: "18", total: "9000" },
      { lp: "2", description: "Gładź gipsowa", unit: "m2", quantity: "400", unitPrice: "22", total: "8800" },
      { lp: "3", description: "Płytki podłogowe", unit: "m2", quantity: "120", unitPrice: "85", total: "10200" },
      { lp: "4", description: "Montaż drzwi", unit: "szt", quantity: "12", unitPrice: "450", total: "5400" },
    ],
    totalValue: "33400",
    currency: "PLN",
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-13T00:00:00.000Z",
  };
}

console.log("P2-G.1A — Tender Cost Intelligence\n");

console.log("1. ATH Classifier");
assertEq(
  classifyAthLineCategory("Malowanie ścian farbą emulsyjną", "m2"),
  "MALOWANIE",
  "MALOWANIE — malowanie ścian",
);
assertEq(
  classifyAthLineCategory("Gładź gipsowa ścian", "m2"),
  "GK",
  "GK — gładź gipsowa",
);
assertEq(
  classifyAthLineCategory("Układanie płytek ceramicznych na ścianie", "m2"),
  "GLAZURA",
  "GLAZURA — płytki",
);
assertEq(
  classifyAthLineCategory("Punkt gniazda wtyczkowego", "szt"),
  "ELEKTRYKA",
  "ELEKTRYKA — gniazdo",
);
assertEq(
  classifyAthLineCategory("Roboty ogólne budowlane", "kpl"),
  "UNKNOWN",
  "UNKNOWN — roboty ogólne",
);
assertEq(
  classifyAthLineCategory("Montaż drzwi wewnętrznych", "szt"),
  "STOLARKA",
  "STOLARKA — drzwi",
);
assertEq(
  classifyAthLineCategory("Demontaż posadzki", "m2"),
  "ROZBIORKI",
  "ROZBIORKI — demontaż",
);
assertEq(
  classifyAthLineCategory("Instalacja wod-kan", "mb"),
  "HYDRAULIKA",
  "HYDRAULIKA — wod-kan",
);

console.log("\n2. Unit normalization");
assertEq(normalizeWgdomCostUnit("m²"), "m2", "m² → m2");
assertEq(normalizeWgdomCostUnit("mp"), "m2", "mp → m2");
assertEq(normalizeWgdomCostUnit("rbh"), "rbh", "rbh");
assertEq(normalizeWgdomCostUnit("szt."), "szt", "szt.");

console.log("\n3. foldPolishText");
assert(foldPolishText("Gładź") === "gladz", "fold PL — gładź");

console.log("\n4. Catalog seed");
const catalogW = defaultWgdomCostCatalog("wroclaw");
assertEq(catalogW.schemaVersion, 1, "schemaVersion 1");
assertEq(catalogW.regionMultiplier, 1.0, "wroclaw multiplier 1.0");
assertEq(catalogW.categories.length, WGDOM_COST_CATEGORY_IDS.length, "8 kategorii MVP");
const store = defaultWgdomCostCatalogStore();
assertEq(store.catalogs.dolnyslask.regionMultiplier, 0.92, "dolnyslask multiplier 0.92");

console.log("\n5. Row cost");
const rowCost = computeFromCatalogRow(
  { description: "Malowanie ścian farbą emulsyjną", unit: "m2", quantity: "100" },
  catalogW,
  costModel,
);
assertGt(rowCost.materialCost, 0, "row materialCost > 0");
assertGt(rowCost.laborHours, 0, "row laborHours > 0");
assertGt(rowCost.laborCost, 0, "row laborCost > 0");
assertGt(rowCost.directCost, 0, "row directCost > 0");
assertEq(rowCost.category, "MALOWANIE", "row category MALOWANIE");

const rbhRow = computeFromCatalogRow(
  { description: "Roboty elektryczne", unit: "rbh", quantity: "8" },
  catalogW,
  costModel,
);
assertEq(rbhRow.laborHours, 8, "rbh row laborHours = qty");

console.log("\n6. Aggregate");
const fixture = [
  { description: "Malowanie ścian", unit: "m2", quantity: "200" },
  { description: "Gładź gipsowa", unit: "m2", quantity: "150" },
  { description: "Płytki na podłodze", unit: "m2", quantity: "80" },
  { description: "Roboty ogólne", unit: "kpl", quantity: "1" },
];
const agg = aggregateCatalogDirectCost(fixture, catalogW, costModel);
assertGt(agg.totals.direct, 0, "aggregate direct > 0");
assertGt(agg.totals.material, 0, "aggregate material > 0");
assertGt(agg.totals.labor, 0, "aggregate labor > 0");
assertEq(agg.rowCount, 4, "aggregate rowCount 4");
assert(agg.lines.length === 4, "aggregate lines length 4");

console.log("\n7. Region — wroclaw vs dolnyslask");
const catalogD = defaultWgdomCostCatalog("dolnyslask");
const rowW = computeFromCatalogRow(
  { description: "Malowanie ścian", unit: "m2", quantity: "100" },
  catalogW,
  costModel,
);
const rowD = computeFromCatalogRow(
  { description: "Malowanie ścian", unit: "m2", quantity: "100" },
  catalogD,
  costModel,
);
assert(rowD.materialCost < rowW.materialCost, "dolnyslask material < wroclaw");
assertEq(rowW.laborCost, rowD.laborCost, "labor cost same region-independent rate × same rbh");

const rateW = getCategoryRate(catalogW, "MALOWANIE", "m2");
const rateD = getCategoryRate(catalogD, "MALOWANIE", "m2");
assert(rateD.materialPlnPerUnit < rateW.materialPlnPerUnit, "getCategoryRate dolnyslask material lower");

console.log("\n8. P2-G.1B — Snapshot catalogQuantities");
const preview221 = {
  ok: true,
  format: "text",
  rows: makeCatalogQuantities(221).map((q) => ({
    ...q,
    code: "",
    unitPrice: "",
    total: "",
  })),
  warnings: [],
};
const snap = athPreviewToSnapshot(preview221, "tbs.ath");
assertEq(snap.catalogQuantities?.length, 221, "snapshot catalogQuantities 221 poz.");
assertEq(snap.rowCount, 221, "snapshot rowCount 221");
assert(snap.rows.length <= 40, "snapshot rows UI cap 40");
assertEq(buildCatalogQuantitiesFromPreview(preview221).length, 221, "buildCatalogQuantitiesFromPreview 221");
assertEq(CATALOG_QUANTITIES_CAP, 250, "CATALOG_QUANTITIES_CAP 250");
const snap250 = athPreviewToSnapshot(
  { ...preview221, rows: makeCatalogQuantities(300).map((q) => ({ ...q, code: "", unitPrice: "", total: "" })) },
  "big.ath",
);
assertEq(snap250.catalogQuantities?.length, 250, "snapshot cap 250 poz.");

console.log("\n9. P2-G.1B — pricingMode resolve");
const noPriceK = makeNoPriceKosztorys(221);
const pricedK = makePricedKosztorys();
assertEq(resolveTenderBidPricingMode(noPriceK), "catalog", "FOUND_NO_VALUE → catalog");
assertEq(resolveTenderBidPricingMode(pricedK), "ath_priced", "priced → ath_priced");
assertEq(resolveCatalogQuantities(noPriceK).length, 221, "resolveCatalogQuantities 221");

console.log("\n10. P2-G.1B — computeTenderBidProposal catalog (221 poz.)");
const bidCatalog = computeTenderBidProposal({
  kosztorys: noPriceK,
  swz: { estimatedValuePln: 1_200_000 } ,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidCatalog.ok, true, "AC-1 catalog 221 poz. ok === true");
assertEq(bidCatalog.pricingMode, "catalog", "pricingMode catalog");
assertGt(bidCatalog.costPricePln ?? 0, 0, "AC-2 costPricePln > 0");
assertGt(bidCatalog.recommendedBidPln ?? 0, 0, "AC-3 recommendedBidPln > 0");
assertGte(
  bidCatalog.recommendedBidPln ?? 0,
  bidCatalog.floorBidPln ?? 0,
  "recommended >= floor",
);
assertGt(bidCatalog.aggressiveBidPln ?? 0, 0, "aggressiveBidPln > 0");
assertGt(bidCatalog.floorBidPln ?? 0, 0, "floorBidPln > 0");
assert(bidCatalog.costStack.length >= 6, "costStack ma Kp + poboczne + stałe");
assert(
  bidCatalog.assumptions.some((a) => a.includes("katalogowa WGDOM")),
  "assumption wycena katalogowa",
);

console.log("\n11. P2-G.1B — computeTenderBidProposal ath_priced regresja");
const bidPriced = computeTenderBidProposal({
  kosztorys: pricedK,
  swz: { estimatedValuePln: 350_000, implementationDays: 60 },
  fit: { priceWeightPct: 60 } ,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidPriced.ok, true, "AC-4 ath_priced ok");
assertEq(bidPriced.pricingMode, "ath_priced", "pricingMode ath_priced");
assertEq(bidPriced.costPricePln, 130_900, "ath_priced costPricePln baseline");
assertEq(bidPriced.floorBidPln, 137_400, "ath_priced floorBidPln baseline");
assertEq(bidPriced.recommendedBidPln, 137_400, "ath_priced recommended baseline");
assertEq(bidPriced.aggressiveBidPln, 133_300, "ath_priced aggressive baseline");
assert(
  bidPriced.costStack[0]?.label.includes("Robocizna"),
  "ath_priced stack robocizna",
);

console.log("\n12. P2-G.1B — Nasza wycena display (catalog)");
const displayCatalog = buildOurEstimateDisplaySsot({
  item: { tenderDossier: { kosztorys: noPriceK } },
  bidProposalOk: bidCatalog.ok,
  recommendedBidPln: bidCatalog.recommendedBidPln,
  costPricePln: bidCatalog.costPricePln,
  pricingMode: "catalog",
});
assert(
  !displayCatalog.display.includes("Nie można automatycznie"),
  "kafelek bez komunikatu braku wyceny",
);
assert(
  displayCatalog.display.includes("Koszt wykonania"),
  "display zawiera Koszt wykonania",
);
assert(
  displayCatalog.display.includes("Propozycja"),
  "display zawiera Propozycja",
);

console.log("\n13. P2-G.1B — brak ilości → fail");
const emptyK = {
  ...noPriceK,
  catalogQuantities: [],
  rows: [],
  rowCount: 0,
};
const bidEmpty = computeTenderBidProposal({
  kosztorys: emptyK,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 2,
});
assertEq(bidEmpty.ok, false, "brak ilości ok false");

console.log(`\n---\nPASS: ${passed}  FAIL: ${failed}  TOTAL: ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
