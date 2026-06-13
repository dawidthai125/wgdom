/**
 * P3.5 — podgląd cen katalogowych per pozycja kosztorysu (read-only, bez zmian kalkulatora).
 */

import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import { defaultCostModelFromPayroll } from "@/lib/company-labor-cost";
import type { TenderCatalogQuantityLine } from "@/lib/tenders-bzp-brief";
import {
  computeFromCatalogRow,
  type CatalogPriceSource,
  type CatalogQuantityRow,
} from "@/lib/wgdom-catalog-cost-engine";
import type { WgdomCostCatalog, WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { defaultWgdomCostCatalog, findCategoryDef } from "@/lib/wgdom-cost-catalog";
import {
  buildTenderPriceOverrideLookup,
  type TenderPriceOverrideEntry,
} from "@/lib/tender-price-overrides";
import {
  compareLaborRateToBenchmark,
  type LaborBenchmarkComparison,
} from "@/lib/labor-benchmark";

export const CATALOG_LINE_PRICE_SOURCE_BASE = "Baza cen" as const;
export const CATALOG_LINE_PRICE_SOURCE_CATALOG = "Katalog WGDOM" as const;
export const CATALOG_LINE_PRICE_SOURCE_OVERRIDE = "Override" as const;

export type CatalogLinePriceSource =
  | typeof CATALOG_LINE_PRICE_SOURCE_BASE
  | typeof CATALOG_LINE_PRICE_SOURCE_CATALOG
  | typeof CATALOG_LINE_PRICE_SOURCE_OVERRIDE;

export interface CatalogLinePricingRow {
  lp: string;
  description: string;
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  unit: string;
  quantity: number;
  quantityDisplay: string;
  materialPlnPerUnit: number | null;
  laborPlnPerUnit: number | null;
  lineTotalPln: number | null;
  materialSource: CatalogLinePriceSource | null;
  laborSource: CatalogLinePriceSource | null;
  isUnknown: boolean;
}

export interface CatalogCategoryCostSummaryRow {
  categoryId: WgdomCostCategoryId;
  categoryLabel: string;
  positionCount: number;
  totalCostPln: number;
  dominantUnit: WgdomCostUnit;
  hasMaterialOverride: boolean;
  hasLaborOverride: boolean;
  avgLaborPlnPerUnit: number;
  laborBenchmark: LaborBenchmarkComparison;
}

export interface CatalogLinePricingView {
  rows: CatalogLinePricingRow[];
  categorySummary: CatalogCategoryCostSummaryRow[];
  unassignedCount: number;
  classifiedPositionCount: number;
  classifiedDirectTotalPln: number;
}

function parseQty(s: string | undefined): number {
  if (!s?.trim()) return 0;
  const n = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function categoryLabelFor(
  catalog: WgdomCostCatalog,
  categoryId: WgdomCostCategoryId,
): string {
  if (categoryId === "UNKNOWN") return "UNKNOWN";
  return findCategoryDef(catalog, categoryId)?.labelPl ?? categoryId;
}

function priceSourceForLine(
  engineSource: CatalogPriceSource | undefined,
  usedFallback: boolean | undefined,
): CatalogLinePriceSource {
  if (engineSource === "override") return CATALOG_LINE_PRICE_SOURCE_OVERRIDE;
  if (engineSource === "catalog" || usedFallback) return CATALOG_LINE_PRICE_SOURCE_CATALOG;
  return CATALOG_LINE_PRICE_SOURCE_BASE;
}

function toCatalogQuantityRow(line: TenderCatalogQuantityLine): CatalogQuantityRow {
  return {
    lp: line.lp,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
  };
}

/**
 * Widok read-only cen per pozycja — UNKNOWN bez cen i bez sumy kategorii (P3.5.3).
 */
export function buildCatalogLinePricingView(
  catalogQuantities: TenderCatalogQuantityLine[] | null | undefined,
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
  costModel: TenderCompanyCostModel = defaultCostModelFromPayroll(),
  priceOverrides: TenderPriceOverrideEntry[] | null | undefined = null,
): CatalogLinePricingView | null {
  if (!catalogQuantities?.length) return null;

  const overrideLookup = buildTenderPriceOverrideLookup(priceOverrides);
  const rows: CatalogLinePricingRow[] = [];
  const categoryAgg = new Map<WgdomCostCategoryId, { count: number; total: number; units: Map<WgdomCostUnit, number> }>();
  let unassignedCount = 0;
  let classifiedPositionCount = 0;
  let classifiedDirectTotalPln = 0;

  for (const line of catalogQuantities) {
    const qty = parseQty(line.quantity);
    const cost = computeFromCatalogRow(toCatalogQuantityRow(line), catalog, costModel, overrideLookup);
    const isUnknown = cost.category === "UNKNOWN";

    if (isUnknown) {
      unassignedCount += 1;
      rows.push({
        lp: line.lp,
        description: line.description,
        categoryId: "UNKNOWN",
        categoryLabel: "UNKNOWN",
        unit: line.unit,
        quantity: qty,
        quantityDisplay: line.quantity,
        materialPlnPerUnit: null,
        laborPlnPerUnit: null,
        lineTotalPln: null,
        materialSource: null,
        laborSource: null,
        isUnknown: true,
      });
      continue;
    }

    classifiedPositionCount += 1;
    classifiedDirectTotalPln += cost.directCost;

    const materialPlnPerUnit = qty > 0 ? roundMoney(cost.materialCost / qty) : null;
    const laborPlnPerUnit = qty > 0 ? roundMoney(cost.laborCost / qty) : null;
    const materialSource = priceSourceForLine(cost.materialSource, cost.usedFallback);
    const laborSource = priceSourceForLine(cost.laborSource, cost.usedFallback);

    const prev = categoryAgg.get(cost.category) ?? { count: 0, total: 0, units: new Map<WgdomCostUnit, number>() };
    const unitCount = prev.units.get(cost.unit) ?? 0;
    prev.units.set(cost.unit, unitCount + 1);
    categoryAgg.set(cost.category, {
      count: prev.count + 1,
      total: roundMoney(prev.total + cost.directCost),
      units: prev.units,
    });

    rows.push({
      lp: line.lp,
      description: line.description,
      categoryId: cost.category,
      categoryLabel: categoryLabelFor(catalog, cost.category),
      unit: line.unit,
      quantity: qty,
      quantityDisplay: line.quantity,
      materialPlnPerUnit,
      laborPlnPerUnit,
      lineTotalPln: roundMoney((materialPlnPerUnit ?? 0) + (laborPlnPerUnit ?? 0)),
      materialSource,
      laborSource,
      isUnknown: false,
    });
  }

  const categorySummary: CatalogCategoryCostSummaryRow[] = [...categoryAgg.entries()]
    .map(([categoryId, agg]) => {
      let dominantUnit: WgdomCostUnit = "m2";
      let maxUnitCount = 0;
      for (const [unit, count] of agg.units) {
        if (count > maxUnitCount) {
          maxUnitCount = count;
          dominantUnit = unit;
        }
      }
      const matKey = `${categoryId}:${dominantUnit}`;
      const catRows = rows.filter(
        (r) => r.categoryId === categoryId && !r.isUnknown && r.laborPlnPerUnit != null,
      );
      const dominantRows = catRows.filter((r) => {
        const u = r.unit.toLowerCase().replace("²", "2").replace(/\s/g, "");
        if (dominantUnit === "m2") return /^(m2|mp)$/.test(u);
        return u === dominantUnit || u === `${dominantUnit}.`;
      });
      const laborRows = dominantRows.length > 0 ? dominantRows : catRows;
      const avgLaborPlnPerUnit = laborRows.length > 0
        ? roundMoney(laborRows.reduce((s, r) => s + (r.laborPlnPerUnit ?? 0), 0) / laborRows.length)
        : 0;
      const laborBenchmark = compareLaborRateToBenchmark(avgLaborPlnPerUnit, categoryId, dominantUnit);
      return {
        categoryId,
        categoryLabel: categoryLabelFor(catalog, categoryId),
        positionCount: agg.count,
        totalCostPln: agg.total,
        dominantUnit,
        hasMaterialOverride: overrideLookup?.material.has(matKey) ?? false,
        hasLaborOverride: overrideLookup?.labor.has(matKey) ?? false,
        avgLaborPlnPerUnit,
        laborBenchmark,
      };
    })
    .sort((a, b) => b.totalCostPln - a.totalCostPln);

  return {
    rows,
    categorySummary,
    unassignedCount,
    classifiedPositionCount,
    classifiedDirectTotalPln: roundMoney(classifiedDirectTotalPln),
  };
}

/** Pomocnicze — rbh z kosztem rbh (do testów / podglądu). */
export function fullyLoadedHourlyForPricing(costModel: TenderCompanyCostModel): number {
  return fullyLoadedHourly(costModel);
}
