/**
 * Biblioteka Robót i Cennik v3.0 — status aktualności ceny firmy (pure).
 */

import type { CatalogWork, WorkFreshnessStatus } from "@/lib/work-catalog/types";

/** Okno „aktualnej” ceny — zgodne z FINAL PRODUCT SPECIFICATION (90 dni). */
export const WORK_FRESHNESS_STALE_AFTER_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DeriveFreshnessInput {
  companyPricePln: number;
  updatedAt: string;
}

export function workFreshnessStaleAfterMs(): number {
  return WORK_FRESHNESS_STALE_AFTER_DAYS * MS_PER_DAY;
}

export function parseWorkUpdatedAtMs(updatedAt: string): number | null {
  if (!updatedAt?.trim()) return null;
  const t = new Date(updatedAt).getTime();
  return Number.isFinite(t) ? t : null;
}

export function isCompanyPricePresent(companyPricePln: number): boolean {
  return Number.isFinite(companyPricePln) && companyPricePln > 0;
}

/**
 * Wylicza status aktualności bez mutacji wejścia.
 * @param nowMs — znacznik czasu „teraz” w ms (UTC); bez Date.now() wewnątrz.
 */
export function deriveFreshnessStatus(
  input: DeriveFreshnessInput,
  nowMs: number,
): WorkFreshnessStatus {
  if (!isCompanyPricePresent(input.companyPricePln)) {
    return "missing";
  }

  const updatedMs = parseWorkUpdatedAtMs(input.updatedAt);
  if (updatedMs == null) {
    return "stale";
  }

  const ageMs = nowMs - updatedMs;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "stale";
  }

  if (ageMs >= workFreshnessStaleAfterMs()) {
    return "stale";
  }

  return "ok";
}

/** Zwraca kopię robota z wyliczonym `freshnessStatus` (immutable). */
export function withFreshnessStatus(work: CatalogWork, nowMs: number): CatalogWork {
  return {
    ...work,
    freshnessStatus: deriveFreshnessStatus(
      { companyPricePln: work.companyPricePln, updatedAt: work.updatedAt },
      nowMs,
    ),
  };
}

export function withFreshnessStatusAll(works: CatalogWork[], nowMs: number): CatalogWork[] {
  return works.map((work) => withFreshnessStatus(work, nowMs));
}
