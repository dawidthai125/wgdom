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
import { resolvePrimaryActionDisabledReason, buildWorkspacePrimaryActionContextLabel } from "@/lib/tender-command-layer-ux";
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
  commandLayerChrome = false,
  activeTab,
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
  /** NG-03 P0 — w Command Layer: bez sticky, zwarty layout (Design Freeze §2.1). */
  commandLayerChrome?: boolean;
  /** NG-08-01 — kontekst widoku dla copy CTA (prezentacja only). */
  activeTab?: TenderDetailV4TabId;
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

  const disabledReason = resolvePrimaryActionDisabledReason(view);
  const disabledReasonId = "tender-primary-action-disabled-reason";
  const contextLabel =
    commandLayerChrome && activeTab
      ? buildWorkspacePrimaryActionContextLabel(activeTab)
      : null;
  const sectionLabel =
    commandLayerChrome && activeTab && activeTab !== "przetarg"
      ? contextLabel
      : "Główna akcja";

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

  // MFS-01: mobile command-layer CTA — krótki busy label (logika busy bez zmian).
  const displayButtonLabel =
    commandLayerChrome && view.busy ? "Przetwarzam…" : view.buttonLabel;

  return (
    <div
      className={
        commandLayerChrome
          ? "rounded-lg border border-primary/25 lg:border-2 bg-background/95 px-2 py-1 lg:px-3 lg:py-2 shadow-sm transition-shadow duration-150"
          : "sticky top-0 z-10 rounded-xl border-2 border-primary/25 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-sm transition-shadow duration-150"
      }
      data-tender-workflow-primary-action
      data-tender-primary-action-chrome={commandLayerChrome ? "command-layer" : "content"}
      data-mfs01-cta-compact={commandLayerChrome ? "true" : undefined}
    >
      <div
        className={
          commandLayerChrome
            ? "flex flex-nowrap items-center justify-between gap-2 max-lg:gap-1.5"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div className={`flex min-w-0 flex-1 ${commandLayerChrome ? "items-center gap-1.5" : "items-start gap-2"}`}>
          <Sparkles
            size={commandLayerChrome ? 14 : 16}
            className={`shrink-0 text-primary ${commandLayerChrome ? "" : "mt-0.5"}`}
          />
          <div className="min-w-0">
            <p
              className={
                commandLayerChrome
                  ? "hidden lg:block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                  : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              }
              data-tender-primary-action-section-label
            >
              {sectionLabel}
            </p>
            <p
              className={
                commandLayerChrome
                  ? "text-xs max-[390px]:text-[11px] font-semibold text-foreground leading-snug line-clamp-1"
                  : "text-sm font-semibold text-foreground mt-0.5"
              }
              title={view.title}
            >
              {view.title}
            </p>
            {!commandLayerChrome && (
              <>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {view.description}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
                  Postęp procesu: {view.progressPercent}%
                </p>
              </>
            )}
            {commandLayerChrome && (
              <p
                className="hidden lg:block text-[10px] text-muted-foreground mt-0.5 line-clamp-1"
                data-teux7d-cta-description
              >
                {view.description}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={view.disabled}
          aria-describedby={
            view.disabled && disabledReason ? disabledReasonId : undefined
          }
          className={
            commandLayerChrome
              ? "inline-flex items-center gap-1 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-lg bg-primary text-primary-foreground text-[11px] lg:text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 min-h-[44px] lg:min-h-[36px] max-lg:max-w-[46%] touch-manipulation transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
              : "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shrink-0 min-h-[44px] lg:min-h-[36px] touch-manipulation transition-colors duration-150"
          }
          data-workflow-primary-cta
        >
          {view.busy && <Loader2 size={commandLayerChrome ? 12 : 14} className="animate-spin" />}
          {displayButtonLabel}
          {!view.disabled && <ArrowRight size={commandLayerChrome ? 12 : 14} />}
        </button>
      </div>
      {view.disabled && disabledReason && (
        <p
          id={disabledReasonId}
          role="status"
          data-teux7b-disabled-reason
          className={
            commandLayerChrome
              ? "hidden lg:block text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2"
              : "text-[11px] text-muted-foreground mt-2 leading-snug"
          }
        >
          {disabledReason}
        </p>
      )}
    </div>
  );
}
