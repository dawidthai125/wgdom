/**
 * P2.1 — smoke UI: filtrowanie listy Biblioteki Robót (pure, bez przeglądarki).
 * Run: npx vite-node scripts/smoke-test-work-catalog-ui-p2.1.mjs
 */
import {
  DEFAULT_WORK_CATALOG_LIST_FILTERS,
  countFilteredWorkCatalogList,
  filterWorkCatalogList,
  workCatalogUnitLabelPl,
} from "../src/app/work-catalog/work-catalog-list.ts";
import { tradeLabelPl } from "../src/lib/work-catalog/trades.ts";

function makeWork(id, tradeId, namePl, active) {
  return {
    id,
    tradeId,
    namePl,
    unit: "m2",
    companyPricePln: 0,
    updatedAt: "2026-06-28T00:00:00.000Z",
    freshnessStatus: "missing",
    keywords: ["test"],
    active,
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

const works = [
  makeWork("w1", "MALOWANIE", "Malowanie ścian", true),
  makeWork("w2", "ELEKTRYKA", "Punkt gniazdo", true),
  makeWork("w3", "MALOWANIE", "Szpachlowanie", false),
];

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

console.log("=== WORK CATALOG UI P2.1 SMOKE ===\n");

assert("unit label m2", workCatalogUnitLabelPl("m2") === "m²");
assert("trade label", tradeLabelPl("MALOWANIE") === "Malowanie");

const all = filterWorkCatalogList(works, DEFAULT_WORK_CATALOG_LIST_FILTERS);
assert("default filter count (active only)", all.length === 2);
assert("sort by trade then name", all[0].tradeId === "ELEKTRYKA");

const allWorks = filterWorkCatalogList(works, { ...DEFAULT_WORK_CATALOG_LIST_FILTERS, active: "all" });
assert("all filter count", allWorks.length === 3);

const activeOnly = filterWorkCatalogList(works, { ...DEFAULT_WORK_CATALOG_LIST_FILTERS, active: "active" });
assert("active filter", activeOnly.length === 2 && activeOnly.every((w) => w.active));

const tradeOnly = filterWorkCatalogList(works, { ...DEFAULT_WORK_CATALOG_LIST_FILTERS, active: "all", tradeId: "MALOWANIE" });
assert("trade filter", tradeOnly.length === 2);

const search = filterWorkCatalogList(works, { ...DEFAULT_WORK_CATALOG_LIST_FILTERS, active: "all", search: "gniazdo" });
assert("search filter", search.length === 1 && search[0].id === "w2");

const counts = countFilteredWorkCatalogList(works, search);
assert("counter filtered", counts.filtered === 1 && counts.total === 3);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
