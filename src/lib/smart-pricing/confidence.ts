/**
 * SMART-PRICING-01 P1/P2 — Decision Confidence (RO compute).
 * DF-P1-02 · DF-P2-04: staging top → max REVIEW (nie READY).
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
 * Top `market_sync_staging` ⇒ nie READY (bias REVIEW).
 */
export function computeDecisionConfidence(
  rankedEvidence: readonly SmartPricingPriceEvidence[],
  opts: ComputeConfidenceOptions = {},
): SmartPricingDecisionConfidence {
  if (opts.unmapped) return "MANUAL";
  if (!rankedEvidence.length) return "MANUAL";

  const top = rankedEvidence[0]!;
  const unitOk =
    opts.unitOk !== false && !(top.warnings ?? []).some((w) => w.includes("unit mismatch"));

  if (!unitOk) return "MANUAL";
  if (top.confidence < SMART_PRICING_CONF_REVIEW) return "MANUAL";

  // Staging nigdy nie jest READY (DF-P2-04 / epicki §6).
  if (top.source === "market_sync_staging") {
    return "REVIEW";
  }

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
