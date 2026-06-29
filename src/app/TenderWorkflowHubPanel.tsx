/**
 * EPIC A — Workflow Hub (zakładka Przetarg): postęp, blokery, status, operator.
 */

import type { ReactNode } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { TenderWorkspaceV2Panel } from "@/app/TenderWorkspaceV2Panel";
import { TenderWorkflowProcessStrip } from "@/app/TenderWorkflowProcessStrip";
import { TenderWorkflowPrimaryAction } from "@/app/TenderWorkflowPrimaryAction";
import {
  WorkflowHubBlockersSection,
  WorkflowHubPositionsFileDisplay,
  WorkflowHubPrepStatusDisplay,
} from "@/app/TenderWorkflowHubSections";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { TENDER_INTELLIGENCE_SECTION_COPY } from "@/lib/tender-owner-language-pl";
import { TrustBanner } from "@/app/tenders/trust/TrustBanner";
import { TrustChip } from "@/app/tenders/trust/TrustChip";
import { getTrustDimensionsForSurface, trustDimensionToV4Tab } from "@/lib/tender-trust-ui";

export function TenderWorkflowHubPanel({
  item,
  swz,
  intelligenceCtx,
  onNavigateTab,
  onNavigateLegacy,
  onOpenPreview,
  operatorSection,
  ownerFinanceProposal,
  ownerDecision,
  participationResult,
  kosztorysSession,
  autoRunning,
  dossierBuilding,
  dossierSaving,
  analyzing,
  trustAssessment,
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
  operatorSection?: ReactNode;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  participationResult?: ParticipationCheckResult | null;
  kosztorysSession?: KosztorysProcessSession;
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  analyzing?: boolean;
}) {
  return (
    <div className="space-y-4" data-tender-workflow-hub>
      <TrustBanner assessment={trustAssessment} variant="overall" />

      <div className="flex flex-wrap gap-1.5" data-tender-trust-hub-chips>
        {getTrustDimensionsForSurface(trustAssessment, "hub").map((dim) => (
          <TrustChip
            key={dim.id}
            dimension={dim}
            onClick={() => onNavigateTab(trustDimensionToV4Tab(dim.id))}
          />
        ))}
      </div>

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

      <TenderWorkspaceV2Panel
        item={item}
        swz={swz}
        intelligenceCtx={intelligenceCtx}
        onNavigateTab={onNavigateTab}
      />

      <WorkflowHubPrepStatusDisplay status={intelligenceCtx.prepStatus} />

      <WorkflowHubBlockersSection ctx={intelligenceCtx} />

      <WorkflowHubPositionsFileDisplay
        view={intelligenceCtx.positions}
        item={item}
        onNavigate={onNavigateLegacy}
        onOpenPreview={onOpenPreview}
      />

      {operatorSection}

      <p className="text-[10px] text-muted-foreground px-1">
        Szczegóły decyzji biznesowej (GO / HOLD / ODPUŚĆ) — zakładka{" "}
        <button
          type="button"
          className="text-primary font-medium hover:underline"
          onClick={() => onNavigateTab("decyzja")}
        >
          {TENDER_INTELLIGENCE_SECTION_COPY.verdict}
        </button>
        .
      </p>
    </div>
  );
}
