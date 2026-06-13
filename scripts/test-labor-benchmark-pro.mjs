/**
 * P3.3B — benchmark robocizny PRO (metadata, historia, trend, pokrycie).
 * npx vite-node scripts/test-labor-benchmark-pro.mjs
 */
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  compareLaborRateToBenchmark,
  computeLaborBenchmarkCoverage,
  computeLaborRateTrend,
  getLaborBenchmarkEdition,
} from "../src/lib/labor-benchmark.ts";
import {
  ACTIVE_LABOR_BENCHMARK_EDITION,
  formatLaborBenchmarkEditionDate,
} from "../src/lib/labor-benchmark-data.ts";
import {
  buildLaborSnapshotFromCatalog,
  defaultWgdomCostCatalogHistoryStore,
  findOldestLaborRateInWindow,
  hasLaborRateChange,
  mergeWgdomCostCatalogHistoryStore,
  normalizeWgdomCostCatalogHistoryStore,
} from "../src/lib/wgdom-cost-catalog-history.ts";
import {
  listEditableCategories,
  updateCategoryPrimaryRates,
} from "../src/lib/wgdom-cost-catalog-store.ts";

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
const store = defaultWgdomCostCatalogStore();

// --- P3.3B.1 metadata edition ---
const edition = getLaborBenchmarkEdition("wroclaw");
assertEq(edition.editionId, ACTIVE_LABOR_BENCHMARK_EDITION.editionId, "edition id");
assertEq(edition.sources.length, 3, "three sources");
assert(edition.effectiveFrom === "2026-04-01", "effectiveFrom");
assert(formatLaborBenchmarkEditionDate(edition.effectiveFrom).includes("2026"), "format date");
assert(edition.ranges.length >= 13, "ranges include gladzie and rozbiórki");

// --- P3.3B.5 coverage ---
const rows = listEditableCategories(store).map((row) => ({
  id: row.id,
  unit: row.unit,
  laborPlnPerUnit: 20,
}));
const coverage = computeLaborBenchmarkCoverage(rows);
assert(coverage.covered >= 12, `coverage covered=${coverage.covered}`);
assertEq(coverage.total, 15, "coverage total categories");
assert(coverage.labelPl.includes("/"), "coverage label");

// --- P3.3B.2 historia ---
assertEq(hasLaborRateChange(store, store), false, "no change same store");
const changed = updateCategoryPrimaryRates(store, "MALOWANIE", 8, 0.25);
assert(hasLaborRateChange(store, changed), true, "labor change detected");

const snapshot = buildLaborSnapshotFromCatalog(changed, costModel, "wroclaw");
assert(snapshot.rates.length === 15, "snapshot has all categories");
const malowanieSnap = snapshot.rates.find((r) => r.categoryId === "MALOWANIE");
assert(malowanieSnap != null && malowanieSnap.laborRbhPerUnit === 0.25, "snapshot malowanie rbh");

const merged = mergeWgdomCostCatalogHistoryStore(
  { schemaVersion: 1, snapshots: [snapshot], updatedAt: snapshot.at },
  defaultWgdomCostCatalogHistoryStore(),
);
assertEq(merged.snapshots.length, 1, "merge keeps snapshot");

const normalized = normalizeWgdomCostCatalogHistoryStore({
  schemaVersion: 1,
  snapshots: [{ at: "2026-01-01T00:00:00.000Z", region: "wroclaw", rates: [] }],
  updatedAt: "2026-01-01",
});
assertEq(normalized.snapshots.length, 0, "empty rates dropped");

// --- P3.3B.4 trend ---
const up = computeLaborRateTrend(24, 21, 90);
assert(up != null, "trend up exists");
if (up) {
  assertEq(up.direction, "up", "trend up direction");
  assertEq(up.icon, "↗", "trend up icon");
  assert(up.labelPl.includes("+"), "trend up label");
}

const down = computeLaborRateTrend(18, 21, 60);
assert(down != null && down.direction === "down" && down.icon === "↘", "trend down");

const flat = computeLaborRateTrend(21, 21, 30);
assert(flat != null && flat.direction === "flat" && flat.icon === "→", "trend flat");

// --- history window lookup ---
const now = new Date("2026-06-13T12:00:00.000Z").getTime();
const historyStore = {
  schemaVersion: 1,
  updatedAt: "2026-06-13T12:00:00.000Z",
  snapshots: [
    {
      at: "2026-03-20T10:00:00.000Z",
      region: "wroclaw",
      rates: [{ categoryId: "MALOWANIE", unit: "m2", laborRbhPerUnit: 0.14, laborPlnPerUnit: 21 }],
    },
    {
      at: "2026-06-01T10:00:00.000Z",
      region: "wroclaw",
      rates: [{ categoryId: "MALOWANIE", unit: "m2", laborRbhPerUnit: 0.16, laborPlnPerUnit: 24 }],
    },
  ],
};
const past = findOldestLaborRateInWindow(historyStore, "wroclaw", "MALOWANIE", "m2", 90, now);
assert(past != null && past.laborPlnPerUnit === 21, "oldest in window is March snapshot");

const enriched = compareLaborRateToBenchmark(24, "MALOWANIE", "m2", {
  history: historyStore,
  region: "wroclaw",
});
assert(enriched.historyPlnPerUnit === 21, "enriched history pln");
assert(enriched.trend != null && enriched.trend.direction === "up", "enriched trend up");

const prev = defaultWgdomCostCatalogStore();
const next = updateCategoryPrimaryRates(prev, "GK", 14, 0.35);
assert(hasLaborRateChange(prev, next), "append precondition");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
