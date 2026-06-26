/**
 * EPIC C — jedna główna akcja pod Process Strip (sticky, prezentacja only).
 */

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import { useTendersContext } from "@/app/tenders/context/TendersContext";
import {
  buildWorkflowPrimaryActionResolveInput,
  buildWorkflowPrimaryActionView,
} from "@/lib/tender-workflow-primary-action";
import {
  legacyWorkspaceTabToV4Navigate,
  workspaceV2PrefersKosztorysTab,
} from "@/lib/tender-workspace-v2-ux";

export function TenderWorkflowPrimaryAction({
  item,
  swz,
  intelligenceCtx,
  ownerFinanceProposal,
  ownerDecision,
  participationResult,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  analyzing,
  onNavigateTab,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  participationResult?: ParticipationCheckResult | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
}) {
  const { ownerDecisions } = useTendersContext();

  const view = buildWorkflowPrimaryActionView({
    resolveInput: buildWorkflowPrimaryActionResolveInput({
      item: intelligenceCtx.item,
      overlay: intelligenceCtx.overlay,
      ownerFinanceProposal,
      ownerDecision,
      monitoringCounts: intelligenceCtx.monitoringCounts,
      bidPrepChecks: intelligenceCtx.bidPrepChecks,
      participationResult,
    }),
    item,
    swz,
    bidProposal: ownerFinanceProposal,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    analyzing,
    kosztorysSession,
  });

  const handleClick = () => {
    if (view.disabled) return;

    const action = view.nextAction;
    if (action.ownerDecision) {
      ownerDecisions.setOwnerDecision(intelligenceCtx.scoringBundle, action.ownerDecision);
      return;
    }
    if (action.tab) {
      const preferKosztorys = workspaceV2PrefersKosztorysTab(action);
      const v4 = legacyWorkspaceTabToV4Navigate(action.tab, preferKosztorys);
      const decyzjaWorkspace = action.tab === "qualification"
        ? "qualification"
        : action.tab === "offer"
          ? "offer"
          : undefined;
      onNavigateTab(v4, decyzjaWorkspace ? { decyzjaWorkspace } : undefined);
      return;
    }
    if (action.expandDetails) {
      onNavigateTab("decyzja");
    }
  };

  return (
    <div
      className="sticky top-0 z-10 rounded-xl border-2 border-primary/25 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-sm"
      data-tender-workflow-primary-action
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Sparkles size={16} className="shrink-0 text-primary mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Główna akcja
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{view.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
              {view.description}
            </p>
            <p className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
              Postęp procesu: {view.progressPercent}%
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={view.disabled}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          data-workflow-primary-cta
        >
          {view.busy && <Loader2 size={14} className="animate-spin" />}
          {view.buttonLabel}
          {!view.disabled && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
}
