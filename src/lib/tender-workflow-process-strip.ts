/**
 * EPIC B — Workflow Process Strip (prezentacja only).
 * Pięć etapów: Dokumenty → Analiza → Kosztorys → Wycena → Oferta.
 * Statusy z istniejących SSOT — bez nowej logiki biznesowej.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { DecyzjaV4EmbedWorkspace } from "@/lib/tender-detail-routes-v4";
import type { TenderDetailV4TabId } from "@/lib/tender-detail-routes-v4";
import {
  buildTenderAnalysisStatusRows,
  type TenderAnalysisStepState,
} from "@/lib/tender-analysis-status-ux";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type { OwnerPrepStatusLine, OwnerPrepStatusView } from "@/lib/tender-owner-view-ux";
import {
  computeWorkspaceV2AutoProgress,
  type WorkspaceV2PillarId,
  type WorkspaceV2PillarStatus,
} from "@/lib/tender-workspace-v2-ux";

export const WORKFLOW_PROCESS_STRIP_ORDER = [
  "documents",
  "analysis",
  "kosztorys",
  "wycena",
  "offer",
] as const;

export type WorkflowProcessStripStageId = (typeof WORKFLOW_PROCESS_STRIP_ORDER)[number];

export type WorkflowProcessStripStageStatus = "done" | "partial" | "missing";

export interface WorkflowProcessStripStage {
  id: WorkflowProcessStripStageId;
  label: string;
  status: WorkflowProcessStripStageStatus;
  hint?: string;
}

export interface WorkflowProcessStripNavigateTarget {
  tab: TenderDetailV4TabId;
  decyzjaWorkspace?: DecyzjaV4EmbedWorkspace;
}

export const WORKFLOW_PROCESS_STRIP_LABELS: Record<WorkflowProcessStripStageId, string> = {
  documents: "Dokumenty",
  analysis: "Analiza",
  kosztorys: "Kosztorys",
  wycena: "Wycena",
  offer: "Oferta",
};

const PILLAR_BY_STAGE: Partial<Record<WorkflowProcessStripStageId, WorkspaceV2PillarId>> = {
  documents: "documents",
  analysis: "analysis",
  kosztorys: "kosztorys",
  offer: "offer",
};

function pillarToStripStatus(status: WorkspaceV2PillarStatus): WorkflowProcessStripStageStatus {
  return status;
}

function analysisStepToStripStatus(state: TenderAnalysisStepState): WorkflowProcessStripStageStatus {
  if (state === "ready") return "done";
  if (state === "missing") return "missing";
  return "partial";
}

function prepLineToStripStatus(line: OwnerPrepStatusLine): WorkflowProcessStripStageStatus {
  if (line.icon === "ok") return "done";
  if (line.icon === "pending") return "partial";
  return "partial";
}

/** NG-08-02 — inbound UI map: aktywny tab → highlight stage (prezentacja only). */
export function resolveActiveProcessStripStageId(
  activeTab: TenderDetailV4TabId,
  _decyzjaWorkspace?: DecyzjaV4EmbedWorkspace | null,
): WorkflowProcessStripStageId | null {
  switch (activeTab) {
    case "przetarg":
      return null;
    case "dokumenty":
      return "documents";
    case "kosztorys":
      return "kosztorys";
    case "ceny":
      return "wycena";
    case "decyzja":
      return "offer";
    default:
      return null;
  }
}

export function workflowProcessStripStageToV4Navigate(
  stageId: WorkflowProcessStripStageId,
): WorkflowProcessStripNavigateTarget {
  switch (stageId) {
    case "documents":
      return { tab: "dokumenty" };
    case "analysis":
      return { tab: "dokumenty" };
    case "kosztorys":
      return { tab: "kosztorys" };
    case "wycena":
      return { tab: "ceny" };
    case "offer":
      return { tab: "decyzja", decyzjaWorkspace: "offer" };
    default:
      return { tab: "przetarg" };
  }
}

export function buildWorkflowProcessStripStages(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  prepStatus?: OwnerPrepStatusView;
  bidProposal?: TenderBidProposal | null;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  kosztorysSession?: KosztorysProcessSession;
}): WorkflowProcessStripStage[] {
  const { item, swz, prepStatus, bidProposal, dossierBuilding, dossierSaving, autoRunning, kosztorysSession } = opts;
  const progress = computeWorkspaceV2AutoProgress(item, swz);
  const pillarById = new Map(progress.pillars.map((p) => [p.id, p]));

  const analysisRows = buildTenderAnalysisStatusRows({
    item,
    swz,
    bidProposal,
    dossierBuilding,
    dossierSaving,
    autoRunning,
    kosztorysSession,
  });
  const pricingRow = analysisRows.find((r) => r.id === "pricing");

  return WORKFLOW_PROCESS_STRIP_ORDER.map((id) => {
    const label = WORKFLOW_PROCESS_STRIP_LABELS[id];

    if (id === "wycena") {
      if (prepStatus?.pricing) {
        return {
          id,
          label,
          status: prepLineToStripStatus(prepStatus.pricing),
          hint: prepStatus.pricing.text,
        };
      }
      const state = pricingRow?.state ?? "missing";
      return {
        id,
        label,
        status: analysisStepToStripStatus(state),
        hint: pricingRow?.label,
      };
    }

    const pillarId = PILLAR_BY_STAGE[id];
    const pillar = pillarId ? pillarById.get(pillarId) : undefined;
    if (pillar) {
      return {
        id,
        label,
        status: pillarToStripStatus(pillar.status),
      };
    }

    return { id, label, status: "missing" as const };
  });
}
