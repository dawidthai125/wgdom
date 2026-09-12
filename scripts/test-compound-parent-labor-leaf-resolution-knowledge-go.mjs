/**
 * Knowledge regression — COMPOUND parent rate-gap policy (TPI/729 ×27 GO).
 * Docs: docs/architecture/COMPOUND-PARENT-LABOR-LEAF-RESOLUTION-V1.md
 *
 * npx vite-node scripts/test-compound-parent-labor-leaf-resolution-knowledge-go.mjs
 */
import assert from "node:assert/strict";
import {
  evaluateCompoundToLaborLeafRebind,
  isCeilingSingleLayerGypsumSkimActivity,
  CLLR_LEAF_0815_05,
} from "../src/lib/intelligent-estimator/orchestra/compound-to-labor-leaf-rebind-contract.ts";
import { buildAutonomousCanonicalWorkId } from "../src/lib/work-catalog/autonomous-canonical-leaf-create.ts";

const RULE_LEAF_FIRST = "COMPOUND_PARENT_RATE_GAP → RESOLVE_CANONICAL_LABOR_LEAF_FIRST";
const RULE_NORM_NE_RATE = "KNR_LABOR_NORM != OUR_RATE_PLN";

assert.equal(typeof RULE_LEAF_FIRST, "string");
assert.equal(typeof RULE_NORM_NE_RATE, "string");
assert.ok(RULE_LEAF_FIRST.includes("RESOLVE_CANONICAL_LABOR_LEAF_FIRST"));
assert.ok(RULE_NORM_NE_RATE.includes("!="));

// 0815-05 ceiling vs 0815-04 walls — scope gate (pattern closed; residual walls HOLD)
assert.equal(
  isCeilingSingleLayerGypsumSkimActivity(
    "Wewnętrzne gładzie gipsowe jednowarstwowe na sufitach 0815-05",
  ),
  true,
);
assert.equal(
  isCeilingSingleLayerGypsumSkimActivity(
    "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach 0815-04",
  ),
  false,
);

const leaf04 = buildAutonomousCanonicalWorkId({
  catalogFamilyPrefix: "KNR 2-02",
  tableCode: "0815-04",
  unit: "m2",
});
const leaf05 = buildAutonomousCanonicalWorkId({
  catalogFamilyPrefix: "KNR 2-02",
  tableCode: "0815-05",
  unit: "m2",
});
assert.equal(leaf05, CLLR_LEAF_0815_05);
assert.equal(leaf04, "cw.knr.knr-2-02.0815-04.m2");
assert.notEqual(leaf04, leaf05);

// Empty store → walls compound NEVER ACCEPT (no invent path)
const emptyStore = {
  version: 1,
  activeRegion: "wroclaw",
  catalogs: {
    wroclaw: { works: [], updatedAt: new Date().toISOString() },
    dolnyslask: { works: [], updatedAt: new Date().toISOString() },
  },
};

const wallEval = evaluateCompoundToLaborLeafRebind({
  line: {
    id: "t_wall",
    description: "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach 0815-04",
    normalizedDescription:
      "Wewnętrzne gładzie gipsowe dwuwarstwowe na ścianach 0815-04",
    unit: "m2",
    quantity: 1,
    catalogWorkId: "legacy-gladzie_tynki-m2",
    matchMethod: "manual",
    matchConfidence: "high",
  },
  store: emptyStore,
  nowMs: Date.now(),
  parentWorkId: "legacy-gladzie_tynki-m2",
});
assert.equal(wallEval.decision, "COMPOUND_LEAF_REBIND_EXCEPTION");
assert.ok(
  wallEval.reasons.includes("SCOPE_NOT_CEILING_SINGLE_LAYER_GYPSUM_SKIM"),
  "0815-04 must not ride 0815-05 CLLR rule",
);

// Floor panel character must not share ceiling leaf id
const floorLeaf = buildAutonomousCanonicalWorkId({
  catalogFamilyPrefix: "KNNR 2",
  tableCode: "1205-09",
  unit: "m2",
});
assert.equal(floorLeaf, "cw.knr.knnr-2.1205-09.m2");
assert.notEqual(floorLeaf, CLLR_LEAF_0815_05);

console.log("PASS test-compound-parent-labor-leaf-resolution-knowledge-go");
console.log(
  JSON.stringify(
    {
      rules: [RULE_LEAF_FIRST, RULE_NORM_NE_RATE],
      leaf04,
      leaf05,
      floorLeaf,
      wallDecision: wallEval.decision,
    },
    null,
    2,
  ),
);
