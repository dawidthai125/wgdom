/**
 * Confidence MVP — public API (RO).
 */

export {
  CONFIDENCE_MVP_DISCLAIMER_PL,
  CONFIDENCE_MVP_FORMULA_VERSION,
  type ConfidenceBand,
  type ConfidenceBadgeModel,
  type ConfidenceDriver,
  type ConfidenceMvpInput,
  type ConfidenceReport,
  type ConfidenceScore,
} from "./types";

export {
  buildConfidenceReport,
  presentConfidenceBadgeModel,
} from "./build-confidence-report";

export {
  CONFIDENCE_MVP,
  CONFIDENCE_MVP_DEFAULT,
  CONFIDENCE_MVP_LS_KEY,
  forceConfidenceMvpForTests,
  isConfidenceMvpEnabled,
  shouldRenderConfidenceBadge,
} from "./flag";

export {
  buildConfidenceMvpInput,
  countOfferBoqConfidenceLineMetrics,
  mapAveragePricingConfidence,
  resolveHasKosztorysSnapshot,
  resolveHasSwzSignal,
} from "./collect-mvp-input";
