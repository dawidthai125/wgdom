/**
 * WC-P3.3 · S3 — Confidence + Sources.
 * Weryfikuje: (a) wiring UI reużywa formatterów (bez duplikacji, bez nowych
 * obliczeń/progów) oraz konsumuje engine.sources; (b) Public API Engine (S1)
 * wystawia sources + confidence + fallback zgodnie z S1/S2.
 *
 * Run: npx vite-node scripts/test-work-catalog-market-comparison-s3.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildEngineMarketComparisonForWork } from "../src/app/work-catalog/work-catalog-market-engine.ts";
import { formatCsvPreviewConfidence } from "../src/app/work-catalog/work-catalog-csv-import-preview.ts";
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

console.log("=== WORK CATALOG MARKET COMPARISON S3 (confidence + sources) ===\n");

// ─── Wiring: UI konsumuje sources/confidence przez reuse (bez duplikacji) ─────
const cmp = readSrc("src/app/work-catalog/WorkCatalogMarketComparison.tsx");
assert("import formatCsvPreviewConfidence", cmp.includes("formatCsvPreviewConfidence"));
assert("import formatMarketPriceDisplayPl (reuse)", cmp.includes("formatMarketPriceDisplayPl"));
assert("konsumuje engine.sources", cmp.includes("engine.sources"));
assert("renderuje confidence przez formatter", cmp.includes("formatCsvPreviewConfidence(source.confidence)"));
assert("pokazuje pochodzenie ceny (priceOrigin)", cmp.includes("engine.priceOrigin"));
assert("nadal używa Public API Engine", cmp.includes("buildEngineMarketComparisonForWork(work)"));
assert("brak własnego toFixed cen źródeł (reuse)", !cmp.includes("source.pricePln.toFixed"));
assert("brak nowych progów (GREEN/YELLOW)", !cmp.includes("GREEN_MAX") && !cmp.includes("YELLOW_MAX"));

// ─── Reuse formattera confidence (SSOT) ──────────────────────────────────────
assert("format confidence 90%", formatCsvPreviewConfidence(0.9) === "90%");
assert("format confidence 0 → —", formatCsvPreviewConfidence(0) === "—");

// ─── Engine wystawia sources (ścieżka silnika) ───────────────────────────────
const engineRes = buildEngineMarketComparisonForWork(
  baseWork({
    companyPricePln: 42,
    marketQuotes: {
      kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 40, 0.9) },
      interbud: { wroclaw: snap("interbud", "wroclaw", 44, 0.8) },
    },
  }),
  { startRegionCode: "wroclaw", computedAtIso: TS },
);
assert("engine sources 2", engineRes.sources.length === 2);
assert("source ma originLabelPl", engineRes.sources.every((s) => s.originLabelPl.length > 0));
assert("source ma regionLabelPl", engineRes.sources.every((s) => s.regionLabelPl.length > 0));
assert(
  "source confidence w (0,1]",
  engineRes.sources.every((s) => s.confidence > 0 && s.confidence <= 1),
);
assert("source bez fallback (region startowy)", engineRes.sources.every((s) => s.fallbackUsed === false));

// ─── Fallback regionalny oznaczony na źródle ─────────────────────────────────
const fbRes = buildEngineMarketComparisonForWork(
  baseWork({ marketQuotes: { kb_pl: { dolnyslask: snap("kb_pl", "dolnyslask", 50, 0.7) } } }),
  { startRegionCode: "wroclaw", computedAtIso: TS },
);
assert("fallback source flagged", fbRes.sources.length === 1 && fbRes.sources[0].fallbackUsed === true);
assert("fallback source region label", fbRes.sources[0].regionLabelPl.length > 0);

// ─── Fallback legacy: brak sources (zgodnie z S1) ────────────────────────────
const seedRes = buildEngineMarketComparisonForWork(
  baseWork({
    marketQuotes: {
      [MARKET_LEGACY_SEED_ORIGIN_ID]: { polska: snap(MARKET_LEGACY_SEED_ORIGIN_ID, "polska", 38, 0.5) },
    },
  }),
  { computedAtIso: TS },
);
assert("legacy_seed no sources", seedRes.sources.length === 0 && seedRes.priceOrigin === "legacy_seed");

const avgRes = buildEngineMarketComparisonForWork(
  baseWork({ companyPricePln: 50, marketAvgPln: 48 }),
  { computedAtIso: TS },
);
assert("legacy_avg no sources", avgRes.sources.length === 0 && avgRes.priceOrigin === "legacy_avg");

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
