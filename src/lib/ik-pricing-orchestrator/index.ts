/**
 * INTELLIGENT-COST-ESTIMATOR-E2E-WIRE-01 — orchestration above F5 (DF-01/02).
 * F5 stays pure costing · this package owns gap inventory + Accept recompute notify.
 * IK-LABOR-EXPERT-REC-01 — RO labor rate recommendation (never write/Accept).
 */

export {
  notifyIkPricingAccepted,
  notifyIkPricingAcceptedIfPersistOk,
  type NotifyIkPricingAcceptedInput,
  type NotifyIkPricingAcceptedResult,
} from "./notify-accepted";

export {
  inventoryIkGapsFromShadow,
  type InventoryIkGapsFromShadowInput,
} from "./inventory-gaps";

export type {
  IkGapDomain,
  IkGapInventory,
  IkGapJob,
  IkLaborGapJob,
  IkMaterialGapJob,
} from "./types";

export {
  buildIkLaborDedupeKey,
  buildIkMaterialDedupeKey,
} from "./types";

export {
  acceptIkLaborResearchAndNotify,
  buildIkLaborExpertRecommendation,
  buildIkLaborExpertRecommendationPl,
  clearIkLaborResearchSessionDedupeForTests,
  runIkLaborGapResearch,
  type AcceptIkLaborResearchAndNotifyInput,
  type AcceptIkLaborResearchAndNotifyResult,
  type RunIkLaborGapResearchInput,
  type RunIkLaborGapResearchResult,
} from "./labor-research-bridge";

export {
  buildLaborRateEvidencePack,
  LABOR_RATE_REPRESENTATIVE_METHOD,
  type LaborRateEvidenceContext,
  type LaborRateEvidenceObservation,
  type LaborRateEvidencePack,
} from "./labor-rate-evidence";

export {
  analyzeLaborRateCandidate,
  analyzeLaborRateFromResearchStatus,
  LABOR_RATE_DELTA_PCT_CAUTION,
  LABOR_RATE_SPREAD_PCT_CAUTION,
  type LaborRateExpertConfidence,
  type LaborRateExpertFinding,
  type LaborRateExpertRecommendation,
  type LaborRateExpertStance,
} from "./labor-rate-expert-rec";
