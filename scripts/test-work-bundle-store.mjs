/**
 * P1.8 — WorkBundleStore local persist (normalize · merge · load · save).
 * npx vite-node scripts/test-work-bundle-store.mjs
 */
import {
  WORK_BUNDLE_DEFAULT_UPDATED_AT,
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  mergeWorkBundleStore,
  normalizeWorkBundleStore,
  saveWorkBundleStoreLocal,
} from "../src/lib/work-catalog/work-bundle-store.ts";
import { WORK_BUNDLE_SCHEMA_VERSION } from "../src/lib/work-catalog/types.ts";

const OLD_TS = "2026-06-01T00:00:00.000Z";
const NEW_TS = "2026-06-20T00:00:00.000Z";
const SAVE_TS = "2026-06-28T12:00:00.000Z";

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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const empty = defaultWorkBundleStore();
assertEq(empty.schemaVersion, WORK_BUNDLE_SCHEMA_VERSION, "default schema v3");
assertEq(empty.bundles.length, 0, "default bundles empty");
assertEq(empty.updatedAt, WORK_BUNDLE_DEFAULT_UPDATED_AT, "default updatedAt constant");

assertEq(normalizeWorkBundleStore(null).bundles.length, 0, "null → empty bundles");
assertEq(normalizeWorkBundleStore({ schemaVersion: 1 }).schemaVersion, WORK_BUNDLE_SCHEMA_VERSION, "force schema v3");

const sampleBundle = {
  id: "bundle-lazienka-mvp",
  namePl: "Łazienka MVP",
  primaryTradeId: "LAZIENKA",
  steps: [
    { order: 2, workId: "legacy-glazura-m2", quantityDefault: 1 },
    { order: 1, workId: "legacy-hydraulika-szt", notePl: "Montaż" },
    { order: 99, workId: "" },
  ],
  active: true,
  favorite: false,
  usageCount: 0,
  updatedAt: SAVE_TS,
  source: "custom",
};

const invalidBundleStore = {
  schemaVersion: 3,
  updatedAt: SAVE_TS,
  bundles: [
    { id: "", namePl: "", primaryTradeId: "NOPE", steps: [{ order: -1, workId: "" }] },
    sampleBundle,
    { ...sampleBundle, namePl: "Duplikat", id: "bundle-lazienka-mvp" },
  ],
};

const normalized = normalizeWorkBundleStore(invalidBundleStore);
assertEq(normalized.bundles.length, 1, "normalize drops invalid + duplicate bundle ids");
assertEq(normalized.bundles[0].id, "bundle-lazienka-mvp", "normalize keeps valid bundle");
assertEq(normalized.bundles[0].steps.length, 2, "normalize drops invalid steps");
assertEq(normalized.bundles[0].steps[0].order, 1, "steps sorted by order");
assertEq(normalized.bundles[0].steps[0].workId, "legacy-hydraulika-szt", "first step workId");

const localOlder = normalizeWorkBundleStore({ ...empty, updatedAt: OLD_TS });
const cloudNewer = normalizeWorkBundleStore({
  ...empty,
  updatedAt: NEW_TS,
  bundles: [
    {
      id: "cloud-only",
      namePl: "Cloud bundle",
      primaryTradeId: "MALOWANIE",
      steps: [],
      active: true,
      favorite: false,
      usageCount: 0,
      updatedAt: NEW_TS,
      source: "seed",
    },
  ],
});

const mergedCloud = mergeWorkBundleStore(localOlder, cloudNewer);
assertEq(mergedCloud.updatedAt, NEW_TS, "LWW cloud newer wins");
assertEq(mergedCloud.bundles.length, 1, "LWW cloud bundles preserved");
assertEq(mergedCloud.bundles[0].id, "cloud-only", "LWW cloud bundle id");

const localNewer = normalizeWorkBundleStore({ ...cloudNewer, updatedAt: "2026-06-25T00:00:00.000Z" });
const mergedLocal = mergeWorkBundleStore(localNewer, cloudNewer);
assertEq(mergedLocal.updatedAt, "2026-06-25T00:00:00.000Z", "LWW local newer wins");

storage.clear();
assertEq(loadWorkBundleStoreLocal().bundles.length, 0, "load empty → default empty store");

const storeToSave = normalizeWorkBundleStore({
  schemaVersion: WORK_BUNDLE_SCHEMA_VERSION,
  updatedAt: SAVE_TS,
  bundles: [sampleBundle],
});
const frozenInput = JSON.parse(JSON.stringify(storeToSave));
saveWorkBundleStoreLocal(storeToSave, { updatedAtIso: SAVE_TS });
assert(storage.has(WORK_BUNDLE_STORAGE_KEY), "save writes storage key");

const loaded = loadWorkBundleStoreLocal();
assert(deepEqual(loaded, normalizeWorkBundleStore(storeToSave)), "save/load round-trip");
assert(deepEqual(storeToSave, frozenInput), "save does not mutate input store");

storage.clear();
localStorage.setItem(WORK_BUNDLE_STORAGE_KEY, "{broken");
const loadedBroken = loadWorkBundleStoreLocal();
assertEq(loadedBroken.schemaVersion, WORK_BUNDLE_SCHEMA_VERSION, "broken JSON → default");

storage.clear();
localStorage.setItem(WORK_BUNDLE_STORAGE_KEY, JSON.stringify(storeToSave));
const frozenStorage = localStorage.getItem(WORK_BUNDLE_STORAGE_KEY);
loadWorkBundleStoreLocal();
assertEq(localStorage.getItem(WORK_BUNDLE_STORAGE_KEY), frozenStorage, "load does not mutate storage");

assertEq(WORK_BUNDLE_STORAGE_KEY, "kw-wgdom-work-bundles", "storage key SSOT");

console.log(`\nP1.8 work-bundle store: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
