/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 5 — Bid cutover core (Position Cost → offerBoqDirect).
 *
 * REUSE: F4 shadow · computeTenderBidProposal (Kp/profit/minMargin UNCHANGED)
 * ZERO companyPricePln · ZERO HTTP/research · ZERO invent
 * C-AUX-1 / C-COV-1 / C-STALE-1 (blokada) · C-MODE-1 ath/catalog untouched
 *
 * NIE importuje tender-offer-boq-bid-adapter (brak cyklu) — wire w bid-adapter.
 */

import type { TechnologyPack } from "@/lib/technology-foundation";
import type { BoqDependencyGraph } from "@/lib/intelligent-estimator/boq-dependency-graph";
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
import type { EphemeralResearchBasis } from "@/lib/tender-position-cost/position-cost-basis";
import {
  computeShadowPositionCostsForOfferBoq,
  type ShadowBoqPositionCostResult,
  type ShadowGapCode,
  type ShadowPositionCostLineResult,
} from "@/lib/tender-position-cost/boq-shadow-adapter";

export const BID_POSITION_COST_CUTOVER_SCHEMA_VERSION = 1 as const;

export type BidCutoverGateResult = {
  pass: boolean;
  billableLineCount: number;
  completeLineCount: number;
  gapLineCount: number;
  skippedNoiseCount: number;
  /** EQUIPMENT-01 / GO-1: Equipment lines (≠ Transport/Auxiliary). */
  equipmentGapCount: number;
  /** MODEL-1B: Bid Transport gaps (explicit bid_candidate only). */
  transportGapCount: number;
  /** Transport / other auxiliary — C-AUX-1. */
  auxiliaryGapCount: number;
  reasonsPl: string[];
  gapCodes: ShadowGapCode[];
};

export type PositionCostBidDirectBuild =
  | {
      ok: true;
      directInput: TenderBidOfferBoqDirectInput;
      shadow: ShadowBoqPositionCostResult;
      gate: BidCutoverGateResult;
    }
  | {
      ok: false;
      directInput: null;
      shadow: ShadowBoqPositionCostResult;
      gate: BidCutoverGateResult;
    };

export type PositionCostCutoverOpts = {
  store: WorkCatalogStore;
  nowMs: number;
  paintCoats?: 1 | 2 | null;
  packs?: readonly TechnologyPack[];
  targetMaterialUnit?: string | null;
  /** GO-1 — override; default = OfferBoqDocument.tenderId */
  tenderId?: string | null;
  /** MULTI-DWELLING-01 — optional dwelling scope */
  dwellingId?: string | null;
  ensureOwnerQuestions?: boolean;
  /** IK S4-B — optional BOQ dependency graph from Document Expert. */
  boqDependencyGraph?: BoqDependencyGraph | null;
  /** APF Labor Expert — ephemeral basis per lineId (read-only, no persistence). */
  ephemeralCostBasisByLineId?:
    | ReadonlyMap<string, EphemeralResearchBasis>
    | Readonly<Record<string, EphemeralResearchBasis>>
    | null;
  /** IK F5 Auto Gap — ephemeral BOM bases (run-scoped packs). */
  ephemeralBomBasisByLineId?:
    | ReadonlyMap<string, import("@/lib/intelligent-estimator/ik-bom-gap-research").IkEphemeralBomBasis>
    | Readonly<Record<string, import("@/lib/intelligent-estimator/ik-bom-gap-research").IkEphemeralBomBasis>>
    | null;
};

export type LegacyVsPositionCostBidCompare = {
  schemaVersion: typeof BID_POSITION_COST_CUTOVER_SCHEMA_VERSION;
  mode: "shadow_compare";
  shadow: ShadowBoqPositionCostResult;
  gate: BidCutoverGateResult;
  legacy: {
    directPln: number | null;
    laborPln: number | null;
    materialsPln: number | null;
    recommendedBidPln: number | null;
    proposal: TenderBidProposal | null;
  };
  next: {
    directPln: number | null;
    laborPln: number | null;
    materialsPln: number | null;
    recommendedBidPln: number | null;
    proposal: TenderBidProposal;
  };
  deltas: {
    directPln: number | null;
    laborPln: number | null;
    materialsPln: number | null;
    recommendedBidPln: number | null;
  };
};

