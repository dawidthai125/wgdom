/**
 * Świeżość Market Quote — REUSE okna z freshness.ts.
 * NIE używa companyPrice jako Market (Owner Value / drabina cen).
 */

import {
  parseWorkUpdatedAtMs,
  workFreshnessStaleAfterMs,
} from "@/lib/work-catalog/freshness";
import type { MarketFreshnessStatus } from "./types";

export function deriveMarketQuoteFreshness(
  updatedAt: string | null | undefined,
  nowMs: number,
): MarketFreshnessStatus {
  if (!updatedAt?.trim()) return "missing";
  const updatedMs = parseWorkUpdatedAtMs(updatedAt);
  if (updatedMs == null) return "stale";
  const ageMs = nowMs - updatedMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) return "stale";
  if (ageMs >= workFreshnessStaleAfterMs()) return "stale";
  return "ok";
}

export function worstFreshness(
  statuses: readonly MarketFreshnessStatus[],
): MarketFreshnessStatus {
  if (statuses.includes("missing")) return "missing";
  if (statuses.includes("stale")) return "stale";
  if (statuses.length === 0) return "missing";
  return "ok";
}
