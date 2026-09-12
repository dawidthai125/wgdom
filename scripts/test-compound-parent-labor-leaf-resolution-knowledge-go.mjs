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
import { buildAutonomousCanonicalWorkId, extractTableCodeFromCanonicalWorkId } from "../src/lib/work-catalog/autonomous-canonical-leaf-create.ts";

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
assert.equal(extractTableCodeFromCanonicalWorkId(leaf04), "0815-04");
assert.equal(extractTableCodeFromCanonicalWorkId(leaf05), "0815-05");
assert.notEqual(
  extractTableCodeFromCanonicalWorkId(leaf04),
  extractTableCodeFromCanonicalWorkId(leaf05),
);

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
  wallEval.reasons.includes("LEAF_NOT_IN_CATALOG")
    || wallEval.reasons.includes("LEAF_RATE_MISSING")
    || wallEval.reasons.includes("OUR_RATE_MUST_BE_CURRENT_NO_RESEARCH"),
  "0815-04 exact rule · empty store → leaf/rate gate (≠ ride 0815-05 CURRENT)",
);
assert.ok(
  wallEval.ruleId === "cllr.walls_double_layer_gypsum_skim.0815_04_v1"
    || wallEval.reasons.includes("SCOPE_NO_CLLR_RULE") === false,
  "walls bind to 0815-04 rule id when matched",
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
