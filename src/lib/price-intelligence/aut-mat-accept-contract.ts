/**
 * AUT-MAT — Autonomous Material Price Memory Decision Contract (pure · fail-closed).
 *
 * Candidate → validation → AUT-MAT PASS → caller may invoke existing
 * acceptMaterialResearchCandidate (decision.kind=AUT_MAT).
 *
 * ZERO invent · ZERO companyPrice · ZERO second Price Memory · ZERO re-aggregation.
 * Multi-source DIY average → CONFLICT (fail-closed; no autonomous Accept of averaged multi-price).
 */

import type { CatalogWork } from "@/lib/work-catalog/types";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import type { PriceCandidate } from "./price-candidate-types";
import { evaluateMaterialCache } from "./market-material-research-cache";
import { unitsCompatible } from "./market-material-research-provider";
import { derivePriceMemoryFreshnessUx } from "./price-memory";

export const AUT_MAT_DECISION_ID = "AUT_MAT_MATERIAL_PM_ACCEPT" as const;
export const AUT_MAT_RULE_ID = "aut_mat.material_candidate_v1" as const;

export type AutMatDecision = "AUT_MAT_ACCEPT" | "AUT_MAT_EXCEPTION";

export type AutMatExceptionReason =
  | "NOT_TRUSTED_IDENTITY"
  | "NO_MATERIAL_KEY"
  | "NO_CATALOG_WORK_ID"
  | "NO_UNIT"
  | "UNIT_MISMATCH"
  | "NO_CANDIDATE"
  | "INVALID_CANDIDATE_PRICE"
  | "OWNER_SOURCE_FORBIDDEN"
  | "MISSING_PROVENANCE"
  | "MISSING_EVIDENCE"
  | "EVIDENCE_CONFLICT"
  | "EVIDENCE_STALE"
  | "COMPANY_PRICE_FORBIDDEN"
  | "OVERWRITE_BLOCKED_OWNER"
  | "OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"
  | "IDEMPOTENT_NOOP";

export type AutMatContractResult = {
  decisionId: typeof AUT_MAT_DECISION_ID;
  ruleId: typeof AUT_MAT_RULE_ID;
  decision: AutMatDecision;
  reasons: AutMatExceptionReason[];
  evaluatedAtIso: string;
  mayPersistPriceMemory: boolean;
  idempotentNoop: boolean;
  overwriteBlocked: boolean;
  materialKey: string | null;
  catalogWorkId: string | null;
  unit: string | null;
  priceNet: number | null;
};

