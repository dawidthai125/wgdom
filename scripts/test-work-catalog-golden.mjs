/**
 * P1.9 — Golden Regression Tests (fundament Work Catalog v3.0).
 * npx vite-node scripts/test-work-catalog-golden.mjs
 *
 * Wykrywa regresję w łańcuchu: typy · manifest · freshness · helpers · cost-split ·
 * migracja · adapter · WorkCatalogStore · WorkBundleStore.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WGDOM_COST_CATEGORY_IDS,
  defaultWgdomCostCatalogStore,
  getCategoryRate,
} from "../src/lib/wgdom-cost-catalog.ts";
import { aggregateCatalogDirectCost } from "../src/lib/wgdom-catalog-cost-engine.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  countActiveWorks,
  getWorkByIdFromStore,
  listActiveWorksForRegion,
  listWorksForRegion,
} from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  WORK_CATALOG_REFERENCE_HOURLY_PLN,
  computeCompanyPriceFromLegacyRate,
  deriveCostSplitFromLegacyRate,
  mergeCompanyPriceFromLegacyRate,
  splitCompanyPrice,
  verifyLegacyRateRoundTrip,
} from "../src/lib/work-catalog/cost-split.ts";
import {
  WORK_FRESHNESS_STALE_AFTER_DAYS,
  deriveFreshnessStatus,
  withFreshnessStatus,
  workFreshnessStaleAfterMs,
} from "../src/lib/work-catalog/freshness.ts";
import {
  TRADE_IDS,
  TRADE_LABELS_PL,
  isTradeId,
  tradeLabelPl,
} from "../src/lib/work-catalog/trades.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
  validateSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import {
  WORK_BUNDLE_SCHEMA_VERSION,
  WORK_CATALOG_SCHEMA_VERSION,
} from "../src/lib/work-catalog/types.ts";
import {
  buildLegacyCostCatalogFromWorkStore,
  LEGACY_CATEGORY_TO_TRADE,
  mergeKeywords,
  resolveRegionSlice,
} from "../src/lib/work-catalog/work-catalog-engine-adapter.ts";
import {
  countLegacyCatalogRates,
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  WORK_CATALOG_STORAGE_KEY,
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  mergeWorkBundleStore,
  normalizeWorkBundleStore,
  saveWorkBundleStoreLocal,
} from "../src/lib/work-catalog/work-bundle-store.ts";

/** Zamrożone wartości prod — zmiana wymaga świadomej aktualizacji golden. */
const GOLDEN = Object.freeze({
  WORK_CATALOG_SCHEMA_VERSION: 3,
  WORK_BUNDLE_SCHEMA_VERSION: 3,
  TRADE_IDS_COUNT: 16,
  MANIFEST_WORK_COUNT: 116,
  MANIFEST_VERSION: "1.0",
  LEGACY_RATE_COUNT: 68,
  WORKS_MIGRATED: 68,
  REGION_WORK_COUNT: 34,
  LEGACY_CATEGORIES: 15,
  REFERENCE_HOURLY_PLN: 85,
  FRESHNESS_STALE_DAYS: 90,
  FIRST_MANIFEST_WORK_ID: "malowanie-scian-m2",
  LEGACY_CATEGORY_MAP_SIZE: 15,
  PERSIST_STORE_FINGERPRINT: "10fe398353bd31fb",
});

const MIGRATED_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse(MIGRATED_AT);
const EPSILON = 0.01;

const SAMPLE_ROWS = [
  { description: "Malowanie ścian w pomieszczeniu", unit: "m2", quantity: "12.5" },
  { description: "Montaż gniazda wtyczkowego", unit: "szt", quantity: "4" },
  { description: "Wywóz gruzu kontener", unit: "m3", quantity: "2" },
  { description: "Nieznana pozycja testowa xyz", unit: "m2", quantity: "1" },
];

const root = resolve(import.meta.dirname, "..");
const manifestYaml = readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8");
const seedManifest = parseSeedManifestYaml(manifestYaml);
const manifestProduct = validateSeedManifestYaml(manifestYaml);

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

function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function normalizeCatalogForCompare(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    region: catalog.region,
    regionMultiplier: catalog.regionMultiplier,
    categories: catalog.categories.map((cat) => ({
      id: cat.id,
      labelPl: cat.labelPl,
      marketRefNote: cat.marketRefNote,
      keywords: [...cat.keywords].sort(),
      rates: [...cat.rates]
        .sort((a, b) => a.unit.localeCompare(b.unit))
        .map((rate) => ({
          unit: rate.unit,
          materialPlnPerUnit: rate.materialPlnPerUnit,
          laborRbhPerUnit: rate.laborRbhPerUnit,
        })),
    })),
    unknownFallback: {
      materialPlnPerUnit: catalog.unknownFallback.materialPlnPerUnit,
      laborRbhPerUnit: catalog.unknownFallback.laborRbhPerUnit,
      defaultUnit: catalog.unknownFallback.defaultUnit,
    },
  };
}

