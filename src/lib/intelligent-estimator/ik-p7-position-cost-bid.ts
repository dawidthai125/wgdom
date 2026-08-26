/**
 * IK-MIGRATION-01 P7 — Position Cost → F5 cutover → Bid → SUM → EC seam.
 *
 * REUSE ONLY:
 *  - computeShadow / evaluateBidCutoverGate / computeBidProposalFromPositionCost
 *  - computePackageBidProposal / evaluatePackageGate / aggregatePackageDirect
 *  - computeTenderBidProposal (via cutover / package helpers)
 *
 * HARD LOCK: RESEARCH=0 · HTTP=0 · CatalogWork WRITE=0 · Price Memory WRITE=0
 * ensureOwnerQuestions=false — no new Owner Input write surface from P7.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import type { PackageGateResult } from "@/lib/multi-dwelling/types";
import {
  computePackageBidProposal,
  aggregatePackageDirect,
} from "@/lib/multi-dwelling/orchestration";
import { evaluatePackageGate } from "@/lib/multi-dwelling/package-gate";
import {
  computeBidProposalFromPositionCost,
  type BidCutoverGateResult,
} from "@/lib/tender-position-cost/bid-position-cost-cutover";
import type { ShadowBoqPositionCostResult, ShadowGapCode } from "@/lib/tender-position-cost/boq-shadow-adapter";
import { computeShadowPositionCostsForOfferBoq } from "@/lib/tender-position-cost/boq-shadow-adapter";
import type { TenderBidOfferBoqDirectInput, TenderBidProposal } from "@/lib/tenders-bid-calculator";
import {
  aggregateProvisionalPricingSummary,
  isIkProvisionalEstimationEnabled,
  type ProvisionalPricingSummary,
} from "@/lib/intelligent-estimator/ik-provisional-estimation";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { resolveKosztorysSnapshotForPricing } from "@/lib/cost-multi-02";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { IkDocumentExpertReport } from "./ik-document-expert";
import { synchronizePackageOfferBoqsFromMasterLines } from "@/lib/intelligent-estimator/boq-offer-master-sync";

export const IK_P7_POSITION_COST_BID_SCHEMA_VERSION = 1 as const;

export type IkP7PositionCostBidStatus =
  | "ready"
  | "partial"
  | "gap"
  | "blocked"
  | "hold";

export type IkP7PositionCostBidReport = {
  schemaVersion: typeof IK_P7_POSITION_COST_BID_SCHEMA_VERSION;
  status: IkP7PositionCostBidStatus;
  mode: "legacy_single" | "multi_package";
  tenderId: string;
  /** Always false — P7 hard lock. */
  researchExecuted: false;
  /** Always 0 — P7 hard lock. */
  httpCalls: 0;
  catalogWorkWrite: false;
  priceMemoryWrite: false;
  cutoverGatePass: boolean;
  packageGatePass: boolean | null;
  billableLineCount: number;
  completeLineCount: number;
  gapLineCount: number;
  laborCostPln: number | null;
  materialCostPln: number | null;
  directPln: number | null;
  recommendedBidPln: number | null;
  bidOk: boolean;
  reasonsPl: string[];
  gapCodes: string[];
  proposal: TenderBidProposal | null;
  shadow: ShadowBoqPositionCostResult | null;
  packageGate: PackageGateResult | null;
  packageDirect: TenderBidOfferBoqDirectInput | null;
  cutoverGate: BidCutoverGateResult | null;
  /** IK provisional seam — pricing trust breakdown (flag ON only). */
  provisionalPricingSummary: ProvisionalPricingSummary | null;
  provenance: {
    sourceRefKind: "evidence" | "hold" | "boq_ready";
    offerBoqPresent: boolean;
    rateSources: ("OUR_RATE" | "PRICE_MEMORY" | "OWNER_INPUT" | "GAP")[];
    packageSumUsed: boolean;
  };
};

function emptyProposal(warnings: string[], computedAt: string): TenderBidProposal {
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
    sourceLabelPl: "IK P7 — blocked (no OfferBoq)",
  };
}

function statusFromGates(opts: {
  cutoverPass: boolean;
  packagePass: boolean | null;
  bidOk: boolean;
  gapLineCount: number;
}): IkP7PositionCostBidStatus {
  if (opts.packagePass === false) return "blocked";
  if (!opts.cutoverPass && opts.packagePass == null) {
    return opts.gapLineCount > 0 ? "gap" : "blocked";
  }
  if (opts.bidOk && opts.cutoverPass && opts.packagePass !== false) return "ready";
  if (opts.gapLineCount > 0) return "partial";
  return "hold";
}

/** S5-C — observability-only union of per-dwelling f5Gate gapCodes (deterministic, deduped). */
function aggregateMultiPackageGapCodes(
  dwellings: readonly { f5Gate?: BidCutoverGateResult | null }[],
): string[] {
  const codes: ShadowGapCode[] = [];
  for (const dwelling of dwellings) {
    for (const code of dwelling.f5Gate?.gapCodes ?? []) {
      if (!codes.includes(code)) codes.push(code);
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b));
}

