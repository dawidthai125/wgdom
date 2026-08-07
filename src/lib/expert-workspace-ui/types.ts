/**
 * WIRE-EXPERTS-UI-01 — presentational ViewModel types.
 * Zero domain DTO · zero Expert/Chief BC.
 */

export type ExpertWorkspaceUiPhase = "hidden" | "ready";

export interface ExpertKvRow {
  labelPl: string;
  valuePl: string;
}

export interface ExpertGapRow {
  kind: string;
  code: string;
  messagePl: string;
  relatedPl: string;
}

export interface ExpertBomMaterialRow {
  materialKey: string;
  namePl: string;
  unit: string;
  quantity: number;
}

export interface ExpertBomEquipmentRow {
  equipmentKey: string;
  namePl: string;
  unit: string;
  quantity: number;
}

export interface ExpertBomLabourRow {
  labourKey: string;
  namePl: string;
  hours: number;
}

export interface ExpertBomView {
  bomId: string;
  packId: string;
  packVersion: string;
  planRevision: string;
  materials: ExpertBomMaterialRow[];
  equipment: ExpertBomEquipmentRow[];
  labour: ExpertBomLabourRow[];
}

export interface ExpertPlanStepRow {
  order: number;
  namePl: string;
  catalogWorkId: string;
  quantity: number;
}

export interface ExpertPlanStageView {
  order: number;
  namePl: string;
  steps: ExpertPlanStepRow[];
}

export interface ExpertPlanView {
  planId: string;
  planRevision: string;
  packId: string;
  packVersion: string;
  stages: ExpertPlanStageView[];
}

export interface ExpertBundleStepRow {
  order: number;
  workId: string;
  quantityDefault: number | null;
  notePl: string;
  stepId: string;
}

export interface ExpertBundleView {
  bundleId: string;
  namePl: string;
  packId: string;
  packVersion: string;
  planRevision: string;
  steps: ExpertBundleStepRow[];
}

export interface ExpertSelectionView {
  packId: string;
  packVersion: string;
  namePl: string;
  score: number;
  matchReasonsPl: string[];
  matchedLineIds: string[];
}

export interface ExecutionDetailsView {
  hasResult: boolean;
  emptyLabelPl: string;
  traceCaptionPl: string;
  selection: ExpertSelectionView | null;
  technologyDecision: string | null;
  plan: ExpertPlanView | null;
  bundle: ExpertBundleView | null;
  bom: ExpertBomView | null;
  gaps: ExpertGapRow[];
  packRef: { packId: string; packVersion: string; namePl: string } | null;
}

export interface MaterialLineRow {
  materialKey: string;
  namePl: string;
  unit: string;
  quantity: number;
  conformity: string;
  notePl: string;
}

export interface MaterialVariantOptionRow {
  kind: string;
  materialKey: string;
  namePl: string;
  rationalePl: string;
}

export interface MaterialVariantSetRow {
  baseMaterialKey: string;
  baseNamePl: string;
  options: MaterialVariantOptionRow[];
}

export interface MaterialsDetailsView {
  hasResult: boolean;
  emptyLabelPl: string;
  completeness: string | null;
  completenessNotePl: string;
  packMaterialCoverage: { required: number; present: number; conforming: number } | null;
  lines: MaterialLineRow[];
  variants: MaterialVariantSetRow[];
  gaps: ExpertGapRow[];
}

export interface PricingSourceRow {
  origin: string;
  pricePln: number;
  regionCode: string;
}

export interface PricingLineRow {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  mappedWorkId: string;
  mapLabelPl: string;
  marketPricePln: number | null;
  freshness: string;
  trend: string;
  trendDeltaPct: number | null;
  spreadPct: number | null;
  priceRisk: string;
  riskNotesPl: string[];
  returnReasonPl: string;
  sources: PricingSourceRow[];
}

export interface PricingDetailsView {
  hasResult: boolean;
  emptyLabelPl: string;
  requiresReanalysis: boolean;
  returnToMaterialExpert: boolean;
  returnReasonsPl: string[];
  reanalysisMaterialKeys: string[];
  lines: PricingLineRow[];
}

export interface CostMaterialLineRow {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  purchaseUnitPln: number | null;
  purchaseTotalPln: number | null;
  marketUnitPln: number | null;
  marketTotalPln: number | null;
}

export interface CostLabourLineRow {
  labourKey: string;
  namePl: string;
  hours: number;
  ratePlnPerHour: number | null;
  totalPln: number | null;
}

export interface CostEquipmentLineRow {
  equipmentKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  rateUnitPln: number | null;
  totalPln: number | null;
}

export interface CostDetailsView {
  hasResult: boolean;
  emptyLabelPl: string;
  completenessOk: boolean;
  handoffToOfferExpert: boolean;
  handoffBlockersPl: string[];
  breakdown: ExpertKvRow[];
  comparative: ExpertKvRow[];
  comparativeNotesPl: string[];
  materialLines: CostMaterialLineRow[];
  labourLines: CostLabourLineRow[];
  equipmentLines: CostEquipmentLineRow[];
  handoffPayloadRows: ExpertKvRow[];
}

export interface OfferScenarioRow {
  strategy: string;
  labelPl: string;
  offerPricePln: number;
  realCostPln: number;
  marginPct: number;
  marginPln: number;
  riskPct: number;
  riskPln: number;
}

export interface OfferDetailsView {
  hasResult: boolean;
  emptyLabelPl: string;
  decisionNotePl: string;
  primary: {
    strategy: string;
    offerPricePln: number;
    summaryPl: string;
    realCostPln: number;
    marginPct: number;
    marginPln: number;
    riskPct: number;
    riskPln: number;
  } | null;
  scenarios: OfferScenarioRow[];
  signalToDecisionMaker: boolean;
  decisionMakerRows: ExpertKvRow[];
}

export interface ExpertWorkspaceViewModel {
  uiPhase: ExpertWorkspaceUiPhase;
  titlePl: string;
  subtitlePl: string;
  execution: ExecutionDetailsView;
  materials: MaterialsDetailsView;
  pricing: PricingDetailsView;
  cost: CostDetailsView;
  offer: OfferDetailsView;
}
