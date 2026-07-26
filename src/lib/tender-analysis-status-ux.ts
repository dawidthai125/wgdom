/**
 * P3-UX-001 / P3-UX-003 — komunikaty stanu analizy (tylko prezentacja, bez zmian pipeline).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import {
  deriveKosztorysProcessPhase,
  isKosztorysProcessInProgress,
  type KosztorysProcessSession,
} from "@/lib/tender-kosztorys-process-phase";

export const KOSZTORYS_AWAITING_PARSE_LABEL = "⏳ Analiza dokumentów w toku";
export const KOSZTORYS_AWAITING_PARSE_HINT =
  "Analiza uruchamia się automatycznie w tle. Jeśli utknęła — użyj „Uruchom ponownie analizę”.";

export const PRICING_AWAITING_TAB_LABEL = "⏳ Wycena oczekuje na przetworzenie";
export const PRICING_AWAITING_TAB_HINT =
  "Wycena startuje automatycznie po analizie dokumentów. W razie potrzeby otwórz zakładkę Wycena.";

export const PRICING_NEEDS_ANALYSIS_LABEL = "Wycena wymaga analizy";
export const PRICING_NEEDS_ANALYSIS_HINT =
  "Dokumenty są gotowe — wycena uruchomi się automatycznie lub na zakładce Wycena.";

export type TenderAnalysisStepState = "ready" | "pending" | "warn" | "missing";

export interface TenderAnalysisStatusRow {
  id: "notice" | "documents" | "kosztorys" | "pricing";
  label: string;
  state: TenderAnalysisStepState;
}

export function countTenderAttachments(item: TenderPipelineItem): number {
  return (item.bzpDocuments?.length ?? 0)
    + (item.uploadedFile ? 1 : 0)
    + (item.externalDocDiscovery?.files?.length ?? 0);
}

/** P3-UX-001 — załączniki są, ale ciężkie parsowanie dossier jeszcze nie zakończone. */
export function isKosztorysAwaitingHeavyParse(item: TenderPipelineItem): boolean {
  if (countTenderAttachments(item) === 0) return false;
  if (tenderDossierHeavyParseDone(item.tenderDossier)) return false;
  return resolvedCostStatus(item) === "NOT_FOUND";
}

/** Kosztorys przetworzony, ale kalkulator nie był jeszcze uruchomiony (lazy wycena na Przeglądzie). */
export function isPricingAwaitingLazyEvaluation(
  item: TenderPipelineItem,
  bidProposal?: TenderBidProposal | null,
  bidProposalOk?: boolean,
  pricingDeferred = false,
): boolean {
  if (!pricingDeferred) return false;
  if (item.ourEstimatePln != null) return false;
  if (bidProposal?.ok && bidProposal.recommendedBidPln != null) return false;
  if (bidProposalOk) return false;
  if (!tenderDossierHeavyParseDone(item.tenderDossier)) return false;
  return resolvedCostStatus(item) !== "NOT_FOUND";
}

export function buildTenderAnalysisStatusRows(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  bidProposal?: TenderBidProposal | null;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  kosztorysSession?: KosztorysProcessSession;
}): TenderAnalysisStatusRow[] {
  const { item, bidProposal, dossierBuilding, dossierSaving, autoRunning, kosztorysSession } = opts;
  const session: KosztorysProcessSession = kosztorysSession ?? {
    autoRunning,
    dossierBuilding,
    dossierSaving,
    lazyEnabled: true,
  };
  const processPhase = deriveKosztorysProcessPhase(item, session);
  const docCount = countTenderAttachments(item);
  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const costStatus = resolvedCostStatus(item);
  const kosztorysAwaiting = isKosztorysAwaitingHeavyParse(item);
  const pricingReady = item.ourEstimatePln != null
    || (bidProposal?.ok && bidProposal.recommendedBidPln != null);
  const pricingAwaitingLazy = isPricingAwaitingLazyEvaluation(item, bidProposal, undefined, true);

  const noticeState: TenderAnalysisStepState = item.noticeHtml || item.noticeNumber
    ? "ready"
    : autoRunning
      ? "pending"
      : "missing";

  const documentsState: TenderAnalysisStepState = docCount > 0
    ? "ready"
    : autoRunning || (item.tenderId && !item.documentsFetchedAt)
      ? "pending"
      : "missing";

  let kosztorysState: TenderAnalysisStepState;
  if (dossierBuilding || dossierSaving || kosztorysAwaiting) {
    kosztorysState = "pending";
  } else if (costStatus !== "NOT_FOUND") {
    kosztorysState = "ready";
  } else if (heavyDone) {
    kosztorysState = docCount > 0 ? "warn" : "missing";
  } else {
    kosztorysState = docCount > 0 ? "pending" : "missing";
  }

  let pricingState: TenderAnalysisStepState;
  if (pricingReady) {
    pricingState = "ready";
  } else if (dossierBuilding || dossierSaving || kosztorysAwaiting) {
    pricingState = "pending";
  } else if (pricingAwaitingLazy) {
    pricingState = "warn";
  } else if (heavyDone && costStatus === "NOT_FOUND") {
    pricingState = "warn";
  } else if (docCount > 0 && !heavyDone) {
    pricingState = "pending";
  } else {
    pricingState = "missing";
  }

  const kosztorysRowLabel = kosztorysState === "pending"
    && (dossierBuilding || dossierSaving || kosztorysAwaiting)
    && (isKosztorysProcessInProgress(processPhase) || processPhase.id === "waiting_data")
    ? processPhase.label
    : "Kosztorys";

  return [
    { id: "notice", label: "Ogłoszenie", state: noticeState },
    { id: "documents", label: "Dokumenty", state: documentsState },
    { id: "kosztorys", label: kosztorysRowLabel, state: kosztorysState },
    { id: "pricing", label: "Wycena", state: pricingState },
  ];
}
