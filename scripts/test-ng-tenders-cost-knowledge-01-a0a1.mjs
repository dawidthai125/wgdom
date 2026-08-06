/**
 * NG-TENDERS-COST-KNOWLEDGE-01 A0+A1 — unit tests (pure + fixture ops smoke).
 * npx vite-node scripts/test-ng-tenders-cost-knowledge-01-a0a1.mjs
 */
import {
  COST_KNOWLEDGE_A1_SEED_WORKS,
  COST_KNOWLEDGE_TV01_BASELINE,
  assertCostKnowledgeA1KeywordHygiene,
  classifyCostKnowledgeLineKpi,
  deriveKnowledgeConfidence,
  deriveOverallConfidence,
  derivePriceConfidence,
  isKnowledgeKpiQualified,
  summarizeCostKnowledgeKpi,
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

console.log("=== NG-TENDERS-COST-KNOWLEDGE-01 A0 confidence ===\n");

assert(deriveKnowledgeConfidence({ catalogWorkId: null }) === "low", "knowledge unmapped → low");
assert(
  deriveKnowledgeConfidence({ catalogWorkId: "w1", matchMethod: "alias", matchConfidence: "high" }) ===
    "high",
  "knowledge alias high",
);
assert(
  derivePriceConfidence({ priceOriginKind: "heuristic", hasPositiveUnitPrice: true }) === "low",
  "price heuristic → low",
);
assert(
  derivePriceConfidence({
    priceOriginKind: "controlled_market",
    hasPositiveUnitPrice: true,
    snapshotConfidence01: 0.9,
    coverage: "full",
    freshness: "fresh",
  }) === "high",
  "price Quotes high",
);
assert(
  deriveOverallConfidence({
    knowledge: "high",
    price: "high",
    priceOriginKind: "heuristic",
  }) === "low",
  "overall deny heuristic",
);
assert(
  deriveOverallConfidence({
    knowledge: "high",
    price: "high",
    priceOriginKind: "work_catalog",
  }) === "high",
  "overall WC high",
);
assert(
  isKnowledgeKpiQualified({ overall: "medium", priceOriginKind: "controlled_market" }) === true,
  "kpi qualified Quotes medium",
);
assert(
  isKnowledgeKpiQualified({ overall: "high", priceOriginKind: "company_model" }) === false,
  "kpi deny company_model",
);

console.log("\n=== A0 buckets ===\n");

const rows = [
  classifyCostKnowledgeLineKpi({
    catalogWorkId: "a",
    matchMethod: "alias",
    matchConfidence: "high",
    priceOriginKind: "work_catalog",
    hasPositiveUnitPrice: true,
    freshness: "ok",
  }),
  classifyCostKnowledgeLineKpi({
    catalogWorkId: null,
    matchMethod: "unmatched",
    priceOriginKind: "heuristic",
    hasPositiveUnitPrice: true,
  }),
  classifyCostKnowledgeLineKpi({
    catalogWorkId: null,
    matchMethod: "unmatched",
    priceOriginKind: "unknown",
    hasPositiveUnitPrice: false,
  }),
];
assert(rows[0].bucket === "knowledge_qualified", "bucket qualified");
assert(rows[1].bucket === "unmapped" || rows[1].bucket === "heuristic_priced", "bucket heuristic/unmapped");
assert(rows[2].bucket === "unmapped", "bucket unmapped");
const sum = summarizeCostKnowledgeKpi(rows);
assert(sum.totalLines === 3, "summary total");
assert(sum.knowledgeQualified === 1, "summary qualified=1");
assert(COST_KNOWLEDGE_TV01_BASELINE.quotesPct === 78.1, "baseline 78.1");

console.log("\n=== A1 seed hygiene ===\n");

assert(COST_KNOWLEDGE_A1_SEED_WORKS.length === 5, "5 seed works");
for (const spec of COST_KNOWLEDGE_A1_SEED_WORKS) {
  try {
    assertCostKnowledgeA1KeywordHygiene(spec);
    assert(true, `hygiene ${spec.id}`);
  } catch (e) {
    assert(false, `hygiene ${spec.id}: ${e.message}`);
  }
}
try {
  assertCostKnowledgeA1KeywordHygiene({
    id: "bad",
    tradeId: "HYDRAULIKA",
    namePl: "x",
    unit: "mb",
    companyPricePln: 1,
    descriptionPl: "x",
    keywords: ["winidur"],
    gapGroup: "X",
  });
  assert(false, "bare keyword must throw");
} catch {
  assert(true, "bare keyword throws");
}
try {
  assertCostKnowledgeA1KeywordHygiene({
    id: "bad-surface",
    tradeId: "HYDRAULIKA",
    namePl: "Rura Winidur",
    unit: "mb",
    companyPricePln: 1,
    descriptionPl: "test",
    keywords: ["rura winidur"],
    gapGroup: "X",
  });
  assert(false, "bare surface token must throw");
} catch {
  assert(true, "bare surface token throws");
}

console.log(`\n=== ${passed} PASS / ${failed} FAIL ===`);
if (failed) process.exit(1);
