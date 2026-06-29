/**
 * P2.5 — smoke: porównanie firma vs rynek.
 * Run: npx vite-node scripts/smoke-test-work-catalog-market-p2.5.mjs
 */
import {
  buildMarketComparison,
  computeMarketDiffPercent,
  marketComparisonBand,
  resolveMarketPricePln,
} from "../src/app/work-catalog/work-catalog-market-comparison.ts";

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

console.log("=== WORK CATALOG MARKET P2.5 SMOKE ===\n");

assert("diff 0%", computeMarketDiffPercent(100, 100) === 0);
assert("diff 8% green", marketComparisonBand(8) === "ok");
assert("diff 10% green edge", marketComparisonBand(10) === "ok");
assert("diff 11% yellow", marketComparisonBand(11) === "warn");
assert("diff 25% yellow edge", marketComparisonBand(25) === "warn");
assert("diff 26% red", marketComparisonBand(26) === "alert");

const green = buildMarketComparison(108, 100);
assert("build green band", green.band === "ok");
assert("build green emoji", green.statusEmoji === "🟢");

const yellow = buildMarketComparison(120, 100);
assert("build yellow band", yellow.band === "warn");

const red = buildMarketComparison(140, 100);
assert("build red band", red.band === "alert");

const missing = buildMarketComparison(50, null);
assert("no market unavailable", missing.band === "unavailable");
assert("no market display", missing.marketDisplayPl === "—");

const work = {
  id: "w1",
  tradeId: "MALOWANIE",
  namePl: "Test",
  unit: "m2",
  companyPricePln: 50,
  marketAvgPln: 48,
  updatedAt: "2026-06-28T00:00:00.000Z",
  freshnessStatus: "ok",
  keywords: [],
  active: true,
  favorite: false,
  usageCount: 0,
  source: "custom",
};

assert("resolve market from marketAvgPln", resolveMarketPricePln(work) === 48);

const workNoMarket = { ...work, marketAvgPln: undefined };
assert("resolve null without market", resolveMarketPricePln(workNoMarket) === null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
