/**
 * IK Autonomous Pricing Fallback — Slice 2 public barrel.
 */

export type {
  ApfCatalogBasis,
  ApfHoldCode,
  ApfKnrKnowledgePort,
  ApfLaborMarketObservation,
  ApfLaborMarketPort,
  ApfLaborMarketPortResult,
  ApfPricingCandidate,
  ApfResearchEvidence,
  ApfResearchEvidenceKind,
  ApfResearchQuery,
  ApfRunCounters,
  ApfRunHold,
  ApfRunResult,
  ApfRunSuccess,
} from "./types";

export type { ApfLineLike } from "./query";
export { apfDistinctIdentityKey, buildApfResearchQuery } from "./query";

export {
  isApfLaborOnlyUnit,
  mapApfLaborUnitToEngineUnit,
  normalizeApfUnitToken,
} from "./labor-units";

export {
  collectKnrKnowledgeEvidenceFromQuery,
  createDefaultApfKnrKnowledgePort,
} from "./knr-knowledge";

export {
  createApfProductionFetchPort,
} from "./apf-production-fetch";

export {
  createApfHttpLaborMarketPort,
  createDefaultApfLaborMarketPort,
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
  createApfLaborMarketPort,
  createProductionApfLaborMarketPort,
} from "./labor-market";
export type { CreateApfLaborMarketPortOptions } from "./labor-market";

export {
  runApfAuthorizedHttpResearch,
} from "./apf-http-research";
export type { ApfHttpFetchPort, ApfHttpFetchResult } from "./apf-http-research";

export { validateApfHttpRequest } from "./apf-http-guard";
export type { ApfHttpGuardResult, ApfHttpGuardRejectReason } from "./apf-http-guard";

export { parseApfMeasurementPriceHtml } from "./apf-measurement-html-parse";
export type { ApfParsedMeasurementRow } from "./apf-measurement-html-parse";

export {
  selectApfMeasurementRowsForQuery,
  apfObservationHasInferredKnrTableCode,
  APF_NEVER_INFER_TABLE_CODES,
} from "./apf-measurement-semantic-match";

export {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_ROUTES,
  APF_AUTHORIZED_HOSTS,
  APF_KB_BENCHMARK_MEASUREMENT_URL,
  APF_KB_BENCHMARK_SOURCE_ID,
  APF_OWNER_STATUS_AUTHORIZED,
  APF_HTTP_MAX_REQUESTS_PER_RESEARCH,
  assertApfHostsNotInKeep4,
  isApfAuthorizedHost,
  isApfHostBlockedFromNormalWorkRate,
  isApfAuthorizedSourceId,
  resolveApfAuthorizedRoute,
  resolveApfAuthorizedRouteByUrl,
  listApfPrimaryAuthorizedRoutes,
  listApfSecondaryAuthorizedRoutes,
} from "./apf-source-authorization";
export type {
  ApfAuthorizedSourceId,
  ApfAuthorizedCategoryKey,
  ApfAuthorizedSourceRole,
} from "./apf-source-authorization";

export {
  APF_EPHEMERAL_SELECTIVE_AUTHORIZED_UNITS,
  APF_EPHEMERAL_SELECTIVE_RESEARCH_PLANE,
  evaluateApfEphemeralSelectiveResearchPolicy,
  isApfEphemeralSelectiveResearchPolicyGranted,
  isApfRouteBlockedFromNormalWorkRate,
} from "./apf-ephemeral-selective-research-policy";

export {
  APF_NOMINATION_STATUS_OWNER_AUTHORIZED_APF_SOURCE,
  APF_NOMINATION_STATUS_OWNER_NOMINATED_PENDING_KEEP4,
  APF_OWNER_NOMINATED_SOURCE_ROUTES,
  isApfNominatedHostInKeep4,
  isApfNominatedSourceEligibleForNormalWorkRate,
  isApfNominatedSourceId,
  isApfNominatedRouteExecutionAuthorized,
  isKeep4WorkRateSourceId,
  listApfOwnerNominatedSourceRoutes,
  resolveApfOwnerNominatedRoute,
} from "./apf-source-nomination-registry";

export {
  APF_ENERGOSPIN_EXPLICITLY_ABSENT_KNR_TABLES,
  APF_OWNER_EXTERNAL_EVIDENCE_ENERGOSPIN,
} from "./owner-external-source-evidence-energospin";

export {
  APF_ELECTRICO_EXPLICITLY_ABSENT_KNR_TABLES,
  APF_OWNER_EXTERNAL_EVIDENCE_ELECTRICO,
} from "./owner-external-source-evidence-electrico";

export {
  buildApfPricingCandidateFromEvidence,
  isApfKnowledgeOnlyEvidence,
  marketObservationsToResearchEvidence,
} from "./candidate";

export {
  apfEvidenceToSlice1ResearchEvidence,
  pricingCandidateToEphemeralResearchBasis,
} from "./to-ephemeral";

export {
  APF_SOURCE_PRICING_BASIS_PER_MEASUREMENT,
  APF_SOURCE_PRICING_BASIS_VALUES,
  isApfBoqUnitQualifiedByPricingBasis,
  isApfForbiddenUnitProxyForMeasurement,
} from "./apf-pricing-basis";
export type {
  ApfMarketEvidenceProvenance,
  ApfSourcePricingBasis,
} from "./apf-pricing-basis";

export { qualifyApfOwnerExternalEvidenceRow } from "./apf-external-evidence-qualify";
export type { ApfExternalEvidenceQualifyResult } from "./apf-external-evidence-qualify";

export type {
  ApfEphemeralSelectiveAuthorizedRoute,
  ApfEphemeralSelectiveResearchExecutionBlockReason,
  ApfEphemeralSelectiveResearchPlane,
  ApfEphemeralSelectiveResearchPolicyResult,
  ApfEphemeralSelectiveResearchPolicySideEffects,
} from "./apf-ephemeral-selective-research-policy";
export type {
  ApfNominatedCategoryKey,
  ApfNominatedSourceId,
  ApfOwnerNominatedSourceRoute,
  ApfSourceNominationStatus,
} from "./apf-source-nomination-registry";
export type { ApfOwnerExternalSourceEvidenceRow } from "./owner-external-source-evidence-energospin";

export type {
  RunAutonomousPricingFallbackInput,
  RunAutonomousPricingFallbackResult,
  RunAutonomousPricingFallbackSuccess,
} from "./run";
export { runAutonomousPricingFallback } from "./run";
