/**
 * P2-G.1A — silnik kosztu direct z WGDOM Cost Catalog (pozycja ATH × stawki).
 * Fundament pod rozszerzenie computeTenderBidProposal() w P2-G.1B.
 * COST-BID-GAP-01 / GAP-A — opcjonalna kalibracja direct (flaga), bez zmiany Bid tail.
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
import type { TenderPriceOverrideLookup } from "@/lib/tender-price-overrides";
import { isCostBidGap01CatalogCalEnabled } from "@/lib/tenders-v4-config";
import {
  classifyAthLineCategoryGapA,
  resolveGapACatalogRate,
} from "@/lib/cost-bid-gap-01-catalog-cal";
import type { CatalogWork } from "@/lib/work-catalog/types";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";

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
  materialSource?: CatalogPriceSource;
  laborSource?: CatalogPriceSource;
  /** GAP-A — ref Work Catalog gdy użyto marketQuotes. */
  marketWorkId?: string;
}

export type CatalogPriceSource = "base" | "catalog" | "override" | "market";

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

/** Opcje GAP-A (test / wire) — works z Work Catalog; bez I/O w pure path gdy podane. */
export interface CatalogDirectCostGapAOptions {
  works?: CatalogWork[] | null;
  startRegionCode?: string | null;
  computedAtIso?: string;
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

function tryLoadGapAWorks(): CatalogWork[] {
  try {
    const store = loadWorkCatalogStoreLocal();
    return listActiveWorksForRegion(store, store.activeRegion);
  } catch {
    return [];
  }
}

/**
 * Koszt pojedynczej pozycji ATH wg katalogu WGDOM.
 */
export function computeFromCatalogRow(
  row: CatalogQuantityRow,
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
  costModel: TenderCompanyCostModel = defaultCostModelFromPayroll(),
  overrideLookup: TenderPriceOverrideLookup | null = null,
  gapA?: CatalogDirectCostGapAOptions | null,
): CatalogRowCost {
  const quantity = parseQty(row.quantity);
  const gapAOn = isCostBidGap01CatalogCalEnabled();

  const category = gapAOn
    ? classifyAthLineCategoryGapA(row.description, row.unit, catalog)
    : classifyAthLineCategory(row.description, row.unit, catalog);

  const flHourly = fullyLoadedHourly(costModel);
  const laborNormFactor = costModel.laborNormIndexPct / 100;
  const materialIndexFactor = costModel.materialPriceIndexPct / 100;

  let unit: WgdomCostUnit;
  let materialPlnPerUnit: number;
  let laborRbhPerUnit: number;
  let usedFallback: boolean;
  let materialSource: CatalogPriceSource;
  let laborSource: CatalogPriceSource;
  let marketWorkId: string | undefined;

  if (gapAOn) {
    const works = gapA?.works !== undefined ? gapA.works : tryLoadGapAWorks();
    const resolved = resolveGapACatalogRate({
      catalog,
      category,
      unitRaw: row.unit,
      description: row.description,
      works,
      hourlyPln: flHourly,
      startRegionCode: gapA?.startRegionCode ?? null,
      computedAtIso: gapA?.computedAtIso,
    });
    unit = resolved.unit;
    materialPlnPerUnit = resolved.rate.materialPlnPerUnit;
    laborRbhPerUnit = resolved.rate.laborRbhPerUnit;
    usedFallback = resolved.usedFallback;
    materialSource = resolved.materialSource;
    marketWorkId = resolved.marketWorkId;
  } else {
    const resolved = resolveRateForRow(catalog, category, row.unit);
    unit = resolved.unit;
    materialPlnPerUnit = resolved.rate.materialPlnPerUnit;
    laborRbhPerUnit = resolved.rate.laborRbhPerUnit;
    usedFallback = resolved.usedFallback;
    materialSource = usedFallback ? "catalog" : "base";
  }

  const overrideKey = category !== "UNKNOWN" ? `${category}:${unit}` : null;
  const matOverride = overrideKey ? overrideLookup?.material.get(overrideKey) : undefined;
  const labOverride = overrideKey ? overrideLookup?.labor.get(overrideKey) : undefined;

  let laborHours = quantity * laborRbhPerUnit;
  const normalizedUnit = normalizeWgdomCostUnit(row.unit);
  if (normalizedUnit === "rbh") {
    laborHours = quantity;
  }

  let materialCost: number;
  let laborCost: number;

  if (matOverride != null) {
    materialCost = roundPln(quantity * matOverride);
    materialSource = "override";
  } else {
    materialCost = roundPln(quantity * materialPlnPerUnit * materialIndexFactor);
  }

  if (labOverride != null) {
    laborCost = roundPln(quantity * labOverride);
    laborSource = "override";
  } else {
    laborCost = roundPln(laborHours * flHourly * laborNormFactor);
    laborSource = usedFallback ? "catalog" : "base";
  }

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
    materialSource,
    laborSource,
    marketWorkId,
  };
}

/**
 * Agregacja kosztu direct z wielu pozycji ATH.
 */
export function aggregateCatalogDirectCost(
  rows: CatalogQuantityRow[],
  catalog: WgdomCostCatalog = defaultWgdomCostCatalog(),
  costModel: TenderCompanyCostModel = defaultCostModelFromPayroll(),
  overrideLookup: TenderPriceOverrideLookup | null = null,
  gapA?: CatalogDirectCostGapAOptions | null,
): AggregateCatalogDirectCostResult {
  const lines = rows.map((row) =>
    computeFromCatalogRow(row, catalog, costModel, overrideLookup, gapA),
  );

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
