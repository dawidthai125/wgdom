/**
 * P1.12 — weryfikacja publicznego API @/lib/work-catalog (barrel index).
 * npx vite-node scripts/test-work-catalog-public-api.mjs
 */
import * as WorkCatalog from "../src/lib/work-catalog/index.ts";

const REQUIRED_EXPORTS = [
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