function buildProvisionalPricingSummaryFromPackage(opts: {
  dwellings: readonly { dwellingId: string; offerBoq?: { lines?: unknown[] } | null }[];
  store: WorkCatalogStore;
  nowMs: number;
  tenderId: string;
  boqDependencyGraphsByDwelling?: Record<string, import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph> | null;
  boqDependencyGraph?: import("@/lib/intelligent-estimator/boq-dependency-graph").BoqDependencyGraph | null;
}): ProvisionalPricingSummary | null {
  if (!isIkProvisionalEstimationEnabled()) return null;
  const shadowLines: Parameters<typeof aggregateProvisionalPricingSummary>[0] = [];
  for (const d of opts.dwellings) {
    if (!d.offerBoq?.lines?.length) continue;
    const shadow = computeShadowPositionCostsForOfferBoq({
      doc: d.offerBoq as import("@/lib/tender-offer-boq").OfferBoqDocument,
      store: opts.store,
      nowMs: opts.nowMs,
      tenderId: opts.tenderId,
      dwellingId: d.dwellingId,
      boqDependencyGraph:
        opts.boqDependencyGraphsByDwelling?.[d.dwellingId] ?? opts.boqDependencyGraph ?? null,
      ensureOwnerQuestions: false,
    });
    shadowLines.push(...shadow.lines);
  }
  if (shadowLines.length === 0) return null;
  return aggregateProvisionalPricingSummary(shadowLines);
}

/**
 * Pure P7 seam — READ CatalogWork / Price Memory via existing adapters only.
 * Never calls Labor/Material experts · never research · never Accept.
 */
