/**
 * IK Full-Tender Walk — coordination layer public API.
 * NO second Research / Rate / BOM / Finance engine.
 */

export * from "./types";
export {
  formatIkG3FinalBidStatusIsolatedPl,
  resolveIkG3UiSourceLabel,
} from "./g3-isolation";
export type { ResolveIkG3UiSourceInput } from "./g3-isolation";
export { projectIkReadiness } from "./readiness-project";
export type { ProjectIkReadinessInput } from "./readiness-project";
export { projectLineWalkState } from "./line-state-project";
export type { ProjectLineWalkInput, ProjectLineWalkResult } from "./line-state-project";
export {
  IK_FULL_TENDER_WALK_LEDGER_KEY,
  emptyIkFullWalkLedgerStore,
  emptyIkFullWalkLedgerStoreForPersist,
  getTenderWalkLedger,
  loadIkFullWalkLedgerStoreLocal,
  mergeIkFullWalkLedgerDataKey,
  normalizeIkFullWalkLedgerStore,
  pushIkFullWalkLedgerToCloudSafe,
  saveIkFullWalkLedgerStoreLocal,
  upsertTenderWalkLedger,
} from "./ledger-store";
export { scheduleLineResearch, researchCtaIsNotExecution } from "./research-schedule";
export type { ScheduleResearchInput, ScheduleResearchResult } from "./research-schedule";
export { runFullTenderWalk } from "./walk-scheduler";
export type {
  RunFullTenderWalkInput,
  RunFullTenderWalkResult,
  WalkBoqLineRef,
} from "./walk-scheduler";
export {
  buildAthClassificationKpi,
  buildIkAnalysisCompletenessKpi,
} from "./completeness-kpi";
export type { AthClassificationKpi, IkAnalysisCompletenessKpi } from "./completeness-kpi";
export {
  IK_OWNER_BILLABLE_SCOPE_EXCLUSION_REASON,
  emptyOwnerBillableScopeExclusionSidecar,
  isOwnerApprovedBillableScopeExclusion,
  listOwnerApprovedExcludedLineIds,
  loadOwnerBillableScopeExclusionFromPackage,
  normalizeOwnerBillableScopeExclusionSidecar,
  persistOwnerBillableScopeExclusionOnPackage,
  removeOwnerBillableScopeExclusion,
  upsertOwnerBillableScopeExclusion,
} from "./owner-billable-scope-exclusion";
export type {
  IkOwnerBillableScopeExclusionRecord,
  IkOwnerBillableScopeExclusionSidecar,
} from "./owner-billable-scope-exclusion";

import { isIkEntryEnabled } from "@/lib/intelligent-estimator/ik-entry-flag";

/** IK-FTO-01: Full Walk default ON when IK Entry is available. */
export function isIkFullTenderWalkEnabled(): boolean {
  return isIkEntryEnabled() === true;
}
