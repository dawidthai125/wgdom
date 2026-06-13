/**
 * P3.3A — porównanie stawki robocizny vs zakres referencyjny (read-only).
 */

import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  LABOR_BENCHMARK_RANGES,
  type LaborBenchmarkCategoryId,
  type LaborBenchmarkRange,
} from "@/lib/labor-benchmark-data";

export type LaborBenchmarkStatus = "below" | "ok" | "above" | "unavailable";

export interface LaborBenchmarkComparison {
  wgdomCategoryId: WgdomCostCategoryId;
  benchmarkCategoryId: LaborBenchmarkCategoryId | null;
  ourLaborPlnPerUnit: number;
  unit: WgdomCostUnit;
  range: LaborBenchmarkRange | null;
  status: LaborBenchmarkStatus;
  statusLabelPl: string;
  rangeLabelPl: string;
}

const WGDOM_TO_BENCHMARK: Partial<Record<WgdomCostCategoryId, LaborBenchmarkCategoryId>> = {
  MALOWANIE: "MALOWANIE",
  GK: "GK",
  ELEKTRYKA: "ELEKTRYKA",
  HYDRAULIKA: "HYDRAULIKA",
  INSTALACJE_CO: "CO",
  INSTALACJE_GAZ: "GAZ",
  ROBOTY_OGOLNOBUDOWLANE: "OGOLNOBUDOWLANE",
  PODLOGI: "POSADZKI",
  GLAZURA: "POSADZKI",
  STOLARKA: "STOLARKA",
  ROZBIORKI: "OGOLNOBUDOWLANE",
  WENTYLACJA: "INNE",
  WYPOSAZENIE: "INNE",
  TRANSPORT_UTYLIZACJA: "INNE",
};

function unitLabel(unit: WgdomCostUnit): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}

export function mapWgdomCategoryToLaborBenchmark(
  categoryId: WgdomCostCategoryId,
): LaborBenchmarkCategoryId | null {
  if (categoryId === "UNKNOWN") return null;
  return WGDOM_TO_BENCHMARK[categoryId] ?? null;
}

export function getLaborBenchmarkRange(
  benchmarkCategoryId: LaborBenchmarkCategoryId,
  unit: WgdomCostUnit,
): LaborBenchmarkRange | null {
  return LABOR_BENCHMARK_RANGES.find(
    (r) => r.categoryId === benchmarkCategoryId && r.unit === unit,
  ) ?? null;
}

export function computeLaborPlnPerUnitFromRbh(
  laborRbhPerUnit: number,
  costModel: TenderCompanyCostModel,
): number {
  const flHourly = fullyLoadedHourly(costModel);
  const laborNormFactor = costModel.laborNormIndexPct / 100;
  return Math.round(laborRbhPerUnit * flHourly * laborNormFactor * 100) / 100;
}

export function formatLaborBenchmarkRange(range: LaborBenchmarkRange): string {
  return `${range.min}–${range.max} zł/${unitLabel(range.unit)}`;
}

export function compareLaborRateToBenchmark(
  ourLaborPlnPerUnit: number,
  wgdomCategoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
): LaborBenchmarkComparison {
  const benchmarkCategoryId = mapWgdomCategoryToLaborBenchmark(wgdomCategoryId);
  const range = benchmarkCategoryId
    ? getLaborBenchmarkRange(benchmarkCategoryId, unit)
    : null;

  if (
    range == null
    || !Number.isFinite(ourLaborPlnPerUnit)
    || ourLaborPlnPerUnit <= 0
  ) {
    return {
      wgdomCategoryId,
      benchmarkCategoryId,
      ourLaborPlnPerUnit,
      unit,
      range: null,
      status: "unavailable",
      statusLabelPl: "Brak benchmarku",
      rangeLabelPl: "—",
    };
  }

  let status: LaborBenchmarkStatus;
  let statusLabelPl: string;
  if (ourLaborPlnPerUnit < range.min) {
    status = "below";
    statusLabelPl = "Poniżej rynku";
  } else if (ourLaborPlnPerUnit > range.max) {
    status = "above";
    statusLabelPl = "Powyżej rynku";
  } else {
    status = "ok";
    statusLabelPl = "W normie";
  }

  return {
    wgdomCategoryId,
    benchmarkCategoryId,
    ourLaborPlnPerUnit,
    unit,
    range,
    status,
    statusLabelPl,
    rangeLabelPl: formatLaborBenchmarkRange(range),
  };
}

export interface LaborBenchmarkAlertSummary {
  outOfRangeCount: number;
  items: Array<{
    categoryLabel: string;
    ourLaborPlnPerUnit: number;
    rangeLabelPl: string;
    statusLabelPl: string;
    status: Exclude<LaborBenchmarkStatus, "unavailable">;
  }>;
}

export function buildLaborBenchmarkAlerts(
  comparisons: Array<LaborBenchmarkComparison & { categoryLabel?: string }>,
): LaborBenchmarkAlertSummary {
  const items = comparisons
    .filter((c): c is LaborBenchmarkComparison & { categoryLabel?: string } =>
      c.status === "below" || c.status === "above")
    .map((c) => ({
      categoryLabel: c.categoryLabel ?? c.wgdomCategoryId,
      ourLaborPlnPerUnit: c.ourLaborPlnPerUnit,
      rangeLabelPl: c.rangeLabelPl,
      statusLabelPl: c.statusLabelPl,
      status: c.status,
    }));

  return {
    outOfRangeCount: items.length,
    items,
  };
}

export function laborBenchmarkStatusIcon(status: LaborBenchmarkStatus): string {
  if (status === "ok") return "✓";
  if (status === "below" || status === "above") return "⚠";
  return "—";
}

export function laborBenchmarkStatusClass(status: LaborBenchmarkStatus): string {
  if (status === "ok") return "text-emerald-700 dark:text-emerald-400";
  if (status === "below") return "text-amber-700 dark:text-amber-400";
  if (status === "above") return "text-orange-700 dark:text-orange-400";
  return "text-muted-foreground";
}
