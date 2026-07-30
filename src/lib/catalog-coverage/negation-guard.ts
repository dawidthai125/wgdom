/**
 * CATALOG-COVERAGE-01 P0d — Negation Guard (shared SSOT).
 * DF-AMEND D-P0d-16…18: Guard → Bind Decision → Alias | Core.
 * ZERO DUPLICATE: Pack `test` REUSE tych samych helperów.
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";

/** Product ID wrażliwy na negację ATH (kanon P0d). */
export const CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID =
  "cc-p0c-w1-zaprawianie-bruzd" as const;

/**
 * Detekcja negacji: „bez zaprawiania bruzd” (+ synonimy).
 * Wejście: fold PL (lub dowolny tekst — fold wewnątrz listForbidden).
 */
export function hasZaprawianieBruzdNegation(foldedHay: string): boolean {
  if (!foldedHay) return false;
  // foldedHay = fold PL (bez diakrytyków): wyłączeniem → wylaczeniem
  return /(^|\s)(bez|z\s+wylaczeniem|wylaczajac)\s+zaprawiani\w*\s+bruzd/.test(
    foldedHay,
  );
}

/** Pozytywny match frazy zaprawiania / zamurowania (bez negacji). */
export function hasZaprawianieBruzdPositive(foldedHay: string): boolean {
  if (!foldedHay) return false;
  if (hasZaprawianieBruzdNegation(foldedHay)) return false;
  return /zaprawiani\w*\s+bruzd|zamurowan\w*\s+bruzd/.test(foldedHay);
}

/**
 * Product ID zabronione dla tej linii przez Negation Guard.
 * Rozszerzalne — P0d: tylko zaprawianie.
 */
export function listNegationGuardedForbiddenProductIds(
  description: string,
): ReadonlySet<string> {
  const folded = foldPolishText(description || "");
  const forbidden = new Set<string>();
  if (hasZaprawianieBruzdNegation(folded)) {
    forbidden.add(CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID);
  }
  return forbidden;
}

export function isProductIdForbiddenByNegationGuard(
  description: string,
  productId: string | null | undefined,
): boolean {
  if (!productId) return false;
  return listNegationGuardedForbiddenProductIds(description).has(productId);
}

/**
 * Bind Decision: kandydat ID dozwolony tylko gdy Guard nie zabrania.
 * REUSE w Alias wire i po Core.
 */
export function decideCatalogCoverageBindProductId(
  description: string,
  candidateProductId: string | null | undefined,
): string | null {
  if (!candidateProductId) return null;
  if (isProductIdForbiddenByNegationGuard(description, candidateProductId)) {
    return null;
  }
  return candidateProductId;
}
