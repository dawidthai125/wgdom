/**
 * WC-P3.3 · S1 — testy publicznego API silnika (app layer).
 * npx vite-node scripts/test-work-catalog-market-engine-s1.mjs
 */
import {
  buildEngineMarketComparisonForWork,
  resolveMarketStartRegion,
} from "../src/app/work-catalog/work-catalog-market-engine.ts";
import {
  MARKET_LEGACY_SEED_ORIGIN_ID,
  normalizeMarketSourceSnapshot,
} from "../src/lib/work-catalog/market-sources.ts";

const TS = "2026-06-28T12:00:00.000Z";

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

function snap(origin, regionCode, price, confidence = 0.9) {
  return normalizeMarketSourceSnapshot(
    { price, regionCode, coverage: "full", updatedAt: TS, confidence, origin },
    TS,
    origin,
    regionCode,
  );
}

function baseWork(overrides = {}) {
  return {
    id: "w1",
    tradeId: "MALOWANIE",
    namePl: "Test",
    unit: "m2",
    companyPricePln: 40,
    updatedAt: TS,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

console.log("=== WORK CATALOG MARKET ENGINE S1 ===\n");

// D-B: mapowanie regionu startowego
assert("region wroclaw", resolveMarketStartRegion("wroclaw") === "wroclaw");
assert("region dolnyslask", resolveMarketStartRegion("dolnyslask") === "dolnyslask");
assert("region invalid → default wroclaw", resolveMarketStartRegion("mazowsze") === "wroclaw");
assert("region undefined → default wroclaw", resolveMarketStartRegion(undefined) === "wroclaw");

// Ścieżka silnika (marketQuotes) — priceOrigin engine + sources
const engineWork = baseWork({
  companyPricePln: 42,
  marketQuotes: {
    kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.9) },
    interbud: { wroclaw: snap("interbud", "wroclaw", 44, 0.9) },
  },
});
const engineRes = buildEngineMarketComparisonForWork(engineWork, {
  startRegionCode: "wroclaw",
  computedAtIso: TS,
});
assert("engine priceOrigin", engineRes.priceOrigin === "engine");
assert("engine originCount 2", engineRes.originCount === 2);
assert("engine price ~42", engineRes.marketPricePln === 42);
assert("engine sources 2", engineRes.sources.length === 2);
assert("engine source has label", engineRes.sources[0].originLabelPl.length > 0);
assert("engine source has region label", engineRes.sources[0].regionLabelPl === "Wrocław");
assert("engine band ok (reuse P2.5)", engineRes.comparison.band === "ok");
assert("engine emoji green", engineRes.comparison.statusEmoji === "🟢");

// Fallback regionalny — dolnyslask gdy start wroclaw
const fbWork = baseWork({
  marketQuotes: { kb_pl: { dolnyslask: snap("kb_pl", "dolnyslask", 50, 0.9) } },
});
const fbRes = buildEngineMarketComparisonForWork(fbWork, {
  startRegionCode: "wroclaw",
  computedAtIso: TS,
});
assert("fallback price resolved", fbRes.marketPricePln === 50);
assert("fallback flag set", fbRes.fallbackUsed === true);
assert("fallback source region dolnyslask", fbRes.sources[0].regionCode === "dolnyslask");

// legacy_seed (marketQuotes.legacy_seed / polska) — bez źródeł produktowych
const seedWork = baseWork({
  marketQuotes: {
    [MARKET_LEGACY_SEED_ORIGIN_ID]: {
      polska: snap(MARKET_LEGACY_SEED_ORIGIN_ID, "polska", 38, 0.5),
    },
  },
});
const seedRes = buildEngineMarketComparisonForWork(seedWork, { computedAtIso: TS });
assert("legacy_seed priceOrigin", seedRes.priceOrigin === "legacy_seed");
assert("legacy_seed price 38", seedRes.marketPricePln === 38);
assert("legacy_seed no sources", seedRes.sources.length === 0);

// legacy_avg (D-A a2) — brak marketQuotes, jest marketAvgPln
const avgWork = baseWork({ companyPricePln: 50, marketAvgPln: 48 });
const avgRes = buildEngineMarketComparisonForWork(avgWork, { computedAtIso: TS });
assert("legacy_avg priceOrigin", avgRes.priceOrigin === "legacy_avg");
assert("legacy_avg price 48", avgRes.marketPricePln === 48);
assert("legacy_avg band ok", avgRes.comparison.band === "ok");

// none — brak jakichkolwiek danych rynkowych
const noneWork = baseWork({ companyPricePln: 50 });
const noneRes = buildEngineMarketComparisonForWork(noneWork, { computedAtIso: TS });
assert("none priceOrigin", noneRes.priceOrigin === "none");
assert("none price null", noneRes.marketPricePln === null);
assert("none unavailable band", noneRes.comparison.band === "unavailable");

// Priorytet: silnik > legacy_avg (gdy oba obecne, wygrywa silnik)
const bothWork = baseWork({
  companyPricePln: 42,
  marketAvgPln: 999,
  marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 42, 0.9) } },
});
const bothRes = buildEngineMarketComparisonForWork(bothWork, {
  startRegionCode: "wroclaw",
  computedAtIso: TS,
});
assert("engine wins over legacy_avg", bothRes.priceOrigin === "engine" && bothRes.marketPricePln === 42);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
