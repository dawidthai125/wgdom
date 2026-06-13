/**
 * P3.3A — benchmark robocizny MVP.
 * npx vite-node scripts/test-labor-benchmark.mjs
 */
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  compareLaborRateToBenchmark,
  computeLaborPlnPerUnitFromRbh,
  mapWgdomCategoryToLaborBenchmark,
  buildLaborBenchmarkAlerts,
  getLaborBenchmarkRange,
  formatLaborBenchmarkRange,
} from "../src/lib/labor-benchmark.ts";
import { LABOR_BENCHMARK_RANGES } from "../src/lib/labor-benchmark-data.ts";

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

const costModel = defaultCostModelFromPayroll();
const catalog = defaultWgdomCostCatalog();
const malowanieRate = catalog.categories.find((c) => c.id === "MALOWANIE")?.rates[0];
assert(malowanieRate != null, "malowanie rate exists");
const ourMalowanie = computeLaborPlnPerUnitFromRbh(malowanieRate.laborRbhPerUnit, costModel);

const below = compareLaborRateToBenchmark(10, "MALOWANIE", "m2");
assertEq(below.status, "below", "below range");
assertEq(below.statusLabelPl, "Poniżej rynku", "below label");

const within = compareLaborRateToBenchmark(22, "MALOWANIE", "m2");
assertEq(within.status, "ok", "within range");
assertEq(within.statusLabelPl, "W normie", "ok label");

const above = compareLaborRateToBenchmark(30, "MALOWANIE", "m2");
assertEq(above.status, "above", "above range");
assertEq(above.statusLabelPl, "Powyżej rynku", "above label");

const noBench = compareLaborRateToBenchmark(ourMalowanie, "GLADZIE_TYNKI", "m2");
assertEq(noBench.status, "unavailable", "no benchmark gladzie");
assertEq(noBench.statusLabelPl, "Brak benchmarku", "unavailable label");

const unitMismatch = compareLaborRateToBenchmark(50, "MALOWANIE", "szt");
assertEq(unitMismatch.status, "unavailable", "unit mismatch");

assertEq(mapWgdomCategoryToLaborBenchmark("GK"), "GK", "map GK");
assertEq(mapWgdomCategoryToLaborBenchmark("INSTALACJE_CO"), "CO", "map CO");
assertEq(mapWgdomCategoryToLaborBenchmark("GLAZURA"), "POSADZKI", "map glazura");

const gkRange = getLaborBenchmarkRange("GK", "m2");
assert(gkRange != null, "GK range");
if (gkRange) {
  assertEq(gkRange.min, 80, "GK min");
  assertEq(gkRange.max, 105, "GK max");
  assert(formatLaborBenchmarkRange(gkRange).includes("80"), "format range");
}

const gkOur = compareLaborRateToBenchmark(115, "GK", "m2");
assertEq(gkOur.status, "above", "GK 115 above");

const alerts = buildLaborBenchmarkAlerts([
  { ...below, categoryLabel: "Malowanie" },
  { ...within, categoryLabel: "GK" },
  { ...above, categoryLabel: "Hydraulika" },
]);
assertEq(alerts.outOfRangeCount, 2, "alert count");
assertEq(alerts.items.length, 2, "alert items");

assert(LABOR_BENCHMARK_RANGES.length >= 10, "benchmark data seeded");
assert(ourMalowanie > 0, "our malowanie computed");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
