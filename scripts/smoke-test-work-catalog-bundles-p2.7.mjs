/**
 * P2.7 — smoke: CRUD pakietów robót (app layer pure).
 * Run: npx vite-node scripts/smoke-test-work-catalog-bundles-p2.7.mjs
 */
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkBundleStore, normalizeWorkBundleStore } from "../src/lib/work-catalog/work-bundle-store.ts";
import {
  addStepToBundle,
  createEmptyBundleDraft,
  duplicateBundleInStore,
  removeBundleFromStore,
  reorderBundleStep,
  resolveBundleStepWorkRef,
  upsertBundleInStore,
  validateBundleForSave,
} from "../src/app/work-catalog/work-catalog-bundle.ts";
import {
  DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS,
  filterWorkCatalogBundleList,
} from "../src/app/work-catalog/work-catalog-bundle-list.ts";

const SAVE_AT = "2026-07-05T12:00:00.000Z";
const WORK_ID_A = "malowanie-scian-m2";
const WORK_ID_B = "legacy-hydraulika-szt";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

console.log("=== WORK CATALOG BUNDLES P2.7 SMOKE ===\n");

const emptyStore = defaultWorkBundleStore(SAVE_AT);
const draft = createEmptyBundleDraft("LAZIENKA", SAVE_AT);
draft.id = "bundle-test-1";
draft.namePl = "Łazienka test";

assert("validate empty name fails", validateBundleForSave({ ...draft, namePl: " " }).ok === false);
assert("validate no steps fails", validateBundleForSave(draft).ok === false);

let draftWithStep = addStepToBundle(draft, WORK_ID_A, SAVE_AT);
assert("validate bundle with step ok without catalog", validateBundleForSave(draftWithStep).ok === true);

let store = upsertBundleInStore(emptyStore, draftWithStep, SAVE_AT);
assert("upsert adds bundle", store.bundles.length === 1);

let bundle = store.bundles[0];
bundle = addStepToBundle(bundle, WORK_ID_A, SAVE_AT);
assert("duplicate workId in steps allowed", bundle.steps.length === 2);
assert("both steps same workId", bundle.steps.every((s) => s.workId === WORK_ID_A));

bundle = addStepToBundle(bundle, WORK_ID_B, SAVE_AT);
store = upsertBundleInStore(store, bundle, SAVE_AT);

const reordered = reorderBundleStep(bundle, 2, "up", SAVE_AT);
assert("reorder up changes order", reordered.steps[1].workId === WORK_ID_B);

const reorderedDown = reorderBundleStep(reordered, 0, "down", SAVE_AT);
assert("reorder down", reorderedDown.steps[0].order === 0);

const duplicated = duplicateBundleInStore(store, "bundle-test-1", SAVE_AT);
assert("duplicate creates second bundle", duplicated?.store.bundles.length === 2);
assert(
  "duplicate name suffix",
  duplicated?.store.bundles[1].namePl === "Łazienka test (kopia)",
);

store = removeBundleFromStore(duplicated.store, "bundle-test-1", SAVE_AT);
assert("remove drops bundle", store.bundles.length === 1);

const catalogStore = normalizeWorkCatalogStore({
  ...defaultWorkCatalogStoreForPersist(SAVE_AT),
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      updatedAt: SAVE_AT,
      works: [
        {
          id: WORK_ID_A,
          tradeId: "MALOWANIE",
          namePl: "Malowanie",
          unit: "m2",
          companyPricePln: 10,
          updatedAt: SAVE_AT,
          keywords: [],
          active: false,
          favorite: false,
          usageCount: 0,
          source: "custom",
        },
      ],
    },
    dolnyslask: { region: "dolnyslask", updatedAt: SAVE_AT, works: [] },
  },
});

const inactiveRef = resolveBundleStepWorkRef(catalogStore, WORK_ID_A);
assert("inactive work warning", inactiveRef.ok === true && Boolean(inactiveRef.warning));

const missingRef = resolveBundleStepWorkRef(catalogStore, "missing-work");
assert("missing work ref", missingRef.ok === false);

const bundles = [
  { ...draft, id: "b1", active: true },
  { ...draft, id: "b2", namePl: "Inny", active: false },
];
const activeOnly = filterWorkCatalogBundleList(bundles, DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS);
assert("default bundle filter active", activeOnly.length === 1);

assert(
  "normalize round-trip",
  normalizeWorkBundleStore(store).bundles.length === store.bundles.length,
);

console.log(`\nP2.7 bundles smoke: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
