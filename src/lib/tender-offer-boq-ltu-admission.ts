/**
 * Środa L+T+U peer suppression — OfferBoq mapping admission gate (Owner FREEZE).
 *
 * After P1 unit-family + P2 object-consistency, before sort / TOP-4.
 * Suppresses structural-only (L∧T∧U ∧ ¬semantic) peers when ≥1 semantic
 * candidate exists in the post-P2 pool. Otherwise idle.
 *
 * Does NOT change scores, sort, slice, primary-pick, F5, P1, or P2.
 */

/** Minimal score signals required by the L+T+U admission gate (V1). */
export type OfferBoqLtuScoreSignals = {
  knrHit: boolean;
  aliasHit?: boolean;
  keywordHit: boolean;
  nameHit: boolean;
  descHit: boolean;
  categoryHit: boolean;
  tradeHit: boolean;
  unitHit: boolean;
};

export function offerBoqHasSemanticSignal(s: OfferBoqLtuScoreSignals): boolean {
  return (
    s.knrHit === true ||
    s.aliasHit === true ||
    s.keywordHit === true ||
    s.nameHit === true ||
    s.descHit === true
  );
}

export function offerBoqIsStructuralLtuOnly(s: OfferBoqLtuScoreSignals): boolean {
  return (
    s.categoryHit === true &&
    s.tradeHit === true &&
    s.unitHit === true &&
    !offerBoqHasSemanticSignal(s)
  );
}

/**
 * Conditional admission filter. Does not sort, slice, or mutate scores.
 * Returns the same array reference when idle (no semantic peer).
 */
export function filterOfferBoqLtuAdmission<T extends OfferBoqLtuScoreSignals>(
  scored: readonly T[],
): T[] {
  const hasSemantic = scored.some((s) => offerBoqHasSemanticSignal(s));
  if (!hasSemantic) return scored as T[];
  return scored.filter((s) => !offerBoqIsStructuralLtuOnly(s));
}
