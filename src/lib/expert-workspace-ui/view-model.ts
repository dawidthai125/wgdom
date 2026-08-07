/**
 * WIRE-EXPERTS-UI-01 — buildExpertWorkspaceViewModel (thin presentational).
 * IN: ChiefDecydentDossier.experts · ZERO analyze* · ZERO domain calc.
 */

import type { ChiefDecydentDossier } from "@/lib/chief-orchestrator";
import type { ChiefDossierUiPhase } from "@/lib/chief-dossier-ui";
import type { CostExpertAnalysisResult } from "@/lib/cost-expert";
import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import type { MaterialExpertAnalysisResult } from "@/lib/material-expert";
import type { OfferExpertAnalysisResult } from "@/lib/offer-expert";
import type { PricingExpertAnalysisResult } from "@/lib/pricing-expert";
import {
  EMPTY_EXPERT_RESULT_PL,
  EXPERT_WORKSPACE_SUBTITLE_PL,
  EXPERT_WORKSPACE_TITLE_PL,
  OFFER_DECISION_NOTE_PL,
  TRACE_CAPTION_PL,
  strOrDash,
} from "./labels";
import type {
  CostDetailsView,
  ExecutionDetailsView,
  ExpertGapRow,
  ExpertKvRow,
  ExpertWorkspaceUiPhase,
  ExpertWorkspaceViewModel,
  MaterialsDetailsView,
  OfferDetailsView,
  PricingDetailsView,
} from "./types";

const HIDDEN_DOSSIER_PHASES = new Set<ChiefDossierUiPhase>([
  "running",
  "checking",
  "no_case",
  "not_ready",
  "cancelled",
  "error",
]);

const READY_DOSSIER_PHASES = new Set<ChiefDossierUiPhase>([
  "ready",
  "blocked",
  "finished_other",
]);

export interface BuildExpertWorkspaceViewModelInput {
  dossier: ChiefDecydentDossier | null;
  dossierUiPhase?: ChiefDossierUiPhase | null;
}

function resolveUiPhase(
  dossier: ChiefDecydentDossier | null,
  dossierUiPhase: ChiefDossierUiPhase | null | undefined,
): ExpertWorkspaceUiPhase {
  if (!dossier) return "hidden";
  if (dossierUiPhase != null && HIDDEN_DOSSIER_PHASES.has(dossierUiPhase)) {
    return "hidden";
  }
  if (dossierUiPhase != null && READY_DOSSIER_PHASES.has(dossierUiPhase)) {
    return "ready";
  }
  // dossier present, phase unknown → show (Session ON + dossier)
  if (dossierUiPhase == null) return "ready";
  return "hidden";
}