function assertCatalogsNear(original, adapted, msgPrefix) {
  const a = normalizeCatalogForCompare(original);
  const b = normalizeCatalogForCompare(adapted);

  assertEq(a.schemaVersion, b.schemaVersion, `${msgPrefix} schemaVersion`);
  assertEq(a.region, b.region, `${msgPrefix} region`);
  assertNear(a.regionMultiplier, b.regionMultiplier, EPSILON, `${msgPrefix} regionMultiplier`);
  assertEq(a.categories.length, b.categories.length, `${msgPrefix} category count`);

  for (let i = 0; i < a.categories.length; i += 1) {
    const ca = a.categories[i];
    const cb = b.categories[i];
    assertEq(ca.id, cb.id, `${msgPrefix} category id ${ca.id}`);
    assertEq(ca.rates.length, cb.rates.length, `${msgPrefix} rates count ${ca.id}`);

    for (let j = 0; j < ca.rates.length; j += 1) {
      const ra = ca.rates[j];
      const rb = cb.rates[j];
      assertEq(ra.unit, rb.unit, `${msgPrefix} unit ${ca.id}/${ra.unit}`);
      assertNear(ra.materialPlnPerUnit, rb.materialPlnPerUnit, EPSILON, `${msgPrefix} material ${ca.id}/${ra.unit}`);
      assertNear(ra.laborRbhPerUnit, rb.laborRbhPerUnit, EPSILON, `${msgPrefix} labor ${ca.id}/${ra.unit}`);
    }

    assertEq(ca.keywords.length, cb.keywords.length, `${msgPrefix} keywords len ${ca.id}`);
    const sortedA = [...ca.keywords].sort();
    const sortedB = [...cb.keywords].sort();
    for (let k = 0; k < sortedA.length; k += 1) {
      assertEq(sortedA[k], sortedB[k], `${msgPrefix} keyword ${ca.id}[${k}]`);
    }
  }

  assertNear(
    a.unknownFallback.materialPlnPerUnit,
    b.unknownFallback.materialPlnPerUnit,
    EPSILON,
    `${msgPrefix} unknown material`,
  );
  assertNear(
    a.unknownFallback.laborRbhPerUnit,
    b.unknownFallback.laborRbhPerUnit,
    EPSILON,
    `${msgPrefix} unknown labor`,
  );
  assertEq(a.unknownFallback.defaultUnit, b.unknownFallback.defaultUnit, `${msgPrefix} unknown unit`);
}

// ─── GOLDEN: typy (P1.1) ───────────────────────────────────────────────────

assertEq(WORK_CATALOG_SCHEMA_VERSION, GOLDEN.WORK_CATALOG_SCHEMA_VERSION, "GOLDEN types catalog schema v3");
assertEq(WORK_BUNDLE_SCHEMA_VERSION, GOLDEN.WORK_BUNDLE_SCHEMA_VERSION, "GOLDEN types bundle schema v3");
assertEq(TRADE_IDS.length, GOLDEN.TRADE_IDS_COUNT, "GOLDEN types trade count");
assert(TRADE_IDS.every((id) => typeof TRADE_LABELS_PL[id] === "string" && TRADE_LABELS_PL[id].length > 0), "GOLDEN types trade labels");
assert(isTradeId("MALOWANIE"), "GOLDEN types isTradeId valid");
assert(!isTradeId("ROBOTY"), "GOLDEN types isTradeId rejects unknown");
assertEq(tradeLabelPl("ELEKTRYKA"), "Elektryka", "GOLDEN types tradeLabelPl");

// ─── GOLDEN: manifest (P1.3) ───────────────────────────────────────────────

assert(manifestProduct.valid, "GOLDEN manifest product valid");
assertEq(manifestProduct.workCount, GOLDEN.MANIFEST_WORK_COUNT, "GOLDEN manifest work count");
assertEq(seedManifest.manifestVersion, GOLDEN.MANIFEST_VERSION, "GOLDEN manifest version");
assertEq(seedManifest.works[0].id, GOLDEN.FIRST_MANIFEST_WORK_ID, "GOLDEN manifest first work id");

for (const tradeId of TRADE_IDS) {
  assert((manifestProduct.tradeCounts[tradeId] ?? 0) > 0, `GOLDEN manifest trade ${tradeId} has works`);
}

