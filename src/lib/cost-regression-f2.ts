/**
 * COST-REGRESSION-01 EPIC A + COST-REGRESSION-02 DISCOVERY-ZIP (Variant D).
 * Classifier F2/F1 + discovery + macierz copy (pure).
 * Zero zmian Bid / COST-PIPELINE / AI Cost — tylko diagnostyka UI + gate CTA.
 */

import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { hasUsableCatalogQuantities } from "@/lib/tenders-bzp-brief";
import {
  isXlsxFilename,
  parsePlnFromKosztorysTotal,
} from "@/lib/tenders-bzp-filename";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";

/** Enum discovery UI (Epic A §5.3 · CR-02 REUSE). */
export type CostRegressionF2DiscoveryStatus =
  | "no_candidate"
  | "candidate_ready"
  | "parse_running"
  | "parse_failed";

export type CostRegressionF2PrimaryCta = "attach" | "reparse" | "none";

export interface CostRegressionF2UiCopy {
  discovery: CostRegressionF2DiscoveryStatus;
  phaseLabelPl: string;
  hintPl: string;
  primaryCta: CostRegressionF2PrimaryCta;
  secondaryCta: "attach" | null;
  /** CR-02 — top-level ZIP/7z obecny. */
  archiveCandidate: boolean;
}

export interface CostRegressionF2UiCopyOpts {
  archiveCandidate?: boolean;
  /** archive ∧ heavyDone ∧ !kosztorys.ok */
  heavyDoneEmpty?: boolean;
  /** Top-level ATH/XLSX/PDF-przedmiar (bez ZIP). */
  fileCandidate?: boolean;
}

const PDF_PRZEDMIAR_NAME_RE =
  /przedmiar|kosztorys|obmiar|ath|norma|stwior|formularz.?cen/i;

/** CR-02 — top-level ZIP/7Z. */
export function isZipOr7zFilename(name: string): boolean {
  return /\.(zip|7z)$/i.test((name || "").trim());
}

/** CR-02 — każdy top-level ZIP/7Z = archive_candidate. */
export function isArchiveCandidateFilename(name: string): boolean {
  return isZipOr7zFilename(name);
}

/** Nazwa pliku wygląda na kandydata przedmiaru (ATH/XLSX/PDF) — Epic A, bez ZIP. */
export function isPrzedmiarCandidateFilename(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  if (isKosztorysPreviewExt(n)) return true;
  if (isXlsxFilename(n)) return true;
  if (isPdfFilename(n) && PDF_PRZEDMIAR_NAME_RE.test(n)) return true;
  return false;
}

function collectTopLevelFilenames(item: TenderPipelineItem): string[] {
  const names: string[] = [];
  const uploaded = item.uploadedFile?.filename;
  if (uploaded) names.push(uploaded);
  for (const doc of item.bzpDocuments ?? []) {
    if (doc.filename) names.push(doc.filename);
  }
  for (const file of item.externalDocDiscovery?.files ?? []) {
    if (file.filename) names.push(file.filename);
  }
  return names;
}

/** CR-02 — czy w itemie jest top-level ZIP/7Z. */
export function hasArchiveCandidate(item: TenderPipelineItem): boolean {
  for (const name of collectTopLevelFilenames(item)) {
    if (isArchiveCandidateFilename(name)) return true;
  }
  const gate = deriveUnifiedAttachmentGate(item);
  for (const ref of gate.refs) {
    if (isArchiveCandidateFilename(ref.filename)) return true;
  }
  return false;
}

/** Epic A — ATH/XLSX/PDF top-level (bez archive). */
export function hasFilePrzedmiarCandidate(item: TenderPipelineItem): boolean {
  const uploaded = item.uploadedFile?.filename;
  if (uploaded && isPrzedmiarCandidateFilename(uploaded)) return true;

  for (const doc of item.bzpDocuments ?? []) {
    if (isPrzedmiarCandidateFilename(doc.filename || "")) return true;
  }
  for (const file of item.externalDocDiscovery?.files ?? []) {
    if (isPrzedmiarCandidateFilename(file.filename || "")) return true;
  }

  const gate = deriveUnifiedAttachmentGate(item);
  if (gate.heavyEligibleCount > 0) {
    for (const ref of gate.refs) {
      if (isPrzedmiarCandidateFilename(ref.filename)) return true;
    }
    if (gate.sources.hasUpload && uploaded && isPrzedmiarCandidateFilename(uploaded)) {
      return true;
    }
  }
  return false;
}

/** Epic A + CR-02: plik kosztowy LUB archive_candidate. */
export function hasPrzedmiarCandidate(item: TenderPipelineItem): boolean {
  return hasFilePrzedmiarCandidate(item) || hasArchiveCandidate(item);
}

/**
 * F1 (Epic B — tylko rozróżnienie copy):
 * kosztorys.ok + 0 rows + brak usable catalogQuantities + brak ATH total > 0.
 */
export function isCostRegressionF1(item: TenderPipelineItem): boolean {
  const k = item.tenderDossier?.kosztorys;
  if (!k?.ok) return false;
  const rows = k.rows ?? [];
  if (rows.length > 0) return false;
  if (hasUsableCatalogQuantities(k.catalogQuantities)) return false;
  const ath = parsePlnFromKosztorysTotal(k.totalValue, k.currency);
  if (ath != null && ath > 0) return false;
  return true;
}

/**
 * F2: brak / nie-ok kosztorysu w dossier — i nie F1.
 */
export function isCostRegressionF2(item: TenderPipelineItem): boolean {
  if (item.tenderDossier?.kosztorys?.ok) return false;
  return !isCostRegressionF1(item);
}