function roundPln(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function deltaOrNull(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return roundPln(b - a);
}

function collectLineGaps(line: ShadowPositionCostLineResult, into: ShadowGapCode[]): void {
  for (const g of line.gaps) {
    if (!into.includes(g)) into.push(g);
  }
}

/**
 * C-COV-1 + C-AUX-1: cutover tylko gdy każda linia billable ma Position Cost COMPLETE.
 */
export function evaluateBidCutoverGate(
  shadow: ShadowBoqPositionCostResult,
): BidCutoverGateResult {
  const gapCodes: ShadowGapCode[] = [];
  const reasonsPl: string[] = [];
  let billableLineCount = 0;
  let completeLineCount = 0;
  let gapLineCount = 0;
  let skippedNoiseCount = 0;
  let equipmentGapCount = 0;
  let transportGapCount = 0;
  let auxiliaryGapCount = 0;

  for (const line of shadow.lines) {
    if (line.identity.status === "NOISE_SKIP") {
      skippedNoiseCount += 1;
      continue;
    }
    billableLineCount += 1;
    if (line.identity.status === "EQUIPMENT_GAP") {
      equipmentGapCount += 1;
      gapLineCount += 1;
      collectLineGaps(line, gapCodes);
      reasonsPl.push(
        `Linia ${line.lp || line.lineId}: EQUIPMENT — brak Owner Input (GAP)`,
      );
      continue;
    }
    if (line.identity.status === "EQUIPMENT_RESOLVED") {
      if (
        line.positionComplete &&
        line.equipment?.rateStatus === "RESOLVED" &&
        line.equipment.totalPln != null
      ) {
        completeLineCount += 1;
        continue;
      }
      equipmentGapCount += 1;
      gapLineCount += 1;
      collectLineGaps(line, gapCodes);
      reasonsPl.push(
        `Linia ${line.lp || line.lineId}: EQUIPMENT — Owner Input niekompletny`,
      );
      continue;
    }
    if (line.identity.status === "TRANSPORT_GAP") {
      transportGapCount += 1;
      gapLineCount += 1;
      collectLineGaps(line, gapCodes);
      reasonsPl.push(
        `Linia ${line.lp || line.lineId}: TRANSPORT — brak Owner Input (GAP)`,
      );
      continue;
    }
    if (line.identity.status === "TRANSPORT_RESOLVED") {
      if (
        line.positionComplete &&
        line.transport?.rateStatus === "RESOLVED" &&
        line.transport.totalPln != null
      ) {
        completeLineCount += 1;
        continue;
      }
      transportGapCount += 1;
      gapLineCount += 1;
      collectLineGaps(line, gapCodes);
      reasonsPl.push(
        `Linia ${line.lp || line.lineId}: TRANSPORT — Owner Input niekompletny`,
      );
      continue;
    }
    if (line.identity.status === "AUXILIARY_GAP") {
      auxiliaryGapCount += 1;
      gapLineCount += 1;
      collectLineGaps(line, gapCodes);
      reasonsPl.push(
        `Linia ${line.lp || line.lineId}: TRANSPORT / AUXILIARY — OUT OF SCOPE`,
      );
      continue;
    }
    if (line.positionComplete && line.position) {
      completeLineCount += 1;
      continue;
    }
    gapLineCount += 1;
    collectLineGaps(line, gapCodes);
    const label =
      line.gapLabelsPl[0] ??
      (line.gaps[0] ? String(line.gaps[0]) : "BRAK DANYCH KOSZTU POZYCJI");
    reasonsPl.push(`Linia ${line.lp || line.lineId}: ${label}`);
  }

  if (billableLineCount <= 0) {
    reasonsPl.push("Brak linii billable do wyceny Position Cost.");
  }

  const pass =
    billableLineCount > 0 &&
    gapLineCount === 0 &&
    completeLineCount === billableLineCount &&
    equipmentGapCount === 0 &&
    transportGapCount === 0 &&
    auxiliaryGapCount === 0 &&
    shadow.aggregates.totalPositionCostPln != null &&
    shadow.aggregates.totalPositionCostPln > 0;

  if (!pass && reasonsPl.length === 0) {
    reasonsPl.push("CUTOVER GATE FAIL — Position Cost niekompletny.");
  }

  return {
    pass,
    billableLineCount,
    completeLineCount,
    gapLineCount,
    skippedNoiseCount,
    equipmentGapCount,
    transportGapCount,
    auxiliaryGapCount,
    reasonsPl,
    gapCodes,
  };
}

/**
 * equipmentPln / transportPln = SUM(resolved Owner Input) · auxiliary = 0 (C-AUX-1).
 */
export function buildOfferBoqDirectFromPositionCost(
  shadow: ShadowBoqPositionCostResult,
  gate: BidCutoverGateResult,
): TenderBidOfferBoqDirectInput | null {
  if (!gate.pass) return null;
  const materialsPln = shadow.aggregates.materialCostPln ?? 0;
  const laborPln = shadow.aggregates.laborCostPln ?? 0;
  const equipmentPln = roundPln(shadow.aggregates.equipmentCostPln ?? 0);
  const transportPln = roundPln(shadow.aggregates.transportCostPln ?? 0);
  const auxiliaryPln = 0;
  const directPln = roundPln(materialsPln + laborPln + equipmentPln + transportPln + auxiliaryPln);
  if (!(directPln > 0)) return null;

  const hasOwnerEquipment = equipmentPln > 0;
  const hasOwnerTransport = transportPln > 0;
  let sourceLabelPl =
    "Position Cost Engine — OUR RATE + Technology/BOM + Price Memory SELL (F5 cutover)";
  if (hasOwnerEquipment && hasOwnerTransport) {
    sourceLabelPl =
      "Position Cost Engine — OUR RATE + Technology/BOM + Price Memory SELL + Owner Input Equipment + Transport (F5 cutover)";
  } else if (hasOwnerEquipment) {
    sourceLabelPl =
      "Position Cost Engine — OUR RATE + Technology/BOM + Price Memory SELL + Owner Input Equipment (F5 cutover)";
  } else if (hasOwnerTransport) {
    sourceLabelPl =
      "Position Cost Engine — OUR RATE + Technology/BOM + Price Memory SELL + Owner Input Transport (F5 cutover)";
  }

  return {
    directPln,
    materialsPln: roundPln(materialsPln),
    laborPln: roundPln(laborPln),
    equipmentPln,
    transportPln,
    auxiliaryPln,
    componentCount: gate.billableLineCount,
    pricedComponentCount: gate.completeLineCount,
    averageConfidence: "high",
    companyKnowledgeHitCount: 0,
    sourceLabelPl,
  };
}

export function computePositionCostShadowAndGate(
  opts: PositionCostCutoverOpts & { doc: Pick<OfferBoqDocument, "lines" | "tenderId"> },
): { shadow: ShadowBoqPositionCostResult; gate: BidCutoverGateResult } {
  const tenderId =
    String(opts.tenderId ?? "").trim() ||
    String((opts.doc as { tenderId?: string }).tenderId ?? "").trim() ||
    null;
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: opts.doc,
    boqDependencyGraph: opts.boqDependencyGraph ?? null,
    store: opts.store,
    nowMs: opts.nowMs,
    paintCoats: opts.paintCoats,
    packs: opts.packs,
    targetMaterialUnit: opts.targetMaterialUnit,
    tenderId,
    dwellingId: opts.dwellingId,
    ensureOwnerQuestions: opts.ensureOwnerQuestions,
    ephemeralCostBasisByLineId: opts.ephemeralCostBasisByLineId ?? null,
    ephemeralBomBasisByLineId: opts.ephemeralBomBasisByLineId ?? null,
  });
  return { shadow, gate: evaluateBidCutoverGate(shadow) };
}

