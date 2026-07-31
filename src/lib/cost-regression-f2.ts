/**
 * COST-REGRESSION-01 EPIC A + COST-REGRESSION-02 DISCOVERY-ZIP (Variant D)
 * + COST-PARSER-01 ZIP-UNPACK (stany A/B/C presentation).
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
import {
  resolveCostParserZipState,
  resolveCostParserZipUiOverlay,
  type CostParserZipState,
} from "@/lib/cost-parser-zip-unpack";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";
import {
  DOC_D1_PDF_NAME_RE,
  DOC_DETECTION_UX_A_HINT,
  DOC_DETECTION_UX_A_LABEL,
  DOC_DETECTION_UX_B_HINT,
  DOC_DETECTION_UX_B_LABEL,
  DOC_DETECTION_UX_C_ARCHIVE_READY_HINT,
  DOC_DETECTION_UX_C_ARCHIVE_READY_LABEL,
  DOC_DETECTION_UX_C_CANDIDATE_HINT,
  DOC_DETECTION_UX_C_CANDIDATE_LABEL,
  DOC_DETECTION_UX_C_FAILED_HINT,
  DOC_DETECTION_UX_C_FAILED_LABEL,
  DOC_DETECTION_UX_C_RUNNING_HINT,
  DOC_DETECTION_UX_C_RUNNING_LABEL,
  DOC_DETECTION_UX_C_ZIP_NOT_FOUND_HINT,
  DOC_DETECTION_UX_C_ZIP_NOT_FOUND_LABEL,
  DOC_DETECTION_UX_F1_HINT,
  DOC_DETECTION_UX_F1_LABEL,
} from "@/lib/doc-detection";

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
  /** COST-PARSER-01 — stan A/B/C gdy znany. */
  zipState?: CostParserZipState | null;
}

export interface CostRegressionF2UiCopyOpts {
  archiveCandidate?: boolean;
  /** archive ∧ heavyDone ∧ !kosztorys.ok */
  heavyDoneEmpty?: boolean;
  /** Top-level ATH/XLSX/PDF-przedmiar (bez ZIP). */
  fileCandidate?: boolean;
  /** COST-PARSER-01 A/B/C (null = legacy CR-02). */
  zipState?: CostParserZipState | null;
}

const PDF_PRZEDMIAR_NAME_RE = DOC_D1_PDF_NAME_RE;

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

