/**
 * SCOPE-COMPLETENESS-01 Stage A — unit (engine scope-completeness-a1).
 * npx vite-node scripts/test-scope-completeness-01-a.mjs
 */
import assert from "node:assert/strict";
import {
  SCOPE_COMPLETENESS_A1_ENGINE_VERSION,
  SCOPE_COMPLETENESS_A1_WARNINGS_CAP,
  SCOPE_GAP_MVP_DEFAULT,
  SCOPE_GAP_MVP_LS_KEY,
  buildScopeGapReport,
  buildScopeGapMvpInput,
} from "../src/lib/scope-gap/index.ts";

const AT = "2026-08-07T10:00:00.000Z";

function base(over = {}) {
  return {
    presentTextBlob: "Remont pustostanu — malowanie ścian",
    investmentTemplate: "pustostan_remont",
    hasOfferBoqLines: true,
    lineCount: 4,
    swzTextBlob: null,
    computedAtIso: AT,
    ...over,
  };
}

assert.equal(SCOPE_GAP_MVP_DEFAULT, false);
assert.equal(SCOPE_GAP_MVP_LS_KEY, "kw-scope-gap-mvp");
assert.equal(SCOPE_COMPLETENESS_A1_ENGINE_VERSION, "scope-completeness-a1");
assert.equal(SCOPE_COMPLETENESS_A1_WARNINGS_CAP, 12);

{
  const r = buildScopeGapReport(base());
  assert.equal(r.available, true);
  assert.equal(r.engineVersion, "scope-completeness-a1");
  assert.ok(r.warnings.length <= 12);
  assert.ok(r.warnings.some((w) => w.code === "WASTE_DISPOSAL"));
  assert.ok(r.disclaimerPl.includes("nie zmieniają wyceny"));
}

{
  const r = buildScopeGapReport(
    base({
      presentTextBlob:
        "Remont — wywóz gruzu, demontaż drzwi, zabezpieczenie folią, pomiary instalacji",
    }),
  );
  assert.ok(!r.warnings.some((w) => w.code === "WASTE_DISPOSAL"));
  assert.ok(!r.warnings.some((w) => w.code === "PREP_WORKS"));
  assert.ok(!r.warnings.some((w) => w.code === "PROTECTION"));
  assert.ok(!r.warnings.some((w) => w.code === "MEASUREMENTS"));
}

{
  const r = buildScopeGapReport(
    base({ hasOfferBoqLines: false, lineCount: 0, presentTextBlob: "" }),
  );
  assert.equal(r.available, false);
  assert.equal(r.engineVersion, "scope-completeness-a1");
}

{
  const r = buildScopeGapReport(
    base({
      investmentTemplate: "elewacja",
      presentTextBlob: "Docieplenie ścian",
      swzTextBlob: "Wymagane rusztowania i zajęcie pasa ruchu",
    }),
  );
  const sc = r.warnings.find((w) => w.code === "SCAFFOLDING");
  assert.ok(sc);
  assert.equal(sc.severity, "high");
}

{
  const input = buildScopeGapMvpInput({
    doc: {
      lines: [
        { description: "Malowanie", workCategory: "wykończenia" },
        { description: "Posadzka", workCategory: "" },
      ],
    },
    item: { title: "Remont pustostanu WM", priorityBuyerLabel: null, swzAnalysis: null },
    computedAtIso: AT,
  });
  assert.equal(input.investmentTemplate, "pustostan_remont");
  assert.ok(!("smartMissingLineIds" in input));
  const r = buildScopeGapReport(input);
  assert.equal(r.engineVersion, "scope-completeness-a1");
}

{
  const bid = { recommendedBidPln: 999_999 };
  const snap = JSON.stringify(bid);
  buildScopeGapReport(base());
  assert.equal(JSON.stringify(bid), snap);
}

console.log("test-scope-completeness-01-a: PASS");
