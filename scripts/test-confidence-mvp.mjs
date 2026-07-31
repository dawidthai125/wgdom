/**
 * CONFIDENCE-MVP — unit + flag + fail-soft + formula (confidence-mvp-1)
 * npx vite-node scripts/test-confidence-mvp.mjs
 */
import assert from "node:assert/strict";
import {
  CONFIDENCE_MVP_DEFAULT,
  CONFIDENCE_MVP_DISCLAIMER_PL,
  CONFIDENCE_MVP_FORMULA_VERSION,
  CONFIDENCE_MVP_LS_KEY,
  buildConfidenceReport,
  forceConfidenceMvpForTests,
  isConfidenceMvpEnabled,
  mapAveragePricingConfidence,
  presentConfidenceBadgeModel,
  shouldRenderConfidenceBadge,
} from "../src/lib/confidence-engine/index.ts";

const AT = "2026-07-31T08:00:00.000Z";

function baseInput(over = {}) {
  return {
    lineCount: 100,
    mappedCount: 90,
    quotesPricedCount: 95,
    s7QualityScore: 85,
    averagePricingConfidence: "high",
    smartMissingCount: 5,
    smartMissingUnmappedCount: 2,
    bidOk: true,
    bidWarningCount: 0,
    hasKosztorysSnapshot: true,
    hasSwzSignal: true,
    computedAtIso: AT,
    ...over,
  };
}

// --- Flag default OFF ---
forceConfidenceMvpForTests(null);
assert.equal(CONFIDENCE_MVP_DEFAULT, false);
assert.equal(CONFIDENCE_MVP_LS_KEY, "kw-confidence-mvp");
assert.equal(isConfidenceMvpEnabled(), false);
assert.equal(shouldRenderConfidenceBadge(false, { available: true }), false);

forceConfidenceMvpForTests(true);
assert.equal(isConfidenceMvpEnabled(), true);
assert.equal(shouldRenderConfidenceBadge(true, { available: true }), true);
assert.equal(shouldRenderConfidenceBadge(true, null), false);
forceConfidenceMvpForTests(false);
assert.equal(isConfidenceMvpEnabled(), false);
forceConfidenceMvpForTests(null);

// --- T4: lineCount 0 → unavailable ---
{
  const r = buildConfidenceReport(baseInput({ lineCount: 0 }));
  assert.equal(r.available, false);
  assert.ok(r.emptyReasonPl);
  assert.equal(r.formulaVersion, CONFIDENCE_MVP_FORMULA_VERSION);
}

// --- brak kosztorysu ---
{
  const r = buildConfidenceReport(baseInput({ hasKosztorysSnapshot: false }));
  assert.equal(r.available, false);
}

// --- T1: high quotes/mapped → high or medium-high ---
{
  const r = buildConfidenceReport(baseInput());
  assert.equal(r.available, true);
  assert.equal(r.formulaVersion, "confidence-mvp-1");
  assert.ok(r.score0to100 >= 75, `expected high band score, got ${r.score0to100}`);
  assert.equal(r.band, "high");
  assert.ok(r.drivers.length >= 3 && r.drivers.length <= 5);
  assert.ok(r.disclaimerPl.includes("nie zmienia wyceny"));
  assert.ok(!r.disclaimerPl.toLowerCase().includes("ai quality score") || r.disclaimerPl.includes("S7"));
  assert.equal(r.disclaimerPl, CONFIDENCE_MVP_DISCLAIMER_PL);
}

// --- T2 / AC-06: high quotes > low quotes ---
{
  const high = buildConfidenceReport(baseInput({ quotesPricedCount: 98, mappedCount: 95 }));
  const low = buildConfidenceReport(
    baseInput({
      quotesPricedCount: 60,
      mappedCount: 70,
      s7QualityScore: 70,
      averagePricingConfidence: "medium",
      smartMissingCount: 30,
    }),
  );
  assert.ok(high.available && low.available);
  assert.ok(
    high.score0to100 > low.score0to100,
    `high ${high.score0to100} should beat low ${low.score0to100}`,
  );
}

