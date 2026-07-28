/**
 * COST-REGRESSION-01 EPIC A — classifier F2/F1 + discovery + macierz copy (pure).
 * Zero zmian Bid / COST-PIPELINE / AI Cost — tylko diagnostyka UI + gate CTA.
 */

import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { hasUsableCatalogQuantities } from "@/lib/tenders-bzp-brief";
import {
  isXlsxFilename,
  parsePlnFromKosztorysTotal,
} from "@/lib/tenders-bzp-filename";
import { deriveUnifiedAttachmentGate } from "@/lib/tender-pipeline/unified-attachment-gate";

/** Enum discovery UI (DF §5.3). */
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
}

const PDF_PRZEDMIAR_NAME_RE =
  /przedmiar|kosztorys|obmiar|ath|norma|stwior|formularz.?cen/i;

/** Nazwa pliku wygląda na kandydata przedmiaru (ATH/XLSX/PDF). */
export function isPrzedmiarCandidateFilename(name: string): boolean {
  const n = (name || "").trim();
  if (!n) return false;
  if (isKosztorysPreviewExt(n)) return true;
  if (isXlsxFilename(n)) return true;
  if (isPdfFilename(n) && PDF_PRZEDMIAR_NAME_RE.test(n)) return true;
  return false;
}

/** Czy w itemie jest kandydat przedmiaru (REUSE gate + nazwy plików). */
export function hasPrzedmiarCandidate(item: TenderPipelineItem): boolean {
  const uploaded = item.uploadedFile?.filename;
  if (uploaded && isPrzedmiarCandidateFilename(uploaded)) return true;

  for (const doc of item.bzpDocuments ?? []) {
    if (isPrzedmiarCandidateFilename(doc.filename || "")) return true;
  }
  for (const file of item.externalDocDiscovery?.files ?? []) {
    if (isPrzedmiarCandidateFilename(file.filename || "")) return true;
  }

  /** Gate NG-02: heavy-eligible z nazwą przedmiaru (bez nowego crawlera). */
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

/**
 * F1 (Epic B — tylko rozróżnienie copy w Epic A):
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
 * F2 (Epic A): brak / nie-ok kosztorysu w dossier — i nie F1.
 */
export function isCostRegressionF2(item: TenderPipelineItem): boolean {
  if (item.tenderDossier?.kosztorys?.ok) return false;
  return !isCostRegressionF1(item);
}

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
  if (input.dossierParseFailed) return "parse_failed";
  if (hasPrzedmiarCandidate(input.item)) return "candidate_ready";
  return "no_candidate";
}

/** Macierz komunikatów DF §7.1. */
export function resolveCostRegressionF2UiCopy(
  discovery: CostRegressionF2DiscoveryStatus,
): CostRegressionF2UiCopy {
  switch (discovery) {
    case "no_candidate":
      return {
        discovery,
        phaseLabelPl: "Brak przedmiaru w dokumentach",
        hintPl:
          "Dołącz ATH, XLSX lub PDF przedmiaru — bez tego nie da się wyliczyć oferty.",
        primaryCta: "attach",
        secondaryCta: null,
      };
    case "candidate_ready":
      return {
        discovery,
        phaseLabelPl: "Brak odczytanego kosztorysu",
        hintPl:
          "W dokumentach jest kandydat przedmiaru — uruchom ponownie analizę kosztorysu.",
        primaryCta: "reparse",
        secondaryCta: "attach",
      };
    case "parse_running":
      return {
        discovery,
        phaseLabelPl: "Trwa analiza kosztorysu…",
        hintPl: "Po zakończeniu wycena uruchomi się automatycznie.",
        primaryCta: "none",
        secondaryCta: null,
      };
    case "parse_failed":
      return {
        discovery,
        phaseLabelPl: "Nie udało się odczytać kosztorysu",
        hintPl:
          "Sprawdź plik lub ponów analizę. To nie awaria kalkulatora oferty.",
        primaryCta: "reparse",
        secondaryCta: "attach",
      };
    default: {
      const _exhaustive: never = discovery;
      return _exhaustive;
    }
  }
}

/** Copy F1 (Epic B lite) — nie mylić z „brak przedmiaru w dokumentach”. */
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

/** Guard CTA re-parse (AC-A11). */
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
