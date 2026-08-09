/**
 * WIRE-CHIEF-RO-ADAPTERS-01 — public API.
 * App → Adapter RO → (Session) → Chief. Bez React / UI / Chief.run.
 */

export type {
  BuildChiefCompanyCostRoResult,
  BuildChiefOfferBoqRoResult,
  BuildChiefOfferStrategyParamsRoResult,
  BuildChiefPricingOptionsRoResult,
  ChiefWireAdapterGap,
  ChiefWireAdapterMeta,
  ChiefWireRuntimeRo,
} from "./types";

export { assembleChiefWireRuntimeRo } from "./assemble";
export { buildChiefPricingOptionsRo } from "./catalog";
export { buildChiefCompanyCostRo } from "./company-cost";
export {
  collectMaterialPurchaseAliases,
  projectPurchaseByMaterialKey,
} from "./purchase-by-material-key";
export { buildChiefOfferBoqRo } from "./offer-boq";
export { buildChiefOfferStrategyParamsRo } from "./offer-strategy";
