/**
 * P2-E.1 — uniwersalne wykrywanie dokumentów kosztorysowych (ATH/NOR/XML/XLS/ZIP/PDF).
 * P2-H.5A — PDF przedmiar (MVP discovery, bez parsowania pozycji).
 */

import type { AthPreviewResult } from "@/lib/ath-parser";
import { isKosztorysPreviewExt } from "@/lib/ath-parser";
import { is7zFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import {
  PDF_PRZEDMIAR_EXTRACT_ERROR_LINE,
  PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE,
} from "@/lib/pdf-przedmiar-heuristic";
import type { CostContentScoreResult } from "@/lib/tender-cost-content-detection";
import {
  contentScoreDiscoveryBoost,
  isOfferFormByContent,
} from "@/lib/tender-cost-content-detection";
import { hasDocD1CostFilenameHint, isDocD1PdfFilename } from "@/lib/doc-detection";

export type TenderCostDocumentType =
  | "ath"
  | "nor"
  | "xml"
  | "xls"
  | "xlsx"
  | "pdf_przedmiar"
  | "zip_ath"
  | "zip_nor"
  | "zip_xml"
  | "zip_xls"
  | "zip_xlsx"
  | "zip_pdf_przedmiar"
  | "none";

/** P2-H.5A — PDF przedmiar/obmiar/kosztorys/BOQ/ślepy lub wzorzec *_PR.pdf (inner ZIP/7Z OK). */
export function isPdfPrzedmiarCostFilename(filename: string): boolean {
  return isDocD1PdfFilename(filename);
}

export interface TenderCostDiscoveryResult {
  found: boolean;
  type: TenderCostDocumentType;
  source: string;
  confidence: number;
}

export interface TenderCostCandidate {
  filename: string;
  score?: number;
  zipInnerPath?: string;
  documentIndex?: number;
  /** P1 content-based — opcjonalny sygnał z treści (XLSX/PDF text). */
  contentScore?: CostContentScoreResult;
}

function baseName(filename: string): string {
  return (filename.split(" → ").pop() ?? filename).toLowerCase();
}

function foldCostFilename(filename: string): string {
  return baseName(filename)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * P0 — formularz ofertowy nie jest kosztorysem / przedmiarem (WM: Zal. nr 1 do SWZ).
 * Używane w discovery, classify i pickCostParseCandidates.
 */
export function isFormalOfferCostFilename(filename: string): boolean {
  const folded = foldCostFilename(filename);
  if (!folded) return false;
  if (/\bformularz\b/.test(folded) && /\bofert/.test(folded)) return true;
  if (/\boffer\s+form\b/.test(folded)) return true;
  if (/zal\.?\s*nr\s*1\b.*\bswz\b/.test(folded)) return true;
  if (/zalacznik\s*nr\s*1\b.*\bswz\b/.test(folded)) return true;
  if (
    /\bofert/.test(folded)
    && /\.xlsx?$/i.test(folded)
    && !/koszt|przedm|obmiar|boq|quantit|slep/.test(folded)
  ) {
    return true;
  }
  return false;
}

/**
 * Harmonogram rzeczowo-finansowy / financial schedule ≠ dokument kosztowy / przedmiar.
 * Bare „schedule” bez kontekstu finansowego — NIE blokuje (unikaj false positive).
 */
export function isFinancialScheduleNotCostFilename(filename: string): boolean {
  const folded = foldCostFilename(filename);
  if (!folded) return false;
  if (/harmonogram/.test(folded)) return true;
  if (/rzeczowo[\s_-]*finans/.test(folded)) return true;
  if (/financial[\s_-]*schedule/.test(folded)) return true;
  return false;
}

function isNorFilename(name: string): boolean {
  return /\.nor$/i.test(name);
}

function isXmlKosztorysFilename(name: string): boolean {
  return /\.xml$/i.test(name);
}

function isXlsOnlyFilename(name: string): boolean {
  return /\.xls$/i.test(name) && !/\.xlsx$/i.test(name);
}

/** Klasyfikacja pojedynczego pliku (outer lub inner w ZIP). */
export function classifyCostDocumentType(filename: string): {
  type: TenderCostDocumentType;
  confidence: number;
} {
  const base = baseName(filename);
  const inZip = filename.includes(" → ");

  if (isFormalOfferCostFilename(filename)) {
    return { type: "none", confidence: 0 };
  }

  if (isFinancialScheduleNotCostFilename(filename)) {
    return { type: "none", confidence: 0 };
  }

  if (isNorFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_nor" : "nor";
    return { type: t, confidence: 0.95 };
  }
  if (isXmlKosztorysFilename(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_xml" : "xml";
    return { type: t, confidence: 0.9 };
  }
  if (/\.ath$/i.test(base)) {
    const t: TenderCostDocumentType = inZip ? "zip_ath" : "ath";
    return { type: t, confidence: 0.98 };
  }
  if (isXlsxFilename(base)) {
    const hasCostHint = hasDocD1CostFilenameHint(base);
    if (!hasCostHint) {
      return { type: "none", confidence: 0 };
    }
    const t: TenderCostDocumentType = inZip ? "zip_xlsx" : "xlsx";
    return { type: t, confidence: 0.88 };
  }
  if (isXlsOnlyFilename(base)) {
    const hasCostHint = hasDocD1CostFilenameHint(base);
    if (!hasCostHint) {
      return { type: "none", confidence: 0 };
    }
    const t: TenderCostDocumentType = inZip ? "zip_xls" : "xls";
    return { type: t, confidence: 0.85 };
  }
  if (isPdfPrzedmiarCostFilename(filename)) {
    const t: TenderCostDocumentType = inZip ? "zip_pdf_przedmiar" : "pdf_przedmiar";
    const conf = /przedmiar|obmiar/i.test(base)
      ? 0.82
      : /kosztorys|boq|quantit|slep/i.test(base)
        ? 0.78
        : 0.74;
    return { type: t, confidence: conf };
  }
  if (isKosztorysPreviewExt(base)) {
    return { type: inZip ? "zip_ath" : "ath", confidence: 0.85 };
  }
  if ((isZipFilename(base) || is7zFilename(base)) && !inZip) {
    return { type: "none", confidence: 0.3 };
  }
  return { type: "none", confidence: 0 };
}

const COST_TYPE_PRIORITY: Record<TenderCostDocumentType, number> = {
  ath: 0,
  nor: 1,
  xml: 2,
  zip_ath: 3,
  zip_nor: 4,
  zip_xml: 5,
  xlsx: 6,
  zip_xlsx: 7,
  xls: 8,
  zip_xls: 9,
  pdf_przedmiar: 10,
  zip_pdf_przedmiar: 11,
  none: 99,
};

const ATH_DEPRIORITY_RE = /prawo\s*opcji|wentylacyjne|ogólne|ogolne/i;

function normalizeMatchHaystack(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s./-]+/gu, " ");
}

/** P2-H.5D.2 — dopasowanie inner ATH do tytułu przetargu + depriorytetyzacja opcji/wentylacji. */
export function scoreCostTitleMatch(
  candidate: TenderCostCandidate,
  tenderTitle?: string,
): number {
  const hay = normalizeMatchHaystack(`${candidate.filename} ${candidate.zipInnerPath ?? ""}`);
  let score = 0;

  if (/prawo\s*opcji/i.test(hay)) score -= 20;
  if (/wentylacyjne/i.test(hay)) score -= 15;
  if (/ogólne|ogolne/i.test(hay)) score -= 10;

  if (!tenderTitle?.trim()) return score;

  const titleHay = normalizeMatchHaystack(tenderTitle);
  const tokens = titleHay.split(/\s+/).filter((t) => t.length >= 4);
  for (const token of tokens) {
    if (hay.includes(token)) score += 6;
  }

  const lokMatch = titleHay.match(/\blok\.?\s*(\d+)\b/) ?? titleHay.match(/\bm\s*(\d+)\b/);
  if (lokMatch) {
    const lok = lokMatch[1];
    if (
      hay.includes(`lok ${lok}`)
      || hay.includes(`lok. ${lok}`)
      || hay.includes(`lok.${lok}`)
      || hay.includes(`m ${lok}`)
      || hay.includes(`m${lok}`)
      || hay.includes(`${lok}-`)
      || hay.includes(`-${lok}/`)
    ) {
      score += 12;
    }
  }

  const streets = ["piaskowa", "rdestowa", "falzmanna", "pomorska", "lukasinskiego", "nowodworska", "sredzka", "srutowa"];
  for (const street of streets) {
    if (titleHay.includes(street) && hay.includes(street)) score += 15;
  }

  return score;
}

export interface DiscoverBestCostOptions {
  tenderTitle?: string;
}

function confidenceTie(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

/** Priorytet: ATH/NOR/XML > XLS/XLSX > PDF przedmiar > pozostałe. */
export function discoverBestCostDocument(
  candidates: TenderCostCandidate[],
  opts?: DiscoverBestCostOptions,
): TenderCostDiscoveryResult {
  let best: TenderCostDiscoveryResult = {
    found: false,
    type: "none",
    source: "",
    confidence: 0,
  };
  let bestPriority = COST_TYPE_PRIORITY.none;
  let bestTitleMatch = Number.NEGATIVE_INFINITY;

  for (const cand of candidates) {
    if (isFormalOfferCostFilename(cand.filename)) continue;
    if (isOfferFormByContent(cand.contentScore)) continue;
    const { type, confidence } = classifyCostDocumentType(cand.filename);
    if (type === "none") continue;
    const scoreBoost = (cand.score ?? 0) / 100;
    const contentBoost = contentScoreDiscoveryBoost(cand.contentScore);
    const effective = Math.min(0.99, Math.max(0, confidence + scoreBoost * 0.05 + contentBoost));
    const priority = COST_TYPE_PRIORITY[type];
    const titleMatch = scoreCostTitleMatch(cand, opts?.tenderTitle);

    if (!best.found) {
      best = { found: true, type, source: cand.filename, confidence: effective };
      bestPriority = priority;
      bestTitleMatch = titleMatch;
      continue;
    }

    const better =
      priority < bestPriority
      || (priority === bestPriority && effective > best.confidence)
      || (priority === bestPriority && confidenceTie(effective, best.confidence) && titleMatch > bestTitleMatch);

    if (better) {
      best = { found: true, type, source: cand.filename, confidence: effective };
      bestPriority = priority;
      bestTitleMatch = titleMatch;
    }
  }

  return best;
}

export function costTypeDisplayLabel(type: TenderCostDocumentType): string {
  switch (type) {
    case "ath": return "ATH";
    case "nor": return "NOR";
    case "xml": return "XML";
    case "xls": return "XLS";
    case "xlsx": return "XLSX";
    case "pdf_przedmiar": return "PDF przedmiar";
    case "zip_ath": return "ATH (w ZIP)";
    case "zip_nor": return "NOR (w ZIP)";
    case "zip_xml": return "XML (w ZIP)";
    case "zip_xls": return "XLS (w ZIP)";
    case "zip_xlsx": return "XLSX (w ZIP)";
    case "zip_pdf_przedmiar": return "PDF przedmiar (w archiwum)";
    default: return "";
  }
}

/** P2-H.5A — snapshot kosztorysu PDF bez pozycji (FOUND_NO_VALUE). */
export function buildPdfPrzedmiarMvpSnapshot(filename: string): AthPreviewResult {
  const base = filename.split(" → ").pop() ?? filename;
  return {
    ok: true,
    format: "unknown",
    documentType: "PDF_PRZEDMIAR",
    title: base.split("/").pop() ?? base,
    rows: [],
    warnings: [],
  };
}
/** P2-H.5A — komunikat UX po wykryciu PDF przedmiaru (bez pozycji). */
export function costTypeKosztorysFoundLine(
  type: TenderCostDocumentType,
  source?: string,
  opts?: { pdfCase?: 1 | 2 | 3; pdfNoTextLayer?: boolean; pdfExtractError?: boolean },
): string {
  if (type === "pdf_przedmiar" || type === "zip_pdf_przedmiar") {
    if (opts?.pdfCase === 1) return "Rozpoznano pozycje robót w PDF.";
    if (opts?.pdfCase === 3) {
      if (opts?.pdfExtractError) return PDF_PRZEDMIAR_EXTRACT_ERROR_LINE;
      return opts?.pdfNoTextLayer
        ? PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE
        : "PDF zawiera skan i wymaga OCR.";
    }
    if (opts?.pdfCase === 2) return "Znaleziono przedmiar PDF, ale nie udało się odczytać pozycji.";
    const base = (source ?? "").split(" → ").pop()?.toLowerCase() ?? "";
    if (/kosztorys/i.test(base) && !/przedmiar|obmiar|_pr/i.test(base)) {
      return "Znaleziono kosztorys w formacie PDF.";
    }
    return "Znaleziono przedmiar PDF.";
  }
  const label = costTypeDisplayLabel(type);
  return label ? `Znaleziony ${label}` : "Znaleziony kosztorys";
}
