/**
 * OWNER_RC1_RECLASS_STOLARKA — fail-closed apply helper for Safe Merge attestation.
 *
 * REUSE: resolveLaborIdentityMapping · applyAutonomousIdentityLeafToLine
 * Emits OWNER_RC1_RECLASS_STOLARKA + mappingId=<id>
 *   (≠ CREATE · ≠ CREATE_KPL · ≠ CONNECT · ≠ CLLR).
 * Unit HARD = szt · Does NOT hardcode MOPS lineIds · does NOT write storage.
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
  OWNER_RC1_RECLASS_STOLARKA_ATTESTATION,
  OWNER_RC1_RECLASS_STOLARKA_POLICY_VERSION,
  formatOwnerRc1ReclassStolarkaMappingIdToken,
  getOwnerRc1ReclassStolarkaPairForLeaf,
  getOwnerRc1ReclassStolarkaPairForMapping,
  isOwnerRc1ReclassStolarkaExactPair,
  isOwnerRc1ReclassStolarkaLeafWorkId,
} from "@/lib/work-catalog/owner-rc1-reclass-stolarka-contract";

export const OWNER_RC1_RECLASS_STOLARKA_APPLY_VERSION =
  OWNER_RC1_RECLASS_STOLARKA_POLICY_VERSION;

export type OwnerRc1ReclassStolarkaApplyDecision =
  | "OWNER_RC1_RECLASS_STOLARKA_APPLY_ACCEPT"
  | "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT";

export type OwnerRc1ReclassStolarkaApplyResult = {
  decision: OwnerRc1ReclassStolarkaApplyDecision;
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
  partial?: Partial<OwnerRc1ReclassStolarkaApplyResult>,
): OwnerRc1ReclassStolarkaApplyResult {
  return {
    decision: "OWNER_RC1_RECLASS_STOLARKA_APPLY_REJECT",
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
export function applyOwnerRc1ReclassStolarkaIdentityToLine(
  line: OfferBoqLine,
  input: {
    leafWorkId: string;
    mappingId: string;
    parentWorkId?: string | null;
  },
): OwnerRc1ReclassStolarkaApplyResult {
  const leaf = String(input.leafWorkId || "").trim();
  const mappingId = String(input.mappingId || "").trim();
  const parentWorkId = String(
    input.parentWorkId || line.catalogWorkId || "",
  ).trim() || null;

  if (!leaf || !mappingId) {
    return reject(["MISSING_LEAF_OR_MAPPING_ID"]);
  }
  if (!isOwnerRc1ReclassStolarkaLeafWorkId(leaf)) {
    return reject(["LEAF_NOT_OWNER_RC1_RECLASS_STOLARKA"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (!isOwnerRc1ReclassStolarkaExactPair(leaf, mappingId)) {
    return reject(["LEAF_MAPPING_PAIR_MISMATCH"], { leafWorkId: leaf, mappingId });
  }

  const pairByLeaf = getOwnerRc1ReclassStolarkaPairForLeaf(leaf);
  const pairByMap = getOwnerRc1ReclassStolarkaPairForMapping(mappingId);
  if (!pairByLeaf || !pairByMap || pairByLeaf.mappingId !== pairByMap.mappingId) {
    return reject(["RECLASS_PAIR_LOOKUP_FAIL"], { leafWorkId: leaf, mappingId });
  }

  const catalogSpec = getMopsElecRc1WorkSpec(leaf);
  if (!catalogSpec) {
    return reject(["TARGET_CATALOG_WORK_SSOT_MISSING"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (!unitsCompatible(catalogSpec.unit, "szt")) {
    return reject([`TARGET_CATALOG_UNIT_NOT_SZT=${catalogSpec.unit}`], {
      leafWorkId: leaf,
      mappingId,
    });
  }

  const unit = String(line.unit || "").trim();
  if (!unit || !unitsCompatible(unit, "szt")) {
    return reject([`UNIT_MISMATCH line=${unit || "?"} expected=szt`], {
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
  if (!/RECLASS_STOLARKA/i.test(notes)) {
    return reject(["MAPPING_NOT_RECLASS_STOLARKA"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (/CREATE_CANDIDATE/i.test(notes)) {
    return reject(["MAPPING_IS_CREATE_NOT_RECLASS"], {
      leafWorkId: leaf,
      mappingId,
    });
  }
  if (/VERIFY_CONNECT/i.test(notes)) {
    return reject(["MAPPING_IS_VERIFY_CONNECT_NOT_RECLASS"], {
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
    OWNER_RC1_RECLASS_STOLARKA_ATTESTATION,
    formatOwnerRc1ReclassStolarkaMappingIdToken(mappingId),
    `policy=${OWNER_RC1_RECLASS_STOLARKA_POLICY_VERSION}`,
    "RECLASS_STOLARKA",
    "exact_normalized",
    "ownerApproval=true",
    "confidence=HIGH",
    "unit=szt",
    "resolve=HIT",
  ];

  const patched = applyAutonomousIdentityLeafToLine(line, {
    leafWorkId: leaf,
    parentWorkId: parentWorkId || "legacy-elektryka-szt",
    reasons,
    matchConfidence: "high",
  });

  const rationale = String(patched.aiRationale || "");
  if (!rationale.includes(OWNER_RC1_RECLASS_STOLARKA_ATTESTATION)) {
    return reject(["ATTESTATION_NOT_EMITTED"], { leafWorkId: leaf, mappingId });
  }
  if (!rationale.includes(formatOwnerRc1ReclassStolarkaMappingIdToken(mappingId))) {
    return reject(["MAPPING_ID_TOKEN_NOT_EMITTED"], { leafWorkId: leaf, mappingId });
  }
  if (rationale.includes("OWNER_RC1_VERIFY_CONNECT")) {
    return reject(["CONNECT_ATTESTATION_LEAK"], { leafWorkId: leaf, mappingId });
  }
  if (rationale.includes("OWNER_RC1_CREATE_CANDIDATE")) {
    return reject(["CREATE_ATTESTATION_LEAK"], { leafWorkId: leaf, mappingId });
  }

  return {
    decision: "OWNER_RC1_RECLASS_STOLARKA_APPLY_ACCEPT",
    reasons: [...reasons, "APPLY_ACCEPT"],
    leafWorkId: leaf,
    mappingId,
    parentWorkId,
    patchedLine: patched,
    invent: false,
  };
}
