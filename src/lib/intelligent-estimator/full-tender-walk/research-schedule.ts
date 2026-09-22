/**
 * Research scheduling outcomes — invokes existing P5/P6 permission · no Research Engine 2.
 */

import type { IkLaborExpertLineResult } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkResearchWalkOutcome } from "./types";

export type ScheduleResearchInput = {
  labor: Pick<
    IkLaborExpertLineResult,
    "rateStatus" | "classify" | "candidate" | "researchKey"
  > | null | undefined;
  /** Existing runtime: isIkP5LaborExecuteResearchActive() */
  executeResearchPermission: boolean;
  /** Identity contract — classify.allowLaborResearch */
  identityAllowsResearch?: boolean;
  /** True when expert already ran research this pass (researchCalls / candidate) */
  researchAlreadyExecuted?: boolean;
  researchFailed?: boolean;
};

export type ScheduleResearchResult = {
  outcome: IkResearchWalkOutcome;
  /** Should caller pass executeResearch=true into existing Labor Expert */
  shouldExecuteResearch: boolean;
  reason: string;
};

export function scheduleLineResearch(input: ScheduleResearchInput): ScheduleResearchResult {
  const allowIdentity =
    input.identityAllowsResearch
    ?? input.labor?.classify?.allowLaborResearch
    ?? false;
  const rate = input.labor?.rateStatus;
  const miss =
    rate === "MISS"
    || rate === "STALE_TREATED_AS_MISS"
    || rate === "NONE"
    || rate === "RESEARCH_PENDING";

  if (!miss) {
    return {
      outcome: "RESEARCH_NOT_REQUIRED",
      shouldExecuteResearch: false,
      reason: "rate_present_or_non_miss",
    };
  }
  if (!allowIdentity) {
    return {
      outcome: "RESEARCH_BLOCKED_BY_IDENTITY",
      shouldExecuteResearch: false,
      reason: "identity_contract_blocks_research",
    };
  }
  if (input.researchFailed) {
    return {
      outcome: "RESEARCH_FAILED",
      shouldExecuteResearch: false,
      reason: "prior_research_failed",
    };
  }
  if (input.researchAlreadyExecuted || input.labor?.candidate != null) {
    return {
      outcome: "RESEARCH_EXECUTED",
      shouldExecuteResearch: false,
      reason: "candidate_or_executed",
    };
  }
  if (!input.executeResearchPermission) {
    return {
      outcome: "RESEARCH_REQUIRED",
      shouldExecuteResearch: false,
      reason: "permission_off_cta_is_not_execution",
    };
  }
  return {
    outcome: "RESEARCH_REQUIRED",
    shouldExecuteResearch: true,
    reason: "auto_research_on_miss",
  };
}

/** CTA visible must never be treated as proof of RESEARCH_EXECUTED. */
export function researchCtaIsNotExecution(
  ctaVisible: boolean,
  outcome: IkResearchWalkOutcome,
  researchActuallyRan = false,
): boolean {
  if (outcome !== "RESEARCH_EXECUTED") return true;
  // EXECUTED is valid only when research actually ran — CTA alone never suffices.
  if (ctaVisible && !researchActuallyRan) return false;
  return researchActuallyRan === true;
}
