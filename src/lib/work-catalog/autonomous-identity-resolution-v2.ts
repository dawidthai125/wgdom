/**
 * AUTONOMOUS_IDENTITY_RESOLUTION_v2 (AIR-v2)
 *
 * Extends AID-v1 — NOT a second Identity Engine.
 * Product North Star (Master §0 / Owner FINAL_FULL_IK_AUTONOMY):
 *   Owner is UI/manual correction only — NOT normal runtime stop.
 *
 * Runtime:
 *   unresolved → next autonomous strategy → bounded research/validation
 *   → AID re-eval → persist if PASS → else queue / DATA_GAP
 *
 * ZERO invent · ZERO companyPrice→OUR RATE · ZERO Owner runtime dependency.
 */

import {
  AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED,
  AUTONOMOUS_IDENTITY_DECISION_KIND,
  AUTONOMOUS_IDENTITY_DECISION_VERSION,
  evaluateAutonomousIdentityDecision,
  type AutonomousIdentityDecisionResult,
} from "@/lib/work-catalog/autonomous-identity-decision-contract";
import {
  validateCompoundIdentityCandidate,
  type ValidateCompoundIdentityInput,
  type ValidateCompoundIdentityResult,
} from "@/lib/work-catalog/compound-identity-candidate-validation";
import type { BuildCompoundIdentityCandidateResult } from "@/lib/work-catalog/compound-identity-candidate-engine";

export const AUTONOMOUS_IDENTITY_RESOLUTION_VERSION = "AIR-v2" as const;

/** Bounded autonomy — no infinite retry. */
export const AIR_V2_BOUNDS = Object.freeze({
  MAX_RESEARCH_ROUNDS: 2,
  MAX_VALIDATION_ROUNDS: 2,
  MAX_PROVIDER_ATTEMPTS: 3,
  MAX_CANDIDATES: 8,
});

export type AutonomousResolutionStrategy =
  | "REUSE_TRUSTED"
  | "KNOWLEDGE_LOOKUP"
  | "CATALOG_LOOKUP"
  | "KNR_RELATION"
  | "IDENTITY_BRIDGE"
  | "RESEARCH_ROUND_1"
  | "RESEARCH_ROUND_2"
  | "CROSS_SOURCE_VALIDATION"
  | "HISTORICAL_VALIDATED_REUSE"
  | "PARENT_LEAF_RELATION"
  | "TECHNOLOGY_COMPAT"
  | "UNIT_COMPAT"
  | "CLASSIFICATION_COMPAT"
  | "CANDIDATE_RANKING"
  | "BEST_SUPPORTED_RESOLUTION"
  | "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";

/** Runtime next-legal codes — never OWNER_* as normal path. */
export const AIR_RUNTIME = Object.freeze({
  CONTINUE_TRUSTED: "CONTINUE_P5_LABOR_P6_MATERIAL · AUT_R1_ELIGIBILITY_CHECK",
  CONTINUE_PARTIAL: "CONTINUE_PARTIAL_AUTONOMOUS · AUTONOMOUS_RESOLUTION_QUEUE",
  RESOLUTION_CONTINUE: "AUTONOMOUS_RESOLUTION_CONTINUE",
  UNKNOWN_DISCOVERY: "AUTONOMOUS_UNKNOWN_DISCOVERY_LOOP",
  RESEARCH: "AUTONOMOUS_RESEARCH_EVIDENCE_LOOP",
  EXHAUSTED: "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP",
  QUEUE: "AUTONOMOUS_RESOLUTION_QUEUE",
});

export type AutonomousResolutionQueueItem = {
  itemId: string;
  workId: string;
  lineIds: string[];
  currentNode: string;
  reason: string;
  attempts: number;
  researchRounds: number;
  validationRounds: number;
  evidenceState: string;
  candidates: string[];
  confidence: string | null;
  nextStrategy: AutonomousResolutionStrategy;
  exhausted: boolean;
  ownerRuntimeDependency: false;
  productionMutation: false;
};

export type AutonomousIdentityResolutionV2Result = {
  version: typeof AUTONOMOUS_IDENTITY_RESOLUTION_VERSION;
  aid: AutonomousIdentityDecisionResult;
  civ: ValidateCompoundIdentityResult;
  resolved: boolean;
  trusted: boolean;
  nextStrategy: AutonomousResolutionStrategy | null;
  nextLegalTransaction: string;
  queueItem: AutonomousResolutionQueueItem | null;
  ownerRuntimeDependency: false;
  productionMutation: false;
  attempts: number;
  researchRounds: number;
};

const STRATEGY_ORDER: AutonomousResolutionStrategy[] = [
  "REUSE_TRUSTED",
  "CATALOG_LOOKUP",
  "KNR_RELATION",
  "IDENTITY_BRIDGE",
  "KNOWLEDGE_LOOKUP",
  "RESEARCH_ROUND_1",
  "CROSS_SOURCE_VALIDATION",
  "PARENT_LEAF_RELATION",
  "UNIT_COMPAT",
  "CLASSIFICATION_COMPAT",
  "TECHNOLOGY_COMPAT",
  "HISTORICAL_VALIDATED_REUSE",
  "CANDIDATE_RANKING",
  "RESEARCH_ROUND_2",
  "BEST_SUPPORTED_RESOLUTION",
  "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP",
];

