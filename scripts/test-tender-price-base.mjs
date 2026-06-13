/**
 * P3.5 — podgląd cen per pozycja kosztorysu.
 * npx vite-node scripts/test-tender-price-base.mjs
 */
import { classifyAthLineCategory } from "../src/lib/wgdom-ath-classifier.ts";
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  buildCatalogLinePricingView,
  CATALOG_LINE_PRICE_SOURCE_BASE,
  CATALOG_LINE_PRICE_SOURCE_CATALOG,
} from "../src/lib/tender-catalog-line-pricing.ts";
import { aggregateCatalogDirectCost } from "../src/lib/wgdom-catalog-cost-engine.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ${expected}, got ${actual}`);
    return;
  }
  pass += 1;
}

const catalog = defaultWgdomCostCatalog();
const costModel = defaultCostModelFromPayroll();

const malowanieLines = [
  {
    lp: "1",
    description: "Malowanie ścian emulsyjne dwukrotnie",
    unit: "m2",
    quantity: "120",
  },
];

const malowanieView = buildCatalogLinePricingView(malowanieLines, catalog, costModel);
assert(malowanieView != null, "malowanie view not null");
if (malowanieView) {
  assertEq(malowanieView.rows.length, 1, "malowanie one row");
  assertEq(malowanieView.rows[0].categoryId, "MALOWANIE", "malowanie category");
  assert(malowanieView.rows[0].materialPlnPerUnit != null && malowanieView.rows[0].materialPlnPerUnit > 0, "malowanie material rate");
  assert(malowanieView.rows[0].laborPlnPerUnit != null && malowanieView.rows[0].laborPlnPerUnit > 0, "malowanie labor rate");
  assert(malowanieView.rows[0].lineTotalPln != null, "malowanie line total");
  assertEq(malowanieView.unassignedCount, 0, "malowanie no unknown");
  assertEq(malowanieView.categorySummary.length, 1, "malowanie one category summary");
  assertEq(malowanieView.categorySummary[0].positionCount, 1, "malowanie summary count");
  assert(malowanieView.categorySummary[0].totalCostPln > 0, "malowanie summary cost");
  assert(
    malowanieView.rows[0].materialSource === CATALOG_LINE_PRICE_SOURCE_BASE
    || malowanieView.rows[0].materialSource === CATALOG_LINE_PRICE_SOURCE_CATALOG,
    "price source label",
  );
}

const unknownLines = [
  { lp: "1", description: "Roboty specjalistyczne XYZ nieznane", unit: "szt", quantity: "3" },
  { lp: "2", description: "Malowanie ścian", unit: "m2", quantity: "50" },
];
const unknownView = buildCatalogLinePricingView(unknownLines, catalog, costModel);
assert(unknownView != null, "unknown view not null");
if (unknownView) {
  assertEq(unknownView.unassignedCount, 1, "unknown count");
  assert(unknownView.rows[0].isUnknown, "first row unknown");
  assertEq(unknownView.rows[0].materialPlnPerUnit, null, "unknown no material");
  assertEq(unknownView.rows[0].laborPlnPerUnit, null, "unknown no labor");
  assert(!unknownView.rows[1].isUnknown, "second row classified");
  assertEq(unknownView.categorySummary.length, 1, "summary excludes unknown category bucket");
}

const multiCategory = [
  { lp: "1", description: "Gładź gipsowa na ścianach", unit: "m2", quantity: "100" },
  { lp: "2", description: "Malowanie farbą emulsyjną", unit: "m2", quantity: "100" },
  { lp: "3", description: "Płytki ceramiczne na ścianie", unit: "m2", quantity: "40" },
];
const multiView = buildCatalogLinePricingView(multiCategory, catalog, costModel);
assert(multiView != null, "multi view not null");
if (multiView) {
  assertEq(multiView.categorySummary.length, 3, "three categories");
  const totalFromSummary = multiView.categorySummary.reduce((s, r) => s + r.totalCostPln, 0);
  assert(Math.abs(totalFromSummary - multiView.classifiedDirectTotalPln) < 0.02, "summary totals match classified direct");
  const agg = aggregateCatalogDirectCost(multiCategory, catalog, costModel);
  assert(multiView.classifiedDirectTotalPln <= agg.totals.direct + 0.01, "view total <= engine direct (unknown excluded in view only)");
}

assertEq(classifyAthLineCategory("Malowanie ścian emulsyjne", "m2"), "MALOWANIE", "classifier malowanie");

assert(buildCatalogLinePricingView([], catalog, costModel) == null, "empty null");
assert(buildCatalogLinePricingView(null, catalog, costModel) == null, "null input");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
