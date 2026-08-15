/**
 * P5.16-B — thin Work Quotes → SELL bridge (MATERIAL_SUPPLY).
 *
 * REUSE: lookupPriceMemory · evaluateMaterialCache · resolveMarginPct · computeSellPricePln
 * ZERO invent mat.* / TechnologyPack / BOM · ZERO HTTP / research
 * Engine remains pure — resolve BEFORE computePositionCost.
 */

import {
  computeSellPricePln,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";
import { evaluateMaterialCache } from "@/lib/price-intelligence/market-material-research-cache";
import type { MaterialCacheDecision } from "@/lib/price-intelligence/market-material-research-types";
import type { PriceMemoryHit } from "@/lib/price-intelligence/price-memory";
import { getRegionSlice, indexWorksById } from "@/lib/work-catalog/catalog-work-utils";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type {
  PositionMaterialInput,
  PositionMaterialStatus,
} from "@/lib/tender-position-cost/types";

export type CatalogWorkQuotesSellStatus =
  | "CURRENT"
  | "STALE"
  | "MISSING"
  | "NO_WORK";

export type CatalogWorkQuotesSellResolve = {
  status: CatalogWorkQuotesSellStatus;
  statusLabelPl: string;
  catalogWorkId: string | null;
  /** Always null — no invent mat.*. */
  materialKey: null;
  basePricePln: number | null;
  marginPct: number | null;
  sellPricePln: number | null;
  quantity: number | null;
  quantityUnit: string | null;
  priceObservedAt: string | null;
  material: PositionMaterialInput;
  cache: MaterialCacheDecision | null;
  hit: PriceMemoryHit | null;
};

const STATUS_LABEL: Record<CatalogWorkQuotesSellStatus, string> = {
  CURRENT: "AKTUALNA",
  STALE: "PRZETERMINOWANA",
  MISSING: "BRAK CENY MATERIAŁU",
  NO_WORK: "BRAK WORK ID",
};

function worksByIdFromStore(store: WorkCatalogStore) {
  const slice = getRegionSlice(store);
  return indexWorksById(slice?.works ?? []);
}

/**
 * catalogWorkId → Work Quotes (Price Memory) → commercialPricing → SELL.
 * Does NOT invent materialKey / BOM / product identity.
 */
export function resolveMaterialSellFromCatalogWorkQuotes(
  store: WorkCatalogStore,
  catalogWorkId: string,
  quantity: number | null | undefined,
  quantityUnit: string | null | undefined,
  nowMs: number,
): CatalogWorkQuotesSellResolve {
  const workId = String(catalogWorkId ?? "").trim();
  const qty =
    quantity == null || !Number.isFinite(Number(quantity)) ? null : Number(quantity);
  const unit =
    quantityUnit == null ? null : String(quantityUnit).trim() || null;

  if (!workId) {
    return {
      status: "NO_WORK",
      statusLabelPl: STATUS_LABEL.NO_WORK,
      catalogWorkId: null,
      materialKey: null,
      basePricePln: null,
      marginPct: null,
      sellPricePln: null,
      quantity: qty,
      quantityUnit: unit,
      priceObservedAt: null,
      cache: null,
      hit: null,
      material: {
        materialKey: null,
        status: "NO_KEY",
        quantity: qty,
        quantityUnit: unit,
        sellPricePln: null,
      },
    };
  }

  const worksById = worksByIdFromStore(store);
  const work = worksById.get(workId);
  const marginPct = resolveMarginPct(work);

  // Empty materialKey — Price Memory resolves by catalogWorkId (P5.13 path).
  const cache = evaluateMaterialCache({
    materialKey: "",
    catalogWorkId: workId,
    region: store.activeRegion,
    worksById,
    nowMs,
  });

  if (cache.usability === "MISSING" || !cache.hit) {
    return {
      status: "MISSING",
      statusLabelPl: STATUS_LABEL.MISSING,
      catalogWorkId: workId,
      materialKey: null,
      basePricePln: null,
      marginPct,
      sellPricePln: null,
      quantity: qty,
      quantityUnit: unit,
      priceObservedAt: null,
      cache,
      hit: null,
      material: {
        materialKey: null,
        status: "MISSING",
        quantity: qty,
        quantityUnit: unit,
        sellPricePln: null,
      },
    };
  }

  const basePricePln = cache.hit.price;
  const sellPricePln = computeSellPricePln(basePricePln, marginPct);
  const materialStatus: PositionMaterialStatus =
    cache.usability === "STALE" ? "STALE" : "CURRENT";

  return {
    status: cache.usability === "STALE" ? "STALE" : "CURRENT",
    statusLabelPl:
      cache.usability === "STALE" ? STATUS_LABEL.STALE : STATUS_LABEL.CURRENT,
    catalogWorkId: workId,
    materialKey: null,
    basePricePln,
    marginPct,
    sellPricePln,
    quantity: qty,
    quantityUnit: unit,
    priceObservedAt: cache.hit.updatedAt,
    cache,
    hit: cache.hit,
    material: {
      materialKey: null,
      status: materialStatus,
      quantity: qty,
      quantityUnit: unit,
      sellPricePln,
    },
  };
}
