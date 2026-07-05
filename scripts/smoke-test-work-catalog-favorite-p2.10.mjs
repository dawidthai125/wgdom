/**
 * P2.10 — smoke: ulubione roboty (filtr, sort, patch store, licznik).
 * Run: npx vite-node scripts/smoke-test-work-catalog-favorite-p2.10.mjs
 */
import {
  DEFAULT_WORK_CATALOG_LIST_FILTERS,
  countFilteredWorkCatalogList,
  countWorkCatalogList,
  filterWorkCatalogList,
  sortWorkCatalogWorksForDisplay,
} from "../src/app/work-catalog/work-catalog-list.ts";
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { patchWorkFavoriteInStore } from "../src/app/work-catalog/work-catalog-favorite.ts";

const UPDATED_AT = "2026-07-05T18:00:00.000Z";
const NOW_MS = Date.parse(UPDATED_AT);

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

function makeWork(id, tradeId, namePl, active, favorite = false) {
  return {
    id,
    tradeId,
    namePl,
    unit: "m2",
    companyPricePln: 10,
    updatedAt: "2026-06-01T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active,
    favorite,
    usageCount: 0,
    source: "custom",
  };
}

const works = [
  makeWork("w1", "MALOWANIE", "Malowanie A", true, false),
  makeWork("w2", "ELEKTRYKA", "Punkt gniazdo", true, true),
  makeWork("w3", "MALOWANIE", "Malowanie B", true, false),
  makeWork("w4", "LAZIENKA", "Płytki", false, true),
];

console.log("=== WORK CATALOG FAVORITE P2.10 SMOKE ===\n");

assert("default favorite filter is all", DEFAULT_WORK_CATALOG_LIST_FILTERS.favorite === "all");

const favoritesOnly = filterWorkCatalogList(works, {
  ...DEFAULT_WORK_CATALOG_LIST_FILTERS,
  active: "all",
  favorite: "favorites",
});
assert("favorite filter count", favoritesOnly.length === 2);
assert("favorite filter ids", favoritesOnly.every((w) => w.favorite));

const favoriteAndActive = filterWorkCatalogList(works, {
  ...DEFAULT_WORK_CATALOG_LIST_FILTERS,
  favorite: "favorites",
});
assert("favorite AND active default", favoriteAndActive.length === 1 && favoriteAndActive[0].id === "w2");

const sorted = sortWorkCatalogWorksForDisplay(
  filterWorkCatalogList(works, { ...DEFAULT_WORK_CATALOG_LIST_FILTERS, active: "all" }),
);
assert("favorite-first sort", sorted[0].id === "w2" && sorted[1].id === "w4");

const counts = countWorkCatalogList(works);
assert("favorite counter", counts.favorite === 2);

const filteredCounts = countFilteredWorkCatalogList(works, favoritesOnly);
assert("filtered counter", filteredCounts.filtered === 2 && filteredCounts.favorite === 2);

const store = normalizeWorkCatalogStore({
  ...defaultWorkCatalogStoreForPersist(UPDATED_AT),
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      updatedAt: UPDATED_AT,
      works: [makeWork("w-toggle", "MALOWANIE", "Toggle fav", true, false)],
    },
    dolnyslask: {
      region: "dolnyslask",
      updatedAt: UPDATED_AT,
      works: [],
    },
  },
});

const patched = patchWorkFavoriteInStore(store, "w-toggle", true, UPDATED_AT, NOW_MS);
assert("patch favorite true", patched?.catalogs.wroclaw.works[0].favorite === true);

const noop = patchWorkFavoriteInStore(patched, "w-toggle", true, UPDATED_AT, NOW_MS);
assert("patch favorite noop same ref", noop === patched);

const missing = patchWorkFavoriteInStore(store, "missing-id", true, UPDATED_AT, NOW_MS);
assert("patch missing work null", missing === null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
