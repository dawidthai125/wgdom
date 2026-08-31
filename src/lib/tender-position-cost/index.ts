/**
 * TENDER-BOQ-PRICING-REBUILD-01 — Position Cost public API.
 * F0: pure engine · F1: OUR RATE · F2: material SELL · F3: BOM · F4: OfferBoq shadow · F5: Bid cutover.
 */

export type {
  PositionCostInput,
  PositionCostIssue,
  PositionCostIssueCode,
  PositionCostResult,
  PositionLaborInput,
  PositionLaborStatus,
  PositionMaterialInput,
  PositionMaterialStatus,
} from "@/lib/tender-position-cost/types";

export { computePositionCost } from "@/lib/tender-position-cost/engine";

export type {
  ComputePositionCostWithOurRateInput,
  ComputePositionCostWithOurRateResult,
  OurRateLaborResolve,
  OurRateLaborResolveStatus,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";

export {
  computePositionCostWithOurRate,
  resolveLaborInputFromOurWorkRate,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";

export type {
  ComputePositionCostWithMaterialsInput,
  ComputePositionCostWithMaterialsResult,
  ComputePositionCostWithOurRateAndMaterialsInput,
  ComputePositionCostWithOurRateAndMaterialsResult,
  MaterialComponentSpec,
  MaterialSellResolve,
  MaterialSellResolveStatus,
} from "@/lib/tender-position-cost/material-sell-adapter";

export {
  computePositionCostWithMaterials,
  computePositionCostWithOurRateAndMaterials,
  resolveMaterialInputFromPriceMemory,
  resolveMaterialsInputFromPriceMemory,
} from "@/lib/tender-position-cost/material-sell-adapter";

export type {
  BomComponentResolved,
  BomTechnologyResolve,
  BomTechnologyStatus,
  ComputePositionCostWithBomInput,
  ComputePositionCostWithBomResult,
} from "@/lib/tender-position-cost/bom-technology-adapter";

export {
  computePositionCostWithBomTechnology,
  findActiveTechnologyPacksForWorkId,
  validateRecipeLine,
  resolveLaborOnlyBomForWork,
  resolveTechnologyBomForWork,
} from "@/lib/tender-position-cost/bom-technology-adapter";

export {
  OWNER_APPROVED_LABOR_ONLY_WORK_IDS,
  OWNER_MATERIALS_REQUIRED_WORK_IDS,
  OWNER_WAVE1_UNIT_HOLD_WORK_IDS,
  isExplicitLaborOnlyWork,
  isMaterialsRequiredWork,
} from "@/lib/tender-position-cost/labor-only-classification";

export type { LaborOnlyClassifyOpts } from "@/lib/tender-position-cost/labor-only-classification";

export {
  OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS,
  isExplicitMaterialSupplyWork,
} from "@/lib/tender-position-cost/material-supply-classification";

export type { MaterialSupplyClassifyOpts } from "@/lib/tender-position-cost/material-supply-classification";

export type {
  CatalogWorkQuotesSellResolve,
  CatalogWorkQuotesSellStatus,
} from "@/lib/tender-position-cost/catalog-work-quotes-sell-adapter";

export { resolveMaterialSellFromCatalogWorkQuotes } from "@/lib/tender-position-cost/catalog-work-quotes-sell-adapter";

export type {
  EquipmentComponentResult,
  EquipmentPriceConfidence,
  EquipmentPriceProvenance,
  EquipmentPriceProvider,
  EquipmentPriceProviderRequest,
  EquipmentPriceProviderResult,
  EquipmentRateStatus,
} from "@/lib/tender-position-cost/equipment-contract";

export {
  buildEquipmentComponentResult,
  createUnresolvedEquipmentPriceProvider,
} from "@/lib/tender-position-cost/equipment-contract";

export type { OwnerInputEquipmentProviderOpts } from "@/lib/tender-position-cost/owner-input-equipment-provider";

export {
  createOwnerInputEquipmentPriceProvider,
  resolveEquipmentFromOwnerInput,
} from "@/lib/tender-position-cost/owner-input-equipment-provider";

export type { OwnerInputTransportProviderOpts } from "@/lib/tender-position-cost/owner-input-transport-provider";

export {
  createOwnerInputTransportPriceProvider,
  resolveTransportFromOwnerInput,
} from "@/lib/tender-position-cost/owner-input-transport-provider";

export type {
  MarkTransportBidCandidateFailureReason,
  MarkTransportBidCandidateInput,
  MarkTransportBidCandidateResult,
  TransportBidCandidateGuard,
  TransportBidCandidateMarkedByRole,
  TransportBidCandidateRecord,
  TransportBidCandidateStore,
  UnmarkTransportBidCandidateInput,
  UnmarkTransportBidCandidateResult,
} from "@/lib/tender-position-cost/transport-bid-candidate";

export {
  TRANSPORT_BID_CANDIDATE_LS_KEY,
  TRANSPORT_BID_CANDIDATE_SCHEMA_VERSION,
  clearTransportBidCandidateStore,
  emptyTransportBidCandidateStore,
  isTransportBidCandidate,
  isTransportUtylizacjaLine,
  listTransportBidCandidates,
  loadTransportBidCandidateStore,
  markTransportBidCandidate,
  unmarkTransportBidCandidate,
} from "@/lib/tender-position-cost/transport-bid-candidate";

export type {
  TransportComponentResult,
  TransportPriceConfidence,
  TransportPriceProvenance,
  TransportPriceProvider,
  TransportPriceProviderRequest,
  TransportPriceProviderResult,
  TransportRateStatus,
  TransportSourceClass,
} from "@/lib/tender-position-cost/transport-contract";

export {
  buildTransportComponentResult,
  createUnresolvedTransportPriceProvider,
} from "@/lib/tender-position-cost/transport-contract";

export type {
  ComputeShadowBoqPositionCostsInput,
  ComputeShadowPositionCostForLineInput,
  ShadowBoqPositionCostResult,
  ShadowGapCode,
  ShadowPositionCostLineResult,
  ShadowWorkIdentityResolve,
  ShadowWorkIdentityStatus,
} from "@/lib/tender-position-cost/boq-shadow-adapter";

export {
  SHADOW_POSITION_COST_SCHEMA_VERSION,
  computeShadowPositionCostForOfferBoqLine,
  computeShadowPositionCostsForOfferBoq,
  resolveWorkIdentityFromOfferBoqLine,
} from "@/lib/tender-position-cost/boq-shadow-adapter";

export type {
  CatalogBoundBasis,
  EphemeralBasisValidation,
  EphemeralEquipmentComponent,
  EphemeralLaborComponent,
  EphemeralMaterialComponent,
  EphemeralResearchBasis,
  PositionCostBasis,
  PricingConfidence,
  ResearchEvidence,
  ResearchEvidenceKind,
} from "@/lib/tender-position-cost/position-cost-basis";

export {
  buildPositionCostInputFromEphemeralBasis,
  ephemeralBasisHasFakeCatalogId,
  isEphemeralResearchBasis,
  knrKnowledgeAloneYieldsLaborPln,
  pricingCandidateFromKnowledgeEvidenceOnly,
  validateEphemeralResearchBasis,
} from "@/lib/tender-position-cost/position-cost-basis";

/** Slice 2 — Autonomous Pricing Fallback (IDENTITY MISS → research → ephemeral). */
export {
  apfDistinctIdentityKey,
  buildApfPricingCandidateFromEvidence,
  buildApfResearchQuery,
  createDefaultApfKnrKnowledgePort,
  createDefaultApfLaborMarketPort,
  createFixtureApfLaborMarketPort,
  createPolicyDenyApfLaborMarketPort,
  evaluateApfEphemeralSelectiveResearchPolicy,
  isApfEphemeralSelectiveResearchPolicyGranted,
  isApfKnowledgeOnlyEvidence,
  isApfLaborOnlyUnit,
  mapApfLaborUnitToEngineUnit,
  marketObservationsToResearchEvidence,
  pricingCandidateToEphemeralResearchBasis,
  runAutonomousPricingFallback,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback";

export type {
  ApfCatalogBasis,
  ApfHoldCode,
  ApfLaborMarketObservation,
  ApfLaborMarketPort,
  ApfPricingCandidate,
  ApfResearchEvidence,
  ApfResearchQuery,
  ApfRunCounters,
  ApfRunResult,
  RunAutonomousPricingFallbackInput,
  RunAutonomousPricingFallbackResult,
} from "@/lib/tender-position-cost/autonomous-pricing-fallback";

export type {
  BidCutoverGateResult,
  ComputeBidFromPositionCostInput,
  LegacyVsPositionCostBidCompare,
  PositionCostBidDirectBuild,
  PositionCostCutoverOpts,
} from "@/lib/tender-position-cost/bid-position-cost-cutover";

export {
  BID_POSITION_COST_CUTOVER_SCHEMA_VERSION,
  buildOfferBoqDirectFromPositionCost,
  buildPositionCostBidDirect,
  compareLegacyVsPositionCostBid,
  computeBidProposalFromPositionCost,
  computePositionCostShadowAndGate,
  evaluateBidCutoverGate,
} from "@/lib/tender-position-cost/bid-position-cost-cutover";
