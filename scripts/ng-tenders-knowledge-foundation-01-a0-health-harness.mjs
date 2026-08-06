/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 — Health RO harness (fixture).
 * TS-A0: Decision + C1 + Health snapshot · bez UI / KV / cloud.
 *
 * npx vite-node scripts/ng-tenders-knowledge-foundation-01-a0-health-harness.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  COST_KNOWLEDGE_TV01_BASELINE,
  classifyFoundationKnowledgeLine,
  summarizeKnowledgeHealth,
} from "../src/lib/cost-knowledge/index.ts";

const OUT = path.join(process.cwd(), ".tmp");
const reportPath = path.join(OUT, "ng-tenders-knowledge-foundation-01-a0-health-report.json");

function fixtureLines() {
  return [
    {
      lineId: "fx-qualify",
      catalogWorkId: "kf-demo-work",
      matchMethod: "alias",
      matchConfidence: "high",
      priceOriginKind: "work_catalog",
      hasPositiveUnitPrice: true,
      freshness: "ok",
    },
    {
      lineId: "fx-quotes-fresh",
      catalogWorkId: "kf-demo-work-2",
      matchMethod: "core",
      matchConfidence: "medium",
      priceOriginKind: "controlled_market",
      hasPositiveUnitPrice: true,
      snapshotConfidence01: 0.9,
      coverage: "full",
      freshness: "fresh",
    },
    {
      lineId: "fx-stale-demote",
      catalogWorkId: "kf-stale",
      matchMethod: "alias",
      matchConfidence: "high",
      priceOriginKind: "controlled_market",
      hasPositiveUnitPrice: true,
      snapshotConfidence01: 0.9,
      freshness: "stale",
    },
    {
      lineId: "fx-heuristic",
      catalogWorkId: null,
      matchMethod: "unmatched",
      priceOriginKind: "heuristic",
      hasPositiveUnitPrice: true,
    },
    {
      lineId: "fx-inactive",
      catalogWorkId: "kf-inactive",
      libraryWorkActive: false,
      matchMethod: "alias",
      matchConfidence: "high",
      priceOriginKind: "work_catalog",
      hasPositiveUnitPrice: true,
      freshness: "ok",
    },
    {
      lineId: "fx-unmapped",
      catalogWorkId: null,
      matchMethod: "unmatched",
      priceOriginKind: "unknown",
      hasPositiveUnitPrice: false,
    },
  ];
}

const rows = fixtureLines().map((l) => ({
  lineId: l.lineId,
  ...classifyFoundationKnowledgeLine(l),
}));
const health = summarizeKnowledgeHealth(rows);

const report = {
  epic: "NG-TENDERS-KNOWLEDGE-FOUNDATION-01",
  slice: "TS-A0",
  mode: "fixture",
  generatedAt: new Date().toISOString(),
  tv01BaselineFloor: COST_KNOWLEDGE_TV01_BASELINE,
  health,
  lines: rows.map((r) => ({
    lineId: r.lineId,
    foundationBucket: r.foundationBucket,
    foundationQualified: r.foundationQualified,
    compatibility: r.compatibility.status,
    decision: r.decision.decision,
    priceOriginKind: r.priceOriginKind,
  })),
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("=== NG-TENDERS-KNOWLEDGE-FOUNDATION-01 Health RO ===\n");
console.log(`  foundationQualified: ${health.foundationQualified} / ${health.totalLines}`);
console.log(`  foundationQualifiedPct: ${health.foundationQualifiedPct}%`);
console.log(`  buckets: Q=${health.knowledgeQualified} H=${health.heuristicPriced} U=${health.unmapped}`);
console.log(
  `  C1: compatible=${health.compatibility.compatible} degraded=${health.compatibility.degraded} notCompat=${health.compatibility.notCompatible} notReady=${health.compatibility.notReady}`,
);
console.log(
  `  decisions: allow=${health.decisions.allowQualify} degrade=${health.decisions.degrade} deny=${health.decisions.deny}`,
);
console.log(`\n  report → ${reportPath}`);

if (health.foundationQualified < 1) {
  console.error("FAIL: expected ≥1 foundationQualified in fixture");
  process.exit(1);
}
if (health.compatibility.degraded < 1) {
  console.error("FAIL: expected ≥1 DEGRADED in fixture");
  process.exit(1);
}
console.log("\nPASS fixture health harness");
