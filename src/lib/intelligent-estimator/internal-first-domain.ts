/**
 * P5.25-FIX — INTERNAL-FIRST domain types + hard price-reuse gate.
 *
 * PACKAGE ≠ MATERIAL ≠ LABOR for FINAL price reuse.
 * Similarity without domain compatibility = INVALID.
 *
 * Pure · ZERO HTTP · ZERO Catalog write · ZERO Accept.
 */

export type InternalFirstPriceDomain =
  | "MATERIAL"
  | "LABOR"
  | "LABOR_MATERIAL_PACKAGE"
  | "NON_COST"
  | "UNKNOWN";

export type DomainCompatResult = {
  compatible: boolean;
  reasonCode: string;
};

/**
 * Hard gate: final price reuse only when source domain === candidate domain
 * (MATERIAL↔MATERIAL, LABOR↔LABOR, PACKAGE↔PACKAGE).
 *
 * Forbidden (among others):
 * - PACKAGE → MATERIAL
 * - PACKAGE → LABOR
 * - MATERIAL → PACKAGE
 * - LABOR → PACKAGE
 * - LABOR → MATERIAL
 * - MATERIAL → LABOR
 */
export function domainsCompatibleForFinalPriceReuse(
  sourceDomain: InternalFirstPriceDomain | string | null | undefined,
  candidateDomain: InternalFirstPriceDomain | string | null | undefined,
): DomainCompatResult {
  const source = normalizeInternalFirstDomain(sourceDomain);
  const candidate = normalizeInternalFirstDomain(candidateDomain);

  if (source === "NON_COST" || candidate === "NON_COST") {
    return { compatible: false, reasonCode: "NON_COST" };
  }
  if (source === "UNKNOWN" || candidate === "UNKNOWN") {
    return { compatible: false, reasonCode: "UNKNOWN_DOMAIN" };
  }
  if (source === candidate) {
    return { compatible: true, reasonCode: "SAME_DOMAIN" };
  }
  return {
    compatible: false,
    reasonCode: `DOMAIN_${source}_NE_${candidate}`,
  };
}

export function normalizeInternalFirstDomain(
  raw: string | null | undefined,
): InternalFirstPriceDomain {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  if (s === "MATERIAL") return "MATERIAL";
  if (s === "LABOR") return "LABOR";
  if (s === "LABOR_MATERIAL_PACKAGE" || s === "PACKAGE" || s === "COMPOUND") {
    return "LABOR_MATERIAL_PACKAGE";
  }
  if (s === "NON_COST") return "NON_COST";
  return "UNKNOWN";
}

/** Allowed catalog layer order for semantic search (no cross-domain fallthrough). */
export function internalFirstSearchLayers(
  sourceDomain: InternalFirstPriceDomain | string | null | undefined,
): InternalFirstPriceDomain[] {
  const d = normalizeInternalFirstDomain(sourceDomain);
  if (d === "MATERIAL") return ["MATERIAL"];
  if (d === "LABOR") return ["LABOR"];
  if (d === "LABOR_MATERIAL_PACKAGE") return ["LABOR_MATERIAL_PACKAGE"];
  return [];
}

export function domainToLayerLabel(domain: InternalFirstPriceDomain): "MATERIAL" | "LABOR" | "PACKAGE" | null {
  if (domain === "MATERIAL") return "MATERIAL";
  if (domain === "LABOR") return "LABOR";
  if (domain === "LABOR_MATERIAL_PACKAGE") return "PACKAGE";
  return null;
}
