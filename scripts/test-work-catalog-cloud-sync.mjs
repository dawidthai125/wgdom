/**
 * P1.11 — Work Catalog cloud-sync integration (DATA_KEYS · merge · load/save hooks).
 * npx vite-node scripts/test-work-catalog-cloud-sync.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOOTSTRAP_DEFERRED_KEYS,
  DATA_KEYS,
  coerceValueForCloudKey,
  mergeDataKey,
} from "../src/lib/cloud-sync.ts";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import {
  WORK_BUNDLE_STORAGE_KEY,
  loadWorkBundleStoreLocal,
  saveWorkBundleStoreLocal,
} from "../src/lib/work-catalog/work-bundle-store.ts";
import {
  WORK_CATALOG_STORAGE_KEY,
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  loadWorkCatalogStore,
  mergeWorkBundleFromSources,
  mergeWorkCatalogFromSources,
  saveWorkBundleStore,
} from "../src/lib/work-catalog/work-catalog-sync.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";

const MIGRATED_AT = "2026-06-01T00:00:00.000Z";
const CLOUD_AT = "2026-06-20T00:00:00.000Z";
const SAVE_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse(SAVE_AT);

const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
);

const { store: migratedStore } = migrateLegacyCostCatalogStoreToWorkCatalog(
  defaultWgdomCostCatalogStore(),
  { migratedAtIso: SAVE_AT, nowMs: NOW_MS, seedManifest },
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

// ─── registry ──────────────────────────────────────────────────────────────

assert(DATA_KEYS.includes(WORK_CATALOG_STORAGE_KEY), "DATA_KEYS work-catalog");
assert(DATA_KEYS.includes(WORK_BUNDLE_STORAGE_KEY), "DATA_KEYS work-bundles");
assert(BOOTSTRAP_DEFERRED_KEYS.includes(WORK_CATALOG_STORAGE_KEY), "deferred work-catalog");
assert(BOOTSTRAP_DEFERRED_KEYS.includes(WORK_BUNDLE_STORAGE_KEY), "deferred work-bundles");
assertEq(WORK_CATALOG_STORAGE_KEY, "kw-wgdom-work-catalog", "catalog key SSOT");
assertEq(WORK_BUNDLE_STORAGE_KEY, "kw-wgdom-work-bundles", "bundle key SSOT");

// ─── mergeDataKey LWW (cloud-sync registry) ────────────────────────────────

const localOlder = { ...migratedStore, updatedAt: MIGRATED_AT };
const cloudNewer = {
  ...migratedStore,
  updatedAt: CLOUD_AT,
  activeRegion: "dolnyslask",
};
const mergedCatalog = mergeDataKey(WORK_CATALOG_STORAGE_KEY, localOlder, cloudNewer);
assertEq(mergedCatalog.updatedAt, CLOUD_AT, "mergeDataKey catalog LWW cloud wins");
assertEq(mergedCatalog.activeRegion, "dolnyslask", "mergeDataKey catalog payload preserved");

const bundleCloud = {
  schemaVersion: 3,
  updatedAt: CLOUD_AT,
  bundles: [
    {
      id: "cloud-bundle",
      namePl: "Cloud bundle",
      primaryTradeId: "MALOWANIE",
      steps: [],
      active: true,
      favorite: false,
      usageCount: 0,
      updatedAt: CLOUD_AT,
      source: "custom",
    },
  ],
};
const mergedBundle = mergeDataKey(
  WORK_BUNDLE_STORAGE_KEY,
  { schemaVersion: 3, updatedAt: MIGRATED_AT, bundles: [] },
  bundleCloud,
);
assertEq(mergedBundle.updatedAt, CLOUD_AT, "mergeDataKey bundle LWW cloud wins");
assertEq(mergedBundle.bundles.length, 1, "mergeDataKey bundle count");

// ─── mergeFromSources (sync hooks) ─────────────────────────────────────────

const fromSources = mergeWorkCatalogFromSources(localOlder, cloudNewer);
assert(deepEqual(fromSources, mergedCatalog), "mergeWorkCatalogFromSources = mergeDataKey");
const bundleFromSources = mergeWorkBundleFromSources(
  { schemaVersion: 3, updatedAt: MIGRATED_AT, bundles: [] },
  bundleCloud,
);
assert(deepEqual(bundleFromSources, mergedBundle), "mergeWorkBundleFromSources = mergeDataKey");

// ─── coerce empty cloud payloads ───────────────────────────────────────────

const coercedCatalog = coerceValueForCloudKey(WORK_CATALOG_STORAGE_KEY, null);
assertEq(coercedCatalog.schemaVersion, 3, "coerce catalog schema v3");
assertEq(coercedCatalog.catalogs.wroclaw.works.length, 0, "coerce catalog empty works");

const coercedBundle = coerceValueForCloudKey(WORK_BUNDLE_STORAGE_KEY, null);
assertEq(coercedBundle.bundles.length, 0, "coerce bundle empty");

// ─── local → merge → local (no data loss) ──────────────────────────────────

storage.clear();
const frozenMigrated = JSON.parse(JSON.stringify(migratedStore));
saveWorkCatalogStoreLocal(migratedStore, { updatedAtIso: SAVE_AT });
const localLoaded = loadWorkCatalogStoreLocal();
assert(localLoaded.catalogs.wroclaw.works.length > 0, "local catalog works preserved");

const roundTrip = mergeWorkCatalogFromSources(localLoaded, null);
assert(roundTrip.catalogs.wroclaw.works.length === localLoaded.catalogs.wroclaw.works.length, "merge null cloud keeps works");
assert(deepEqual(migratedStore, frozenMigrated), "source store not mutated by merge");

const cloudWins = mergeWorkCatalogFromSources(localLoaded, {
  ...localLoaded,
  updatedAt: "2026-07-01T00:00:00.000Z",
  catalogs: {
    ...localLoaded.catalogs,
    wroclaw: { ...localLoaded.catalogs.wroclaw, works: [] },
  },
});
assertEq(cloudWins.catalogs.wroclaw.works.length, 0, "newer cloud empty wins LWW whole store");

// ─── load/save hooks (local + merge path) ──────────────────────────────────

storage.clear();
saveWorkCatalogStoreLocal(
  { ...migratedStore, updatedAt: MIGRATED_AT },
  { updatedAtIso: MIGRATED_AT },
);
const localBeforeMerge = loadWorkCatalogStoreLocal();
const mergedPersist = mergeWorkCatalogFromSources(localBeforeMerge, cloudNewer);
saveWorkCatalogStoreLocal(mergedPersist, { updatedAtIso: mergedPersist.updatedAt });
const localAfterMerge = loadWorkCatalogStoreLocal();
assert(deepEqual(localAfterMerge, mergedPersist), "local→merge→local no data loss");
assertEq(localAfterMerge.updatedAt, CLOUD_AT, "merged updatedAt persisted");

const fromCatch = await loadWorkCatalogStore();
assert(fromCatch.catalogs.wroclaw.works.length > 0, "loadWorkCatalogStore fallback local without cloud");
const bundlePayload = {
  schemaVersion: 3,
  updatedAt: SAVE_AT,
  bundles: [bundleCloud.bundles[0]],
};
try {
  await saveWorkBundleStore(bundlePayload, { updatedAtIso: SAVE_AT });
} catch {
  /* persistKey może fail bez Supabase — LS zapis jest pierwszy */
}
const savedBundle = loadWorkBundleStoreLocal();
assertEq(savedBundle.bundles.length, 1, "saveWorkBundleStore local write");
assertEq(savedBundle.bundles[0].id, "cloud-bundle", "saveWorkBundleStore bundle id");

console.log(`\nP1.11 work-catalog cloud-sync: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
