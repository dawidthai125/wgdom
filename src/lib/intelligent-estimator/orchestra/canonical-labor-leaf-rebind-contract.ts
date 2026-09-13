/**
 * CANONICAL LABOR LEAF REBIND — common pure primitive (design GO).
 *
 * Exact identity attestation → bind eligibility for a canonical labor leaf.
 * Does NOT persist OfferBoq · does NOT write OUR RATE · invent=false.
 *
 * Adapters:
 *   A) COMPOUND → canonical (existing CLLR)
 *   B) LABOR non-canonical → canonical
 */

import type { OfferBoqLine, OfferBoqMatchCandidate } from "@/lib/tender-offer-boq";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import { unitsCompatible as unitsCompatiblePm } from "@/lib/price-intelligence/market-material-research-provider";
import { AUTO_G1_MATCH_METHOD } from "@/lib/intelligent-estimator/orchestra/auto-g1-accept-contract";

export const CANONICAL_LABOR_LEAF_REBIND_DECISION_ID =
  "CANONICAL_LABOR_LEAF_REBIND" as const;
export const CANONICAL_LABOR_LEAF_REBIND_POLICY_VERSION = "CLLR-v2-canonical" as const;

export type CanonicalLaborLeafRebindDecision =
  | "CANONICAL_LEAF_REBIND_ACCEPT"
  | "CANONICAL_LEAF_REBIND_EXCEPTION"
  | "CANONICAL_LEAF_REBIND_IDEMPOTENT";

export type CanonicalLaborLeafIdentityMethod =
  | "cllr_exact_scope_rule"
  | "ckrk_exact_token_raw_description"
  | "durable_structured_identity"
  | "owner_identity_mapping";

export type ExactCanonicalLaborLeafRebindInput = {
  lineId: string;
  currentCatalogWorkId: string | null;
  currentPlane: string | null;
  rawDescription: string;
  normalizedDescription: string | null;
  unit: string;
  targetCatalogWorkId: string;
  targetFamily: string;
  targetCode: string;
  targetUnit: string;
  /** Attested family/code/unit already verified by adapter rule. */
  identityAttested: boolean;
  identityMethod: CanonicalLaborLeafIdentityMethod;
  ruleId: string;
  sourceMode: "COMPOUND_TO_CANONICAL" | "LABOR_TO_CANONICAL";
  store: WorkCatalogStore;
  nowMs?: number;
  /**
   * When true, forbid rebinding away from a different canonical cw.knr.* leaf
   * (no canonical→canonical demotion).
   */
  forbidCanonicalDemotion?: boolean;
};

export type ExactCanonicalLaborLeafRebindResult = {
  ok: boolean;
  decision: CanonicalLaborLeafRebindDecision;
  reason: string[];
  sourcePlane: string | null;
  targetWorkId: string | null;
  identityMethod: CanonicalLaborLeafIdentityMethod | null;
  confidence: "high" | null;
  unitCompatible: boolean;
  targetRateCurrent: boolean;
  persistable: boolean;
  ruleId: string | null;
  invent: false;
  ownerRuntimeDependency: 0;
  evaluatedAtIso: string;
  ourRatePln: number | null;
  rateStatus: "CURRENT" | "STALE" | "MISSING" | null;
};

