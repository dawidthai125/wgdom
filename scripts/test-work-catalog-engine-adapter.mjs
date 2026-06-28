/**
 * P1.6 — adapter Work Catalog v3 → WgdomCostCatalog (silnik legacy).
 * npx vite-node scripts/test-work-catalog-engine-adapter.mjs
 */
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
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
} from "../src/lib/work-catalog/seed-manifest.ts";
import {
  buildLegacyCostCatalogFromWorkStore,
  mergeKeywords,
  resolveRegionSlice,
  listTradeIdsForLegacyCategory,
  LEGACY_CATEGORY_TO_TRADE,
} from "../src/lib/work-catalog/work-catalog-engine-adapter.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";

const MIGRATED_AT = "2026-06-28T12:00:00.000Z";
const NOW_MS = Date.parse("2026-06-28T12:00:00.000Z");
const EPSILON = 0.01;

const root = resolve(import.meta.dirname, "..");
const manifestYaml = readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8");
const manifestParsed = validateSeedManifestStructure(parseSeedManifestYaml(manifestYaml));
const seedManifest =
  manifestParsed.valid && manifestParsed.workCount > 0
    ? parseSeedManifestYaml(manifestYaml)
    : undefined;

const migrateOptions = {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
};

const SAMPLE_ROWS = [
  { description: "Malowanie ścian w pomieszczeniu", unit: "m2", quantity: "12.5" },
  { description: "Montaż gniazda wtyczkowego", unit: "szt", quantity: "4" },
  { description: "Wywóz gruzu kontener", unit: "m3", quantity: "2" },
  { description: "Nieznana pozycja testowa xyz", unit: "m2", quantity: "1" },
];

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

function normalizeCatalogForCompare(catalog) {
  return {
    schemaVersion: catalog.schemaVersion,
    region: catalog.region,
    regionMultiplier: catalog.regionMultiplier,
    categories: catalog.categories.map((cat) => ({
      id: cat.id,
      labelPl: cat.labelPl,
      marketRefNote: cat.marketRefNote,
      keywords: [...cat.keywords],
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
    assertEq(ca.labelPl, cb.labelPl, `${msgPrefix} label ${ca.id}`);
    assertEq(ca.rates.length, cb.rates.length, `${msgPrefix} rates count ${ca.id}`);

    for (let j = 0; j < ca.rates.length; j += 1) {
      const ra = ca.rates[j];
      const rb = cb.rates[j];
      assertEq(ra.unit, rb.unit, `${msgPrefix} unit ${ca.id}/${ra.unit}`);
      assertNear(ra.materialPlnPerUnit, rb.materialPlnPerUnit, EPSILON, `${msgPrefix} material ${ca.id}/${ra.unit}`);
      assertNear(ra.laborRbhPerUnit, rb.laborRbhPerUnit, EPSILON, `${msgPrefix} labor rbh ${ca.id}/${ra.unit}`);
    }

    assertEq(ca.keywords.length, cb.keywords.length, `${msgPrefix} keywords len ${ca.id}`);
    for (let k = 0; k < ca.keywords.length; k += 1) {
      assertEq(ca.keywords[k], cb.keywords[k], `${msgPrefix} keyword ${ca.id}[${k}]`);
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

assertEq(mergeKeywords([["malow", "scian"], ["malow", "farba"]]).length, 3, "mergeKeywords dedupe");
assert(mergeKeywords([["A"], ["B"]]).includes("A"), "mergeKeywords preserves values");
assertEq(listTradeIdsForLegacyCategory("MALOWANIE").join(), "MALOWANIE", "MALOWANIE trade map");
assert(
  listTradeIdsForLegacyCategory("GK").includes("SCIANY_GK"),
  "GK maps to SCIANY_GK",
);
assertEq(Object.keys(LEGACY_CATEGORY_TO_TRADE).length, 15, "15 legacy categories mapped");

const legacyStore = defaultWgdomCostCatalogStore();
const legacySnapshot = JSON.parse(JSON.stringify(legacyStore));
const { store: workStore } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, migrateOptions);

assert(JSON.stringify(legacyStore) === JSON.stringify(legacySnapshot), "migrate does not mutate legacy input");

const slice = resolveRegionSlice(workStore, "wroclaw");
assert(slice != null, "resolveRegionSlice wroclaw");
assert(slice.works.length > 0, "region slice has works");

for (const region of ["wroclaw", "dolnyslask"]) {
  const original = legacyStore.catalogs[region];
  const adapted = buildLegacyCostCatalogFromWorkStore(workStore, region, {
    updatedAtIso: original.updatedAt,
  });

  assertEq(adapted.schemaVersion, 1, `${region} legacy schema`);
  assertEq(adapted.region, region, `${region} region preserved`);
  assertCatalogsNear(original, adapted, `${region} round-trip`);

  const legacyEngine = aggregateCatalogDirectCost(
    SAMPLE_ROWS,
    original,
    defaultCostModelFromPayroll(),
  );
  const adaptedEngine = aggregateCatalogDirectCost(
    SAMPLE_ROWS,
    adapted,
    defaultCostModelFromPayroll(),
  );

  assertNear(
    legacyEngine.totals.direct,
    adaptedEngine.totals.direct,
    EPSILON,
    `${region} engine totals.direct`,
  );
  assertNear(
    legacyEngine.totals.material,
    adaptedEngine.totals.material,
    EPSILON,
    `${region} engine totals.material`,
  );
  assertNear(
    legacyEngine.totals.labor,
    adaptedEngine.totals.labor,
    EPSILON,
    `${region} engine totals.labor`,
  );
  assertEq(legacyEngine.rowCount, adaptedEngine.rowCount, `${region} engine rowCount`);
}

const frozenStore = JSON.parse(JSON.stringify(workStore));
buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw");
assert(JSON.stringify(workStore) === JSON.stringify(frozenStore), "adapter does not mutate work store");

const malowanieRate = getCategoryRate(
  buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw"),
  "MALOWANIE",
  "m2",
);
assertNear(malowanieRate.materialPlnPerUnit, 8, EPSILON, "MALOWANIE m2 material base wroclaw");
assertNear(malowanieRate.laborRbhPerUnit, 0.16, EPSILON, "MALOWANIE m2 labor rbh");

for (const categoryId of WGDOM_COST_CATEGORY_IDS) {
  const adapted = buildLegacyCostCatalogFromWorkStore(workStore, "wroclaw");
  const def = adapted.categories.find((c) => c.id === categoryId);
  assert(def != null, `category ${categoryId} present`);
  assert(def.keywords.length > 0, `category ${categoryId} has keywords`);
}

console.log(`\nP1.6 work-catalog engine adapter: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
