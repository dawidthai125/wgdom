/**
 * PRICE-INTELLIGENCE-01 P3.2 — LS + optional cloud mirror (fail-soft).
 */

import { pushKeysToCloud } from "@/lib/cloud-sync";
import {
  collectPriceDemandCandidates,
  collectResolvedMaterialKeys,
  type CollectPriceDemandContext,
} from "./demand-collect";
import {
  listActivePriceDemands,
  normalizePriceDemandStore,
  resolvePriceDemandsForMaterials,
  upsertPriceDemandCandidates,
  type UpsertPriceDemandsResult,
} from "./demand-queue";
import {
  PRICE_DEMAND_STORAGE_KEY,
  type PriceDemandStore,
} from "./demand-types";
import type { CompanyCostRo } from "@/lib/cost-expert";
import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";

export function loadPriceDemandStoreLocal(): PriceDemandStore {
  try {
    if (typeof localStorage === "undefined") return normalizePriceDemandStore(null);
    const raw = localStorage.getItem(PRICE_DEMAND_STORAGE_KEY);
    if (!raw) return normalizePriceDemandStore(null);
    return normalizePriceDemandStore(JSON.parse(raw));
  } catch {
    return normalizePriceDemandStore(null);
  }
}

export function savePriceDemandStoreLocal(store: PriceDemandStore): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      PRICE_DEMAND_STORAGE_KEY,
      JSON.stringify(normalizePriceDemandStore(store)),
    );
  } catch {
    /* fail-soft */
  }
}

export interface RecordPriceDemandsResult extends UpsertPriceDemandsResult {
  activeCount: number;
  ok: boolean;
  error?: string;
}

/**
 * Fail-soft: zbiera missing + resolve complete; zapis LS; opcjonalny push cloud.
 * Nigdy nie rzuca — Expert pipeline musi działać dalej.
 */
export function recordPriceDemandsFromExperts(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
  context?: CollectPriceDemandContext;
  pushCloud?: boolean;
}): RecordPriceDemandsResult {
  try {
    const region = String(opts.context?.region || "wroclaw").trim() || "wroclaw";
    const requestedAt = opts.context?.requestedAt ?? new Date().toISOString();
    let store = loadPriceDemandStoreLocal();
    let changed = false;
    let upserted = 0;
    let resolved = 0;

    const candidates = collectPriceDemandCandidates({
      execution: opts.execution,
      pricing: opts.pricing,
      company: opts.company,
      context: { ...opts.context, region, requestedAt },
    });
    if (candidates.length > 0) {
      const up = upsertPriceDemandCandidates(store, candidates);
      store = up.store;
      changed = changed || up.changed;
      upserted += up.upserted;
      resolved += up.resolved;
    }

    const completeKeys = collectResolvedMaterialKeys({
      execution: opts.execution,
      pricing: opts.pricing,
      company: opts.company,
    });
    if (completeKeys.length > 0) {
      const res = resolvePriceDemandsForMaterials(store, {
        materialKeys: completeKeys,
        region,
        resolvedAt: requestedAt,
      });
      store = res.store;
      changed = changed || res.changed;
      resolved += res.resolved;
    }

    if (changed) {
      savePriceDemandStoreLocal(store);
      if (opts.pushCloud && typeof window !== "undefined") {
        void pushKeysToCloud([PRICE_DEMAND_STORAGE_KEY], [store]).catch(() => {
          /* soft */
        });
      }
    }

    return {
      store,
      changed,
      upserted,
      resolved,
      activeCount: listActivePriceDemands(store).length,
      ok: true,
    };
  } catch (e) {
    return {
      store: normalizePriceDemandStore(null),
      changed: false,
      upserted: 0,
      resolved: 0,
      activeCount: 0,
      ok: false,
      error: String((e as Error)?.message || e),
    };
  }
}
