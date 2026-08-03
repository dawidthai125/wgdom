/**
 * SMART-PRICING-01 — public API.
 * P0: Detect + Quotes RO.
 * P1: Evidence Quotes · Rank · Confidence · One-shot (session) · flag.
 * P2: Evidence MS staging RO · merge · Rank B1 · flag (P2⇒P1).
 * Zakaz: commit / MS Publish / Save / staging write / Cloud Quotes write.
 */

export {
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_STALE_DAYS,
  SMART_PRICING_MS_PER_DAY,
  SMART_PRICING_DEFAULT_PROVIDER_RANK,
  SMART_PRICING_P1_LS_KEY,
  SMART_PRICING_P1_DEFAULT,
  SMART_PRICING_P2_LS_KEY,
  SMART_PRICING_P2_DEFAULT,
  SMART_PRICING_CONF_READY_STRONG,
  SMART_PRICING_CONF_READY,
  SMART_PRICING_CONF_REVIEW,
} from "@/lib/smart-pricing/constants";

export type {
  SmartPricingMissingReason,
  SmartPricingDetectStatus,
  SmartPricingLineContext,
  SmartPricingDetectLineResult,
  SmartPricingDetectSummary,
  SmartPricingDetectOptions,
  SmartPricingQuoteCellRo,
  SmartPricingEvidenceSource,
  SmartPricingMatchMethod,
  SmartPricingPriceEvidence,
  SmartPricingDecisionConfidence,
  SmartPricingOneShotOverlay,
  SmartPricingExtensionPhase,
  SmartPricingExtensionPoint,
} from "@/lib/smart-pricing/types";

export {
  listProductQuoteCellsForRegion,
  hasUsefulProductQuote,
  summarizeProductQuotesRegion,
} from "@/lib/smart-pricing/quotes-read";

export {
  detectMissingPrices,
  missingReasonByLineId,
} from "@/lib/smart-pricing/detect";

export {
  SMART_PRICING_EXTENSIONS,
  isSmartPricingExtensionAvailable,
} from "@/lib/smart-pricing/extensions";

export {
  buildEvidenceFromProductQuotes,
  productQuotesFingerprint,
} from "@/lib/smart-pricing/evidence";

export {
  buildEvidenceFromMarketSyncStaging,
  marketSyncStagingFingerprint,
} from "@/lib/smart-pricing/staging-evidence";

export { mergeSmartPricingEvidence } from "@/lib/smart-pricing/merge";

export { rankEvidence } from "@/lib/smart-pricing/rank";

export { computeDecisionConfidence } from "@/lib/smart-pricing/confidence";

export {
  createOneShotOverlay,
  clearOneShotForLine,
} from "@/lib/smart-pricing/one-shot";

export {
  isSmartPricingP1Enabled,
  isSmartPricingP2Enabled,
  forceSmartPricingP1ForTests,
  forceSmartPricingP2ForTests,
} from "@/lib/smart-pricing/flag";