function isoNow(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function exception(
  reasons: AutMatExceptionReason[],
  nowMs: number,
  extra?: Partial<AutMatContractResult>,
): AutMatContractResult {
  return {
    decisionId: AUT_MAT_DECISION_ID,
    ruleId: AUT_MAT_RULE_ID,
    decision: "AUT_MAT_EXCEPTION",
    reasons,
    evaluatedAtIso: isoNow(nowMs),
    mayPersistPriceMemory: false,
    idempotentNoop: false,
    overwriteBlocked: false,
    materialKey: null,
    catalogWorkId: null,
    unit: null,
    priceNet: null,
    ...extra,
  };
}

function hasMarketEvidence(candidate: PriceCandidate): boolean {
  if (String(candidate.sourceUrl || "").trim()) return true;
  const notes = String(candidate.notes || "");
  // DIY selective: shops=… + live_selective_diy
  if (notes.includes("live_selective_diy") && /shops=[A-Za-z0-9_+-]+/.test(notes)) {
    return true;
  }
  // Mock / Stage B marked research (tests) — still needs explicit URL or mock marker notes
  if (candidate.provenance === "mock_test" && notes.includes("TEST")) return true;
  return false;
}

function isMultiSourceAverage(candidate: PriceCandidate): boolean {
  return String(candidate.notes || "").includes("multi_source_average");
}

function readExistingDecisionKind(
  work: CatalogWork | null | undefined,
  origin: string | null | undefined,
  region: string,
): "OWNER" | "AUT_MAT" | "UNKNOWN" {
  if (!work?.marketQuotes || !origin) return "UNKNOWN";
  const perOrigin = work.marketQuotes[origin as keyof typeof work.marketQuotes];
  if (!perOrigin || typeof perOrigin !== "object") return "UNKNOWN";
  const snap =
    perOrigin[region as keyof typeof perOrigin]
    ?? Object.values(perOrigin)[0];
  if (!snap || typeof snap !== "object") return "UNKNOWN";
  const kind = (snap as { decisionKind?: string }).decisionKind;
  if (kind === "AUT_MAT") return "AUT_MAT";
  if (kind === "OWNER") return "OWNER";
  return "UNKNOWN";
}

export type EvaluateAutMatInput = {
  worksById: ReadonlyMap<string, CatalogWork>;
  candidate: PriceCandidate | null | undefined;
  /** Expected BOQ / demand unit. */
  expectedUnit: string;
  /** Trusted material identity (product or demand.work MATERIAL path). */
  identityTrusted: boolean;
  nowMs?: number;
  region?: string | null;
  /**
   * Tests may force companyPrice probe — production callers omit.
   * When true → always EXCEPTION (never seed PM from companyPrice).
   */
  companyPriceOnly?: boolean;
};

/**
 * Pure AUT-MAT contract. PASS ⇒ mayPersistPriceMemory=true (caller may write via Accept).
 */
export function evaluateAutMatMaterialAcceptContract(
  input: EvaluateAutMatInput,
): AutMatContractResult {
  const nowMs = input.nowMs ?? Date.now();
  const region = String(input.region || "wroclaw").trim() || "wroclaw";

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

  const materialKey = String(candidate.materialKey ?? "").trim();
  const catalogWorkId = String(candidate.catalogWorkId ?? "").trim();
  const unit = String(candidate.unit ?? "").trim();

  if (!materialKey && !catalogWorkId) {
    return exception(["NO_MATERIAL_KEY"], nowMs);
  }
  if (!catalogWorkId) {
    return exception(["NO_CATALOG_WORK_ID"], nowMs, { materialKey: materialKey || null });
  }
  if (!unit) {
    return exception(["NO_UNIT"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
    });
  }

  if (!unitsCompatible(input.expectedUnit, unit)) {
    return exception(["UNIT_MISMATCH"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
    });
  }

  // Owner-entered / company-like source — never autonomous market Accept.
  // String() compare: do not depend on WIP PriceCandidateSourceType|"owner" union.
  if (String(candidate.sourceType || "") === "owner") {
    return exception(["OWNER_SOURCE_FORBIDDEN"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
    });
  }

  const priceNet = Number(candidate.priceNet);
  if (!Number.isFinite(priceNet) || !(priceNet > 0)) {
    return exception(["INVALID_CANDIDATE_PRICE"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
    });
  }
  const rounded = roundMarketPricePln(priceNet);

  if (candidate.currency !== "PLN") {
    return exception(["INVALID_CANDIDATE_PRICE"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
    });
  }

  // Provenance stamps on Candidate
  if (
    !String(candidate.retrievedAt || "").trim()
    || !String(candidate.priceDate || "").trim()
    || !String(candidate.provider || "").trim()
  ) {
    return exception(["MISSING_PROVENANCE"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
    });
  }

  if (!hasMarketEvidence(candidate)) {
    return exception(["MISSING_EVIDENCE"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
    });
  }

  // Existing DIY multi-source average is Candidate research policy — not safe
  // autonomous Accept without Owner (no median/average at Accept layer).
  if (isMultiSourceAverage(candidate)) {
    return exception(["EVIDENCE_CONFLICT"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
    });
  }

  const candidateAsOf = candidate.retrievedAt || candidate.priceDate;
  if (derivePriceMemoryFreshnessUx(candidateAsOf, nowMs) === "stale") {
    return exception(["EVIDENCE_STALE"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
    });
  }

  const cache = evaluateMaterialCache({
    materialKey,
    catalogWorkId,
    region,
    worksById: input.worksById,
    nowMs,
  });

  if (cache.usability === "CURRENT" && cache.hit) {
    const samePrice = Math.abs(roundMarketPricePln(cache.hit.price) - rounded) <= 0.009;
    const work = input.worksById.get(cache.hit.workId) ?? input.worksById.get(catalogWorkId);
    const existingKind = readExistingDecisionKind(work, cache.hit.origin, cache.hit.region);

    if (samePrice) {
      return {
        decisionId: AUT_MAT_DECISION_ID,
        ruleId: AUT_MAT_RULE_ID,
        decision: "AUT_MAT_ACCEPT",
        reasons: ["IDEMPOTENT_NOOP"],
        evaluatedAtIso: isoNow(nowMs),
        mayPersistPriceMemory: false,
        idempotentNoop: true,
        overwriteBlocked: false,
        materialKey: materialKey || null,
        catalogWorkId,
        unit,
        priceNet: rounded,
      };
    }

    if (existingKind === "OWNER" || existingKind === "UNKNOWN") {
      return exception(["OVERWRITE_BLOCKED_OWNER"], nowMs, {
        materialKey: materialKey || null,
        catalogWorkId,
        unit,
        priceNet: rounded,
        overwriteBlocked: true,
      });
    }

    return exception(["OVERWRITE_BLOCKED_STRONGER_OR_FRESHER"], nowMs, {
      materialKey: materialKey || null,
      catalogWorkId,
      unit,
      priceNet: rounded,
      overwriteBlocked: true,
    });
  }

  return {
    decisionId: AUT_MAT_DECISION_ID,
    ruleId: AUT_MAT_RULE_ID,
    decision: "AUT_MAT_ACCEPT",
    reasons: [],
    evaluatedAtIso: isoNow(nowMs),
    mayPersistPriceMemory: true,
    idempotentNoop: false,
    overwriteBlocked: false,
    materialKey: materialKey || null,
    catalogWorkId,
    unit,
    priceNet: rounded,
  };
}
