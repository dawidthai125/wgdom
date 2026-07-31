/**
 * P0/P1 UX — SSOT fazy procesu kosztorysu (prezentacja only, bez zmian pipeline).
 */
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { countTenderAttachments } from "@/lib/tender-analysis-status-ux";
import { canRunDocumentDiscovery } from "@/lib/tender-document-discovery";
import { getDossierTraceLog, type DossierTraceStep } from "@/lib/tender-dossier-trace";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";

export type KosztorysProcessPhaseId =
  | "waiting_data"
  | "downloading_docs"
  | "preparing_docs"
  | "parsing_kosztorys"
  | "saving"
  | "ready"
  | "not_found"
  | "failed";

/** 13 faz technicznych E0–E12 (spec state machine). E6 ma podfazy a/b/c. */
export type KosztorysTechnicalPhaseId =
  | "e0"
  | "e1"
  | "e2"
  | "e3"
  | "e4"
  | "e5"
  | "e6"
  | "e7"
  | "e8"
  | "e9"
  | "e10"
  | "e11"
  | "e12";

export type KosztorysE6SubPhase = "e6a" | "e6b" | "e6c";

export type KosztorysProcessTone = "neutral" | "progress" | "success" | "warning" | "error";

export interface KosztorysProcessSession {
  /** Bootstrap dokumentów / notice (useTenderDocumentsBootstrap). */
  autoRunning?: boolean;
  /** Lazy heavy parse w toku (useTenderDossierHeavyLazy). */
  dossierBuilding?: boolean;
  /** Parse zakończony — zapis do stanu / KV (useTenderDossierHeavyLazy). */
  dossierSaving?: boolean;
  /** Ostatni parse zakończony błędem (sesja UI). */
  dossierParseFailed?: boolean;
  parseErrorMessage?: string | null;
  /** Hook lazy włączony na bieżącej zakładce. */
  lazyEnabled?: boolean;
  /** NG-02 — docs są, heavy parse jeszcze nie wystartował (faza e5). */
  pipelineQueued?: boolean;
  /** E12 — proces trwa dłużej niż zwykle (P2; opcjonalny sygnał sesji). */
  parseStale?: boolean;
}

export interface KosztorysProcessPhaseView {
  id: KosztorysProcessPhaseId;
  label: string;
  hint?: string;
  tone: KosztorysProcessTone;
  showRetry?: boolean;
  /** Faza techniczna E0–E12 (telemetria UI / data-attr). */
  technicalId?: KosztorysTechnicalPhaseId;
  /** Podfaza E6 — prefetch / download / parser. */
  e6Sub?: KosztorysE6SubPhase;
}

export const KOSZTORYS_PROCESS_IN_PROGRESS: ReadonlySet<KosztorysProcessPhaseId> = new Set([
  "downloading_docs",
  "preparing_docs",
  "parsing_kosztorys",
  "saving",
]);

const E6_PARSE_STEPS: ReadonlySet<DossierTraceStep> = new Set([
  "ath_parsed",
  "kosztorys_created",
  "document_parsed",
  "cost_estimate_extracted",
]);

const E6_DOWNLOAD_STEPS: ReadonlySet<DossierTraceStep> = new Set([
  "document_downloaded",
  "zip_downloaded",
  "ath_bytes_loaded",
]);

const E6_PREP_STEPS: ReadonlySet<DossierTraceStep> = new Set([
  "zip_opened",
  "zip_inner_files_found",
  "document_classified",
  "cost_document_discovered",
  "document_discovered",
]);

function hasArchiveAttachments(docs: TenderPipelineItem["bzpDocuments"]): boolean {
  return (docs ?? []).some((d) => /\.(zip|7z)$/i.test(d.filename));
}

function hasNoticeAnchor(item: TenderPipelineItem): boolean {
  return Boolean(item.noticeNumber?.trim() || item.noticeHtml?.trim());
}

function resolveE6SubPhase(
  item: TenderPipelineItem,
  hasArchives: boolean,
): KosztorysE6SubPhase {
  const step = getDossierTraceLog()[0]?.step ?? "";
  if (
    E6_PARSE_STEPS.has(step as DossierTraceStep)
    || step === "ath_detected"
  ) {
    return "e6c";
  }
  if (
    E6_DOWNLOAD_STEPS.has(step as DossierTraceStep)
    || step.includes("download")
    || step.includes("bytes")
  ) {
    return "e6b";
  }
  if (
    E6_PREP_STEPS.has(step as DossierTraceStep)
    || step.includes("zip_open")
    || step.includes("inner_files")
    || step.includes("7z_")
  ) {
    return "e6a";
  }
  if (hasArchives) return "e6a";
  return "e6c";
}

