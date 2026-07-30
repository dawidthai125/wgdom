/**
 * SMART-PRICING-01 P0 — Detect + Quotes RO.
 * Uruchom: npx vite-node scripts/test-smart-pricing-01-p0.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectMissingPrices,
  hasUsefulProductQuote,
  isSmartPricingExtensionAvailable,
  listProductQuoteCellsForRegion,
  missingReasonByLineId,
  SMART_PRICING_EXTENSIONS,
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_STALE_DAYS,
} from "../src/lib/smart-pricing/index.ts";

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

const NOW = "2026-07-30T12:00:00.000Z";
const REGION = "wroclaw";

function snap(partial) {
  return {
    price: 10,
    regionCode: REGION,
    coverage: "full",
    updatedAt: "2026-07-01T00:00:00.000Z",
    confidence: 0.8,
    origin: "wgdom",
    ...partial,
  };
}

function work(id, quotes) {
  return {
    id,
    tradeId: "inne",
    namePl: `Robota ${id}`,
    unit: "szt",
    companyPricePln: 1,
    marketQuotes: quotes,
    updatedAt: NOW,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function line(partial) {
  return {
    lineId: partial.lineId,
    lp: partial.lp ?? "1",
    description: partial.description ?? "poz",
    catalogWorkId: partial.catalogWorkId ?? null,
    unit: "szt",
    quantity: 1,
    lineKind: "other",
    linePricing: null,
    components: [],
    mappingConfidence: null,
    requiresUserReview: false,
    userEdited: false,
  };
}

function doc(lines) {
  return {
    schemaVersion: 1,
    tenderId: "t1",
    version: 1,
    builtAt: NOW,
    parserSnapshotRef: { kind: "none" },
    lines,
    totals: { directCostPln: 0, pricedLineCount: 0 },
    recomputeToken: "x",
    buildStatus: "mapped",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

console.log("=== T01 useful quote OK ===");
const wOk = work("w-ok", { wgdom: { [REGION]: snap({}) } });
assert(hasUsefulProductQuote(wOk, { regionCode: REGION, computedAtIso: NOW }), "T01 useful");
assert(
  listProductQuoteCellsForRegion(wOk, { regionCode: REGION, computedAtIso: NOW }).some((c) => c.useful),
  "T01 cells useful",
);

console.log("\n=== T02 low confidence = missing ===");
const wLow = work("w-low", { wgdom: { [REGION]: snap({ confidence: 0.4 }) } });
assert(
  !hasUsefulProductQuote(wLow, { regionCode: REGION, computedAtIso: NOW }),
  "T02 not useful low conf",
);
assert(SMART_PRICING_MIN_CONFIDENCE === 0.5, "T02 min conf DF 0.50");

console.log("\n=== T03 stale >180d = missing ===");
const wStale = work("w-stale", {
  wgdom: { [REGION]: snap({ updatedAt: "2025-01-01T00:00:00.000Z" }) },
});
assert(
  !hasUsefulProductQuote(wStale, { regionCode: REGION, computedAtIso: NOW }),
  "T03 not useful stale",
);
assert(SMART_PRICING_STALE_DAYS === 180, "T03 stale days DF 180");

console.log("\n=== T04 detect unmapped / ok / no_quote / low / stale ===");
const works = [
  wOk,
  wLow,
  wStale,
  work("w-empty", undefined),
];
const document = doc([
  line({ lineId: "L-unmap", lp: "1", catalogWorkId: null, description: "bez mapy" }),
  line({ lineId: "L-ok", lp: "2", catalogWorkId: "w-ok", description: "ok" }),
  line({ lineId: "L-empty", lp: "3", catalogWorkId: "w-empty", description: "puste" }),
  line({ lineId: "L-low", lp: "4", catalogWorkId: "w-low", description: "low" }),
  line({ lineId: "L-stale", lp: "5", catalogWorkId: "w-stale", description: "stale" }),
  line({ lineId: "L-miss", lp: "6", catalogWorkId: "w-ghost", description: "ghost" }),
]);
const summary = detectMissingPrices(document, works, {
  regionCode: REGION,
  computedAtIso: NOW,
});
assert(summary.lineCount === 6, "T04 lineCount 6");
assert(summary.okCount === 1, "T04 okCount 1");
assert(summary.missingCount === 5, "T04 missingCount 5");
assert(summary.byReason.unmapped === 1, "T04 unmapped");
assert(summary.byReason.no_quote === 1, "T04 no_quote");
assert(summary.byReason.low_confidence === 1, "T04 low_confidence");
assert(summary.byReason.stale === 1, "T04 stale");
assert(summary.byReason.work_missing === 1, "T04 work_missing");
const map = missingReasonByLineId(summary);
assert(map.get("L-ok") === undefined, "T04 L-ok not in missing map");
assert(map.get("L-unmap") === "unmapped", "T04 L-unmap");

console.log("\n=== T05 Quotes-first region isolation ===");
const wOtherRegion = work("w-other", {
  wgdom: { polska: snap({ regionCode: "polska" }) },
});
assert(
  !hasUsefulProductQuote(wOtherRegion, { regionCode: REGION, computedAtIso: NOW }),
  "T05 other region ≠ useful for preferred",
);

console.log("\n=== T06 extension points P1+ unavailable ===");
assert(SMART_PRICING_EXTENSIONS.every((e) => e.available === false), "T06 all extensions false");
assert(!isSmartPricingExtensionAvailable("P1_evidence"), "T06 P1_evidence off");
assert(!isSmartPricingExtensionAvailable("P1_one_shot"), "T06 one_shot off");
assert(!isSmartPricingExtensionAvailable("P2_ms_staging"), "T06 ms off");
assert(!isSmartPricingExtensionAvailable("P3_save"), "T06 save off");

console.log("\n=== T07 static: zero write / commit / apply / MS publish in smart-pricing ===");
const spDir = join(root, "src/lib/smart-pricing");
const files = ["detect.ts", "quotes-read.ts", "extensions.ts", "index.ts", "types.ts", "constants.ts"];
const banned = [
  "commitMarketQuotesImport",
  "applyMarketQuotesFromPreview",
  "runMarketSyncPublish",
  "pushKeysToCloud",
  "persistKey",
];
for (const f of files) {
  const src = readFileSync(join(spDir, f), "utf8");
  for (const b of banned) {
    assert(!src.includes(b), `T07 ${f} bez ${b}`);
  }
}
const banner = readFileSync(join(root, "src/app/smart-pricing/SmartPricingDetectBanner.tsx"), "utf8");
for (const b of banned) {
  assert(!banner.includes(b), `T07 banner bez ${b}`);
}

console.log("\n=== T08 detect nie mutuje works (fingerprint Quotes) ===");
const fpBefore = JSON.stringify(works.map((w) => w.marketQuotes ?? null));
detectMissingPrices(document, works, { regionCode: REGION, computedAtIso: NOW });
const fpAfter = JSON.stringify(works.map((w) => w.marketQuotes ?? null));
assert(fpBefore === fpAfter, "T08 Quotes fingerprint unchanged");

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
