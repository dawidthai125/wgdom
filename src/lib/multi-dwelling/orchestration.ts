/**
 * MULTI-DWELLING-01 — orchestrate per-dwelling F5 + package aggregate.
 * REUSE shadow / evaluateBidCutoverGate / computeTenderBidProposal.
 * ZERO second Bid calculator.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import {
  computeTenderBidProposal,
  type TenderBidOfferBoqDirectInput,
  type TenderBidProposal,
} from "@/lib/tenders-bid-calculator";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  buildOfferBoqDirectFromPositionCost,
  computePositionCostShadowAndGate,
  type BidCutoverGateResult,
} from "@/lib/tender-position-cost/bid-position-cost-cutover";
import type { ShadowBoqPositionCostResult } from "@/lib/tender-position-cost/boq-shadow-adapter";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";
import { evaluatePackageGate } from "@/lib/multi-dwelling/package-gate";
import type {
  DwellingCostUnit,
  DwellingSubtotals,
  PackageGateResult,
  TenderPackage,
} from "@/lib/multi-dwelling/types";

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyDwellingSubtotals(): DwellingSubtotals {
  return {
    laborPln: 0,
    materialPln: 0,
    equipmentPln: 0,
    transportPln: 0,
    auxiliaryPln: 0,
    directPln: 0,
    equipmentGapCount: 0,
    transportGapCount: 0,
  };
}

export function subtotalsFromShadowAndGate(
  shadow: ShadowBoqPositionCostResult,
  gate: BidCutoverGateResult,
): DwellingSubtotals {
  const laborPln = roundPln(shadow.aggregates.laborCostPln ?? 0);
  const materialPln = roundPln(shadow.aggregates.materialCostPln ?? 0);
  const equipmentPln = roundPln(shadow.aggregates.equipmentCostPln ?? 0);
  const transportPln = roundPln(shadow.aggregates.transportCostPln ?? 0);
  const auxiliaryPln = 0;
  return {
    laborPln,
    materialPln,
    equipmentPln,
    transportPln,
    auxiliaryPln,
    directPln: roundPln(laborPln + materialPln + equipmentPln + transportPln + auxiliaryPln),
    equipmentGapCount: gate.equipmentGapCount,
    transportGapCount: gate.transportGapCount,
  };
}

export type EvaluateDwellingOpts = {
  tenderId: string;
  dwellingId: string;
  offerBoq: OfferBoqDocument;
  store: WorkCatalogStore;
  nowMs: number;
  ensureOwnerQuestions?: boolean;
  paintCoats?: 1 | 2 | null;
  /** IK P0-3 — per-dwelling S3 graph for S4-B resolver. */
  boqDependencyGraph?: import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph | null;
};

/**
 * Per dwelling: OfferBoq → shadow → OI Equip/Transport → F5_D.
 */
export function evaluateDwellingPositionCost(opts: EvaluateDwellingOpts): {
  dwellingId: string;
  shadow: ShadowBoqPositionCostResult;
  f5Gate: BidCutoverGateResult;
  subtotals: DwellingSubtotals;
} {
  const dwellingId = normalizeDwellingId(opts.dwellingId);
  const { shadow, gate } = computePositionCostShadowAndGate({
    doc: opts.offerBoq,
    store: opts.store,
    nowMs: opts.nowMs,
    paintCoats: opts.paintCoats,
    tenderId: opts.tenderId,
    dwellingId,
    ensureOwnerQuestions: opts.ensureOwnerQuestions,
    boqDependencyGraph: opts.boqDependencyGraph ?? null,
  });
  return {
    dwellingId,
    shadow,
    f5Gate: gate,
    subtotals: subtotalsFromShadowAndGate(shadow, gate),
  };
}

/**
 * Refresh f5Gate + subtotals on each unit that has offerBoq.
 */
