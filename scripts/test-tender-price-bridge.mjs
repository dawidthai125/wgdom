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
  getActiveCatalog,
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

// T1 — empty work store → legacy fallback
resetStorage();
const legacyStore = seedLegacyStore();
seedWorkStore(defaultWorkCatalogStore(MIGRATED_AT));
const t1 = resolveActiveCatalogForTender();
assertEq(t1.source, "legacy", "T1 source legacy");
assert(t1.isFallback === true, "T1 isFallback true");
assertEq(
  JSON.stringify(t1.catalog.categories.map((c) => c.id)),
  JSON.stringify(getActiveCatalog(legacyStore).categories.map((c) => c.id)),
  "T1 catalog matches legacy getActiveCatalog",
);

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

// T3 — work seed without company prices → legacy
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
assertEq(t3.source, "legacy", "T3 source legacy");
assert(t3.isFallback === true, "T3 isFallback true");
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

// T4 — computeTenderBidProposal with resolver catalog vs legacy direct (legacy path)
resetStorage();
const legacyOnly = seedLegacyStore();
seedWorkStore(defaultWorkCatalogStore(MIGRATED_AT));
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
const { catalog: resolverCatalog } = resolveActiveCatalogForTender();
const bidResolver = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: resolverCatalog,
});
const bidLegacy = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: getActiveCatalog(legacyOnly),
});
assert(bidResolver.ok && bidLegacy.ok, "T4 proposals ok");
if (bidResolver.ok && bidLegacy.ok) {
  assertEq(bidResolver.pricingMode, bidLegacy.pricingMode, "T4 pricingMode parity");
  assertEq(bidResolver.costPricePln, bidLegacy.costPricePln, "T4 costPricePln parity on legacy path");
}

// T5 — overrides parity on legacy path
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
  catalog: resolverCatalog,
  priceOverrides: laborOverride,
});
const bidLegacyOv = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: getActiveCatalog(legacyOnly),
  priceOverrides: laborOverride,
});
assert(bidResolverOv.ok && bidLegacyOv.ok, "T5 proposals ok");
if (bidResolverOv.ok && bidLegacyOv.ok) {
  assertEq(bidResolverOv.costPricePln, bidLegacyOv.costPricePln, "T5 override cost parity");
}

console.log(`\nPRICE-BRIDGE: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
