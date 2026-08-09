/**
 * DEMAND-RESEARCH-01 S0 — per-layer Demand resolve after MARKET Quotes ACCEPT.
 * REUSE demand ids/family · nie drugi resolve engine.
 */

import {
  buildPriceDemandFamilyKey,
  buildPriceDemandId,
  listActivePriceDemands,
  normalizePriceDemandStore,
  type UpsertPriceDemandsResult,
} from "./demand-queue";
import type { PriceDemandRecord, PriceDemandStore } from "./demand-types";
import { PRICE_DEMAND_SCHEMA_VERSION, PRICE_DEMAND_TENDER_IDS_CAP } from "./demand-types";

/** Aktywne Demand z brakiem MARKET (MARKET_QUOTE_MISSING lub BOTH_MISSING). */
export function listActiveMarketLayerDemands(
  store: PriceDemandStore,
  opts?: { materialKeys?: readonly string[]; tenderId?: string | null },
): PriceDemandRecord[] {
  const keys = opts?.materialKeys?.length ? new Set(opts.materialKeys) : null;
  const tenderId = opts?.tenderId?.trim() || null;
  return listActivePriceDemands(store).filter((d) => {
    if (d.missingLayer !== "MARKET_QUOTE_MISSING" && d.missingLayer !== "BOTH_MISSING") {
      return false;
    }
    if (keys && !keys.has(d.materialKey)) return false;
    if (tenderId && d.tenderIds.length > 0 && !d.tenderIds.includes(tenderId)) return false;
    return true;
  });
}

/** Czy Demand nadaje się do S0 research (materialKey + catalogWorkId). */
export function isDemandResearchableS0(d: PriceDemandRecord): boolean {
  return Boolean(d.materialKey?.trim() && d.catalogWorkId?.trim());
}

function mergeTenderIds(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].slice(0, PRICE_DEMAND_TENDER_IDS_CAP);
}

/**
 * Po MARKET write:
 * - MARKET_QUOTE_MISSING → RESOLVED
 * - BOTH_MISSING → replace with PURCHASE_MISSING (QUEUED)
 * Nie oznacza full complete gdy purchase nadal brakuje.
 */
export function resolveMarketLayerForDemand(
  rawStore: PriceDemandStore,
  opts: {
    materialKey: string;
    catalogWorkId: string | null;
    region: string;
    resolvedAt: string;
  },
): UpsertPriceDemandsResult {
  const store = normalizePriceDemandStore(rawStore);
  const byId = new Map(store.demands.map((d) => [d.demandId, d] as const));
  let changed = false;
  let resolved = 0;
  const region = opts.region || "wroclaw";
  const materialKey = String(opts.materialKey || "").trim();
  if (!materialKey) {
    return { store, changed: false, upserted: 0, resolved: 0 };
  }

  const base = {
    materialKey,
    catalogWorkId: opts.catalogWorkId,
    region,
  };
  const family = buildPriceDemandFamilyKey(base);

  const marketId = buildPriceDemandId({ ...base, missingLayer: "MARKET_QUOTE_MISSING" });
  const market = byId.get(marketId);
  if (market && market.status !== "RESOLVED" && buildPriceDemandFamilyKey(market) === family) {
    byId.set(marketId, {
      ...market,
      status: "RESOLVED",
      lastRequestedAt: opts.resolvedAt,
    });
    changed = true;
    resolved += 1;
  }

  const bothId = buildPriceDemandId({ ...base, missingLayer: "BOTH_MISSING" });
  const both = byId.get(bothId);
  if (both && both.status !== "RESOLVED" && buildPriceDemandFamilyKey(both) === family) {
    byId.delete(bothId);
    const purchaseId = buildPriceDemandId({ ...base, missingLayer: "PURCHASE_MISSING" });
    const prevPurchase = byId.get(purchaseId);
    const nextPurchase: PriceDemandRecord = {
      demandId: purchaseId,
      materialKey,
      catalogWorkId: opts.catalogWorkId,
      normalizedName: both.normalizedName,
      unit: both.unit,
      region,
      missingLayer: "PURCHASE_MISSING",
      status: "QUEUED",
      priority: both.priority,
      occurrenceCount: Math.max(both.occurrenceCount, prevPurchase?.occurrenceCount ?? 0),
      tenderIds: mergeTenderIds(both.tenderIds, prevPurchase?.tenderIds ?? []),
      firstRequestedAt: prevPurchase?.firstRequestedAt || both.firstRequestedAt,
      lastRequestedAt: opts.resolvedAt,
      reason: both.reason || "PRICE DATA MISSING",
    };
    byId.set(purchaseId, nextPurchase);
    changed = true;
    resolved += 1;
  }

  return {
    store: normalizePriceDemandStore({
      schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
      updatedAt: changed ? opts.resolvedAt : store.updatedAt,
      demands: [...byId.values()],
    }),
    changed,
    upserted: 0,
    resolved,
  };
}
