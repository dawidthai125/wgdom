/**
 * Line state projection — pure map from existing expert signals.
 */

import type { IkLaborExpertLineResult } from "@/lib/intelligent-estimator/ik-labor-expert";
import type { IkMaterialExpertLineResult } from "@/lib/intelligent-estimator/ik-material-expert";
import type {
  IkFullWalkLineStatus,
  IkFullWalkStage,
  IkResearchWalkOutcome,
} from "./types";

export type ProjectLineWalkInput = {
  lineId: string;
  labor?: Pick<
    IkLaborExpertLineResult,
    "lineId" | "bucket" | "rateStatus" | "identity" | "matchConfidence" | "classify"
  > | null;
  material?: Pick<
    IkMaterialExpertLineResult,
    "lineId" | "bucket" | "identity"
  > | null;
  allowLaborResearch?: boolean;
  positionComplete?: boolean;
  researchExecuted?: boolean;
  researchFailed?: boolean;
  hasTechnologyPack?: boolean | null;
  materialRequired?: boolean;
  /**
   * IK-CLOSURE-WAVE1 — Owner-approved EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE.
   * Must be pre-filtered (ownerApproved===true). ≠ POSITION_COMPLETE.
   */
  ownerExcludedFromBillableScope?: boolean;
};

export type ProjectLineWalkResult = {
  status: IkFullWalkLineStatus;
  stage: IkFullWalkStage;
  researchOutcome: IkResearchWalkOutcome;
  blocker: string | null;
  nextAction: string | null;
};

function identityOk(
  labor: ProjectLineWalkInput["labor"],
  material: ProjectLineWalkInput["material"],
): "ok" | "hold" | "pending" {
  const id = labor?.identity ?? material?.identity;
  if (!id) return "pending";
  const st = String((id as { status?: string }).status ?? "");
  if (st === "OK" || st === "RESOLVED" || st === "TRUSTED") return "ok";
  if (st === "AMBIGUOUS" || st === "CONFLICT" || st === "UNRESOLVED") return "hold";
  return "pending";
}

export function projectLineWalkState(input: ProjectLineWalkInput): ProjectLineWalkResult {
  // WAVE1 — Owner billable exclusion is terminal for pricing, not COMPLETE.
  if (input.ownerExcludedFromBillableScope === true) {
    return {
      status: "OWNER_EXCEPTION",
      stage: "finance",
      researchOutcome: "RESEARCH_NOT_REQUIRED",
      blocker: "EXCLUDED_FROM_CURRENT_BILLABLE_SCOPE",
      nextAction: "owner_scope_hold_visible_not_priced",
    };
  }

  const idState = identityOk(input.labor, input.material);
  if (idState === "pending" && !input.labor && !input.material) {
    return {
      status: "NOT_STARTED",
      stage: "identity",
      researchOutcome: "RESEARCH_NOT_REQUIRED",
      blocker: null,
      nextAction: "run_identity",
    };
  }
  if (idState === "hold") {
    const researchBlocked = input.allowLaborResearch === false;
    return {
      status: "IDENTITY_HOLD",
      stage: "identity",
      researchOutcome: researchBlocked
        ? "RESEARCH_BLOCKED_BY_IDENTITY"
        : "RESEARCH_NOT_REQUIRED",
      blocker: "IDENTITY_AMBIGUOUS_OR_UNRESOLVED",
      nextAction: "owner_g1_or_resolve_identity",
    };
  }

  const rate = input.labor?.rateStatus;
  const bucket = input.labor?.bucket;
  const allowResearch =
    input.allowLaborResearch
    ?? input.labor?.classify?.allowLaborResearch
    ?? true;
  const miss =
    rate === "MISS"
    || rate === "STALE_TREATED_AS_MISS"
    || rate === "NONE"
    || rate === "RESEARCH_PENDING";

  if (input.researchFailed) {
    return {
      status: "DATA_BLOCK",
      stage: "research",
      researchOutcome: "RESEARCH_FAILED",
      blocker: "RESEARCH_FAILED",
      nextAction: "retry_research_or_owner",
    };
  }

  if (miss && allowResearch === false) {
    return {
      status: "IDENTITY_HOLD",
      stage: "research",
      researchOutcome: "RESEARCH_BLOCKED_BY_IDENTITY",
      blocker: "RESEARCH_BLOCKED_BY_IDENTITY",
      nextAction: "resolve_identity_before_research",
    };
  }

  if (miss && allowResearch !== false) {
    if (input.researchExecuted) {
      return {
        status: "RESEARCH_COMPLETE",
        stage: "evidence",
        researchOutcome: "RESEARCH_EXECUTED",
        blocker: null,
        nextAction: "accept_or_continue_pricing",
      };
    }
    return {
      status: "RESEARCH_PENDING",
      stage: "research",
      researchOutcome: "RESEARCH_REQUIRED",
      blocker: null,
      nextAction: "execute_research",
    };
  }

  if (input.materialRequired && input.hasTechnologyPack === false) {
    return {
      status: "DATA_BLOCK",
      stage: "technology",
      researchOutcome: "RESEARCH_NOT_REQUIRED",
      blocker: "TECHNOLOGY_PACK_MISSING",
      nextAction: "knowledge_gap_or_research_pack",
    };
  }

  if (input.positionComplete === true) {
    return {
      status: "POSITION_COMPLETE",
      stage: "position_cost",
      researchOutcome: miss ? "RESEARCH_EXECUTED" : "RESEARCH_NOT_REQUIRED",
      blocker: null,
      nextAction: null,
    };
  }

  if (bucket === "UNRESOLVED" || bucket === "BOTH") {
    return {
      status: "OWNER_EXCEPTION",
      stage: "classification",
      researchOutcome: "RESEARCH_NOT_REQUIRED",
      blocker: `BUCKET_${bucket}`,
      nextAction: "owner_classify_or_split",
    };
  }

  if (rate === "CURRENT_HIT" || rate === "INTERNAL_EXACT_HIT" || rate === "INTERNAL_SEMANTIC_HIT") {
    return {
      status: "POSITION_COST_PENDING",
      stage: "position_cost",
      researchOutcome: "RESEARCH_NOT_REQUIRED",
      blocker: null,
      nextAction: "run_position_cost",
    };
  }

  return {
    status: "PRICING_PENDING",
    stage: "our_rate",
    researchOutcome: "RESEARCH_NOT_REQUIRED",
    blocker: null,
    nextAction: "pricing_continue",
  };
}