/** CR-02 §3.2 — priorytet discovery. */
export function resolveCostRegressionF2DiscoveryStatus(input: {
  item: TenderPipelineItem;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  dossierParseFailed?: boolean;
}): CostRegressionF2DiscoveryStatus | null {
  if (!isCostRegressionF2(input.item)) return null;
  if (input.dossierBuilding || input.dossierSaving || input.autoRunning) {
    return "parse_running";
  }
  const archive = hasArchiveCandidate(input.item);
  const heavyDone = tenderDossierHeavyParseDone(input.item.tenderDossier);
  if (archive && heavyDone && !input.item.tenderDossier?.kosztorys?.ok) {
    return "parse_failed";
  }
  if (input.dossierParseFailed) return "parse_failed";
  if (hasPrzedmiarCandidate(input.item)) return "candidate_ready";
  return "no_candidate";
}

/** Macierz komunikatów Epic A §7.1 + CR-02 §4. */
export function resolveCostRegressionF2UiCopy(
  discovery: CostRegressionF2DiscoveryStatus,
  opts?: CostRegressionF2UiCopyOpts,
): CostRegressionF2UiCopy {
  const archiveCandidate = Boolean(opts?.archiveCandidate);
  const heavyDoneEmpty = Boolean(opts?.heavyDoneEmpty);
  const fileCandidate = Boolean(opts?.fileCandidate);
  const archiveOnlyReady = archiveCandidate && !fileCandidate;

  switch (discovery) {
    case "no_candidate":
      return {
        discovery,
        phaseLabelPl: "Brak przedmiaru w dokumentach",
        hintPl:
          "Dołącz ATH, XLSX, PDF przedmiaru lub archiwum ZIP z kosztorysem — bez tego nie da się wyliczyć oferty.",
        primaryCta: "attach",
        secondaryCta: null,
        archiveCandidate,
      };
    case "candidate_ready":
      if (archiveOnlyReady) {
        return {
          discovery,
          phaseLabelPl: "W dokumentach jest archiwum ZIP",
          hintPl:
            "Uruchom analizę kosztorysu — system przeszuka ZIP pod kątem ATH/XLSX/PDF. To nie gwarantuje ceny oferty.",
          primaryCta: "reparse",
          secondaryCta: "attach",
          archiveCandidate,
        };
      }
      return {
        discovery,
        phaseLabelPl: "Brak odczytanego kosztorysu",
        hintPl:
          "W dokumentach jest kandydat przedmiaru — uruchom ponownie analizę kosztorysu.",
        primaryCta: "reparse",
        secondaryCta: "attach",
        archiveCandidate,
      };
    case "parse_running":
      return {
        discovery,
        phaseLabelPl: "Trwa analiza kosztorysu…",
        hintPl: "Po zakończeniu wycena uruchomi się automatycznie.",
        primaryCta: "none",
        secondaryCta: null,
        archiveCandidate,
      };
    case "parse_failed":
      if (archiveCandidate && heavyDoneEmpty) {
        return {
          discovery,
          phaseLabelPl: "Nie znaleziono kosztorysu w archiwum ZIP",
          hintPl:
            "Heavy przeanalizował załączniki ZIP, ale nie powstał snapshot kosztorysu. Sprawdź zawartość ZIP (ATH/XLSX/PDF) lub dołącz inny plik. To nie awaria kalkulatora oferty.",
          primaryCta: "reparse",
          secondaryCta: "attach",
          archiveCandidate,
        };
      }
      return {
        discovery,
        phaseLabelPl: "Nie udało się odczytać kosztorysu",
        hintPl:
          "Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.",
        primaryCta: "reparse",
        secondaryCta: "attach",
        archiveCandidate,
      };
    default: {
      const _exhaustive: never = discovery;
      return _exhaustive;
    }
  }
}

/** Buduje discovery + copy z kontekstem itemu (CR-02). */
export function resolveCostRegressionF2Presentation(input: {
  item: TenderPipelineItem;
  dossierBuilding?: boolean;
  dossierSaving?: boolean;
  autoRunning?: boolean;
  dossierParseFailed?: boolean;
}): CostRegressionF2UiCopy | null {
  const discovery = resolveCostRegressionF2DiscoveryStatus(input);
  if (!discovery) return null;
  const archiveCandidate = hasArchiveCandidate(input.item);
  const heavyDone = tenderDossierHeavyParseDone(input.item.tenderDossier);
  return resolveCostRegressionF2UiCopy(discovery, {
    archiveCandidate,
    heavyDoneEmpty: heavyDone && !input.item.tenderDossier?.kosztorys?.ok,
    fileCandidate: hasFilePrzedmiarCandidate(input.item),
  });
}

/** Copy F1 (Epic B lite). */
export function resolveCostRegressionF1UiCopy(): {
  phaseLabelPl: string;
  hintPl: string;
} {
  return {
    phaseLabelPl: "Przedmiar bez pozycji",
    hintPl:
      "Plik kosztorysu jest, ale bez pozycji / ilości do wyceny. To nie brak dokumentu.",
  };
}

/** Guard CTA re-parse (AC-A11 / AC-02-8). */
export function canRetryCostRegressionF2Parse(
  item: TenderPipelineItem,
  opts?: { parseRunning?: boolean },
): boolean {
  if (!isCostRegressionF2(item)) return false;
  if (opts?.parseRunning) return false;
  return true;
}

/** Thin adapter: wywołaj istniejący retry tylko przy F2. */
export function triggerCostRegressionF2Reparse(input: {
  item: TenderPipelineItem;
  parseRunning?: boolean;
  retry: () => void;
}): boolean {
  if (!canRetryCostRegressionF2Parse(input.item, { parseRunning: input.parseRunning })) {
    return false;
  }
  input.retry();
  return true;
}
