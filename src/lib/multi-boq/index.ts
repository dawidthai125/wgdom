/**
 * MULTI-BOQ-01 — dwelling-scoped cost artifact resolve + deterministic compose.
 * DF-MB-01…12 · OfferBoq schema v5 UNCHANGED · COST-MULTI = branch layer only.
 */

export type {
  DwellingCostCompleteness,
  DwellingCostBranchHint,
  DwellingDocumentSet,
  DwellingCostArtifactRef,
  DwellingCostSnapshotLine,
  DwellingCostSnapshot,
  DwellingLineProvenance,
  ComposeDwellingOfferBoqResult,
} from "@/lib/multi-boq/types";

export {
  buildOfferBoqLineIdWithSource,
  buildSourceLineKey,
  foldContentHash,
} from "@/lib/multi-boq/line-id";

export {
  isNonCostHelperFilename,
  isCostEligibleFilename,
  branchHintForFilename,
} from "@/lib/multi-boq/eligibility";

export {
  buildArtifactPoolFromItem,
  findArtifactForDocumentId,
} from "@/lib/multi-boq/artifact-pool";

export { buildDwellingDocumentSet } from "@/lib/multi-boq/document-set";

export {
  mergeDwellingArtifactLines,
  countExtractableLinesFromArtifacts,
  snapshotHasUsableLines,
} from "@/lib/multi-boq/merge";

export {
  normalizeBoqLineForMerge,
  parseCanonicalQuantity,
  normalizeUnitFamily,
  normalizeDescriptionCore,
  canReconcileAthPdfPair,
  inferBoqLineSourceKind,
} from "@/lib/multi-boq/boq-line-normalize";

export { resolveDwellingCostSnapshotForPricing } from "@/lib/multi-boq/resolve";

export { composeDwellingOfferBoq } from "@/lib/multi-boq/compose";

export {
  mapComposedDwellingOfferBoq,
  type MapComposedDwellingOfferBoqInput,
} from "@/lib/multi-boq/map-composed-offer-boq";

export {
  attachComposedBoqToDwelling,
  invalidateDwellingCosting,
} from "@/lib/multi-boq/attach";

export {
  mergeOfferBoqPreservingMappedByLp,
  rebuildOfferBoqFromPdfExtractionText,
  type OfferBoqRebuildFromPdfStats,
} from "@/lib/multi-boq/rebuild-offer-boq-from-pdf-extraction";
