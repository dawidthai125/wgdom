/**
 * Autonomous Identity Decision Contract — thin CIE/CIV post-validation layer.
 *
 * PRODUCT TARGET (Master SSOT §0 / §0.2): routine identity when evidence contract PASS.
 * POLICY (GO36 P12 amended by OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1):
 *   AID AUTONOMOUS_DECIDE → mayPersistTrustedIdentity → CIV TRUSTED (ephemeral trust elevation).
 * CatalogWork mint (GO39/41) remains Owner-only. Invent OUR RATE/BOM still forbidden.
 *
 * This module:
 *  - scores candidates from existing CIV/CIE evidence (no invent),
 *  - classifies HIGH/MEDIUM/LOW/CONFLICT/AMBIGUITY,
 *  - multi-candidate ranking + relative margin (ordinal, not invented float thresholds),
 *  - returns AUTONOMOUS_DECIDE vs RESEARCH vs OWNER_EXCEPTION,
 *  - mayPersistTrustedIdentity=true only when AID PASS under amended P12.
 *
 * ZERO: name-alone / costSplit-alone / price-alone / Pack-alone → decide.
 * ZERO: second Identity Engine / second Orchestra.
 */

import {
  GO36_POLICY_VERSION,
  GO36_P12_AMENDMENT_ID,
} from "@/lib/work-catalog/identity-candidate-policy";
import type {
  BuildCompoundIdentityCandidateResult,
} from "@/lib/work-catalog/compound-identity-candidate-engine";
import type {
  ValidateCompoundIdentityResult,
  ValidatedEvidenceRecord,
  CompoundIdentityValidationStatus,
} from "@/lib/work-catalog/compound-identity-candidate-validation";

export const AUTONOMOUS_IDENTITY_DECISION_VERSION = "AID-v1" as const;
export const AUTONOMOUS_IDENTITY_DECISION_KIND = "AUTONOMOUS_IDENTITY" as const;

/**
 * GO36 P12 amendment OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1 —
 * AID PASS may elevate CIV TRUSTED. Flip only via Owner policy GO (this one).
 */
export const AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED = true as const;

export type AutonomousIdentityConfidenceTier =
  | "HIGH_CONFIDENCE"
  | "MEDIUM_CONFIDENCE"
  | "LOW_CONFIDENCE"
  | "CONFLICT"
  | "AMBIGUITY"
  | "NO_VALID_CANDIDATE";

export type AutonomousIdentityAction =
  | "AUTONOMOUS_DECIDE"
  | "NEED_RESEARCH"
  | "OWNER_EXCEPTION_AMBIGUITY"
  | "OWNER_EXCEPTION_CONFLICT"
  | "OWNER_EXCEPTION_NO_CANDIDATE"
  | "POLICY_BLOCKED_WOULD_AUTONOMOUS";

export type EvidenceFamily =
  | "GO40_GK_RESOLVED"
  | "EXACT_LABOR_ALIAS"
  | "OWNER_KNR_MAPPING"
  | "KNR_CATALOG_HIT"
  | "KNR_WC_BRIDGE"
  | "SINGLE_LEAF_VALIDATED"
  | "ACLC_CANONICAL_LEAF"
  | "DESCRIPTION_TOKEN"
  | "COST_SPLIT"
  | "NAME_SIMILARITY"
  | "TECHNOLOGY_PACK"
  | "WORK_CATALOG_WEAK"
  | "OTHER";

const WEAK_ALONE: ReadonlySet<EvidenceFamily> = new Set([
  "DESCRIPTION_TOKEN",
  "COST_SPLIT",
  "NAME_SIMILARITY",
  "TECHNOLOGY_PACK",
  "WORK_CATALOG_WEAK",
]);

export type RankedIdentityCandidate = {
  leafWorkId: string | null;
  families: EvidenceFamily[];
  independentStrongCount: number;
  ordinalScore: number;
  evidenceStrengthMax: string;
  notes: string[];
};

