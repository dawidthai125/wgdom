import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { TenderWorkspaceV2Panel, TenderWorkspaceV2ChecklistCompact } from "@/app/TenderWorkspaceV2Panel";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import {
  WorkflowHubBlockersSection,
  WorkflowHubPositionsFileDisplay,
} from "@/app/TenderWorkflowHubSections";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { TrustBanner } from "@/app/tenders/trust/TrustBanner";
import { TrustChipRow } from "@/app/tenders/trust/TrustChipRow";
import { shouldRenderHubTrustBanner } from "@/lib/tender-trust-ui";

export function TenderWorkflowHubPanel({
  item,
  swz,
  intelligenceCtx,
  onNavigateTab,
  onNavigateLegacy,
  onOpenPreview,
  ownerFinanceProposal,
  ownerDecision,
  participationResult,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  analyzing,
  trustAssessment,
  commandLayerActive = false,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  trustAssessment: TenderTrustAssessment;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  onNavigateLegacy: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  participationResult?: ParticipationCheckResult | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
  /** NG-03.2 — Trust/Strip/CTA w Command Layer (TenderDetailPage). */
  commandLayerActive?: boolean;
}) {
  const blockersCount = intelligenceCtx.overlay.allBlocks.length;
  const progressDefaultOpen = blockersCount > 0;

  return (
    <div className="space-y-4" data-tender-workflow-hub>
      {!commandLayerActive && (
        <>
          {shouldRenderHubTrustBanner(trustAssessment) && (
            <TrustBanner assessment={trustAssessment} variant="overall" />
          )}

          <TrustChipRow
            assessment={trustAssessment}
            surfaceId="hub"
            onNavigateTab={(tab) => onNavigateTab(tab)}
            dataAttr="hub"
          />

          <TenderWorkflowProcessStrip
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            trustAssessment={trustAssessment}
            onNavigateTab={onNavigateTab}
          />

          <TenderWorkflowPrimaryAction
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            ownerFinanceProposal={ownerFinanceProposal}
            ownerDecision={ownerDecision}
            participationResult={participationResult}
            kosztorysSession={kosztorysSession}
            autoRunning={autoRunning}
            dossierBuilding={dossierBuilding}
            dossierSaving={dossierSaving}
            analyzing={analyzing}
            onNavigateTab={onNavigateTab}
          />
        </>
      )}

      <details
        className="rounded-xl border border-border bg-card overflow-hidden group"
        data-tender-progress-accordion
        open={progressDefaultOpen}
      >
        <summary className="px-4 py-2.5 cursor-pointer list-none flex items-center justify-between gap-2 bg-secondary/30 border-b border-transparent group-open:border-border/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Szczegóły postępu
          </span>
          <span className="text-[10px] text-muted-foreground">rozwiń</span>
        </summary>
        <div className="px-4 py-3 space-y-4">
          <TenderWorkspaceV2Panel
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            onNavigateTab={onNavigateTab}
            hubDensity={commandLayerActive}
          />

          <WorkflowHubBlockersSection ctx={intelligenceCtx} />

          {commandLayerActive && (
            <TenderWorkspaceV2ChecklistCompact item={item} swz={swz} />
          )}

          <WorkflowHubPositionsFileDisplay
            view={intelligenceCtx.positions}
            item={item}
            onNavigate={onNavigateLegacy}
            onOpenPreview={onOpenPreview}
          />
        </div>
      </details>
    </div>
  );
}
