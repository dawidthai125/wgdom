/**
 * P3.1 — testy silnika MarketAverageEngine.
 * npx vite-node scripts/test-work-catalog-market-average-engine-p3.1.mjs
 */
import {
  computeMarketAverage,
  computeMarketAverageForWork,
  defaultMarketSourceEngineConfig,
  isMarketSnapshotEligible,
  resolveOriginMarketQuote,
} from "../src/lib/work-catalog/market-average-engine.ts";
import { marketRegionFallbackChain } from "../src/lib/work-catalog/market-regions.ts";
import {
  MARKET_MIN_CONFIDENCE_DEFAULT,
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
    {
      price,
      regionCode,
      coverage: "full",
      updatedAt: TS,
      confidence,
      origin,
    },
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
    source: "seed",
    ...overrides,
  };
}

console.log("=== WORK CATALOG MARKET AVERAGE ENGINE P3.1 ===\n");

// ─── fallback regionów ─────────────────────────────────────────────────────

assert(
  "chain wroclaw 4 levels",
  marketRegionFallbackChain("wroclaw").length === 4
    && marketRegionFallbackChain("wroclaw")[0] === "wroclaw",
);

const quotesFallback = {
  kb_pl: {
    dolnyslask: snap("kb_pl", "dolnyslask", 38),
  },
  interbud: {
    wroclaw: snap("interbud", "wroclaw", 42),
  },
};

const resolvedKb = resolveOriginMarketQuote(
  quotesFallback,
  "kb_pl",
  marketRegionFallbackChain("wroclaw"),
  MARKET_MIN_CONFIDENCE_DEFAULT,
  "wroclaw",
);
assert("kb_pl falls back to dolnyslask", resolvedKb?.resolvedRegionCode === "dolnyslask");
assert("kb_pl fallbackUsed", resolvedKb?.fallbackUsed === true);

const resolvedInter = resolveOriginMarketQuote(
  quotesFallback,
  "interbud",
  marketRegionFallbackChain("wroclaw"),
  MARKET_MIN_CONFIDENCE_DEFAULT,
  "wroclaw",
);
assert("interbud hits wroclaw", resolvedInter?.resolvedRegionCode === "wroclaw");
assert("interbud no fallback", resolvedInter?.fallbackUsed === false);

const avgFallback = computeMarketAverage(
  baseWork({ marketQuotes: quotesFallback }),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
assert("fallback average has 2 origins", avgFallback.originCount === 2);
assert("fallbackUsed flag on result", avgFallback.fallbackUsed === true);
assert("dominant region dolnyslask or mixed", avgFallback.dominantRegionCode != null);

// ─── confidence ────────────────────────────────────────────────────────────

assert(
  "low confidence excluded",
  !isMarketSnapshotEligible(snap("kb_pl", "wroclaw", 50, 0.3), 0.5),
);
assert(
  "edge confidence 0.5 included",
  isMarketSnapshotEligible(snap("kb_pl", "wroclaw", 50, 0.5), 0.5),
);

const quotesLowConf = {
  kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 100, 0.2) },
  interbud: { wroclaw: snap("interbud", "wroclaw", 40, 0.9) },
};
const avgConf = computeMarketAverage(
  baseWork({ marketQuotes: quotesLowConf }),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
assert("only high confidence origin counts", avgConf.originCount === 1);
assert("price equals interbud only", avgConf.pricePln === 40);

// ─── weighted average ──────────────────────────────────────────────────────

const quotesWeighted = {
  kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 30, 0.5) },
  interbud: { wroclaw: snap("interbud", "wroclaw", 50, 1) },
};
const avgWeighted = computeMarketAverage(
  baseWork({ marketQuotes: quotesWeighted }),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
// (30*0.5 + 50*1) / 1.5 = 43.33
assert("weighted average ~43.33", avgWeighted.pricePln === 43.33);

// ─── brak danych ───────────────────────────────────────────────────────────

const avgEmpty = computeMarketAverage(
  baseWork(),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
assert("no quotes unavailable", avgEmpty.unavailable === true);
assert("no quotes price null", avgEmpty.pricePln === null);

// S2 · Opcja A — legacy = marketQuotes.legacy_seed (SSOT), NIE surowy marketAvgPln.
const legacySeedQuotes = {
  legacy_seed: { polska: snap("legacy_seed", "polska", 37.5, 0.5) },
};
const avgLegacy = computeMarketAverage(
  baseWork({ marketQuotes: legacySeedQuotes }),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
assert("legacy_seed fallback used", avgLegacy.legacyFallbackUsed === true);
assert("legacy_seed price 37.5", avgLegacy.pricePln === 37.5);
assert("legacy_seed originCount 0 (nie produktowy)", avgLegacy.originCount === 0);

// Lock: surowy marketAvgPln bez legacy_seed NIE jest SSOT → unavailable.
const avgRawAvg = computeMarketAverage(
  baseWork({ marketAvgPln: 37.5 }),
  { startRegionCode: "wroclaw" },
  defaultMarketSourceEngineConfig(),
  TS,
);
assert(
  "raw marketAvgPln is NOT SSOT (unavailable, no legacy fallback)",
  avgRawAvg.unavailable === true && avgRawAvg.legacyFallbackUsed === false,
);

// ─── disabled origin ───────────────────────────────────────────────────────

const quotesAll = {
  kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 30) },
  interbud: { wroclaw: snap("interbud", "wroclaw", 50) },
};
const avgDisabled = computeMarketAverage(
  baseWork({ marketQuotes: quotesAll }),
  { startRegionCode: "wroclaw" },
  { enabledOrigins: ["interbud"], minConfidence: 0.5 },
  TS,
);
assert("disabled origin skipped", avgDisabled.originCount === 1);
assert("only interbud price", avgDisabled.pricePln === 50);

const viaHelper = computeMarketAverageForWork(
  baseWork({ marketQuotes: quotesAll }),
  { config: { enabledOrigins: ["kb_pl"], minConfidence: 0.5 } },
);
assert("helper wrapper kb_pl only", viaHelper.pricePln === 30);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
