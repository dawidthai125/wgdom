/**
 * PRICE-BRIDGE PB-1/PB-2 — resolveActiveCatalogForTender (work-first / legacy-fallback).
 * npx vite-node scripts/test-tender-price-bridge.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  WGDOM_COST_CATALOG_KEY,
} from "../src/lib/wgdom-cost-catalog-store.ts";
import { resolveCatalogForEngine } from "../src/lib/work-catalog/work-catalog-compat.ts";
import {
  listActiveWorksForRegion,
  isCompanyPricePresent,
} from "../src/lib/work-catalog/index.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  createEmptyWorkCatalogStore,
  defaultWorkCatalogStore,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  parseSeedManifestYaml,
  SEED_MANIFEST_RELATIVE_PATH,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";

const MIGRATED_AT = "2026-06-29T12:00:00.000Z";
const NOW_MS = Date.parse(MIGRATED_AT);
const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
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

function seedLegacyStore(store = defaultWgdomCostCatalogStore()) {
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(store));
  return store;
}

function seedWorkStore(store) {
  saveWorkCatalogStoreLocal(store);
}

function resetStorage() {
  storage.clear();
}

// T1 — empty work store → work-only (adapter/seed), legacy KV ignored
resetStorage();
const legacyStore = seedLegacyStore();
const emptyWork = defaultWorkCatalogStore(MIGRATED_AT);
seedWorkStore(emptyWork);
const t1 = resolveActiveCatalogForTender();
assertEq(t1.source, "work", "T1 source work");
assert(t1.isFallback === false, "T1 isFallback false");
const t1Expected =
  resolveCatalogForEngine(emptyWork, { region: t1.activeRegion }) ??
  defaultWgdomCostCatalog(t1.activeRegion);
assertEq(
  JSON.stringify(t1.catalog.categories.map((c) => c.id)),
  JSON.stringify(t1Expected.categories.map((c) => c.id)),
  "T1 catalog matches work adapter or seed template",
);
const t1CatalogBefore = JSON.stringify(t1.catalog);
const legacyMutated = {
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
                  ? { ...r, materialPlnPerUnit: r.materialPlnPerUnit + 77 }
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
localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(legacyMutated));
const t1AfterMutation = resolveActiveCatalogForTender();
assertEq(t1CatalogBefore, JSON.stringify(t1AfterMutation.catalog), "T1 legacy KV mutation ignored");

// T2 — work with priced active → work-first
resetStorage();
seedLegacyStore();
const { store: migratedWork } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
seedWorkStore(migratedWork);
const t2 = resolveActiveCatalogForTender();
assert(t2.pricedActiveWorkCount > 0, "T2 pricedActiveWorkCount > 0");
assertEq(t2.source, "work", "T2 source work");
assert(t2.isFallback === false, "T2 isFallback false");
const t2Expected = resolveCatalogForEngine(migratedWork, { region: t2.activeRegion });
assert(t2Expected != null, "T2 expected catalog from engine");
if (t2Expected) {
  assertEq(
    JSON.stringify(t2.catalog.categories[0]?.rates),
    JSON.stringify(t2Expected.categories[0]?.rates),
    "T2 catalog matches resolveCatalogForEngine(work)",
  );
}

// T3 — work seed without company prices → still work-only
resetStorage();
seedLegacyStore();
const emptyWorks = createEmptyWorkCatalogStore(MIGRATED_AT);
const workNoPrices = {
  ...emptyWorks,
  tradesOrder: migratedWork.tradesOrder,
  seedManifestVersion: migratedWork.seedManifestVersion,
  catalogs: {
    wroclaw: {
      ...emptyWorks.catalogs.wroclaw,
      works: [
        {
          id: "w-zero",
          tradeId: "MALOWANIE",
          namePl: "Bez ceny",
          unit: "m2",
          companyPricePln: 0,
          updatedAt: MIGRATED_AT,
          freshnessStatus: "missing",
          keywords: [],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "custom",
        },
      ],
    },
    dolnyslask: emptyWorks.catalogs.dolnyslask,
  },
};
seedWorkStore(workNoPrices);
const t3 = resolveActiveCatalogForTender();
assertEq(t3.source, "work", "T3 source work");
assert(t3.isFallback === false, "T3 isFallback false");
assertEq(t3.pricedActiveWorkCount, 0, "T3 pricedActiveWorkCount 0");

// T6 — pricedActiveWorkCount matches listActiveWorksForRegion + isCompanyPricePresent
resetStorage();
seedLegacyStore();
seedWorkStore(migratedWork);
const t6 = resolveActiveCatalogForTender();
const manualCount = listActiveWorksForRegion(migratedWork, t6.activeRegion).filter((w) =>
  isCompanyPricePresent(w.companyPricePln),
).length;
assertEq(t6.pricedActiveWorkCount, manualCount, "T6 pricedActiveWorkCount manual parity");

// T4 — computeTenderBidProposal: resolver catalog vs work adapter (work-only path)
resetStorage();
seedLegacyStore();
seedWorkStore(migratedWork);
const costModel = defaultCostModelFromPayroll();
const kosztorys = {
  ok: true,
  source: "ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [
    {
      lp: "1",
      description: "Malowanie ścian emulsyjne dwukrotnie",
      unit: "m2",
      quantity: "100",
    },
  ],
  totalValue: null,
  currency: "PLN",
};
const t4Resolution = resolveActiveCatalogForTender();
const workCatalog =
  resolveCatalogForEngine(migratedWork, { region: t4Resolution.activeRegion }) ??
  defaultWgdomCostCatalog(t4Resolution.activeRegion);
const bidResolver = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: t4Resolution.catalog,
});
const bidWork = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: workCatalog,
});
assert(bidResolver.ok && bidWork.ok, "T4 proposals ok");
if (bidResolver.ok && bidWork.ok) {
  assertEq(bidResolver.pricingMode, bidWork.pricingMode, "T4 pricingMode parity");
  assertEq(bidResolver.costPricePln, bidWork.costPricePln, "T4 costPricePln parity on work path");
}

// T5 — overrides parity on work path
const laborOverride = [{
  categoryId: "MALOWANIE",
  priceType: "labor",
  unit: "m2",
  overridePlnPerUnit: 3,
  updatedAt: MIGRATED_AT,
}];
const bidResolverOv = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: t4Resolution.catalog,
  priceOverrides: laborOverride,
});
const bidWorkOv = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: workCatalog,
  priceOverrides: laborOverride,
});
assert(bidResolverOv.ok && bidWorkOv.ok, "T5 proposals ok");
if (bidResolverOv.ok && bidWorkOv.ok) {
  assertEq(bidResolverOv.costPricePln, bidWorkOv.costPricePln, "T5 override cost parity");
}

console.log(`\nPRICE-BRIDGE: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
