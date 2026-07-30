/**
 * MARKET-SYNC-01 P0 — testy pure + guard publish.
 * Uruchom: npx vite-node scripts/test-market-sync-01-p0.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createEmptyStagingStore,
  createMarketProductDraft,
  exportMarketSyncStagingJson,
  importMarketSyncStagingJson,
  mergeMarketProducts,
  matchProviderQuote,
  normalizeEanDigits,
  refreshMarketSyncMatch,
  runMarketSyncCsvImport,
  buildPreviewReport,
} from "../src/lib/market-sync/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const csv = readFileSync(join(root, "fixtures/market-sync-01/p0-sample-quotes.csv"), "utf8");
const productsJson = JSON.parse(
  readFileSync(join(root, "fixtures/market-sync-01/p0-sample-products.json"), "utf8"),
);

console.log("=== T01 normalize EAN ===");
assert(normalizeEanDigits("590-1234-123457") === "5901234123457", "T01 EAN digits");
assert(normalizeEanDigits("123") === null, "T01 EAN invalid length");

console.log("\n=== T02 import + match EAN / unmatched / reject ===");
let store = createEmptyStagingStore("2026-07-30T10:00:00.000Z");
store = mergeMarketProducts(store, productsJson);
let seq = 0;
const result = runMarketSyncCsvImport(store, csv, {
  nowIso: "2026-07-30T12:00:00.000Z",
  newId: () => `test-${++seq}`,
  actorAdminId: "dawid",
  fileName: "p0-sample-quotes.csv",
});
store = result.store;
const quotes = store.providerQuotes;

const bySku = Object.fromEntries(quotes.map((q) => [q.providerSku || q.rejectReason || q.id, q]));
assert(bySku["LM-1001"]?.status === "proposed", "T02 LM-1001 proposed (EAN)");
assert(bySku["LM-1001"]?.matchMethod === "ean", "T02 LM-1001 method ean");
assert(bySku["LM-1001"]?.marketProductId === "mp-ceresit-cm11", "T02 LM-1001 → ceresit");
assert(bySku["LM-1002"]?.status === "proposed", "T02 LM-1002 mfr+name+unit");
assert(bySku["LM-1002"]?.matchMethod === "mfr_name_unit", "T02 LM-1002 method");
assert(bySku["CAS-55"]?.status === "proposed", "T02 CAS-55 EAN cross-shop");
assert(bySku["CAS-99"]?.status === "unmatched", "T02 CAS-99 unmatched");
assert(
  quotes.some((q) => q.rejectReason === "missing_price"),
  "T02 reject bez ceny",
);

console.log("\n=== T03 conflict EAN multi-MP ===");
const conflictQuote = {
  id: "pq-conflict",
  provider: "other",
  providerSku: "X1",
  ean: "5909999000001",
  productName: "X",
  unit: "szt",
  grossPrice: 1,
  currency: "PLN",
  sourceUrl: null,
  importedAt: "2026-07-30T12:00:00.000Z",
  status: "imported",
  syncRunId: "sr-x",
  marketProductId: null,
  matchConfidence: null,
  matchMethod: null,
  matchCandidates: [],
};
const conflictMatch = matchProviderQuote(conflictQuote, {
  products: productsJson.filter((p) => p.id.startsWith("mp-conflict")),
  priorQuotes: [],
});
assert(conflictMatch.status === "conflict", "T03 conflict ≥2 EAN owners");
assert(conflictMatch.matchCandidates.length >= 2, "T03 candidates ≥2");

console.log("\n=== T04 Preview buckets + price change ===");
const preview = buildPreviewReport(store.providerQuotes, store.marketProducts);
assert(preview.diagnostics.fuzzyAutoLinkCount === 0, "T04 fuzzy = 0");
assert(preview.diagnostics.unmatched >= 1, "T04 unmatched ≥1");
assert(preview.diagnostics.proposed >= 1, "T04 proposed ≥1");
const priceChangeRows = preview.rows.filter((r) => r.bucket === "price_change");
assert(priceChangeRows.length >= 1, "T04 price_change (drugi LM-1001)");

console.log("\n=== T05 JSON export/import roundtrip ===");
const json = exportMarketSyncStagingJson(store);
const round = importMarketSyncStagingJson(json);
assert(round.marketProducts.length === store.marketProducts.length, "T05 products count");
assert(round.providerQuotes.length === store.providerQuotes.length, "T05 quotes count");
const refreshed = refreshMarketSyncMatch(round);
assert(refreshed.preview.diagnostics.fuzzyAutoLinkCount === 0, "T05 refresh fuzzy 0");

console.log("\n=== T06 alias match ===");
const aliasProduct = createMarketProductDraft({
  id: "mp-alias",
  canonicalName: "Farba bazowa",
  manufacturer: null,
  unit: "l",
  aliases: ["Farba lateksowa biała"],
  nowIso: "2026-07-30T00:00:00.000Z",
});
const aliasQuote = {
  ...conflictQuote,
  id: "pq-alias",
  ean: null,
  providerSku: "A1",
  productName: "Farba lateksowa biała",
  productNameFold: "farba lateksowa biala",
  unit: "l",
  manufacturer: null,
};
const aliasHit = matchProviderQuote(aliasQuote, {
  products: [aliasProduct],
  priorQuotes: [],
});
assert(aliasHit.status === "proposed", "T06 alias proposed");
assert(aliasHit.matchMethod === "alias" || aliasHit.matchMethod === "mfr_name_unit", "T06 alias method");

console.log("\n=== T07 publish surface guard (static) — P0 modules bez commit ===");
const fs = await import("node:fs");
const p0OnlyFiles = [
  "src/lib/market-sync/types.ts",
  "src/lib/market-sync/normalize.ts",
  "src/lib/market-sync/match.ts",
  "src/lib/market-sync/import-csv.ts",
  "src/lib/market-sync/preview.ts",
  "src/lib/market-sync/staging-store.ts",
  "src/lib/market-sync/pipeline.ts",
  "src/lib/market-sync/accept.ts",
  "src/lib/market-sync/guard.ts",
  "src/lib/market-sync/dry-run.ts",
  "src/lib/market-sync/delta.ts",
  "src/lib/market-sync/kill-switch.ts",
  "src/lib/market-sync/publish-summary.ts",
  "src/lib/market-sync/undo.ts",
];
let commitHitsP0 = 0;
let applyHits = 0;
for (const rel of p0OnlyFiles) {
  const text = fs.readFileSync(join(root, rel), "utf8");
  if (
    /import\s*\{[^}]*commitMarketQuotesImport/.test(text) ||
    /commitMarketQuotesImport\s*\(/.test(text)
  ) {
    commitHitsP0 += 1;
  }
  if (/applyMarketQuotesFromPreview\s*\(/.test(text)) {
    applyHits += 1;
  }
}
const publishTs = fs.readFileSync(join(root, "src/lib/market-sync/publish.ts"), "utf8");
assert(commitHitsP0 === 0, "T07 P0/Accept/Guard bez commitMarketQuotesImport");
assert(applyHits === 0, "T07 zero applyMarketQuotesFromPreview poza commit path");
assert(
  /commitMarketQuotesImport/.test(publishTs),
  "T07 publish.ts = jedyny tor commitMarketQuotesImport w market-sync",
);

console.log("\n=== T08 draft product ===");
const draft = createMarketProductDraft({
  canonicalName: " Test ",
  unit: "kg",
  ean: ["5901234123457"],
  id: "mp-draft",
});
assert(draft.canonicalName === "Test", "T08 trim name");
assert(draft.ean[0] === "5901234123457", "T08 ean");

console.log(`\n=== RESULT ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