export type AutonomousIdentityDecisionResult = {
  version: typeof AUTONOMOUS_IDENTITY_DECISION_VERSION;
  decisionKind: typeof AUTONOMOUS_IDENTITY_DECISION_KIND;
  workId: string;
  civStatus: CompoundIdentityValidationStatus | string;
  cieStatus: string | null;
  confidenceTier: AutonomousIdentityConfidenceTier;
  action: AutonomousIdentityAction;
  /** Would decide autonomously under Master §0.2 + AID PASS. */
  wouldAutonomousDecide: boolean;
  /** May elevate CIV TRUSTED when AID AUTONOMOUS_DECIDE under amended P12. */
  mayPersistTrustedIdentity: boolean;
  policyPersistAuthorized: typeof AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED;
  policyChangeRequired: boolean;
  ranked: RankedIdentityCandidate[];
  winner: RankedIdentityCandidate | null;
  rejectedCandidates: RankedIdentityCandidate[];
  relativeMargin: "CLEAR_WINNER" | "NEAR_TIE" | "SINGLE" | "NONE";
  reasons: string[];
  provenance: {
    policyVersion: string;
    go36PolicyVersion: typeof GO36_POLICY_VERSION;
    amendmentId: typeof GO36_P12_AMENDMENT_ID;
    aidVersion: typeof AUTONOMOUS_IDENTITY_DECISION_VERSION;
    evaluatedAtIso: string;
    evidenceSourceTypes: string[];
  };
  nextLegalIfAutonomous: string | null;
  nextLegalIfOwner: string;
  productionMutation: false;
};

