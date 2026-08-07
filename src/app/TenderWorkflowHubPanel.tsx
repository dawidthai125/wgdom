import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import {
  TenderWorkspaceV2Panel,
  TenderWorkspaceV2ChecklistCompact,
  TenderWorkspaceV2ProgressCompact,
  TenderWorkspaceV2InsightsCompact,
} from "@/app/TenderWorkspaceV2Panel";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import { TenderAnalysisStatusStrip } from "@/app/TenderAnalysisStatusStrip";
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
import { ChiefDossierSurface } from "@/app/chief-dossier";
import type { ChiefDossierViewModel } from "@/lib/chief-dossier-ui";
import type { ExpertWorkspaceViewModel } from "@/lib/expert-workspace-ui";
import { DecisionWorkspaceHost } from "@/app/decision-workspace";
import type { ChiefSessionOutput } from "@/lib/chief-session";

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
  chiefDossierVm = null,
  expertWorkspaceVm = null,
  chiefSessionForDecision = null,
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
  /** WIRE-CHIEF-UI-DOSSIER-01 — sibling POD #tender-intelligence-hub. */
  chiefDossierVm?: ChiefDossierViewModel | null;
  /** WIRE-EXPERTS-UI-01 — Expert Details under Trace (Slot A). */
  expertWorkspaceVm?: ExpertWorkspaceViewModel | null;
  /** DECISION-WORKSPACE-01 — sibling POD #chief-dossier-surface. */
  chiefSessionForDecision?: ChiefSessionOutput | null;
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

      {commandLayerActive && (
        <>
          <TenderWorkspaceV2ProgressCompact item={item} swz={swz} />
          <TenderWorkspaceV2InsightsCompact
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            onNavigateCostTab={(tab) => onNavigateTab(tab)}
          />
          {chiefDossierVm != null && (
            <ChiefDossierSurface
              vm={chiefDossierVm}
              expertWorkspaceVm={expertWorkspaceVm}
            />
          )}
          {chiefSessionForDecision != null && (
            <DecisionWorkspaceHost
              session={chiefSessionForDecision}
              tenderId={item.id}
            />
          )}
        </>
      )}

      {!commandLayerActive && chiefDossierVm != null && (
        <ChiefDossierSurface
          vm={chiefDossierVm}
          expertWorkspaceVm={expertWorkspaceVm}
        />
      )}

      {!commandLayerActive && chiefSessionForDecision != null && (
        <DecisionWorkspaceHost
          session={chiefSessionForDecision}
          tenderId={item.id}
        />
      )}

      <details
        id="tender-progress-accordion"
        className="rounded-xl border border-border bg-card overflow-hidden group"
        data-tender-progress-accordion
        open={progressDefaultOpen}
      >
        <summary className="px-4 py-2.5 min-h-[44px] cursor-pointer list-none flex items-center justify-between gap-2 bg-secondary/30 border-b border-transparent group-open:border-border/60 transition-colors duration-150 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Szczegóły postępu
          </span>
          <span className="text-[10px] text-muted-foreground" aria-hidden>rozwiń</span>
        </summary>
        <div className="px-4 py-3 space-y-4">
          {commandLayerActive && (
            <TenderAnalysisStatusStrip
              item={item}
              swz={swz}
              bidProposal={ownerFinanceProposal}
              dossierBuilding={dossierBuilding}
              dossierSaving={dossierSaving}
              autoRunning={autoRunning}
              kosztorysSession={kosztorysSession}
            />
          )}

          <TenderWorkspaceV2Panel
            item={item}
            swz={swz}
            intelligenceCtx={intelligenceCtx}
            onNavigateTab={onNavigateTab}
            hubDensity={commandLayerActive}
            skipProgressSection={commandLayerActive}
            skipInsightsSection={commandLayerActive}
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
