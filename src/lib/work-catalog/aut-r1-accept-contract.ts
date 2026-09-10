/**
 * AUT-R1 — Autonomous Labor OUR RATE Decision Contract (pure · fail-closed).
 *
 * Named safe class superseding historical R1=NO *only* when ALL gates PASS.
 * Does NOT invent rates · does NOT write Catalog · does NOT use companyPrice.
 *
 * Evidence → Candidate → validation → AUT-R1 PASS → caller may invoke
 * existing acceptWorkRateResearchCandidate (decisionKind=AUT_R1).
 */

import type { OfferBoqMatchMethod } from "@/lib/tender-offer-boq";
import type { LaborSourceEvidenceObservation } from "@/lib/labor-source-evidence";
import {
  evaluateLaborEvidenceReuseSufficiency,
  type EvaluateLaborEvidenceReuseSufficiencyResult,
} from "@/lib/work-catalog/labor-evidence-reuse-sufficiency";
import { buildEvidenceFromQualifiedObservation } from "@/lib/work-catalog/work-rate-research-evidence-persist";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { isCompanyPriceForbiddenAsWorkRateBase } from "@/lib/work-catalog/work-rate-market-base";

export const AUT_R1_DECISION_ID = "AUT_R1_LABOR_OUR_RATE_ACCEPT" as const;
export const AUT_R1_RULE_ID = "aut_r1.labor_evidence_candidate_v1" as const;

export type AutR1Decision = "AUT_R1_ACCEPT" | "AUT_R1_EXCEPTION";

export type AutR1ExceptionReason =
  | "NOT_TRUSTED_IDENTITY"
  | "NO_WORK_ID"
  | "NO_UNIT"
  | "UNIT_MISMATCH"
  | "NO_CANDIDATE"
  | "INVALID_CANDIDATE_RATE"
  | "MISSING_CANDIDATE_OBSERVATIONS"
  | "MISSING_PROVENANCE"
  | "NO_EVIDENCE"
  | "INSUFFICIENT_EVIDENCE"
  | "EVIDENCE_CONFLICT"
  | "EVIDENCE_STALE"
  | "EVIDENCE_INVALID"
  | "EVIDENCE_INCOMPATIBLE"
  | "LOOKUP_STALE_BLOCKED"
  | "OVERWRITE_BLOCKED_OWNER"
  | "OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"
  | "COMPANY_PRICE_FORBIDDEN"
  | "IDEMPOTENT_NOOP";

export type AutR1ContractResult = {
  decisionId: typeof AUT_R1_DECISION_ID;
  ruleId: typeof AUT_R1_RULE_ID;
  decision: AutR1Decision;
  reasons: AutR1ExceptionReason[];
  evaluatedAtIso: string;
  mayPersistOurRate: boolean;
  idempotentNoop: boolean;
  overwriteBlocked: boolean;
  evidenceSufficiency: EvaluateLaborEvidenceReuseSufficiencyResult | null;
  workId: string | null;
  unit: string | null;
  marketBaseRatePln: number | null;
};

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function roundRate(n: number): number {
  return Math.round(n * 100) / 100;
}

function exception(
  reasons: AutR1ExceptionReason[],
  nowMs: number,
  extra?: Partial<AutR1ContractResult>,
): AutR1ContractResult {
  return {
    decisionId: AUT_R1_DECISION_ID,
    ruleId: AUT_R1_RULE_ID,
    decision: "AUT_R1_EXCEPTION",
    reasons,
    evaluatedAtIso: isoNow(nowMs),
    mayPersistOurRate: false,
    idempotentNoop: false,
    overwriteBlocked: false,
    evidenceSufficiency: null,
    workId: null,
    unit: null,
    marketBaseRatePln: null,
    ...extra,
  };
}

export type EvaluateAutR1Input = {
  store: WorkCatalogStore;
  candidate: WorkRateResearchCandidate | null | undefined;
  /** G1 / trusted identity required. */
  identityTrusted: boolean;
  matchMethod?: OfferBoqMatchMethod | string | null;
  /**
   * Durable Evidence observations (preferred). When omitted, mapped from
   * candidate.observations via existing buildEvidenceFromQualifiedObservation.
   */
  evidenceObservations?: readonly LaborSourceEvidenceObservation[] | null;
  nowMs?: number;
  /**
   * Tests may force companyPrice probe — production callers omit.
   * When true → always EXCEPTION (never seed OUR RATE).
   */
  companyPriceOnly?: boolean;
};

/**
 * Pure AUT-R1 contract. PASS ⇒ mayPersistOurRate=true (caller may write via Accept writer).
 */
