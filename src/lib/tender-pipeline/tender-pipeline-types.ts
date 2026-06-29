/**
 * NG-02 — typy pipeline automatyzacji przetargu (slot pod orchestrator P1).
 */

import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";
import type {
  UnifiedGateReason,
  UnifiedGateStatus,
} from "@/lib/tender-pipeline/unified-attachment-gate";

/** Etap wysokopoziomowy pipeline NG-02. */
export enum PipelineState {
  Idle = "Idle",
  Notice = "Notice",
  Discovery = "Discovery",
  External = "External",
  Heavy = "Heavy",
  Pricing = "Pricing",
  Ready = "Ready",
  Failed = "Failed",
}

export interface PipelineTimelineEntry {
  at: string;
  state: PipelineState;
  detail?: string;
  /** Dev-only — NG-02.1A Unified Gate. */
  gateStatus?: UnifiedGateStatus;
  gateReason?: UnifiedGateReason;
}

/** Wynik useTenderPipelineRuntime — SSOT dla TenderDetailPage → Panel. */
export interface TenderPipelineRuntime {
  pipelineState: PipelineState;
  autoRunning: boolean;
  dossierBuilding: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  parseErrorMessage: string | null;
  retryDossierParse: () => void;
  retryNonce: number;
  kosztorysProcessSession: KosztorysProcessSession;
  ownerFinanceProposal: TenderBidProposal | null;
  bidProposal: TenderBidProposal | null;
  trustAssessment: TenderTrustAssessment;
  /** Dev-only — pusta tablica w produkcji UI. */
  timeline: PipelineTimelineEntry[];
  /** NG-02.1A — SSOT bramki heavy (read-only dla dev timeline). */
  attachmentGateFingerprint: string;
  attachmentGateStatus: UnifiedGateStatus;
  attachmentGateReason: UnifiedGateReason;
}
