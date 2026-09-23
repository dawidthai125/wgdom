/**
 * OWNER_RC1_CREATE_CANDIDATE_KPL — fail-closed apply helper for Safe Merge attestation.
 *
 * REUSE: resolveLaborIdentityMapping · applyAutonomousIdentityLeafToLine
 * Emits OWNER_RC1_CREATE_CANDIDATE_KPL + mappingId=<id>
 *   (≠ bare OWNER_RC1_CREATE_CANDIDATE · ≠ CONNECT · ≠ CLLR).
 * Unit HARD = kpl · Does NOT hardcode MOPS lineIds · does NOT write storage.
 */

import type { OfferBoqLine } from "@/lib/tender-offer-boq";
import { applyAutonomousIdentityLeafToLine } from "@/lib/intelligent-estimator/orchestra/ik-autonomous-identity-writeback";
import {
  listWorkRateIdentityMappings,
  resolveLaborIdentityMapping,
} from "@/lib/work-catalog/work-rate-identity-mapping";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import { getMopsElecRc1WorkSpec } from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";
import {
  OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
  OWNER_RC1_CREATE_CANDIDATE_KPL_POLICY_VERSION,
  formatOwnerRc1CreateCandidateKplMappingIdToken,
  getOwnerRc1CreateCandidateKplPairForLeaf,
  getOwnerRc1CreateCandidateKplPairForMapping,
  isOwnerRc1CreateCandidateKplExactPair,
  isOwnerRc1CreateCandidateKplLeafWorkId,
} from "@/lib/work-catalog/owner-rc1-create-candidate-kpl-contract";

export const OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_VERSION =
  OWNER_RC1_CREATE_CANDIDATE_KPL_POLICY_VERSION;

export type OwnerRc1CreateCandidateKplApplyDecision =
  | "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_ACCEPT"
  | "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT";

export type OwnerRc1CreateCandidateKplApplyResult = {
  decision: OwnerRc1CreateCandidateKplApplyDecision;
  reasons: string[];
  leafWorkId: string | null;
  mappingId: string | null;
  parentWorkId: string | null;
  patchedLine: OfferBoqLine | null;
  invent: false;
};

