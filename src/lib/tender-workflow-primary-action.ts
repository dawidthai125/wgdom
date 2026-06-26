/**
 * EPIC C — Sticky Primary CTA (prezentacja only).
 * SSOT: resolveOwnerNextAction, buildTenderAnalysisStatusRows, computeWorkspaceV2AutoProgress.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import {
  buildTenderAnalysisStatusRows,
  countTenderAttachments,
} from "@/lib/tender-analysis-status-ux";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import { TENDER_OWNER_OPERATOR_COPY } from "@/lib/tender-owner-language-pl";
import {
  resolveOwnerNextAction,
  type IntelligenceNextAction,
  type IntelligenceNextActionRuleId,
  type ResolveOwnerNextActionInput,
} from "@/lib/tender-intelligence-next-action";
import {
  buildWorkspaceV2NextActionButtonLabel,
  buildWorkspaceV2NextActionLabel,
  computeWorkspaceV2AutoProgress,
} from "@/lib/tender-workspace-v2-ux";

export interface WorkflowPrimaryActionView {
  nextAction: IntelligenceNextAction;
  title: string;
  description: string;
  buttonLabel: string;
  disabled: boolean;
  busy: boolean;
  progressPercent: number;
}

const STICKY_PRIMARY_LABELS: Partial<Record<IntelligenceNextActionRuleId, string>> = {
  P5: "Znajdź kosztorys",
  P6: "Policz wycenę",
  P8: "Zatwierdź STARTUJ",
  P10: "Przygotuj ofertę",
};

function isAnalysisProcessing(
  analysisRows: ReturnType<typeof buildTenderAnalysisStatusRows>,
  flags: {
    autoRunning?: boolean;
    dossierBuilding?: boolean;
    dossierSaving?: boolean;
    analyzing?: boolean;
  },
): boolean {
  if (flags.autoRunning || flags.dossierBuilding || flags.dossierSaving || flags.analyzing) {
    return true;
  }
  return analysisRows.some(
    (row) => row.state === "pending"
      && (row.id === "notice" || row.id === "documents" || row.id === "kosztorys"),
  );
}

function resolveStickyPrimaryButtonLabel(
  action: IntelligenceNextAction,
  item: TenderPipelineItem,
  busy: boolean,
): string {
  if (busy) return TENDER_OWNER_OPERATOR_COPY.analyzingDocuments;

  if (countTenderAttachments(item) === 0 && action.tab === "documents") {
    return "Pobierz dokumenty";
  }

  const sticky = STICKY_PRIMARY_LABELS[action.ruleId];
  if (sticky) return sticky;

  if (action.informationalOnly) return TENDER_OWNER_OPERATOR_COPY.analyzingDocuments;

  return buildWorkspaceV2NextActionButtonLabel(action);
}

export function buildWorkflowPrimaryActionView(opts: {
  resolveInput: ResolveOwnerNextActionInput;
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  bidProposal?: TenderBidProposal | null;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  analyzing?: boolean;
  kosztorysSession?: KosztorysProcessSession;
}): WorkflowPrimaryActionView {
  const {
    resolveInput,
    item,
    swz,
    bidProposal,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    analyzing,
    kosztorysSession,
  } = opts;

  const nextAction = resolveOwnerNextAction(resolveInput);
  const progress = computeWorkspaceV2AutoProgress(item, swz);
  const analysisRows = buildTenderAnalysisStatusRows({
    item,
    swz,
    bidProposal,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    kosztorysSession,
  });

  const busy = isAnalysisProcessing(analysisRows, {
    autoRunning,
    dossierBuilding,
    dossierSaving,
    analyzing,
  }) || (nextAction.informationalOnly && nextAction.ruleId === "P4");

  const buttonLabel = resolveStickyPrimaryButtonLabel(nextAction, item, busy);
  const disabled = busy || nextAction.informationalOnly;

  return {
    nextAction,
    title: buildWorkspaceV2NextActionLabel(nextAction),
    description: nextAction.description,
    buttonLabel,
    disabled,
    busy,
    progressPercent: progress.percent,
  };
}

export function buildWorkflowPrimaryActionResolveInput(opts: {
  item: TenderPipelineItem;
  overlay: ResolveOwnerNextActionInput["overlay"];
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  monitoringCounts?: ResolveOwnerNextActionInput["monitoringCounts"];
  bidPrepChecks?: ResolveOwnerNextActionInput["bidPrepChecks"];
  participationResult?: ParticipationCheckResult | null;
}): ResolveOwnerNextActionInput {
  return {
    item: opts.item,
    overlay: opts.overlay,
    ownerFinanceProposal: opts.ownerFinanceProposal,
    ownerDecision: opts.ownerDecision ?? null,
    monitoringCounts: opts.monitoringCounts,
    bidPrepChecks: opts.bidPrepChecks,
    participationResult: opts.participationResult,
  };
}
