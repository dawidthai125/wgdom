/**
 * P2-E.1 — pełna analiza dossier przetargu po „Analizuj SWZ”.
 * Universal Tender Dossier Engine — e-Zamówienia, Logintrade, ZIP, ATH, XLSX…
 */

import type { TenderBzpDocument } from "@/lib/tenders-bzp";
import type { TenderDossier, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { analyzeTenderSwzEnhanced } from "@/lib/tenders-bzp-analyze-local";
import { parseTenderDossierDocuments, mergeSwzAnalysis } from "@/lib/tender-document-resolver";
import { classifyDocumentRole, is7zFilename } from "@/lib/tender-document-role";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import { clearDossierTraceLog } from "@/lib/tender-dossier-trace";
import { clearCostTraceLog, estimatePlnFromKosztorysSnapshot, mergeKosztorysValueIntoSwz, plnFromKosztorysSnapshot, traceCostPipeline, traceCostUiState } from "@/lib/tender-cost-snapshot";
import { applyMetadataConfidence } from "@/lib/tender-metadata-confidence";
import type { TenderCostDiscoveryResult } from "@/lib/tender-cost-discovery";
import { costTypeDisplayLabel, costTypeKosztorysFoundLine } from "@/lib/tender-cost-discovery";

export interface TenderDossierScanCounts {
  pdf: number;
  docx: number;
  xlsx: number;
  zip: number;
  ath: number;
  sevenZip: number;
  other: number;
}

export interface TenderDossierScanSummary {
  totalDocuments: number;
  scanned: number;
  parsed: number;
  byType: TenderDossierScanCounts;
  sevenZipCount: number;
  /** P2-H.4 — true gdy co najmniej jedno archiwum 7Z dało listę plików wewnętrznych. */
  sevenZUnpackOk?: boolean;
  /** P2-H.4 — liczba inner candidates z archiwów 7Z (max ZIP_INNER_MAX na archiwum). */
  sevenZInnerCount?: number;
  kosztorysFound: boolean;
  valueFound: boolean;
  criteriaFound: boolean;
  estimateFound: boolean;
  costDiscovery: TenderCostDiscoveryResult | null;
  /** P2-H.5B — jakość odczytu PDF przedmiaru (1=pozycje, 2=brak, 3=skan). */
  pdfPrzedmiarCase?: 1 | 2 | 3;
  /** P2-H.5C — CASE 3 z powodu braku warstwy tekstowej. */
  pdfPrzedmiarNoTextLayer?: boolean;
  parsedAt: string;
}

export interface TenderDossierAnalysisResult {
  analysis: TenderSwzAnalysis;
  kosztorys: TenderKosztorysSnapshot | null;
  estimatePln: number | null;
  scanSummary: TenderDossierScanSummary;
  warnings: string[];
}

export function countDocumentsByType(filenames: string[]): TenderDossierScanCounts {
  const counts: TenderDossierScanCounts = {
    pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0,
  };
  for (const name of filenames) {
    const base = name.split(" → ").pop() ?? name;
    if (is7zFilename(base)) counts.sevenZip += 1;
    else if (isZipFilename(base)) counts.zip += 1;
    else if (isKosztorysPreviewExt(base)) counts.ath += 1;
    else if (isXlsxFilename(base)) counts.xlsx += 1;
    else if (isDocxFilename(base)) counts.docx += 1;
    else if (isPdfFilename(base)) counts.pdf += 1;
    else counts.other += 1;
  }
  return counts;
}

export function buildScanTypeSummary(summary: TenderDossierScanSummary): string {
  const c = summary.byType;
  const lines = [
    "Przeskanowano:",
    `PDF: ${c.pdf}`,
    `DOC/DOCX: ${c.docx}`,
    `ZIP: ${c.zip}`,
    `ATH/NOR/XML: ${c.ath}`,
    `XLS/XLSX: ${c.xlsx}`,
  ];
  if (summary.sevenZipCount > 0) {
    lines.push(`7Z: ${summary.sevenZipCount}`);
  }
  return lines.join("\n");
}

/** P2-H.4 — backward compat: stare scanSummary bez pól 7Z inferują z innerCount. */
export function isSevenZUnpackOk(summary: TenderDossierScanSummary): boolean {
  if (summary.sevenZUnpackOk != null) return summary.sevenZUnpackOk;
  return (summary.sevenZInnerCount ?? 0) > 0;
}

/** P2-H.4 — komunikat gdy 7Z bez kosztorysu; null gdy nie dotyczy. */
export function sevenZKosztorysMissingLine(summary: TenderDossierScanSummary): string | null {
  if (!summary.sevenZipCount || summary.kosztorysFound) return null;
  if (summary.byType.ath > 0 || summary.byType.xlsx > 0) return null;
  if (!isSevenZUnpackOk(summary)) {
    return "Błąd odczytu archiwum 7Z. Analiza kosztorysu jest niedostępna.";
  }
  return "Nie znaleziono kosztorysu ATH/XLS/XLSX w archiwum 7Z.";
}

export function buildKosztorysStatusLine(summary: TenderDossierScanSummary): string {
  if (summary.kosztorysFound) {
    const disc = summary.costDiscovery;
    if (disc?.found && (disc.type === "pdf_przedmiar" || disc.type === "zip_pdf_przedmiar")) {
      return `Kosztorys:\n${costTypeKosztorysFoundLine(disc.type, disc.source, {
        pdfCase: summary.pdfPrzedmiarCase,
        pdfNoTextLayer: summary.pdfPrzedmiarNoTextLayer,
      })}`;
    }
    const label = disc?.found
      ? costTypeDisplayLabel(disc.type)
      : "kosztorys";
    return `Kosztorys:\nZnaleziony ${label}`;
  }
  const sevenZLine = sevenZKosztorysMissingLine(summary);
  if (sevenZLine) return `Kosztorys:\n${sevenZLine}`;
  return "Kosztorys:\nNie znaleziono dokumentu kosztorysowego";
}

export function buildKosztorysMissingMessage(summary: TenderDossierScanSummary): string {
  if (summary.kosztorysFound) return buildKosztorysStatusLine(summary);
  return [
    buildKosztorysStatusLine(summary),
    "",
    buildScanTypeSummary(summary),
    "",
    `${summary.totalDocuments} dokumentów na liście`,
  ].join("\n");
}

export function buildEstimateMissingReason(summary: TenderDossierScanSummary): string {
  if (summary.estimateFound) return "";
  if (summary.kosztorysFound) {
    return "Nie można automatycznie wyliczyć wyceny — brak cen w kosztorysie/przedmiarze";
  }
  const sevenZLine = sevenZKosztorysMissingLine(summary);
  if (sevenZLine) return sevenZLine;
  return "Brak pliku kosztorysowego (ATH/NOR/XML/XLS/XLSX)";
}

/** Pełna analiza: SWZ + dossier ze wszystkich załączników. */
export async function analyzeTenderWithDossier(opts: {
  noticeNumber?: string;
  tenderId?: string;
  documentIndex?: number;
  bzpDocuments?: TenderBzpDocument[];
  noticeHtml?: string | null;
  ourEstimatePln?: number | null;
  existing?: TenderSwzAnalysis | null;
  existingKosztorys?: TenderKosztorysSnapshot | null;
  tenderTitle?: string;
}): Promise<TenderDossierAnalysisResult> {
  clearDossierTraceLog();
  clearCostTraceLog();
  const warnings: string[] = [];
  const docs = opts.bzpDocuments ?? [];
  const filenames = docs.map((d) => d.filename);

  const { analysis: swzPass, warnings: swzWarnings } = await analyzeTenderSwzEnhanced({
    noticeNumber: opts.noticeNumber,
    tenderId: opts.tenderId,
    documentIndex: opts.documentIndex,
    bzpDocuments: docs,
    noticeHtml: opts.noticeHtml,
    ourEstimatePln: opts.ourEstimatePln ?? null,
    existing: opts.existing ?? null,
  });
  warnings.push(...swzWarnings);

  let merged = swzPass;
  let kosztorys = opts.existingKosztorys ?? null;
  let estimatePln = opts.ourEstimatePln ?? null;
  let scanned = 0;
  let parsed = 0;
  let costDiscovery: TenderCostDiscoveryResult | null = null;
  let sevenZUnpackOk: boolean | undefined;
  let sevenZInnerCount: number | undefined;

  if (opts.tenderId && docs.length > 0) {
    const dossier = await parseTenderDossierDocuments(opts.tenderId, docs, {
      ourEstimatePln: estimatePln,
      existingSwz: merged,
      tenderTitle: opts.tenderTitle,
    });
    if (dossier.swzMerged) merged = dossier.swzMerged;
    if (dossier.kosztorys?.ok) kosztorys = dossier.kosztorys;
    if (dossier.estimatePln != null) estimatePln = dossier.estimatePln;
    scanned = dossier.scannedCount;
    parsed = dossier.parsedCount;
    costDiscovery = dossier.costDiscovery;
    sevenZUnpackOk = dossier.sevenZUnpackOk;
    sevenZInnerCount = dossier.sevenZInnerCount;
    warnings.push(...dossier.warnings);
  }

  merged = mergeKosztorysValueIntoSwz(merged, kosztorys);
  merged = applyMetadataConfidence(merged);

  const kosztorysValuePln = plnFromKosztorysSnapshot(kosztorys);
  estimatePln = estimatePlnFromKosztorysSnapshot(
    kosztorys,
    estimatePln,
    kosztorys?.sourceFilename ?? "dossier",
  );
  if (merged.estimatedValuePln != null) {
    traceCostPipeline("estimated_value_created", kosztorys?.sourceFilename ?? "swz", {
      value: merged.estimatedValuePln,
    });
  }

  const scanSummary: TenderDossierScanSummary = {
    totalDocuments: docs.length,
    scanned,
    parsed,
    byType: countDocumentsByType(filenames),
    sevenZipCount: filenames.filter((f) => is7zFilename(f)).length,
    sevenZUnpackOk,
    sevenZInnerCount,
    kosztorysFound: Boolean(kosztorys?.ok),
    valueFound: merged.estimatedValuePln != null || kosztorysValuePln != null,
    criteriaFound: (merged.awardCriteria?.length ?? 0) > 0,
    estimateFound: estimatePln != null,
    costDiscovery,
    pdfPrzedmiarCase: kosztorys?.pdfPrzedmiarCase,
    pdfPrzedmiarNoTextLayer: kosztorys?.pdfPrzedmiarNoTextLayer,
    parsedAt: new Date().toISOString(),
  };

  traceCostUiState(kosztorys?.sourceFilename ?? "dossier", {
    kosztorysOk: Boolean(kosztorys?.ok),
    totalValue: kosztorys?.totalValue ?? null,
    rowCount: kosztorys?.rowCount ?? 0,
    ourEstimatePln: estimatePln,
    swzValue: merged.estimatedValuePln,
    scanSummary,
  });

  return { analysis: merged, kosztorys, estimatePln, scanSummary, warnings };
}

export function dossierFromAnalysisResult(
  brief: TenderDossier["brief"],
  result: Pick<TenderDossierAnalysisResult, "kosztorys" | "scanSummary" | "estimatePln">,
): TenderDossier {
  return {
    brief,
    kosztorys: result.kosztorys,
    scanSummary: result.scanSummary,
    estimatePln: result.estimatePln ?? null,
    builtAt: new Date().toISOString(),
  };
}
