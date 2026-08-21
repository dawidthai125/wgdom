/**
 * IK-KNR KL-APP-1 — Norm Application types (ZERO PLN · ZERO Host · ZERO BOQ write).
 *
 * VERIFIED KnrNormBundle + BOQ qty/unit → ResourceRequirements { R, M, S }.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import type { KnrNormComponentKind } from "./types";

export type KnrNormApplicationInput = {
  lineId: string;
  boqQuantity: number;
  boqUnit: string;
  entry: KnrCatalogEntry;
  /** If set — must equal entry.identityKeyV2. */
  identityKeyV2?: string;
  /** If set — must equal entry.contentHash. */
  contentHashExpected?: string;
  nowIso: string;
};

export type KnrNormAppHoldReason =
  | "IDENTITY_MISMATCH"
  | "NOT_VERIFIED"
  | "LIFECYCLE_INACTIVE"
  | "STALE_NORMS"
  | "CONTENT_HASH_MISMATCH"
  | "QUANTITY_INVALID"
  | "UNIT_MISMATCH"
  | "NORMS_INCOMPLETE";

export type KnrNormAppStatus = "APPLIED" | "HOLD" | "REJECT";

export type KnrResourceRequirementLine = {
  kind: KnrNormComponentKind;
  code: string;
  description: string;
  /** = KnrNormLine.unit (resource dimension — not entry.unit). */
  resourceUnit: string;
  /** = KnrNormLine.quantity (per 1 KNR position unit). */
  normQuantity: number;
  /** = Number((boqQuantity * normQuantity).toFixed(6)). */
  requiredQuantity: number;
  sourceNormRef?: string | null;
};

export type KnrNormAppProvenance = {
  source: "KL_APP_1";
  identityKeyV2: string;
  contentHash: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  appliedAt: string;
  unitCompat: "EXACT_FOLD";
  formula: "required = boqQuantity * normQuantity";
  rounding: "toFixed(6)";
  /** Set when laborNorms empty but materials/equipment present. */
  laborNormsEmpty?: boolean;
  /** Set when all norm arrays empty with entry.emptyNormsWithEvidence. */
  emptyNormsWithEvidence?: boolean;
};

export type KnrNormAppDiagnostics = {
  laborNormsEmpty?: boolean;
  emptyNormsWithEvidence?: boolean;
};

export type KnrResourceRequirements = {
  lineId: string;
  identityKeyV2: string;
  displayCode: string;
  knrPositionUnit: string;
  boqQuantity: number;
  boqUnit: string;
  status: KnrNormAppStatus;
  holdReason?: KnrNormAppHoldReason;
  labor: KnrResourceRequirementLine[];
  materials: KnrResourceRequirementLine[];
  equipment: KnrResourceRequirementLine[];
  provenance: KnrNormAppProvenance;
  diagnostics?: KnrNormAppDiagnostics;
};

/** Literal — Norm Application never creates VERIFIED. */
export const KNR_APP1_VERIFICATION_FROM_NORM_APP = false as const;