export function buildPositionCostBidDirect(
  opts: PositionCostCutoverOpts & { doc: Pick<OfferBoqDocument, "lines" | "tenderId"> },
): PositionCostBidDirectBuild {
  const { shadow, gate } = computePositionCostShadowAndGate(opts);
  const directInput = buildOfferBoqDirectFromPositionCost(shadow, gate);
  if (!directInput) {
    return { ok: false, directInput: null, shadow, gate };
  }
  return { ok: true, directInput, shadow, gate };
}

function emptyFailProposal(warnings: string[], computedAt: string): TenderBidProposal {
  return {
    ok: false,
    pricingMode: "offer_boq_ai",
    recommendedBidPln: null,
    floorBidPln: null,
    aggressiveBidPln: null,
    safeBidPln: null,
    costPricePln: null,
    costStack: [],
    assumptions: [],
    warnings,
    computedAt,
    sourceLabelPl: "Position Cost cutover — GATE FAIL",
  };
}

export type ComputeBidFromPositionCostInput = {
  doc: OfferBoqDocument;
  kosztorys: TenderKosztorysSnapshot | null | undefined;
  swz: TenderSwzAnalysis | null | undefined;
  fit: TenderFitAssessment | null | undefined;
  costModel: TenderCompanyCostModel;
  minProjectDays?: number;
  maxConcurrentProjects?: number;
  builtAt?: string;
  cutover: PositionCostCutoverOpts;
};

