/**
 * MARKET-MATERIAL-RESEARCH-01 — L1 cache usability (CURRENT / STALE / MISSING).
 * REUSE lookupPriceMemory · do not alter PE freshness rules.
 */

import {
  lookupPriceMemory,
  type PriceMemoryLookupInput,
  type PriceMemoryLookupResult,
} from "./price-memory";
import type { MaterialCacheDecision, MaterialCacheUsability } from "./market-material-research-types";

export function classifyPriceMemoryUsability(
  lookup: PriceMemoryLookupResult,
): MaterialCacheUsability {
  if (lookup.status !== "HIT") return "MISSING";
  if (lookup.hit.freshnessUx === "stale") return "STALE";
  // fresh | usable → CURRENT (usable as accepted market price)
  return "CURRENT";
}

export function evaluateMaterialCache(opts: {
  materialKey: string;
  catalogWorkId?: string | null;
  region?: string | null;
  worksById: PriceMemoryLookupInput["worksById"];
  nowMs?: number;
}): MaterialCacheDecision {
  const lookup = lookupPriceMemory({
    materialKey: opts.materialKey,
    catalogWorkId: opts.catalogWorkId,
    region: opts.region,
    worksById: opts.worksById,
    nowMs: opts.nowMs,
  });
  const usability = classifyPriceMemoryUsability(lookup);
  if (lookup.status === "HIT") {
    return { materialKey: opts.materialKey, usability, hit: lookup.hit };
  }
  return {
    materialKey: opts.materialKey,
    usability: "MISSING",
    hit: null,
    missReason: lookup.reason,
  };
}

export function isCooldownActive(
  untilByMaterialKey: Map<string, string>,
  materialKey: string,
  nowMs: number,
): boolean {
  const until = untilByMaterialKey.get(materialKey);
  if (!until) return false;
  const t = Date.parse(until);
  if (!Number.isFinite(t)) return false;
  return t > nowMs;
}

export function setCooldown(
  untilByMaterialKey: Map<string, string>,
  materialKey: string,
  nowMs: number,
  cooldownMs: number,
): void {
  untilByMaterialKey.set(materialKey, new Date(nowMs + cooldownMs).toISOString());
}
