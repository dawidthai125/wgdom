/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 1 — OUR RATE → labor input for Position Cost.
 *
 * REUSE `lookupWorkRate` · ZERO HTTP · ZERO research · C-CPLN-1 (brak legacy company price)
 * Engine pozostaje pure — ten adapter robi lookup PRZED `computePositionCost`.
 *
 * P5.16-B C1: stored OUR RATE = BASE · Position Cost labor rate = SELL
 * (computeSellPricePln + resolveMarginPct — no second margin engine).
 */

import {
  computeSellPricePln,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  lookupWorkRate,
  type LookupWorkRateResult,
} from "@/lib/work-catalog/work-rate-lookup";
import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";
import { computePositionCost } from "@/lib/tender-position-cost/engine";
import type {
  PositionCostInput,
  PositionCostResult,
  PositionLaborInput,
  PositionMaterialInput,
} from "@/lib/tender-position-cost/types";

export type OurRateLaborResolveStatus = "CURRENT" | "STALE" | "MISSING" | "NO_IDENTITY";

export type OurRateLaborResolve = {
  status: OurRateLaborResolveStatus;
  statusLabelPl: string;
  workId: string;
  unit: WgdomCostUnit | string;
  identityKey: string;
  /** Stored OUR RATE (BASE) when present — also STALE. */
  ourRatePln: number | null;
  /** commercialPricing.marginPct (null = unset → SELL GAP). */
  marginPct: number | null;
  /** Derived SELL for Position Cost (null when BASE or margin missing). */
  sellPricePln: number | null;
  sourceType: string | null;
  regionScope: string | null;
  observedAt: string | null;
  updatedAt: string | null;
  /** Gotowy input labor dla `computePositionCost` — ourRatePln = SELL. */
  labor: PositionLaborInput;
  /** Surowy wynik lookup (null gdy NO_IDENTITY przed lookup). */
  lookup: LookupWorkRateResult | null;
};

const STATUS_LABEL: Record<OurRateLaborResolveStatus, string> = {
  CURRENT: "AKTUALNA",
  STALE: "PRZETERMINOWANA",
  MISSING: "BRAK STAWKI",
  NO_IDENTITY: "BRAK TOŻSAMOŚCI ROBOTY",
};

function resolveLaborSell(
  store: WorkCatalogStore,
  workId: string,
  baseRatePln: number,
): { marginPct: number | null; sellPricePln: number | null } {
  const work = getWorkByIdFromStore(store, workId);
  const marginPct = resolveMarginPct(work);
  const sellPricePln = computeSellPricePln(baseRatePln, marginPct);
  return { marginPct, sellPricePln };
}

/**
 * Mapuje Nasz Katalog Robót → PositionLaborInput.
 * C-CPLN-1: bez legacy company price · NIE research · NIE HTTP.
 * P5.16-B: labor.ourRatePln = SELL; resolve.ourRatePln = BASE.
 */
export function resolveLaborInputFromOurWorkRate(
  store: WorkCatalogStore,
  workId: string,
  unit: WgdomCostUnit,
  nowMs: number,
): OurRateLaborResolve {
  const trimmed = String(workId ?? "").trim();
  if (!trimmed) {
    return {
      status: "NO_IDENTITY",
      statusLabelPl: STATUS_LABEL.NO_IDENTITY,
      workId: "",
      unit,
      identityKey: buildWorkRateIdentityKey("", unit),
      ourRatePln: null,
      marginPct: null,
      sellPricePln: null,
      sourceType: null,
      regionScope: null,
      observedAt: null,
      updatedAt: null,
      labor: { status: "NO_IDENTITY", ourRatePln: null },
      lookup: null,
    };
  }

  const lookup = lookupWorkRate(store, trimmed, unit, nowMs);

  if (lookup.status === "MISSING") {
    return {
      status: "MISSING",
      statusLabelPl: lookup.statusLabelPl,
      workId: lookup.workId,
      unit: lookup.unit,
      identityKey: lookup.identityKey,
      ourRatePln: null,
      marginPct: resolveMarginPct(getWorkByIdFromStore(store, lookup.workId)),
      sellPricePln: null,
      sourceType: null,
      regionScope: null,
      observedAt: null,
      updatedAt: null,
      labor: { status: "MISSING", ourRatePln: null },
      lookup,
    };
  }

  const { marginPct, sellPricePln } = resolveLaborSell(
    store,
    lookup.workId,
    lookup.ourRatePln,
  );

  if (lookup.status === "STALE") {
    return {
      status: "STALE",
      statusLabelPl: lookup.statusLabelPl,
      workId: lookup.workId,
      unit: lookup.unit,
      identityKey: lookup.identityKey,
      ourRatePln: lookup.ourRatePln,
      marginPct,
      sellPricePln,
      sourceType: lookup.sourceType,
      regionScope: lookup.regionScope,
      observedAt: lookup.observedAt,
      updatedAt: lookup.updatedAt,
      labor: { status: "STALE", ourRatePln: sellPricePln },
      lookup,
    };
  }

  // CURRENT — engine needs SELL; margin unset → sell null → BRAK_OUR_RATE (truthful GAP)
  return {
    status: "CURRENT",
    statusLabelPl: lookup.statusLabelPl,
    workId: lookup.workId,
    unit: lookup.unit,
    identityKey: lookup.identityKey,
    ourRatePln: lookup.ourRatePln,
    marginPct,
    sellPricePln,
    sourceType: lookup.sourceType,
    regionScope: lookup.regionScope,
    observedAt: lookup.observedAt,
    updatedAt: lookup.updatedAt,
    labor: { status: "CURRENT", ourRatePln: sellPricePln },
    lookup,
  };
}

export type ComputePositionCostWithOurRateInput = {
  store: WorkCatalogStore;
  workId: string;
  unit: WgdomCostUnit;
  quantity: number;
  nowMs: number;
  /** Faza 1: zwykle [] — materiały w F2+. */
  materials?: PositionMaterialInput[];
};

export type ComputePositionCostWithOurRateResult = {
  ourRate: OurRateLaborResolve;
  position: PositionCostResult;
  /** Input przekazany do pure engine (do audytu). */
  engineInput: PositionCostInput;
};

/**
 * Faza 1: lookup OUR RATE → computePositionCost.
 * Engine nie wykonuje lookupu.
 */
export function computePositionCostWithOurRate(
  input: ComputePositionCostWithOurRateInput,
): ComputePositionCostWithOurRateResult {
  const ourRate = resolveLaborInputFromOurWorkRate(
    input.store,
    input.workId,
    input.unit,
    input.nowMs,
  );

  const engineInput: PositionCostInput = {
    quantity: input.quantity,
    unit: input.unit,
    labor: ourRate.labor,
    materials: input.materials ?? [],
  };

  const position = computePositionCost(engineInput);

  return { ourRate, position, engineInput };
}