function unitsCompatible(a: string, b: string): boolean {
  const x = normalizeWorkRateUnitToken(a);
  const y = normalizeWorkRateUnitToken(b);
  if (x && y) return x === y;
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function reject(
  reasons: string[],
  partial?: Partial<OwnerRc1CreateCandidateKplApplyResult>,
): OwnerRc1CreateCandidateKplApplyResult {
  return {
    decision: "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_REJECT",
    reasons,
    leafWorkId: partial?.leafWorkId ?? null,
    mappingId: partial?.mappingId ?? null,
    parentWorkId: partial?.parentWorkId ?? null,
    patchedLine: null,
    invent: false,
  };
}

/**
 * Pure gate + patch. Caller persists via runGatedIdentityPersist.
 */
export function applyOwnerRc1CreateCandidateKplIdentityToLine(
  line: OfferBoqLine,
  input: {
    leafWorkId: string;
    mappingId: string;
    parentWorkId?: string | null;
  },
): OwnerRc1CreateCandidateKplApplyResult {
  const leaf = String(input.leafWorkId || "").trim();
  const mappingId = String(input.mappingId || "").trim();
  const parentWorkId = String(
    input.parentWorkId || line.catalogWorkId || "",
  ).trim() || null;

  if (!leaf || !mappingId) {
    return reject(["MISSING_LEAF_OR_MAPPING_ID"]);
  }
  if (!isOwnerRc1CreateCandidateKplLeafWorkId(leaf)) {
    return reject(["LEAF_NOT_OWNER_RC1_CREATE_CANDIDATE_KPL"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (!isOwnerRc1CreateCandidateKplExactPair(leaf, mappingId)) {
    return reject(["LEAF_MAPPING_PAIR_MISMATCH"], { leafWorkId: leaf, mappingId });
  }

  const pairByLeaf = getOwnerRc1CreateCandidateKplPairForLeaf(leaf);
  const pairByMap = getOwnerRc1CreateCandidateKplPairForMapping(mappingId);
  if (!pairByLeaf || !pairByMap || pairByLeaf.mappingId !== pairByMap.mappingId) {
    return reject(["KPL_PAIR_LOOKUP_FAIL"], { leafWorkId: leaf, mappingId });
  }

  const catalogSpec = getMopsElecRc1WorkSpec(leaf);
  if (!catalogSpec) {
    return reject(["TARGET_CATALOG_WORK_SSOT_MISSING"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (!unitsCompatible(catalogSpec.unit, "kpl")) {
    return reject([`TARGET_CATALOG_UNIT_NOT_KPL=${catalogSpec.unit}`], {
      leafWorkId: leaf,
      mappingId,
    });
  }

  const unit = String(line.unit || "").trim();
  if (!unit || !unitsCompatible(unit, "kpl")) {
    return reject([`UNIT_MISMATCH line=${unit || "?"} expected=kpl`], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (unitsCompatible(unit, "szt")) {
    return reject(["UNIT_SZT_REJECTED_FOR_KPL_CLASS"], {
      leafWorkId: leaf,
      mappingId,
    });
  }

  const row = listWorkRateIdentityMappings().find((r) => r.mappingId === mappingId);
  if (!row) {
    return reject(["MAPPING_ROW_MISSING"], { leafWorkId: leaf, mappingId });
  }
  if (row.workId !== leaf) {
    return reject(["MAPPING_ROW_WORK_ID_MISMATCH"], { leafWorkId: leaf, mappingId });
  }
  if (row.active !== true) {
    return reject(["MAPPING_INACTIVE"], { leafWorkId: leaf, mappingId });
  }
  if (row.ownerApproval !== true) {
    return reject(["MAPPING_OWNER_APPROVAL_FALSE"], { leafWorkId: leaf, mappingId });
  }
  if (String(row.confidence || "").toUpperCase() !== "HIGH") {
    return reject([`MAPPING_CONFIDENCE_NOT_HIGH=${row.confidence}`], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (String(row.matchMode || "") !== "exact_normalized") {
    return reject(["MAPPING_NOT_EXACT_NORMALIZED"], { leafWorkId: leaf, mappingId });
  }
  const notes = String(row.provenance?.notesPl || "");
  if (!/CREATE_CANDIDATE_KPL/i.test(notes)) {
    return reject(["MAPPING_NOT_CREATE_CANDIDATE_KPL"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (/VERIFY_CONNECT/i.test(notes)) {
    return reject(["MAPPING_IS_VERIFY_CONNECT_NOT_KPL"], {
      leafWorkId: leaf,
      mappingId,
    });
  }

  const resolve = resolveLaborIdentityMapping({
    observedName: String(line.description || ""),
    observedUnit: unit,
    sourceId: "*",
    laborOnly: true,
    includesMaterial: false,
    knownWorkIds: [leaf, parentWorkId || "legacy-elektryka-szt"].filter(Boolean),
  });
  if (resolve.status !== "HIT") {
    return reject([`RESOLVE_${resolve.status}`], { leafWorkId: leaf, mappingId });
  }
  if (resolve.workId !== leaf) {
    return reject(
      [`RESOLVE_LEAF_MISMATCH expected=${leaf} got=${resolve.workId}`],
      { leafWorkId: leaf, mappingId },
    );
  }
  if (resolve.mappingId !== mappingId) {
    return reject(
      [`RESOLVE_MAPPING_MISMATCH expected=${mappingId} got=${resolve.mappingId}`],
      { leafWorkId: leaf, mappingId },
    );
  }

  const reasons = [
    OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION,
    formatOwnerRc1CreateCandidateKplMappingIdToken(mappingId),
    `policy=${OWNER_RC1_CREATE_CANDIDATE_KPL_POLICY_VERSION}`,
    "CREATE_CANDIDATE_KPL",
    "exact_normalized",
    "ownerApproval=true",
    "confidence=HIGH",
    "unit=kpl",
    "resolve=HIT",
  ];

  const patched = applyAutonomousIdentityLeafToLine(line, {
    leafWorkId: leaf,
    parentWorkId: parentWorkId || "legacy-elektryka-szt",
    reasons,
    matchConfidence: "high",
  });

  const rationale = String(patched.aiRationale || "");
  if (!rationale.includes(OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION)) {
    return reject(["ATTESTATION_NOT_EMITTED"], { leafWorkId: leaf, mappingId });
  }
  if (!rationale.includes(formatOwnerRc1CreateCandidateKplMappingIdToken(mappingId))) {
    return reject(["MAPPING_ID_TOKEN_NOT_EMITTED"], { leafWorkId: leaf, mappingId });
  }
  if (rationale.includes("OWNER_RC1_VERIFY_CONNECT")) {
    return reject(["CONNECT_ATTESTATION_LEAK"], { leafWorkId: leaf, mappingId });
  }
  // Bare szt CREATE without requiring _KPL form already satisfied by emitting _KPL.
  // Explicit: reject if someone stripped to bare token only (defensive)
  if (
    rationale.includes("OWNER_RC1_CREATE_CANDIDATE") &&
    !rationale.includes(OWNER_RC1_CREATE_CANDIDATE_KPL_ATTESTATION)
  ) {
    return reject(["BARE_CREATE_ATTESTATION_NOT_KPL"], {
      leafWorkId: leaf,
      mappingId,
    });
  }

  return {
    decision: "OWNER_RC1_CREATE_CANDIDATE_KPL_APPLY_ACCEPT",
    reasons: [...reasons, "APPLY_ACCEPT"],
    leafWorkId: leaf,
    mappingId,
    parentWorkId,
    patchedLine: patched,
    invent: false,
  };
}
