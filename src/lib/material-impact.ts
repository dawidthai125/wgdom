/**
 * P3.4A — wpływ finansowy zmian materiałów vs historia firmy (read-only).
 */

import type { WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { LaborRateTrend } from "@/lib/labor-benchmark";
import type { MaterialRateHistoryView } from "@/lib/material-history";
import { formatLaborBenchmarkImpactPln, laborBenchmarkImpactClass } from "@/lib/labor-benchmark-impact";

export interface MaterialHistoryImpactResult {
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  ourMaterialPlnPerUnit: number;
  unit: WgdomCostUnit;
  historicalPlnPerUnit: number | null;
  historyDaysAgo: number | null;
  deviationPerUnit: number;
  quantity: number;
  impactPln: number;
  trend: LaborRateTrend | null;
  unavailable: boolean;
}

export interface MaterialHistoryImpactSummary {
  rows: MaterialHistoryImpactResult[];
  changedCount: number;
  totalImpactPln: number;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function unitMatchesDominant(lineUnit: string, dominantUnit: WgdomCostUnit): boolean {
  const u = lineUnit.toLowerCase().replace("²", "2").replace(/\s/g, "");
  if (dominantUnit === "m2") return /^(m2|mp)$/.test(u);
  return u === dominantUnit || u === `${dominantUnit}.`;
}

/**
 * Wpływ = (nasza − historia) × ilość. Brak historii → impact 0.
 */
export function computeMaterialHistoryImpact(
  ourMaterialPlnPerUnit: number,
  historyView: MaterialRateHistoryView,
  quantity: number,
  categoryLabel = "",
): MaterialHistoryImpactResult {
  const base: MaterialHistoryImpactResult = {
    categoryId: historyView.categoryId,
    categoryLabel,
    ourMaterialPlnPerUnit,
    unit: historyView.unit,
    historicalPlnPerUnit: historyView.historicalPlnPerUnit,
    historyDaysAgo: historyView.historyDaysAgo,
    deviationPerUnit: 0,
    quantity: Math.max(0, quantity),
    impactPln: 0,
    trend: historyView.trend,
    unavailable: !historyView.hasHistory,
  };

  if (
    base.unavailable
    || historyView.historicalPlnPerUnit == null
    || !Number.isFinite(ourMaterialPlnPerUnit)
    || ourMaterialPlnPerUnit <= 0
    || base.quantity <= 0
  ) {
    return base;
  }

  const deviationPerUnit = roundMoney(ourMaterialPlnPerUnit - historyView.historicalPlnPerUnit);
  if (deviationPerUnit === 0) {
    return base;
  }

  return {
    ...base,
    deviationPerUnit,
    impactPln: roundMoney(deviationPerUnit * base.quantity),
  };
}

export function sumMaterialQuantityForCategory(
  lines: Array<{ categoryId: WgdomCostCategoryId; unit: string; quantity: number; isUnknown: boolean }>,
  categoryId: WgdomCostCategoryId,
  dominantUnit: WgdomCostUnit,
): number {
  return lines
    .filter((l) => !l.isUnknown && l.categoryId === categoryId && unitMatchesDominant(l.unit, dominantUnit))
    .reduce((sum, l) => sum + l.quantity, 0);
}

export interface MaterialHistoryImpactCategoryInput {
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  avgMaterialPlnPerUnit: number;
  dominantUnit: WgdomCostUnit;
  historyView: MaterialRateHistoryView;
  quantity: number;
}

export function buildMaterialHistoryImpactSummary(
  categories: MaterialHistoryImpactCategoryInput[],
): MaterialHistoryImpactSummary {
  const rows = categories
    .map((cat) => computeMaterialHistoryImpact(
      cat.avgMaterialPlnPerUnit,
      cat.historyView,
      cat.quantity,
      cat.categoryLabel,
    ))
    .sort((a, b) => b.impactPln - a.impactPln);

  const changed = rows.filter((r) => !r.unavailable && r.impactPln !== 0);
  const totalImpactPln = roundMoney(changed.reduce((sum, r) => sum + r.impactPln, 0));

  return {
    rows,
    changedCount: changed.length,
    totalImpactPln,
  };
}

export function formatMaterialDeviationShort(deviationPerUnit: number): string {
  if (deviationPerUnit === 0) return "—";
  const sign = deviationPerUnit > 0 ? "+" : "";
  return `${sign}${deviationPerUnit.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}`;
}

export { formatLaborBenchmarkImpactPln as formatMaterialImpactPln, laborBenchmarkImpactClass as materialImpactClass };
