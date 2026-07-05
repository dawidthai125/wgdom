/**
 * P2.7 — persist: saveWorkBundleStoreLocal round-trip.
 * Run: npx vite-node scripts/test-work-catalog-bundles-persist-p2.7.mjs
 */
import {
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  saveWorkBundleStoreLocal,
} from "../src/lib/work-catalog/work-bundle-store.ts";
import { upsertBundleInStore } from "../src/app/work-catalog/work-catalog-bundle.ts";

const SAVE_AT = "2026-07-05T12:30:00.000Z";

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
  id: "bundle-persist-1",
  namePl: "Pakiet persist",
  primaryTradeId: "MALOWANIE",
  steps: [
    { order: 0, workId: "malowanie-scian-m2", quantityDefault: 12, notePl: "ściany" },
    { order: 1, workId: "malowanie-scian-m2" },
  ],
  active: true,
  favorite: false,
  usageCount: 0,
  updatedAt: SAVE_AT,
  source: "custom",
};

const next = upsertBundleInStore(empty, bundle, SAVE_AT);
saveWorkBundleStoreLocal(next, { updatedAtIso: SAVE_AT });
assert(storage.has(WORK_BUNDLE_STORAGE_KEY), "localStorage key written");

const reloaded = loadWorkBundleStoreLocal();
assert(reloaded.bundles.length === 1, "reload one bundle");
assert(reloaded.bundles[0].namePl === "Pakiet persist", "reload name");
assert(reloaded.bundles[0].steps.length === 2, "reload duplicate steps");
assert(reloaded.bundles[0].steps[0].quantityDefault === 12, "reload quantity");
assert(reloaded.updatedAt === SAVE_AT, "store updatedAt");

console.log(`\nP2.7 bundles persist: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
