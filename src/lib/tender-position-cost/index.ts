/**
 * TENDER-BOQ-PRICING-REBUILD-01 — Position Cost public API.
 * F0: pure engine · F1: OUR RATE labor adapter · F2: materialKey → Price Memory → SELL.
 */

export type {
  PositionCostInput,
  PositionCostIssue,
  PositionCostIssueCode,
  PositionCostResult,
  PositionLaborInput,
  PositionLaborStatus,
  PositionMaterialInput,
  PositionMaterialStatus,
} from "@/lib/tender-position-cost/types";

export { computePositionCost } from "@/lib/tender-position-cost/engine";

export type {
  ComputePositionCostWithOurRateInput,
  ComputePositionCostWithOurRateResult,
  OurRateLaborResolve,
  OurRateLaborResolveStatus,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";

export {
  computePositionCostWithOurRate,
  resolveLaborInputFromOurWorkRate,
} from "@/lib/tender-position-cost/our-rate-labor-adapter";

export type {
  ComputePositionCostWithMaterialsInput,
  ComputePositionCostWithMaterialsResult,
  ComputePositionCostWithOurRateAndMaterialsInput,
  ComputePositionCostWithOurRateAndMaterialsResult,
  MaterialComponentSpec,
  MaterialSellResolve,
  MaterialSellResolveStatus,
} from "@/lib/tender-position-cost/material-sell-adapter";

export {
  computePositionCostWithMaterials,
  computePositionCostWithOurRateAndMaterials,
  resolveMaterialInputFromPriceMemory,
  resolveMaterialsInputFromPriceMemory,
} from "@/lib/tender-position-cost/material-sell-adapter";
