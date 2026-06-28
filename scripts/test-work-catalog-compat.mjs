/**
 * P1.10 — backward compatibility layer (read-only resolve).
 * npx vite-node scripts/test-work-catalog-compat.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultWgdomCostCatalog,
  defaultWgdomCostCatalogStore,
  getCategoryRate,
} from "../src/lib/wgdom-cost-catalog.ts";
import { aggregateCatalogDirectCost } from "../src/lib/wgdom-catalog-cost-engine.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { getActiveCatalog } from "../src/lib/wgdom-cost-catalog-store.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { buildLegacyCostCatalogFromWorkStore } from "../src/lib/work-catalog/work-catalog-engine-adapter.ts";
import {
  isLegacyCatalog,
  isWorkCatalog,
  resolveCatalogForEngine,
  resolveCatalogForUI,
  resolveCatalogVersion,
} from "../src/lib/work-catalog/work-catalog-compat.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";

const MIGRATED_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse(MIGRATED_AT);
const EPSILON = 0.01;

const SAMPLE_ROWS = [
  { description: "Malowanie ścian w pomieszczeniu", unit: "m2", quantity: "12.5" },
  { description: "Montaż gniazda wtyczkowego", unit: "szt", quantity: "4" },
];

const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
);

const legacyStore = defaultWgdomCostCatalogStore();
const legacySnapshot = JSON.parse(JSON.stringify(legacyStore));
const { store: workStore } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
const workSnapshot = JSON.parse(JSON.stringify(workStore));
const legacyCatalog = getActiveCatalog(legacyStore);

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

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
    console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  pass += 1;
}

function assertNear(actual, expected, epsilon, msg) {
  if (Math.abs(actual - expected) > epsilon) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ~${expected}, got ${actual}`);
    return;
  }
  pass += 1;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── detection ─────────────────────────────────────────────────────────────

assert(isLegacyCatalog(legacyStore), "isLegacyCatalog legacy store");
assert(isLegacyCatalog(legacyCatalog), "isLegacyCatalog single catalog");
assert(!isLegacyCatalog(workStore), "isLegacyCatalog rejects work store");
assert(!isLegacyCatalog(null), "isLegacyCatalog rejects null");
assert(!isLegacyCatalog({ schemaVersion: 2 }), "isLegacyCatalog rejects schema 2");

assert(isWorkCatalog(workStore), "isWorkCatalog work store");
assert(!isWorkCatalog(legacyStore), "isWorkCatalog rejects legacy store");
assert(!isWorkCatalog(legacyCatalog), "isWorkCatalog rejects single catalog");

assertEq(resolveCatalogVersion(legacyStore), "legacy", "resolveCatalogVersion legacy store");
assertEq(resolveCatalogVersion(workStore), "work", "resolveCatalogVersion work store");
assertEq(resolveCatalogVersion({}), "unknown", "resolveCatalogVersion unknown");

// ─── resolveCatalogForEngine: legacy pass-through ──────────────────────────

const engineFromLegacyStore = resolveCatalogForEngine(legacyStore);
assert(engineFromLegacyStore != null, "engine legacy store not null");
assertEq(engineFromLegacyStore.region, "wroclaw", "engine legacy store default region");
assert(deepEqual(engineFromLegacyStore, getActiveCatalog(legacyStore)), "engine legacy store = getActiveCatalog");

const engineFromSingle = resolveCatalogForEngine(legacyCatalog);
assert(deepEqual(engineFromSingle, legacyCatalog), "engine single legacy pass-through");

const engineDolnyslask = resolveCatalogForEngine(legacyStore, { region: "dolnyslask" });
assertEq(engineDolnyslask?.region, "dolnyslask", "engine legacy region override");

// ─── resolveCatalogForEngine: work via adapter ─────────────────────────────

const engineFromWork = resolveCatalogForEngine(workStore);
const adaptedDirect = buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw");
assert(engineFromWork != null, "engine work store not null");
assert(deepEqual(engineFromWork, adaptedDirect), "engine work = adapter direct");

const malowanieCompat = getCategoryRate(engineFromWork, "MALOWANIE", "m2");
const malowanieDirect = getCategoryRate(adaptedDirect, "MALOWANIE", "m2");
assertNear(malowanieCompat.materialPlnPerUnit, malowanieDirect.materialPlnPerUnit, EPSILON, "engine work MALOWANIE material");
assertNear(malowanieCompat.laborRbhPerUnit, malowanieDirect.laborRbhPerUnit, EPSILON, "engine work MALOWANIE labor");

// ─── engine parity: legacy vs work via compat ───────────────────────────────

const legacyEngine = aggregateCatalogDirectCost(
  SAMPLE_ROWS,
  resolveCatalogForEngine(legacyStore),
  defaultCostModelFromPayroll(),
);
const workEngine = aggregateCatalogDirectCost(
  SAMPLE_ROWS,
  resolveCatalogForEngine(workStore),
  defaultCostModelFromPayroll(),
);
assertNear(legacyEngine.totals.direct, workEngine.totals.direct, EPSILON, "compat engine parity direct");
assertEq(legacyEngine.rowCount, workEngine.rowCount, "compat engine parity rowCount");

assert(resolveCatalogForEngine(null) === null, "engine null input");
assert(resolveCatalogForEngine({ schemaVersion: 99 }) === null, "engine unknown input");

// ─── resolveCatalogForUI ─────────────────────────────────────────────────

const uiLegacy = resolveCatalogForUI(legacyStore);
assert(uiLegacy != null, "UI legacy store");
assertEq(uiLegacy.version, "legacy", "UI legacy version");
assertEq(uiLegacy.legacyStore, legacyStore, "UI legacy store reference");
assert(uiLegacy.workStore === null, "UI legacy no work store");
assert(deepEqual(uiLegacy.legacyCatalog, getActiveCatalog(legacyStore)), "UI legacy catalog slice");

const uiSingle = resolveCatalogForUI(legacyCatalog);
assertEq(uiSingle?.version, "legacy", "UI single legacy version");
assertEq(uiSingle?.legacyStore, null, "UI single no store");
assertEq(uiSingle?.legacyCatalog, legacyCatalog, "UI single catalog reference");

const uiWork = resolveCatalogForUI(workStore, { region: "dolnyslask" });
assertEq(uiWork?.version, "work", "UI work version");
assertEq(uiWork?.workStore, workStore, "UI work store reference");
assertEq(uiWork?.activeRegion, "dolnyslask", "UI work region override");
assert(uiWork?.legacyStore === null && uiWork?.legacyCatalog === null, "UI work no legacy refs");

assert(resolveCatalogForUI(null) === null, "UI null input");

// ─── immutability ────────────────────────────────────────────────────────

resolveCatalogForEngine(legacyStore);
resolveCatalogForEngine(workStore);
resolveCatalogForUI(legacyStore);
resolveCatalogForUI(workStore);
assert(deepEqual(legacyStore, legacySnapshot), "compat does not mutate legacy store");
assert(deepEqual(workStore, workSnapshot), "compat does not mutate work store");

// ─── persist → load → normalize → compat → engine ─────────────────────────

storage.clear();
saveWorkCatalogStoreLocal(workStore, { updatedAtIso: MIGRATED_AT });
const persisted = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const engineFromPersist = resolveCatalogForEngine(persisted);
const engineFromMemory = resolveCatalogForEngine(workStore);
assert(engineFromPersist != null, "persist pipeline engine not null");
assertNear(
  aggregateCatalogDirectCost(SAMPLE_ROWS, engineFromPersist, defaultCostModelFromPayroll()).totals.direct,
  aggregateCatalogDirectCost(SAMPLE_ROWS, engineFromMemory, defaultCostModelFromPayroll()).totals.direct,
  EPSILON,
  "persist→compat→engine parity",
);

const uiFromPersist = resolveCatalogForUI(persisted);
assertEq(uiFromPersist?.version, "work", "persist→UI work version");
assert(uiFromPersist?.workStore != null, "persist→UI work store present");

// ─── single catalog region guard ─────────────────────────────────────────

const wroclawOnly = defaultWgdomCostCatalog("wroclaw");
assert(resolveCatalogForEngine(wroclawOnly, { region: "dolnyslask" }) === null, "single catalog rejects region mismatch");
assert(resolveCatalogForEngine(wroclawOnly) != null, "single catalog engine without override");

console.log(`\nP1.10 work-catalog compat: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
