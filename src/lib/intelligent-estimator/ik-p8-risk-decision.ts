/**
 * IK-MIGRATION-01 P8 — Risk → Validation → Chief Decision → DW → EC seam.
 *
 * REUSE ONLY:
 *  - applyTenderIntelligenceOverlay
 *  - analyzeValidationFromDossier
 *  - buildDecisionWorkspaceViewModel
 *  - scoreTenderForOwnerView / buildOwnerDecisionView
 *  - P4 ChiefSessionOutput (optional — no invent dossier)
 *
 * HARD LOCK: RESEARCH=0 · HTTP=0 · CatalogWork WRITE=0 · Price Memory WRITE=0
 * NO auto Owner Accept · NO flip expertAiDecydentEnabled / ikChiefWiringEnabled
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import {
  buildOwnerDecisionView,
  scoreTenderForOwnerView,
} from "@/lib/tender-owner-view-ux";
import {
  applyTenderIntelligenceOverlay,
  type TenderIntelligenceOverlay,
} from "@/lib/tender-intelligence-overlay";
import type { StrategicScoreContext } from "@/lib/tenders-strategy-strategic-score";
import type { CompanyHealthResult } from "@/lib/tenders-strategy-health";
import { healthWeightsForMode } from "@/lib/tenders-strategy-growth-mode";
import {
  analyzeValidationFromDossier,
  type ValidationExpertAnalysisResult,
  type ValidationVerdict,
} from "@/lib/validation-expert";
import {
  buildDecisionWorkspaceViewModel,
} from "@/lib/decision-workspace-ui";
import type { DecisionWorkspaceViewModel } from "@/lib/decision-workspace-ui";
import {
  idleChiefSessionOutput,
  type ChiefSessionOutput,
} from "@/lib/chief-session";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";
import type { IkKnrExpertReport } from "./ik-knr-expert";
import type { IkDocumentExpertReport } from "./ik-document-expert";
import { resolveIkExpertAdmission } from "./ik-expert-admission";
import {
  buildIkP8QuantityAdvisory,
  collectIkP8QuantityAdvisoryInputs,
  type IkP8QuantityAdvisory,
} from "./ik-p8-quantity-advisory";

export const IK_P8_RISK_DECISION_SCHEMA_VERSION = 1 as const;

export type IkP8RiskDecisionStatus =
  | "ready"
  | "partial"
  | "gap"
  | "blocked"
  | "hold"
  | "needs_review";

export type IkP8RiskDecisionReport = {
  schemaVersion: typeof IK_P8_RISK_DECISION_SCHEMA_VERSION;
  status: IkP8RiskDecisionStatus;
  tenderId: string;
  /** Always false — P8 hard lock. */
  researchExecuted: false;
  /** Always 0 — P8 hard lock. */
  httpCalls: 0;
  catalogWorkWrite: false;
  priceMemoryWrite: false;
  /** Always false — Chief Decision ≠ Owner Accept. */
  autoAcceptExecuted: false;
  /** P8 ON must never flip Dual Outcome D. */
  expertAiDecydentFlipped: false;
  /** P8 ON must never mutate P4 lever. */
  ikChiefWiringMutated: false;
  overlay: TenderIntelligenceOverlay | null;
  displayDecision: "GO" | "HOLD" | "NO-GO" | null;
  downgradeRule: string | null;
  validationVerdict: ValidationVerdict | null;
  validation: ValidationExpertAnalysisResult | null;
  chiefAvailable: boolean;
  chiefCaseId: string | null;
  chiefStatus: string | null;
  decisionWorkspace: DecisionWorkspaceViewModel | null;
  dwUiPhase: string | null;
  canApprove: boolean;
  canReject: boolean;
  ownerDecisionRecorded: boolean;
  reasonsPl: string[];
  /**
   * IK S4-C — additive quantity advisory (OPTION A).
   * Surface only — never mutates displayDecision / Bid / quantity SSOT.
   */
  quantityAdvisory: IkP8QuantityAdvisory | null;
  provenance: {
    sourceRefKind: "evidence" | "hold";
    bidFromP7: boolean;
    riskSource: "tender_intelligence_overlay";
    validationSource: "validation_expert" | "chief_unavailable";
    decisionSource: "decision_workspace_vm";
  };
};