export function evaluateAllDwellingsInPackage(
  pkg: TenderPackage,
  opts: {
    store: WorkCatalogStore;
    nowMs: number;
    ensureOwnerQuestions?: boolean;
    /** IK P0-3 — per-dwelling graphs (key = normalizeDwellingId). */
    boqDependencyGraphsByDwelling?: Record<
      string,
      import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph
    > | null;
    /** Fallback when only a single primary graph is available. */
    boqDependencyGraph?: import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph | null;
  },
): TenderPackage {
  const dwellings: DwellingCostUnit[] = pkg.dwellings.map((d) => {
    if (!d.offerBoq || !(d.offerBoq.lines?.length > 0)) {
      return {
        ...d,
        f5Gate: null,
        subtotals: null,
      };
    }
    const dwKey = normalizeDwellingId(d.dwellingId);
    // S6-B: when a per-dwelling map is present, never steal primary graph on miss.
    const maps = opts.boqDependencyGraphsByDwelling;
    const graph =
      maps?.[dwKey]
      ?? (maps != null ? null : opts.boqDependencyGraph)
      ?? null;
    const ev = evaluateDwellingPositionCost({
      tenderId: pkg.tenderId,
      dwellingId: d.dwellingId,
      offerBoq: d.offerBoq,
      store: opts.store,
      nowMs: opts.nowMs,
      ensureOwnerQuestions: opts.ensureOwnerQuestions,
      boqDependencyGraph: graph,
    });
    return {
      ...d,
      f5Gate: ev.f5Gate,
      subtotals: ev.subtotals,
    };
  });
  return { ...pkg, dwellings };
}

export function aggregatePackageDirect(
  pkg: TenderPackage,
): TenderBidOfferBoqDirectInput | null {
  let laborPln = 0;
  let materialsPln = 0;
  let equipmentPln = 0;
  let transportPln = 0;
  let auxiliaryPln = 0;
  let componentCount = 0;
  let pricedComponentCount = 0;
  let any = false;

  for (const d of pkg.dwellings) {
    if (!d.subtotals || !d.f5Gate?.pass) continue;
    any = true;
    laborPln += d.subtotals.laborPln;
    materialsPln += d.subtotals.materialPln;
    equipmentPln += d.subtotals.equipmentPln;
    transportPln += d.subtotals.transportPln;
    auxiliaryPln += d.subtotals.auxiliaryPln;
    componentCount += d.f5Gate.billableLineCount;
    pricedComponentCount += d.f5Gate.completeLineCount;
  }

  const directPln = roundPln(
    laborPln + materialsPln + equipmentPln + transportPln + auxiliaryPln,
  );
  if (!any || !(directPln > 0)) return null;

  return {
    directPln,
    materialsPln: roundPln(materialsPln),
    laborPln: roundPln(laborPln),
    equipmentPln: roundPln(equipmentPln),
    transportPln: roundPln(transportPln),
    auxiliaryPln: roundPln(auxiliaryPln),
    componentCount,
    pricedComponentCount,
    averageConfidence: "high",
    companyKnowledgeHitCount: 0,
    sourceLabelPl:
      "MULTI-DWELLING-01 — SUM(DwellingDirect) → Position Cost package aggregate",
  };
}

export type PackageEvaluationResult = {
  package: TenderPackage;
  packageGate: PackageGateResult;
  packageDirect: TenderBidOfferBoqDirectInput | null;
  packageEquipmentPln: number;
  packageTransportPln: number;
  packageEquipmentGapCount: number;
  packageTransportGapCount: number;
};

