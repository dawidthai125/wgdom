/**
 * P2.4 — persist: bulk patch + saveWorkCatalogStoreLocal + reload.
 * Run: npx vite-node scripts/test-work-catalog-bulk-price-persist-p2.4.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  WORK_CATALOG_STORAGE_KEY,
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  applyBulkPriceOperation,
  patchBulkCompanyPricesInStore,
} from "../src/app/work-catalog/work-catalog-bulk-price.ts";

const SAVE_AT = "2026-06-28T18:30:00.000Z";
const NOW_MS = Date.parse(SAVE_AT);

const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
);

const { store: seedStore } = migrateLegacyCostCatalogStoreToWorkCatalog(
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

const workA = seedStore.catalogs.wroclaw.works[0];
const workB = seedStore.catalogs.wroclaw.works[1];
assert(Boolean(workA) && Boolean(workB), "seed works");

saveWorkCatalogStoreLocal(seedStore, { updatedAtIso: seedStore.updatedAt });

const priceMap = {
  [workA.id]: applyBulkPriceOperation(workA.companyPricePln, { kind: "percent_add", value: 8 }),
  [workB.id]: applyBulkPriceOperation(workB.companyPricePln, { kind: "amount_add", value: 2 }),
};

const patched = patchBulkCompanyPricesInStore(seedStore, priceMap, SAVE_AT, NOW_MS);
assert(patched != null && patched.updatedIds.length === 2, "bulk patch");

saveWorkCatalogStoreLocal(patched.store, { updatedAtIso: SAVE_AT });
assert(storage.has(WORK_CATALOG_STORAGE_KEY), "localStorage written");

const reloaded = loadWorkCatalogStoreLocal();
const reA = getWorkByIdFromStore(reloaded, workA.id);
const reB = getWorkByIdFromStore(reloaded, workB.id);
assert(reA?.companyPricePln === priceMap[workA.id], "reload work A");
assert(reB?.companyPricePln === priceMap[workB.id], "reload work B");
assert(reA?.updatedAt === SAVE_AT, "reload updatedAt A");

console.log(`\nP2.4 bulk persist: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