const duplicateManifest = validateSeedManifestStructure({
  manifestVersion: "1.0",
  works: [
    { id: "a", tradeId: "MALOWANIE", namePl: "A", unit: "m2", keywords: [], active: true },
    { id: "a", tradeId: "MALOWANIE", namePl: "B", unit: "m2", keywords: [], active: true },
  ],
});
assert(!duplicateManifest.valid, "GOLDEN manifest rejects duplicate ids");

// ─── GOLDEN: freshness + helpers (P1.2) ────────────────────────────────────

assertEq(WORK_FRESHNESS_STALE_AFTER_DAYS, GOLDEN.FRESHNESS_STALE_DAYS, "GOLDEN freshness stale window");
assertEq(deriveFreshnessStatus({ companyPricePln: 39, updatedAt: "2026-06-01T12:00:00.000Z" }, NOW_MS), "ok", "GOLDEN freshness ok");
assertEq(deriveFreshnessStatus({ companyPricePln: 39, updatedAt: "2026-01-01T12:00:00.000Z" }, NOW_MS), "stale", "GOLDEN freshness stale");
assertEq(deriveFreshnessStatus({ companyPricePln: 0, updatedAt: "2026-06-01T12:00:00.000Z" }, NOW_MS), "missing", "GOLDEN freshness missing");

const exactly90 = new Date(NOW_MS - workFreshnessStaleAfterMs()).toISOString();
assertEq(deriveFreshnessStatus({ companyPricePln: 10, updatedAt: exactly90 }, NOW_MS), "stale", "GOLDEN freshness boundary 90d");

// ─── GOLDEN: cost split (P1.4) ───────────────────────────────────────────────

assertEq(WORK_CATALOG_REFERENCE_HOURLY_PLN, GOLDEN.REFERENCE_HOURLY_PLN, "GOLDEN cost-split reference hourly");
assertEq(computeCompanyPriceFromLegacyRate(8, 0.16), mergeCompanyPriceFromLegacyRate(8, 0.16), "GOLDEN cost-split merge alias");
assert(verifyLegacyRateRoundTrip(8, 0.16), "GOLDEN cost-split round-trip MALOWANIE m2 base");

const split = deriveCostSplitFromLegacyRate(8, 0.16);
const forward = splitCompanyPrice(mergeCompanyPriceFromLegacyRate(8, 0.16), split);
assertNear(forward.materialPlnPerUnit, 8, EPSILON, "GOLDEN cost-split forward material");
assertNear(forward.laborRbhPerUnit, 0.16, EPSILON, "GOLDEN cost-split forward labor");

// ─── GOLDEN: migracja (P1.5) ───────────────────────────────────────────────

const legacyStore = defaultWgdomCostCatalogStore();
const legacySnapshot = JSON.parse(JSON.stringify(legacyStore));
assertEq(countLegacyCatalogRates(legacyStore), GOLDEN.LEGACY_RATE_COUNT, "GOLDEN migration legacy rate count");

const { store: workStore, result: migrationResult } = migrateLegacyCostCatalogStoreToWorkCatalog(
  legacyStore,
  { migratedAtIso: MIGRATED_AT, nowMs: NOW_MS, seedManifest },
);

assert(deepEqual(legacyStore, legacySnapshot), "GOLDEN migration does not mutate legacy input");
assertEq(migrationResult.worksMigrated, GOLDEN.WORKS_MIGRATED, "GOLDEN migration worksMigrated");
assertEq(workStore.schemaVersion, GOLDEN.WORK_CATALOG_SCHEMA_VERSION, "GOLDEN migration output schema v3");
assertEq(workStore.catalogs.wroclaw.works.length, GOLDEN.REGION_WORK_COUNT, "GOLDEN migration wroclaw work count");
assertEq(workStore.catalogs.dolnyslask.works.length, GOLDEN.REGION_WORK_COUNT, "GOLDEN migration dolnyslask work count");
assertEq(workStore.seedManifestVersion, GOLDEN.MANIFEST_VERSION, "GOLDEN migration seedManifestVersion");
assertEq(workStore.migratedFromLegacyAt, MIGRATED_AT, "GOLDEN migration migratedFromLegacyAt");

