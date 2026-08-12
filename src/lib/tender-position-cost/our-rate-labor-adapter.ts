/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 1 — OUR RATE → labor input for Position Cost.
 *
 * REUSE `lookupWorkRate` · ZERO HTTP · ZERO research · C-CPLN-1 (brak legacy company price)
 * Engine pozostaje pure — ten adapter robi lookup PRZED `computePositionCost`.
 */

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
  /** Wartość OUR RATE gdy obecna (także przy STALE — engine i tak nie wlicza STALE). */
  ourRatePln: number | null;
  sourceType: string | null;
  regionScope: string | null;
  observedAt: string | null;
  updatedAt: string | null;
  /** Gotowy input labor dla `computePositionCost` (nigdy null). */
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

/**
 * Mapuje Nasz Katalog Robót → PositionLaborInput.
 * C-CPLN-1: bez legacy company price · NIE research · NIE HTTP.
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
      sourceType: null,
      regionScope: null,
      observedAt: null,
      updatedAt: null,
      labor: { status: "MISSING", ourRatePln: null },
      lookup,
    };
  }

  if (lookup.status === "STALE") {
    return {
      status: "STALE",
      statusLabelPl: lookup.statusLabelPl,
      workId: lookup.workId,
      unit: lookup.unit,
      identityKey: lookup.identityKey,
      ourRatePln: lookup.ourRatePln,
      sourceType: lookup.sourceType,
      regionScope: lookup.regionScope,
      observedAt: lookup.observedAt,
      updatedAt: lookup.updatedAt,
      labor: { status: "STALE", ourRatePln: lookup.ourRatePln },
      lookup,
    };
  }

  // CURRENT
  return {
    status: "CURRENT",
    statusLabelPl: lookup.statusLabelPl,
    workId: lookup.workId,
    unit: lookup.unit,
    identityKey: lookup.identityKey,
    ourRatePln: lookup.ourRatePln,
    sourceType: lookup.sourceType,
    regionScope: lookup.regionScope,
    observedAt: lookup.observedAt,
    updatedAt: lookup.updatedAt,
    labor: { status: "CURRENT", ourRatePln: lookup.ourRatePln },
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