function stubHealth(): CompanyHealthResult {
  const weights = healthWeightsForMode("balanced");
  return {
    index: 60,
    label: "stable",
    dimensions: { O: 60, Z: 60, F: 60, R: 60, D: 60 },
    recommendation: "IK P8 — minimal strategic context (local profile only).",
    weights,
    suggestedGrowthMode: "balanced",
    freeSlots: 1,
    overloadIndex: 0,
  };
}

function buildLocalScoringContext(item: TenderPipelineItem): StrategicScoreContext {
  const profile = loadCompanyProfileLocal();
  return {
    health: stubHealth(),
    growthMode: "balanced",
    jobs: [],
    items: [item],
    profile,
  };
}

function mapStatus(opts: {
  displayDecision: "GO" | "HOLD" | "NO-GO" | null;
  validationVerdict: ValidationVerdict | null;
  chiefAvailable: boolean;
}): IkP8RiskDecisionStatus {
  if (opts.displayDecision === "NO-GO") return "blocked";
  if (opts.validationVerdict === "blocked") return "blocked";
  if (opts.validationVerdict === "needs_review") return "needs_review";
  if (!opts.chiefAvailable) return "hold";
  if (opts.displayDecision === "HOLD") return "hold";
  if (opts.validationVerdict === "validated" && opts.displayDecision === "GO") {
    return "ready";
  }
  if (opts.displayDecision === "GO" && opts.validationVerdict == null) {
    return "partial";
  }
  return "partial";
}

/**
 * Pure P8 seam — READ Bid (P7 optional) · REUSE overlay / validation / DW VM.
 * Never calls Labor/Material experts · never research · never Accept · never flips D.
 */
