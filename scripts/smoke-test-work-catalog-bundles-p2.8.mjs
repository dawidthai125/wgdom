/**
 * P2.8 — smoke: walidacja zapisu, ulubione, szacowany czas (app layer pure).
 * Run: npx vite-node scripts/smoke-test-work-catalog-bundles-p2.8.mjs
 */
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkBundleStore } from "../src/lib/work-catalog/work-bundle-store.ts";
import {
  addStepToBundle,
  createEmptyBundleDraft,
  patchBundleFavoriteInStore,
  upsertBundleInStore,
  validateBundleEstimatedDurationDays,
  validateBundleForSave,
  normalizeBundleEstimatedDurationDays,
} from "../src/app/work-catalog/work-catalog-bundle.ts";
import {
  filterWorkCatalogBundleList,
  sortWorkCatalogBundlesForDisplay,
} from "../src/app/work-catalog/work-catalog-bundle-list.ts";

const SAVE_AT = "2026-07-05T14:00:00.000Z";
const WORK_ID_A = "malowanie-scian-m2";
const WORK_ID_MISSING = "missing-work-id";

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

console.log("=== WORK CATALOG BUNDLES P2.8 SMOKE ===\n");

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
          namePl: "Malowanie ścian",
          unit: "m2",
          companyPricePln: 10,
          updatedAt: SAVE_AT,
          keywords: [],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "custom",
        },
      ],
    },
    dolnyslask: { region: "dolnyslask", updatedAt: SAVE_AT, works: [] },
  },
});

const draft = createEmptyBundleDraft("LAZIENKA", SAVE_AT);
draft.namePl = "Pakiet P2.8";

assert("validate no steps fails", validateBundleForSave(draft, catalogStore).ok === false);

let withStep = addStepToBundle(draft, WORK_ID_A, SAVE_AT);
assert(
  "validate with valid workId passes",
  validateBundleForSave(withStep, catalogStore).ok === true,
);

let badWork = addStepToBundle({ ...draft, steps: [] }, WORK_ID_MISSING, SAVE_AT);
assert(
  "validate invalid workId fails",
  validateBundleForSave(badWork, catalogStore).ok === false,
);

assert(
  "duration empty ok",
  validateBundleEstimatedDurationDays(undefined).ok === true,
);
assert("duration 3 ok", validateBundleEstimatedDurationDays(3).ok === true);
assert("duration 0 fails", validateBundleEstimatedDurationDays(0).ok === false);
assert("duration 1.5 fails", validateBundleEstimatedDurationDays(1.5).ok === false);

withStep = { ...withStep, estimatedDurationDays: 5 };
assert(
  "validate with duration passes",
  validateBundleForSave(withStep, catalogStore).ok === true,
);
assert(
  "normalize duration strips invalid",
  normalizeBundleEstimatedDurationDays(0) === undefined,
);
assert(
  "normalize duration keeps valid",
  normalizeBundleEstimatedDurationDays(7) === 7,
);

let store = defaultWorkBundleStore(SAVE_AT);
store = upsertBundleInStore(store, withStep, SAVE_AT);
store = patchBundleFavoriteInStore(store, withStep.id, true, SAVE_AT);
assert("favorite patch sets true", store.bundles[0].favorite === true);

const bundleB = {
  ...withStep,
  id: "bundle-b",
  namePl: "Beta pakiet",
  favorite: false,
  steps: [{ order: 0, workId: WORK_ID_A }],
};
store = upsertBundleInStore(store, bundleB, SAVE_AT);

const sorted = sortWorkCatalogBundlesForDisplay(store.bundles);
assert("favorite first sort", sorted[0].id === withStep.id);
assert(
  "filter preserves favorite sort",
  filterWorkCatalogBundleList(store.bundles, {
    search: "",
    tradeId: "all",
    active: "all",
    favorite: "all",
  })[0].favorite === true,
);

console.log(`\nP2.8 bundles smoke: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
