/**
 * MULTI-DWELLING-01 — package of dwellings → per-unit OfferBoq → PackageGate → one Bid.
 * Local-only · COST-MULTI orthogonal · OfferBoq schema UNCHANGED.
 */

export {
  DEFAULT_DWELLING_ID,
  MULTI_DWELLING_PACKAGE_LS_KEY,
  MULTI_DWELLING_PACKAGE_SCHEMA_VERSION,
  normalizeDwellingId,
} from "@/lib/multi-dwelling/constants";

export type {
  TenderPackageMode,
  DwellingSubtotals,
  DwellingCostMultiRef,
  DwellingCostUnit,
  TenderPackage,
  PackageGateFailReason,
  PackageGateResult,
  MultiDwellingPackageStore,
} from "@/lib/multi-dwelling/types";

export { evaluatePackageGate } from "@/lib/multi-dwelling/package-gate";

export {
  validateDwellingDocumentMapping,
  dwellingHasValidDocumentMapping,
} from "@/lib/multi-dwelling/package-gate";

export type { DwellingDocumentMappingResult } from "@/lib/multi-dwelling/package-gate";

export {
  emptyMultiDwellingPackageStore,
  emptyTenderPackage,
  loadMultiDwellingPackageStore,
  saveMultiDwellingPackageStore,
  clearMultiDwellingPackageStore,
  getTenderPackage,
  upsertTenderPackage,
  enableMultiDwellingMode,
  setExpectedDwellingCount,
  confirmDwelling,
  mapDocumentToDwelling,
  attachOfferBoqToDwelling,
} from "@/lib/multi-dwelling/store";

export {
  emptyDwellingSubtotals,
  subtotalsFromShadowAndGate,
  evaluateDwellingPositionCost,
  evaluateAllDwellingsInPackage,
  aggregatePackageDirect,
  evaluateTenderPackage,
  computePackageBidProposal,
  hintDwellingCountFromDocumentIds,
  buildDwellingDirectFromShadow,
} from "@/lib/multi-dwelling/orchestration";

export type {
  EvaluateDwellingOpts,
  PackageEvaluationResult,
} from "@/lib/multi-dwelling/orchestration";

export {
  buildOfferBoqLineIdWithDwelling,
  stampDwellingLineIdsOnOfferBoq,
} from "@/lib/multi-dwelling/line-id";