export function runIkP8RiskDecision(opts: {
  item: TenderPipelineItem;
  /** P7 Bid proposal — preferred; null → overlay O4 HOLD path when raw GO. */
  bidProposal?: TenderBidProposal | null;
  /** Optional full P7 report (status provenance companion). */
  p7?: IkP7PositionCostBidReport | null;
  /** Document Expert — S4-C quantity advisory source (enriched lines + graphs). */
  expert?: IkDocumentExpertReport | null;
  /** P4 Chief session — REUSE; null ⇒ Validation HOLD (no invent dossier). */
  chiefSession?: ChiefSessionOutput | null;
  scoringContext?: StrategicScoreContext | null;
  /**
   * Historical Executed supporting signal (from KNR Expert) — Soft risk only.
   * MISS must not block · CONFLICT → needs_review hint · NEVER authority.
   */
  knrHistorical?: IkKnrExpertReport | null;
}): IkP8RiskDecisionReport {
  const tenderId = String(opts.item.id || opts.item.tenderId || "").trim();
  const bidProposal =
    opts.bidProposal
    ?? opts.p7?.proposal
    ?? null;
  const session = opts.chiefSession ?? null;
  const dossier = session?.dossier ?? null;
  const chiefAvailable = dossier != null && Boolean(session?.caseId || dossier.caseId);

  const baseLocks = {
    researchExecuted: false as const,
    httpCalls: 0 as const,
    catalogWorkWrite: false as const,
    priceMemoryWrite: false as const,
    autoAcceptExecuted: false as const,
    expertAiDecydentFlipped: false as const,
    ikChiefWiringMutated: false as const,
  };

  const scoringContext = opts.scoringContext ?? buildLocalScoringContext(opts.item);
  const scoringBundle = scoreTenderForOwnerView(opts.item, scoringContext);
  const decisionView = buildOwnerDecisionView(scoringBundle);
  const overlay = applyTenderIntelligenceOverlay({
    bundle: scoringBundle,
    decisionView,
    ownerFinanceProposal: bidProposal,
    item: opts.item,
  });

  let validation: ValidationExpertAnalysisResult | null = null;
  let validationVerdict: ValidationVerdict | null = null;
  let validationSource: "validation_expert" | "chief_unavailable" = "chief_unavailable";

  if (dossier) {
    validation = analyzeValidationFromDossier(dossier);
    validationVerdict = validation.verdict;
    validationSource = "validation_expert";
  }

  const sessionForDw: ChiefSessionOutput = session
    ?? idleChiefSessionOutput({
      status: "idle",
      dossier: null,
      caseId: null,
      readyForDecision: false,
      error: chiefAvailable ? null : "CHIEF_UNAVAILABLE",
    });

  // IK-scoped DW VM: flagEnabled=true under P8 gate — does NOT flip D / classic DW LS.
  const decisionWorkspace = buildDecisionWorkspaceViewModel({
    session: sessionForDw,
    validation,
    localDecision: null,
    flagEnabled: true,
  });

  const reasonsPl: string[] = [
    ...overlay.reasons.slice(0, 6),
    ...(validation?.report.summaryPl ? [validation.report.summaryPl] : []),
    ...(!chiefAvailable ? ["Chief niedostępny — Validation HOLD (bez invent dossier)."] : []),
    ...(opts.p7 && (opts.p7.status === "gap" || opts.p7.status === "blocked")
      ? [`P7 Bid context: ${opts.p7.status}`]
      : []),
  ];

  const histConflict = opts.knrHistorical?.counts.historicalConflict ?? 0;
  const histExact =
    (opts.knrHistorical?.counts.historicalExactRms ?? 0)
    + (opts.knrHistorical?.counts.historicalExact ?? 0);
  if (histConflict > 0) {
    reasonsPl.push(
      `Historyczne ATH WGDOM: konflikt wariantów na ${histConflict} pozycjach (supporting Soft — nie Catalog authority).`,
    );
  } else if (histExact > 0) {
    reasonsPl.push(
      `Historyczne ATH WGDOM: ${histExact} exact match (evidence only · authority=false).`,
    );
  }
  // HISTORICAL_MISS intentionally omitted — not an error / not tender downgrade.

  let status = mapStatus({
    displayDecision: overlay.displayDecision,
    validationVerdict,
    chiefAvailable,
  });
  // Soft escalate only on historical CONFLICT — never on MISS.
  if (histConflict > 0 && status === "ready") {
    status = "needs_review";
  }

  const expert = opts.expert ?? null;
  const structuralUnresolved = expert
    ? resolveIkExpertAdmission(expert).unresolvedCount
    : 0;
  const gapLineCount = opts.p7?.gapLineCount ?? 0;
  // Line-tolerant: package incomplete ⇒ never P8 ready / Final Bid path.
  if (structuralUnresolved > 0 || gapLineCount > 0) {
    if (status === "ready" || status === "partial") {
      status = "needs_review";
    }
  }

  const sourceRefKind: "evidence" | "hold" =
    status === "ready" || status === "partial" ? "evidence" : "hold";

  // S4-C — quantity advisory projection (does NOT mutate overlay.displayDecision).
  const advisoryInputs = collectIkP8QuantityAdvisoryInputs({
    masterBoqLines: expert?.masterBoqLines ?? null,
    offerBoqLines: expert?.offerBoq?.lines ?? null,
    boqDependencyGraph: expert?.boqDependencyGraph ?? null,
    boqDependencyGraphsByDwelling: expert?.boqDependencyGraphsByDwelling ?? null,
  });
  const quantityAdvisory = advisoryInputs.length
    ? buildIkP8QuantityAdvisory({
      lines: advisoryInputs,
      shadow: opts.p7?.shadow ?? null,
    })
    : null;

  return {
    schemaVersion: IK_P8_RISK_DECISION_SCHEMA_VERSION,
    status,
    tenderId,
    ...baseLocks,
    overlay,
    displayDecision: overlay.displayDecision,
    downgradeRule: overlay.downgradeRule,
    validationVerdict,
    validation,
    chiefAvailable,
    chiefCaseId: session?.caseId ?? dossier?.caseId ?? null,
    chiefStatus: session?.status ?? null,
    decisionWorkspace,
    dwUiPhase: decisionWorkspace.uiPhase,
    canApprove: decisionWorkspace.canApprove === true,
    canReject: decisionWorkspace.canReject === true,
    ownerDecisionRecorded: decisionWorkspace.localDecision != null,
    reasonsPl,
    quantityAdvisory,
    provenance: {
      sourceRefKind,
      bidFromP7: bidProposal != null && (opts.p7 != null || opts.bidProposal != null),
      riskSource: "tender_intelligence_overlay",
      validationSource,
      decisionSource: "decision_workspace_vm",
    },
  };
}
