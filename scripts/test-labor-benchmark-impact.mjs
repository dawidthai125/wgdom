/**
 * P3.3D — benchmark impact (wpływ finansowy odchyleń).
 * npx vite-node scripts/test-labor-benchmark-impact.mjs
 */
import { compareLaborRateToBenchmark } from "../src/lib/labor-benchmark.ts";
import {
  buildLaborBenchmarkImpactSummary,
  computeLaborBenchmarkImpact,
  formatLaborBenchmarkDeviationShort,
  formatLaborBenchmarkImpactPln,
} from "../src/lib/labor-benchmark-impact.ts";
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { buildCatalogLinePricingView } from "../src/lib/tender-catalog-line-pricing.ts";

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

// --- above max ---
const gkCmp = compareLaborRateToBenchmark(115, "GK", "m2");
const gkImpact = computeLaborBenchmarkImpact(115, gkCmp, 1840, "Zabudowa GK");
assertEq(gkImpact.status, "above", "GK above");
assertEq(gkImpact.deviationPerUnit, 10, "GK deviation +10");
assertEq(gkImpact.impactPln, 18400, "GK impact 18400");

// --- below min ---
const malCmp = compareLaborRateToBenchmark(16, "MALOWANIE", "m2");
const malImpact = computeLaborBenchmarkImpact(16, malCmp, 2400, "Malowanie");
assertEq(malImpact.status, "below", "malowanie below");
assertEq(malImpact.deviationPerUnit, -2, "malowanie deviation -2");
assertEq(malImpact.impactPln, -4800, "malowanie impact -4800");

// --- in range ---
const okCmp = compareLaborRateToBenchmark(22, "MALOWANIE", "m2");
const okImpact = computeLaborBenchmarkImpact(22, okCmp, 100, "Malowanie");
assertEq(okImpact.status, "ok", "in range ok");
assertEq(okImpact.deviationPerUnit, 0, "in range deviation 0");
assertEq(okImpact.impactPln, 0, "in range impact 0");

// --- unavailable ---
const unCmp = compareLaborRateToBenchmark(20, "TRANSPORT_UTYLIZACJA", "m3");
const unImpact = computeLaborBenchmarkImpact(20, unCmp, 50);
assert(unImpact.unavailable, "unavailable no impact");

// --- aggregation + sort ---
const summary = buildLaborBenchmarkImpactSummary([
  {
    categoryId: "MALOWANIE",
    categoryLabel: "Malowanie",
    avgLaborPlnPerUnit: 16,
    dominantUnit: "m2",
    laborBenchmark: malCmp,
    quantity: 2400,
  },
  {
    categoryId: "GK",
    categoryLabel: "Zabudowa GK",
    avgLaborPlnPerUnit: 115,
    dominantUnit: "m2",
    laborBenchmark: gkCmp,
    quantity: 1840,
  },
  {
    categoryId: "HYDRAULIKA",
    categoryLabel: "Hydraulika",
    avgLaborPlnPerUnit: 160,
    dominantUnit: "szt",
    laborBenchmark: compareLaborRateToBenchmark(160, "HYDRAULIKA", "szt"),
    quantity: 28,
  },
]);
assertEq(summary.outOfRangeCount, 3, "three out of range");
assertEq(summary.totalImpactPln, 18400 + -4800 + 280, "net total impact");
assertEq(summary.rows[0].categoryId, "GK", "sort GK first");
assertEq(summary.rows[0].impactPln, 18400, "GK top impact");
assert(summary.rows[1].impactPln >= summary.rows[2].impactPln, "descending sort");

// --- integration with catalog line pricing ---
const catalog = defaultWgdomCostCatalog();
const costModel = defaultCostModelFromPayroll();
const lines = [
  { lp: "1", description: "Zabudowa GK ściany", unit: "m2", quantity: "1840" },
  { lp: "2", description: "Malowanie ścian", unit: "m2", quantity: "2400" },
];
const view = buildCatalogLinePricingView(lines, catalog, costModel);
assert(view != null && view.categorySummary.length >= 2, "pricing view categories");
if (view) {
  const gkRow = view.categorySummary.find((r) => r.categoryId === "GK");
  if (gkRow) {
    assertEq(gkRow.laborQuantity, 1840, "GK quantity from lines");
    assert(gkRow.laborImpact != null, "GK has impact field");
  } else {
    assert(view.categorySummary.every((r) => r.laborImpact != null), "all rows have impact");
  }
}

assert(formatLaborBenchmarkDeviationShort(10) === "+10", "format deviation short");
assert(formatLaborBenchmarkImpactPln(18400).includes("18"), "format impact pln");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
