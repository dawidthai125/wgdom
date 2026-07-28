/**
 * TRE-01 Slice A — Offer Run (thin orchestrator model).
 * Mapuje sygnały istniejącego pipeline/runtime → status przebiegu.
 * REUSE: nie wywołuje parse / Edge / sync.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderTrustAssessment } from "@/lib/tender-trust-layer";
import { PipelineState } from "@/lib/tender-pipeline/tender-pipeline-types";

/** Session-only (nie kw-tenders-pipeline). */
export const TRE_01_OFFER_RUN_ID_LS_PREFIX = "kw-tre-01-offer-run-id:";

/** Memory-first store (Node / private mode / quota). */
const offerRunIdMemory = new Map<string, string>();

export type OfferRunPhase =
  | "started"
  | "documents"
  | "pricing"
  | "ready"
  | "degraded"
  | "failed";

export type OfferRunLifecycleStatus =
  | "running"
  | "ready"
  | "review_required"
  | "insufficient_data"
  | "failed";

export interface OfferRunRuntimeSignals {
  pipelineState: PipelineState;
  autoRunning: boolean;
  dossierBuilding: boolean;
  dossierSaving: boolean;
  dossierParseFailed: boolean;
  parseErrorMessage: string | null;
  pricingReadyPartial: boolean;
  pricingReadyFinal: boolean;
  bidProposal: TenderBidProposal | null;
  trustAssessment: TenderTrustAssessment;
  discoveryMergedItem: TenderPipelineItem;
}

export interface OfferRunSnapshot {
  tenderPipelineItemId: string;
  bzpRef: string;
  tenderTitle: string;
  phase: OfferRunPhase;
  lifecycleStatus: OfferRunLifecycleStatus;
  phaseLabelPl: string;
  documentsReadyHint: boolean;
  hasBidRecommendation: boolean;
  recommendedBidPln: number | null;
  criticalErrorMessage: string | null;
}

export function offerRunIdStorageKey(tenderPipelineItemId: string): string {
  return `${TRE_01_OFFER_RUN_ID_LS_PREFIX}${tenderPipelineItemId}`;
}

export function readStoredOfferRunId(tenderPipelineItemId: string): string | null {
  const fromMem = offerRunIdMemory.get(tenderPipelineItemId);
  if (fromMem) return fromMem;
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(offerRunIdStorageKey(tenderPipelineItemId));
    if (raw && raw.trim()) {
      offerRunIdMemory.set(tenderPipelineItemId, raw.trim());
      return raw.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredOfferRunId(tenderPipelineItemId: string, runId: string): void {
  offerRunIdMemory.set(tenderPipelineItemId, runId);
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(offerRunIdStorageKey(tenderPipelineItemId), runId);
  } catch {
    /* quota / private mode — memory-only OK */
  }
}

/** Test-only: wyczyść memory store. */
export function resetOfferRunIdMemoryForTests(): void {
  offerRunIdMemory.clear();
}

function extractRecommendedBidPln(bid: TenderBidProposal | null): number | null {
  if (!bid) return null;
  const n = bid.recommendedBidPln;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Pure mapping: istniejące sygnały runtime → snapshot Offer Run.
 */
export function deriveOfferRunSnapshot(
  signals: OfferRunRuntimeSignals,
): OfferRunSnapshot {
  const item = signals.discoveryMergedItem;
  const recommendedBidPln = extractRecommendedBidPln(signals.bidProposal);
  const hasBidRecommendation = recommendedBidPln != null;
  const trust = signals.trustAssessment.overall;
  /** I/O + dokumenty w toku — spinner OK. Pricing sam w sobie ≠ in-flight (Bid jest sync). */
  const ioBusy =
    signals.autoRunning ||
    signals.dossierBuilding ||
    signals.dossierSaving;
  const docsBusy =
    signals.pipelineState === PipelineState.Notice ||
    signals.pipelineState === PipelineState.Discovery ||
    signals.pipelineState === PipelineState.External ||
    signals.pipelineState === PipelineState.Heavy;
  const workInFlight = ioBusy || docsBusy;
  const pricingPhase =
    signals.pipelineState === PipelineState.Pricing ||
    signals.pricingReadyPartial ||
    signals.pricingReadyFinal;
  /** TRE-02-HOTFIX-01: Pricing/Ready bez ceny + brak I/O → terminal, nie wieczne „Trwa wycena…”. */
  const pricingSettledWithoutBid =
    !hasBidRecommendation &&
    !workInFlight &&
    (pricingPhase ||
      signals.pipelineState === PipelineState.Ready ||
      signals.bidProposal?.ok === false ||
      (signals.bidProposal != null && recommendedBidPln == null));

  const documentsReadyHint =
    (item.bzpDocuments?.length ?? 0) > 0 ||
    Boolean(item.uploadedFile) ||
    Boolean(item.tenderDossier?.builtAt);

  let criticalErrorMessage: string | null = null;
  if (signals.dossierParseFailed) {
    criticalErrorMessage =
      signals.parseErrorMessage?.trim() ||
      "Nie udało się przeanalizować kosztorysu / przedmiaru.";
  } else if (signals.pipelineState === PipelineState.Failed) {
    criticalErrorMessage = "Pipeline przetargu zakończył się błędem.";
  }

  let phase: OfferRunPhase = "started";
  let lifecycleStatus: OfferRunLifecycleStatus = "running";
  let phaseLabelPl = "Trwa wyliczanie…";

  if (criticalErrorMessage && !hasBidRecommendation && !workInFlight) {
    phase = "failed";
    lifecycleStatus = "insufficient_data";
    phaseLabelPl = "Brak danych krytycznych";
  } else if (hasBidRecommendation) {
    if (trust === "blocked") {
      phase = "degraded";
      lifecycleStatus = "review_required";
      phaseLabelPl = "Wymaga przeglądu";
    } else if (trust === "partial" || trust === "unknown") {
      phase = "ready";
      lifecycleStatus = "review_required";
      phaseLabelPl = "Wymaga przeglądu";
    } else {
      phase = "ready";
      lifecycleStatus = "ready";
      phaseLabelPl = "Rekomendacja gotowa";
    }
  } else if (pricingSettledWithoutBid) {
    phase = "degraded";
    lifecycleStatus = "insufficient_data";
    phaseLabelPl = "Brak rekomendowanej ceny";
  } else if (workInFlight || pricingPhase) {
    if (signals.pipelineState === PipelineState.Pricing || signals.pricingReadyPartial) {
      phase = "pricing";
      phaseLabelPl = "Trwa wycena…";
    } else if (
      signals.pipelineState === PipelineState.Heavy ||
      signals.dossierBuilding
    ) {
      phase = "documents";
      phaseLabelPl = "Analiza dokumentów…";
    } else {
      phase = "documents";
      phaseLabelPl = "Pobieranie dokumentów…";
    }
    lifecycleStatus = "running";
  } else {
    phase = documentsReadyHint ? "documents" : "started";
    lifecycleStatus = "running";
    phaseLabelPl = documentsReadyHint ? "Analiza w toku…" : "Start przebiegu…";
  }

  return {
    tenderPipelineItemId: item.id,
    bzpRef: item.bzpNumber || item.tenderId || item.id,
    tenderTitle: (item.title || item.shortTitle || "Przetarg").trim(),
    phase,
    lifecycleStatus,
    phaseLabelPl,
    documentsReadyHint,
    hasBidRecommendation,
    recommendedBidPln,
    criticalErrorMessage,
  };
}
