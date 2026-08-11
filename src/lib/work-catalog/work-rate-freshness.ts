/**
 * WORK-CATALOG-REBUILD-01 P0 — freshness OUR RATE (TTL 90 dni).
 * NIE reuse deriveFreshnessStatus(companyPricePln).
 */

import { WORK_FRESHNESS_STALE_AFTER_DAYS, parseWorkUpdatedAtMs } from "@/lib/work-catalog/freshness";
import type { OurWorkRate, WorkRateFreshnessStatus } from "@/lib/work-catalog/work-rate-types";
import { WORK_RATE_FRESHNESS_LABELS_PL } from "@/lib/work-catalog/work-rate-types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ten sam TTL co Biblioteka (90), ale wejście = OUR RATE observedAt. */
export const WORK_RATE_FRESHNESS_STALE_AFTER_DAYS = WORK_FRESHNESS_STALE_AFTER_DAYS;

export function workRateFreshnessStaleAfterMs(): number {
  return WORK_RATE_FRESHNESS_STALE_AFTER_DAYS * MS_PER_DAY;
}

export function isOurRatePresent(ourRatePln: number | undefined | null): boolean {
  return Number.isFinite(ourRatePln) && (ourRatePln as number) > 0;
}

/**
 * Freshness wyłącznie z OUR RATE (observedAt).
 * Brak stawki → MISSING. Nie czyta companyPricePln / CatalogWork.updatedAt.
 */
export function deriveOurWorkRateFreshness(
  rate: OurWorkRate | undefined | null,
  nowMs: number,
): WorkRateFreshnessStatus {
  if (!rate || !isOurRatePresent(rate.ourRatePln)) {
    return "MISSING";
  }
  const observedMs = parseWorkUpdatedAtMs(rate.observedAt);
  if (observedMs == null) {
    return "STALE";
  }
  const ageMs = nowMs - observedMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "STALE";
  }
  if (ageMs >= workRateFreshnessStaleAfterMs()) {
    return "STALE";
  }
  return "CURRENT";
}

export function workRateFreshnessLabelPl(status: WorkRateFreshnessStatus): string {
  return WORK_RATE_FRESHNESS_LABELS_PL[status];
}
