/**
 * IK-KNR KL-0 — Validation contract (pure · no persist · no HTTP).
 *
 * NORMATIVE ≠ VERIFIED · validation PASS alone insufficient for LOCAL HIT.
 */

import type { KnrValidationState, KnrVerificationStatus } from "./types";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import { isKnrIdentityV2VerifiedReady } from "./knr-identity-v2";
import { buildKnrNormContentHash } from "./knr-content-hash";

export type KnrValidateInput = {
  entry: KnrCatalogEntry;
  /** When true, enforce stricter rules for eventual VERIFIED (OPEN policy). */
  forVerifiedTarget?: boolean;
};

export type KnrValidateResult = {
  validationState: KnrValidationState;
  verificationStatus: KnrVerificationStatus;
  codes: string[];
  contentHash: string;
};

function hasNormLines(norms: KnrCatalogEntry["norms"]): {
  hasR: boolean;
  hasM: boolean;
  hasS: boolean;
} {
  return {
    hasR: norms.laborNorms.length > 0,
    hasM: norms.materialNorms.length > 0,
    hasS: norms.equipmentNorms.length > 0,
  };
}

/**
 * Pure validation — does not persist · does not promote to VERIFIED automatically.
 */
export function validateKnrCatalogEntryCandidate(
  input: KnrValidateInput,
): KnrValidateResult {
  const { entry, forVerifiedTarget = false } = input;
  const codes: string[] = [];
  const contentHash = buildKnrNormContentHash(entry.norms);

  if (entry.schemaVersion !== 1) {
    codes.push("SCHEMA_VERSION_MISMATCH");
    return {
      validationState: "REJECTED",
      verificationStatus: "REJECTED",
      codes,
      contentHash,
    };
  }

  if (entry.provenance.acquisitionMethod === "LLM_ASSIST_NON_AUTHORITATIVE" && !entry.provenance.rawEvidenceRef) {
    codes.push("LLM_ONLY_DENIED");
    return {
      validationState: "REJECTED",
      verificationStatus: "REJECTED",
      codes,
      contentHash,
    };
  }

  if (!entry.unit.trim()) {
    codes.push("UNIT_MISSING");
  }

  if (!entry.description.trim()) {
    codes.push("DESCRIPTION_MISSING");
  }

  if (!entry.identityKeyV2.trim()) {
    codes.push("IDENTITY_KEY_MISSING");
  }

  const { hasR, hasM, hasS } = hasNormLines(entry.norms);
  if (!hasR) {
    codes.push("R_MISSING");
  }
  if (!hasM && !hasS && !entry.emptyNormsWithEvidence) {
    if (!hasM) codes.push("M_MISSING");
    if (!hasS) codes.push("S_MISSING");
  }

  for (const line of [
    ...entry.norms.laborNorms,
    ...entry.norms.materialNorms,
    ...entry.norms.equipmentNorms,
  ]) {
    if (!Number.isFinite(line.quantity) || line.quantity < 0) {
      codes.push("QUANTITY_INVALID");
      break;
    }
    if (!line.unit.trim()) {
      codes.push("NORM_UNIT_MISSING");
      break;
    }
  }

  if (entry.contentHash.trim() && entry.contentHash.trim() !== contentHash) {
    codes.push("CONTENT_HASH_MISMATCH");
  }

  if (forVerifiedTarget && !isKnrIdentityV2VerifiedReady(entry.identity)) {
    codes.push("IDENTITY_V2_OPEN_FIELDS");
  }

  if (forVerifiedTarget && !entry.provenance.rawEvidenceRef) {
    codes.push("EVIDENCE_REF_MISSING");
  }

  if (
    forVerifiedTarget
    && entry.verificationStatus === "VERIFIED"
    && (!entry.verifiedAt?.trim() || !entry.verifiedBy?.trim())
  ) {
    codes.push("CLIENT_VERIFIED_SPOOF");
  }

  if (codes.some((c) => c === "SCHEMA_VERSION_MISMATCH" || c === "LLM_ONLY_DENIED")) {
    return {
      validationState: "REJECTED",
      verificationStatus: "REJECTED",
      codes,
      contentHash,
    };
  }

  if (codes.length > 0) {
    return {
      validationState: "INCOMPLETE",
      verificationStatus: "INCOMPLETE",
      codes,
      contentHash,
    };
  }

  return {
    validationState: "PASS",
    verificationStatus: entry.verificationStatus === "VERIFIED" ? "VERIFIED" : "NORMATIVE",
    codes,
    contentHash,
  };
}

/** Validation PASS does not imply VERIFIED — Owner VERIFY required. */
export function validationPassIsNotVerified(result: KnrValidateResult): boolean {
  return result.validationState === "PASS" && result.verificationStatus !== "VERIFIED";
}
