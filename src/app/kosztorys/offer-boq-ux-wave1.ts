/**
 * COSTORYS-UX-01 WAVE 1 — pure UI helpers (bez logiki Bid / OfferBoq engines).
 */

export function tenderDetailContentMaxWidthClass(activeTab: string): string {
  return activeTab === "kosztorys" ? "max-w-none" : "max-w-7xl";
}

export function filterOfferBoqLinesReviewOnly<T extends { requiresUserReview?: boolean }>(
  lines: T[],
  reviewOnly: boolean,
): T[] {
  if (!reviewOnly) return lines;
  return lines.filter((line) => line.requiresUserReview === true);
}

/** Evidence L0: collapsed by default gdy L1 (OfferBoq) ma źródło. */
export function defaultEvidenceExpanded(hasOfferBoqSource: boolean): boolean {
  return !hasOfferBoqSource;
}
