/**
 * P0 — orkiestracja batch: parse → normalize → history → map (bez auto-ACCEPT).
 * Lokalnie / in-memory · 0 requestów zewnętrznych · 0 marketQuotes.
 */

import type {
  InvoicePriceObservation,
  InvoiceProductPriceHistory,
  MappedInvoicePurchaseCandidate,
  ParseInvoiceLineResult,
  RawInvoiceLineInput,
} from "./invoice-types";
import { parseInvoiceLines } from "./invoice-parse";
import {
  buildAllInvoiceProductHistories,
  observationFromParsedLine,
} from "./invoice-history";
import { normalizeInvoiceProduct } from "./invoice-normalize";
import { buildMappedPurchaseCandidates } from "./invoice-etics-map";
import type { ParsedInvoiceLine } from "./invoice-types";

export interface InvoiceCompanyPurchaseBatchResult {
  parsed: ParseInvoiceLineResult[];
  okLines: ParsedInvoiceLine[];
  rejectedCount: number;
  observations: InvoicePriceObservation[];
  histories: InvoiceProductPriceHistory[];
  candidates: MappedInvoicePurchaseCandidate[];
  mappedCount: number;
  needsReviewCount: number;
  unmatchedCount: number;
}

/** Pełny batch lokalny — bez zapisu; ACCEPT osobno (Owner). */
export function processInvoiceCompanyPurchaseBatch(
  rawLines: readonly RawInvoiceLineInput[],
): InvoiceCompanyPurchaseBatchResult {
  const parsed = parseInvoiceLines(rawLines);
  const okLines = parsed.filter((p): p is ParsedInvoiceLine => p.status === "ok");
  const observations = okLines.map((line) =>
    observationFromParsedLine(line, normalizeInvoiceProduct(line)),
  );
  const histories = buildAllInvoiceProductHistories(observations);
  const candidates = buildMappedPurchaseCandidates(okLines);
  return {
    parsed,
    okLines,
    rejectedCount: parsed.length - okLines.length,
    observations,
    histories,
    candidates,
    mappedCount: candidates.filter((c) => c.mapping.status === "mapped").length,
    needsReviewCount: candidates.filter((c) => c.mapping.status === "needs_review").length,
    unmatchedCount: candidates.filter((c) => c.mapping.status === "unmatched").length,
  };
}
