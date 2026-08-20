/**
 * IK-KNR KL-0 — OUR KNR CATALOG entry shape (contract only · no store).
 *
 * Payload = normative R/M/S · NOT ourRatePln · NOT marketQuotes · NOT catalogWorkId.
 */

import type {
  KnrKnowledgeSchemaVersion,
  KnrLifecycleState,
  KnrNormComponentKind,
  KnrValidationState,
  KnrVerificationStatus,
} from "./types";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import type { KnrProvenance } from "./knr-provenance-types";

/** Single norm line (robocizna / materiał / sprzęt). Quantities only — no PLN authority. */
export type KnrNormLine = {
  kind: KnrNormComponentKind;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  /** Optional reference code from source export — not pricing. */
  sourceRef?: string | null;
};

export type KnrNormBundle = {
  laborNorms: KnrNormLine[];
  materialNorms: KnrNormLine[];
  equipmentNorms: KnrNormLine[];
};

/**
 * Full catalog entry contract (TARGET kw-knr-catalog · KL-1+ persist).
 * KL-0: type + validation only.
 */
export type KnrCatalogEntry = {
  schemaVersion: KnrKnowledgeSchemaVersion;
  identityKeyV2: string;
  evidenceKeyV1: string;
  identity: KnrIdentityV2Partial;
  originalSourceCode: string;
  displayCode: string;
  description: string;
  unit: string;
  norms: KnrNormBundle;
  provenance: KnrProvenance;
  verificationStatus: KnrVerificationStatus;
  validationState: KnrValidationState;
  lifecycleState: KnrLifecycleState;
  contentHash: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  supersededBy?: string | null;
  /** Explicit marker when M/S intentionally empty with evidence (OPEN policy). */
  emptyNormsWithEvidence?: boolean;
};

/** Default verification for new candidates — never VERIFIED. */
export const KNR_CATALOG_ENTRY_DEFAULT_VERIFICATION: KnrVerificationStatus = "STRUCTURAL";

export function createKnrCatalogEntrySkeleton(
  partial: Pick<
    KnrCatalogEntry,
    "identityKeyV2" | "evidenceKeyV1" | "identity" | "originalSourceCode" | "displayCode"
  >,
  nowIso: string,
): KnrCatalogEntry {
  return {
    schemaVersion: 1,
    identityKeyV2: partial.identityKeyV2,
    evidenceKeyV1: partial.evidenceKeyV1,
    identity: partial.identity,
    originalSourceCode: partial.originalSourceCode,
    displayCode: partial.displayCode,
    description: "",
    unit: "",
    norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    provenance: {
      sourceType: "UNSPECIFIED",
      sourceIdentifier: "",
      acquisitionMethod: "NOT_ACQUIRED",
      capturedAt: nowIso,
      parserVersion: "KL-0-contract",
      contentHash: "",
      rawEvidenceRef: null,
      revision: 0,
    },
    verificationStatus: KNR_CATALOG_ENTRY_DEFAULT_VERIFICATION,
    validationState: "INCOMPLETE",
    lifecycleState: "ACTIVE",
    contentHash: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
