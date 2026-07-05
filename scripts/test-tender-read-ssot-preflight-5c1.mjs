/**
 * Bundle #5C-1 — preflight gate: prod-like fixture readiness for work-only read SSOT.
 * npx vite-node scripts/test-tender-read-ssot-preflight-5c1.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import {
  isCompanyPricePresent,
  listActiveWorksForRegion,
} from "../src/lib/work-catalog/index.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
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

// Prod-like fixture: PB-3 migrate + legacy KV still present (ignored by resolver)
storage.clear();
const legacyStore = defaultWgdomCostCatalogStore();
localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(legacyStore));
const { store: migratedWork } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
saveWorkCatalogStoreLocal(migratedWork);

const regions = ["wroclaw", "dolnyslask"];
const pricedByRegion = {};
for (const region of regions) {
  const count = listActiveWorksForRegion(migratedWork, region).filter((w) =>
    isCompanyPricePresent(w.companyPricePln),
  ).length;
  pricedByRegion[region] = count;
  console.log(`PREFLIGHT pricedActiveWorkCount ${region}: ${count}`);
}

// P1 — both regions have priced active works on prod-like fixture
assert(pricedByRegion.wroclaw > 0, "P1 wroclaw pricedActiveWorkCount > 0");
assert(pricedByRegion.dolnyslask > 0, "P1 dolnyslask pricedActiveWorkCount > 0");

const resolution = resolveActiveCatalogForTender();
assertEq(resolution.source, "work", "P2 resolver source work");
assert(resolution.isFallback === false, "P2 isFallback false");
assert(resolution.pricedActiveWorkCount > 0, "P2 active region pricedActiveWorkCount > 0");

const costModel = defaultCostModelFromPayroll();
const bid = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog: resolution.catalog,
});
assert(bid.ok === true, "P3 golden tender proposal ok");
assert(bid.costPricePln != null && bid.costPricePln > 0, "P3 costPricePln positive");

// P4 — repeat resolve stable (work-only idempotent)
const resolution2 = resolveActiveCatalogForTender();
assertEq(
  JSON.stringify(resolution.catalog),
  JSON.stringify(resolution2.catalog),
  "P4 resolver catalog stable across calls",
);

const verdict =
  pricedByRegion.wroclaw > 0 && pricedByRegion.dolnyslask > 0 ? "READY" : "NOT_READY";
console.log(`PREFLIGHT VERDICT: ${verdict}`);
assertEq(verdict, "READY", "P5 preflight verdict READY on prod-like fixture");

console.log(`\nREAD-SSOT-PREFLIGHT-5C1: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
