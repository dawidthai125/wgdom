/**
 * P2-D.4 — audyt pokrycia analizy dokumentów przetargowych.
 * SSOT: jakie typy są wspierane i które etapy pipeline'u je obejmują.
 */

import {
  is7zFilename,
  isDocxFilename,
  isXlsxFilename,
  isZipFilename,
  scoreTenderFilename,
} from "@/lib/tenders-bzp-filename";
import { isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";

export type CoveragePipelineStage =
  | "discovery"
  | "download"
  | "swz_text"
  | "kosztorys"
  | "value"
  | "criteria"
  | "estimate";

export interface FileTypeSupportRow {
  ext: string;
  label: string;
  supported: boolean;
  swzAnalysis: boolean;
  kosztorys: boolean;
  notes: string;
}

export interface DocumentCoverageRow {
  filename: string;
  ext: string;
  docType: string;
  score: number;
  detected: boolean;
  downloaded: boolean;
  swzAnalyzed: boolean;
  kosztorysParsed: boolean;
  valueExtracted: boolean;
  criteriaExtracted: boolean;
  estimateExtracted: boolean;
  notes: string[];
}

export interface CoverageTraceEntry {
  document: string;
  documentDiscovered: boolean;
  documentDownloaded: boolean;
  documentParsed: boolean;
  costEstimateExtracted: boolean;
  evaluationCriteriaExtracted: boolean;
  tenderValueExtracted: boolean;
  detail?: string;
}

/** Tabela B — wsparcie typów plików w kodzie (stan 2.51.10). */
export const FILE_TYPE_SUPPORT: FileTypeSupportRow[] = [
  { ext: "pdf", label: "PDF", supported: true, swzAnalysis: true, kosztorys: true, notes: "SWZ tekst pdf.js; przedmiar PDF — heurystyki KNR/P2-H.5B (natywny tekst), skan → OCR backlog" },
  { ext: "doc", label: "DOC", supported: true, swzAnalysis: true, kosztorys: false, notes: "mammoth/DOCX fallback — tekst SWZ" },
  { ext: "docx", label: "DOCX", supported: true, swzAnalysis: true, kosztorys: false, notes: "mammoth — tekst SWZ" },
  { ext: "xls", label: "XLS", supported: true, swzAnalysis: false, kosztorys: true, notes: "XLSX.read — heurystyka przedmiaru" },
  { ext: "xlsx", label: "XLSX", supported: true, swzAnalysis: false, kosztorys: true, notes: "parseXlsxToKosztorys" },
  { ext: "ath", label: "ATH", supported: true, swzAnalysis: false, kosztorys: true, notes: "parseKosztorysBytes (NORMA/Athenasoft)" },
  { ext: "nor", label: "NOR", supported: true, swzAnalysis: false, kosztorys: true, notes: "jak ATH" },
  { ext: "xml", label: "XML", supported: true, swzAnalysis: false, kosztorys: true, notes: "kosztorys XML" },
  { ext: "zip", label: "ZIP", supported: true, swzAnalysis: true, kosztorys: true, notes: "JSZip — tylko najlepszy plik wewn.; max 20 wpisów" },
  { ext: "7z", label: "7Z", supported: true, swzAnalysis: true, kosztorys: true, notes: "7z-wasm (LGPL) — inner ATH/PDF/XLSX jak ZIP; max 20 wpisów" },
];

export function extOfFilename(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return m?.[1] ?? "";
}

export function classifyDocumentType(filename: string): string {
  const n = filename.toLowerCase();
  if (/modyfik.*swz|swz.*modyfik|zmian.*swz/.test(n)) return "modyfikacja_swz";
  if (/swz|opz|specyfikac/.test(n)) return "swz";
  if (/stwior|stwi/i.test(n)) return "stwior";
  if (/obmiar|przedmiar|kosztorys/.test(n)) return "obmiar";
  if (/formularz|ofert/.test(n)) return "formularz";
  if (isZipFilename(n)) return "zip";
  if (extOfFilename(n) === "7z") return "7z";
  if (isKosztorysPreviewExt(n)) return "kosztorys_ath";
  if (isXlsxFilename(n)) return "spreadsheet";
  if (isPdfFilename(n)) return "pdf";
  return "other";
}

export function fileCapabilities(filename: string): {
  swzText: boolean;
  kosztorys: boolean;
  supported: boolean;
} {
  const ext = extOfFilename(filename);
  if (ext === "7z" || is7zFilename(filename)) return { swzText: true, kosztorys: true, supported: true };
  if (isZipFilename(filename)) return { swzText: true, kosztorys: true, supported: true };
  return {
    swzText: isPdfFilename(filename) || isDocxFilename(filename),
    kosztorys: isKosztorysPreviewExt(filename) || isXlsxFilename(filename),
    supported: isPdfFilename(filename) || isDocxFilename(filename)
      || isKosztorysPreviewExt(filename) || isXlsxFilename(filename) || isZipFilename(filename)
      || is7zFilename(filename),
  };
}

/** Symuluje które dokumenty trafią do parseBestTenderDocuments (max 6, score ≥ 8). */
export function selectParseCandidates(
  filenames: string[],
  opts?: { isSwzHint?: (name: string) => boolean },
): { filename: string; score: number; selected: boolean }[] {
  const rows = filenames.map((filename) => {
    let score = scoreTenderFilename(filename);
    if (opts?.isSwzHint?.(filename)) score += 18;
    return { filename, score, selected: false };
  }).sort((a, b) => b.score - a.score);
  const top = rows.filter((r) => r.score >= 8).slice(0, 6);
  const selectedSet = new Set((top.length ? top : rows.slice(0, 3)).map((r) => r.filename));
  return rows.map((r) => ({ ...r, selected: selectedSet.has(r.filename) }));
}

/** Analizuj SWZ — tylko jeden dokument (pickBestSwzDocumentForAnalysis). */
export function pickSingleSwzAnalysisTarget(filenames: string[]): string | null {
  if (!filenames.length) return null;
  const ranked = [...filenames].sort((a, b) => {
    const sa = scoreTenderFilename(a) + (/swz/i.test(a) ? 18 : 0);
    const sb = scoreTenderFilename(b) + (/swz/i.test(b) ? 18 : 0);
    return sb - sa;
  });
  return ranked[0] ?? null;
}

export function buildDocumentCoverageRows(
  filenames: string[],
  opts?: {
    swzAnalysisTarget?: string | null;
    parseCandidates?: string[];
    parsedKosztorys?: string | null;
    extractedValue?: boolean;
    extractedCriteria?: boolean;
    extractedEstimate?: boolean;
  },
): DocumentCoverageRow[] {
  const candidates = new Set(opts?.parseCandidates ?? selectParseCandidates(filenames).filter((r) => r.selected).map((r) => r.filename));
  const swzTarget = opts?.swzAnalysisTarget ?? pickSingleSwzAnalysisTarget(filenames);

  return filenames.map((filename) => {
    const cap = fileCapabilities(filename);
    const score = scoreTenderFilename(filename);
    const isSwzRun = filename === swzTarget;
    const isParseCand = candidates.has(filename);
    const isKosztorysHit = opts?.parsedKosztorys === filename;
    const notes: string[] = [];
    if (!cap.supported) notes.push("Typ nieobsługiwany");
    if (isSwzRun) notes.push("Cel „Analizuj SWZ” (1 plik)");
    if (isParseCand && !isSwzRun) notes.push("Kandydat parseBestTenderDocuments");
    if (isParseCand && !cap.kosztorys && isPdfFilename(filename)) notes.push("PDF — tylko tekst SWZ, bez kosztorysu");
    if (extOfFilename(filename) === "7z") notes.push("7Z — rozpakowanie inner ATH/PDF/XLSX (P2-H.3)");

    return {
      filename,
      ext: extOfFilename(filename),
      docType: classifyDocumentType(filename),
      score,
      detected: true,
      downloaded: cap.supported || isZipFilename(filename) || is7zFilename(filename),
      swzAnalyzed: isSwzRun && cap.swzText,
      kosztorysParsed: isKosztorysHit,
      valueExtracted: isSwzRun && Boolean(opts?.extractedValue),
      criteriaExtracted: isSwzRun && Boolean(opts?.extractedCriteria),
      estimateExtracted: isKosztorysHit && Boolean(opts?.extractedEstimate),
      notes,
    };
  });
}

export function buildCoverageTraceReport(rows: DocumentCoverageRow[]): CoverageTraceEntry[] {
  return rows.map((r) => ({
    document: r.filename,
    documentDiscovered: r.detected,
    documentDownloaded: r.downloaded,
    documentParsed: r.swzAnalyzed || r.kosztorysParsed,
    costEstimateExtracted: r.estimateExtracted,
    evaluationCriteriaExtracted: r.criteriaExtracted,
    tenderValueExtracted: r.valueExtracted,
    detail: r.notes.join("; ") || undefined,
  }));
}

/** Przypadek referencyjny TBS 00266295 — typowa lista Logintrade (15 plików). */
export const TBS_00266295_DOCUMENTS = [
  "2026_06_01_modyfik_SWZ_modernizacja_klatek_23_2026.pdf",
  "SWZ_modernizacja_klatek_2026.pdf",
  "STWIOR_TBS_Wroclaw.pdf",
  "Obmiar_robot_budowlanych.pdf",
  "Formularz_ofertowy.docx",
  "Zalacznik_nr_1_opis_przedmiotu.pdf",
  "Zalacznik_nr_2_projekt.pdf",
  "Przedmiar_robot.xlsx",
  "Kosztorys_inwestorski.ath",
  "zalaczniki_pakiet.zip",
  "dokumentacja.7z",
  "Odpowiedzi_na_pytania.pdf",
  "Harmonogram_realizacji.pdf",
  "Oswiadczenie_wykonawcy.doc",
  "Informacja_o_wadium.pdf",
];

export const ANALYSIS_COVERAGE_GAPS = {
  sevenZipUnsupported: "Pliki .7z — rozpakowanie przez 7z-wasm (LGPL); outer pomijany gdy inner znaleziony",
  pdfNoKosztorys: "PDF skan — likelyScan wymaga OCR; natywny tekst przedmiaru obsługiwany heurystyką P2-H.5B",
  criteriaTableLayout: "extractAwardCriteria — wzorce „Cena — 60%”; tabele PDF mogą nie pasować",
} as const;