/**
 * NEW Bid: Position Cost → offerBoqDirect → computeTenderBidProposal.
 * Gate FAIL → ok:false + GAP (ZERO legacy fallback).
 */
export function computeBidProposalFromPositionCost(
  opts: ComputeBidFromPositionCostInput,
): {
  gate: BidCutoverGateResult;
  shadow: ShadowBoqPositionCostResult;
  directInput: TenderBidOfferBoqDirectInput | null;
  proposal: TenderBidProposal;
} {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const built = buildPositionCostBidDirect({
    doc: opts.doc,
    ...opts.cutover,
  });

  if (!built.ok || !built.directInput) {
    return {
      gate: built.gate,
      shadow: built.shadow,
      directInput: null,
      proposal: emptyFailProposal(
        [
          "BID CUTOVER GATE FAIL — brak kompletnego Position Cost (OUR RATE + BOM + Price Memory).",
          ...built.gate.reasonsPl,
        ],
        builtAt,
      ),
    };
  }

  const proposal = computeTenderBidProposal({
    kosztorys: opts.kosztorys,
    swz: opts.swz,
    fit: opts.fit,
    costModel: opts.costModel,
    minProjectDays: opts.minProjectDays ?? 14,
    maxConcurrentProjects: opts.maxConcurrentProjects ?? 2,
    offerBoqDirect: built.directInput,
  });

  return {
    gate: built.gate,
    shadow: built.shadow,
    directInput: built.directInput,
    proposal,
  };
}

/**
 * OLD vs NEW compare — legacy direct podawany z zewnątrz (unik cyklu z bid-adapter).
 */
export function compareLegacyVsPositionCostBid(opts: {
  bidInput: ComputeBidFromPositionCostInput;
  legacyDirect: TenderBidOfferBoqDirectInput | null;
}): LegacyVsPositionCostBidCompare {
  const { bidInput, legacyDirect } = opts;
  const next = computeBidProposalFromPositionCost(bidInput);

  const legacyProposal = legacyDirect
    ? computeTenderBidProposal({
        kosztorys: bidInput.kosztorys,
        swz: bidInput.swz,
        fit: bidInput.fit,
        costModel: bidInput.costModel,
        minProjectDays: bidInput.minProjectDays ?? 14,
        maxConcurrentProjects: bidInput.maxConcurrentProjects ?? 2,
        offerBoqDirect: legacyDirect,
      })
    : null;

  const legacyDirectPln = legacyDirect?.directPln ?? null;
  const legacyLabor = legacyDirect?.laborPln ?? null;
  const legacyMat = legacyDirect?.materialsPln ?? null;
  const nextDirect = next.directInput?.directPln ?? null;
  const nextLabor = next.directInput?.laborPln ?? null;
  const nextMat = next.directInput?.materialsPln ?? null;

  return {
    schemaVersion: BID_POSITION_COST_CUTOVER_SCHEMA_VERSION,
    mode: "shadow_compare",
    shadow: next.shadow,
    gate: next.gate,
    legacy: {
      directPln: legacyDirectPln,
      laborPln: legacyLabor,
      materialsPln: legacyMat,
      recommendedBidPln: legacyProposal?.recommendedBidPln ?? null,
      proposal: legacyProposal,
    },
    next: {
      directPln: nextDirect,
      laborPln: nextLabor,
      materialsPln: nextMat,
      recommendedBidPln: next.proposal.recommendedBidPln,
      proposal: next.proposal,
    },
    deltas: {
      directPln: deltaOrNull(legacyDirectPln, nextDirect),
      laborPln: deltaOrNull(legacyLabor, nextLabor),
      materialsPln: deltaOrNull(legacyMat, nextMat),
      recommendedBidPln: deltaOrNull(
        legacyProposal?.recommendedBidPln ?? null,
        next.proposal.recommendedBidPln,
      ),
    },
  };
}
