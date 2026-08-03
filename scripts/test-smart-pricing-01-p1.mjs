/**
 * SMART-PRICING-01 P1 — Evidence · Rank · Confidence · One-shot · Odrzuć.
 * Uruchom: npx vite-node scripts/test-smart-pricing-01-p1.mjs
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SMART_PRICING_DEFAULT_PROVIDER_RANK,
  SMART_PRICING_EXTENSIONS,
  SMART_PRICING_P1_DEFAULT,
  SMART_PRICING_P1_LS_KEY,
  buildEvidenceFromProductQuotes,
  clearOneShotForLine,
  computeDecisionConfidence,
  createOneShotOverlay,
  forceSmartPricingP1ForTests,
  isSmartPricingExtensionAvailable,
  isSmartPricingP1Enabled,
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

function work(id, quotes, unit = "szt") {
  return {
    id,
    tradeId: "inne",
    namePl: `Robota ${id}`,
    unit,
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

console.log("=== P1-T01 flag default OFF ===");
forceSmartPricingP1ForTests(null);
assert(SMART_PRICING_P1_DEFAULT === false, "P1-T01 default false");
assert(SMART_PRICING_P1_LS_KEY === "kw-smart-pricing-01-p1", "P1-T01 LS key");
assert(isSmartPricingP1Enabled() === false, "P1-T01 enabled false (no LS override)");
forceSmartPricingP1ForTests(true);
assert(isSmartPricingP1Enabled() === true, "P1-T01 force ON");
forceSmartPricingP1ForTests(false);
assert(isSmartPricingP1Enabled() === false, "P1-T01 force OFF");
forceSmartPricingP1ForTests(null);

console.log("\n=== P1-T02 Evidence from Product Quotes RO ===");
const wMulti = work("w-multi", {
  castorama: { [REGION]: snap({ price: 12, confidence: 0.9, origin: "castorama" }) },
  wgdom: { [REGION]: snap({ price: 11, confidence: 0.88, origin: "wgdom" }) },
  leroy: { [REGION]: snap({ price: 10.5, confidence: 0.86, origin: "leroy" }) },
});
const fpBefore = productQuotesFingerprint(wMulti, REGION);
const evidence = buildEvidenceFromProductQuotes(wMulti, {
  workId: "w-multi",
  regionCode: REGION,
  computedAtIso: NOW,
  lineUnit: "szt",
});
assert(evidence.length === 3, "P1-T02 evidence count 3");
assert(
  evidence.every((e) => e.source === "product_quotes"),
  "P1-T02 source=product_quotes only",
);
assert(
  evidence.every((e) => e.matchMethod === "direct_work_quote"),
  "P1-T02 matchMethod direct_work_quote",
);
assert(
  evidence.every((e) => e.currency === "PLN" && e.price > 0),
  "P1-T02 PLN + price>0",
);
const fpAfterBuild = productQuotesFingerprint(wMulti, REGION);
assert(fpBefore === fpAfterBuild, "P1-T02 Quotes FP unchanged after Evidence build");

console.log("\n=== P1-T03 Rank = sort only (O-SP-G) ===");
const ranked = rankEvidence(evidence);
assert(ranked[0].provider === "wgdom", "P1-T03 #1 wgdom");
assert(ranked[1].provider === "leroy", "P1-T03 #2 leroy");
assert(ranked[2].provider === "castorama", "P1-T03 #3 castorama");
assert(
  SMART_PRICING_DEFAULT_PROVIDER_RANK[0] === "wgdom",
  "P1-T03 default rank starts wgdom",
);
const payloadBefore = JSON.stringify(evidence.map((e) => ({ ...e })));
rankEvidence(evidence);
const payloadAfter = JSON.stringify(evidence.map((e) => ({ ...e })));
assert(payloadBefore === payloadAfter, "P1-T03 input Evidence immutable");

console.log("\n=== P1-T04 Decision Confidence RO ===");
assert(computeDecisionConfidence([]) === "MANUAL", "P1-T04 empty → MANUAL");
assert(
  computeDecisionConfidence(ranked, { unmapped: true }) === "MANUAL",
  "P1-T04 unmapped → MANUAL",
);
assert(computeDecisionConfidence(ranked) === "READY", "P1-T04 strong Quotes → READY");
const reviewEv = [
  {
    id: "ev:r",
    source: "product_quotes",
    provider: "wgdom",
    price: 9,
    currency: "PLN",
    acquiredAt: NOW,
    confidence: 0.65,
    matchMethod: "direct_work_quote",
    matchDetail: "x",
    region: REGION,
  },
];
assert(computeDecisionConfidence(reviewEv) === "REVIEW", "P1-T04 0.65 → REVIEW");
const manualEv = [
  {
    id: "ev:m",
    source: "product_quotes",
    provider: "wgdom",
    price: 9,
    currency: "PLN",
    acquiredAt: NOW,
    confidence: 0.4,
    matchMethod: "direct_work_quote",
    matchDetail: "x",
    region: REGION,
  },
];
assert(computeDecisionConfidence(manualEv) === "MANUAL", "P1-T04 low conf → MANUAL");

console.log("\n=== P1-T05 One-shot session · Quotes FP (K-SP-1a) ===");
const conf = computeDecisionConfidence(ranked);
const overlay = createOneShotOverlay({
  lineId: "L1",
  tenderId: "t1",
  evidence: ranked[0],
  appliedAtIso: NOW,
  confidence: conf,
});
assert(overlay != null, "P1-T05 overlay created");
assert(overlay.price === ranked[0].price, "P1-T05 price from Evidence");
assert(overlay.currency === "PLN", "P1-T05 PLN");
const fpAfterOneShot = productQuotesFingerprint(wMulti, REGION);
assert(fpBefore === fpAfterOneShot, "P1-T05 K-SP-1a Quotes FP unchanged");

const manualBlock = createOneShotOverlay({
  lineId: "L1",
  evidence: ranked[0],
  appliedAtIso: NOW,
  confidence: "MANUAL",
  explicitSelection: false,
});
assert(manualBlock === null, "P1-T05 MANUAL bez explicit → null");
const manualOk = createOneShotOverlay({
  lineId: "L1",
  evidence: ranked[0],
  appliedAtIso: NOW,
  confidence: "MANUAL",
  explicitSelection: true,
});
assert(manualOk != null, "P1-T05 MANUAL + explicit → overlay");

console.log("\n=== P1-T06 Odrzuć — clear map · 0 Quotes side-effect ===");
const map1 = { L1: overlay, L2: { ...overlay, lineId: "L2" } };
const map2 = clearOneShotForLine(map1, "L1");
assert(!("L1" in map2), "P1-T06 L1 cleared");
assert("L2" in map2, "P1-T06 L2 kept");
assert("L1" in map1, "P1-T06 input map not mutated");
assert(fpBefore === productQuotesFingerprint(wMulti, REGION), "P1-T06 Quotes FP still same");

console.log("\n=== P1-T07 extensions P1 ON · P2/P3 OFF ===");
assert(isSmartPricingExtensionAvailable("P1_evidence"), "P1-T07 P1_evidence");
assert(isSmartPricingExtensionAvailable("P1_one_shot"), "P1-T07 P1_one_shot");
assert(!isSmartPricingExtensionAvailable("P2_ms_staging"), "P1-T07 P2 off");
assert(!isSmartPricingExtensionAvailable("P3_save"), "P1-T07 P3 off");
const p1 = SMART_PRICING_EXTENSIONS.filter((e) => e.phase.startsWith("P1_"));
assert(p1.every((e) => e.available === true), "P1-T07 all P1 available");

console.log("\n=== P1-T08 static ban: commit / apply / Cloud / Zapisz CTA ===");
const banned = [
  "commitMarketQuotesImport",
  "applyMarketQuotesFromPreview",
  "runMarketSyncPublish",
  "pushKeysToCloud",
];
const spDir = join(root, "src/lib/smart-pricing");
for (const f of readdirSync(spDir).filter((n) => n.endsWith(".ts"))) {
  const src = readFileSync(join(spDir, f), "utf8");
  for (const b of banned) {
    assert(!src.includes(b), `P1-T08 lib/${f} bez ${b}`);
  }
  assert(!src.includes("Zapisz do Product Quotes"), `P1-T08 lib/${f} bez Zapisz CTA`);
}
const uiFiles = [
  "SmartPricingDetectBanner.tsx",
  "SmartPricingEvidencePanel.tsx",
];
for (const f of uiFiles) {
  const src = readFileSync(join(root, "src/app/smart-pricing", f), "utf8");
  for (const b of banned) {
    assert(!src.includes(b), `P1-T08 ui/${f} bez ${b}`);
  }
  assert(!/Zapisz do Product Quotes/.test(src), `P1-T08 ui/${f} bez Zapisz CTA`);
}
const panel = readFileSync(
  join(root, "src/app/kosztorys/OfferBoqCostIntelligencePanel.tsx"),
  "utf8",
);
for (const b of banned) {
  assert(!panel.includes(b), `P1-T08 OfferBoq bez ${b}`);
}
assert(
  !/localStorage\.setItem\([^)]*smart-pricing-01/.test(panel),
  "P1-T08 OfferBoq: no smart-pricing LS setItem",
);
assert(
  panel.includes("isSmartPricingP1Enabled") && panel.includes("SmartPricingEvidencePanel"),
  "P1-T08 OfferBoq thin P1 wire present",
);
assert(
  !panel.includes("tenders-bid-calculator") &&
    !/from ["']@\/lib\/tenders-bid-calculator/.test(panel),
  "P1-T08 OfferBoq bez Bid rewrite import",
);

console.log("\n=== P1-T09 One-shot zero LS keys in one-shot module ===");
const oneShotSrc = readFileSync(join(spDir, "one-shot.ts"), "utf8");
assert(!oneShotSrc.includes("localStorage"), "P1-T09 one-shot.ts bez localStorage");
assert(!oneShotSrc.includes("sessionStorage"), "P1-T09 one-shot.ts bez sessionStorage");

console.log(`\n=== WYNIK P1: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
