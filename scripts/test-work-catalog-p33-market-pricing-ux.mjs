/**
 * WORK-CATALOG-P3.3 — flag + coverage (S5) + IC checks
 * npx vite-node scripts/test-work-catalog-p33-market-pricing-ux.mjs
 */
import {
  forceWcP33MarketPricingUxForTests,
  isWcP33MarketPricingUxEnabled,
  WC_P33_MARKET_PRICING_UX_DEFAULT,
  WC_P33_MARKET_PRICING_UX_LS_KEY,
} from "../src/lib/wc-p33-flag.ts";
import { computeMarketCoverageSummary } from "../src/app/work-catalog/work-catalog-market-coverage.ts";
import { normalizeMarketSourceSnapshot } from "../src/lib/work-catalog/market-sources.ts";
import fs from "node:fs";
import path from "node:path";

const TS = "2026-07-29T12:00:00.000Z";
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
    tradeId: "ogolnobudowlane",
    namePl: "Roboty ziemne",
    unit: "m3",
    keywords: [],
    active: true,
    companyPricePln: 100,
    costSplit: { materialPln: 40, laborPln: 50, equipmentPln: 10 },
    source: "seed",
    updatedAt: TS,
    marketAvgPln: null,
    marketQuotes: null,
    ...overrides,
  };
}

// --- Flag ---
forceWcP33MarketPricingUxForTests(null);
assert("flag default OFF constant", WC_P33_MARKET_PRICING_UX_DEFAULT === false);
assert("flag LS key", WC_P33_MARKET_PRICING_UX_LS_KEY === "kw-wc-p33-market-pricing-ux");
assert("flag default enabled=false", isWcP33MarketPricingUxEnabled() === false);
forceWcP33MarketPricingUxForTests(true);
assert("flag force ON", isWcP33MarketPricingUxEnabled() === true);
forceWcP33MarketPricingUxForTests(false);
assert("flag force OFF", isWcP33MarketPricingUxEnabled() === false);
forceWcP33MarketPricingUxForTests(null);

// --- Coverage Engine ---
const withEngine = baseWork({
  id: "e1",
  marketQuotes: {
    kb_pl: { wroclaw: snap("kb_pl", "wroclaw", 120) },
    sekocenbud: { wroclaw: snap("sekocenbud", "wroclaw", 130) },
  },
});
const withLegacyAvg = baseWork({
  id: "l1",
  marketQuotes: null,
  marketAvgPln: 95,
});
const withNone = baseWork({
  id: "n1",
  companyPricePln: 50,
  marketQuotes: null,
  marketAvgPln: null,
});

const summary = computeMarketCoverageSummary(
  [withEngine, withLegacyAvg, withNone],
  "wroclaw",
  TS,
);
assert("coverage total 3", summary.total === 3);
assert("coverage engine 1", summary.engine === 1);
assert("coverage legacyAvg 1", summary.legacyAvg === 1);
assert("coverage none 1", summary.none === 1);
assert("coverage enginePct 33", summary.enginePct === 33);
assert("coverage startRegion wroclaw", summary.startRegionCode === "wroclaw");

// --- IC allowlist smoke (no apply call from CSV panel source) ---
const csvPanelPath = path.resolve("src/app/work-catalog/WorkCatalogCsvImportPreviewPanel.tsx");
const csvSrc = fs.readFileSync(csvPanelPath, "utf8");
assert("IC-1 commitMarketQuotesImport in panel", csvSrc.includes("commitMarketQuotesImport"));
assert("IC-1 no direct applyMarketQuotesFromPreview", !csvSrc.includes("applyMarketQuotesFromPreview("));
assert("IC-4 no companyPrice apply from market", !/companyPricePln\s*=/.test(csvSrc) || !csvSrc.includes("Zastosuj jako cenę firmy"));

const viewPath = path.resolve("src/app/work-catalog/WorkCatalogView.tsx");
const viewSrc = fs.readFileSync(viewPath, "utf8");
assert("S4 mount WorkCatalogCsvImportPreviewPanel", viewSrc.includes("WorkCatalogCsvImportPreviewPanel"));
assert("S5 coverage panel", viewSrc.includes("WorkCatalogMarketCoveragePanel"));
assert("flag gate isWcP33MarketPricingUxEnabled", viewSrc.includes("isWcP33MarketPricingUxEnabled"));
assert("DOM import entry", viewSrc.includes("data-wc-p33-import-entry"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
