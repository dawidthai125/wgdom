/**
 * Bundle #5C-0A — pricing refresh po zmianie cen Work Catalog (pure propagation).
 * npx vite-node scripts/test-tender-pricing-catalog-revision-5c0a.mjs
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
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { listActiveWorksForRegion } from "../src/lib/work-catalog/index.ts";
import {
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
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

function resetStorage() {
  storage.clear();
}

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

function proposalFromResolver() {
  const { catalog } = resolveActiveCatalogForTender({
    referenceHourlyPln: costModel.avgGrossHourlyPln,
  });
  return computeTenderBidProposal({
    kosztorys,
    swz: null,
    fit: null,
    costModel,
    minProjectDays: 30,
    maxConcurrentProjects: 3,
    catalog,
  });
}

function malowanieM2Rate(catalog) {
  const cat = catalog.categories.find((c) => c.id === "MALOWANIE");
  return cat?.rates.find((r) => r.unit === "m2") ?? null;
}

function bumpMalowanieM2Works(store, companyPricePln) {
  const region = store.activeRegion;
  const works = listActiveWorksForRegion(store, region).map((w) =>
    w.legacyCategoryId === "MALOWANIE" && w.unit === "m2"
      ? { ...w, companyPricePln, updatedAt: MIGRATED_AT }
      : w,
  );
  return {
    ...store,
    catalogs: {
      ...store.catalogs,
      [region]: {
        ...store.catalogs[region],
        works,
        updatedAt: MIGRATED_AT,
      },
    },
    updatedAt: MIGRATED_AT,
  };
}

// T1 — work-first: zmiana ceny w LS → inny katalog i costPricePln (symuluje bump revision + re-read)
resetStorage();
const legacyStore = seedLegacyStore();
const { store: migratedWork } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
saveWorkCatalogStoreLocal(migratedWork, { updatedAtIso: MIGRATED_AT });

const rateBefore = malowanieM2Rate(resolveActiveCatalogForTender().catalog);
assert(rateBefore != null, "T1 MALOWANIE m2 rate exists before");

const before = proposalFromResolver();
assert(before.ok, "T1 before proposal ok");
const costBefore = before.costPricePln;

const nextStore = bumpMalowanieM2Works(migratedWork, 999.99);
saveWorkCatalogStoreLocal(nextStore, { updatedAtIso: MIGRATED_AT });

const rateAfter = malowanieM2Rate(resolveActiveCatalogForTender().catalog);
assert(rateAfter != null, "T1 MALOWANIE m2 rate exists after");
assert(
  rateBefore.materialPlnPerUnit !== rateAfter.materialPlnPerUnit
    || rateBefore.laborRbhPerUnit !== rateAfter.laborRbhPerUnit,
  "T1 resolved MALOWANIE m2 rate changes after work catalog price update",
);

const after = proposalFromResolver();
assert(after.ok, "T1 after proposal ok");
assert(
  after.costPricePln != null && costBefore != null && after.costPricePln !== costBefore,
  "T1 costPricePln changes after work catalog price update",
);

// T2 — deactivate MALOWANIE m2 works zmienia pricedActiveWorkCount lub źródło
resetStorage();
seedLegacyStore();
saveWorkCatalogStoreLocal(migratedWork, { updatedAtIso: MIGRATED_AT });
const countBefore = resolveActiveCatalogForTender().pricedActiveWorkCount;
assert(countBefore > 0, "T2 priced works before deactivate");

const region = migratedWork.activeRegion;
const deactivatedWorks = listActiveWorksForRegion(migratedWork, region).map((w) =>
  w.legacyCategoryId === "MALOWANIE" && w.unit === "m2"
    ? { ...w, active: false, updatedAt: MIGRATED_AT }
    : w,
);
const deactivatedStore = {
  ...migratedWork,
  catalogs: {
    ...migratedWork.catalogs,
    [region]: {
      ...migratedWork.catalogs[region],
      works: deactivatedWorks,
      updatedAt: MIGRATED_AT,
    },
  },
  updatedAt: MIGRATED_AT,
};
saveWorkCatalogStoreLocal(deactivatedStore, { updatedAtIso: MIGRATED_AT });

const resolutionAfter = resolveActiveCatalogForTender();
assert(
  resolutionAfter.pricedActiveWorkCount < countBefore
    || resolutionAfter.source !== "work"
    || malowanieM2Rate(resolutionAfter.catalog)?.materialPlnPerUnit
      !== rateBefore?.materialPlnPerUnit,
  "T2 deactivate MALOWANIE m2 affects pricing inputs",
);

// T3 — legacy fallback path: zmiana legacy rate zmienia proposal (parity z revision contract)
resetStorage();
const legacyOnly = seedLegacyStore();
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT), { updatedAtIso: MIGRATED_AT });
const legacyCatalogBefore = getActiveCatalog(legacyOnly);
const legacyBidBefore = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: legacyCatalogBefore,
});
const legacyMutated = {
  ...legacyOnly,
  catalogs: {
    ...legacyOnly.catalogs,
    wroclaw: {
      ...legacyOnly.catalogs.wroclaw,
      categories: legacyOnly.catalogs.wroclaw.categories.map((cat) =>
        cat.id === "MALOWANIE"
          ? {
              ...cat,
              rates: cat.rates.map((r) =>
                r.unit === "m2"
                  ? { ...r, materialPlnPerUnit: r.materialPlnPerUnit + 25, laborRbhPerUnit: r.laborRbhPerUnit + 1 }
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
const legacyBidAfter = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: getActiveCatalog(legacyMutated),
});
assert(legacyBidBefore.ok && legacyBidAfter.ok, "T3 legacy proposals ok");
if (legacyBidBefore.ok && legacyBidAfter.ok) {
  assert(
    legacyBidAfter.costPricePln !== legacyBidBefore.costPricePln,
    "T3 legacy catalog mutation changes costPricePln",
  );
}

// T4 — pricingCatalogRevision nie jest persystowany (contract)
assert(
  !storage.has("pricingCatalogRevision") && !storage.has("kw-wgdom-pricing-catalog-revision"),
  "T4 pricingCatalogRevision not in localStorage",
);

console.log(`\nPRICING-CATALOG-REVISION-5C0A: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
