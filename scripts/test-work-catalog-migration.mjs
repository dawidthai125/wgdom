/**
 * P1.5 — migracja legacy cost catalog → Work Catalog v3.
 * npx vite-node scripts/test-work-catalog-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WGDOM_COST_CATEGORY_IDS,
  defaultWgdomCostCatalogStore,
  getCategoryRate,
} from "../src/lib/wgdom-cost-catalog.ts";
import { mergeCompanyPriceFromLegacyRate } from "../src/lib/work-catalog/cost-split.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
} from "../src/lib/work-catalog/seed-manifest.ts";
import {
  LEGACY_CATEGORY_TO_TRADE,
  cloneWorkCatalogStore,
  countLegacyCatalogRates,
  createEmptyWorkCatalogStore,
  defaultWorkCatalogStore,
  isLegacyCostCatalogStore,
  isWorkCatalogStoreV3,
  mapLegacyCategoryToTradeId,
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { WORK_CATALOG_SCHEMA_VERSION } from "../src/lib/work-catalog/types.ts";

const MIGRATED_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse("2026-06-28T12:00:00.000Z");

const root = resolve(import.meta.dirname, "..");
const manifestYaml = readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8");
const manifestParsed = validateSeedManifestStructure(parseSeedManifestYaml(manifestYaml));
const seedManifest =
  manifestParsed.valid && manifestParsed.workCount > 0
    ? /** @type {import("../src/lib/work-catalog/seed-manifest.ts").SeedManifestDocument} */ (
        parseSeedManifestYaml(manifestYaml)
      )
    : undefined;

