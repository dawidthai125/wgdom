/**
 * IK-KNR KL-APP-2 — Pricing / Cost Bridge types.
 *
 * Identity (APP-2-ID) + existing F1/F2/F5 → PositionCost · ZERO invent PLN · ZERO BOQ write.
 */

import type { PositionCostInput, PositionCostResult } from "@/lib/tender-position-cost/types";
import type { OurRateLaborResolve } from "@/lib/tender-position-cost/our-rate-labor-adapter";
import type { MaterialSellResolve } from "@/lib/tender-position-cost/material-sell-adapter";
import type { KnrResourceRequirements } from "./knr-norm-application-types";
import type { KnrPricingIdentityResult } from "./knr-pricing-identity-types";
import type { KnrPricingIdentityInput } from "./knr-pricing-identity-types";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

export type KnrPricingBridgeStatus = "PRICED" | "PARTIAL" | "HOLD" | "REJECT";

export type KnrPricingBridgeHoldReason =
  | "UPSTREAM_NOT_APPLIED"
  | "IDENTITY_MISMATCH"
  | "HOLD_NO_WORK_ID"
  | "HOLD_OUR_RATE"
  | "HOLD_NO_MATERIAL_MAP"
  | "HOLD_UNIT_MISMATCH"
  | "HOLD_MATERIAL_PRICE"
  | "HOLD_EQUIPMENT_UNPRICED"
  | "HOLD_IDENTITY_AMBIGUOUS"
  | "HOLD_IDENTITY_INVALID"
  | "HOLD_IDENTITY_STALE";

export type KnrPricingBridgeProvenance = {
  source: "KL_APP_2";
  knrIdentityKeyV2: string;
  appliedAt: string;
  mapsUsed: {
    positionMappingId?: string | null;
    materialMappingIds: string[];
  };
  pricingPath: {
    labor: "F1_OUR_RATE" | "NONE";
    materials: "F2_PRICE_MEMORY" | "NONE";
    equipment: "HOLD_V1";
    engine: "F5_COMPUTE_POSITION_COST" | "NONE";
  };
  laborNormsEvidenceOnly: true;
};

export type KnrPricingBridgeResult = {
  status: KnrPricingBridgeStatus;
  holdReason?: KnrPricingBridgeHoldReason;
  lineId: string;
  knrIdentityKeyV2: string;
  identity: KnrPricingIdentityResult | null;
  laborResolve: OurRateLaborResolve | null;
  materialResolves: MaterialSellResolve[];
  engineInput: PositionCostInput | null;
  positionCost: PositionCostResult | null;
  provenance: KnrPricingBridgeProvenance;
  /** Explicit: never true from this bridge. */
  verificationFromBridge: false;
};

export type KnrPricingBridgeInput = {
  resourceRequirements: KnrResourceRequirements;
  /** BOQ quantity for F5 labor (zł/unit × qty) — NOT r-g. */
  boqQuantity: number;
  boqUnit: string;
  workCatalogStore: WorkCatalogStore;
  nowMs: number;
  nowIso: string;
  /**
   * Identity resolve input (position/material tables injectable).
   * lineId / knrIdentityKeyV2 / boqUnit should match RR.
   */
  identityInput: Omit<KnrPricingIdentityInput, "labor" | "materials" | "equipment" | "nowIso"> & {
    nowIso?: string;
  };
  /** Optional expected identity integrity. */
  expectedIdentityKeyV2?: string;
};