function technicalPhaseView(
  technicalId: KosztorysTechnicalPhaseId,
  e6Sub?: KosztorysE6SubPhase,
  parseErrorMessage?: string | null,
): KosztorysProcessPhaseView {
  const businessId = mapKosztorysTechnicalToBusiness(technicalId, e6Sub);
  const base = TECHNICAL_PHASE_COPY[technicalId];
  let hint = base.hint;
  if (technicalId === "e6" && e6Sub) {
    hint = E6_SUB_HINTS[e6Sub] ?? hint;
  }
  if (technicalId === "e11") {
    hint = parseErrorMessage?.trim()
      || "Nie udało się dokończyć odczytu kosztorysu. Spróbuj ponownie.";
  }
  return {
    id: businessId,
    label: base.label,
    hint,
    tone: base.tone,
    showRetry: technicalId === "e11",
    technicalId,
    e6Sub,
  };
}

const TECHNICAL_PHASE_COPY: Record<
  KosztorysTechnicalPhaseId,
  { label: string; hint?: string; tone: KosztorysProcessTone }
> = {
  e0: {
    label: "Oczekiwanie na dane",
    hint: "Brak identyfikatora przetargu BZP.",
    tone: "neutral",
  },
  e1: {
    label: "Oczekiwanie na dane ogłoszenia",
    hint: "Brak numeru lub treści ogłoszenia — wymagane do pobrania załączników.",
    tone: "neutral",
  },
  e2: {
    label: "Pobieranie treści ogłoszenia",
    hint: "Odczyt HTML ogłoszenia z BZP.",
    tone: "progress",
  },
  e3: {
    label: "Wyszukiwanie załączników",
    hint: "Skan listy plików na platformie zamawiającego.",
    tone: "progress",
  },
  e4: {
    label: "Oczekiwanie na listę z platformy",
    hint: "Załącznik jest w aplikacji — poczekaj na listę BZP lub odśwież w Dokumenty.",
    tone: "neutral",
  },
  e5: {
    label: "Gotowe do analizy",
    hint: "Rozpoczynanie analizy załączników…",
    tone: "progress",
  },
  e6: {
    label: "Odczyt przedmiaru",
    tone: "progress",
  },
  e7: {
    label: "Zapisywanie wyników",
    hint: "Finalizacja wyniku analizy.",
    tone: "progress",
  },
  e8: {
    label: "Zapisywanie wyników",
    hint: "Synchronizacja z pamięcią aplikacji.",
    tone: "progress",
  },
  e9: {
    label: "Przedmiar gotowy",
    tone: "success",
  },
  e10: {
    label: "Zamawiający nie udostępnił kosztorysu inwestorskiego",
    hint: "Typowe w postępowaniach publicznych — sprawdź przedmiar PDF (KNR/ilości).",
    tone: "neutral",
  },
  e11: {
    label: "Analiza została przerwana",
    tone: "error",
  },
  e12: {
    label: "Odczyt przedmiaru",
    hint: "Proces trwa dłużej niż zwykle — możesz spróbować ponownie.",
    tone: "progress",
  },
};

const E6_SUB_HINTS: Record<KosztorysE6SubPhase, string> = {
  e6a: "Odczyt archiwów i przygotowanie listy plików.",
  e6b: "Pobieranie plików z platformy zamawiającego.",
  e6c: "Odczyt pozycji przedmiaru z załączników.",
};

/** Mapowanie 13 faz technicznych → 8 faz biznesowych (P1). */
export function mapKosztorysTechnicalToBusiness(
  technicalId: KosztorysTechnicalPhaseId,
  e6Sub?: KosztorysE6SubPhase,
): KosztorysProcessPhaseId {
  switch (technicalId) {
    case "e0":
    case "e1":
    case "e4":
      return "waiting_data";
    case "e2":
    case "e3":
      return "downloading_docs";
    case "e5":
      return "preparing_docs";
    case "e6":
      if (e6Sub === "e6c") return "parsing_kosztorys";
      if (e6Sub === "e6b") return "preparing_docs";
      return "preparing_docs";
    case "e7":
    case "e8":
      return "saving";
    case "e9":
      return "ready";
    case "e10":
      return "not_found";
    case "e11":
      return "failed";
    case "e12":
      return "parsing_kosztorys";
    default:
      return "waiting_data";
  }
}

