/**
 * P3.3A/3.3B — porównanie stawki robocizny vs zakres referencyjny (read-only).
 */

import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { WgdomCostCategoryId, WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";
import {
  ACTIVE_LABOR_BENCHMARK_EDITION,
  getActiveLaborBenchmarkEdition,
  LABOR_BENCHMARK_RANGES,
  type LaborBenchmarkCategoryId,
  type LaborBenchmarkEdition,
  type LaborBenchmarkRange,
} from "@/lib/labor-benchmark-data";
import {
  findOldestLaborRateInWindow,
  type WgdomCostCatalogHistoryStore,
} from "@/lib/wgdom-cost-catalog-history";

export type LaborBenchmarkStatus = "below" | "ok" | "above" | "unavailable";

export type LaborRateTrendDirection = "up" | "down" | "flat";

export interface LaborRateTrend {
  direction: LaborRateTrendDirection;
  icon: string;
  labelPl: string;
  pctChange: number;
  historicalPlnPerUnit: number;
  daysAgo: number;
}

export interface LaborBenchmarkComparison {
  wgdomCategoryId: WgdomCostCategoryId;
  benchmarkCategoryId: LaborBenchmarkCategoryId | null;
  ourLaborPlnPerUnit: number;
  unit: WgdomCostUnit;
  range: LaborBenchmarkRange | null;
  status: LaborBenchmarkStatus;
  statusLabelPl: string;
  rangeLabelPl: string;
  trend: LaborRateTrend | null;
  historyPlnPerUnit: number | null;
  historyDaysAgo: number | null;
}

const WGDOM_TO_BENCHMARK: Partial<Record<WgdomCostCategoryId, LaborBenchmarkCategoryId>> = {
  MALOWANIE: "MALOWANIE",
  GK: "GK",
  GLADZIE_TYNKI: "GLADZIE_TYNKI",
  ROZBIORKI: "ROZBIORKI",
  ELEKTRYKA: "ELEKTRYKA",
  HYDRAULIKA: "HYDRAULIKA",
  INSTALACJE_CO: "CO",
  INSTALACJE_GAZ: "GAZ",
  ROBOTY_OGOLNOBUDOWLANE: "OGOLNOBUDOWLANE",
  PODLOGI: "POSADZKI",
  GLAZURA: "POSADZKI",
  STOLARKA: "STOLARKA",
  WENTYLACJA: "INNE",
  WYPOSAZENIE: "INNE",
  TRANSPORT_UTYLIZACJA: "INNE",
};

const TREND_FLAT_THRESHOLD_PCT = 1;

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

export function computeLaborRateTrend(
  currentPlnPerUnit: number,
  historicalPlnPerUnit: number,
  daysAgo: number,
): LaborRateTrend | null {
  if (
    !Number.isFinite(currentPlnPerUnit)
    || !Number.isFinite(historicalPlnPerUnit)
    || currentPlnPerUnit <= 0
    || historicalPlnPerUnit <= 0
    || daysAgo < 0
  ) {
    return null;
  }
  const pctChange = Math.round(
    ((currentPlnPerUnit - historicalPlnPerUnit) / historicalPlnPerUnit) * 1000,
  ) / 10;

  let direction: LaborRateTrendDirection;
  let icon: string;
  let labelPl: string;

  if (Math.abs(pctChange) < TREND_FLAT_THRESHOLD_PCT) {
    direction = "flat";
    icon = "→";
    labelPl = "bez zmian";
  } else if (pctChange > 0) {
    direction = "up";
    icon = "↗";
    labelPl = `+${pctChange}%`;
  } else {
    direction = "down";
    icon = "↘";
    labelPl = `${pctChange}%`;
  }

  return {
    direction,
    icon,
    labelPl,
    pctChange,
    historicalPlnPerUnit,
    daysAgo,
  };
}

export function enrichLaborBenchmarkWithHistory(
  comparison: Omit<LaborBenchmarkComparison, "trend" | "historyPlnPerUnit" | "historyDaysAgo">,
  history: WgdomCostCatalogHistoryStore | null | undefined,
  region: WgdomCostRegion,
): LaborBenchmarkComparison {
  if (!history || comparison.status === "unavailable") {
    return { ...comparison, trend: null, historyPlnPerUnit: null, historyDaysAgo: null };
  }
  const past = findOldestLaborRateInWindow(
    history,
    region,
    comparison.wgdomCategoryId,
    comparison.unit,
  );
  if (!past) {
    return { ...comparison, trend: null, historyPlnPerUnit: null, historyDaysAgo: null };
  }
  const trend = computeLaborRateTrend(
    comparison.ourLaborPlnPerUnit,
    past.laborPlnPerUnit,
    past.daysAgo,
  );
  return {
    ...comparison,
    trend,
    historyPlnPerUnit: past.laborPlnPerUnit,
    historyDaysAgo: past.daysAgo,
  };
}

export function compareLaborRateToBenchmark(
  ourLaborPlnPerUnit: number,
  wgdomCategoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  options?: {
    history?: WgdomCostCatalogHistoryStore | null;
    region?: WgdomCostRegion;
  },
): LaborBenchmarkComparison {
  const benchmarkCategoryId = mapWgdomCategoryToLaborBenchmark(wgdomCategoryId);
  const range = benchmarkCategoryId
    ? getLaborBenchmarkRange(benchmarkCategoryId, unit)
    : null;

  const base = {
    wgdomCategoryId,
    benchmarkCategoryId,
    ourLaborPlnPerUnit,
    unit,
    range,
    status: "unavailable" as LaborBenchmarkStatus,
    statusLabelPl: "Brak benchmarku",
    rangeLabelPl: "—",
  };

  if (
    range == null
    || !Number.isFinite(ourLaborPlnPerUnit)
    || ourLaborPlnPerUnit <= 0
  ) {
    return enrichLaborBenchmarkWithHistory(base, options?.history, options?.region ?? "wroclaw");
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

  return enrichLaborBenchmarkWithHistory(
    {
      ...base,
      status,
      statusLabelPl,
      rangeLabelPl: formatLaborBenchmarkRange(range),
    },
    options?.history,
    options?.region ?? "wroclaw",
  );
}

export interface LaborBenchmarkCoverage {
  covered: number;
  total: number;
  labelPl: string;
}

export function computeLaborBenchmarkCoverage(
  rows: Array<{ id: WgdomCostCategoryId; unit: WgdomCostUnit; laborPlnPerUnit: number }>,
): LaborBenchmarkCoverage {
  const total = WGDOM_COST_CATEGORY_IDS.length;
  let covered = 0;
  for (const row of rows) {
    const cmp = compareLaborRateToBenchmark(row.laborPlnPerUnit, row.id, row.unit);
    if (cmp.status !== "unavailable") covered += 1;
  }
  return {
    covered,
    total,
    labelPl: `${covered} / ${total} kategorii`,
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

export function getLaborBenchmarkEdition(region?: WgdomCostRegion): LaborBenchmarkEdition {
  return getActiveLaborBenchmarkEdition(region ?? ACTIVE_LABOR_BENCHMARK_EDITION.region);
}

export { ACTIVE_LABOR_BENCHMARK_EDITION };
