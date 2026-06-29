/**
 * P2.3 — smoke: przełącznik aktywności + domyślny filtr listy.
 * Run: npx vite-node scripts/smoke-test-work-catalog-active-p2.3.mjs
 */
import {
  DEFAULT_WORK_CATALOG_LIST_FILTERS,
  filterWorkCatalogList,
} from "../src/app/work-catalog/work-catalog-list.ts";
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { listWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { patchWorkActiveInStore } from "../src/app/work-catalog/work-catalog-active.ts";

const UPDATED_AT = "2026-06-28T16:00:00.000Z";
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

function makeWork(id, active) {
  return {
    id,
    tradeId: "MALOWANIE",
    namePl: `Robota ${id}`,
    unit: "m2",
    companyPricePln: 10,
    updatedAt: "2026-06-01T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

const works = [
  makeWork("w1", true),
  makeWork("w2", true),
  makeWork("w3", false),
];

console.log("=== WORK CATALOG ACTIVE P2.3 SMOKE ===\n");

assert("default filter is active", DEFAULT_WORK_CATALOG_LIST_FILTERS.active === "active");

const defaultList = filterWorkCatalogList(works, DEFAULT_WORK_CATALOG_LIST_FILTERS);
assert("default list active only", defaultList.length === 2 && defaultList.every((w) => w.active));

const inactiveList = filterWorkCatalogList(works, {
  ...DEFAULT_WORK_CATALOG_LIST_FILTERS,
  active: "inactive",
});
assert("inactive filter", inactiveList.length === 1 && !inactiveList[0].active);

const store = normalizeWorkCatalogStore({
  ...defaultWorkCatalogStoreForPersist(UPDATED_AT),
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      updatedAt: UPDATED_AT,
      works: [makeWork("w-toggle", true)],
    },
    dolnyslask: {
      region: "dolnyslask",
      updatedAt: UPDATED_AT,
      works: [],
    },
  },
});

const deactivated = patchWorkActiveInStore(store, "w-toggle", false, UPDATED_AT, NOW_MS);
assert("patch deactivate", deactivated != null);
const toggled = listWorksForRegion(deactivated).find((w) => w.id === "w-toggle");
assert("active false", toggled?.active === false);
assert("updatedAt set", toggled?.updatedAt === UPDATED_AT);

const same = patchWorkActiveInStore(deactivated, "w-toggle", false, UPDATED_AT, NOW_MS);
assert("no-op same value", same === deactivated);

assert("patch missing id", patchWorkActiveInStore(store, "__missing__", false, UPDATED_AT) === null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
