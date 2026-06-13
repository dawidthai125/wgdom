/**
 * P2-G.1A — silnik kosztu direct z WGDOM Cost Catalog (pozycja ATH × stawki).
 * Fundament pod rozszerzenie computeTenderBidProposal() w P2-G.1B.
 */

import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import { defaultCostModelFromPayroll } from "@/lib/company-labor-cost";
import type {
  WgdomCostCatalog,
  WgdomCostCategoryId,
  WgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import {
  defaultWgdomCostCatalog,
  getCategoryRate,
  getUnknownFallbackRate,
  normalizeWgdomCostUnit,
} from "@/lib/wgdom-cost-catalog";
import { classifyAthLineCategory } from "@/lib/wgdom-ath-classifier";

export interface CatalogQuantityRow {
  description: string;
  unit: string;
  quantity: string;
  lp?: string;
}

export interface CatalogRowCost {
  category: WgdomCostCategoryId;
  unit: WgdomCostUnit;
  quantity: number;
  materialCost: number;
  laborHours: number;
  laborCost: number;
  directCost: number;
  unmatched?: boolean;
  usedFallback?: boolean;
}

export interface CatalogDirectCostTotals {
  material: number;
  laborHours: number;
  labor: number;
  direct: number;
}

export interface AggregateCatalogDirectCostResult {
  lines: CatalogRowCost[];
  totals: CatalogDirectCostTotals;
  unknownCount: number;
  classifiedCount: number;
  rowCount: number;
}

function parseQty(s: string | undefined): number {
  if (!s?.trim()) return 0;
  const n = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function resolveRateForRow(
  catalog: WgdomCostCatalog,
  category: WgdomCostCategoryId,
  unitRaw: string,
): { rate: { unit: WgdomCostUnit; materialPlnPerUnit: number; laborRbhPerUnit: number }; unit: WgdomCostUnit; usedFallback: boolean } {
  const normalized = normalizeWgdomCostUnit(unitRaw);
  const unit: WgdomCostUnit = normalized ?? catalog.unknownFallback.defaultUnit;

  if (category !== "UNKNOWN") {
    const matched = normalized ? getCategoryRate(catalog, category, normalized) : null;
    if (matched) {
      return { rate: matched, unit: matched.unit, usedFallback: false };
    }
    const def = catalog.categories.find((c) => c.id === category);
    const firstRate = def?.rates[0];
    if (firstRate) {
      const fromCatalog = getCategoryRate(catalog, category, firstRate.unit);
      if (fromCatalog) {
        return { rate: fromCatalog, unit: fromCatalog.unit, usedFallback: true };
      }
    }
  }

  const fb = getUnknownFallbackRate(catalog);
  return { rate: fb, unit: fb.unit, usedFallback: true };
}

/**
 * Koszt pojedynczej pozycji ATH wg katalogu WGDOM.
 */
export function computeFromCatalogRow(
  row: CatalogQuantityRow,
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
  costModel: TenderCompanyCostModel = defaultCostModelFromPayroll(),
): CatalogRowCost {
  const quantity = parseQty(row.quantity);
  const category = classifyAthLineCategory(row.description, row.unit);
  const { rate, unit, usedFallback } = resolveRateForRow(catalog, category, row.unit);

  const flHourly = fullyLoadedHourly(costModel);
  const laborNormFactor = costModel.laborNormIndexPct / 100;
  const materialIndexFactor = costModel.materialPriceIndexPct / 100;

  let laborHours = quantity * rate.laborRbhPerUnit;
  const normalizedUnit = normalizeWgdomCostUnit(row.unit);
  if (normalizedUnit === "rbh") {
    laborHours = quantity;
  }

  const materialCost = roundPln(quantity * rate.materialPlnPerUnit * materialIndexFactor);
  const laborCost = roundPln(laborHours * flHourly * laborNormFactor);
  const directCost = roundPln(materialCost + laborCost);

  const unmatched = normalizedUnit != null && normalizedUnit !== unit && !usedFallback;

  return {
    category,
    unit,
    quantity,
    materialCost,
    laborHours: roundPln(laborHours * 100) / 100,
    laborCost,
    directCost,
    unmatched: unmatched || undefined,
    usedFallback: usedFallback || category === "UNKNOWN" || undefined,
  };
}

/**
 * Agregacja kosztu direct z wielu pozycji ATH.
 */
export function aggregateCatalogDirectCost(
  rows: CatalogQuantityRow[],
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
  costModel: TenderCompanyCostModel = defaultCostModelFromPayroll(),
): AggregateCatalogDirectCostResult {
  const lines = rows.map((row) => computeFromCatalogRow(row, catalog, costModel));

  let material = 0;
  let laborHours = 0;
  let labor = 0;
  let unknownCount = 0;
  let classifiedCount = 0;

  for (const line of lines) {
    material += line.materialCost;
    laborHours += line.laborHours;
    labor += line.laborCost;
    if (line.category === "UNKNOWN") {
      unknownCount += 1;
    } else {
      classifiedCount += 1;
    }
  }

  const direct = roundPln(material + labor);

  return {
    lines,
    totals: {
      material: roundPln(material),
      laborHours: roundPln(laborHours * 100) / 100,
      labor: roundPln(labor),
      direct,
    },
    unknownCount,
    classifiedCount,
    rowCount: rows.length,
  };
}

/** P2-G.2B — czy wycena katalogowa zawiera pozycje transportu/utylizacji (anti-double-count gruzu). */
export function aggregateHasTransportUtillizationLines(
  result: AggregateCatalogDirectCostResult | CatalogRowCost[],
): boolean {
  const lines = Array.isArray(result) ? result : result.lines;
  return lines.some((l) => l.category === "TRANSPORT_UTYLIZACJA");
}
