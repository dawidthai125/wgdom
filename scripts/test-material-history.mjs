/**
 * P3.4A — historia materiałów w kw-wgdom-cost-catalog-history.
 * npx vite-node scripts/test-material-history.mjs
 */
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  buildCatalogSnapshotFromStore,
  findOldestMaterialRateInWindow,
  hasCatalogRateChange,
  hasMaterialRateChange,
  mergeWgdomCostCatalogHistoryStore,
  normalizeWgdomCostCatalogHistoryStore,
} from "../src/lib/wgdom-cost-catalog-history.ts";
import { buildMaterialRateHistoryView } from "../src/lib/material-history.ts";
import { updateCategoryPrimaryRates } from "../src/lib/wgdom-cost-catalog-store.ts";

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
const changedMat = updateCategoryPrimaryRates(store, "MALOWANIE", 9, 0.16);
const changedLaborOnly = updateCategoryPrimaryRates(store, "GK", 14, 0.35);

assertEq(hasMaterialRateChange(store, changedMat), true, "material change detected");
assertEq(hasMaterialRateChange(store, changedLaborOnly), false, "labor-only no material change");
assert(hasCatalogRateChange(store, changedMat), true, "catalog change on material");

const snapshot = buildCatalogSnapshotFromStore(changedMat, costModel, "wroclaw");
const mal = snapshot.rates.find((r) => r.categoryId === "MALOWANIE");
assert(mal != null && mal.materialPlnPerUnit === 9, "snapshot material pln");

const normalized = normalizeWgdomCostCatalogHistoryStore({
  schemaVersion: 1,
  snapshots: [{
    at: "2026-03-20T10:00:00.000Z",
    region: "wroclaw",
    rates: [{
      categoryId: "MALOWANIE",
      unit: "m2",
      laborRbhPerUnit: 0.16,
      laborPlnPerUnit: 20,
      materialPlnPerUnit: 8,
    }],
  }],
  updatedAt: "2026-03-20",
});
assertEq(normalized.snapshots.length, 1, "normalize snapshot");
assertEq(normalized.snapshots[0].rates[0].materialPlnPerUnit, 8, "normalize material");

const legacy = normalizeWgdomCostCatalogHistoryStore({
  schemaVersion: 1,
  snapshots: [{
    at: "2026-03-20T10:00:00.000Z",
    region: "wroclaw",
    rates: [{ categoryId: "MALOWANIE", unit: "m2", laborRbhPerUnit: 0.16, laborPlnPerUnit: 20 }],
  }],
  updatedAt: "2026-03-20",
});
assertEq(legacy.snapshots[0].rates[0].materialPlnPerUnit, 0, "legacy material defaults 0");

const now = new Date("2026-06-13T12:00:00.000Z").getTime();
const history = normalized;
const past = findOldestMaterialRateInWindow(history, "wroclaw", "MALOWANIE", "m2", 90, now);
assert(past != null && past.materialPlnPerUnit === 8, "find oldest material");

const view = buildMaterialRateHistoryView(9, "MALOWANIE", "m2", history, "wroclaw", 90);
assert(view.hasHistory, "view has history");
assertEq(view.historicalPlnPerUnit, 8, "view historical 8");
assert(view.trend != null && view.trend.direction === "up", "material trend up");

const merged = mergeWgdomCostCatalogHistoryStore(history, { schemaVersion: 1, snapshots: [], updatedAt: "" });
assertEq(merged.snapshots.length, 1, "merge keeps snapshot");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
