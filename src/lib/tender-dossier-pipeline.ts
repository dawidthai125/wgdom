/**
 * P2-E.1 — pełna analiza dossier przetargu po „Analizuj SWZ”.
 * Universal Tender Dossier Engine — e-Zamówienia, Logintrade, ZIP, ATH, XLSX…
 */

import type { TenderBzpDocument, TenderPipelineItem, TenderUploadedFile } from "@/lib/tenders-bzp";
import type { TenderDossier, TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import { mergeBriefWithItemTitle, parseNoticeHtmlBrief } from "@/lib/tenders-bzp-brief";
import { stripHtmlToText, parseSwzPlainText, type TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { enrichSwzFromText } from "@/lib/tenders-bzp-swz-enrich";
import { analyzeTenderSwzEnhanced } from "@/lib/tenders-bzp-analyze-local";
import { parseTenderDossierDocuments, mergeSwzAnalysis, prepareTenderDossierParseSession, executeTenderDossierCostPhase, executeTenderDossierMetadataPhase, type TenderDossierParseSession } from "@/lib/tender-document-resolver";
import { classifyDocumentRole, is7zFilename } from "@/lib/tender-document-role";
import { fetchAndParseKosztorys, isKosztorysPreviewExt, isPdfFilename } from "@/lib/ath-parser";
import { isDocxFilename, isXlsxFilename, isZipFilename, parsePlnFromKosztorysTotal } from "@/lib/tenders-bzp-filename";
import { clearDossierTraceLog } from "@/lib/tender-dossier-trace";
import { clearCostTraceLog, estimatePlnFromKosztorysSnapshot, mergeKosztorysValueIntoSwz, plnFromKosztorysSnapshot, traceCostPipeline, traceCostUiState } from "@/lib/tender-cost-snapshot";
import { applyMetadataConfidence } from "@/lib/tender-metadata-confidence";
import { pickBetterKosztorys } from "@/lib/tender-dossier-merge";
import {
  existingKosztorysForRebuildPick,
  CURRENT_PARSER_VERSION,
  stampDossierParserVersion,
} from "@/lib/tender-dossier-parser-version";
import type { TenderCostDiscoveryResult } from "@/lib/tender-cost-discovery";
import { costTypeDisplayLabel, costTypeKosztorysFoundLine } from "@/lib/tender-cost-discovery";
import { withPipelineTimingStage } from "@/lib/tender-pipeline/tender-pipeline-timing";
import {
  getDossierArtifactCached,
  isPipelineArtifactCacheEnabled,
  setDossierArtifactCached,
} from "@/lib/tender-pipeline/tender-dossier-artifact-cache";

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
  /** P0 — true gdy co najmniej jedno archiwum ZIP dało listę plików wewnętrznych. */
  zipUnpackOk?: boolean;
  /** P0 — liczba inner candidates z archiwów ZIP. */
  zipInnerCount?: number;
  kosztorysFound: boolean;
  valueFound: boolean;
  criteriaFound: boolean;
  estimateFound: boolean;
  costDiscovery: TenderCostDiscoveryResult | null;
  /** P2-H.5B — jakość odczytu PDF przedmiaru (1=pozycje, 2=brak, 3=skan). */
  pdfPrzedmiarCase?: 1 | 2 | 3;
  /** P2-H.5C — CASE 3 z powodu braku warstwy tekstowej. */
  pdfPrzedmiarNoTextLayer?: boolean;
  /** TP190C-2E-B — CASE 3 z powodu błędu ekstrakcji pdf.js. */
  pdfPrzedmiarExtractError?: boolean;
  parsedAt?: string;
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

/** P2-H.4 / AP2-S0 — komunikat gdy 7Z bez kosztorysu; null gdy nie dotyczy. */
export function sevenZKosztorysMissingLine(summary: TenderDossierScanSummary): string | null {
  if (!summary.sevenZipCount || summary.kosztorysFound) return null;
  if (summary.byType.ath > 0 || summary.byType.xlsx > 0) return null;
  if (!isSevenZUnpackOk(summary)) {
    return "Błąd odczytu archiwum 7Z. Analiza przedmiaru/kosztorysu jest niedostępna.";
  }
  return "Zamawiający nie udostępnił kosztorysu ATH/XLS/XLSX w archiwum 7Z.";
}

export function buildKosztorysStatusLine(summary: TenderDossierScanSummary): string {
  if (summary.kosztorysFound) {
    const disc = summary.costDiscovery;
    if (disc?.found && (disc.type === "pdf_przedmiar" || disc.type === "zip_pdf_przedmiar")) {
      return `Kosztorys:\n${costTypeKosztorysFoundLine(disc.type, disc.source, {
        pdfCase: summary.pdfPrzedmiarCase,
        pdfNoTextLayer: summary.pdfPrzedmiarNoTextLayer,
        pdfExtractError: summary.pdfPrzedmiarExtractError,
      })}`;
    }
    const label = disc?.found
      ? costTypeDisplayLabel(disc.type)
      : "kosztorys";
    return `Kosztorys:\nZnaleziony ${label}`;
  }
  const sevenZLine = sevenZKosztorysMissingLine(summary);
  if (sevenZLine) return `Kosztorys:\n${sevenZLine}`;
  return "Kosztorys:\nZamawiający nie udostępnił kosztorysu inwestorskiego.";
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
  return "Zamawiający nie udostępnił kosztorysu inwestorskiego (ATH/NOR/XML/XLS/XLSX)";
}

/** P3-FIX-C + TP200A — ciężkie parsowanie zakończone i parser aktualny. */
export function tenderDossierHeavyParseDone(dossier: TenderDossier | null | undefined): boolean {
  if (!dossier) return false;
  if (dossier.parserVersion !== CURRENT_PARSER_VERSION) return false;
  if (!dossier.kosztorys?.ok && !dossier.scanSummary?.parsedAt) return false;
  return true;
}

/** Lekka analiza SWZ wyłącznie z HTML ogłoszenia (bez pobierania PDF). */
export function analyzeSwzFromNoticeHtmlOnly(
  noticeHtml: string | null | undefined,
  ourEstimatePln?: number | null,
): TenderSwzAnalysis | null {
  if (!noticeHtml?.trim()) return null;
  const text = stripHtmlToText(noticeHtml);
  if (text.replace(/\s/g, "").length < 80) return null;
  const base = parseSwzPlainText(text, {
    source: "html",
    ourEstimatePln: ourEstimatePln ?? null,
  });
  return enrichSwzFromText(text, base);
}

export interface TenderDossierHeavyBuildResult {
  tenderDossier: TenderDossier;
  swzAnalysis: TenderSwzAnalysis | null;
  ourEstimatePln: number | null;
}

/** NG11-A1 — wynik fazy kosztorysu + sesja do enrichment. */
export interface TenderDossierHeavyCostPhaseResult extends TenderDossierHeavyBuildResult {
  parseSession: TenderDossierParseSession | null;
}

type HeavyBuildOpts = {
  item: Pick<
    TenderPipelineItem,
    | "tenderId"
    | "title"
    | "ourEstimatePln"
    | "uploadedFile"
    | "id"
    | "bzpDocuments"
    | "externalDocDiscovery"
    | "tenderDossier"
  >;
  docs: TenderBzpDocument[];
  noticeHtml?: string | null;
  existingSwz?: TenderSwzAnalysis | null;
  existingDossier?: TenderDossier | null;
  athPreviewEnabled?: boolean;
  pipelineTimingItemId?: string;
};

function heavyCacheItem(opts: HeavyBuildOpts): TenderPipelineItem {
  return opts.item as TenderPipelineItem;
}

function buildHeavyBrief(opts: HeavyBuildOpts): TenderDossier["brief"] {
  return opts.existingDossier?.brief
    ?? mergeBriefWithItemTitle(
      opts.noticeHtml ? parseNoticeHtmlBrief(opts.noticeHtml) : parseNoticeHtmlBrief(""),
      opts.item.title,
    );
}

async function applyUploadFallbackKosztorys(
  opts: HeavyBuildOpts,
  kosztorysSnap: TenderKosztorysSnapshot | null,
  estimatePln: number | null,
): Promise<{ kosztorys: TenderKosztorysSnapshot | null; estimatePln: number | null }> {
  const uploaded = opts.item.uploadedFile;
  const timingItemId = opts.pipelineTimingItemId ?? opts.item.id;
  if (
    uploaded
    && opts.athPreviewEnabled !== false
    && isKosztorysPreviewExt(uploaded.filename)
    && !kosztorysSnap?.ok
  ) {
    try {
      await withPipelineTimingStage(timingItemId, "heavy.upload_fallback", async () => {
        const preview = await fetchAndParseKosztorys(
          uploaded.publicUrl,
          uploaded.filename,
          uploaded.path,
        );
        const { athPreviewToSnapshot } = await import("@/lib/tenders-bzp-brief");
        kosztorysSnap = athPreviewToSnapshot(preview, uploaded.filename);
        if (estimatePln == null) {
          estimatePln = parsePlnFromKosztorysTotal(kosztorysSnap.totalValue, kosztorysSnap.currency);
        }
      });
    } catch { /* ignore */ }
  }
  return { kosztorys: kosztorysSnap, estimatePln };
}

function buildHeavyScanSummary(
  opts: HeavyBuildOpts,
  row: {
    kosztorysSnap: TenderKosztorysSnapshot | null;
    swzMerged: TenderSwzAnalysis | null;
    estimatePln: number | null;
    scanned: number;
    parsed: number;
    costDiscovery: TenderCostDiscoveryResult | null;
    sevenZUnpackOk?: boolean;
    sevenZInnerCount?: number;
    zipUnpackOk?: boolean;
    zipInnerCount?: number;
    partial: boolean;
  },
): TenderDossierScanSummary {
  const filenames = opts.docs.map((d) => d.filename);
  const kosztorysValuePln = plnFromKosztorysSnapshot(row.kosztorysSnap);
  return {
    totalDocuments: opts.docs.length,
    scanned: row.scanned,
    parsed: row.parsed,
    byType: countDocumentsByType(filenames),
    sevenZipCount: filenames.filter((f) => is7zFilename(f)).length,
    sevenZUnpackOk: row.sevenZUnpackOk,
    sevenZInnerCount: row.sevenZInnerCount,
    zipUnpackOk: row.zipUnpackOk,
    zipInnerCount: row.zipInnerCount,
    kosztorysFound: Boolean(row.kosztorysSnap?.ok),
    valueFound: row.swzMerged?.estimatedValuePln != null || kosztorysValuePln != null,
    criteriaFound: (row.swzMerged?.awardCriteria?.length ?? 0) > 0,
    estimateFound: row.estimatePln != null,
    costDiscovery: row.costDiscovery,
    pdfPrzedmiarCase: row.kosztorysSnap?.pdfPrzedmiarCase,
    pdfPrzedmiarNoTextLayer: row.kosztorysSnap?.pdfPrzedmiarNoTextLayer,
    pdfPrzedmiarExtractError: row.kosztorysSnap?.pdfPrzedmiarExtractError,
    parsedAt: row.partial ? undefined : new Date().toISOString(),
  };
}

/** NG11-A1 — faza kosztorysu + partial dossier (bez parsedAt w scanSummary). */
export async function buildTenderDossierCostPhase(opts: HeavyBuildOpts): Promise<TenderDossierHeavyCostPhaseResult> {
  const brief = buildHeavyBrief(opts);
  const cacheItem = heavyCacheItem(opts);

  if (opts.docs.length && opts.item.tenderId && isPipelineArtifactCacheEnabled()) {
    const fullHit = getDossierArtifactCached(cacheItem, "full", opts.existingDossier);
    if (fullHit?.phase === "full") {
      return {
        tenderDossier: fullHit.tenderDossier,
        swzAnalysis: fullHit.swzAnalysis,
        ourEstimatePln: fullHit.ourEstimatePln,
        parseSession: null,
      };
    }
    const costHit = getDossierArtifactCached(cacheItem, "cost", opts.existingDossier);
    if (costHit?.phase === "cost") {
      return {
        tenderDossier: costHit.tenderDossier,
        swzAnalysis: costHit.swzAnalysis,
        ourEstimatePln: costHit.ourEstimatePln,
        parseSession: costHit.parseSession,
      };
    }
  }

  let kosztorysSnap: TenderKosztorysSnapshot | null = opts.existingDossier?.kosztorys ?? null;
  let swzMerged = opts.existingSwz ?? null;
  let estimatePln = opts.item.ourEstimatePln ?? null;
  let parseSession: TenderDossierParseSession | null = null;
  let scanned = 0;
  let parsed = 0;
  let costDiscovery: TenderCostDiscoveryResult | null = null;
  let sevenZUnpackOk: boolean | undefined;
  let sevenZInnerCount: number | undefined;
  let zipUnpackOk: boolean | undefined;
  let zipInnerCount: number | undefined;

  if (opts.docs.length && opts.item.tenderId) {
    parseSession = await prepareTenderDossierParseSession(opts.item.tenderId, opts.docs, {
      ourEstimatePln: estimatePln,
      existingSwz: swzMerged ?? undefined,
      tenderTitle: opts.item.title,
      pipelineTimingItemId: opts.pipelineTimingItemId ?? opts.item.id,
    });
    if (parseSession) {
      await executeTenderDossierCostPhase(parseSession);
      {
        const existingK = existingKosztorysForRebuildPick(opts.existingDossier, kosztorysSnap);
        const freshK = parseSession.bestKosztorys?.ok ? parseSession.bestKosztorys : null;
        if (existingK || freshK) {
          kosztorysSnap = pickBetterKosztorys(existingK, freshK) ?? kosztorysSnap;
        }
      }
      if (parseSession.swzMerged) swzMerged = parseSession.swzMerged;
      if (parseSession.estimatePln != null && opts.item.ourEstimatePln == null) {
        estimatePln = parseSession.estimatePln;
      }
      scanned = parseSession.candidates.length;
      parsed = parseSession.parsedCount;
      costDiscovery = parseSession.costDiscovery;
      sevenZUnpackOk = parseSession.sevenZUnpackOk;
      sevenZInnerCount = parseSession.sevenZInnerCount;
      zipUnpackOk = parseSession.zipUnpackOk;
      zipInnerCount = parseSession.zipInnerCount;
    }
  }

  const uploadResult = await applyUploadFallbackKosztorys(opts, kosztorysSnap, estimatePln);
  kosztorysSnap = uploadResult.kosztorys;
  estimatePln = uploadResult.estimatePln;

  if (swzMerged) {
    swzMerged = mergeKosztorysValueIntoSwz(swzMerged, kosztorysSnap);
  }

  const scanSummary = buildHeavyScanSummary(opts, {
    kosztorysSnap,
    swzMerged,
    estimatePln,
    scanned,
    parsed,
    costDiscovery,
    sevenZUnpackOk,
    sevenZInnerCount,
    zipUnpackOk,
    zipInnerCount,
    partial: true,
  });

  const costResult: TenderDossierHeavyCostPhaseResult = {
    tenderDossier: stampDossierParserVersion({
      brief,
      kosztorys: kosztorysSnap,
      scanSummary,
      estimatePln: estimatePln ?? null,
      builtAt: new Date().toISOString(),
    }),
    swzAnalysis: swzMerged,
    ourEstimatePln: estimatePln,
    parseSession,
  };

  if (opts.docs.length && opts.item.tenderId && parseSession && isPipelineArtifactCacheEnabled()) {
    setDossierArtifactCached(cacheItem, {
      phase: "cost",
      tenderDossier: costResult.tenderDossier,
      swzAnalysis: costResult.swzAnalysis,
      ourEstimatePln: costResult.ourEstimatePln,
      parseSession,
    });
  }

  return costResult;
}

/** NG11-A1 — faza metadanych SWZ (tło) + final dossier z parsedAt. */
export async function enrichTenderDossierMetadataPhase(opts: HeavyBuildOpts & {
  parseSession: TenderDossierParseSession;
  partialDossier: TenderDossier;
  partialSwz: TenderSwzAnalysis | null;
  partialEstimatePln: number | null;
}): Promise<TenderDossierHeavyBuildResult> {
  const cacheItem = heavyCacheItem(opts);

  if (isPipelineArtifactCacheEnabled()) {
    const fullHit = getDossierArtifactCached(cacheItem, "full", opts.existingDossier);
    if (fullHit?.phase === "full") {
      return {
        tenderDossier: fullHit.tenderDossier,
        swzAnalysis: fullHit.swzAnalysis,
        ourEstimatePln: fullHit.ourEstimatePln,
      };
    }
  }

  const parsedResult = await executeTenderDossierMetadataPhase(opts.parseSession);
  let kosztorysSnap = opts.partialDossier.kosztorys ?? null;
  {
    const existingK = existingKosztorysForRebuildPick(opts.existingDossier, kosztorysSnap);
    const freshK = parsedResult.kosztorys?.ok ? parsedResult.kosztorys : null;
    if (existingK || freshK) {
      kosztorysSnap = pickBetterKosztorys(existingK, freshK) ?? kosztorysSnap;
    }
  }
  let swzMerged = parsedResult.swzMerged ?? opts.partialSwz;
  let estimatePln = parsedResult.estimatePln ?? opts.partialEstimatePln;
  if (swzMerged) {
    swzMerged = mergeKosztorysValueIntoSwz(swzMerged, kosztorysSnap);
    try {
      swzMerged = applyMetadataConfidence(swzMerged);
    } catch {
      /* TP193B — metadata best-effort */
    }
  }
  estimatePln = estimatePlnFromKosztorysSnapshot(
    kosztorysSnap,
    estimatePln,
    kosztorysSnap?.sourceFilename ?? "dossier",
  );

  const scanSummary = buildHeavyScanSummary(opts, {
    kosztorysSnap,
    swzMerged,
    estimatePln,
    scanned: parsedResult.scannedCount,
    parsed: parsedResult.parsedCount,
    costDiscovery: parsedResult.costDiscovery,
    sevenZUnpackOk: parsedResult.sevenZUnpackOk,
    sevenZInnerCount: parsedResult.sevenZInnerCount,
    zipUnpackOk: parsedResult.zipUnpackOk,
    zipInnerCount: parsedResult.zipInnerCount,
    partial: false,
  });

  const finalResult: TenderDossierHeavyBuildResult = {
    tenderDossier: stampDossierParserVersion({
      brief: opts.partialDossier.brief,
      kosztorys: kosztorysSnap,
      scanSummary,
      estimatePln: estimatePln ?? null,
      builtAt: new Date().toISOString(),
    }),
    swzAnalysis: swzMerged,
    ourEstimatePln: estimatePln,
  };

  if (isPipelineArtifactCacheEnabled()) {
    setDossierArtifactCached(cacheItem, {
      phase: "full",
      tenderDossier: finalResult.tenderDossier,
      swzAnalysis: finalResult.swzAnalysis,
      ourEstimatePln: finalResult.ourEstimatePln,
    });
  }

  return finalResult;
}

/** Ciężkie parsowanie dossier — ten sam wynik co wcześniejszy auto-pipeline na expand. */
export async function buildTenderDossierHeavy(opts: HeavyBuildOpts): Promise<TenderDossierHeavyBuildResult> {
  const costPhase = await buildTenderDossierCostPhase(opts);
  if (!costPhase.parseSession) {
    return {
      tenderDossier: costPhase.tenderDossier,
      swzAnalysis: costPhase.swzAnalysis,
      ourEstimatePln: costPhase.ourEstimatePln,
    };
  }
  return enrichTenderDossierMetadataPhase({
    ...opts,
    parseSession: costPhase.parseSession,
    partialDossier: costPhase.tenderDossier,
    partialSwz: costPhase.swzAnalysis,
    partialEstimatePln: costPhase.ourEstimatePln,
  });
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
  existingDossier?: TenderDossier | null;
  tenderTitle?: string;
}): Promise<TenderDossierAnalysisResult> {
  clearDossierTraceLog();
  clearCostTraceLog();
  const warnings: string[] = [];
  const docs = opts.bzpDocuments ?? [];
  const filenames = docs.map((d) => d.filename);

  let merged = opts.existing ?? null;
  const warningsFromSwz: string[] = [];
  const skipStandaloneSwz = Boolean(opts.tenderId && docs.length > 0);

  if (!skipStandaloneSwz) {
    const { analysis: swzPass, warnings: swzWarnings } = await analyzeTenderSwzEnhanced({
      noticeNumber: opts.noticeNumber,
      tenderId: opts.tenderId,
      documentIndex: opts.documentIndex,
      bzpDocuments: docs,
      noticeHtml: opts.noticeHtml,
      ourEstimatePln: opts.ourEstimatePln ?? null,
      existing: opts.existing ?? null,
    });
    merged = swzPass;
    warningsFromSwz.push(...swzWarnings);
  } else if (!merged && opts.noticeHtml) {
    merged = analyzeSwzFromNoticeHtmlOnly(opts.noticeHtml, opts.ourEstimatePln ?? null);
  }
  warnings.push(...warningsFromSwz);
  let kosztorys = opts.existingKosztorys ?? null;
  let estimatePln = opts.ourEstimatePln ?? null;
  let scanned = 0;
  let parsed = 0;
  let costDiscovery: TenderCostDiscoveryResult | null = null;
  let sevenZUnpackOk: boolean | undefined;
  let sevenZInnerCount: number | undefined;
  let zipUnpackOk: boolean | undefined;
  let zipInnerCount: number | undefined;

  if (opts.tenderId && docs.length > 0) {
    const dossier = await parseTenderDossierDocuments(opts.tenderId, docs, {
      ourEstimatePln: estimatePln,
      existingSwz: merged,
      tenderTitle: opts.tenderTitle,
    });
    if (dossier.swzMerged) merged = dossier.swzMerged;
    {
      const existingK = existingKosztorysForRebuildPick(
        opts.existingDossier,
        opts.existingKosztorys ?? opts.existingDossier?.kosztorys ?? null,
      );
      const freshK = dossier.kosztorys?.ok ? dossier.kosztorys : null;
      if (existingK || freshK) {
        kosztorys = pickBetterKosztorys(existingK, freshK) ?? kosztorys;
      }
    }
    if (dossier.estimatePln != null && opts.ourEstimatePln == null) {
      estimatePln = dossier.estimatePln;
    }
    scanned = dossier.scannedCount;
    parsed = dossier.parsedCount;
    costDiscovery = dossier.costDiscovery;
    sevenZUnpackOk = dossier.sevenZUnpackOk;
    sevenZInnerCount = dossier.sevenZInnerCount;
    zipUnpackOk = dossier.zipUnpackOk;
    zipInnerCount = dossier.zipInnerCount;
    warnings.push(...dossier.warnings);
  }

  if (!merged) {
    merged = analyzeSwzFromNoticeHtmlOnly(opts.noticeHtml, opts.ourEstimatePln ?? null);
  }
  if (!merged) {
    throw new Error("Brak tekstu do analizy — pobierz załączniki lub ogłoszenie BZP");
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
    zipUnpackOk,
    zipInnerCount,
    kosztorysFound: Boolean(kosztorys?.ok),
    valueFound: merged.estimatedValuePln != null || kosztorysValuePln != null,
    criteriaFound: (merged.awardCriteria?.length ?? 0) > 0,
    estimateFound: estimatePln != null,
    costDiscovery,
    pdfPrzedmiarCase: kosztorys?.pdfPrzedmiarCase,
    pdfPrzedmiarNoTextLayer: kosztorys?.pdfPrzedmiarNoTextLayer,
    pdfPrzedmiarExtractError: kosztorys?.pdfPrzedmiarExtractError,
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

/** TP202A — spread existing dossier; nadpisuje wyłącznie pola z analizy. */
export function dossierFromAnalysisResult(
  brief: TenderDossier["brief"],
  result: Pick<TenderDossierAnalysisResult, "kosztorys" | "scanSummary" | "estimatePln">,
  existingDossier?: TenderDossier | null,
): TenderDossier {
  return stampDossierParserVersion({
    ...(existingDossier ?? {}),
    brief,
    kosztorys: result.kosztorys,
    scanSummary: result.scanSummary,
    estimatePln: result.estimatePln ?? existingDossier?.estimatePln ?? null,
    builtAt: new Date().toISOString(),
  });
}
