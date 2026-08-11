/**
 * PRICE-PATH-01 — resolve Market + Purchase for locked economy materials.
 * NO invent · Market never replaces Purchase · missing provenance → PRICE_GAP.
 */

import type { CompanyCostRo } from "@/lib/cost-expert";
import {
  analyzeMaterialMarketLine,
  mapMaterialToMarketWork,
  resolveMaterialMarketCoverage,
  type PricingExpertCatalogRo,
  type MarketFreshnessStatus,
} from "@/lib/pricing-expert";
import {
  economyProductHostByMaterialKey,
  type EconomyProductHostSpec,
} from "./economy-product-hosts-seed";

export type EconomyPricePathStatus = "PRICE_GAP" | "READY";

export interface EconomyPricePathLine {
  materialKey: string;
  status: EconomyPricePathStatus;
  gapReasonPl: string | null;
  host: EconomyProductHostSpec | null;
  bomUnit: string;
  hostUnit: "l" | "kg" | null;
  quantity: number;
  /** Market compare only — never Real Cost. */
  marketPricePln: number | null;
  marketFreshness: MarketFreshnessStatus;
  marketAcceptedAt: string | null;
  marketOrigin: string | null;
  /** Real Cost inputs. */
  purchaseUnitPln: number | null;
  purchaseTotalPln: number | null;
}

function foldUnit(u: string): string {
  return String(u || "")
    .trim()
    .toLowerCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function unitsCompatible(bomUnit: string, hostUnit: "l" | "kg"): boolean {
  const b = foldUnit(bomUnit);
  const h = foldUnit(hostUnit);
  if (h === "l") return b === "l" || b === "ltr" || b === "liter" || b === "litr";
  if (h === "kg") return b === "kg";
  return false;
}

/**
 * Resolve one economy material price path from PE line + Purchase projection.
 * Wrong identity / wrong unit / missing approved data → PRICE_GAP.
 */
export function resolveEconomyMaterialPricePath(opts: {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  catalog: PricingExpertCatalogRo;
  purchaseByMaterialKey: CompanyCostRo["purchaseByMaterialKey"];
  nowMs?: number;
}): EconomyPricePathLine {
  const nowMs = opts.nowMs ?? Date.now();
  const computedAtIso = new Date(nowMs).toISOString();
  const host = economyProductHostByMaterialKey(opts.materialKey);
  const base = {
    materialKey: opts.materialKey,
    host,
    bomUnit: opts.unit,
    hostUnit: host?.unit ?? null,
    quantity: opts.quantity,
    marketPricePln: null as number | null,
    marketFreshness: "missing" as MarketFreshnessStatus,
    marketAcceptedAt: null as string | null,
    marketOrigin: null as string | null,
    purchaseUnitPln: null as number | null,
    purchaseTotalPln: null as number | null,
  };

  if (!host) {
    return {
      ...base,
      status: "PRICE_GAP",
      gapReasonPl: "Wrong identity — materialKey poza PRICE-PATH-01 locked hosts.",
    };
  }

  if (!unitsCompatible(opts.unit, host.unit)) {
    return {
      ...base,
      status: "PRICE_GAP",
      gapReasonPl: `Wrong unit — BOM=${opts.unit} host=${host.unit} (oczekiwane PLN/${host.unit}).`,
    };
  }

  const map = mapMaterialToMarketWork(opts.materialKey);
  const resolved = resolveMaterialMarketCoverage(opts.materialKey, opts.catalog.worksById);
  // Exact host only — reject soft/alternate workId for this slice
  const work =
    resolved?.work && resolved.work.id === host.catalogWorkId ? resolved.work : null;
  if (work && foldUnit(work.unit) !== foldUnit(host.unit)) {
    return {
      ...base,
      status: "PRICE_GAP",
      gapReasonPl: `Wrong CatalogWork unit — work=${work.unit} host=${host.unit}.`,
    };
  }

  const peLine = analyzeMaterialMarketLine({
    materialKey: opts.materialKey,
    namePl: opts.namePl,
    quantity: opts.quantity,
    unit: opts.unit,
    map: map ?? resolved?.map ?? null,
    work,
    nowMs,
    computedAtIso,
  });

  const marketPricePln = peLine.marketPricePln ?? null;
  const marketFreshness = peLine.freshness;
  const marketAcceptedAt = peLine.freshestUpdatedAt ?? null;
  const marketOrigin = peLine.sources?.[0]?.origin ?? null;

  const purchase = opts.purchaseByMaterialKey[opts.materialKey];
  const purchaseUnitPln =
    purchase && purchase.unitPricePln > 0 ? purchase.unitPricePln : null;
  const purchaseTotalPln =
    purchaseUnitPln != null ? round2(purchaseUnitPln * opts.quantity) : null;

  const marketProvenanceOk =
    marketPricePln != null &&
    marketPricePln > 0 &&
    Boolean(marketAcceptedAt) &&
    Boolean(marketOrigin);

  const hasPurchase = purchaseUnitPln != null;
  const hasMarket = marketProvenanceOk;

  if (!hasPurchase && !hasMarket) {
    return {
      ...base,
      marketPricePln: null,
      marketFreshness,
      marketAcceptedAt,
      marketOrigin,
      purchaseUnitPln: null,
      purchaseTotalPln: null,
      status: "PRICE_GAP",
      gapReasonPl: "Brak Owner-approved Purchase i Market Quotes — PRICE_GAP.",
    };
  }

  return {
    ...base,
    marketPricePln: hasMarket ? marketPricePln : null,
    marketFreshness,
    marketAcceptedAt: hasMarket ? marketAcceptedAt : null,
    marketOrigin: hasMarket ? marketOrigin : null,
    purchaseUnitPln,
    purchaseTotalPln,
    status: "READY",
    gapReasonPl: null,
  };
}