const idempotent = migrateLegacyCostCatalogStoreToWorkCatalog(workStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
assert(deepEqual(workStore, idempotent.store), "GOLDEN migration idempotent on v3 store");

// ─── GOLDEN: adapter (P1.6) ────────────────────────────────────────────────

assertEq(Object.keys(LEGACY_CATEGORY_TO_TRADE).length, GOLDEN.LEGACY_CATEGORY_MAP_SIZE, "GOLDEN adapter legacy map size");
assertEq(mergeKeywords([["malow", "scian"], ["malow", "farba"]]).length, 3, "GOLDEN adapter mergeKeywords dedupe");

const slice = resolveRegionSlice(workStore, "wroclaw");
assert(slice != null, "GOLDEN adapter resolveRegionSlice");
assertEq(slice.works.length, GOLDEN.REGION_WORK_COUNT, "GOLDEN adapter region slice work count");

// ─── GOLDEN: legacy → migration → adapter → legacy (round-trip) ─────────────

for (const region of ["wroclaw", "dolnyslask"]) {
  const original = legacyStore.catalogs[region];
  const adapted = buildLegacyCostCatalogFromWorkStore(workStore, region, {
    updatedAtIso: original.updatedAt,
  });

  assertEq(adapted.categories.length, GOLDEN.LEGACY_CATEGORIES, `GOLDEN round-trip ${region} category count`);
  assertCatalogsNear(original, adapted, `GOLDEN round-trip ${region}`);

  const legacyEngine = aggregateCatalogDirectCost(SAMPLE_ROWS, original, defaultCostModelFromPayroll());
  const adaptedEngine = aggregateCatalogDirectCost(SAMPLE_ROWS, adapted, defaultCostModelFromPayroll());

  assertNear(legacyEngine.totals.direct, adaptedEngine.totals.direct, EPSILON, `GOLDEN round-trip ${region} engine direct`);
  assertNear(legacyEngine.totals.material, adaptedEngine.totals.material, EPSILON, `GOLDEN round-trip ${region} engine material`);
  assertNear(legacyEngine.totals.labor, adaptedEngine.totals.labor, EPSILON, `GOLDEN round-trip ${region} engine labor`);
  assertEq(legacyEngine.rowCount, adaptedEngine.rowCount, `GOLDEN round-trip ${region} engine rowCount`);
}

const categoryIdFingerprint = fingerprint(
  buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw").categories.map((c) => c.id).sort(),
);
assertEq(categoryIdFingerprint, "485bf80ca49a5748", "GOLDEN round-trip category id fingerprint");

const malowanieRate = getCategoryRate(
  buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw"),
  "MALOWANIE",
  "m2",
);
assertNear(malowanieRate.materialPlnPerUnit, 8, EPSILON, "GOLDEN round-trip MALOWANIE m2 material");
assertNear(malowanieRate.laborRbhPerUnit, 0.16, EPSILON, "GOLDEN round-trip MALOWANIE m2 labor");

for (const categoryId of WGDOM_COST_CATEGORY_IDS) {
  const adapted = buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw");
  const def = adapted.categories.find((c) => c.id === categoryId);
  assert(def != null, `GOLDEN round-trip category ${categoryId} present`);
  assert(def.keywords.length > 0, `GOLDEN round-trip category ${categoryId} keywords`);
}

// ─── GOLDEN: helpers on migrated store ─────────────────────────────────────

assertEq(listWorksForRegion(workStore).length, GOLDEN.REGION_WORK_COUNT, "GOLDEN helpers listWorksForRegion");
assertEq(listActiveWorksForRegion(workStore).length, GOLDEN.REGION_WORK_COUNT, "GOLDEN helpers listActiveWorksForRegion");
assertEq(countActiveWorks(workStore.catalogs.wroclaw.works), GOLDEN.REGION_WORK_COUNT, "GOLDEN helpers countActiveWorks");

const malowanieWork = getWorkByIdFromStore(workStore, "legacy-malowanie-m2");
assert(malowanieWork != null, "GOLDEN helpers legacy-malowanie-m2 exists");
assertNear(
  malowanieWork.companyPricePln,
  mergeCompanyPriceFromLegacyRate(8, 0.16),
  EPSILON,
  "GOLDEN helpers malowanie company price",
);

const refreshedWork = withFreshnessStatus(malowanieWork, NOW_MS);
assertEq(refreshedWork.freshnessStatus, "ok", "GOLDEN helpers withFreshnessStatus");
assert(malowanieWork.freshnessStatus !== refreshedWork.freshnessStatus || malowanieWork.freshnessStatus === "ok", "GOLDEN helpers freshness immutability input");

// ─── GOLDEN: persist → load → normalize → adapter → engine (P1.7) ──────────

storage.clear();
const frozenWorkStore = JSON.parse(JSON.stringify(workStore));
saveWorkCatalogStoreLocal(workStore, { updatedAtIso: MIGRATED_AT });
assert(storage.has(WORK_CATALOG_STORAGE_KEY), "GOLDEN persist catalog save writes key");

const loadedCatalog = loadWorkCatalogStoreLocal();
const normalizedCatalog = normalizeWorkCatalogStore(loadedCatalog);
assert(deepEqual(normalizedCatalog, normalizeWorkCatalogStore(workStore)), "GOLDEN persist catalog load/normalize round-trip");
assert(deepEqual(workStore, frozenWorkStore), "GOLDEN persist catalog save does not mutate input");

for (const region of ["wroclaw", "dolnyslask"]) {
  const fromPersist = buildLegacyCostCatalogFromWorkStore(normalizedCatalog, region, {
    updatedAtIso: legacyStore.catalogs[region].updatedAt,
  });
  const direct = buildLegacyCostCatalogFromWorkStore(workStore, region, {
    updatedAtIso: legacyStore.catalogs[region].updatedAt,
  });
  assertCatalogsNear(direct, fromPersist, `GOLDEN persist→adapter ${region}`);

  const engineFromPersist = aggregateCatalogDirectCost(
    SAMPLE_ROWS,
    fromPersist,
    defaultCostModelFromPayroll(),
  );
  const engineDirect = aggregateCatalogDirectCost(
    SAMPLE_ROWS,
    direct,
    defaultCostModelFromPayroll(),
  );
  assertNear(engineFromPersist.totals.direct, engineDirect.totals.direct, EPSILON, `GOLDEN persist→engine ${region} direct`);
  assertEq(engineFromPersist.rowCount, engineDirect.rowCount, `GOLDEN persist→engine ${region} rowCount`);
}

const persistFingerprint = fingerprint({
  schemaVersion: normalizedCatalog.schemaVersion,
  activeRegion: normalizedCatalog.activeRegion,
  wroclawWorks: normalizedCatalog.catalogs.wroclaw.works.length,
  dolnyslaskWorks: normalizedCatalog.catalogs.dolnyslask.works.length,
  updatedAt: normalizedCatalog.updatedAt,
});
assertEq(persistFingerprint, GOLDEN.PERSIST_STORE_FINGERPRINT, "GOLDEN persist store fingerprint");

// ─── GOLDEN: WorkBundleStore (P1.8) ────────────────────────────────────────

const emptyBundleStore = defaultWorkBundleStore();
assertEq(emptyBundleStore.schemaVersion, GOLDEN.WORK_BUNDLE_SCHEMA_VERSION, "GOLDEN bundle default schema v3");
assertEq(emptyBundleStore.bundles.length, 0, "GOLDEN bundle default empty");

const sampleBundle = {
  id: "golden-bundle-lazienka",
  namePl: "Łazienka golden",
  primaryTradeId: "LAZIENKA",
  steps: [
    { order: 1, workId: "legacy-malowanie-m2", quantityDefault: 12 },
    { order: 2, workId: "legacy-hydraulika-szt" },
  ],
  active: true,
  favorite: false,
  usageCount: 0,
  updatedAt: MIGRATED_AT,
  source: "custom",
};

storage.clear();
const bundleToSave = normalizeWorkBundleStore({
  schemaVersion: WORK_BUNDLE_SCHEMA_VERSION,
  updatedAt: MIGRATED_AT,
  bundles: [sampleBundle],
});
saveWorkBundleStoreLocal(bundleToSave, { updatedAtIso: MIGRATED_AT });
assert(storage.has(WORK_BUNDLE_STORAGE_KEY), "GOLDEN bundle save writes key");

const loadedBundle = loadWorkBundleStoreLocal();
assert(deepEqual(loadedBundle, normalizeWorkBundleStore(bundleToSave)), "GOLDEN bundle load round-trip");
assertEq(loadedBundle.bundles[0].steps.length, 2, "GOLDEN bundle steps preserved");
assertEq(loadedBundle.bundles[0].steps[0].order, 1, "GOLDEN bundle steps sorted");

const mergedBundle = mergeWorkBundleStore(
  { ...emptyBundleStore, updatedAt: "2026-06-01T00:00:00.000Z" },
  loadedBundle,
);
assertEq(mergedBundle.bundles.length, 1, "GOLDEN bundle merge LWW cloud wins");
assertEq(mergedBundle.updatedAt, MIGRATED_AT, "GOLDEN bundle merge LWW updatedAt");

assertEq(WORK_CATALOG_STORAGE_KEY, "kw-wgdom-work-catalog", "GOLDEN storage key catalog SSOT");
assertEq(WORK_BUNDLE_STORAGE_KEY, "kw-wgdom-work-bundles", "GOLDEN storage key bundle SSOT");

console.log(`\nP1.9 work-catalog golden: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