/** Macierz komunikatów Epic A §7.1 + CR-02 §4 + COST-PARSER-01 A/B/C. */
export function resolveCostRegressionF2UiCopy(
  discovery: CostRegressionF2DiscoveryStatus,
  opts?: CostRegressionF2UiCopyOpts,
): CostRegressionF2UiCopy {
  const archiveCandidate = Boolean(opts?.archiveCandidate);
  const heavyDoneEmpty = Boolean(opts?.heavyDoneEmpty);
  const fileCandidate = Boolean(opts?.fileCandidate);
  const archiveOnlyReady = archiveCandidate && !fileCandidate;
  const zipState = opts?.zipState ?? null;

  const withZip = (copy: CostRegressionF2UiCopy): CostRegressionF2UiCopy => ({
    ...copy,
    zipState,
  });

  switch (discovery) {
    case "no_candidate":
      return withZip({
        discovery,
        phaseLabelPl: DOC_DETECTION_UX_A_LABEL,
        hintPl: DOC_DETECTION_UX_A_HINT,
        primaryCta: "attach",
        secondaryCta: null,
        archiveCandidate,
      });
    case "candidate_ready":
      if (archiveOnlyReady) {
        return withZip({
          discovery,
          phaseLabelPl: DOC_DETECTION_UX_C_ARCHIVE_READY_LABEL,
          hintPl: DOC_DETECTION_UX_C_ARCHIVE_READY_HINT,
          primaryCta: "reparse",
          secondaryCta: "attach",
          archiveCandidate,
        });
      }
      return withZip({
        discovery,
        phaseLabelPl: DOC_DETECTION_UX_C_CANDIDATE_LABEL,
        hintPl: DOC_DETECTION_UX_C_CANDIDATE_HINT,
        primaryCta: "reparse",
        secondaryCta: "attach",
        archiveCandidate,
      });
    case "parse_running":
      return withZip({
        discovery,
        phaseLabelPl: DOC_DETECTION_UX_C_RUNNING_LABEL,
        hintPl: DOC_DETECTION_UX_C_RUNNING_HINT,
        primaryCta: "none",
        secondaryCta: null,
        archiveCandidate,
      });
    case "parse_failed":
      if (archiveCandidate && heavyDoneEmpty && zipState) {
        const overlay = resolveCostParserZipUiOverlay(zipState);
        return withZip({
          discovery,
          phaseLabelPl: overlay.phaseLabelPl,
          hintPl: overlay.hintPl,
          primaryCta: "reparse",
          secondaryCta: "attach",
          archiveCandidate,
        });
      }
      if (archiveCandidate && heavyDoneEmpty) {
        /* Legacy CR-02 — brak sygnału zipUnpackOk w starym dossier */
        return withZip({
          discovery,
          phaseLabelPl: DOC_DETECTION_UX_C_ZIP_NOT_FOUND_LABEL,
          hintPl: DOC_DETECTION_UX_C_ZIP_NOT_FOUND_HINT,
          primaryCta: "reparse",
          secondaryCta: "attach",
          archiveCandidate,
        });
      }
      return withZip({
        discovery,
        phaseLabelPl: DOC_DETECTION_UX_C_FAILED_LABEL,
        hintPl: DOC_DETECTION_UX_C_FAILED_HINT,
        primaryCta: "reparse",
        secondaryCta: "attach",
        archiveCandidate,
      });
    default: {
      const _exhaustive: never = discovery;
      return _exhaustive;
    }
  }
}

/** Buduje discovery + copy z kontekstem itemu (CR-02 + COST-PARSER-01 + Doc Detection UX). */
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
  const heavyDoneEmpty = heavyDone && !input.item.tenderDossier?.kosztorys?.ok;
  const scan = input.item.tenderDossier?.scanSummary;
  const k = input.item.tenderDossier?.kosztorys;
  const pdfCase = k?.pdfPrzedmiarCase ?? scan?.pdfPrzedmiarCase;
  const zipState =
    archiveCandidate && heavyDoneEmpty
      ? resolveCostParserZipState({
          hasTopLevelZip: archiveCandidate,
          zipUnpackOk: scan?.zipUnpackOk,
          zipCostInnerPresent: scan?.zipCostInnerPresent,
          kosztorysOk: Boolean(input.item.tenderDossier?.kosztorys?.ok),
        })
      : null;

  // UX_B — CASE 3: wymaga OCR (nigdy UX_A)
  if (
    pdfCase === 3
    && discovery !== "parse_running"
    && discovery !== "no_candidate"
  ) {
    return {
      discovery,
      phaseLabelPl: DOC_DETECTION_UX_B_LABEL,
      hintPl: DOC_DETECTION_UX_B_HINT,
      primaryCta: discovery === "candidate_ready" || discovery === "parse_failed" ? "reparse" : "none",
      secondaryCta: "attach",
      archiveCandidate,
      zipState,
    };
  }

  return resolveCostRegressionF2UiCopy(discovery, {
    archiveCandidate,
    heavyDoneEmpty,
    fileCandidate: hasFilePrzedmiarCandidate(input.item),
    zipState,
  });
}

/** Copy F1 (Epic B lite). */
export function resolveCostRegressionF1UiCopy(): {
  phaseLabelPl: string;
  hintPl: string;
} {
  return {
    phaseLabelPl: DOC_DETECTION_UX_F1_LABEL,
    hintPl: DOC_DETECTION_UX_F1_HINT,
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
