/**
 * KE-01 / KE-E1 — Knowledge Engine Foundation (thin slice public API).
 */

export {
  KE_BLEND_BAND,
  KE_CAP_MARKET,
  KE_DEFAULT_POLICY,
  KE_FRESH_DAYS,
  KE_N_MIN,
  KE_N_SOLE,
  KE_SCORE_WEIGHTS,
  type KnowledgeAlternateSummary,
  type KnowledgeCandidate,
  type KnowledgeConfidenceLevel,
  type KnowledgeEngineExplainMeta,
  type KnowledgeFreshness,
  type KnowledgeReasonCode,
  type KnowledgeResolveSource,
  type KnowledgeResolverInput,
  type KnowledgeResolverOutput,
  type KnowledgeResolverPolicy,
  type KnowledgeScorecard,
  type KnowledgeSourceKind,
} from "./types";

export {
  daysBetween,
  evaluateCandidateEligibility,
  freshnessFromAsOf,
  isCompanyEligible,
  isGlobalPriceEligible,
  isMarketEligible,
  isOwnerEligible,
  mergeKePolicy,
} from "./eligibility";

export {
  agreementTo01,
  buildScorecard,
  confidenceTo01,
  freshnessTo01,
  levelFromTotal,
  nTo01,
  varianceTo01,
} from "./scorecard";

export { resolveKnowledgePrice, toKnowledgeEngineExplainMeta } from "./resolver";

export { lookupToKnowledgeCandidate, type PriceLookupLike } from "./adapter-from-lookup";
