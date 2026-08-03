/**
 * SMART-PRICING-01 P1 — Price Evidence z Product Quotes (RO, pure).
 * DF-P1-03 · source=product_quotes only · zero mutacji Quotes.
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import {
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_STALE_DAYS,
} from "@/lib/smart-pricing/constants";
import { listProductQuoteCellsForRegion } from "@/lib/smart-pricing/quotes-read";
import type { SmartPricingPriceEvidence } from "@/lib/smart-pricing/types";

export interface BuildEvidenceFromQuotesOptions {
  workId: string;
  regionCode: string;
  computedAtIso: string;
  /** Jednostka pozycji wyceny — do warning unit mismatch. */
  lineUnit?: string | null;
  minConfidence?: number;
  staleDays?: number;
  /**
   * Deterministyczny prefix id (testy).
   * Domyślnie: workId|origin|region|acquiredAt|price
   */
  idPrefix?: string;
}

/**
 * Buduje Evidence[] z komórek Product Quotes (price > 0).
 * Pure projection — nie mutuje `work.marketQuotes`.
 */
export function buildEvidenceFromProductQuotes(
  work: CatalogWork | null | undefined,
  opts: BuildEvidenceFromQuotesOptions,
): SmartPricingPriceEvidence[] {
  if (!work) return [];

  const minConfidence = opts.minConfidence ?? SMART_PRICING_MIN_CONFIDENCE;
  const staleDays = opts.staleDays ?? SMART_PRICING_STALE_DAYS;
  const cells = listProductQuoteCellsForRegion(work, {
    regionCode: opts.regionCode,
    computedAtIso: opts.computedAtIso,
    minConfidence,
    staleDays,
  });

  const out: SmartPricingPriceEvidence[] = [];
  for (const cell of cells) {
    if (!(typeof cell.price === "number" && Number.isFinite(cell.price) && cell.price > 0)) {
      continue;
    }
    const warnings: string[] = [];
    if (!cell.useful && cell.rejectReason === "low_confidence") {
      warnings.push("confidence poniżej progu Detect");
    }
    if (!cell.useful && cell.rejectReason === "stale") {
      warnings.push("cena przeterminowana (stale)");
    }
    const workUnit = work.unit?.trim() || null;
    const lineUnit = opts.lineUnit?.trim() || null;
    if (workUnit && lineUnit && workUnit !== lineUnit) {
      warnings.push(`unit mismatch: robota=${workUnit} · pozycja=${lineUnit}`);
    }

    const provider = cell.origin?.trim() || "unknown";
    const idBase =
      opts.idPrefix ??
      `${opts.workId}|${provider}|${cell.regionCode}|${cell.acquiredAt}|${cell.price}`;

    out.push({
      id: `ev:${idBase}`,
      source: "product_quotes",
      provider,
      price: cell.price,
      currency: "PLN",
      acquiredAt: cell.acquiredAt || opts.computedAtIso,
      confidence: cell.confidence,
      matchMethod: "direct_work_quote",
      matchDetail: `Product Quotes · origin=${provider} · region=${cell.regionCode}`,
      region: cell.regionCode || null,
      workId: opts.workId,
      origin: provider,
      unit: workUnit,
      warnings: warnings.length ? warnings : undefined,
      rawRef: `quotes:${opts.workId}:${provider}:${cell.regionCode}`,
    });
  }
  return out;
}

/**
 * Fingerprint RO Quotes work×region (do K-SP-1a).
 * Pure — nie mutuje źródła.
 */
export function productQuotesFingerprint(
  work: CatalogWork | null | undefined,
  regionCode: string,
): string {
  const quotes = work?.marketQuotes;
  if (!quotes || typeof quotes !== "object") return `${regionCode}|{}`;
  const slice: Record<string, unknown> = {};
  for (const [origin, byRegion] of Object.entries(quotes)) {
    if (!byRegion || typeof byRegion !== "object") continue;
    const cell = (byRegion as Record<string, unknown>)[regionCode];
    if (cell != null) slice[origin] = cell;
  }
  return `${regionCode}|${stableStringify(slice)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
