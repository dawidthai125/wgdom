/**
 * P2.9 — smoke: filtr ulubione, badge kroków, licznik ulubionych (app layer pure).
 * Run: npx vite-node scripts/smoke-test-work-catalog-bundles-p2.9.mjs
 */
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  addStepToBundle,
  createEmptyBundleDraft,
  summarizeBundleStepHealth,
} from "../src/app/work-catalog/work-catalog-bundle.ts";
import {
  countWorkCatalogBundleList,
  filterWorkCatalogBundleList,
  sortWorkCatalogBundlesForDisplay,
} from "../src/app/work-catalog/work-catalog-bundle-list.ts";

const SAVE_AT = "2026-07-05T16:00:00.000Z";
const WORK_ID_A = "malowanie-scian-m2";
const WORK_ID_MISSING = "missing-work-id";
const WORK_ID_INACTIVE = "malowanie-inactive-m2";

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

console.log("=== WORK CATALOG BUNDLES P2.9 SMOKE ===\n");

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
        {
          id: WORK_ID_INACTIVE,
          tradeId: "MALOWANIE",
          namePl: "Malowanie nieaktywne",
          unit: "m2",
          companyPricePln: 8,
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

const favoriteActive = {
  id: "bundle-fav-active",
  namePl: "Ulubiony aktywny",
  primaryTradeId: "MALOWANIE",
  steps: [{ order: 0, workId: WORK_ID_A }],
  active: true,
  favorite: true,
  usageCount: 0,
  updatedAt: SAVE_AT,
  source: "custom",
};

const favoriteInactive = {
  id: "bundle-fav-inactive",
  namePl: "Ulubiony nieaktywny",
  primaryTradeId: "LAZIENKA",
  steps: [{ order: 0, workId: WORK_ID_A }],
  active: false,
  favorite: true,
  usageCount: 0,
  updatedAt: SAVE_AT,
  source: "custom",
};

const notFavorite = {
  id: "bundle-plain",
  namePl: "Zwykły pakiet",
  primaryTradeId: "MALOWANIE",
  steps: [{ order: 0, workId: WORK_ID_A }],
  active: true,
  favorite: false,
  usageCount: 0,
  updatedAt: SAVE_AT,
  source: "custom",
};

const bundles = [favoriteActive, favoriteInactive, notFavorite];

const favoritesOnly = filterWorkCatalogBundleList(bundles, {
  search: "",
  tradeId: "all",
  active: "all",
  favorite: "favorites",
});
assert("favorite filter returns only favorites", favoritesOnly.length === 2);
assert(
  "favorite filter AND active excludes inactive favorite",
  filterWorkCatalogBundleList(bundles, {
    search: "",
    tradeId: "all",
    active: "active",
    favorite: "favorites",
  }).length === 1,
);
assert(
  "favorite filter AND trade",
  filterWorkCatalogBundleList(bundles, {
    search: "",
    tradeId: "LAZIENKA",
    active: "all",
    favorite: "favorites",
  }).length === 1,
);

const counts = countWorkCatalogBundleList(bundles);
assert("favorite count in list counts", counts.favorite === 2);

const validDraft = addStepToBundle(createEmptyBundleDraft("MALOWANIE", SAVE_AT), WORK_ID_A, SAVE_AT);
validDraft.namePl = "OK";
const validHealth = summarizeBundleStepHealth(validDraft, catalogStore);
assert("valid step health zero issues", validHealth.orphanCount === 0 && validHealth.inactiveCount === 0);

const missingWork = addStepToBundle(createEmptyBundleDraft("MALOWANIE", SAVE_AT), WORK_ID_MISSING, SAVE_AT);
const orphanHealth = summarizeBundleStepHealth(missingWork, catalogStore);
assert("missing workId in catalog is orphan", orphanHealth.orphanCount === 1);

const inactiveWork = addStepToBundle(createEmptyBundleDraft("MALOWANIE", SAVE_AT), WORK_ID_INACTIVE, SAVE_AT);
const inactiveHealth = summarizeBundleStepHealth(inactiveWork, catalogStore);
assert("inactive work is warning not orphan", inactiveHealth.inactiveCount === 1 && inactiveHealth.orphanCount === 0);

const emptyStepDraft = createEmptyBundleDraft("MALOWANIE", SAVE_AT);
emptyStepDraft.steps = [{ order: 0, workId: "" }];
const emptyStepHealth = summarizeBundleStepHealth(emptyStepDraft, catalogStore);
assert("empty workId is orphan", emptyStepHealth.orphanCount === 1);

const sorted = sortWorkCatalogBundlesForDisplay(bundles);
assert("favorite first sort unchanged", sorted[0].favorite === true);

console.log(`\nP2.9 bundles smoke: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
