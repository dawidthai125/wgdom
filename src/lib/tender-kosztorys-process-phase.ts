/**
 * P0 UX — SSOT fazy procesu kosztorysu (prezentacja only, bez zmian pipeline).
 */
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { canRunDocumentDiscovery } from "@/lib/tender-document-discovery";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";

export type KosztorysProcessPhaseId =
  | "waiting_data"
  | "downloading_docs"
  | "preparing_docs"
  | "parsing_kosztorys"
  | "saving"
  | "ready"
  | "not_found"
  | "failed";

export type KosztorysProcessTone = "neutral" | "progress" | "success" | "warning" | "error";

export interface KosztorysProcessSession {
  /** Bootstrap dokumentów / notice (useTenderDocumentsBootstrap). */
  autoRunning?: boolean;
  /** Lazy heavy parse w toku (useTenderDossierHeavyLazy). */
  dossierBuilding?: boolean;
  /** Ostatni parse zakończony błędem (sesja UI). */
  dossierParseFailed?: boolean;
  parseErrorMessage?: string | null;
  /** Hook lazy włączony na bieżącej zakładce. */
  lazyEnabled?: boolean;
}

export interface KosztorysProcessPhaseView {
  id: KosztorysProcessPhaseId;
  label: string;
  hint?: string;
  tone: KosztorysProcessTone;
  showRetry?: boolean;
}

export const KOSZTORYS_PROCESS_IN_PROGRESS: ReadonlySet<KosztorysProcessPhaseId> = new Set([
  "downloading_docs",
  "preparing_docs",
  "parsing_kosztorys",
  "saving",
]);

function hasArchiveAttachments(docs: TenderPipelineItem["bzpDocuments"]): boolean {
  return (docs ?? []).some((d) => /\.(zip|7z)$/i.test(d.filename));
}

/** Jedno źródło prawdy — faza procesu kosztorysu dla UI. */
export function deriveKosztorysProcessPhase(
  item: TenderPipelineItem,
  session: KosztorysProcessSession = {},
): KosztorysProcessPhaseView {
  const {
    autoRunning = false,
    dossierBuilding = false,
    dossierParseFailed = false,
    parseErrorMessage,
    lazyEnabled = true,
  } = session;

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const kosztorysOk = Boolean(item.tenderDossier?.kosztorys?.ok);
  const docCount = item.bzpDocuments?.length ?? 0;
  const attachmentCount = countTenderAttachments(item);
  const canDiscover = canRunDocumentDiscovery(item);
  const hasArchives = hasArchiveAttachments(item.bzpDocuments);

  if (dossierParseFailed) {
    return {
      id: "failed",
      label: "Analiza została przerwana",
      hint: parseErrorMessage?.trim()
        || "Nie udało się dokończyć odczytu kosztorysu. Spróbuj ponownie.",
      tone: "error",
      showRetry: true,
    };
  }

  if (heavyDone) {
    if (kosztorysOk) {
      return {
        id: "ready",
        label: "Kosztorys gotowy",
        tone: "success",
      };
    }
    return {
      id: "not_found",
      label: "Nie znaleziono kosztorysu",
      hint: "Przeskanowano załączniki — brak pliku ATH/PDF/XLSX z pozycjami.",
      tone: "warning",
    };
  }

  if (dossierBuilding) {
    if (hasArchives) {
      return {
        id: "preparing_docs",
        label: "Przygotowanie dokumentów",
        hint: "Odczyt archiwów i przygotowanie listy plików.",
        tone: "progress",
      };
    }
    return {
      id: "parsing_kosztorys",
      label: "Analiza kosztorysu",
      hint: "Odczyt pozycji kosztorysowych z załączników.",
      tone: "progress",
    };
  }

  if (autoRunning) {
    const loadingNotice = Boolean(item.noticeNumber?.trim()) && !item.noticeHtml?.trim();
    return {
      id: "downloading_docs",
      label: "Pobieranie dokumentów",
      hint: loadingNotice
        ? "Pobieranie treści ogłoszenia i listy załączników."
        : "Wyszukiwanie załączników na platformie zamawiającego.",
      tone: "progress",
    };
  }

  if (!item.tenderId?.trim()) {
    return {
      id: "waiting_data",
      label: "Oczekiwanie na dane",
      hint: "Brak identyfikatora przetargu BZP.",
      tone: "neutral",
    };
  }

  if (attachmentCount > 0 && docCount === 0) {
    return {
      id: "waiting_data",
      label: "Oczekiwanie na dane",
      hint: "Załącznik jest w aplikacji — poczekaj na listę z platformy lub odśwież w Dokumenty.",
      tone: "neutral",
    };
  }

  if (!canDiscover && docCount === 0) {
    return {
      id: "waiting_data",
      label: "Oczekiwanie na dane",
      hint: "Brak numeru ogłoszenia — poczekaj na załadowanie lub odśwież przetarg z BZP.",
      tone: "neutral",
    };
  }

  if (docCount === 0) {
    return {
      id: "waiting_data",
      label: "Oczekiwanie na dane",
      hint: "Brak załączników — pobieranie rozpocznie się automatycznie.",
      tone: "neutral",
    };
  }

  if (docCount > 0 && lazyEnabled) {
    return {
      id: "preparing_docs",
      label: "Przygotowanie dokumentów",
      hint: "Rozpoczynanie analizy załączników…",
      tone: "progress",
    };
  }

  return {
    id: "waiting_data",
    label: "Oczekiwanie na dane",
    tone: "neutral",
  };
}

export function isKosztorysProcessInProgress(phase: KosztorysProcessPhaseView): boolean {
  return KOSZTORYS_PROCESS_IN_PROGRESS.has(phase.id);
}