export function runIkP7PositionCostBid(opts: {
  item: TenderPipelineItem;
  expert: IkDocumentExpertReport;
  package?: TenderPackage | null;
  store?: WorkCatalogStore;
  nowMs?: number;
}): IkP7PositionCostBidReport {
  const tenderId = String(opts.item.id || opts.item.tenderId || opts.expert.tenderId || "").trim();
  const nowMs = opts.nowMs ?? Date.now();
  const builtAt = new Date(nowMs).toISOString();
  const store = opts.store ?? loadWorkCatalogStoreLocal();
  const pkg = opts.package ?? null;
  const profile = loadCompanyProfileLocal();
  const costModel = profile.costModel;
  const minProjectDays = profile.minProjectDays ?? 14;
  const maxConcurrentProjects = profile.maxConcurrentProjects ?? 2;

  const baseLocks = {
    researchExecuted: false as const,
    httpCalls: 0 as const,
    catalogWorkWrite: false as const,
    priceMemoryWrite: false as const,
  };

  const isMulti = pkg?.mode === "multi";

  if (isMulti && pkg) {
    const syncedPkg = synchronizePackageOfferBoqsFromMasterLines(
      pkg,
      opts.expert.masterBoqLines ?? [],
    );
    const { evaluation, proposal } = computePackageBidProposal({
      pkg: syncedPkg,
      store,
      nowMs,
      kosztorys: resolveKosztorysSnapshotForPricing(opts.item),
      swz: opts.item.swzAnalysis ?? null,
      fit: opts.item.tenderFit ?? null,
      costModel,
      minProjectDays,
      maxConcurrentProjects,
      builtAt,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: opts.expert.boqDependencyGraphsByDwelling ?? null,
      boqDependencyGraph: opts.expert.boqDependencyGraph ?? null,
    });

    const packageDirect =
      evaluation.packageDirect
      ?? (evaluation.packageGate.pass ? aggregatePackageDirect(evaluation.package) : null);

    const gapLineCount = evaluation.package.dwellings.reduce(
      (n, d) => n + (d.f5Gate?.gapLineCount ?? 0),
      0,
    );
    const billable = evaluation.package.dwellings.reduce(
      (n, d) => n + (d.f5Gate?.billableLineCount ?? 0),
      0,
    );
    const complete = evaluation.package.dwellings.reduce(
      (n, d) => n + (d.f5Gate?.completeLineCount ?? 0),
      0,
    );
    const cutoverPass = evaluation.package.dwellings.every(
      (d) => !d.offerBoq?.lines?.length || d.f5Gate?.pass === true,
    );

    const status = statusFromGates({
      cutoverPass,
      packagePass: evaluation.packageGate.pass,
      bidOk: proposal.ok === true,
      gapLineCount,
    });

    const provisionalPricingSummary = buildProvisionalPricingSummaryFromPackage({
      dwellings: evaluation.package.dwellings,
      store,
      nowMs,
      tenderId,
      boqDependencyGraphsByDwelling: opts.expert.boqDependencyGraphsByDwelling ?? null,
      boqDependencyGraph: opts.expert.boqDependencyGraph ?? null,
    });

    return {
      schemaVersion: IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
      status,
      mode: "multi_package",
      tenderId,
      ...baseLocks,
      cutoverGatePass: cutoverPass,
      packageGatePass: evaluation.packageGate.pass,
      billableLineCount: billable,
      completeLineCount: complete,
      gapLineCount,
      laborCostPln: packageDirect?.laborPln ?? null,
      materialCostPln: packageDirect?.materialsPln ?? null,
      directPln: packageDirect?.directPln ?? null,
      recommendedBidPln: proposal.recommendedBidPln,
      bidOk: proposal.ok === true,
      reasonsPl: [
        ...evaluation.packageGate.reasonsPl,
        ...(proposal.warnings ?? []),
      ],
      gapCodes: aggregateMultiPackageGapCodes(evaluation.package.dwellings),
      proposal,
      shadow: null,
      packageGate: evaluation.packageGate,
      packageDirect,
      cutoverGate: null,
      provisionalPricingSummary,
      provenance: {
        sourceRefKind: evaluation.packageGate.pass && proposal.ok ? "evidence" : "hold",
        offerBoqPresent: evaluation.package.dwellings.some(
          (d) => (d.offerBoq?.lines?.length ?? 0) > 0,
        ),
        rateSources: ["OUR_RATE", "PRICE_MEMORY"],
        packageSumUsed: true,
      },
    };
  }

  const doc = opts.expert.offerBoq;
  if (!doc || !(doc.lines?.length > 0)) {
    const proposal = emptyProposal(
      ["IK P7 — brak OfferBoq / Master BOQ (GAP). Position Cost → Bid BLOCKED."],
      builtAt,
    );
    return {
      schemaVersion: IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
      status: "gap",
      mode: "legacy_single",
      tenderId,
      ...baseLocks,
      cutoverGatePass: false,
      packageGatePass: null,
      billableLineCount: 0,
      completeLineCount: 0,
      gapLineCount: 0,
      laborCostPln: null,
      materialCostPln: null,
      directPln: null,
      recommendedBidPln: null,
      bidOk: false,
      reasonsPl: proposal.warnings,
      gapCodes: [],
      proposal,
      shadow: null,
      packageGate: null,
      packageDirect: null,
      cutoverGate: null,
      provisionalPricingSummary: null,
      provenance: {
        sourceRefKind: "hold",
        offerBoqPresent: false,
        rateSources: ["GAP"],
        packageSumUsed: false,
      },
    };
  }

  const cut = computeBidProposalFromPositionCost({
    doc,
    kosztorys: resolveKosztorysSnapshotForPricing(opts.item),
    swz: opts.item.swzAnalysis ?? null,
    fit: opts.item.tenderFit ?? null,
    costModel,
    minProjectDays,
    maxConcurrentProjects,
    builtAt,
    cutover: {
      store,
      nowMs,
      ensureOwnerQuestions: false,
      boqDependencyGraph: opts.expert.boqDependencyGraph ?? null,
    },
  });

  const status = statusFromGates({
    cutoverPass: cut.gate.pass,
    packagePass: null,
    bidOk: cut.proposal.ok === true,
    gapLineCount: cut.gate.gapLineCount,
  });

  const rateSources: IkP7PositionCostBidReport["provenance"]["rateSources"] = [];
  if ((cut.shadow.aggregates.laborCostPln ?? 0) > 0) rateSources.push("OUR_RATE");
  if ((cut.shadow.aggregates.materialCostPln ?? 0) > 0) rateSources.push("PRICE_MEMORY");
  if (cut.gate.gapLineCount > 0 || !cut.gate.pass) rateSources.push("GAP");
  if (rateSources.length === 0) rateSources.push("GAP");

  const provisionalPricingSummary = isIkProvisionalEstimationEnabled()
    ? aggregateProvisionalPricingSummary(cut.shadow.lines)
    : null;

  return {
    schemaVersion: IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
    status,
    mode: "legacy_single",
    tenderId,
    ...baseLocks,
    cutoverGatePass: cut.gate.pass,
    packageGatePass: null,
    billableLineCount: cut.gate.billableLineCount,
    completeLineCount: cut.gate.completeLineCount,
    gapLineCount: cut.gate.gapLineCount,
    laborCostPln: cut.directInput?.laborPln ?? cut.shadow.aggregates.laborCostPln ?? null,
    materialCostPln: cut.directInput?.materialsPln ?? cut.shadow.aggregates.materialCostPln ?? null,
    directPln: cut.directInput?.directPln ?? null,
    recommendedBidPln: cut.proposal.recommendedBidPln,
    bidOk: cut.proposal.ok === true,
    reasonsPl: [...cut.gate.reasonsPl, ...(cut.proposal.warnings ?? [])],
    gapCodes: [...cut.gate.gapCodes],
    proposal: cut.proposal,
    shadow: cut.shadow,
    packageGate: null,
    packageDirect: null,
    cutoverGate: cut.gate,
    provisionalPricingSummary,
    provenance: {
      sourceRefKind: cut.gate.pass && cut.proposal.ok ? "evidence" : "hold",
      offerBoqPresent: true,
      rateSources,
      packageSumUsed: false,
    },
  };
}

/** Re-export for tests — PackageGate SSOT unchanged. */
export { evaluatePackageGate, aggregatePackageDirect };