function iso(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function fail(
  reasons: string[],
  evaluatedAtIso: string,
  extra?: Partial<ExactCanonicalLaborLeafRebindResult>,
): ExactCanonicalLaborLeafRebindResult {
  return {
    ok: false,
    decision: "CANONICAL_LEAF_REBIND_EXCEPTION",
    reason: reasons,
    sourcePlane: null,
    targetWorkId: null,
    identityMethod: null,
    confidence: null,
    unitCompatible: false,
    targetRateCurrent: false,
    persistable: false,
    ruleId: null,
    invent: false,
    ownerRuntimeDependency: 0,
    evaluatedAtIso,
    ourRatePln: null,
    rateStatus: null,
    ...extra,
  };
}

function isCanonicalKnrWorkId(id: string): boolean {
  return /^cw\.knr\./i.test(String(id || "").trim());
}

/**
 * Pure exact-identity gate. Adapter must already prove family/code/unit attestation.
 */
export function evaluateExactCanonicalLaborLeafRebind(
  input: ExactCanonicalLaborLeafRebindInput,
): ExactCanonicalLaborLeafRebindResult {
  const nowMs = input.nowMs ?? Date.now();
  const evaluatedAtIso = iso(nowMs);
  const unit = String(input.unit || "").trim();
  const targetUnit = String(input.targetUnit || "").trim();
  const targetId = String(input.targetCatalogWorkId || "").trim();
  const currentId = String(input.currentCatalogWorkId || "").trim();
  const sourcePlane = input.currentPlane;

  if (!input.identityAttested || !input.identityMethod || !input.ruleId) {
    return fail(["NO_EXACT_IDENTITY"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId || null,
    });
  }

  if (!String(input.targetFamily || "").trim()) {
    return fail(["FAMILY_MISMATCH"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
    });
  }
  if (!String(input.targetCode || "").trim()) {
    return fail(["CODE_MISMATCH"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
    });
  }

  if (!unit || !targetUnit) {
    return fail(["UNIT_MISMATCH", "NO_UNIT"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      targetWorkId: targetId || null,
    });
  }
  if (!unitsCompatiblePm(unit, targetUnit)) {
    return fail(["UNIT_MISMATCH"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      targetWorkId: targetId || null,
      unitCompatible: false,
    });
  }

  if (!targetId) {
    return fail(["TARGET_CATALOGWORK_MISSING"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      unitCompatible: true,
    });
  }

  // Idempotent: already on target leaf
  if (currentId && currentId === targetId) {
    const lookup = lookupWorkRate(input.store, targetId, targetUnit, nowMs);
    return {
      ok: true,
      decision: "CANONICAL_LEAF_REBIND_IDEMPOTENT",
      reason: ["ALREADY_BOUND_TO_CANONICAL_LEAF", "IDEMPOTENT_NOOP"],
      sourcePlane,
      targetWorkId: targetId,
      identityMethod: input.identityMethod,
      confidence: "high",
      unitCompatible: true,
      targetRateCurrent: lookup.status === "CURRENT",
      persistable: false,
      ruleId: input.ruleId,
      invent: false,
      ownerRuntimeDependency: 0,
      evaluatedAtIso,
      ourRatePln: lookup.ourRatePln ?? null,
      rateStatus: lookup.status as ExactCanonicalLaborLeafRebindResult["rateStatus"],
    };
  }

  // Forbid demoting / hopping between distinct canonical leaves without Owner GO
  if (
    input.forbidCanonicalDemotion !== false
    && currentId
    && isCanonicalKnrWorkId(currentId)
    && currentId !== targetId
  ) {
    return fail(["SOURCE_PLANE_UNSUPPORTED", "CANONICAL_DEMOTION_FORBIDDEN"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      targetWorkId: targetId,
      unitCompatible: true,
    });
  }

  const leaf = getWorkByIdFromStore(input.store, targetId);
  if (!leaf) {
    return fail(["TARGET_CATALOGWORK_MISSING", "LEAF_NOT_IN_CATALOG"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      targetWorkId: targetId,
      unitCompatible: true,
    });
  }

  const leafUnit = String(leaf.unit || "").trim() || targetUnit;
  if (!unitsCompatiblePm(unit, leafUnit)) {
    return fail(["UNIT_MISMATCH"], evaluatedAtIso, {
      sourcePlane,
      ruleId: input.ruleId,
      identityMethod: input.identityMethod,
      targetWorkId: targetId,
      unitCompatible: false,
    });
  }

  const lookup = lookupWorkRate(input.store, targetId, leafUnit, nowMs);
  if (lookup.status === "MISSING" || !(Number(lookup.ourRatePln) > 0)) {
    return fail(
      ["TARGET_RATE_MISSING", "LEAF_RATE_MISSING", "OUR_RATE_MUST_BE_CURRENT_NO_RESEARCH"],
      evaluatedAtIso,
      {
        sourcePlane,
        ruleId: input.ruleId,
        identityMethod: input.identityMethod,
        targetWorkId: targetId,
        unitCompatible: true,
        targetRateCurrent: false,
        rateStatus: "MISSING",
        ourRatePln: lookup.ourRatePln ?? null,
      },
    );
  }
  if (lookup.status === "STALE") {
    return fail(
      ["TARGET_RATE_STALE", "LEAF_RATE_STALE", "OUR_RATE_MUST_BE_CURRENT_NO_RESEARCH"],
      evaluatedAtIso,
      {
        sourcePlane,
        ruleId: input.ruleId,
        identityMethod: input.identityMethod,
        targetWorkId: targetId,
        unitCompatible: true,
        targetRateCurrent: false,
        rateStatus: "STALE",
        ourRatePln: lookup.ourRatePln ?? null,
      },
    );
  }
  if (lookup.status !== "CURRENT") {
    return fail(
      [`TARGET_RATE_${lookup.status}`, "OUR_RATE_MUST_BE_CURRENT_NO_RESEARCH"],
      evaluatedAtIso,
      {
        sourcePlane,
        ruleId: input.ruleId,
        identityMethod: input.identityMethod,
        targetWorkId: targetId,
        unitCompatible: true,
        targetRateCurrent: false,
        rateStatus: lookup.status as ExactCanonicalLaborLeafRebindResult["rateStatus"],
        ourRatePln: lookup.ourRatePln ?? null,
      },
    );
  }

  return {
    ok: true,
    decision: "CANONICAL_LEAF_REBIND_ACCEPT",
    reason: [
      "EXACT_IDENTITY_ATTESTED",
      `SOURCE_MODE=${input.sourceMode}`,
      "TARGET_IN_CATALOG",
      "CATALOG_FIRST_CURRENT",
      `OUR_RATE=${lookup.ourRatePln}`,
      "NO_FUZZY",
      "NO_OWNER_QUEUE",
      "NO_PARENT_GLOBAL_MAP",
    ],
    sourcePlane,
    targetWorkId: targetId,
    identityMethod: input.identityMethod,
    confidence: "high",
    unitCompatible: true,
    targetRateCurrent: true,
    persistable: true,
    ruleId: input.ruleId,
    invent: false,
    ownerRuntimeDependency: 0,
    evaluatedAtIso,
    ourRatePln: lookup.ourRatePln ?? null,
    rateStatus: "CURRENT",
  };
}

/** Pure apply — same provenance family as CLLR (`auto_contract`). */
export function applyCanonicalLaborLeafRebindToLine(
  line: OfferBoqLine,
  result: ExactCanonicalLaborLeafRebindResult,
  parentWorkId?: string | null,
): OfferBoqLine {
  if (result.decision !== "CANONICAL_LEAF_REBIND_ACCEPT" || !result.targetWorkId) {
    return line;
  }
  const rationale = [
    `CANONICAL_LEAF_REBIND rule=${result.ruleId}`,
    ...result.reason,
  ].join(" · ");
  const primary: OfferBoqMatchCandidate = {
    catalogWorkId: result.targetWorkId,
    workNamePl: result.targetWorkId,
    workCategory: "",
    tradeId: null,
    score: 0,
    role: "primary",
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.confidence ?? "high",
    rationale,
  };
  const parentId = String(parentWorkId || line.catalogWorkId || "").trim();
  const rest = (line.candidateMatches ?? []).filter(
    (c) => c.catalogWorkId !== result.targetWorkId,
  );
  if (
    parentId
    && parentId !== result.targetWorkId
    && !rest.some((c) => c.catalogWorkId === parentId)
  ) {
    rest.unshift({
      catalogWorkId: parentId,
      workNamePl: parentId,
      workCategory: "",
      tradeId: null,
      score: 0,
      role: "secondary",
      matchedBy: line.matchMethod || "catalog_map",
      matchConfidence: "medium",
      rationale: "prior_non_canonical_parent",
    });
  }
  return {
    ...line,
    catalogWorkId: result.targetWorkId,
    matchMethod: AUTO_G1_MATCH_METHOD,
    matchedBy: AUTO_G1_MATCH_METHOD,
    matchConfidence: result.confidence ?? "high",
    aiConfidence: result.confidence ?? "high",
    aiRationale: rationale,
    candidateMatches: [primary, ...rest],
    warnings: (line.warnings ?? []).filter(
      (w) =>
        !String(w).startsWith("COMPOUND_LEAF_REBIND")
        && !String(w).startsWith("CANONICAL_LEAF_REBIND"),
    ),
  };
}

/** Raw description preferred — normalizer strips KNR table codes. */
export function rawIdentityDescription(line: OfferBoqLine): string {
  const raw = String(line.description || "").trim();
  if (raw) return raw;
  return String(line.normalizedDescription || "").trim();
}
