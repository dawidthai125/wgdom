/**
 * SMART-PRICING-01 P0 — odczyt Product Quotes (RO only).
 * SSOT: CatalogWork.marketQuotes · zero mutacji · zero MS staging.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import type { WorkMarketQuotes } from "@/lib/work-catalog/market-sources";
import {
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_MS_PER_DAY,
  SMART_PRICING_STALE_DAYS,
} from "@/lib/smart-pricing/constants";
import type {
  SmartPricingMissingReason,
  SmartPricingQuoteCellRo,
} from "@/lib/smart-pricing/types";

function isFinitePositivePrice(price: unknown): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso || typeof iso !== "string") return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export interface ListQuoteCellsOptions {
  regionCode: string;
  computedAtIso: string;
  minConfidence?: number;
  staleDays?: number;
}

/**
 * Listuje komórki Quotes dla work×region (RO).
 * `useful` = price>0 ∧ confidence≥min ∧ nie stale.
 */
export function listProductQuoteCellsForRegion(
  work: CatalogWork | null | undefined,
  opts: ListQuoteCellsOptions,
): SmartPricingQuoteCellRo[] {
  const minConfidence = opts.minConfidence ?? SMART_PRICING_MIN_CONFIDENCE;
  const staleDays = opts.staleDays ?? SMART_PRICING_STALE_DAYS;
  const computedAtMs = parseIsoMs(opts.computedAtIso) ?? 0;
  const staleMs = staleDays * SMART_PRICING_MS_PER_DAY;
  const quotes = work?.marketQuotes as WorkMarketQuotes | undefined;
  if (!quotes || typeof quotes !== "object") return [];

  const out: SmartPricingQuoteCellRo[] = [];
  for (const [origin, byRegion] of Object.entries(quotes)) {
    if (!byRegion || typeof byRegion !== "object") continue;
    const snap = (byRegion as Record<string, unknown>)[opts.regionCode] as
      | {
          price?: number;
          confidence?: number;
          updatedAt?: string;
          regionCode?: string;
        }
      | undefined;
    if (!snap || typeof snap !== "object") continue;

    const price = snap.price;
    const confidence =
      typeof snap.confidence === "number" && Number.isFinite(snap.confidence)
        ? snap.confidence
        : null;
    const acquiredAt =
      typeof snap.updatedAt === "string" && snap.updatedAt.trim()
        ? snap.updatedAt.trim()
        : "";

    let rejectReason: SmartPricingMissingReason | null = null;
    let useful = false;

    if (!isFinitePositivePrice(price)) {
      rejectReason = "no_quote";
    } else if (confidence == null || confidence < minConfidence) {
      rejectReason = "low_confidence";
    } else {
      const acquiredMs = parseIsoMs(acquiredAt);
      if (acquiredMs == null || computedAtMs - acquiredMs > staleMs) {
        rejectReason = "stale";
      } else {
        useful = true;
      }
    }

    out.push({
      origin,
      regionCode: opts.regionCode,
      price: isFinitePositivePrice(price) ? price : 0,
      confidence: confidence ?? 0,
      acquiredAt: acquiredAt || "",
      useful,
      rejectReason: useful ? null : rejectReason,
    });
  }

  out.sort((a, b) => {
    if (a.useful !== b.useful) return a.useful ? -1 : 1;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.origin.localeCompare(b.origin, "pl");
  });
  return out;
}

/** Czy work×region ma ≥1 użyteczną komórkę Quotes. */
export function hasUsefulProductQuote(
  work: CatalogWork | null | undefined,
  opts: ListQuoteCellsOptions,
): boolean {
  return listProductQuoteCellsForRegion(work, opts).some((c) => c.useful);
}

/**
 * Agregat diagnostyczny: najlepsza confidence / najnowszy acquiredAt w regionie
 * (nawet gdy żadna komórka nie jest useful — do reason stale/low_confidence).
 */
export function summarizeProductQuotesRegion(
  work: CatalogWork | null | undefined,
  opts: ListQuoteCellsOptions,
): {
  hasUseful: boolean;
  bestConfidence: number | null;
  newestAcquiredAt: string | null;
  primaryReject: SmartPricingMissingReason | null;
} {
  const cells = listProductQuoteCellsForRegion(work, opts);
  if (cells.length === 0) {
    return {
      hasUseful: false,
      bestConfidence: null,
      newestAcquiredAt: null,
      primaryReject: "no_quote",
    };
  }
  const useful = cells.filter((c) => c.useful);
  if (useful.length > 0) {
    const newest = useful
      .map((c) => c.acquiredAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
    return {
      hasUseful: true,
      bestConfidence: useful[0]!.confidence,
      newestAcquiredAt: newest,
      primaryReject: null,
    };
  }
  const bestConfidence = Math.max(...cells.map((c) => c.confidence));
  const newestAcquiredAt =
    cells
      .map((c) => c.acquiredAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
  const reasons = cells.map((c) => c.rejectReason).filter(Boolean) as SmartPricingMissingReason[];
  // Preferuj najbardziej „informacyjny” powód: stale > low_confidence > no_quote
  const primaryReject: SmartPricingMissingReason =
    reasons.includes("stale")
      ? "stale"
      : reasons.includes("low_confidence")
        ? "low_confidence"
        : "no_quote";
  return {
    hasUseful: false,
    bestConfidence: Number.isFinite(bestConfidence) ? bestConfidence : null,
    newestAcquiredAt,
    primaryReject,
  };
}
