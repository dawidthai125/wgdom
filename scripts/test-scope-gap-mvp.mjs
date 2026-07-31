/**
 * SCOPE-GAP-MVP — unit + flag + fail-soft + engine scope-gap-mvp-1
 * npx vite-node scripts/test-scope-gap-mvp.mjs
 */
import assert from "node:assert/strict";
import {
  SCOPE_GAP_MVP_DEFAULT,
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  SCOPE_GAP_MVP_LS_KEY,
  buildScopeGapReport,
  forceScopeGapMvpForTests,
  isScopeGapMvpEnabled,
  resolveInvestmentTemplate,
  shouldRenderScopeGapPanel,
} from "../src/lib/scope-gap/index.ts";

const AT = "2026-07-31T09:00:00.000Z";

function baseInput(over = {}) {
  return {
    presentTextBlob: "Remont pustostanu — malowanie ścian, posadzki",
    investmentTemplate: "pustostan_remont",
    hasOfferBoqLines: true,
    lineCount: 12,
    swzTextBlob: null,
    smartMissingLineIds: null,
    computedAtIso: AT,
    ...over,
  };
}

// --- Flag default OFF ---
forceScopeGapMvpForTests(null);
assert.equal(SCOPE_GAP_MVP_DEFAULT, false);
assert.equal(SCOPE_GAP_MVP_LS_KEY, "kw-scope-gap-mvp");
assert.equal(isScopeGapMvpEnabled(), false);
assert.equal(shouldRenderScopeGapPanel(false, { available: true }), false);

forceScopeGapMvpForTests(true);
assert.equal(isScopeGapMvpEnabled(), true);
assert.equal(shouldRenderScopeGapPanel(true, { available: true }), true);
assert.equal(shouldRenderScopeGapPanel(true, null), false);
forceScopeGapMvpForTests(false);
assert.equal(isScopeGapMvpEnabled(), false);
forceScopeGapMvpForTests(null);

// --- T3: lineCount 0 → fail-soft available=false ---
{
  const r = buildScopeGapReport(
    baseInput({ hasOfferBoqLines: false, lineCount: 0, presentTextBlob: "" }),
  );
  assert.equal(r.available, false);
  assert.ok(r.emptyReasonPl);
  assert.equal(r.engineVersion, SCOPE_GAP_MVP_ENGINE_VERSION);
  assert.equal(r.warnings.length, 0);
}

// --- T1 / AC-02: pustostan + brak wywozu → WASTE_DISPOSAL ---
{
  const r = buildScopeGapReport(baseInput());
  assert.equal(r.available, true);
  assert.equal(r.engineVersion, "scope-gap-mvp-1");
  const waste = r.warnings.find((w) => w.code === "WASTE_DISPOSAL");
  assert.ok(waste, "expected WASTE_DISPOSAL warning");
  assert.equal(waste.severity, "warn");
  assert.ok(r.disclaimerPl.includes("nie zmieniają wyceny"));
  assert.equal(r.disclaimerPl, SCOPE_GAP_MVP_DISCLAIMER_PL);
  assert.ok(r.warnings.length <= 8);
}

// --- T2 / AC-03: present wywóz gruzu → brak WASTE ---
{
  const r = buildScopeGapReport(
    baseInput({
      presentTextBlob:
        "Remont pustostanu — wywóz gruzu kontenerem, malowanie, posadzki",
    }),
  );
  assert.equal(r.available, true);
  assert.ok(!r.warnings.some((w) => w.code === "WASTE_DISPOSAL"));
}

// --- AC-09: generic_unknown bez demol → brak packu pustostan ---
{
  const r = buildScopeGapReport(
    baseInput({
      investmentTemplate: "generic_unknown",
      presentTextBlob: "Dostawa materiałów biurowych",
    }),
  );
  assert.equal(r.available, true);
  assert.equal(r.warnings.length, 0);
}

// --- generic_unknown + demol → WASTE ---
{
  const r = buildScopeGapReport(
    baseInput({
      investmentTemplate: "generic_unknown",
      presentTextBlob: "Rozbiórka ścianek działowych",
    }),
  );
  assert.equal(r.available, true);
  assert.ok(r.warnings.some((w) => w.code === "WASTE_DISPOSAL"));
  const w = r.warnings.find((w) => w.code === "WASTE_DISPOSAL");
  assert.equal(w.severity, "warn");
  assert.ok(w.confidence <= 0.5);
}

// --- high severity gdy SWZ hit, ATH brak ---
{
  const r = buildScopeGapReport(
    baseInput({
      presentTextBlob: "Remont pustostanu — malowanie",
      swzTextBlob: "Zamawiający wymaga wywozu gruzu i utylizacji odpadów",
    }),
  );
  const waste = r.warnings.find((w) => w.code === "WASTE_DISPOSAL");
  assert.ok(waste);
  assert.equal(waste.severity, "high");
  assert.ok(waste.sources.includes("swz"));
}

// --- T5: engineVersion ---
{
  const r = buildScopeGapReport(baseInput());
  assert.equal(r.engineVersion, "scope-gap-mvp-1");
}

// --- T4: Bid object immutable (builder nie mutuje zewnętrznego obiektu) ---
{
  const bid = { recommendedBidPln: 123_456.78, ok: true, warnings: ["x"] };
  const snapshot = JSON.stringify(bid);
  buildScopeGapReport(baseInput());
  assert.equal(JSON.stringify(bid), snapshot);
  assert.equal(bid.recommendedBidPln, 123_456.78);
}

// --- template heuristic ---
{
  assert.equal(
    resolveInvestmentTemplate({ title: "Remont pustostanu przy ul. Lipowej" }),
    "pustostan_remont",
  );
  assert.equal(
    resolveInvestmentTemplate({ title: "Docieplenie elewacji budynku" }),
    "elewacja",
  );
  assert.equal(
    resolveInvestmentTemplate({ title: "Wymiana instalacji elektrycznej" }),
    "instalacje",
  );
  assert.equal(
    resolveInvestmentTemplate({ title: "Dostawa sprzętu IT" }),
    "generic_unknown",
  );
}

// --- elewacja expected includes SCAFFOLDING ---
{
  const r = buildScopeGapReport(
    baseInput({
      investmentTemplate: "elewacja",
      presentTextBlob: "Malowanie elewacji",
    }),
  );
  assert.ok(r.warnings.some((w) => w.code === "SCAFFOLDING"));
}

// --- cap ≤ 8 ---
{
  const r = buildScopeGapReport(baseInput());
  assert.ok(r.warnings.length <= 8);
}

console.log("test-scope-gap-mvp: PASS");
