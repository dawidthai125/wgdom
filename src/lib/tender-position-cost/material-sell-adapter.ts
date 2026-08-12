/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 2 — materialKey → Price Memory → SELL → PositionMaterialInput.
 *
 * REUSE: resolveDemandProductIdentityExact · evaluateMaterialCache · computeSellPricePln · resolveMarginPct
 * ZERO HTTP · ZERO research · C-CPLN-1 (brak companyPrice jako ceny sprzedaży)
 * Engine pozostaje pure — lookup PRZED `computePositionCost`.
 * Faza 2 NIE ustala BOM / listy materiałów — tylko mapuje już podane materialKey + quantity.
 */

import {
  computeSellPricePln,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";
import { evaluateMaterialCache } from "@/lib/price-intelligence/market-material-research-cache";
import type { MaterialCacheDecision } from "@/lib/price-intelligence/market-material-research-types";
import type { PriceMemoryHit } from "@/lib/price-intelligence/price-memory";
import { resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import { getRegionSlice, indexWorksById } from "@/lib/work-catalog/catalog-work-utils";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import {
  resolveLaborInputFromOurWorkRate,
  type OurRateLaborResolve,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";
import type {
  PositionCostInput,
  PositionCostResult,
  PositionLaborInput,
  PositionMaterialInput,
  PositionMaterialStatus,
} from "@/lib/tender-position-cost/types";

export type MaterialSellResolveStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "NO_KEY";

export type MaterialComponentSpec = {
  materialKey: string | null | undefined;
  /** Ilość materiału na pozycję — Faza 2 NIE wylicza z BOM. */
  quantity: number | null | undefined;
  quantityUnit?: string | null;
};

export type MaterialSellResolve = {
  status: MaterialSellResolveStatus;
  statusLabelPl: string;
  materialKey: string | null;
  catalogWorkId: string | null;
  basePricePln: number | null;
  marginPct: number | null;
  sellPricePln: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  priceObservedAt: string | null;
  /** Gotowy input dla `computePositionCost`. */
  material: PositionMaterialInput;
  cache: MaterialCacheDecision | null;
  hit: PriceMemoryHit | null;
};

const STATUS_LABEL: Record<MaterialSellResolveStatus, string> = {
  CURRENT: "AKTUALNA",
  STALE: "PRZETERMINOWANA",
  MISSING: "BRAK CENY MATERIAŁU",
  NO_KEY: "BRAK MATERIAL KEY",
};

function worksByIdFromStore(store: WorkCatalogStore): Map<string, import("@/lib/work-catalog/types").CatalogWork> {
  const slice = getRegionSlice(store);
  return indexWorksById(slice?.works ?? []);
}

function emptyMaterial(
  status: MaterialSellResolveStatus,
  partial: Partial<MaterialSellResolve> & {
    materialKey: string | null;
    quantity: number | null;
    quantityUnit: string | null;
  },
): MaterialSellResolve {
  const materialStatus: PositionMaterialStatus = status;
  return {
    status,
    statusLabelPl: STATUS_LABEL[status],
    catalogWorkId: null,
    basePricePln: null,
    marginPct: null,
    sellPricePln: null,
    priceObservedAt: null,
    cache: null,
    hit: null,
    material: {
      materialKey: partial.materialKey,
      status: materialStatus,
      quantity: partial.quantity,
      quantityUnit: partial.quantityUnit,
      sellPricePln: null,
    },
    ...partial,
    status,
    statusLabelPl: STATUS_LABEL[status],
  };
}

/**
 * materialKey → identity → Price Memory → commercialPricing → SELL → PositionMaterialInput.
 * C-MID-1 · C-PRICE-1 · C-MARGIN-1 · C-CPLN-1.
 */
export function resolveMaterialInputFromPriceMemory(
  store: WorkCatalogStore,
  spec: MaterialComponentSpec,
  nowMs: number,
): MaterialSellResolve {
  const rawKey = String(spec.materialKey ?? "").trim();
  const qty =
    spec.quantity == null || !Number.isFinite(Number(spec.quantity))
      ? null
      : Number(spec.quantity);
  const quantityUnit =
    spec.quantityUnit == null ? null : String(spec.quantityUnit).trim() || null;

  if (!rawKey) {
    return emptyMaterial("NO_KEY", {
      materialKey: null,
      quantity: qty,
      quantityUnit,
    });
  }

  const identity = resolveDemandProductIdentityExact({ materialKey: rawKey });
  if (!identity) {
    return emptyMaterial("NO_KEY", {
      materialKey: rawKey,
      quantity: qty,
      quantityUnit,
    });
  }

  const worksById = worksByIdFromStore(store);
  const cache = evaluateMaterialCache({
    materialKey: identity.materialKey,
    catalogWorkId: identity.catalogWorkId,
    region: store.activeRegion,
    worksById,
    nowMs,
  });

  if (cache.usability === "MISSING" || !cache.hit) {
    const work = worksById.get(identity.catalogWorkId);
    const marginPct = resolveMarginPct(work);
    return {
      status: "MISSING",
      statusLabelPl: STATUS_LABEL.MISSING,
      materialKey: identity.materialKey,
      catalogWorkId: identity.catalogWorkId,
      basePricePln: null,
      marginPct,
      sellPricePln: null,
      quantity: qty,
      quantityUnit,
      priceObservedAt: null,
      cache,
      hit: null,
      material: {
        materialKey: identity.materialKey,
        status: "MISSING",
        quantity: qty,
        quantityUnit,
        sellPricePln: null,
      },
    };
  }

  const work = worksById.get(cache.hit.workId) ?? worksById.get(identity.catalogWorkId);
  const marginPct = resolveMarginPct(work);
  const basePricePln = cache.hit.price;
  const sellPricePln = computeSellPricePln(basePricePln, marginPct);

  if (cache.usability === "STALE") {
    return {
      status: "STALE",
      statusLabelPl: STATUS_LABEL.STALE,
      materialKey: identity.materialKey,
      catalogWorkId: identity.catalogWorkId,
      basePricePln,
      marginPct,
      sellPricePln,
      quantity: qty,
      quantityUnit,
      priceObservedAt: cache.hit.updatedAt,
      cache,
      hit: cache.hit,
      material: {
        materialKey: identity.materialKey,
        status: "STALE",
        quantity: qty,
        quantityUnit,
        sellPricePln,
      },
    };
  }

  // CURRENT — sell może być null gdy margin unset (engine → BRAK_CENY)
  return {
    status: "CURRENT",
    statusLabelPl: STATUS_LABEL.CURRENT,
    materialKey: identity.materialKey,
    catalogWorkId: identity.catalogWorkId,
    basePricePln,
    marginPct,
    sellPricePln,
    quantity: qty,
    quantityUnit,
    priceObservedAt: cache.hit.updatedAt,
    cache,
    hit: cache.hit,
    material: {
      materialKey: identity.materialKey,
      status: "CURRENT",
      quantity: qty,
      quantityUnit,
      sellPricePln,
    },
  };
}

export function resolveMaterialsInputFromPriceMemory(
  store: WorkCatalogStore,
  specs: readonly MaterialComponentSpec[],
  nowMs: number,
): MaterialSellResolve[] {
  return specs.map((spec) => resolveMaterialInputFromPriceMemory(store, spec, nowMs));
}

export type ComputePositionCostWithMaterialsInput = {
  store: WorkCatalogStore;
  nowMs: number;
  /** Ilość pozycji przedmiaru (jm linii) — dla labor; materiały mają własne quantity. */
  quantity: number;
  unit: string;
  /** null = material-only. */
  labor?: PositionLaborInput | null;
  materials: readonly MaterialComponentSpec[];
};

export type ComputePositionCostWithMaterialsResult = {
  materialsResolved: MaterialSellResolve[];
  position: PositionCostResult;
  engineInput: PositionCostInput;
};

/**
 * Faza 2: lookup SELL (i opcjonalnie gotowy labor) → computePositionCost.
 */
export function computePositionCostWithMaterials(
  input: ComputePositionCostWithMaterialsInput,
): ComputePositionCostWithMaterialsResult {
  const materialsResolved = resolveMaterialsInputFromPriceMemory(
    input.store,
    input.materials,
    input.nowMs,
  );
  const engineInput: PositionCostInput = {
    quantity: input.quantity,
    unit: input.unit,
    labor: input.labor === undefined ? null : input.labor,
    materials: materialsResolved.map((m) => m.material),
  };
  const position = computePositionCost(engineInput);
  return { materialsResolved, position, engineInput };
}

export type ComputePositionCostWithOurRateAndMaterialsInput = {
  store: WorkCatalogStore;
  workId: string;
  unit: WgdomCostUnit;
  quantity: number;
  nowMs: number;
  materials: readonly MaterialComponentSpec[];
};

export type ComputePositionCostWithOurRateAndMaterialsResult = {
  ourRate: OurRateLaborResolve;
  materialsResolved: MaterialSellResolve[];
  position: PositionCostResult;
  engineInput: PositionCostInput;
};

/**
 * F1 labor + F2 materials → pure engine.
 * Nie zmienia kontraktu F1; materiały rozwiązywane osobno.
 */
export function computePositionCostWithOurRateAndMaterials(
  input: ComputePositionCostWithOurRateAndMaterialsInput,
): ComputePositionCostWithOurRateAndMaterialsResult {
  const ourRate = resolveLaborInputFromOurWorkRate(
    input.store,
    input.workId,
    input.unit,
    input.nowMs,
  );
  const materialsResolved = resolveMaterialsInputFromPriceMemory(
    input.store,
    input.materials,
    input.nowMs,
  );
  const engineInput: PositionCostInput = {
    quantity: input.quantity,
    unit: input.unit,
    labor: ourRate.labor,
    materials: materialsResolved.map((m) => m.material),
  };
  const position = computePositionCost(engineInput);
  return { ourRate, materialsResolved, position, engineInput };
}
