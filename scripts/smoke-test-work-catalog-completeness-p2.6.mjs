/**
 * P2.6 — smoke: kompletność Biblioteki Robót.
 * Run: npx vite-node scripts/smoke-test-work-catalog-completeness-p2.6.mjs
 */
import {
  completenessBand,
  computeLibraryCompleteness,
  computeTradeCompletenessRow,
  isWorkCatalogEntryPriced,
} from "../src/app/work-catalog/work-catalog-completeness.ts";
import { TRADE_IDS } from "../src/lib/work-catalog/trades.ts";

function makeWork(id, tradeId, price) {
  return {
    id,
    tradeId,
    namePl: id,
    unit: "m2",
    companyPricePln: price,
    updatedAt: "2026-06-28T00:00:00.000Z",
    freshnessStatus: price > 0 ? "ok" : "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

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

const works = [
  makeWork("w1", "MALOWANIE", 10),
  makeWork("w2", "MALOWANIE", 0),
  makeWork("w3", "HYDRAULIKA", 5),
  makeWork("w4", "HYDRAULIKA", 0),
  makeWork("w5", "HYDRAULIKA", 0),
];

console.log("=== WORK CATALOG COMPLETENESS P2.6 SMOKE ===\n");

assert("priced when >0", isWorkCatalogEntryPriced(makeWork("a", "MALOWANIE", 1)));
assert("not priced when 0", !isWorkCatalogEntryPriced(makeWork("b", "MALOWANIE", 0)));

assert("band 100 ok", completenessBand(100) === "ok");
assert("band 76 warn", completenessBand(76) === "warn");
assert("band 50 warn edge", completenessBand(50) === "warn");
assert("band 49 alert", completenessBand(49) === "alert");

const mal = computeTradeCompletenessRow("MALOWANIE", works);
assert("trade row counts", mal?.pricedCount === 1 && mal?.totalCount === 2);
assert("trade row percent 50", mal?.percent === 50);

const hyd = computeTradeCompletenessRow("HYDRAULIKA", works);
assert("hydraulika 1/3", hyd?.pricedCount === 1 && hyd?.totalCount === 3);

const summary = computeLibraryCompleteness(works, [...TRADE_IDS]);
assert("library total 5", summary.totalCount === 5);
assert("library priced 2", summary.pricedCount === 2);
assert("library percent 40", summary.percent === 40);
assert("library band alert", summary.band === "alert");
assert("library trades listed", summary.trades.length === 2);

const empty = computeLibraryCompleteness([], [...TRADE_IDS]);
assert("empty percent 0", empty.percent === 0);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
