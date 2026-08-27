/**
 * APF source pricing basis — Slice 3D design gate.
 *
 * BOQ units remain pomiar/prob. Source tables may price "per measurement"
 * (Cena za pomiar) without a conventional work-rate unit token (szt/pkt/obw).
 *
 * FORBIDDEN: szt/pkt/mb/m2/obw → pomiar/prob proxy.
 */

import { isApfLaborOnlyUnit, normalizeApfUnitToken } from "./labor-units";

/** Source publishes a flat price per completed measurement act. */
export const APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT =
  "PER_MEASUREMENT" as const;

export type ApfSourcePricingBasis =
  typeof APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT;

export const APF_SOURCE_PRICING_BASIS_VALUES = Object.freeze([
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
] as const);

export type ApfMarketEvidenceProvenance =
  | "OWNER_EXTERNAL_SOURCE_EVIDENCE"
  | "LIVE_HTTP";

/**
 * Whether a BOQ line unit may be qualified against a PER_MEASUREMENT source row.
 * Does NOT infer KNR first/next or tableCode mapping.
 */
export function isApfBoqUnitQualifiedByPricingBasis(input: {
  boqUnit: string;
  pricingBasis: ApfSourcePricingBasis;
  /** Source row description — used only for explicit prob/RCD semantics. */
  sourceDescriptionPl: string;
}): boolean {
  if (!isApfLaborOnlyUnit(input.boqUnit)) return false;
  if (input.pricingBasis !== APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT) {
    return false;
  }

  const boq = normalizeApfUnitToken(input.boqUnit);
  if (boq === "pomiar") return true;

  if (boq === "prob" || boq === "prób" || boq === "prob." || boq === "prób.") {
    const desc = String(input.sourceDescriptionPl || "").toLowerCase();
    return (
      /\brcd\b/.test(desc) ||
      /różnicowoprądow/.test(desc) ||
      /wyłącznik.*różnicowoprąd/.test(desc) ||
      /\bbadanie\b.*\brcd\b/.test(desc)
    );
  }

  return false;
}

/** Reject conventional work-rate unit tokens masquerading as measurement pricing. */
export function isApfForbiddenUnitProxyForMeasurement(unitRaw: string): boolean {
  const u = normalizeApfUnitToken(unitRaw);
  return (
    u === "szt" ||
    u === "pkt" ||
    u === "punkt" ||
    u === "pkt." ||
    u === "obw" ||
    u === "obwód" ||
    u === "obwod" ||
    u === "m2" ||
    u === "mb" ||
    u === "m" ||
    u === "h" ||
    u === "rbh"
  );
}

/**
 * Normalize APF source unit from HTML ("pomiar" only).
 * Does NOT map punkt/szt/obw/m2/mb → pomiar.
 */
export function normalizeApfSourceUnitToken(raw: string): string {
  const u = normalizeApfUnitToken(raw);
  if (u === "pomiar" || u === "pom" || u === "pomiarów" || u === "pomiary") {
    return "pomiar";
  }
  return u;
}
