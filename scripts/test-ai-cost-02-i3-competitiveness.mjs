/**
 * AI-COST-02-I3 — Competitiveness RO · flag · bands · CK hint
 * Uruchom: npx vite-node scripts/test-ai-cost-02-i3-competitiveness.mjs
 */
import assert from "node:assert/strict";
import {
  AI_COST_02_I3_COMPETITIVENESS_DEFAULT,
  AI_COST_02_I3_COMPETITIVENESS_LS_KEY,
  forceAiCost02I3CompetitivenessForTests,
  isAiCost02I3CompetitivenessEnabled,
} from "../src/lib/ai-cost-02-i3-flag.ts";
import {
  I3_BAND_HALF_PCT,
  I3_OUTLIER_PCT,
  buildI3CompetitivenessView,
  classifyI3Band,
  i3BandLabelPl,
} from "../src/lib/ai-cost-02-i3-competitiveness.ts";
import {
  AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT,
  forceAiCost02bExplainQueueForTests,
  isAiCost02bExplainQueueEnabled,
} from "../src/lib/ai-cost-02-b-flag.ts";

const FIXED_AT = "2026-08-03T09:00:00.000Z";
const WORK_ID = "wc-i3-market";
const MARKET_UNIT = 100;

function workWithQuotes(price = MARKET_UNIT) {
  return {
    id: WORK_ID,
    tradeId: "inne",
    namePl: "Robota I3",
    unit: "m2",
    companyPricePln: 80,
    marketQuotes: {
      sekocenbud: {
        wroclaw: {
          price,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: FIXED_AT,
          confidence: 0.9,
          origin: "sekocenbud",
        },
      },
    },
    updatedAt: FIXED_AT,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function lineStub(opts) {
  const {
    lineId = "L1",
    quantity = 10,
    lineDirectPln = 1000,
    catalogWorkId = WORK_ID,
    components = [],
  } = opts;
  return {
    lineId,
    lp: "1",
    description: `Linia ${lineId}`,
    quantity,
    quantityRaw: String(quantity),
    unit: "m2",
    catalogWorkId,
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "none",
    matchedBy: "none",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: {
      components,
      aggregates: {
        materialsPln: null,
        laborPln: null,
        equipmentPln: null,
        transportPln: null,
        auxiliaryPln: null,
        lineDirectPln,
      },
      pricedAt: FIXED_AT,
      confidence: "medium",
      aiRationale: "test",
      componentCount: components.length,
      pricedComponentCount: components.length,
    },
    material: null,
    labor: null,
    equipment: null,
    kp: null,
    margin: null,
    lineTotal: null,
    warnings: [],
    aiConfidence: "medium",
    aiRationale: "test",
    requiresUserReview: false,
  };
}

function cmComponent(unitPricePln) {
  return {
    componentId: "c-cm",
    namePl: "CM",
    category: "material",
    quantity: 1,
    unit: "m2",
    unitPricePln,
    totalPln: unitPricePln,
    priceOrigin: { kind: "controlled_market", labelPl: "CM" },
    confidence: "medium",
    aiRationale: "cm",
    requiresUserReview: false,
    controlledMarketHint: {
      used: true,
      workId: WORK_ID,
      regionCode: "wroclaw",
      regionLabelPl: "Wrocław",
      asOf: FIXED_AT,
      originCount: 1,
      legacyFallbackUsed: false,
    },
  };
}

function ckComponent() {
  return {
    componentId: "c-ck",
    namePl: "CK",
    category: "material",
    quantity: 1,
    unit: "m2",
    unitPricePln: 50,
    totalPln: 50,
    priceOrigin: { kind: "company_knowledge", labelPl: "CK" },
    confidence: "medium",
    aiRationale: "ck",
    requiresUserReview: false,
    companyKnowledgeHint: {
      used: true,
      entryId: "ck_1",
      occurrenceCount: 3,
      lastUsedAt: FIXED_AT,
      confidenceBoosted: false,
    },
  };
}

let passed = 0;
function ok(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

console.log("AI-COST-02-I3 smoke");

// --- Flag default OFF ---
forceAiCost02I3CompetitivenessForTests(null);
assert.equal(AI_COST_02_I3_COMPETITIVENESS_DEFAULT, false);
assert.equal(AI_COST_02_I3_COMPETITIVENESS_LS_KEY, "kw-ai-cost-02-i3-competitiveness");
assert.equal(isAiCost02I3CompetitivenessEnabled(), false);
forceAiCost02I3CompetitivenessForTests(true);
assert.equal(isAiCost02I3CompetitivenessEnabled(), true);
forceAiCost02I3CompetitivenessForTests(false);
assert.equal(isAiCost02I3CompetitivenessEnabled(), false);
forceAiCost02I3CompetitivenessForTests(null);
ok("flag default OFF · LS key · test override");

// --- 02-B still default OFF (parity / no rewrite) ---
forceAiCost02bExplainQueueForTests(null);
assert.equal(AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT, false);
assert.equal(isAiCost02bExplainQueueEnabled(), false);
ok("02-B flag untouched · default OFF");

// --- Thresholds frozen ---
assert.equal(I3_BAND_HALF_PCT, 10);
assert.equal(I3_OUTLIER_PCT, 25);
assert.equal(classifyI3Band(0).band, "in_band");
assert.equal(classifyI3Band(10).band, "in_band");
assert.equal(classifyI3Band(-10).band, "in_band");
assert.equal(classifyI3Band(10.01).band, "above_market");
assert.equal(classifyI3Band(-10.01).band, "below_market");
assert.equal(classifyI3Band(12).isOutlier, false);
assert.equal(classifyI3Band(30).isOutlier, true);
assert.equal(classifyI3Band(null).band, "no_benchmark");
assert.equal(i3BandLabelPl("above_market", true), "Powyżej rynku · outlier");
ok("BAND_HALF_PCT=10 · OUTLIER_PCT=25 · labels");

// --- in_band (offer ≈ market) ---
{
  const view = buildI3CompetitivenessView({
    doc: { lines: [lineStub({ lineDirectPln: 1000, quantity: 10 })] }, // unit 100
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "in_band");
  assert.equal(view.lines[0].marketSource, "market_quotes");
  assert.ok(Math.abs(view.lines[0].deltaPct) < 0.01);
  assert.equal(view.summary.inBand, 1);
  ok("in_band when offer ≈ marketQuotes");
}

// --- above + outlier ---
{
  const view = buildI3CompetitivenessView({
    doc: { lines: [lineStub({ lineDirectPln: 1300, quantity: 10 })] }, // unit 130 = +30%
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "above_market");
  assert.equal(view.lines[0].isOutlier, true);
  assert.equal(view.summary.outlierCount, 1);
  ok("above_market + outlier at +30%");
}

// --- above not outlier (+12%) ---
{
  const view = buildI3CompetitivenessView({
    doc: { lines: [lineStub({ lineDirectPln: 1120, quantity: 10 })] },
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "above_market");
  assert.equal(view.lines[0].isOutlier, false);
  ok("above_market without outlier at +12%");
}

// --- below ---
{
  const view = buildI3CompetitivenessView({
    doc: { lines: [lineStub({ lineDirectPln: 800, quantity: 10 })] },
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "below_market");
  ok("below_market at −20%");
}

// --- no_benchmark (no quotes) — NEVER above_market ---
{
  const bare = { ...workWithQuotes(), marketQuotes: undefined, id: "wc-bare" };
  const view = buildI3CompetitivenessView({
    doc: {
      lines: [lineStub({ catalogWorkId: "wc-bare", lineDirectPln: 5000, quantity: 10 })],
    },
    works: [bare],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "no_benchmark");
  assert.equal(view.lines[0].deltaPct, null);
  assert.equal(view.summary.noBenchmark, 1);
  assert.equal(view.summary.above, 0);
  ok("no_benchmark when brak Quotes (nie above_market)");
}

// --- secondary controlled_market when PRIMARY brak ---
{
  const bare = { ...workWithQuotes(), marketQuotes: undefined, id: WORK_ID };
  const view = buildI3CompetitivenessView({
    doc: {
      lines: [
        lineStub({
          lineDirectPln: 1100,
          quantity: 10,
          components: [cmComponent(100)],
        }),
      ],
    },
    works: [bare],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].marketSource, "controlled_market");
  assert.equal(view.lines[0].band, "in_band");
  assert.equal(view.lines[0].controlledMarketUsed, true);
  ok("SECONDARY controlled_market when marketQuotes brak");
}

// --- CK hint RO — does not drive band ---
{
  const view = buildI3CompetitivenessView({
    doc: {
      lines: [
        lineStub({
          lineDirectPln: 1000,
          quantity: 10,
          components: [ckComponent()],
        }),
      ],
    },
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].ckHint.present, true);
  assert.equal(view.lines[0].band, "in_band");
  assert.ok(view.lines[0].ckHint.labelPl?.includes("Wiedza firmy"));
  ok("CK = RO hint only · band z marketQuotes");
}

// --- summary + sort by lineDirect ---
{
  const view = buildI3CompetitivenessView({
    doc: {
      lines: [
        lineStub({ lineId: "S", lineDirectPln: 100, quantity: 1 }),
        lineStub({ lineId: "L", lineDirectPln: 900, quantity: 9 }),
      ],
    },
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].lineId, "L");
  assert.equal(view.summary.lineCount, 2);
  assert.equal(view.summary.withBenchmark, 2);
  ok("summary · sort lineDirect ↓");
}

// --- quantity <= 0 → no_benchmark ---
{
  const view = buildI3CompetitivenessView({
    doc: { lines: [lineStub({ quantity: 0, lineDirectPln: 0 })] },
    works: [workWithQuotes(100)],
    builtAt: FIXED_AT,
    startRegionCode: "wroclaw",
    computedAtIso: FIXED_AT,
  });
  assert.equal(view.lines[0].band, "no_benchmark");
  ok("quantity≤0 → no_benchmark");
}

// --- UI gate matrix (logic only — UI requires both) ---
{
  forceAiCost02I3CompetitivenessForTests(true);
  forceAiCost02bExplainQueueForTests(false);
  const uiWouldShow =
    isAiCost02I3CompetitivenessEnabled() && isAiCost02bExplainQueueEnabled();
  assert.equal(uiWouldShow, false);
  forceAiCost02bExplainQueueForTests(true);
  assert.equal(
    isAiCost02I3CompetitivenessEnabled() && isAiCost02bExplainQueueEnabled(),
    true,
  );
  forceAiCost02I3CompetitivenessForTests(null);
  forceAiCost02bExplainQueueForTests(null);
  ok("UI gate I3∧02-B");
}

console.log(`\nPASS ${passed} checks · AI-COST-02-I3`);
