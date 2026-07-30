/**
 * SMART-PRICING-01 P0 — Detect braków użytecznej ceny (Quotes-first, RO).
 * DF §4 [1] · O-SP-F · zero mutacji Quotes / MS / wyceny.
 */

import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_STALE_DAYS,
} from "@/lib/smart-pricing/constants";
import { summarizeProductQuotesRegion } from "@/lib/smart-pricing/quotes-read";
import type {
  SmartPricingDetectLineResult,
  SmartPricingDetectOptions,
  SmartPricingDetectSummary,
  SmartPricingMissingReason,
} from "@/lib/smart-pricing/types";

function emptyByReason(): Record<SmartPricingMissingReason, number> {
  return {
    unmapped: 0,
    work_missing: 0,
    no_quote: 0,
    low_confidence: 0,
    stale: 0,
  };
}

function detectLine(
  line: OfferBoqLine,
  byId: Map<string, CatalogWork>,
  opts: Required<
    Pick<SmartPricingDetectOptions, "regionCode" | "computedAtIso" | "minConfidence" | "staleDays">
  >,
): SmartPricingDetectLineResult {
  const base = {
    lineId: line.lineId,
    lp: line.lp,
    description: line.description,
    catalogWorkId: line.catalogWorkId,
    regionCode: opts.regionCode,
  };

  if (!line.catalogWorkId) {
    return {
      ...base,
      workNamePl: null,
      status: "missing",
      reason: "unmapped",
      bestConfidence: null,
      newestAcquiredAt: null,
    };
  }

  const work = byId.get(line.catalogWorkId);
  if (!work) {
    return {
      ...base,
      workNamePl: null,
      status: "missing",
      reason: "work_missing",
      bestConfidence: null,
      newestAcquiredAt: null,
    };
  }

  const summary = summarizeProductQuotesRegion(work, {
    regionCode: opts.regionCode,
    computedAtIso: opts.computedAtIso,
    minConfidence: opts.minConfidence,
    staleDays: opts.staleDays,
  });

  if (summary.hasUseful) {
    return {
      ...base,
      workNamePl: work.namePl,
      status: "ok",
      reason: null,
      bestConfidence: summary.bestConfidence,
      newestAcquiredAt: summary.newestAcquiredAt,
    };
  }

  return {
    ...base,
    workNamePl: work.namePl,
    status: "missing",
    reason: summary.primaryReject ?? "no_quote",
    bestConfidence: summary.bestConfidence,
    newestAcquiredAt: summary.newestAcquiredAt,
  };
}

/**
 * Detect braków cen rynkowych w kontekście wyceny OfferBoq.
 * Wyłącznie odczyt Product Quotes (work×region).
 */
export function detectMissingPrices(
  doc: OfferBoqDocument | null | undefined,
  works: readonly CatalogWork[],
  options: SmartPricingDetectOptions,
): SmartPricingDetectSummary {
  const minConfidence = options.minConfidence ?? SMART_PRICING_MIN_CONFIDENCE;
  const staleDays = options.staleDays ?? SMART_PRICING_STALE_DAYS;
  const opts = {
    regionCode: options.regionCode,
    computedAtIso: options.computedAtIso,
    minConfidence,
    staleDays,
  };

  const byId = new Map(works.map((w) => [w.id, w]));
  const lines = (doc?.lines ?? []).map((line) => detectLine(line, byId, opts));
  const missingLines = lines
    .filter((l) => l.status === "missing")
    .slice()
    .sort((a, b) => a.lp.localeCompare(b.lp, "pl") || a.lineId.localeCompare(b.lineId));

  const byReason = emptyByReason();
  for (const row of missingLines) {
    if (row.reason) byReason[row.reason] += 1;
  }

  return {
    lineCount: lines.length,
    missingCount: missingLines.length,
    okCount: lines.length - missingLines.length,
    byReason,
    missingLines,
    lines,
    regionCode: options.regionCode,
    computedAtIso: options.computedAtIso,
    minConfidence,
    staleDays,
  };
}

/** Mapa lineId → missing reason (do badge UI). */
export function missingReasonByLineId(
  summary: SmartPricingDetectSummary,
): ReadonlyMap<string, SmartPricingMissingReason> {
  const map = new Map<string, SmartPricingMissingReason>();
  for (const row of summary.missingLines) {
    if (row.reason) map.set(row.lineId, row.reason);
  }
  return map;
}
