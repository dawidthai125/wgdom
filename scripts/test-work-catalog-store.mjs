/**
 * P1.7 — WorkCatalogStore local persist (normalize · merge · load · save).
 * npx vite-node scripts/test-work-catalog-store.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  WORK_CATALOG_DEFAULT_UPDATED_AT,
  WORK_CATALOG_STORAGE_KEY,
  defaultWorkCatalogStoreForPersist,
  loadWorkCatalogStoreLocal,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { WORK_CATALOG_SCHEMA_VERSION } from "../src/lib/work-catalog/types.ts";

const MIGRATED_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse("2026-06-28T12:00:00.000Z");
const OLD_TS = "2026-06-01T00:00:00.000Z";
const NEW_TS = "2026-06-20T00:00:00.000Z";

const root = resolve(import.meta.dirname, "..");
const manifestYaml = readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8");
const manifestParsed = validateSeedManifestStructure(parseSeedManifestYaml(manifestYaml));
const seedManifest =
  manifestParsed.valid && manifestParsed.workCount > 0
    ? parseSeedManifestYaml(manifestYaml)
    : undefined;

const { store: migratedStore } = migrateLegacyCostCatalogStoreToWorkCatalog(
  defaultWgdomCostCatalogStore(),
  { migratedAtIso: MIGRATED_AT, nowMs: NOW_MS, seedManifest },
);

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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const defaultStore = defaultWorkCatalogStoreForPersist();
assertEq(normalizeWorkCatalogStore(null).schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "null → schema v4");
assertEq(normalizeWorkCatalogStore(undefined).activeRegion, "wroclaw", "undefined → default region");
assertEq(normalizeWorkCatalogStore({ schemaVersion: 3 }).schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "v3 input → v4");
assertEq(normalizeWorkCatalogStore({ schemaVersion: 99 }).schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "force schema v4");

const invalidWorkStore = {
  ...migratedStore,
  catalogs: {
    ...migratedStore.catalogs,
    wroclaw: {
      ...migratedStore.catalogs.wroclaw,
      works: [
        { id: "", tradeId: "BAD", namePl: "", unit: "lightyear", companyPricePln: -1 },
        {
          id: "valid-malowanie-m2",
          tradeId: "MALOWANIE",
          namePl: "Malowanie ścian",
          unit: "m2",
          companyPricePln: 39,
          updatedAt: MIGRATED_AT,
          freshnessStatus: "ok",
          keywords: ["malowanie"],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "seed",
        },
        {
          id: "valid-malowanie-m2",
          tradeId: "MALOWANIE",
          namePl: "Duplikat",
          unit: "m2",
          companyPricePln: 1,
          updatedAt: MIGRATED_AT,
          freshnessStatus: "ok",
          keywords: [],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "seed",
        },
      ],
    },
  },
};

const normalizedInvalid = normalizeWorkCatalogStore(invalidWorkStore);
assertEq(normalizedInvalid.catalogs.wroclaw.works.length, 1, "normalize drops invalid + duplicate ids");
assertEq(normalizedInvalid.catalogs.wroclaw.works[0].id, "valid-malowanie-m2", "normalize keeps valid work");
assertEq(normalizedInvalid.catalogs.wroclaw.works[0].companyPricePln, 39, "normalize clamps valid price");

const localOlder = normalizeWorkCatalogStore({
  ...defaultStore,
  updatedAt: OLD_TS,
  catalogs: {
    ...defaultStore.catalogs,
    wroclaw: { ...defaultStore.catalogs.wroclaw, works: [], updatedAt: OLD_TS },
  },
});

const cloudNewer = normalizeWorkCatalogStore({
  ...defaultStore,
  updatedAt: NEW_TS,
  activeRegion: "dolnyslask",
  catalogs: {
    ...defaultStore.catalogs,
    wroclaw: { ...defaultStore.catalogs.wroclaw, works: [], updatedAt: NEW_TS },
    dolnyslask: { ...defaultStore.catalogs.dolnyslask, works: [], updatedAt: NEW_TS },
  },
});

const mergedCloudWins = mergeWorkCatalogStore(localOlder, cloudNewer);
assertEq(mergedCloudWins.updatedAt, NEW_TS, "LWW cloud newer wins");
assertEq(mergedCloudWins.activeRegion, "dolnyslask", "LWW cloud payload preserved");

const localNewer = normalizeWorkCatalogStore({ ...cloudNewer, updatedAt: "2026-06-25T00:00:00.000Z" });
const mergedLocalWins = mergeWorkCatalogStore(localNewer, cloudNewer);
assertEq(mergedLocalWins.updatedAt, "2026-06-25T00:00:00.000Z", "LWW local newer wins");

const tieBothZero = mergeWorkCatalogStore(
  { ...defaultStore, updatedAt: "" },
  { ...defaultStore, updatedAt: "" },
);
assertEq(tieBothZero.updatedAt, WORK_CATALOG_DEFAULT_UPDATED_AT, "LWW tie falls back to normalized local");

storage.clear();
assertEq(loadWorkCatalogStoreLocal().schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "load empty → default");

const frozenMigrated = JSON.parse(JSON.stringify(migratedStore));
saveWorkCatalogStoreLocal(migratedStore, { updatedAtIso: MIGRATED_AT });
assert(storage.has(WORK_CATALOG_STORAGE_KEY), "save writes localStorage key");

const loaded = loadWorkCatalogStoreLocal();
assertEq(loaded.updatedAt, MIGRATED_AT, "load returns saved updatedAt");
assert(loaded.catalogs.wroclaw.works.length > 0, "load preserves works");
assert(deepEqual(normalizeWorkCatalogStore(migratedStore), loaded), "save/load round-trip normalized");

const beforeSaveInput = JSON.parse(JSON.stringify(migratedStore));
saveWorkCatalogStoreLocal(migratedStore, { updatedAtIso: NEW_TS });
assert(deepEqual(migratedStore, beforeSaveInput), "save does not mutate input store");

storage.clear();
localStorage.setItem(WORK_CATALOG_STORAGE_KEY, "{not-json");
const loadedBroken = loadWorkCatalogStoreLocal();
assertEq(loadedBroken.schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "broken JSON → default store");

storage.clear();
localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(migratedStore));
const frozenBeforeLoad = JSON.parse(JSON.stringify(migratedStore));
loadWorkCatalogStoreLocal();
assert(deepEqual(JSON.parse(localStorage.getItem(WORK_CATALOG_STORAGE_KEY)), frozenBeforeLoad), "load does not mutate storage");

assertEq(WORK_CATALOG_STORAGE_KEY, "kw-wgdom-work-catalog", "storage key SSOT");

console.log(`\nP1.7 work-catalog store: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
