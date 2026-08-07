/**
 * SCOPE-GAP-MVP — unit + flag + fail-soft + engine scope-gap-mvp-1 (compat).
 * Prod builder = buildScopeGapReport (a1). Compat = buildScopeGapReportMvp1.
 * npx vite-node scripts/test-scope-gap-mvp.mjs
 */
import assert from "node:assert/strict";
import {
  SCOPE_GAP_MVP_DEFAULT,
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  SCOPE_GAP_MVP_LS_KEY,
  buildScopeGapReportMvp1,
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
    computedAtIso: AT,
    ...over,
  };
}

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

{
  const r = buildScopeGapReportMvp1(
    baseInput({ hasOfferBoqLines: false, lineCount: 0, presentTextBlob: "" }),
  );
  assert.equal(r.available, false);
  assert.ok(r.emptyReasonPl);
  assert.equal(r.engineVersion, SCOPE_GAP_MVP_ENGINE_VERSION);
  assert.equal(r.warnings.length, 0);
}

{
  const r = buildScopeGapReportMvp1(baseInput());
  assert.equal(r.available, true);
  assert.equal(r.engineVersion, "scope-gap-mvp-1");
  const waste = r.warnings.find((w) => w.code === "WASTE_DISPOSAL");
  assert.ok(waste, "expected WASTE_DISPOSAL warning");
  assert.equal(waste.severity, "warn");
  assert.ok(r.disclaimerPl.includes("nie zmieniają wyceny"));
  assert.equal(r.disclaimerPl, SCOPE_GAP_MVP_DISCLAIMER_PL);
  assert.ok(r.warnings.length <= 8);
}

{
  const r = buildScopeGapReportMvp1(
    baseInput({
      presentTextBlob:
        "Remont pustostanu — wywóz gruzu kontenerem, malowanie, posadzki",
    }),
  );
  assert.equal(r.available, true);
  assert.ok(!r.warnings.some((w) => w.code === "WASTE_DISPOSAL"));
}

{
  const r = buildScopeGapReportMvp1(
    baseInput({
      investmentTemplate: "generic_unknown",
      presentTextBlob: "Dostawa materiałów biurowych",
    }),
  );
  assert.equal(r.available, true);
  assert.equal(r.warnings.length, 0);
}

{
  const r = buildScopeGapReportMvp1(
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

{
  const r = buildScopeGapReportMvp1(
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

{
  const r = buildScopeGapReportMvp1(baseInput());
  assert.equal(r.engineVersion, "scope-gap-mvp-1");
}

{
  const bid = { recommendedBidPln: 123_456.78, ok: true, warnings: ["x"] };
  const snapshot = JSON.stringify(bid);
  buildScopeGapReportMvp1(baseInput());
  assert.equal(JSON.stringify(bid), snapshot);
  assert.equal(bid.recommendedBidPln, 123_456.78);
}

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

{
  const r = buildScopeGapReportMvp1(
    baseInput({
      investmentTemplate: "elewacja",
      presentTextBlob: "Malowanie elewacji",
    }),
  );
  assert.ok(r.warnings.some((w) => w.code === "SCAFFOLDING"));
}

{
  const r = buildScopeGapReportMvp1(baseInput());
  assert.ok(r.warnings.length <= 8);
}

console.log("test-scope-gap-mvp: PASS");