function relatedPl(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

function mapExecution(
  snap: ExecutionExpertAnalysisResult | null | undefined,
): ExecutionDetailsView {
  if (!snap) {
    return {
      hasResult: false,
      emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
      traceCaptionPl: TRACE_CAPTION_PL,
      selection: null,
      technologyDecision: null,
      plan: null,
      bundle: null,
      bom: null,
      gaps: [],
      packRef: null,
    };
  }

  const sel = snap.selection;
  const plan = snap.plan;
  const bundle = snap.bundle;
  const bom = snap.bom;
  const pack = snap.pack;

  return {
    hasResult: true,
    emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
    traceCaptionPl: TRACE_CAPTION_PL,
    selection: sel
      ? {
          packId: String(sel.packId ?? ""),
          packVersion: String(sel.packVersion ?? ""),
          namePl: String(sel.namePl ?? ""),
          score: Number(sel.score),
          matchReasonsPl: [...(sel.matchReasonsPl ?? [])].map(String),
          matchedLineIds: [...(sel.matchedLineIds ?? [])].map(String),
        }
      : null,
    technologyDecision:
      snap.technologyDecision != null ? String(snap.technologyDecision) : null,
    plan: plan
      ? {
          planId: String(plan.planId ?? ""),
          planRevision: String(plan.planRevision ?? ""),
          packId: String(plan.packId ?? ""),
          packVersion: String(plan.packVersion ?? ""),
          stages: (plan.stages ?? []).map((st) => ({
            order: Number(st.order),
            namePl: String(st.namePl ?? ""),
            steps: (st.steps ?? []).map((s) => ({
              order: Number(s.order),
              namePl: String(s.namePl ?? ""),
              catalogWorkId: String(s.catalogWorkId ?? ""),
              quantity: Number(s.quantity),
            })),
          })),
        }
      : null,
    bundle: bundle
      ? {
          bundleId: String(bundle.bundleId ?? ""),
          namePl: String(bundle.namePl ?? ""),
          packId: String(bundle.packId ?? ""),
          packVersion: String(bundle.packVersion ?? ""),
          planRevision: String(bundle.planRevision ?? ""),
          steps: (bundle.steps ?? []).map((s) => ({
            order: Number(s.order),
            workId: String(s.workId ?? ""),
            quantityDefault:
              s.quantityDefault == null ? null : Number(s.quantityDefault),
            notePl: String(s.notePl ?? ""),
            stepId: String(s.stepId ?? ""),
          })),
        }
      : null,
    bom: bom
      ? {
          bomId: String(bom.bomId ?? ""),
          packId: String(bom.packId ?? ""),
          packVersion: String(bom.packVersion ?? ""),
          planRevision: String(bom.planRevision ?? ""),
          materials: (bom.materials ?? []).map((m) => ({
            materialKey: String(m.materialKey ?? ""),
            namePl: String(m.namePl ?? ""),
            unit: String(m.unit ?? ""),
            quantity: Number(m.quantity),
          })),
          equipment: (bom.equipment ?? []).map((e) => ({
            equipmentKey: String(e.equipmentKey ?? ""),
            namePl: String(e.namePl ?? ""),
            unit: String(e.unit ?? ""),
            quantity: Number(e.quantity),
          })),
          labour: (bom.labour ?? []).map((l) => ({
            labourKey: String(l.labourKey ?? ""),
            namePl: String(l.namePl ?? ""),
            hours: Number(l.hours),
          })),
        }
      : null,
    gaps: (snap.gapsAndRisks ?? []).map(
      (g): ExpertGapRow => ({
        kind: String(g.kind ?? ""),
        code: String(g.code ?? ""),
        messagePl: String(g.messagePl ?? ""),
        relatedPl: relatedPl([
          g.relatedStepId,
          g.relatedLineId,
          g.relatedCatalogWorkId,
        ]),
      }),
    ),
    packRef: pack
      ? {
          packId: String(pack.packId ?? ""),
          packVersion: String(pack.packVersion ?? ""),
          namePl: String(pack.namePl ?? ""),
        }
      : null,
  };
}

function mapMaterials(
  snap: MaterialExpertAnalysisResult | null | undefined,
): MaterialsDetailsView {
  if (!snap) {
    return {
      hasResult: false,
      emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
      completeness: null,
      completenessNotePl: "",
      packMaterialCoverage: null,
      lines: [],
      variants: [],
      gaps: [],
    };
  }
  const cov = snap.packMaterialCoverage;
  return {
    hasResult: true,
    emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
    completeness: snap.completeness != null ? String(snap.completeness) : null,
    completenessNotePl: String(snap.completenessNotePl ?? ""),
    packMaterialCoverage: cov
      ? {
          required: Number(cov.required),
          present: Number(cov.present),
          conforming: Number(cov.conforming),
        }
      : null,
    lines: (snap.lines ?? []).map((l) => ({
      materialKey: String(l.materialKey ?? ""),
      namePl: String(l.namePl ?? ""),
      unit: String(l.unit ?? ""),
      quantity: Number(l.quantity),
      conformity: String(l.conformity ?? ""),
      notePl: String(l.notePl ?? ""),
    })),
    variants: (snap.variants ?? []).map((v) => ({
      baseMaterialKey: String(v.baseMaterialKey ?? ""),
      baseNamePl: String(v.baseNamePl ?? ""),
      options: (v.options ?? []).map((o) => ({
        kind: String(o.kind ?? ""),
        materialKey: String(o.materialKey ?? ""),
        namePl: String(o.namePl ?? ""),
        rationalePl: String(o.rationalePl ?? ""),
      })),
    })),
    gaps: (snap.gapsAndRisks ?? []).map(
      (g): ExpertGapRow => ({
        kind: String(g.kind ?? ""),
        code: String(g.code ?? ""),
        messagePl: String(g.messagePl ?? ""),
        relatedPl: relatedPl([g.materialKey]),
      }),
    ),
  };
}

function mapPricing(
  snap: PricingExpertAnalysisResult | null | undefined,
): PricingDetailsView {
  if (!snap) {
    return {
      hasResult: false,
      emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
      requiresReanalysis: false,
      returnToMaterialExpert: false,
      returnReasonsPl: [],
      reanalysisMaterialKeys: [],
      lines: [],
    };
  }
  return {
    hasResult: true,
    emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
    requiresReanalysis: Boolean(snap.requiresReanalysis),
    returnToMaterialExpert: Boolean(snap.returnToMaterialExpert),
    returnReasonsPl: [...(snap.returnReasonsPl ?? [])].map(String),
    reanalysisMaterialKeys: [...(snap.reanalysisMaterialKeys ?? [])].map(String),
    lines: (snap.lines ?? []).map((l) => ({
      materialKey: String(l.materialKey ?? ""),
      namePl: String(l.namePl ?? ""),
      quantity: Number(l.quantity),
      unit: String(l.unit ?? ""),
      mappedWorkId: strOrDash(l.mappedWorkId),
      mapLabelPl: strOrDash(l.mapLabelPl),
      marketPricePln: l.marketPricePln == null ? null : Number(l.marketPricePln),
      freshness: String(l.freshness ?? ""),
      trend: String(l.trend ?? ""),
      trendDeltaPct: l.trendDeltaPct == null ? null : Number(l.trendDeltaPct),
      spreadPct: l.spreadPct == null ? null : Number(l.spreadPct),
      priceRisk: String(l.priceRisk ?? ""),
      riskNotesPl: [...(l.riskNotesPl ?? [])].map(String),
      returnReasonPl: String(l.returnReasonPl ?? ""),
      sources: (l.sources ?? []).map((s) => ({
        origin: String(s.origin ?? ""),
        pricePln: Number(s.pricePln),
        regionCode: String(s.regionCode ?? ""),
      })),
    })),
  };
}

function numRow(labelPl: string, n: number | null | undefined): ExpertKvRow {
  return {
    labelPl,
    valuePl: n == null || !Number.isFinite(Number(n)) ? "—" : String(n),
  };
}

function mapCost(snap: CostExpertAnalysisResult | null | undefined): CostDetailsView {
  if (!snap) {
    return {
      hasResult: false,
      emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
      completenessOk: false,
      handoffToOfferExpert: false,
      handoffBlockersPl: [],
      breakdown: [],
      comparative: [],
      comparativeNotesPl: [],
      materialLines: [],
      labourLines: [],
      equipmentLines: [],
      handoffPayloadRows: [],
    };
  }
  const b = snap.breakdown;
  const c = snap.comparative;
  const hp = snap.offerHandoffPayload;
  return {
    hasResult: true,
    emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
    completenessOk: Boolean(snap.completenessOk),
    handoffToOfferExpert: Boolean(snap.handoffToOfferExpert),
    handoffBlockersPl: [...(snap.handoffBlockersPl ?? [])].map(String),
    breakdown: [
      numRow("Materiały (purchase)", b?.materialsPurchasePln),
      numRow("Robocizna", b?.labourPln),
      numRow("Sprzęt", b?.equipmentPln),
      numRow("Bezpośrednie", b?.directPln),
      numRow("Pomocnicze", b?.auxiliaryPln),
      numRow("Narzut wewnętrzny", b?.internalOverheadPln),
      numRow("Real Cost", b?.realCostPln),
    ],
    comparative: [
      numRow("Market materials", c?.marketMaterialsPln),
      numRow("Purchase materials", c?.purchaseMaterialsPln),
      numRow("Real Cost", c?.realCostPln),
      numRow("Purchase vs Market %", c?.purchaseVsMarketPct),
      numRow("Real vs Purchase materials %", c?.realVsPurchaseMaterialsPct),
      numRow("Real vs Market materials %", c?.realVsMarketMaterialsPct),
    ],
    comparativeNotesPl: [...(c?.notesPl ?? [])].map(String),
    materialLines: (snap.materialLines ?? []).map((l) => ({
      materialKey: String(l.materialKey ?? ""),
      namePl: String(l.namePl ?? ""),
      quantity: Number(l.quantity),
      unit: String(l.unit ?? ""),
      purchaseUnitPln: l.purchaseUnitPln == null ? null : Number(l.purchaseUnitPln),
      purchaseTotalPln:
        l.purchaseTotalPln == null ? null : Number(l.purchaseTotalPln),
      marketUnitPln: l.marketUnitPln == null ? null : Number(l.marketUnitPln),
      marketTotalPln: l.marketTotalPln == null ? null : Number(l.marketTotalPln),
    })),
    labourLines: (snap.labourLines ?? []).map((l) => ({
      labourKey: String(l.labourKey ?? ""),
      namePl: String(l.namePl ?? ""),
      hours: Number(l.hours),
      ratePlnPerHour: l.ratePlnPerHour == null ? null : Number(l.ratePlnPerHour),
      totalPln: l.totalPln == null ? null : Number(l.totalPln),
    })),
    equipmentLines: (snap.equipmentLines ?? []).map((l) => ({
      equipmentKey: String(l.equipmentKey ?? ""),
      namePl: String(l.namePl ?? ""),
      quantity: Number(l.quantity),
      unit: String(l.unit ?? ""),
      rateUnitPln: l.rateUnitPln == null ? null : Number(l.rateUnitPln),
      totalPln: l.totalPln == null ? null : Number(l.totalPln),
    })),
    handoffPayloadRows: hp
      ? [
          numRow("Handoff Real Cost", hp.realCostPln),
          {
            labelPl: "Handoff pewność",
            valuePl: strOrDash(hp.pewnosc),
          },
          {
            labelPl: "Handoff summary",
            valuePl: strOrDash(hp.contractSummaryPl),
          },
        ]
      : [],
  };
}

function mapOffer(snap: OfferExpertAnalysisResult | null | undefined): OfferDetailsView {
  if (!snap) {
    return {
      hasResult: false,
      emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
      decisionNotePl: OFFER_DECISION_NOTE_PL,
      primary: null,
      scenarios: [],
      signalToDecisionMaker: false,
      decisionMakerRows: [],
    };
  }
  const p = snap.primaryRecommendation;
  const dm = snap.decisionMakerPayload;
  return {
    hasResult: true,
    emptyLabelPl: EMPTY_EXPERT_RESULT_PL,
    decisionNotePl: OFFER_DECISION_NOTE_PL,
    primary: p
      ? {
          strategy: String(p.strategy ?? ""),
          offerPricePln: Number(p.offerPricePln),
          summaryPl: String(p.summaryPl ?? ""),
          realCostPln: Number(p.breakdown?.realCostPln),
          marginPct: Number(p.breakdown?.marginPct),
          marginPln: Number(p.breakdown?.marginPln),
          riskPct: Number(p.breakdown?.riskPct),
          riskPln: Number(p.breakdown?.riskPln),
        }
      : null,
    scenarios: (snap.scenarios ?? []).map((s) => ({
      strategy: String(s.strategy ?? ""),
      labelPl: String(s.labelPl ?? ""),
      offerPricePln: Number(s.breakdown?.offerPricePln),
      realCostPln: Number(s.breakdown?.realCostPln),
      marginPct: Number(s.breakdown?.marginPct),
      marginPln: Number(s.breakdown?.marginPln),
      riskPct: Number(s.breakdown?.riskPct),
      riskPln: Number(s.breakdown?.riskPln),
    })),
    signalToDecisionMaker: Boolean(snap.signalToDecisionMaker),
    decisionMakerRows: dm
      ? [
          numRow("Cena oferty", dm.offerPricePln),
          numRow("Real Cost", dm.realCostPln),
          {
            labelPl: "Pewność",
            valuePl: strOrDash(dm.pewnosc),
          },
          {
            labelPl: "Summary",
            valuePl: strOrDash(dm.primarySummaryPl),
          },
          {
            labelPl: "Contract Co",
            valuePl: strOrDash(dm.contractCo),
          },
        ]
      : [],
  };
}

/**
 * Thin presentational mapper. Does not call analyze* or recompute domain values.
 */
export function buildExpertWorkspaceViewModel(
  input: BuildExpertWorkspaceViewModelInput,
): ExpertWorkspaceViewModel {
  const { dossier, dossierUiPhase = null } = input;
  const uiPhase = resolveUiPhase(dossier, dossierUiPhase);
  const experts = dossier?.experts;

  return {
    uiPhase,
    titlePl: EXPERT_WORKSPACE_TITLE_PL,
    subtitlePl: EXPERT_WORKSPACE_SUBTITLE_PL,
    execution: mapExecution(experts?.execution),
    materials: mapMaterials(experts?.materials),
    pricing: mapPricing(experts?.pricing),
    cost: mapCost(experts?.cost),
    offer: mapOffer(experts?.offer),
  };
}
