/**
 * P3.3D — wpływ finansowy odchyleń robocizny od benchmarku (read-only, bez kalkulatora).
 */

import type { WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { LaborBenchmarkComparison, LaborBenchmarkStatus } from "@/lib/labor-benchmark";

export interface LaborBenchmarkImpactResult {
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  ourLaborPlnPerUnit: number;
  unit: WgdomCostUnit;
  benchmarkMin: number | null;
  benchmarkMax: number | null;
  rangeLabelPl: string;
  deviationPerUnit: number;
  quantity: number;
  impactPln: number;
  status: LaborBenchmarkStatus;
  unavailable: boolean;
}

export interface LaborBenchmarkImpactSummary {
  rows: LaborBenchmarkImpactResult[];
  outOfRangeCount: number;
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
 * Wpływ finansowy odchylenia stawki robocizny vs benchmark × ilość.
 * W normie → 0; powyżej max → (nasza − max) × qty; poniżej min → (nasza − min) × qty.
 */
export function computeLaborBenchmarkImpact(
  ourLaborPlnPerUnit: number,
  comparison: LaborBenchmarkComparison,
  quantity: number,
  categoryLabel = "",
): LaborBenchmarkImpactResult {
  const base: LaborBenchmarkImpactResult = {
    categoryId: comparison.wgdomCategoryId,
    categoryLabel,
    ourLaborPlnPerUnit,
    unit: comparison.unit,
    benchmarkMin: comparison.range?.min ?? null,
    benchmarkMax: comparison.range?.max ?? null,
    rangeLabelPl: comparison.rangeLabelPl,
    deviationPerUnit: 0,
    quantity: Math.max(0, quantity),
    impactPln: 0,
    status: comparison.status,
    unavailable: comparison.status === "unavailable",
  };

  if (
    base.unavailable
    || comparison.range == null
    || !Number.isFinite(ourLaborPlnPerUnit)
    || ourLaborPlnPerUnit <= 0
    || base.quantity <= 0
  ) {
    return base;
  }

  const { min, max } = comparison.range;
  if (ourLaborPlnPerUnit > max) {
    const deviationPerUnit = roundMoney(ourLaborPlnPerUnit - max);
    return {
      ...base,
      deviationPerUnit,
      impactPln: roundMoney(deviationPerUnit * base.quantity),
    };
  }
  if (ourLaborPlnPerUnit < min) {
    const deviationPerUnit = roundMoney(ourLaborPlnPerUnit - min);
    return {
      ...base,
      deviationPerUnit,
      impactPln: roundMoney(deviationPerUnit * base.quantity),
    };
  }

  return base;
}

export interface LaborBenchmarkImpactCategoryInput {
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  avgLaborPlnPerUnit: number;
  dominantUnit: WgdomCostUnit;
  laborBenchmark: LaborBenchmarkComparison;
  quantity: number;
}

export function buildLaborBenchmarkImpactSummary(
  categories: LaborBenchmarkImpactCategoryInput[],
): LaborBenchmarkImpactSummary {
  const rows = categories
    .map((cat) => computeLaborBenchmarkImpact(
      cat.avgLaborPlnPerUnit,
      cat.laborBenchmark,
      cat.quantity,
      cat.categoryLabel,
    ))
    .sort((a, b) => b.impactPln - a.impactPln);

  const outOfRange = rows.filter((r) => !r.unavailable && r.status !== "ok" && r.impactPln !== 0);
  const totalImpactPln = roundMoney(
    outOfRange.reduce((sum, r) => sum + r.impactPln, 0),
  );

  return {
    rows,
    outOfRangeCount: outOfRange.length,
    totalImpactPln,
  };
}

export function sumLaborQuantityForCategory(
  lines: Array<{ categoryId: WgdomCostCategoryId; unit: string; quantity: number; isUnknown: boolean }>,
  categoryId: WgdomCostCategoryId,
  dominantUnit: WgdomCostUnit,
): number {
  return lines
    .filter((l) => !l.isUnknown && l.categoryId === categoryId && unitMatchesDominant(l.unit, dominantUnit))
    .reduce((sum, l) => sum + l.quantity, 0);
}

export function formatLaborBenchmarkDeviation(deviationPerUnit: number, unit?: WgdomCostUnit): string {
  if (deviationPerUnit === 0) return "0";
  const sign = deviationPerUnit > 0 ? "+" : "";
  const num = deviationPerUnit.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
  if (!unit) return `${sign}${num}`;
  const unitSuffix = unit === "m2" ? "m²" : unit === "m3" ? "m³" : unit;
  return `${sign}${num} zł/${unitSuffix}`;
}

/** Krótki format odchylenia do tabeli (np. +10, −2). */
export function formatLaborBenchmarkDeviationShort(deviationPerUnit: number): string {
  if (deviationPerUnit === 0) return "—";
  const sign = deviationPerUnit > 0 ? "+" : "";
  return `${sign}${deviationPerUnit.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}`;
}

export function formatLaborBenchmarkImpactPln(impactPln: number): string {
  if (impactPln === 0) return "0 zł";
  const sign = impactPln > 0 ? "+" : "";
  return `${sign}${impactPln.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`;
}

export function laborBenchmarkImpactClass(impactPln: number): string {
  if (impactPln > 0) return "text-orange-700 dark:text-orange-400";
  if (impactPln < 0) return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}
