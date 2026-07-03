/**
 * WC-P3.3 · S2 — Status z Engine.
 * Weryfikuje wiring UI: WorkCatalogMarketComparison korzysta WYŁĄCZNIE z Public API
 * Engine (buildEngineMarketComparisonForWork), bez własnych obliczeń rynku, oraz
 * że engine zwraca band 🟢🟡🔴 zgodnie z progami P2.5 (reuse).
 *
 * Run: npx vite-node scripts/test-work-catalog-market-comparison-s2.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildEngineMarketComparisonForWork } from "../src/app/work-catalog/work-catalog-market-engine.ts";
import {
  MARKET_LEGACY_SEED_ORIGIN_ID,
  normalizeMarketSourceSnapshot,
} from "../src/lib/work-catalog/market-sources.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const TS = "2026-06-28T12:00:00.000Z";

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
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

console.log("=== WORK CATALOG MARKET COMPARISON S2 (wiring) ===\n");

// ─── Wiring statyczny: komponent używa wyłącznie Public API Engine ───────────
const cmp = readSrc("src/app/work-catalog/WorkCatalogMarketComparison.tsx");
assert("import buildEngineMarketComparisonForWork", cmp.includes("buildEngineMarketComparisonForWork"));
assert("import z work-catalog-market-engine", cmp.includes("@/app/work-catalog/work-catalog-market-engine"));
assert("wywołanie engine w komponencie", cmp.includes("buildEngineMarketComparisonForWork(work)"));
assert("brak legacy buildMarketComparisonForWork", !cmp.includes("buildMarketComparisonForWork"));
assert("brak własnego buildMarketComparison(", !cmp.includes("buildMarketComparison("));
assert("konsumuje .comparison z engine", cmp.includes(".comparison"));

// ─── Status z engine: band 🟢🟡🔴 (reuse progów P2.5) ────────────────────────
const green = buildEngineMarketComparisonForWork(
  baseWork({ companyPricePln: 42, marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.9) } } }),
).comparison;
assert("engine band ok", green.band === "ok");
assert("engine emoji green", green.statusEmoji === "🟢");

const yellow = buildEngineMarketComparisonForWork(
  baseWork({ companyPricePln: 120, marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 100, 0.9) } } }),
).comparison;
assert("engine band warn", yellow.band === "warn");
assert("engine emoji yellow", yellow.statusEmoji === "🟡");

const red = buildEngineMarketComparisonForWork(
  baseWork({ companyPricePln: 140, marketQuotes: { kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 100, 0.9) } } }),
).comparison;
assert("engine band alert", red.band === "alert");
assert("engine emoji red", red.statusEmoji === "🔴");

// ─── Fallback zgodny z DESIGN FREEZE ─────────────────────────────────────────
const seed = buildEngineMarketComparisonForWork(
  baseWork({
    companyPricePln: 40,
    marketQuotes: { [MARKET_LEGACY_SEED_ORIGIN_ID]: { polska: snap(MARKET_LEGACY_SEED_ORIGIN_ID, "polska", 38, 0.5) } },
  }),
).comparison;
assert("legacy_seed fallback band ok", seed.band === "ok" && seed.marketPricePln === 38);

const legacyAvg = buildEngineMarketComparisonForWork(
  baseWork({ companyPricePln: 50, marketAvgPln: 48 }),
).comparison;
assert("legacy_avg fallback price", legacyAvg.marketPricePln === 48);

const none = buildEngineMarketComparisonForWork(baseWork({ companyPricePln: 50 })).comparison;
assert("none unavailable band", none.band === "unavailable" && none.marketPricePln === null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
