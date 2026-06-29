/**
 * P2.3 — persist: toggle active + saveWorkCatalogStoreLocal + reload.
 * Run: npx vite-node scripts/test-work-catalog-active-persist-p2.3.mjs
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
import { patchWorkActiveInStore } from "../src/app/work-catalog/work-catalog-active.ts";

const SAVE_AT = "2026-06-28T17:00:00.000Z";
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

const firstWork = seedStore.catalogs.wroclaw.works[0];
assert(Boolean(firstWork), "seed work exists");
assert(firstWork.active === true, "seed work active");

saveWorkCatalogStoreLocal(seedStore, { updatedAtIso: seedStore.updatedAt });

const patched = patchWorkActiveInStore(seedStore, firstWork.id, false, SAVE_AT, NOW_MS);
assert(patched != null, "patch ok");

saveWorkCatalogStoreLocal(patched, { updatedAtIso: SAVE_AT });
assert(storage.has(WORK_CATALOG_STORAGE_KEY), "localStorage key written");

const reloaded = loadWorkCatalogStoreLocal();
const work = getWorkByIdFromStore(reloaded, firstWork.id);
assert(work?.active === false, "reload active false");
assert(work?.updatedAt === SAVE_AT, "reload updatedAt");
assert(reloaded.updatedAt === SAVE_AT, "store updatedAt");

console.log(`\nP2.3 active persist: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