/**
 * Map AID/CIV outcome → next autonomous strategy (never Owner runtime).
 */
export function mapToNextAutonomousStrategy(input: {
  aid: AutonomousIdentityDecisionResult;
  civ: ValidateCompoundIdentityResult;
  attempts: number;
  researchRounds: number;
}): AutonomousResolutionStrategy {
  const { aid, civ, attempts, researchRounds } = input;

  if (aid.mayPersistTrustedIdentity && civ.trusted) {
    return "REUSE_TRUSTED";
  }

  if (attempts >= AIR_V2_BOUNDS.MAX_PROVIDER_ATTEMPTS) {
    return "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
  }
  if (researchRounds >= AIR_V2_BOUNDS.MAX_RESEARCH_ROUNDS) {
    return "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
  }

  switch (aid.action) {
    case "AUTONOMOUS_DECIDE":
      return "REUSE_TRUSTED";
    case "OWNER_EXCEPTION_AMBIGUITY":
    case "OWNER_EXCEPTION_CONFLICT":
      // Conflict/near-tie → research + cross-check, not Owner stop
      if (researchRounds < 1) return "RESEARCH_ROUND_1";
      if (researchRounds < 2) return "CROSS_SOURCE_VALIDATION";
      return "CANDIDATE_RANKING";
    case "NEED_RESEARCH":
      return researchRounds < 1 ? "RESEARCH_ROUND_1" : "RESEARCH_ROUND_2";
    case "OWNER_EXCEPTION_NO_CANDIDATE":
      if (researchRounds < 1) return "KNR_RELATION";
      if (researchRounds < 2) return "RESEARCH_ROUND_1";
      return "IDENTITY_BRIDGE";
    case "POLICY_BLOCKED_WOULD_AUTONOMOUS":
      // Should not happen after GO36-P12 amend; treat as continue
      return "BEST_SUPPORTED_RESOLUTION";
    default:
      return STRATEGY_ORDER[Math.min(attempts, STRATEGY_ORDER.length - 1)]!;
  }
}

/**
 * Remap legacy Owner next-legal strings → autonomous runtime codes.
 */
export function remapOwnerRuntimeToAutonomous(nextLegal: string): string {
  const s = String(nextLegal || "");
  if (!s) return AIR_RUNTIME.RESOLUTION_CONTINUE;
  if (/OWNER_CLASSIFICATION/i.test(s)) return AIR_RUNTIME.UNKNOWN_DISCOVERY;
  if (/OWNER_LEAF|DISAMBIGUATION|AMBIGU/i.test(s)) return AIR_RUNTIME.RESEARCH;
  if (/OWNER_IDENTITY|OWNER_KNR|OWNER_RESEARCH|OWNER_COMPOUND|GO40 OWNER_REVIEW/i.test(s)) {
    return AIR_RUNTIME.RESOLUTION_CONTINUE;
  }
  if (/DURABLE_IDENTITY.*OWNER/i.test(s)) return AIR_RUNTIME.RESOLUTION_CONTINUE;
  return s;
}

export function buildQueueItem(input: {
  workId: string;
  lineIds?: string[];
  aid: AutonomousIdentityDecisionResult;
  civ: ValidateCompoundIdentityResult;
  attempts: number;
  researchRounds: number;
  nextStrategy: AutonomousResolutionStrategy;
}): AutonomousResolutionQueueItem {
  const exhausted = nextStrategyIsExhausted(input.nextStrategy);
  return {
    itemId: `air:${input.workId}`,
    workId: input.workId,
    lineIds: input.lineIds || [],
    currentNode: input.civ.validationResult,
    reason: input.aid.action,
    attempts: input.attempts,
    researchRounds: input.researchRounds,
    validationRounds: input.attempts,
    evidenceState: input.civ.evidenceStrength,
    candidates: (input.aid.ranked || [])
      .map((r) => r.leafWorkId)
      .filter((x): x is string => !!x)
      .slice(0, AIR_V2_BOUNDS.MAX_CANDIDATES),
    confidence: input.aid.confidenceTier,
    nextStrategy: input.nextStrategy,
    exhausted,
    ownerRuntimeDependency: false,
    productionMutation: false,
  };
}

function nextStrategyIsExhausted(s: AutonomousResolutionStrategy): boolean {
  return s === "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
}

/**
 * Bounded autonomous resolution loop around existing CIE/CIV/AID.
 * Does not invent leaf/KNR/BOM. productionMutation always false.
 */
