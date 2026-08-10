/**
 * NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01 — Phase B0 types.
 * COND-TF-1…10 · C-ID · C-EX · C-DET · PLAN-R1…R8
 * Pack NEVER contains prices (TF-1).
 */

export const TECHNOLOGY_FOUNDATION_SCHEMA_VERSION = 1 as const;

/**
 * Pack lifecycle — TECHNOLOGY-RECIPE-CONSUMPTION-01A.
 * Production BOM: ACTIVE only (with recipe provenance gate).
 * Trusted path: DRAFT → REVIEW → APPROVED → ACTIVE.
 * Legacy fixtures may promote DRAFT → ACTIVE only when all factors are fixture_legacy.
 */
export type TechnologyPackLifecycle =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "ACTIVE"
  | "DEPRECATED"
  | "ARCHIVED";

/** Provenance of qtyFactor / hoursPerUnit — 01A. */
export type FactorSourceKind = "fixture_legacy" | "owner_approved" | "norm_ref";

/** v1: waste baked into factor — no separate % engine. */
export type WastePolicy = "included_in_factor" | "none";

export type ExplainLayer = "structural" | "business" | "decision";

export interface ExplainIssue {
  code: string;
  message: string;
  layer: ExplainLayer;
}

/** C-ID: stable capability identity. */
export interface TechnologyCapability {
  capabilityId: string;
  namePl: string;
  descriptionPl?: string;
}

export interface TechnologyDefinition {
  definitionId: string;
  capabilityId: string;
  namePl: string;
  descriptionPl?: string;
}

export interface PackDependencyRule {
  predecessorStepId: string;
  successorStepId: string;
}

/** Shared provenance for recipe factors (TECHNOLOGY-RECIPE-CONSUMPTION-01A). */
export interface RecipeFactorProvenance {
  /**
   * fixture_legacy = grandfathered B0 factors (not newly certified).
   * owner_approved | norm_ref = trusted — require factorSourceRef + factorApprovedAt.
   */
  factorSourceKind?: FactorSourceKind;
  /** Document / catalog / Owner sheet ref — required for owner_approved | norm_ref. */
  factorSourceRef?: string;
  /** ISO timestamp of Owner approval — required for owner_approved | norm_ref. */
  factorApprovedAt?: string;
  /** v1 default intent: waste included inside qtyFactor. */
  wastePolicy?: WastePolicy;
}

export interface PackMaterialRecipeLine extends RecipeFactorProvenance {
  materialKey: string;
  namePl: string;
  unit: string;
  /** Quantity factor relative to BOQ qty (e.g. m2 of wall). */
  qtyFactor: number;
  /**
   * TECHNOLOGY-RECIPE-CONSUMPTION-01B — paint coats selector.
   * When set, projection keeps only lines matching resolved coats.
   * Legacy lines omit this field (always applicable).
   */
  coats?: 1 | 2;
}

export interface PackEquipmentRecipeLine extends RecipeFactorProvenance {
  equipmentKey: string;
  namePl: string;
  unit: string;
  qtyFactor: number;
}

/** Labour norms only — NEVER PLN rates (TF-1). */
export interface PackLabourRecipeLine extends RecipeFactorProvenance {
  labourKey: string;
  namePl: string;
  /** Hours per BOQ unit. */
  hoursPerUnit: number;
}

export interface PackRegulatoryRef {
  regulatoryId: string;
  namePl: string;
  required: boolean;
}

export interface PackStepTemplate {
  stepId: string;
  stageId: string;
  order: number;
  namePl: string;
  /** Target CatalogWork id (string reference only — no catalog load in B0). */
  catalogWorkId: string;
  quantityFromBoq?: boolean;
}

export interface PackStageTemplate {
  stageId: string;
  order: number;
  namePl: string;
}

/**
 * Technology Pack — versioned immutable recipe.
 * MUST NOT contain unitPrice / companyPrice / quote / bid / pricePln / PLN.
 */
export interface TechnologyPack {
  packId: string;
  packVersion: string;
  definitionId: string;
  /** PLAN-R1 — secondary capability tags (⊆ registry). */
  packCapabilities: string[];
  lifecycle: TechnologyPackLifecycle;
  namePl: string;
  stages: PackStageTemplate[];
  steps: PackStepTemplate[];
  dependencies: PackDependencyRule[];
  materials: PackMaterialRecipeLine[];
  equipment: PackEquipmentRecipeLine[];
  labour: PackLabourRecipeLine[];
  regulatory: PackRegulatoryRef[];
}

export interface BoqContextLine {
  lineKey: string;
  catalogWorkIdHint?: string;
  quantity: number;
  unit?: string;
}

export interface BoqContext {
  /** Canonical context key inputs (sorted by lineKey in builders). */
  lines: BoqContextLine[];
}

export interface ExecutionPlanStep {
  stepId: string;
  stageId: string;
  order: number;
  namePl: string;
  catalogWorkId: string;
  quantity: number;
}

export interface ExecutionPlanStage {
  stageId: string;
  order: number;
  namePl: string;
  steps: ExecutionPlanStep[];
}

/** Derived only (TF-10). planRevision = f(packId, packVersion, canonicalBoqContext). */
export interface ExecutionPlan {
  planId: string;
  planRevision: string;
  packId: string;
  packVersion: string;
  stages: ExecutionPlanStage[];
}

/** Projection compatible with WorkBundle step shape (order, workId, quantityDefault). */
export interface GeneratedWorkBundleStep {
  order: number;
  workId: string;
  quantityDefault?: number;
  notePl?: string;
  stepId: string;
  stageId: string;
}

export interface GeneratedWorkBundle {
  bundleId: string;
  namePl: string;
  packId: string;
  packVersion: string;
  planRevision: string;
  steps: GeneratedWorkBundleStep[];
}

export interface GeneratedBomMaterialLine {
  bomLineId: string;
  materialKey: string;
  namePl: string;
  unit: string;
  quantity: number;
}

export interface GeneratedBomEquipmentLine {
  bomLineId: string;
  equipmentKey: string;
  namePl: string;
  unit: string;
  quantity: number;
}

export interface GeneratedBomLabourLine {
  bomLineId: string;
  labourKey: string;
  namePl: string;
  /** Hours total — never PLN. */
  hours: number;
}

export interface GeneratedBom {
  bomId: string;
  packId: string;
  packVersion: string;
  planRevision: string;
  materials: GeneratedBomMaterialLine[];
  equipment: GeneratedBomEquipmentLine[];
  labour: GeneratedBomLabourLine[];
}

export interface ValidationResult {
  warnings: ExplainIssue[];
  blockingIssues: ExplainIssue[];
}

export type TechnologyDecisionKind = "allow" | "degrade" | "deny";

export interface TechnologyDecisionResult {
  decision: TechnologyDecisionKind;
  reasons: ExplainIssue[];
  structural: ValidationResult;
  business: ValidationResult;
}

/** Business validation fixture input (no Cloud/Payroll). */
export interface BusinessProfileFixture {
  companyCapabilityIds: string[];
  availableEquipmentKeys: string[];
  orgConstraintCodes?: string[];
}
