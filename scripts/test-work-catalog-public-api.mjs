/**
 * P1.12 — weryfikacja publicznego API @/lib/work-catalog (barrel index).
 * npx vite-node scripts/test-work-catalog-public-api.mjs
 */
import * as WorkCatalog from "../src/lib/work-catalog/index.ts";

const REQUIRED_EXPORTS = [
  // ── P1 (Foundation) — bez zmian ──────────────────────────────────────────
  "TRADE_IDS",
  "WORK_CATALOG_SCHEMA_VERSION",
  "WORK_BUNDLE_SCHEMA_VERSION",
  "deriveFreshnessStatus",
  "listWorksForRegion",
  "parseSeedManifestYaml",
  "validateSeedManifestYaml",
  "WORK_CATALOG_REFERENCE_HOURLY_PLN",
  "migrateLegacyCostCatalogStoreToWorkCatalog",
  "buildLegacyCostCatalogFromWorkStore",
  "normalizeWorkCatalogStore",
  "normalizeWorkBundleStore",
  "resolveCatalogForEngine",
  "resolveCatalogForUI",
  "loadWorkCatalogStore",
  "saveWorkCatalogStore",
  "WORK_CATALOG_STORAGE_KEY",
  "WORK_BUNDLE_STORAGE_KEY",
  // ── P3.1-S1 — market regions (hierarchia fallback P3.0B) ──────────────────
  "MARKET_REGION_CODES",
  "MARKET_REGION_LABELS_PL",
  "isMarketRegionCode",
  "marketRegionLabelPl",
  "marketRegionFallbackChain",
  "DEFAULT_MARKET_START_REGION",
  // ── P3.1-S1 — market sources (kontrakt marketQuotes) ──────────────────────
  "MARKET_ORIGIN_IDS",
  "MARKET_ORIGIN_LABELS_PL",
  "MARKET_LEGACY_SEED_ORIGIN_ID",
  "MARKET_QUOTE_ORIGIN_IDS",
  "MARKET_COVERAGE_VALUES",
  "MARKET_MIN_CONFIDENCE_DEFAULT",
  "isMarketOriginId",
  "isMarketQuoteOriginId",
  "isMarketCoverage",
  "roundMarketPricePln",
  "normalizeMarketCoverage",
  "normalizeMarketSourceSnapshot",
  "normalizeWorkMarketQuotes",
  // ── S2 (engine) — dopisać przy landing market-average-engine ──────────────
  // "computeMarketAverage",
  // "computeMarketAverageForWork",
  // ── P3.1-S3 — market source adapters (kontrakt + rejestr) ─────────────────
  "mapMarketRegionLabelToCode",
  "buildSnapshotFromParts",
  "resolveWorkIdFromIndex",
  "MARKET_SOURCE_ADAPTERS",
  "adaptMarketSourceRecord",
  "getMarketSourceAdapter",
  "isKnownMarketSourceAdapter",
  "kbPlMarketSourceAdapter",
  "interbudMarketSourceAdapter",
  "sekocenbudMarketSourceAdapter",
  "wgdomMarketSourceAdapter",
  // ── P3.1-S3 — market work mapping (słownik) ───────────────────────────────
  "createEmptyMarketWorkMappingStore",
  "normalizeMarketWorkMapping",
  "validateMappings",
  "findMapping",
  "listMappings",
  "registerMapping",
  "resolveMappingBatch",
  "buildMarketWorkMappingIndex",
  "buildMarketWorkMappingIndexForOrigin",
  // ── P3.1-S4 — market CSV import (preview) + seed ──────────────────────────
  "parseMarketCsv",
  "parseCsvLine",
  "previewMarketCsvImport",
  "previewMarketCsvRows",
  "csvRowToAdapterRecord",
  "resolveCsvExternalId",
  "createSeededMarketWorkMappingStore",
  // ── P3.2-S1 — apply market quotes (merge-not-replace) ─────────────────────
  "applyMarketQuotesFromPreview",
  "mergeWorkMarketQuotes",
];

let pass = 0;
let fail = 0;

for (const name of REQUIRED_EXPORTS) {
  if (WorkCatalog[name] === undefined) {
    fail += 1;
    console.error(`FAIL missing export: ${name}`);
  } else {
    pass += 1;
  }
}

assertEq(WorkCatalog.TRADE_IDS.length, 16, "TRADE_IDS count");
assertEq(WorkCatalog.WORK_CATALOG_STORAGE_KEY, "kw-wgdom-work-catalog", "catalog KV key");
assertEq(WorkCatalog.WORK_BUNDLE_STORAGE_KEY, "kw-wgdom-work-bundles", "bundle KV key");

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
}

console.log(`\nP1.12 work-catalog public API: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
