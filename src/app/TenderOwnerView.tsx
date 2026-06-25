/**
 * @deprecated EPIC A — użyj TenderDecisionView (Decyzja) lub TenderWorkflowHubPanel (Przetarg).
 * Zachowany dla testów migracyjnych i kompatybilności importów.
 */

import type { ReactNode } from "react";
import { TenderDecisionView } from "@/app/TenderDecisionView";
import type { TenderIntelligenceContext } from "@/lib/tender-intelligence-context";
import type { TenderWorkspaceTabId } from "@/lib/tender-workspace-ux";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";

/** @deprecated Użyj WorkflowHubPrepStatusDisplay */
export { WorkflowHubPrepStatusDisplay as OwnerPrepStatusDisplay } from "@/app/TenderWorkflowHubSections";

export interface TenderOwnerViewProps {
  intelligenceCtx: TenderIntelligenceContext;
  onNavigate: (tab: TenderWorkspaceTabId) => void;
  onOpenPreview: (previewItem: InspectorFileItem) => void;
  /** @deprecated Workflow hub przeniesiony na zakładkę Przetarg — ignorowane. */
  detailsSection?: ReactNode;
}

/** Decyzja-only — bez workflow hub (EPIC A). */
export function TenderOwnerView({
  intelligenceCtx,
}: TenderOwnerViewProps) {
  return <TenderDecisionView intelligenceCtx={intelligenceCtx} />;
}
