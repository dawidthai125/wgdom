/**
 * SMART-PRICING-01 — public API.
 * P0: Detect + Quotes RO + extension stubs.
 * Zakaz: commit / apply / MS Publish / One-shot / Evidence UI (P1+).
 */

export {
  SMART_PRICING_MIN_CONFIDENCE,
  SMART_PRICING_STALE_DAYS,
  SMART_PRICING_MS_PER_DAY,
} from "@/lib/smart-pricing/constants";

export type {
  SmartPricingMissingReason,
  SmartPricingDetectStatus,
  SmartPricingLineContext,
  SmartPricingDetectLineResult,
  SmartPricingDetectSummary,
  SmartPricingDetectOptions,
  SmartPricingQuoteCellRo,
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
