/**
 * P1.1 — shape test typów Biblioteki Robót i Cennik v3.0.
 * npx vite-node scripts/test-work-catalog-types.mjs
 */
import {
  TRADE_IDS,
  TRADE_LABELS_PL,
  isTradeId,
  tradeLabelPl,
  WORK_CATALOG_SCHEMA_VERSION,
  WORK_BUNDLE_SCHEMA_VERSION,
} from "../src/lib/work-catalog/index.ts";

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

assertEq(WORK_CATALOG_SCHEMA_VERSION, 4, "WORK_CATALOG_SCHEMA_VERSION");
assertEq(WORK_BUNDLE_SCHEMA_VERSION, 3, "WORK_BUNDLE_SCHEMA_VERSION");
assertEq(TRADE_IDS.length, 16, "TRADE_IDS count");
assert(TRADE_IDS.every((id) => typeof TRADE_LABELS_PL[id] === "string" && TRADE_LABELS_PL[id].length > 0), "every trade has PL label");

assert(isTradeId("MALOWANIE"), "isTradeId MALOWANIE");
assert(!isTradeId("ROBOTY"), "isTradeId rejects unknown");
assertEq(tradeLabelPl("ELEKTRYKA"), "Elektryka", "tradeLabelPl");

/** @type {import("../src/lib/work-catalog/types.ts").CatalogWork} */
const sampleWork = {
  id: "malowanie-scian-m2",
  tradeId: "MALOWANIE",
  namePl: "Malowanie ścian",
  unit: "m2",
  companyPricePln: 39,
  updatedAt: "2026-06-28T12:00:00.000Z",
  freshnessStatus: "ok",
  keywords: ["malowanie", "scian"],
  active: true,
  favorite: false,
  usageCount: 0,
  source: "seed",
  legacyCategoryId: "MALOWANIE",
  costSplit: { materialRatio: 0.4, laborRatio: 0.6 },
};

assertEq(sampleWork.tradeId, "MALOWANIE", "CatalogWork tradeId");
assert(sampleWork.costSplit.materialRatio + sampleWork.costSplit.laborRatio === 1, "costSplit sums to 1");

/** @type {import("../src/lib/work-catalog/types.ts").WorkCatalogStore} */
const sampleStore = {
  schemaVersion: 4,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      works: [sampleWork],
      updatedAt: "2026-06-28T12:00:00.000Z",
    },
    dolnyslask: {
      region: "dolnyslask",
      works: [],
      updatedAt: "2026-06-28T12:00:00.000Z",
    },
  },
  updatedAt: "2026-06-28T12:00:00.000Z",
};

assertEq(sampleStore.schemaVersion, 4, "WorkCatalogStore schemaVersion");
assertEq(sampleStore.catalogs.wroclaw.works.length, 1, "region slice works");

/** @type {import("../src/lib/work-catalog/types.ts").WorkBundle} */
const sampleBundle = {
  id: "remont-lazienki",
  namePl: "Remont łazienki",
  primaryTradeId: "LAZIENKA",
  steps: [{ order: 1, workId: "malowanie-scian-m2", quantityDefault: 12 }],
  active: true,
  favorite: false,
  usageCount: 0,
  updatedAt: "2026-06-28T12:00:00.000Z",
  source: "seed",
};

assertEq(sampleBundle.steps[0].workId, "malowanie-scian-m2", "WorkBundleStep workId");

/** @type {import("../src/lib/work-catalog/types.ts").WorkBundleStore} */
const sampleBundleStore = {
  schemaVersion: 3,
  bundles: [sampleBundle],
  updatedAt: "2026-06-28T12:00:00.000Z",
};

assertEq(sampleBundleStore.bundles.length, 1, "WorkBundleStore bundles");

console.log(`\nP1.1 work-catalog types: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