const migrateOptions = {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
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

function assertNear(actual, expected, epsilon, msg) {
  if (Math.abs(actual - expected) > epsilon) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ~${expected}, got ${actual}`);
    return;
  }
  pass += 1;
}

const legacyDefault = defaultWgdomCostCatalogStore();
const legacySnapshot = JSON.parse(JSON.stringify(legacyDefault));

const first = migrateLegacyCostCatalogStoreToWorkCatalog(legacyDefault, migrateOptions);
const second = migrateLegacyCostCatalogStoreToWorkCatalog(first.store, migrateOptions);
const third = migrateLegacyCostCatalogStoreToWorkCatalog(legacyDefault, migrateOptions);

assertEq(first.store.schemaVersion, WORK_CATALOG_SCHEMA_VERSION, "schemaVersion === 4");
assert(isWorkCatalogStoreV3(first.store), "output is WorkCatalogStore v3");
assert(isLegacyCostCatalogStore(legacyDefault), "input legacy schema 1");
assert(deepEqual(legacyDefault, legacySnapshot), "legacy input not mutated");

assert(first.result.worksMigrated > 0, "worksMigrated > 0");
assertEq(first.result.worksSkipped, 0, "default legacy — no skipped works");
assertEq(first.result.unknownCategories.length, 0, "all categories mapped");
assertEq(first.result.unknownUnits.length, 0, "all units valid");

const legacyRateCount = countLegacyCatalogRates(legacyDefault);
const wroclawWorks = first.store.catalogs.wroclaw.works.length;
const dolnyslaskWorks = first.store.catalogs.dolnyslask.works.length;
assert(wroclawWorks >= legacyRateCount / 2, "wroclaw works >= legacy rates per region");
assert(dolnyslaskWorks >= legacyRateCount / 2, "dolnyslask works >= legacy rates per region");
assertEq(wroclawWorks, dolnyslaskWorks, "both regions same work count");

for (const categoryId of WGDOM_COST_CATEGORY_IDS) {
  assert(mapLegacyCategoryToTradeId(categoryId) != null, `trade map for ${categoryId}`);
  const tradeId = LEGACY_CATEGORY_TO_TRADE[categoryId];
  assertEq(mapLegacyCategoryToTradeId(categoryId), tradeId, `mapLegacyCategoryToTradeId ${categoryId}`);
}

const malowanieWork = first.store.catalogs.wroclaw.works.find(
  (w) => w.legacyCategoryId === "MALOWANIE" && w.unit === "m2",
);
assert(malowanieWork != null, "MALOWANIE m2 work exists");
assert(malowanieWork.keywords.length > 0, "MALOWANIE keywords copied");
assert(malowanieWork.costSplit != null, "costSplit present");
assertNear(
  malowanieWork.companyPricePln,
  mergeCompanyPriceFromLegacyRate(8, 0.16),
  0.01,
  "MALOWANIE m2 company price from legacy",
);

const wroclawMalowanie = getCategoryRate(legacyDefault.catalogs.wroclaw, "MALOWANIE", "m2");
const dolnyslaskMalowanie = getCategoryRate(legacyDefault.catalogs.dolnyslask, "MALOWANIE", "m2");
const wroclawWork = first.store.catalogs.wroclaw.works.find(
  (w) => w.id === "legacy-malowanie-m2",
);
const dolnyslaskWork = first.store.catalogs.dolnyslask.works.find(
  (w) => w.id === "legacy-malowanie-m2",
);
assert(wroclawWork && dolnyslaskWork, "regional malowanie works");
assert(
  wroclawMalowanie.materialPlnPerUnit !== dolnyslaskMalowanie.materialPlnPerUnit,
  "region multiplier differs material",
);
assertNear(
  wroclawWork.companyPricePln,
  mergeCompanyPriceFromLegacyRate(wroclawMalowanie.materialPlnPerUnit, wroclawMalowanie.laborRbhPerUnit),
  0.01,
  "wroclaw price uses region multiplier",
);
assert(
  dolnyslaskWork.companyPricePln < wroclawWork.companyPricePln,
  "dolnyslask company price lower (material ×0.92)",
);

assert(deepEqual(first.store, third.store), "idempotent: migrate(legacy) twice identical");
assert(deepEqual(first.store, second.store), "idempotent: migrate(migrate(legacy)) unchanged");

const emptyLegacy = {
  schemaVersion: 1,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: { schemaVersion: 1, region: "wroclaw", regionMultiplier: 1, categories: [], unknownFallback: { materialPlnPerUnit: 0, laborRbhPerUnit: 0, defaultUnit: "m2" }, updatedAt: MIGRATED_AT },
    dolnyslask: { schemaVersion: 1, region: "dolnyslask", regionMultiplier: 0.92, categories: [], unknownFallback: { materialPlnPerUnit: 0, laborRbhPerUnit: 0, defaultUnit: "m2" }, updatedAt: MIGRATED_AT },
  },
};
const emptyOut = migrateLegacyCostCatalogStoreToWorkCatalog(emptyLegacy, migrateOptions);
assert(isWorkCatalogStoreV3(emptyOut.store), "empty legacy → valid v4 store");
assertEq(emptyOut.store.catalogs.wroclaw.works.length, 0, "empty legacy → no works");

const badCategoryLegacy = JSON.parse(JSON.stringify(legacyDefault));
badCategoryLegacy.catalogs.wroclaw.categories.push({
  id: "NOT_A_REAL_CATEGORY",
  labelPl: "Test",
  rates: [{ unit: "m2", materialPlnPerUnit: 1, laborRbhPerUnit: 0.1 }],
  keywords: ["test"],
});
const badOut = migrateLegacyCostCatalogStoreToWorkCatalog(badCategoryLegacy, migrateOptions);
assert(badOut.result.worksSkipped >= 1, "unknown category skipped");
assert(badOut.result.unknownCategories.includes("NOT_A_REAL_CATEGORY"), "unknown category reported");

const badUnitLegacy = JSON.parse(JSON.stringify(legacyDefault));
badUnitLegacy.catalogs.wroclaw.categories[0].rates.push({
  unit: "lightyear",
  materialPlnPerUnit: 1,
  laborRbhPerUnit: 0.1,
});
const badUnitOut = migrateLegacyCostCatalogStoreToWorkCatalog(badUnitLegacy, migrateOptions);
assert(badUnitOut.result.unknownUnits.includes("lightyear"), "unknown unit reported");
assert(badUnitOut.result.worksSkipped >= 1, "bad unit skipped");

const cloned = cloneWorkCatalogStore(first.store);
assert(deepEqual(cloned, first.store), "cloneWorkCatalogStore deep equal");
cloned.catalogs.wroclaw.works[0].namePl = "MUTATED";
assert(
  first.store.catalogs.wroclaw.works[0].namePl !== "MUTATED",
  "clone does not alias original",
);

const emptyStore = createEmptyWorkCatalogStore(MIGRATED_AT);
assertEq(emptyStore.catalogs.wroclaw.works.length, 0, "createEmptyWorkCatalogStore");
const defaultStore = defaultWorkCatalogStore(MIGRATED_AT);
assert(defaultStore.tradesOrder?.length === 16, "defaultWorkCatalogStore tradesOrder");

assert(first.store.migratedFromLegacyAt === MIGRATED_AT, "migratedFromLegacyAt set");
assert(first.store.seedManifestVersion === "1.0", "seedManifestVersion set");
assert(Array.isArray(first.result.warnings), "warnings array");

console.log(`\nP1.5 work-catalog migration: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
