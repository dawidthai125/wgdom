/**
 * P2-G.1A — Tender Cost Intelligence (katalog, klasyfikator, silnik kosztu).
 * npx vite-node scripts/test-tender-cost-intelligence.mjs
 */
import { classifyAthLineCategory, foldPolishText } from "../src/lib/wgdom-ath-classifier.ts";
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
const costModel = defaultCostModelFromPayroll();
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

console.log(`\n---\nPASS: ${passed}  FAIL: ${failed}  TOTAL: ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
