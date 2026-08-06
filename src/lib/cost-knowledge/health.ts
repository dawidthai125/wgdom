/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 — Knowledge Health RO (COND-4 · TS-A0).
 * Pure summary — bez UI dashboard.
 */

import type { KnowledgeCompatibilityStatus } from "@/lib/cost-knowledge/compatibility-c1";
import type { FoundationLineKpiResult } from "@/lib/cost-knowledge/foundation-kpi";
import { summarizeCostKnowledgeKpi, type CostKnowledgeKpiSummary } from "@/lib/cost-knowledge/kpi-buckets";

export interface KnowledgeHealthSnapshot extends CostKnowledgeKpiSummary {
  /** Foundation gate counts (post Decision + C1). */
  foundationQualified: number;
  foundationQualifiedPct: number;
  compatibility: {
    compatible: number;
    degraded: number;
    notCompatible: number;
    notReady: number;
  };
  decisions: {
    allowQualify: number;
    degrade: number;
    deny: number;
  };
}

function emptyCompat() {
  return { compatible: 0, degraded: 0, notCompatible: 0, notReady: 0 };
}

function bumpCompat(
  bag: ReturnType<typeof emptyCompat>,
  status: KnowledgeCompatibilityStatus,
): void {
  if (status === "COMPATIBLE") bag.compatible += 1;
  else if (status === "DEGRADED") bag.degraded += 1;
  else if (status === "NOT_COMPATIBLE") bag.notCompatible += 1;
  else bag.notReady += 1;
}

/**
 * Health RO snapshot from Foundation line results.
 * Uses foundationBucket for KPI totals (fail-loud post-gate).
 */
export function summarizeKnowledgeHealth(
  rows: FoundationLineKpiResult[],
): KnowledgeHealthSnapshot {
  const mapped = rows.map((r) => ({
    ...r,
    bucket: r.foundationBucket,
    kpiQualified: r.foundationQualified,
  }));
  const base = summarizeCostKnowledgeKpi(mapped);
  const compatibility = emptyCompat();
  const decisions = { allowQualify: 0, degrade: 0, deny: 0 };
  let foundationQualified = 0;
  for (const r of rows) {
    bumpCompat(compatibility, r.compatibility.status);
    if (r.decision.decision === "allow_qualify") decisions.allowQualify += 1;
    else if (r.decision.decision === "degrade") decisions.degrade += 1;
    else decisions.deny += 1;
    if (r.foundationQualified) foundationQualified += 1;
  }
  const total = rows.length;
  const foundationQualifiedPct =
    total > 0 ? Math.round((foundationQualified / total) * 1000) / 10 : 0;
  return {
    ...base,
    foundationQualified,
    foundationQualifiedPct,
    compatibility,
    decisions,
  };
}
