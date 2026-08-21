/**
 * IK-KNR KL-APP-2-ID — Pricing Identity types (ZERO PLN · ZERO Host · ZERO BOQ write).
 *
 * Position labor → Slice D catalogWorkId semantics.
 * Material → OwnerKnrMaterialMappingRow.
 * Equipment → UNSUPPORTED v1.
 * R-lines → evidence-only (never workId).
 */

import type { KnrResourceRequirementLine } from "./knr-norm-application-types";

export const KNR_APP2_ID_POSITION_TABLE_VERSION = 1 as const;
export const KNR_APP2_ID_MATERIAL_TABLE_VERSION = 1 as const;

export type KnrPricingIdentityStatus =
  | "UNMAPPED"
  | "MAPPED"
  | "AMBIGUOUS"
  | "INVALID"
  | "STALE";

export type OwnerKnrMaterialMappingProvenance = {
  approvedBy: string;
  approvedAt: string;
  notesPl: string;
};

export type OwnerKnrMaterialMappingRow = {
  mappingId: string;
  mappingVersion: number;
  knrNormCode: string;
  resourceUnit: string;
  materialKey: string;
  pricingUnit: string;
  ownerApproval: boolean;
  active: boolean;
  provenance: OwnerKnrMaterialMappingProvenance;
};

export type KnrPricingIdentityPositionLabor = {
  status: KnrPricingIdentityStatus;
  catalogWorkId?: string | null;
  mappingId?: string;
  /** Always true — R-lines never become P5 identity. */
  laborNormsEvidenceOnly: true;
};

export type KnrPricingIdentityMaterialLine = {
  normCode: string;
  resourceUnit: string;
  requiredQuantity: number;
  status: KnrPricingIdentityStatus;
  materialKey?: string;
  pricingUnit?: string;
  mappingId?: string;
};

export type KnrPricingIdentityEquipmentLine = {
  normCode: string;
  resourceUnit: string;
  requiredQuantity: number;
  status: "UNSUPPORTED";
};

export type KnrPricingIdentitySummary = {
  canFeedP5: boolean;
  canFeedP6Partial: boolean;
  canFeedF5Equipment: false;
};

export type KnrPricingIdentityProvenance = {
  source: "KL_APP_2_ID";
  appliedAt: string;
  tableVersions: {
    positionTableVersion: typeof KNR_APP2_ID_POSITION_TABLE_VERSION;
    materialTableVersion: typeof KNR_APP2_ID_MATERIAL_TABLE_VERSION;
  };
};

export type KnrPricingIdentityResult = {
  lineId: string;
  knrIdentityKeyV2: string;
  positionLabor: KnrPricingIdentityPositionLabor;
  materials: KnrPricingIdentityMaterialLine[];
  equipment: KnrPricingIdentityEquipmentLine[];
  summary: KnrPricingIdentitySummary;
  provenance: KnrPricingIdentityProvenance;
};

export type KnrPricingIdentityWorkRef = {
  id: string;
  unit: string;
  active: boolean;
};

export type KnrPricingIdentityInput = {
  lineId: string;
  knrIdentityKeyV2: string;
  knrDisplayCode?: string;
  /** Slice D key — catalogBasis.normalizedKey. */
  catalogBasisNormalizedKey?: string | null;
  boqUnit: string;
  labor?: readonly KnrResourceRequirementLine[];
  materials?: readonly KnrResourceRequirementLine[];
  equipment?: readonly KnrResourceRequirementLine[];
  /** Inject Slice D table (default OWNER_KNR_MAPPINGS). */
  positionTable?: readonly import("../ik-knr-owner-mapping").OwnerKnrMappingRow[];
  /** Inject CatalogWork refs for Slice D unit/active checks. */
  works?: readonly KnrPricingIdentityWorkRef[];
  /** Inject material Owner table (default OWNER_KNR_MATERIAL_MAPPINGS). */
  materialTable?: readonly OwnerKnrMaterialMappingRow[];
  nowIso: string;
};
