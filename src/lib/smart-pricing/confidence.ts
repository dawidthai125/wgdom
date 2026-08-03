/**
 * SMART-PRICING-01 P1 — Decision Confidence (RO compute).
 * DF-P1-02 · zero persist · reguły DF epicki §6 (bez MS staging w P1).
 */

import {
  SMART_PRICING_CONF_READY,
  SMART_PRICING_CONF_READY_STRONG,
  SMART_PRICING_CONF_REVIEW,
} from "@/lib/smart-pricing/constants";
import type {
  SmartPricingDecisionConfidence,
  SmartPricingPriceEvidence,
} from "@/lib/smart-pricing/types";

const STRONG_METHODS = new Set(["ean", "direct_work_quote"]);
const READY_METHODS = new Set(["ean", "provider_sku", "manual", "direct_work_quote"]);
const REVIEW_METHODS = new Set(["mfr_name_unit", "alias"]);

export interface ComputeConfidenceOptions {
  /** Unit mismatch na top Evidence → MANUAL. */
  unitOk?: boolean;
  /** Unmapped line (brak workId) → MANUAL. */
  unmapped?: boolean;
}

/**
 * Pure RO — nie zapisuje nigdzie.
 * Przy konflikcie: MANUAL > REVIEW > READY.
 */
export function computeDecisionConfidence(
  rankedEvidence: readonly SmartPricingPriceEvidence[],
  opts: ComputeConfidenceOptions = {},
): SmartPricingDecisionConfidence {
  if (opts.unmapped) return "MANUAL";
  if (!rankedEvidence.length) return "MANUAL";

  const top = rankedEvidence[0]!;
  const unitOk = opts.unitOk !== false && !(top.warnings ?? []).some((w) => w.includes("unit mismatch"));

  if (!unitOk) return "MANUAL";
  if (top.confidence < SMART_PRICING_CONF_REVIEW) return "MANUAL";

  let level: SmartPricingDecisionConfidence = "MANUAL";

  if (
    top.source === "product_quotes" &&
    STRONG_METHODS.has(top.matchMethod) &&
    top.confidence >= SMART_PRICING_CONF_READY_STRONG &&
    unitOk
  ) {
    level = "READY";
  } else if (
    top.confidence >= SMART_PRICING_CONF_READY &&
    READY_METHODS.has(top.matchMethod) &&
    unitOk
  ) {
    level = "READY";
  } else if (
    top.confidence >= SMART_PRICING_CONF_REVIEW ||
    REVIEW_METHODS.has(top.matchMethod)
  ) {
    level = "REVIEW";
  }

  return level;
}