export function evaluateTenderPackage(
  pkg: TenderPackage,
  opts: {
    store: WorkCatalogStore;
    nowMs: number;
    ensureOwnerQuestions?: boolean;
    boqDependencyGraphsByDwelling?: Record<
      string,
      import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph
    > | null;
    boqDependencyGraph?: import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph | null;
  },
): PackageEvaluationResult {
  const evaluated = evaluateAllDwellingsInPackage(pkg, opts);
  const packageGate = evaluatePackageGate(evaluated);
  let packageEquipmentPln = 0;
  let packageTransportPln = 0;
  let packageEquipmentGapCount = 0;
  let packageTransportGapCount = 0;
  for (const d of evaluated.dwellings) {
    if (d.subtotals) {
      packageEquipmentPln += d.subtotals.equipmentPln;
      packageTransportPln += d.subtotals.transportPln;
      packageEquipmentGapCount += d.subtotals.equipmentGapCount;
      packageTransportGapCount += d.subtotals.transportGapCount;
    } else if (d.f5Gate) {
      packageEquipmentGapCount += d.f5Gate.equipmentGapCount;
      packageTransportGapCount += d.f5Gate.transportGapCount;
    }
  }
  const packageDirect = packageGate.pass
    ? aggregatePackageDirect(evaluated)
    : null;

  return {
    package: evaluated,
    packageGate,
    packageDirect,
    packageEquipmentPln: roundPln(packageEquipmentPln),
    packageTransportPln: roundPln(packageTransportPln),
    packageEquipmentGapCount,
    packageTransportGapCount,
  };
}

/**
 * Final Bid only when PackageGate PASS — REUSE computeTenderBidProposal.
 */
export function computePackageBidProposal(opts: {
  pkg: TenderPackage;
  store: WorkCatalogStore;
  nowMs: number;
  kosztorys: TenderKosztorysSnapshot | null | undefined;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  costModel: TenderCompanyCostModel;
  minProjectDays?: number;
  maxConcurrentProjects?: number;
  builtAt?: string;
  ensureOwnerQuestions?: boolean;
  boqDependencyGraphsByDwelling?: Record<
    string,
    import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph
  > | null;
  boqDependencyGraph?: import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph | null;
}): {
  evaluation: PackageEvaluationResult;
  proposal: TenderBidProposal;
} {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const evaluation = evaluateTenderPackage(opts.pkg, {
    store: opts.store,
    nowMs: opts.nowMs,
    ensureOwnerQuestions: opts.ensureOwnerQuestions,
    boqDependencyGraphsByDwelling: opts.boqDependencyGraphsByDwelling,
    boqDependencyGraph: opts.boqDependencyGraph,
  });

  if (!evaluation.packageGate.pass || !evaluation.packageDirect) {
    return {
      evaluation,
      proposal: {
        ok: false,
        pricingMode: "offer_boq_ai",
        recommendedBidPln: null,
        floorBidPln: null,
        aggressiveBidPln: null,
        safeBidPln: null,
        costPricePln: null,
        costStack: [],
        assumptions: [],
        warnings: [
          "MULTI-DWELLING PACKAGE GATE FAIL — Final Bid BLOCKED.",
          ...evaluation.packageGate.reasonsPl,
        ],
        computedAt: builtAt,
        sourceLabelPl: "MULTI-DWELLING-01 — PACKAGE GATE FAIL",
      },
    };
  }

  const proposal = computeTenderBidProposal({
    kosztorys: opts.kosztorys,
    swz: opts.swz,
    fit: opts.fit,
    costModel: opts.costModel,
    minProjectDays: opts.minProjectDays ?? 14,
    maxConcurrentProjects: opts.maxConcurrentProjects ?? 2,
    offerBoqDirect: evaluation.packageDirect,
  });

  return { evaluation, proposal };
}

/** Hint only — never creates SSOT dwellings. */
export function hintDwellingCountFromDocumentIds(documentIds: string[]): number {
  const unique = new Set(
    (documentIds ?? []).map((id) => String(id ?? "").trim()).filter(Boolean),
  );
  return unique.size;
}

/** Expose single-dwelling direct build for parity tests (REUSE cutover helper). */
export function buildDwellingDirectFromShadow(
  shadow: ShadowBoqPositionCostResult,
  gate: BidCutoverGateResult,
): TenderBidOfferBoqDirectInput | null {
  return buildOfferBoqDirectFromPositionCost(shadow, gate);
}