function strengthRank(s: string | null | undefined): number {
  switch (String(s || "").toUpperCase()) {
    case "HIGH":
    case "STRONG":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

function familyFromEvidence(e: ValidatedEvidenceRecord): EvidenceFamily {
  const method = String(e.identityMethod || "");
  const src = String(e.sourceType || "");
  if (method === "EXACT_LABOR_IDENTITY_ALIAS") return "EXACT_LABOR_ALIAS";
  if (method === "ACLC_CANONICAL_LEAF_BIND") return "ACLC_CANONICAL_LEAF";
  if (src === "OWNER_KNR_MAPPING") return "OWNER_KNR_MAPPING";
  if (src === "KNR_CATALOG" && method !== "KNR_CATALOG_MISS") return "KNR_CATALOG_HIT";
  if (src === "KNR_WC_BRIDGE" && e.workId && e.evidenceStrength !== "NONE") {
    return "KNR_WC_BRIDGE";
  }
  if (src === "DESCRIPTION_TOKEN") return "DESCRIPTION_TOKEN";
  if (src === "COST_SPLIT" || method.includes("COST_SPLIT")) return "COST_SPLIT";
  if (src === "NAME_SIMILARITY" || method.includes("NAME")) return "NAME_SIMILARITY";
  if (src === "TECHNOLOGY_PACK") return "TECHNOLOGY_PACK";
  if (src === "WORK_CATALOG") return "WORK_CATALOG_WEAK";
  return "OTHER";
}

function isStrongFamily(f: EvidenceFamily): boolean {
  return (
    f === "GO40_GK_RESOLVED" ||
    f === "EXACT_LABOR_ALIAS" ||
    f === "OWNER_KNR_MAPPING" ||
    f === "SINGLE_LEAF_VALIDATED" ||
    f === "ACLC_CANONICAL_LEAF" ||
    f === "KNR_CATALOG_HIT" ||
    f === "KNR_WC_BRIDGE"
  );
}

function isPlausibleLeafId(id: string | null | undefined): boolean {
  const s = String(id || "").trim();
  if (!s) return false;
  if (s === "0" || s === "null" || s === "undefined") return false;
  if (/^\d+$/.test(s) && s.length < 3) return false;
  return true;
}

function collectByLeaf(
  civ: ValidateCompoundIdentityResult,
  cie: BuildCompoundIdentityCandidateResult | null,
): Map<string, RankedIdentityCandidate> {
  const map = new Map<string, RankedIdentityCandidate>();

  const bump = (
    leaf: string | null,
    family: EvidenceFamily,
    strength: string,
    note: string,
  ) => {
    const key = leaf && isPlausibleLeafId(leaf) ? leaf : `__none__:${family}`;
    const cur = map.get(key) || {
      leafWorkId: leaf && isPlausibleLeafId(leaf) ? leaf : null,
      families: [],
      independentStrongCount: 0,
      ordinalScore: 0,
      evidenceStrengthMax: "NONE",
      notes: [],
    };
    if (!cur.families.includes(family)) cur.families.push(family);
    if (isStrongFamily(family) && !WEAK_ALONE.has(family)) {
      // recount strong unique families
      cur.independentStrongCount = cur.families.filter(isStrongFamily).length;
    }
    const sr = strengthRank(strength);
    if (sr > strengthRank(cur.evidenceStrengthMax)) cur.evidenceStrengthMax = strength;
    cur.ordinalScore =
      cur.independentStrongCount * 10 + strengthRank(cur.evidenceStrengthMax);
    cur.notes.push(note);
    map.set(key, cur);
  };

  if (cie?.identityStatus === "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED" && cie.go33Applicable) {
    bump(
      cie.proposedLeafWorkId ?? cie.proposedWorkId ?? null,
      "GO40_GK_RESOLVED",
      "HIGH",
      "CIE GO40 GK adapter RESOLVED (ephemeral candidate)",
    );
  }

  if (
    civ.validationResult === "IDENTITY_CANDIDATE_VALIDATED" &&
    isPlausibleLeafId(civ.proposedLeafWorkId)
  ) {
    bump(
      civ.proposedLeafWorkId,
      "SINGLE_LEAF_VALIDATED",
      civ.evidenceStrength || "MEDIUM",
      "CIV single-leaf VALIDATED (still not TRUSTED without policy/Accept)",
    );
  }

  for (const e of civ.evidenceAfter || []) {
    const fam = familyFromEvidence(e);
    if (fam === "DESCRIPTION_TOKEN" || fam === "COST_SPLIT" || fam === "NAME_SIMILARITY") {
      // track weak signals under none-leaf bucket only
      bump(null, fam, e.evidenceStrength || "LOW", e.rationale || fam);
      continue;
    }
    if (fam === "KNR_CATALOG_HIT" || fam === "KNR_WC_BRIDGE" || fam === "EXACT_LABOR_ALIAS" || fam === "OWNER_KNR_MAPPING" || fam === "ACLC_CANONICAL_LEAF") {
      bump(e.workId ?? null, fam, e.evidenceStrength || "LOW", e.rationale || fam);
    } else {
      bump(e.workId ?? null, fam, e.evidenceStrength || "LOW", e.rationale || fam);
    }
  }

  return map;
}

function relativeMargin(
  ranked: RankedIdentityCandidate[],
): AutonomousIdentityDecisionResult["relativeMargin"] {
  const real = ranked.filter((r) => r.leafWorkId);
  if (real.length === 0) return "NONE";
  if (real.length === 1) return "SINGLE";
  const a = real[0]!;
  const b = real[1]!;
  if (a.ordinalScore > b.ordinalScore && a.independentStrongCount > b.independentStrongCount) {
    return "CLEAR_WINNER";
  }
  if (a.ordinalScore === b.ordinalScore || Math.abs(a.ordinalScore - b.ordinalScore) <= 2) {
    return "NEAR_TIE";
  }
  if (a.independentStrongCount >= b.independentStrongCount + 1 && a.ordinalScore > b.ordinalScore) {
    return "CLEAR_WINNER";
  }
  return "NEAR_TIE";
}

export type EvaluateAutonomousIdentityDecisionInput = {
  civ: ValidateCompoundIdentityResult;
  cie?: BuildCompoundIdentityCandidateResult | null;
  nowIso?: string;
};

/**
 * Pure evaluation. Does not persist. Does not elevate CIV.trusted.
 */
export function evaluateAutonomousIdentityDecision(
  input: EvaluateAutonomousIdentityDecisionInput,
): AutonomousIdentityDecisionResult {
  const civ = input.civ;
  const cie = input.cie ?? civ.cieBaseline ?? null;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const workId = String(civ.workId || cie?.workId || "").trim();

  const byLeaf = collectByLeaf(civ, cie);
  const ranked = [...byLeaf.values()].sort((a, b) => b.ordinalScore - a.ordinalScore);
  const margin = relativeMargin(ranked);
  const realLeaves = ranked.filter((r) => r.leafWorkId);
  const winner = realLeaves[0] || ranked[0] || null;
  const rejected = ranked.filter((r) => r !== winner);

  const reasons: string[] = [];
  const conflicts = [...(civ.conflicts || [])];
  const hasConflict =
    civ.validationResult === "IDENTITY_CANDIDATE_AMBIGUOUS" ||
    conflicts.length > 0 ||
    (realLeaves.length > 1 && margin === "NEAR_TIE");

  let confidenceTier: AutonomousIdentityConfidenceTier = "NO_VALID_CANDIDATE";
  let action: AutonomousIdentityAction = "NEED_RESEARCH";
  let wouldAutonomousDecide = false;

  // CONFLICT / AMBIGUITY first — genuine Owner
  if (civ.validationResult === "IDENTITY_CANDIDATE_AMBIGUOUS" || conflicts.length > 0) {
    confidenceTier = "CONFLICT";
    action = "OWNER_EXCEPTION_CONFLICT";
    reasons.push("Explicit conflict/ambiguity in CIV — Owner Exception");
  } else if (realLeaves.length > 1 && margin === "NEAR_TIE") {
    confidenceTier = "AMBIGUITY";
    action = "OWNER_EXCEPTION_AMBIGUITY";
    reasons.push("Multi-candidate near-tie — no autonomous pick");
  } else if (
    cie?.identityStatus === "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED" &&
    cie.go33Applicable
  ) {
    confidenceTier = "HIGH_CONFIDENCE";
    wouldAutonomousDecide = true;
    action = AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED
      ? "AUTONOMOUS_DECIDE"
      : "POLICY_BLOCKED_WOULD_AUTONOMOUS";
    reasons.push(
      "GO40/GO33 RESOLVED path — HIGH under Master §0.2 + GO36-P12 AID amendment",
    );
  } else if (
    civ.validationResult === "IDENTITY_CANDIDATE_VALIDATED" &&
    isPlausibleLeafId(civ.proposedLeafWorkId) &&
    (winner?.independentStrongCount ?? 0) >= 1
  ) {
    confidenceTier = "HIGH_CONFIDENCE";
    wouldAutonomousDecide = true;
    action = AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED
      ? "AUTONOMOUS_DECIDE"
      : "POLICY_BLOCKED_WOULD_AUTONOMOUS";
    reasons.push("Single validated plausible leaf with strong family evidence");
  } else if (
    (winner?.independentStrongCount ?? 0) >= 2 &&
    margin === "CLEAR_WINNER" &&
    isPlausibleLeafId(winner?.leafWorkId)
  ) {
    confidenceTier = "MEDIUM_CONFIDENCE";
    wouldAutonomousDecide = true;
    action = AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED
      ? "AUTONOMOUS_DECIDE"
      : "POLICY_BLOCKED_WOULD_AUTONOMOUS";
    reasons.push(
      "MEDIUM: ≥2 independent strong families + clear relative margin — multi-evidence contract",
    );
  } else if (
    (winner?.independentStrongCount ?? 0) >= 2 &&
    margin === "SINGLE" &&
    isPlausibleLeafId(winner?.leafWorkId)
  ) {
    confidenceTier = "MEDIUM_CONFIDENCE";
    wouldAutonomousDecide = true;
    action = AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED
      ? "AUTONOMOUS_DECIDE"
      : "POLICY_BLOCKED_WOULD_AUTONOMOUS";
    reasons.push("MEDIUM: multi-strong on single leaf");
  } else if (
    civ.validationResult === "RESEARCH_EVIDENCE_INSUFFICIENT" ||
    civ.validationResult === "CANDIDATE_FOUND_NOT_TRUSTED" ||
    civ.validationResult === "IDENTITY_CANDIDATE_INSUFFICIENT"
  ) {
    // LOW — Research/Evidence, NOT automatic Owner
    const onlyWeak =
      ranked.every((r) => r.families.every((f) => WEAK_ALONE.has(f) || f === "OTHER")) ||
      (winner?.independentStrongCount ?? 0) === 0;
    if (onlyWeak || !isPlausibleLeafId(winner?.leafWorkId)) {
      confidenceTier = "LOW_CONFIDENCE";
      action = "NEED_RESEARCH";
      reasons.push(
        "LOW_CONFIDENCE — insufficient canonical leaf evidence; Research/Evidence next (not Owner by default)",
      );
      // After exhaust research still insufficient → Owner (caller/Orchestra ranks)
      if (civ.validationResult === "RESEARCH_EVIDENCE_INSUFFICIENT") {
        reasons.push(
          "CIV already deepened — if research exhausted, escalate OWNER_EXCEPTION_NO_CANDIDATE",
        );
        // For TPI post-deepen: treat as owner after exhaust
        action = "OWNER_EXCEPTION_NO_CANDIDATE";
        confidenceTier = "NO_VALID_CANDIDATE";
        reasons.push("Post-deepen INSUFFICIENT with no plausible leaf → genuine Owner Exception");
      }
    } else {
      confidenceTier = "LOW_CONFIDENCE";
      action = "NEED_RESEARCH";
      reasons.push("Partial signals — NEED_RESEARCH before Owner");
    }
  } else if (!winner || !isPlausibleLeafId(winner.leafWorkId)) {
    confidenceTier = "NO_VALID_CANDIDATE";
    action = "OWNER_EXCEPTION_NO_CANDIDATE";
    reasons.push("No valid leaf candidate");
  } else {
    confidenceTier = "LOW_CONFIDENCE";
    action = "NEED_RESEARCH";
    reasons.push("Default fail-closed → Research");
  }

  const policyChangeRequired = false;
  const mayPersistTrustedIdentity =
    AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED &&
    wouldAutonomousDecide &&
    action === "AUTONOMOUS_DECIDE";

  return {
    version: AUTONOMOUS_IDENTITY_DECISION_VERSION,
    decisionKind: AUTONOMOUS_IDENTITY_DECISION_KIND,
    workId,
    civStatus: civ.validationResult,
    cieStatus: cie?.identityStatus ?? null,
    confidenceTier,
    action,
    wouldAutonomousDecide,
    mayPersistTrustedIdentity,
    policyPersistAuthorized: AUTONOMOUS_IDENTITY_CANONICAL_PERSIST_AUTHORIZED,
    policyChangeRequired,
    ranked,
    winner: winner?.leafWorkId ? winner : null,
    rejectedCandidates: rejected,
    relativeMargin: margin,
    reasons,
    provenance: {
      policyVersion: GO36_POLICY_VERSION,
      go36PolicyVersion: GO36_POLICY_VERSION,
      amendmentId: GO36_P12_AMENDMENT_ID,
      aidVersion: AUTONOMOUS_IDENTITY_DECISION_VERSION,
      evaluatedAtIso: nowIso,
      evidenceSourceTypes: civ.sourceList || [],
    },
    nextLegalIfAutonomous: wouldAutonomousDecide
      ? "CONTINUE_P5_LABOR_P6_MATERIAL · AUT_R1_ELIGIBILITY_CHECK"
      : null,
    /** @deprecated Owner is not runtime stop — use AIR-v2 AUTONOMOUS_RESOLUTION_CONTINUE */
    nextLegalIfOwner: "AUTONOMOUS_RESOLUTION_CONTINUE",
    productionMutation: false,
  };
}

/** Applied Owner policy amendment summary (docs / audit). */
export function proposeMinimumAutonomousIdentityPolicyChange(): {
  id: typeof GO36_P12_AMENDMENT_ID;
  status: "APPLIED";
  amends: string[];
  scope: string;
  requirements: string[];
  stillForbidden: string[];
  ownerExceptionRemains: string[];
} {
  return {
    id: GO36_P12_AMENDMENT_ID,
    status: "APPLIED",
    amends: [
      "GO36 P12 futureAutonomy.autonomousCanonicalCreateNow (AID PASS)",
      "identity-candidate-policy sufficientToAcceptCanonical (+ AID-v1 path)",
      "CIV TRUSTED elevation when AID AUTONOMOUS_DECIDE",
    ],
    scope:
      "Authorize AUTONOMOUS_IDENTITY CIV TRUSTED elevation ONLY when evaluateAutonomousIdentityDecision.action is AUTONOMOUS_DECIDE. Does NOT authorize invent BOM/rate/price or GO39 CatalogWork mint.",
    requirements: [
      "AID-v1 PASS (HIGH or MEDIUM+clear margin)",
      "plausible leaf workId when leaf-bound",
      "provenance decisionKind=AUTONOMOUS_IDENTITY + evidence + rejected candidates",
      "no CONFLICT/AMBIGUITY",
      "fail-closed on weak-alone signals",
      "audit trail + policy version stamp",
    ],
    stillForbidden: [
      "name-alone / costSplit-alone / price-alone / Pack-alone",
      "near-tie multi-candidate",
      "KNR token miss without leaf bind",
      "AUT-R1/BOM invent as side effect of identity",
      "silent CatalogWork mint bypassing GO39/41 Owner Accept",
    ],
    ownerExceptionRemains: [
      "CONFLICT",
      "AMBIGUITY / near-tie",
      "NO_VALID_CANDIDATE after research exhaust",
      "explicit business override",
      "architecture/SSOT",
    ],
  };
}
