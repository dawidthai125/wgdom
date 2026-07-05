/**
 * PB-2b — V4 KPI / Kosztorys PRO parity z resolveActiveCatalogForTender.
 * npx vite-node scripts/test-tender-pb-2b-v4-parity.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";
import { buildCatalogLinePricingView } from "../src/lib/tender-catalog-line-pricing.ts";
import {
  buildKosztorysProDashboard,
} from "../src/lib/tender-kosztorys-pro-dashboard.ts";
import {
  buildKosztorysV4Stats,
  buildWycenaKpiDisplay,
  resolveTenderPricingCatalogForDisplay,
} from "../src/lib/tender-detail-v4-display.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { saveWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  parseSeedManifestYaml,
  SEED_MANIFEST_RELATIVE_PATH,
} from "../src/lib/work-catalog/seed-manifest.ts";

const MIGRATED_AT = "2026-06-29T14:00:00.000Z";
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

function resetStorage() {
  storage.clear();
}

function seedLegacyStore(store = defaultWgdomCostCatalogStore()) {
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(store));
  return store;
}

function seedWorkStore(store) {
  saveWorkCatalogStoreLocal(store);
}

function baseItem(catalogQuantities) {
  return {
    id: "pb2b-t1",
    tenderId: "BZP-PB2B",
    title: "PB-2b parity",
    status: "new",
    isWroclaw: true,
    submittingOffersDate: "2030-12-31T12:00:00.000Z",
    bzpDocuments: [],
    tenderDossier: {
      kosztorys: {
        ok: true,
        source: "ath",
        rowCount: catalogQuantities.length,
        rows: [],
        catalogQuantities,
        totalValue: null,
        currency: "PLN",
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: MIGRATED_AT,
      },
      brief: null,
    },
  };
}

const kosztorysLines = [
  {
    lp: "1",
    description: "Malowanie ścian emulsyjne dwukrotnie",
    unit: "m2",
    quantity: "100",
  },
];

resetStorage();
const legacyStore = seedLegacyStore();
seedWorkStore(defaultWorkCatalogStore(MIGRATED_AT));
const { store: migratedWork } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
resetStorage();
seedLegacyStore(legacyStore);
seedWorkStore(migratedWork);

const item = baseItem(kosztorysLines);
const { catalog: resolverCatalog, costModel } = resolveTenderPricingCatalogForDisplay();
const resolution = resolveActiveCatalogForTender({
  referenceHourlyPln: costModel.avgGrossHourlyPln,
});

assertEq(resolution.source, "work", "T1 resolver source work");
assert(
  JSON.stringify(resolverCatalog.categories.map((c) => c.id))
    === JSON.stringify(resolution.catalog.categories.map((c) => c.id)),
  "T1 display helper uses same catalog categories as resolver",
);

const stats = buildKosztorysV4Stats(item);
const manualView = buildCatalogLinePricingView(
  kosztorysLines,
  resolverCatalog,
  costModel,
  [],
);
assert(manualView != null, "T2 manual pricing view ok");
assertEq(
  stats.pricedPositions,
  manualView?.classifiedPositionCount ?? -1,
  "T2 V4 stats pricedPositions parity with resolver catalog",
);
assertEq(stats.catalogSourceLabel, "Biblioteka Robót", "T2 catalogSourceLabel work");

const seedView = buildCatalogLinePricingView(
  kosztorysLines,
  defaultWgdomCostCatalog(),
  costModel,
  [],
);
const seedDiffers = (seedView?.classifiedDirectTotalPln ?? 0) !== (manualView?.classifiedDirectTotalPln ?? 0)
  || stats.pricedPositions !== (seedView?.classifiedPositionCount ?? -1);
assert(seedDiffers || stats.pricedPositions > 0, "T3 V4 stats not silently using static seed defaults");

const pro = buildKosztorysProDashboard(item);
assertEq(pro.priced, stats.pricedPositions, "T4 PRO dashboard priced parity with V4 stats");
assertEq(pro.coveragePct, stats.athPositions > 0
  ? Math.round((stats.pricedPositions / stats.athPositions) * 100)
  : null, "T4 PRO coverage parity");

const wycenaKpi = buildWycenaKpiDisplay(item);
assertEq(wycenaKpi.catalogSourceLabel, "Biblioteka Robót", "T5 Wycena KPI source label work");

resetStorage();
seedLegacyStore();
seedWorkStore(defaultWorkCatalogStore(MIGRATED_AT));
const legacyStats = buildKosztorysV4Stats(item);
assertEq(legacyStats.catalogSourceLabel, "Biblioteka Robót", "T6 work-only source label (legacy KV ignored)");

const costModelCalc = defaultCostModelFromPayroll();
const kosztorys = item.tenderDossier.kosztorys;
const bidDefault = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel: costModelCalc,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
});
const bidExplicit = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel: costModelCalc,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: resolveActiveCatalogForTender({
    referenceHourlyPln: costModelCalc.avgGrossHourlyPln,
  }).catalog,
});
assert(bidDefault.ok && bidExplicit.ok, "T7 calculator default path ok");
if (bidDefault.ok && bidExplicit.ok) {
  assertEq(bidDefault.costPricePln, bidExplicit.costPricePln, "T7 calculator default uses resolver catalog");
}

console.log(`\nPB-2b V4 PARITY: ${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