export function runBoundedAutonomousIdentityResolution(
  input: ValidateCompoundIdentityInput & {
    lineIds?: string[];
    cie?: BuildCompoundIdentityCandidateResult | null;
    priorAttempts?: number;
    priorResearchRounds?: number;
  },
): AutonomousIdentityResolutionV2Result {
  let attempts = input.priorAttempts ?? 0;
  let researchRounds = input.priorResearchRounds ?? 0;
  let deepen = input.deepenEvidence !== false;

  // Round 0 — current CIV/AID
  let civ = validateCompoundIdentityCandidate({
    ...input,
    deepenEvidence: deepen,
  });
  let aid = civ.autonomousIdentityDecision!;
  if (!aid) {
    aid = evaluateAutonomousIdentityDecision({ civ, cie: input.cie ?? civ.cieBaseline });
  }
  attempts += 1;

  // If already trusted via AID PASS — done
  if (civ.trusted && aid.mayPersistTrustedIdentity) {
    return {
      version: AUTONOMOUS_IDENTITY_RESOLUTION_VERSION,
      aid,
      civ,
      resolved: true,
      trusted: true,
      nextStrategy: null,
      nextLegalTransaction: AIR_RUNTIME.CONTINUE_TRUSTED,
      queueItem: null,
      ownerRuntimeDependency: false,
      productionMutation: false,
      attempts,
      researchRounds,
    };
  }

  let strategy = mapToNextAutonomousStrategy({ aid, civ, attempts, researchRounds });

  // Bounded research/validation rounds using existing deepen path only
  while (
    !civ.trusted &&
    !nextStrategyIsExhausted(strategy) &&
    attempts < AIR_V2_BOUNDS.MAX_PROVIDER_ATTEMPTS &&
    researchRounds < AIR_V2_BOUNDS.MAX_RESEARCH_ROUNDS
  ) {
    if (
      strategy === "RESEARCH_ROUND_1" ||
      strategy === "RESEARCH_ROUND_2" ||
      strategy === "KNR_RELATION" ||
      strategy === "IDENTITY_BRIDGE" ||
      strategy === "CROSS_SOURCE_VALIDATION" ||
      strategy === "KNOWLEDGE_LOOKUP"
    ) {
      researchRounds += 1;
      deepen = true;
      civ = validateCompoundIdentityCandidate({
        ...input,
        deepenEvidence: true,
      });
      aid =
        civ.autonomousIdentityDecision ||
        evaluateAutonomousIdentityDecision({ civ, cie: input.cie ?? civ.cieBaseline });
      attempts += 1;
      if (civ.trusted && aid.mayPersistTrustedIdentity) {
        return {
          version: AUTONOMOUS_IDENTITY_RESOLUTION_VERSION,
          aid,
          civ,
          resolved: true,
          trusted: true,
          nextStrategy: null,
          nextLegalTransaction: AIR_RUNTIME.CONTINUE_TRUSTED,
          queueItem: null,
          ownerRuntimeDependency: false,
          productionMutation: false,
          attempts,
          researchRounds,
        };
      }
      strategy = mapToNextAutonomousStrategy({ aid, civ, attempts, researchRounds });
      continue;
    }

    // Non-research strategies: advance attempt counter without invent
    attempts += 1;
    strategy = mapToNextAutonomousStrategy({ aid, civ, attempts, researchRounds });
    if (
      strategy !== "RESEARCH_ROUND_1" &&
      strategy !== "RESEARCH_ROUND_2" &&
      strategy !== "KNR_RELATION" &&
      strategy !== "IDENTITY_BRIDGE" &&
      strategy !== "CROSS_SOURCE_VALIDATION" &&
      strategy !== "KNOWLEDGE_LOOKUP"
    ) {
      // No additional legal evidence seam without invent → exhaust
      strategy = "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
      break;
    }
  }

  if (!nextStrategyIsExhausted(strategy) && attempts >= AIR_V2_BOUNDS.MAX_PROVIDER_ATTEMPTS) {
    strategy = "AUTONOMOUS_RESOLUTION_EXHAUSTED_DATA_GAP";
  }

  const queueItem = buildQueueItem({
    workId: String(input.workId),
    lineIds: input.lineIds,
    aid,
    civ,
    attempts,
    researchRounds,
    nextStrategy: strategy,
  });

  const nextLegal = nextStrategyIsExhausted(strategy)
    ? AIR_RUNTIME.EXHAUSTED
    : AIR_RUNTIME.RESOLUTION_CONTINUE;

  return {
    version: AUTONOMOUS_IDENTITY_RESOLUTION_VERSION,
    aid,
    civ,
    resolved: false,
    trusted: false,
    nextStrategy: strategy,
    nextLegalTransaction: nextLegal,
    queueItem,
    ownerRuntimeDependency: false,
    productionMutation: false,
    attempts,
    researchRounds,
  };
}

export function isOwnerRuntimeDependencyCode(code: string): boolean {
  return /^OWNER_/i.test(String(code || "").trim()) || /OWNER_IDENTITY|OWNER_LEAF|OWNER_KNR|OWNER_RESEARCH|OWNER_COMPOUND|OWNER_CLASSIFICATION/i.test(code);
}

export {
  AUTONOMOUS_IDENTITY_DECISION_VERSION,
  AUTONOMOUS_IDENTITY_DECISION_KIND,
  AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED,
};
