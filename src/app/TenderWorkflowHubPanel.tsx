/**
 * EPIC A — Workflow Hub (zakładka Przetarg): postęp, następny krok, blokery, status, operator.
 */

import type { ReactNode } from "react";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { TenderWorkspaceV2Panel } from "@/app/TenderWorkspaceV2Panel";
import {
  WorkflowHubBlockersSection,
  WorkflowHubPositionsFileDisplay,
  WorkflowHubPrepStatusDisplay,
} from "@/app/TenderWorkflowHubSections";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import { TENDER_INTELLIGENCE_SECTION_COPY } from "@/lib/tender-owner-language-pl";

export function TenderWorkflowHubPanel({
  item,
  swz,
  intelligenceCtx,
  onNavigateTab,
  onNavigateLegacy,
  onOpenPreview,
  operatorSection,
}: {
  item: TenderPipelineItem;
  swz: TenderSwzAnalysis | null | undefined;
  intelligenceCtx: TenderIntelligenceContext;
  onNavigateTab: (
    tab: TenderDetailV4TabId,
    opts?: { decyzjaWorkspace?: DecyzjaV4EmbedWorkspace },
  ) => void;
  onNavigateLegacy: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  operatorSection?: ReactNode;
}) {
  return (
    <div className="space-y-4" data-tender-workflow-hub>
      <TenderWorkspaceV2Panel
        item={item}
        swz={swz}
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
