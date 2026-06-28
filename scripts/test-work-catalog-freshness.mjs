/**
 * P1.2 — freshness + catalog-work-utils (pure).
 * npx vite-node scripts/test-work-catalog-freshness.mjs
 */
import {
  WORK_FRESHNESS_STALE_AFTER_DAYS,
  deriveFreshnessStatus,
  isCompanyPricePresent,
  parseWorkUpdatedAtMs,
  withFreshnessStatus,
  workFreshnessStaleAfterMs,
} from "../src/lib/work-catalog/freshness.ts";
import {
  countActiveWorks,
  getWorkById,
  getWorkByIdFromStore,
  indexWorksById,
  listActiveWorks,
  listActiveWorksByTradeId,
  listActiveWorksForRegion,
  listWorksByTradeId,
  listWorksForRegion,
} from "../src/lib/work-catalog/catalog-work-utils.ts";

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

const NOW_MS = Date.parse("2026-06-28T12:00:00.000Z");
const RECENT = "2026-06-01T12:00:00.000Z";
const STALE_DATE = "2026-01-01T12:00:00.000Z";
const EXACTLY_90_DAYS_AGO = new Date(NOW_MS - workFreshnessStaleAfterMs()).toISOString();
const JUST_UNDER_90_DAYS = new Date(NOW_MS - workFreshnessStaleAfterMs() + 1000).toISOString();

assertEq(WORK_FRESHNESS_STALE_AFTER_DAYS, 90, "stale window 90 days");

assertEq(deriveFreshnessStatus({ companyPricePln: 39, updatedAt: RECENT }, NOW_MS), "ok", "T1 ok recent");
assertEq(deriveFreshnessStatus({ companyPricePln: 39, updatedAt: STALE_DATE }, NOW_MS), "stale", "T2 stale old");
assertEq(deriveFreshnessStatus({ companyPricePln: 0, updatedAt: RECENT }, NOW_MS), "missing", "T3 missing zero price");
assertEq(deriveFreshnessStatus({ companyPricePln: -5, updatedAt: RECENT }, NOW_MS), "missing", "T4 missing negative");
assertEq(deriveFreshnessStatus({ companyPricePln: 10, updatedAt: "" }, NOW_MS), "stale", "T5 stale invalid date");
assertEq(
  deriveFreshnessStatus({ companyPricePln: 10, updatedAt: EXACTLY_90_DAYS_AGO }, NOW_MS),
  "stale",
  "T6 boundary exactly 90 days = stale",
);
assertEq(
  deriveFreshnessStatus({ companyPricePln: 10, updatedAt: JUST_UNDER_90_DAYS }, NOW_MS),
  "ok",
  "T7 just under 90 days = ok",
);
assertEq(
  deriveFreshnessStatus({ companyPricePln: Number.NaN, updatedAt: RECENT }, NOW_MS),
  "missing",
  "T8 missing NaN price",
);

assert(isCompanyPricePresent(0.01), "isCompanyPricePresent positive");
assert(!isCompanyPricePresent(0), "isCompanyPricePresent zero");
assert(parseWorkUpdatedAtMs(RECENT) != null, "parseWorkUpdatedAtMs valid");
assertEq(parseWorkUpdatedAtMs("not-a-date"), null, "parseWorkUpdatedAtMs invalid");

/** @type {import("../src/lib/work-catalog/types.ts").CatalogWork} */
const baseWork = {
  id: "malowanie-scian-m2",
  tradeId: "MALOWANIE",
  namePl: "Malowanie ścian",
  unit: "m2",
  companyPricePln: 39,
  updatedAt: RECENT,
  freshnessStatus: "missing",
  keywords: [],
  active: true,
  favorite: false,
  usageCount: 0,
  source: "seed",
};

const refreshed = withFreshnessStatus(baseWork, NOW_MS);
assertEq(refreshed.freshnessStatus, "ok", "withFreshnessStatus applies ok");
assert(baseWork.freshnessStatus === "missing", "withFreshnessStatus does not mutate input");

/** @type {import("../src/lib/work-catalog/types.ts").CatalogWork} */
const inactiveWork = { ...baseWork, id: "hidden", active: false };
const otherTrade = { ...baseWork, id: "elektryka-punkt", tradeId: "ELEKTRYKA" };
const works = [baseWork, inactiveWork, otherTrade];

assertEq(getWorkById(works, "malowanie-scian-m2")?.id, "malowanie-scian-m2", "getWorkById hit");
assertEq(getWorkById(works, "brak"), undefined, "getWorkById miss");
assertEq(listActiveWorks(works).length, 2, "listActiveWorks filters inactive");
assertEq(listWorksByTradeId(works, "MALOWANIE").length, 2, "listWorksByTradeId");
assertEq(listActiveWorksByTradeId(works, "MALOWANIE").length, 1, "listActiveWorksByTradeId");
assertEq(countActiveWorks(works), 2, "countActiveWorks");
assertEq(indexWorksById(works).get("hidden")?.id, "hidden", "indexWorksById");

/** @type {import("../src/lib/work-catalog/types.ts").WorkCatalogStore} */
const store = {
  schemaVersion: 3,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: { region: "wroclaw", works, updatedAt: RECENT },
    dolnyslask: { region: "dolnyslask", works: [], updatedAt: RECENT },
  },
  updatedAt: RECENT,
};

assertEq(listWorksForRegion(store).length, 3, "listWorksForRegion active region");
assertEq(listWorksForRegion(store, "dolnyslask").length, 0, "listWorksForRegion dolnyslask");
assertEq(listActiveWorksForRegion(store).length, 2, "listActiveWorksForRegion");
assertEq(getWorkByIdFromStore(store, "elektryka-punkt")?.tradeId, "ELEKTRYKA", "getWorkByIdFromStore");

console.log(`\nP1.2 work-catalog freshness: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
