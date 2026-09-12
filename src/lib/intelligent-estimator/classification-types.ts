/**
 * INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE — types (Design Freeze §D).
 * Pure routing · ZERO pricing / Evidence / Catalog / OUR RATE writes.
 */

export type EstimatorPricingPlane = "LABOR" | "MATERIAL" | "COMPOUND" | "UNKNOWN";

export type EstimatorClassifyReasonCode =
  | "OWNER_SEED"
  | "MATERIAL_KEY"
  | "NO_SAFE_CLASS"
  | "MISSING_IDENTITY"
  /** Autonomous discovery seam resolved plane (trusted sources only). */
  | "DISCOVERY_RESOLVED"
  /** Autonomous discovery ran but remained UNKNOWN (fail-closed). */
  | "DISCOVERY_HELD";

export type EstimatorClassifyInput = {
  workId?: string | null;
  materialKey?: string | null;
  namePl?: string | null;
  unit?: string | null;
  /** Hint only — ignored for plane authority in v1 (A1). */
  lineKindHint?: string | null;
};

export type EstimatorClassifyResult = {
  plane: EstimatorPricingPlane;
  reasonCode: EstimatorClassifyReasonCode;
  reasonPl: string;
  workId: string | null;
  materialKey: string | null;
  namePl: string | null;
  unit: string | null;
  allowLaborCatalogLookup: boolean;
  allowLaborResearch: boolean;
  allowMaterialCatalogLookup: boolean;
  allowMaterialResearch: boolean;
  hold: boolean;
  holdKind: "NONE" | "COMPOUND" | "UNKNOWN";
  classifiedBy:
    | "owner_seed"
    | "material_key"
    | "fallback_unknown"
    | "autonomous_discovery";
  schemaVersion: 1;
};
