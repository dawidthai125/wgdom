/**
 * P2.8 — persist: favorite + estimatedDurationDays round-trip.
 * Run: npx vite-node scripts/test-work-catalog-bundles-persist-p2.8.mjs
 */
import {
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  saveWorkBundleStoreLocal,
} from "../src/lib/work-catalog/work-bundle-store.ts";
import { upsertBundleInStore } from "../src/app/work-catalog/work-catalog-bundle.ts";

const SAVE_AT = "2026-07-05T14:30:00.000Z";

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

const empty = defaultWorkBundleStore(SAVE_AT);
const bundle = {
  id: "bundle-persist-p28",
  namePl: "Pakiet P2.8 persist",
  primaryTradeId: "MALOWANIE",
  steps: [{ order: 0, workId: "malowanie-scian-m2", quantityDefault: 8 }],
  estimatedDurationDays: 12,
  active: true,
  favorite: true,
  usageCount: 0,
  updatedAt: SAVE_AT,
  source: "custom",
};

const next = upsertBundleInStore(empty, bundle, SAVE_AT);
saveWorkBundleStoreLocal(next, { updatedAtIso: SAVE_AT });
assert(storage.has(WORK_BUNDLE_STORAGE_KEY), "localStorage key written");

const reloaded = loadWorkBundleStoreLocal();
assert(reloaded.bundles.length === 1, "reload one bundle");
assert(reloaded.bundles[0].favorite === true, "reload favorite");
assert(reloaded.bundles[0].estimatedDurationDays === 12, "reload duration days");

const cleared = upsertBundleInStore(
  empty,
  { ...bundle, estimatedDurationDays: undefined },
  SAVE_AT,
);
saveWorkBundleStoreLocal(cleared, { updatedAtIso: SAVE_AT });
const reloadedClear = loadWorkBundleStoreLocal();
assert(
  reloadedClear.bundles[0].estimatedDurationDays === undefined,
  "undefined duration after clear",
);

console.log(`\nP2.8 bundles persist: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