// --- T3 / AC-07: omit s7 → still available, renormalize ---
{
  const withS7 = buildConfidenceReport(baseInput({ s7QualityScore: 90 }));
  const without = buildConfidenceReport(baseInput({ s7QualityScore: null }));
  assert.equal(without.available, true);
  assert.ok(!without.factorsUsed.includes("s7_quality"));
  assert.ok(withS7.factorsUsed.includes("s7_quality"));
  assert.ok(without.drivers.length >= 3);
}

// --- omit SMART ---
{
  const r = buildConfidenceReport(
    baseInput({ smartMissingCount: null, smartMissingUnmappedCount: null }),
  );
  assert.equal(r.available, true);
  assert.ok(!r.factorsUsed.includes("smart_coverage"));
}

// --- T5: bidOk false → bid_health obniża score; czynnik obecny ---
{
  const ok = buildConfidenceReport(baseInput({ bidOk: true, bidWarningCount: 0 }));
  const bad = buildConfidenceReport(baseInput({ bidOk: false, bidWarningCount: 3 }));
  assert.ok(ok.score0to100 > bad.score0to100);
  assert.ok(bad.factorsUsed.includes("bid_health"));
  // Izolacja wagi Bid: tylko docs + bid → driver (−) w top
  const iso = buildConfidenceReport(
    baseInput({
      lineCount: 10,
      mappedCount: 10,
      quotesPricedCount: 10,
      s7QualityScore: null,
      averagePricingConfidence: null,
      smartMissingCount: null,
      smartMissingUnmappedCount: null,
      bidOk: false,
      bidWarningCount: 0,
      hasSwzSignal: true,
    }),
  );
  const bidDriver = iso.drivers.find((d) => d.id === "bid_health");
  assert.ok(bidDriver, "bid_health should appear when few factors");
  assert.ok(bidDriver.impact < 0);
}

// --- bid warnings ≥2 → 50 ---
{
  const few = buildConfidenceReport(baseInput({ bidOk: true, bidWarningCount: 0 }));
  const many = buildConfidenceReport(baseInput({ bidOk: true, bidWarningCount: 2 }));
  assert.ok(few.score0to100 >= many.score0to100);
}

// --- Badge model ---
{
  const r = buildConfidenceReport(baseInput());
  const m = presentConfidenceBadgeModel(r);
  assert.equal(m.labelPl, "Pewność analizy");
  assert.equal(m.scoreDisplay, `${r.score0to100}/100`);
  assert.equal(m.bandLabelPl, "Wysoka");
  assert.ok(m.titleAttr.includes("S7"));
}

// --- mapAveragePricingConfidence ---
assert.equal(mapAveragePricingConfidence("high"), "high");
assert.equal(mapAveragePricingConfidence("review"), "medium");
assert.equal(mapAveragePricingConfidence("low"), "low");
assert.equal(mapAveragePricingConfidence(null), null);

// --- Invariant: building report does not mutate bid-like object ---
{
  const bid = { ok: true, recommendedBidPln: 123_456, warnings: ["a"] };
  const before = JSON.stringify(bid);
  buildConfidenceReport(
    baseInput({
      bidOk: bid.ok,
      bidWarningCount: bid.warnings.length,
    }),
  );
  assert.equal(JSON.stringify(bid), before);
  assert.equal(bid.recommendedBidPln, 123_456);
}

// --- Exact formula smoke (manual weights) ---
{
  // Only quote(28)+map(22)+docs(5)=55 weights; quotes 100%, map 100%, docs 100 (koszt+swz)
  const r = buildConfidenceReport(
    baseInput({
      lineCount: 10,
      mappedCount: 10,
      quotesPricedCount: 10,
      s7QualityScore: null,
      averagePricingConfidence: null,
      smartMissingCount: null,
      smartMissingUnmappedCount: null,
      bidOk: null,
      bidWarningCount: null,
      hasSwzSignal: true,
    }),
  );
  assert.equal(r.available, true);
  assert.equal(r.score0to100, 100);
  assert.deepEqual(r.factorsUsed.sort(), ["docs", "mapping_coverage", "quote_coverage"].sort());
}

console.log("PASS test-confidence-mvp.mjs");
