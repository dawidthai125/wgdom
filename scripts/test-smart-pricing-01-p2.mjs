/**
 * SMART-PRICING-01 P2 — staging Evidence · merge · Rank B1 · flag.
 * Uruchom: npx vite-node scripts/test-smart-pricing-01-p2.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SMART_PRICING_EXTENSIONS,
  SMART_PRICING_P2_DEFAULT,
  SMART_PRICING_P2_LS_KEY,
  buildEvidenceFromMarketSyncStaging,
  buildEvidenceFromProductQuotes,
  computeDecisionConfidence,
  forceSmartPricingP1ForTests,
  forceSmartPricingP2ForTests,
  isSmartPricingExtensionAvailable,
  isSmartPricingP2Enabled,
  marketSyncStagingFingerprint,
  mergeSmartPricingEvidence,
  productQuotesFingerprint,
  rankEvidence,
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
const WORK_ID = "w-1";

function snap(partial) {
  return {
    price: 10,
    regionCode: REGION,
    coverage: "full",
    updatedAt: "2026-07-01T00:00:00.000Z",
    confidence: 0.9,
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

function stagingStore() {
  return {
    version: 1,
    updatedAt: NOW,
    marketProducts: [
      {
        id: "mp-1",
        canonicalName: "Produkt test",
        manufacturer: null,
        unit: "szt",
        category: "inne",
        aliases: [],
        ean: [],
        linkedWorkIds: [WORK_ID],
        active: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    providerQuotes: [
      {
        id: "pq-leroy",
        provider: "leroy",
        providerSku: "L-1",
        ean: null,
        productName: "Cena staging leroy",
        unit: "szt",
        grossPrice: 9.5,
        currency: "PLN",
        sourceUrl: null,
        importedAt: NOW,
        status: "accepted",
        syncRunId: "run-1",
        marketProductId: "mp-1",
        matchConfidence: 0.8,
        matchMethod: "ean",
        matchCandidates: [],
      },
      {
        id: "pq-conflict",
        provider: "castorama",
        providerSku: "C-x",
        ean: null,
        productName: "Conflict",
        unit: "szt",
        grossPrice: 8,
        currency: "PLN",
        sourceUrl: null,
        importedAt: NOW,
        status: "conflict",
        syncRunId: "run-1",
        marketProductId: "mp-1",
        matchConfidence: 0.9,
        matchMethod: "ean",
        matchCandidates: [],
      },
    ],
    syncRuns: [],
  };
}

console.log("=== P2-T01 flag default OFF · P2⇒P1 ===");
forceSmartPricingP1ForTests(null);
forceSmartPricingP2ForTests(null);
assert(SMART_PRICING_P2_DEFAULT === false, "P2-T01 default false");
assert(SMART_PRICING_P2_LS_KEY === "kw-smart-pricing-01-p2", "P2-T01 LS key");
assert(isSmartPricingP2Enabled() === false, "P2-T01 enabled false");
forceSmartPricingP1ForTests(false);
forceSmartPricingP2ForTests(true);
assert(isSmartPricingP2Enabled() === false, "P2-T01 P2 ON ale P1 OFF → false");
forceSmartPricingP1ForTests(true);
forceSmartPricingP2ForTests(true);
assert(isSmartPricingP2Enabled() === true, "P2-T01 P1+P2 ON → true");
forceSmartPricingP1ForTests(null);
forceSmartPricingP2ForTests(null);

console.log("\n=== P2-T02 staging adapter RO ===");
const store = stagingStore();
const fpBefore = marketSyncStagingFingerprint(store, WORK_ID);
const stagingEv = buildEvidenceFromMarketSyncStaging(store, {
  workId: WORK_ID,
  regionCode: REGION,
  lineUnit: "szt",
});
assert(stagingEv.length === 1, "P2-T02 conflict excluded · 1 accepted");
assert(stagingEv[0].source === "market_sync_staging", "P2-T02 source staging");
assert(stagingEv[0].provider === "leroy", "P2-T02 provider leroy");
assert(stagingEv[0].price === 9.5, "P2-T02 price");
assert(fpBefore === marketSyncStagingFingerprint(store, WORK_ID), "P2-T02 staging FP unchanged");
assert(
  buildEvidenceFromMarketSyncStaging(store, { workId: "unmapped", regionCode: REGION }).length ===
    0,
  "P2-T02 unmapped → empty",
);

console.log("\n=== P2-T03 merge pure · deterministic · memory ===");
const w = work(WORK_ID, {
  leroy: { [REGION]: snap({ price: 11, origin: "leroy", confidence: 0.9 }) },
});
const quotesFp = productQuotesFingerprint(w, REGION);
const quotesEv = buildEvidenceFromProductQuotes(w, {
  workId: WORK_ID,
  regionCode: REGION,
  computedAtIso: NOW,
  lineUnit: "szt",
});
const quotesJson = JSON.stringify(quotesEv);
const stagingJson = JSON.stringify(stagingEv);
const merged = mergeSmartPricingEvidence(quotesEv, stagingEv);
assert(merged.length === 2, "P2-T03 merge count 2");
assert(JSON.stringify(quotesEv) === quotesJson, "P2-T03 quotes input immutable");
assert(JSON.stringify(stagingEv) === stagingJson, "P2-T03 staging input immutable");
assert(quotesFp === productQuotesFingerprint(w, REGION), "P2-T03 Quotes FP unchanged");
assert(fpBefore === marketSyncStagingFingerprint(store, WORK_ID), "P2-T03 staging FP unchanged");
const merged2 = mergeSmartPricingEvidence(quotesEv, stagingEv);
assert(JSON.stringify(merged) === JSON.stringify(merged2), "P2-T03 deterministic");

console.log("\n=== P2-T04 Rank B1 Quotes > staging @ equal provider ===");
const ranked = rankEvidence(merged);
assert(ranked[0].source === "product_quotes", "P2-T04 #1 Quotes");
assert(ranked[0].provider === "leroy", "P2-T04 #1 leroy Quotes");
assert(ranked[1].source === "market_sync_staging", "P2-T04 #2 staging");
assert(ranked[1].provider === "leroy", "P2-T04 #2 leroy staging");

console.log("\n=== P2-T05 Confidence staging top → REVIEW ===");
const onlyStaging = rankEvidence(stagingEv);
assert(computeDecisionConfidence(onlyStaging) === "REVIEW", "P2-T05 staging → REVIEW");
assert(computeDecisionConfidence(ranked) === "READY", "P2-T05 Quotes top → READY");

console.log("\n=== P2-T06 extensions P2 ON · P3 OFF ===");
assert(isSmartPricingExtensionAvailable("P2_ms_staging"), "P2-T06 P2 on");
assert(!isSmartPricingExtensionAvailable("P3_save"), "P2-T06 P3 off");
assert(
  SMART_PRICING_EXTENSIONS.find((e) => e.phase === "P2_ms_staging")?.available === true,
  "P2-T06 extension flag",
);

console.log("\n=== P2-T07 static ban write/publish/commit ===");
const banned = [
  "commitMarketQuotesImport",
  "applyMarketQuotesFromPreview",
  "runMarketSyncPublish",
  "saveMarketSyncStagingLocal",
  "pushKeysToCloud",
];
const spDir = join(root, "src/lib/smart-pricing");
for (const f of readdirSync(spDir).filter((n) => n.endsWith(".ts"))) {
  const src = readFileSync(join(spDir, f), "utf8");
  for (const b of banned) {
    // allow mentioning in comments/strings only for test ban lists — ban as code import/call
    if (f === "index.ts" && b === "saveMarketSyncStagingLocal") {
      assert(!src.includes(`from "@/lib/market-sync`) || !src.includes(b), `P2-T07 ${f} bez ${b}`);
      continue;
    }
    assert(!src.includes(b), `P2-T07 lib/${f} bez ${b}`);
  }
}
const stagingSrc = readFileSync(join(spDir, "staging-evidence.ts"), "utf8");
assert(!stagingSrc.includes("saveMarketSyncStagingLocal"), "P2-T07 adapter bez save");
assert(!stagingSrc.includes("localStorage.setItem"), "P2-T07 adapter bez setItem");
const panel = readFileSync(
  join(root, "src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx"),
  "utf8",
);
assert(panel.includes("loadMarketSyncStagingLocal"), "P2-T07 OfferBoq RO load");
assert(!panel.includes("saveMarketSyncStagingLocal"), "P2-T07 OfferBoq bez save staging");
assert(!panel.includes("runMarketSyncPublish"), "P2-T07 OfferBoq bez publish");
assert(!panel.includes("commitMarketQuotesImport"), "P2-T07 OfferBoq bez commit");
assert(
  panel.includes("isSmartPricingP2Enabled") && panel.includes("mergeSmartPricingEvidence"),
  "P2-T07 OfferBoq P2 wire",
);
assert(
  !/SmartPricingEvidencePanelV2|EvidencePanelV2/.test(panel),
  "P2-T07 brak Evidence v2",
);
const uiPanel = readFileSync(
  join(root, "src/app/smart-pricing/SmartPricingEvidencePanel.tsx"),
  "utf8",
);
assert(uiPanel.includes("market_sync_staging") || uiPanel.includes("MS staging"), "P2-T07 label źródła");
assert(!/Zapisz do Product Quotes/.test(uiPanel), "P2-T07 brak Zapisz CTA");

console.log(`\n=== WYNIK P2: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
