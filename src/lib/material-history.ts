/**
 * P3.4A — historia i trend stawek materiałów (własna baza, bez źródeł zewnętrznych).
 */

import type { WgdomCostCategoryId, WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  computeLaborRateTrend,
  type LaborRateTrend,
} from "@/lib/labor-benchmark";
import {
  findOldestMaterialRateInWindow,
  MATERIAL_HISTORY_WINDOW_DAYS,
  type WgdomCostCatalogHistoryStore,
} from "@/lib/wgdom-cost-catalog-history";

export interface MaterialRateHistoryView {
  categoryId: WgdomCostCategoryId;
  unit: WgdomCostUnit;
  ourMaterialPlnPerUnit: number;
  historicalPlnPerUnit: number | null;
  historyDaysAgo: number | null;
  trend: LaborRateTrend | null;
  hasHistory: boolean;
}

function unitLabel(unit: WgdomCostUnit): string {
  if (unit === "m2") return "m²";
  if (unit === "m3") return "m³";
  return unit;
}

export function buildMaterialRateHistoryView(
  ourMaterialPlnPerUnit: number,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  history: WgdomCostCatalogHistoryStore | null | undefined,
  region: WgdomCostRegion,
  windowDays = MATERIAL_HISTORY_WINDOW_DAYS,
): MaterialRateHistoryView {
  const base: MaterialRateHistoryView = {
    categoryId,
    unit,
    ourMaterialPlnPerUnit,
    historicalPlnPerUnit: null,
    historyDaysAgo: null,
    trend: null,
    hasHistory: false,
  };

  if (!history || !Number.isFinite(ourMaterialPlnPerUnit) || ourMaterialPlnPerUnit <= 0) {
    return base;
  }

  const past = findOldestMaterialRateInWindow(history, region, categoryId, unit, windowDays);
  if (!past || past.materialPlnPerUnit <= 0) {
    return base;
  }

  const trend = computeLaborRateTrend(
    ourMaterialPlnPerUnit,
    past.materialPlnPerUnit,
    past.daysAgo,
  );

  return {
    ...base,
    historicalPlnPerUnit: past.materialPlnPerUnit,
    historyDaysAgo: past.daysAgo,
    trend,
    hasHistory: true,
  };
}

export function formatMaterialRateLabel(pln: number, unit: WgdomCostUnit): string {
  return `${pln.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} zł/${unitLabel(unit)}`;
}

export function formatMaterialHistoryLine(view: MaterialRateHistoryView): string {
  if (!view.hasHistory || view.historicalPlnPerUnit == null || view.historyDaysAgo == null) {
    return "—";
  }
  return `${view.historyDaysAgo} dni temu: ${formatMaterialRateLabel(view.historicalPlnPerUnit, view.unit)}`;
}
