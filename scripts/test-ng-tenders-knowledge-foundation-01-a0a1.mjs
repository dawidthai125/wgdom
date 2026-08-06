/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 TS-A0+A1 — unit tests.
 * npx vite-node scripts/test-ng-tenders-knowledge-foundation-01-a0a1.mjs
 */
import {
  COST_KNOWLEDGE_A1_SEED_WORKS,
  FOUNDATION_A1_SEED_WORKS,
  FOUNDATION_FALSE_MAP_PROBES,
  assertAllFoundationA1Hygiene,
  assertCostKnowledgeA1KeywordHygiene,
  assertFalseMapProbeProtected,
  checkLibraryMarketCompatibility,
  classifyFoundationKnowledgeLine,
  evaluateFoundationDecisionPolicy,
  isFalseMapBareProbe,
  summarizeKnowledgeHealth,
} from "../src/lib/cost-knowledge/index.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${msg}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${msg}`);
  }
}

console.log("=== FOUNDATION TS-A0 RULE-C1 ===\n");

const c1ok = checkLibraryMarketCompatibility({
  libraryWorkId: "w1",
  libraryWorkActive: true,
  priceOriginKind: "work_catalog",
  freshness: "ok",
  hasPositiveUnitPrice: true,
});
assert(c1ok.status === "COMPATIBLE", "C1 compatible WC+ok");

const c1stale = checkLibraryMarketCompatibility({
  libraryWorkId: "w1",
  priceOriginKind: "controlled_market",
  freshness: "stale",
  hasPositiveUnitPrice: true,
});
assert(c1stale.status === "DEGRADED", "C1 stale → DEGRADED");

const c1deny = checkLibraryMarketCompatibility({
  libraryWorkId: "w1",
  priceOriginKind: "heuristic",
  freshness: "fresh",
  hasPositiveUnitPrice: true,
});
assert(c1deny.status === "NOT_COMPATIBLE", "C1 heuristic → NOT_COMPATIBLE");

const c1missing = checkLibraryMarketCompatibility({
  libraryWorkId: null,
  priceOriginKind: "work_catalog",
  freshness: "ok",
  hasPositiveUnitPrice: true,
});
assert(c1missing.status === "NOT_READY", "C1 missing work → NOT_READY");

const c1inactive = checkLibraryMarketCompatibility({
  libraryWorkId: "w1",
  libraryWorkActive: false,
  priceOriginKind: "work_catalog",
  freshness: "ok",
  hasPositiveUnitPrice: true,
});
assert(c1inactive.status === "NOT_COMPATIBLE", "C1 inactive → NOT_COMPATIBLE");

console.log("\n=== FOUNDATION TS-A0 Decision Policy ===\n");

const allow = evaluateFoundationDecisionPolicy({
  knowledge: "high",
  price: "high",
  overall: "high",
  priceOriginKind: "work_catalog",
  compatibilityStatus: "COMPATIBLE",
});
assert(allow.decision === "allow_qualify" && allow.mayKnowledgeQualify, "decision allow");

const degrade = evaluateFoundationDecisionPolicy({
  knowledge: "high",
  price: "medium",
  overall: "medium",
  priceOriginKind: "controlled_market",
  compatibilityStatus: "DEGRADED",
});
assert(degrade.decision === "degrade" && !degrade.mayKnowledgeQualify, "decision degrade");

const denyConf = evaluateFoundationDecisionPolicy({
  knowledge: "low",
  price: "high",
  overall: "low",
  priceOriginKind: "work_catalog",
  compatibilityStatus: "COMPATIBLE",
});
assert(denyConf.decision === "deny", "decision deny on low overall");

console.log("\n=== FOUNDATION TS-A0 classify + Health RO ===\n");

const lines = [
  classifyFoundationKnowledgeLine({
    catalogWorkId: "w-ok",
    matchMethod: "alias",
    matchConfidence: "high",
    priceOriginKind: "work_catalog",
    hasPositiveUnitPrice: true,
    freshness: "ok",
  }),
  classifyFoundationKnowledgeLine({
    catalogWorkId: "w-stale",
    matchMethod: "alias",
    matchConfidence: "high",
    priceOriginKind: "controlled_market",
    hasPositiveUnitPrice: true,
    snapshotConfidence01: 0.9,
    freshness: "stale",
  }),
  classifyFoundationKnowledgeLine({
    catalogWorkId: "w-heur",
    matchMethod: "fuzzy",
    matchConfidence: "medium",
    priceOriginKind: "heuristic",
    hasPositiveUnitPrice: true,
    freshness: "ok",
  }),
  classifyFoundationKnowledgeLine({
    catalogWorkId: null,
    matchMethod: "unmatched",
    priceOriginKind: "unknown",
    hasPositiveUnitPrice: false,
  }),
];

assert(lines[0].foundationBucket === "knowledge_qualified", "line0 foundation qualified");
assert(lines[0].foundationQualified === true, "line0 foundationQualified");
assert(lines[1].foundationBucket === "heuristic_priced", "line1 stale demoted");
assert(lines[1].foundationQualified === false, "line1 not foundationQualified");
assert(lines[1].compatibility.status === "DEGRADED", "line1 C1 DEGRADED");
assert(lines[2].foundationQualified === false, "line2 heuristic deny");
assert(lines[3].foundationBucket === "unmapped", "line3 unmapped");

const health = summarizeKnowledgeHealth(lines);
assert(health.foundationQualified === 1, "health foundationQualified=1");
assert(health.compatibility.compatible === 1, "health compatible=1");
assert(health.compatibility.degraded >= 1, "health degraded≥1");
assert(health.decisions.allowQualify === 1, "health allow=1");

console.log("\n=== FOUNDATION TS-A1 Library Depth + hygiene ===\n");

assert(FOUNDATION_A1_SEED_WORKS.length === 5, "5 foundation seeds");
try {
  assertAllFoundationA1Hygiene();
  assert(true, "all foundation hygiene");
} catch (e) {
  assert(false, `foundation hygiene: ${e.message}`);
}
for (const spec of COST_KNOWLEDGE_A1_SEED_WORKS) {
  try {
    assertCostKnowledgeA1KeywordHygiene(spec);
    assert(true, `ck-a1 hygiene still ${spec.id}`);
  } catch (e) {
    assert(false, `ck-a1 hygiene ${spec.id}: ${e.message}`);
  }
}

console.log("\n=== FOUNDATION TS-A1 Match Depth / false-map ===\n");

const keywordByWork = new Map([
  ...COST_KNOWLEDGE_A1_SEED_WORKS.map((w) => [w.id, w.keywords]),
  ...FOUNDATION_A1_SEED_WORKS.map((w) => [w.id, w.keywords]),
]);

for (const probe of FOUNDATION_FALSE_MAP_PROBES) {
  const kws = keywordByWork.get(probe.mustNotMapToWorkId);
  if (!kws) {
    assert(false, `probe ${probe.id}: missing work keywords`);
    continue;
  }
  try {
    assertFalseMapProbeProtected(probe, kws);
    assert(true, `false-map protected ${probe.id}`);
  } catch (e) {
    assert(false, `${probe.id}: ${e.message}`);
  }
  assert(isFalseMapBareProbe(probe.probeSurface, kws) === true, `bare risk ${probe.id}`);
}

assert(isFalseMapBareProbe("tynk cementowo wapienny", ["tynk cementowo wapienny"]) === false, "full phrase not bare probe");

console.log(`\n=== ${passed} PASS / ${failed} FAIL ===`);
if (failed) process.exit(1);
