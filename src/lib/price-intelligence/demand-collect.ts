/**
 * PRICE-INTELLIGENCE-01 P3.2 — collect PRICE DATA MISSING candidates (pure).
 */

import type { CompanyCostRo } from "@/lib/cost-expert";
import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import { mapMaterialToMarketWork } from "@/lib/pricing-expert/material-market-map";
import type { PriceDemandCandidate, PriceDemandMissingLayer } from "./demand-types";

export interface CollectPriceDemandContext {
  tenderId?: string | null;
  region?: string | null;
  requestedAt?: string;
}

export function computeMissingLayer(opts: {
  purchaseOk: boolean;
  marketOk: boolean;
}): PriceDemandMissingLayer | null {
  if (opts.purchaseOk && opts.marketOk) return null;
  if (!opts.purchaseOk && !opts.marketOk) return "BOTH_MISSING";
  if (!opts.purchaseOk) return "PURCHASE_MISSING";
  return "MARKET_QUOTE_MISSING";
}

/**
 * Z BOM + Purchase RO + PE lines → dedupe candidates (1 per materialKey w tym wywołaniu).
 */
export function collectPriceDemandCandidates(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
  context?: CollectPriceDemandContext;
}): PriceDemandCandidate[] {
  const requestedAt = opts.context?.requestedAt ?? new Date().toISOString();
  const region = String(opts.context?.region || "wroclaw").trim() || "wroclaw";
  const tenderId = opts.context?.tenderId?.trim() || null;

  const bomMats = opts.execution.bom?.materials ?? [];
  const peByKey = new Map(opts.pricing.lines.map((l) => [l.materialKey, l] as const));

  const keys = new Set<string>();
  for (const m of bomMats) keys.add(m.materialKey);
  for (const l of opts.pricing.lines) keys.add(l.materialKey);

  const out: PriceDemandCandidate[] = [];
  for (const materialKey of keys) {
    const bom = bomMats.find((m) => m.materialKey === materialKey);
    const pe = peByKey.get(materialKey);
    const purchaseOk =
      (opts.company.purchaseByMaterialKey[materialKey]?.unitPricePln ?? 0) > 0;
    const marketOk = pe?.marketPricePln != null && pe.marketPricePln > 0;
    const missingLayer = computeMissingLayer({ purchaseOk, marketOk });
    if (!missingLayer) continue;

    const map = mapMaterialToMarketWork(materialKey);
    const catalogWorkId =
      pe?.mappedWorkId ??
      map?.candidateWorkIds?.[0] ??
      map?.workId ??
      null;
    const namePl = pe?.namePl || bom?.namePl || map?.labelPl || materialKey;
    const unit = pe?.unit || bom?.unit || "";

    out.push({
      materialKey,
      catalogWorkId,
      namePl,
      unit,
      region,
      missingLayer,
      tenderId,
      requestedAt,
      reason: "PRICE DATA MISSING",
    });
  }
  return out;
}

export function collectResolvedMaterialKeys(opts: {
  execution: ExecutionExpertAnalysisResult;
  pricing: PricingExpertAnalysisResult;
  company: CompanyCostRo;
}): string[] {
  const bomMats = opts.execution.bom?.materials ?? [];
  const peByKey = new Map(opts.pricing.lines.map((l) => [l.materialKey, l] as const));
  const keys = new Set<string>();
  for (const m of bomMats) keys.add(m.materialKey);
  for (const l of opts.pricing.lines) keys.add(l.materialKey);

  const resolved: string[] = [];
  for (const materialKey of keys) {
    const purchaseOk =
      (opts.company.purchaseByMaterialKey[materialKey]?.unitPricePln ?? 0) > 0;
    const pe = peByKey.get(materialKey);
    const marketOk = pe?.marketPricePln != null && pe.marketPricePln > 0;
    if (purchaseOk && marketOk) resolved.push(materialKey);
  }
  return resolved;
}