export function evaluateAutR1LaborAcceptContract(
  input: EvaluateAutR1Input,
): AutR1ContractResult {
  const nowMs = input.nowMs ?? Date.now();

  // Hard: companyPrice never OUR RATE
  void isCompanyPriceForbiddenAsWorkRateBase();
  if (input.companyPriceOnly === true) {
    return exception(["COMPANY_PRICE_FORBIDDEN"], nowMs);
  }

  if (!input.identityTrusted) {
    return exception(["NOT_TRUSTED_IDENTITY"], nowMs);
  }

  const candidate = input.candidate;
  if (!candidate) {
    return exception(["NO_CANDIDATE"], nowMs);
  }

  const workId = String(candidate.workId ?? "").trim();
  const unit = String(candidate.unit ?? "").trim() as WgdomCostUnit;
  if (!workId) {
    return exception(["NO_WORK_ID"], nowMs);
  }
  if (!unit) {
    return exception(["NO_UNIT"], nowMs, { workId });
  }

  const marketBase = Number(candidate.marketBaseRatePln);
  if (!Number.isFinite(marketBase) || !(marketBase > 0)) {
    return exception(["INVALID_CANDIDATE_RATE"], nowMs, { workId, unit });
  }

  if (!Array.isArray(candidate.observations) || candidate.observations.length === 0) {
    return exception(["MISSING_CANDIDATE_OBSERVATIONS"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
    });
  }

  // Provenance: each observation needs url + sourceId + observedAt
  for (const o of candidate.observations) {
    if (
      !o
      || !String(o.sourceId || "").trim()
      || !String(o.sourceUrl || "").trim()
      || !String(o.observedAt || "").trim()
      || !Number.isFinite(o.ratePln)
      || !(o.ratePln > 0)
    ) {
      return exception(["MISSING_PROVENANCE"], nowMs, {
        workId,
        unit,
        marketBaseRatePln: roundRate(marketBase),
      });
    }
    if (String(o.unit) !== unit) {
      return exception(["UNIT_MISMATCH"], nowMs, {
        workId,
        unit,
        marketBaseRatePln: roundRate(marketBase),
      });
    }
  }

  // Evidence plane — durable preferred; else map candidate observations
  // (research allowlist already gated HTTP; AUT-R1 does not invent a second allowlist)
  const evidenceObs: LaborSourceEvidenceObservation[] =
    input.evidenceObservations && input.evidenceObservations.length > 0
      ? [...input.evidenceObservations]
      : candidate.observations.map((observation) =>
          buildEvidenceFromQualifiedObservation({
            workId,
            workNamePl: candidate.namePl || workId,
            observation,
            identityMethod: candidate.synonymUsed ? "owner_synonym" : "exact_name",
            synonymUsed: candidate.synonymUsed ?? null,
          }),
        );

  if (evidenceObs.length === 0) {
    return exception(["NO_EVIDENCE"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
    });
  }

  const lookup = lookupWorkRate(input.store, workId, unit, nowMs);

  if (lookup.status === "STALE") {
    return exception(["LOOKUP_STALE_BLOCKED"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
    });
  }

  // Overwrite / idempotent before Evidence sufficiency
  // (sufficiency treats CURRENT as N_A — Catalog First REUSE, not Accept gate)
  if (lookup.status === "CURRENT") {
    const existing = lookup.ourRatePln;
    const sameRate = Math.abs(roundRate(existing) - roundRate(marketBase)) <= 0.009;

    if (lookup.sourceType === "OWNER" && !sameRate) {
      return exception(["OVERWRITE_BLOCKED_OWNER"], nowMs, {
        workId,
        unit,
        marketBaseRatePln: roundRate(marketBase),
        overwriteBlocked: true,
      });
    }

    if (
      (lookup.sourceType === "OWNER"
        || lookup.sourceType === "ACCEPT"
        || lookup.sourceType === "AUTO_R1")
      && sameRate
    ) {
      return {
        decisionId: AUT_R1_DECISION_ID,
        ruleId: AUT_R1_RULE_ID,
        decision: "AUT_R1_ACCEPT",
        reasons: ["IDEMPOTENT_NOOP"],
        evaluatedAtIso: isoNow(nowMs),
        mayPersistOurRate: false,
        idempotentNoop: true,
        overwriteBlocked: false,
        evidenceSufficiency: null,
        workId,
        unit,
        marketBaseRatePln: roundRate(marketBase),
      };
    }

    if (!sameRate) {
      return exception(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, {
        workId,
        unit,
        marketBaseRatePln: roundRate(marketBase),
        overwriteBlocked: true,
      });
    }
  }

  const sufficiency = evaluateLaborEvidenceReuseSufficiency({
    workId,
    unit,
    namePl: candidate.namePl || workId,
    ourRateFreshness: "MISSING",
    observations: evidenceObs,
  });

  if (sufficiency.status === "NO_EVIDENCE") {
    return exception(["NO_EVIDENCE"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }
  if (sufficiency.status === "CONFLICT") {
    return exception(["EVIDENCE_CONFLICT"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }
  if (sufficiency.status === "STALE" || sufficiency.status === "BLOCKED_STALE_OUR_RATE") {
    return exception(["EVIDENCE_STALE"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }
  if (
    sufficiency.status === "INCOMPATIBLE_SCOPE"
    || sufficiency.status === "INCOMPATIBLE_REGION"
  ) {
    return exception(["EVIDENCE_INCOMPATIBLE"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }
  if (sufficiency.status === "INVALID") {
    return exception(["EVIDENCE_INVALID"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }
  if (!sufficiency.sufficient || sufficiency.status === "INSUFFICIENT") {
    return exception(["INSUFFICIENT_EVIDENCE"], nowMs, {
      workId,
      unit,
      marketBaseRatePln: roundRate(marketBase),
      evidenceSufficiency: sufficiency,
    });
  }

  return {
    decisionId: AUT_R1_DECISION_ID,
    ruleId: AUT_R1_RULE_ID,
    decision: "AUT_R1_ACCEPT",
    reasons: [],
    evaluatedAtIso: isoNow(nowMs),
    mayPersistOurRate: true,
    idempotentNoop: false,
    overwriteBlocked: false,
    evidenceSufficiency: sufficiency,
    workId,
    unit,
    marketBaseRatePln: roundRate(marketBase),
  };
}