/** SSOT — faza techniczna E0–E12 z item + sesji (bez zmian pipeline). */
export function deriveKosztorysTechnicalPhase(
  item: TenderPipelineItem,
  session: KosztorysProcessSession = {},
): { technicalId: KosztorysTechnicalPhaseId; e6Sub?: KosztorysE6SubPhase } {
  const {
    autoRunning = false,
    dossierBuilding = false,
    dossierSaving = false,
    dossierParseFailed = false,
    lazyEnabled = true,
    parseStale = false,
  } = session;

  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  const kosztorysOk = Boolean(item.tenderDossier?.kosztorys?.ok);
  const attachmentCount = countTenderAttachments(item);
  const gate = deriveUnifiedAttachmentGate(item);
  const canDiscover = canRunDocumentDiscovery(item);
  const hasArchives = hasArchiveAttachments(item.bzpDocuments);

  if (dossierParseFailed) return { technicalId: "e11" };

  if (heavyDone) {
    return kosztorysOk ? { technicalId: "e9" } : { technicalId: "e10" };
  }

  if (dossierSaving) {
    return dossierBuilding
      ? { technicalId: "e7" }
      : { technicalId: "e8" };
  }

  if (dossierBuilding) {
    if (parseStale) return { technicalId: "e12", e6Sub: resolveE6SubPhase(item, hasArchives) };
    const e6Sub = resolveE6SubPhase(item, hasArchives);
    return { technicalId: "e6", e6Sub };
  }

  if (autoRunning) {
    const loadingNotice = Boolean(item.noticeNumber?.trim()) && !item.noticeHtml?.trim();
    return { technicalId: loadingNotice ? "e2" : "e3" };
  }

  if (!item.tenderId?.trim()) return { technicalId: "e0" };

  if (attachmentCount > 0 && gate.heavyEligibleCount === 0 && !gate.canStartHeavyParse) {
    return { technicalId: "e4" };
  }

  if (!canDiscover && gate.heavyEligibleCount === 0 && !gate.canStartHeavyParse && !hasNoticeAnchor(item)) {
    return { technicalId: "e1" };
  }

  if (!canDiscover && gate.heavyEligibleCount === 0 && !gate.canStartHeavyParse) {
    return { technicalId: "e1" };
  }

  if (!gate.canStartHeavyParse && gate.totalAttachmentCount === 0) {
    return { technicalId: "e1" };
  }

  if (gate.canStartHeavyParse && lazyEnabled) return { technicalId: "e5" };

  return { technicalId: "e0" };
}

/** Jedno źródło prawdy — faza procesu kosztorysu dla UI. */
export function deriveKosztorysProcessPhase(
  item: TenderPipelineItem,
  session: KosztorysProcessSession = {},
): KosztorysProcessPhaseView {
  const { technicalId, e6Sub } = deriveKosztorysTechnicalPhase(item, session);
  return technicalPhaseView(technicalId, e6Sub, session.parseErrorMessage);
}

export function isKosztorysProcessInProgress(phase: KosztorysProcessPhaseView): boolean {
  return KOSZTORYS_PROCESS_IN_PROGRESS.has(phase.id);
}

/** P1 — etykieta procesu zamiast stałego „Kosztorys oczekuje na przetworzenie”. */
export function resolveKosztorysAwaitingParseDisplay(
  item: TenderPipelineItem,
  session: KosztorysProcessSession = {},
): { label: string; hint: string | null } | null {
  const phase = deriveKosztorysProcessPhase(item, session);
  if (phase.id === "ready" || phase.id === "not_found" || phase.id === "failed") {
    return null;
  }
  if (!isKosztorysProcessInProgress(phase) && phase.id !== "waiting_data") {
    return null;
  }
  const docCount = item.bzpDocuments?.length ?? 0;
  const attachmentCount = countTenderAttachments(item);
  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);
  if (attachmentCount === 0 || heavyDone) return null;
  if (docCount === 0 && phase.id === "waiting_data" && attachmentCount > 0) {
    return { label: phase.label, hint: phase.hint ?? null };
  }
  if (isKosztorysProcessInProgress(phase)) {
    return { label: phase.label, hint: phase.hint ?? null };
  }
  return null;
}

/** Buduje sesję z sygnałów hooków (Owner View / Wycena / status strip). */
export function buildKosztorysProcessSession(opts: {
  autoRunning?: boolean;
  dossierBuilding?: boolean;
  /** NG11-A1 — metadata enrichment w toku. */
  dossierEnriching?: boolean;
  dossierSaving?: boolean;
  dossierParseFailed?: boolean;
  parseErrorMessage?: string | null;
  lazyEnabled?: boolean;
  pipelineQueued?: boolean;
}): KosztorysProcessSession {
  return { ...opts, lazyEnabled: opts.lazyEnabled ?? true };
}
