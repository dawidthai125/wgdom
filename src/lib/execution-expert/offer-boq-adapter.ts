/**
 * P0.1 — adapter OfferBoq → BoqContext (wejście do Technology Foundation).
 * Logika należy do Eksperta Wykonania; TF nie importuje OfferBoq.
 */

import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { BoqContext, BoqContextLine } from "@/lib/technology-foundation";

export type OfferBoqLineLike = Pick<
  OfferBoqLine,
  "lineId" | "description" | "quantity" | "unit" | "catalogWorkId" | "isNoise" | "normalizedDescription"
>;

export function isOfferBoqLineEligibleForExecution(line: OfferBoqLineLike): boolean {
  if (line.isNoise) return false;
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return false;
  const desc = (line.normalizedDescription || line.description || "").trim();
  return desc.length > 0 || Boolean(line.catalogWorkId?.trim());
}

export function offerBoqLineToBoqContextLine(line: OfferBoqLineLike): BoqContextLine {
  const hint = line.catalogWorkId?.trim() || undefined;
  const key = String(line.lineId || "").trim();
  return {
    lineKey: key || `boq_${(line.description || "line").slice(0, 24).replace(/\s+/g, "_")}`,
    catalogWorkIdHint: hint,
    quantity: Number(line.quantity) || 0,
    unit: line.unit?.trim() || undefined,
  };
}

/** Pełny kontekst BOQ z dokumentu OfferBoq (wszystkie kwalifikujące się linie). */
export function offerBoqToBoqContext(doc: Pick<OfferBoqDocument, "lines">): BoqContext {
  const lines = (doc.lines ?? [])
    .filter(isOfferBoqLineEligibleForExecution)
    .map(offerBoqLineToBoqContextLine);
  return { lines };
}

/**
 * Kontekst zawężony do linii dopasowanych do Pack (P0.1 + P0.3).
 * Gdy brak matchedLineIds — fallback: wszystkie kwalifikujące się linie.
 */
export function offerBoqToBoqContextForPack(
  doc: Pick<OfferBoqDocument, "lines">,
  matchedLineIds: string[],
): BoqContext {
  const idSet = new Set(matchedLineIds.map((id) => String(id).trim()).filter(Boolean));
  const eligible = (doc.lines ?? []).filter(isOfferBoqLineEligibleForExecution);
  const scoped =
    idSet.size > 0 ? eligible.filter((l) => idSet.has(String(l.lineId).trim())) : eligible;
  const use = scoped.length > 0 ? scoped : eligible;
  return { lines: use.map(offerBoqLineToBoqContextLine) };
}
