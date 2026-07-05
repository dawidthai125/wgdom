/**
 * Bundle #5C-1 — resolver contract: work-only read SSOT, zero legacy in resolver.
 * npx vite-node scripts/test-tender-read-ssot-work-only-5c1.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWgdomCostCatalog, defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  getActiveCatalog,
  WGDOM_COST_CATALOG_KEY,
} from "../src/lib/wgdom-cost-catalog-store.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import { resolveTenderPricingCatalogForDisplay } from "../src/lib/tender-detail-v4-display.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  createEmptyWorkCatalogStore,
  defaultWorkCatalogStore,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { resolveCatalogForEngine } from "../src/lib/work-catalog/work-catalog-compat.ts";
import { saveWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  parseSeedManifestYaml,
  SEED_MANIFEST_RELATIVE_PATH,
} from "../src/lib/work-catalog/seed-manifest.ts";

const MIGRATED_AT = "2026-06-29T12:00:00.000Z";
const NOW_MS = Date.parse(MIGRATED_AT);
const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
);
const resolverSource = readFileSync(
  resolve(root, "src/lib/tender-active-catalog.ts"),
  "utf8",
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

function resetStorage() {
  storage.clear();
}

function seedLegacyStore(store = defaultWgdomCostCatalogStore()) {
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(store));
  return store;
}

// W1 — resolver source: no legacy store import or call
assert(
  !resolverSource.includes("loadWgdomCostCatalogStoreLocal"),
  "W1 resolver has no loadWgdomCostCatalogStoreLocal",
);
assert(
  !resolverSource.includes("wgdom-cost-catalog-store"),
  "W1 resolver has no wgdom-cost-catalog-store import",
);

// W2 — empty work + rich legacy → still work source
resetStorage();
const legacyStore = seedLegacyStore();
const emptyWork = defaultWorkCatalogStore(MIGRATED_AT);
saveWorkCatalogStoreLocal(emptyWork);
const w2 = resolveActiveCatalogForTender();
assertEq(w2.source, "work", "W2 source work");
assert(w2.isFallback === false, "W2 isFallback false");

// W3 — pricedActiveWorkCount=0 does not gate legacy
resetStorage();
seedLegacyStore();
const { store: migratedWork } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
const workNoPrices = {
  ...migratedWork,
  catalogs: {
    ...migratedWork.catalogs,
    wroclaw: {
      ...migratedWork.catalogs.wroclaw,
      works: migratedWork.catalogs.wroclaw.works.map((w) => ({
        ...w,
        companyPricePln: 0,
        freshnessStatus: "missing",
      })),
      updatedAt: MIGRATED_AT,
    },
  },
  updatedAt: MIGRATED_AT,
};
saveWorkCatalogStoreLocal(workNoPrices);
const w3 = resolveActiveCatalogForTender();
assertEq(w3.source, "work", "W3 source work with zero priced works");
assertEq(w3.pricedActiveWorkCount, 0, "W3 pricedActiveWorkCount diagnostic 0");
assert(w3.isFallback === false, "W3 isFallback false");

// W4 — legacy mutation does not affect resolver output
resetStorage();
seedLegacyStore();
saveWorkCatalogStoreLocal(emptyWork);
const before = resolveActiveCatalogForTender();
const mutatedLegacy = {
  ...legacyStore,
  catalogs: {
    ...legacyStore.catalogs,
    wroclaw: {
      ...legacyStore.catalogs.wroclaw,
      categories: legacyStore.catalogs.wroclaw.categories.map((cat) =>
        cat.id === "MALOWANIE"
          ? {
              ...cat,
              rates: cat.rates.map((r) =>
                r.unit === "m2"
                  ? { ...r, materialPlnPerUnit: r.materialPlnPerUnit + 99 }
                  : r,
              ),
            }
          : cat,
      ),
      updatedAt: MIGRATED_AT,
    },
  },
  updatedAt: MIGRATED_AT,
};
localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(mutatedLegacy));
const after = resolveActiveCatalogForTender();
assertEq(
  JSON.stringify(before.catalog),
  JSON.stringify(after.catalog),
  "W4 legacy KV mutation ignored by resolver",
);

// W5 — activeRegion from workStore (not legacy)
resetStorage();
const legacyOtherRegion = {
  ...defaultWgdomCostCatalogStore(),
  activeRegion: "dolnyslask",
};
seedLegacyStore(legacyOtherRegion);
const workWroclaw = { ...emptyWork, activeRegion: "wroclaw" };
saveWorkCatalogStoreLocal(workWroclaw);
const w5 = resolveActiveCatalogForTender();
assertEq(w5.activeRegion, "wroclaw", "W5 activeRegion from workStore");

// W6 — display helper always Biblioteka Robót
resetStorage();
seedLegacyStore();
saveWorkCatalogStoreLocal(emptyWork);
const display = resolveTenderPricingCatalogForDisplay();
assertEq(display.catalogSourceLabel, "Biblioteka Robót", "W6 display label work");
assert(display.isFallback === false, "W6 display isFallback false");

// W7 — priced work store → adapter catalog
resetStorage();
seedLegacyStore();
saveWorkCatalogStoreLocal(migratedWork);
const w7 = resolveActiveCatalogForTender();
const expected =
  resolveCatalogForEngine(migratedWork, { region: w7.activeRegion }) ??
  defaultWgdomCostCatalog(w7.activeRegion);
assert(w7.pricedActiveWorkCount > 0, "W7 pricedActiveWorkCount > 0");
assertEq(
  JSON.stringify(w7.catalog.categories[0]?.rates),
  JSON.stringify(expected.categories[0]?.rates),
  "W7 catalog from work adapter",
);

console.log(`\nREAD-SSOT-WORK-ONLY-5C1: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
