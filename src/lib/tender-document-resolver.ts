/** Wybór i parsowanie najlepszego załącznika BZP (ATH/PDF/DOCX/XLSX/ZIP). */

import { fetchTenderDocumentBytes, fetchTenderZipCatalog, fetchTenderZipEntryBytes, base64ToBytes, resolveTenderDocumentDownload, type TenderBzpDocument } from "@/lib/tenders-bzp";
import {
  athPreviewToSnapshot,
  pickBestKosztorysDocument,
  type TenderKosztorysSnapshot,
} from "@/lib/tenders-bzp-brief";
import { pickBetterKosztorys } from "@/lib/tender-dossier-merge";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { isWeakWadiumRaw, pickBetterWadiumPln, formatSwzWadiumDisplay } from "@/lib/tenders-bzp-swz";
import {
  is7zFilename,
  isDocxFilename,
  isZipFilename,
  parsePlnFromKosztorysTotal,
  scoreTenderFilename,
} from "@/lib/tenders-bzp-filename";
import { isPdfFilename, isKosztorysPreviewExt, type AthPreviewResult } from "@/lib/ath-parser";
import {
  classifyDocumentRole,
  roleParsePriority,
  shouldParseRoleForDossier,
} from "@/lib/tender-document-role";
import { traceDossierPipeline } from "@/lib/tender-dossier-trace";
import {
  hasZipCostInnerFromCandidates,
} from "@/lib/cost-parser-zip-unpack";
import { enrichSwzFromText } from "@/lib/tenders-bzp-swz-enrich";
import { applyMetadataConfidence, scoreEstimatedValueConfidence } from "@/lib/tender-metadata-confidence";
import { roleContributesMetadata } from "@/lib/tender-metadata-sources";
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
  isFormalOfferCostFilename,
  isPdfPrzedmiarCostFilename,
  type TenderCostDiscoveryResult,
} from "@/lib/tender-cost-discovery";
import { classifyFilenamePriority } from "@/lib/document-intelligence";
import { filterCostCandidateFilenames } from "@/lib/cost-multi-01-package";
import { enrichKosztorysSnapshotFromPreview, estimatePlnFromKosztorysSnapshot, traceCostPipeline } from "@/lib/tender-cost-snapshot";
import type { TenderAwardCriterion } from "@/lib/tenders-bzp-fit";
import { mergeFormalRequirements } from "@/lib/tender-formal-requirements";
import { mergeParticipationRequirements } from "@/lib/tender-participation-requirements";
import { mergeExperienceRequirements } from "@/lib/tender-experience-requirements";
import {
  DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
  filterBytesPrefetchTodo,
  prefetchDocumentBytesWithConcurrency,
  type BytesPrefetchSpec,
} from "@/lib/tender-document-bytes-prefetch";
import { withPipelineTimingStage } from "@/lib/tender-pipeline/tender-pipeline-timing";
import {
  DOSSIER_PARSE_COST_CONCURRENCY,
  DOSSIER_PARSE_METADATA_CONCURRENCY,
  isPipelineParseConcurrencyEnabled,
  runParseCandidatesWithConcurrency,
} from "@/lib/tender-pipeline/tender-parse-concurrency";
import {
  DOSSIER_ARCHIVE_UNPACK_CONCURRENCY,
  isPipelineUnpackParallelEnabled,
  runArchiveUnpackWithConcurrency,
} from "@/lib/tender-pipeline/tender-archive-unpack-concurrency";

const DOSSIER_MAX_CANDIDATES = 15;
const ZIP_INNER_MAX = 20;

type DocParseModule = typeof import("@/lib/tenders-bzp-doc-parse");

let docParsePromise: Promise<DocParseModule> | null = null;

async function loadDocParse(): Promise<DocParseModule> {
  docParsePromise ??= import("@/lib/tenders-bzp-doc-parse");
  return docParsePromise;
}

export interface TenderDocCandidate {
  documentIndex: number;
  filename: string;
  /** INGEST-01 — explicit document identity when available (BZP / owner registry). */
  documentId?: string;
  zipInnerPath?: string;
  score: number;
  downloadUrl?: string;
  platform?: string;
}

export interface TenderDocumentParseResult {
  kosztorys: TenderKosztorysSnapshot | null;
  swzFromDoc: TenderSwzAnalysis | null;
  estimatePln: number | null;
  sourceDocumentIndex?: number;
  zipInnerPath?: string;
  sourceFilename?: string;
}

export interface TenderDossierParseResult extends TenderDocumentParseResult {
  swzMerged: TenderSwzAnalysis | null;
  scannedCount: number;
  parsedCount: number;
  warnings: string[];
  costDiscovery: TenderCostDiscoveryResult | null;
  /** P2-H.4 — co najmniej jedno archiwum 7Z rozpakowane z listą plików wewnętrznych. */
  sevenZUnpackOk?: boolean;
  sevenZInnerCount?: number;
  /** P0 — inner z archiwów ZIP (np. DOKUMENTACJA PROJEKTOWA.zip). */
  zipUnpackOk?: boolean;
  zipInnerCount?: number;
  /** COST-MULTI-01 — kandydaci kosztowi z allCandidates (addycyjne). */
  costCandidateSources?: string[];
  /** COST-MULTI-02 — snapshot per sparsowany kandydat kosztowy (addycyjne). */
  branchWinnerArtifacts?: import("@/lib/cost-multi-02-types").CostBranchArtifact[];
}

/** NG11-A1 — stan między fazą kosztorysu a metadanymi SWZ. */
export interface TenderDossierParseSession {
  tenderId: string;
  docs: TenderBzpDocument[];
  opts: {
    ourEstimatePln?: number | null;
    existingSwz?: TenderSwzAnalysis | null;
    tenderTitle?: string;
    pipelineTimingItemId?: string;
  };
  allCandidates: TenderDocCandidate[];
  candidates: TenderDocCandidate[];
  costCandidates: TenderDocCandidate[];
  costDiscovery: TenderCostDiscoveryResult | null;
  sevenZUnpackOk: boolean;
  sevenZInnerCount: number;
  zipUnpackOk: boolean;
  zipInnerCount: number;
  /** COST-PARSER-01 — 1× auto-retry unpack zużyty. */
  zipUnpackRetryUsed: boolean;
  /** COST-PARSER-01 — inner ZIP o typie kosztowym. */
  zipCostInnerPresent: boolean;
  zipUnpackFailReason?: import("@/lib/cost-parser-zip-unpack").CostParserZipUnpackFailReason;
  swzMerged: TenderSwzAnalysis | null;
  bestKosztorys: TenderKosztorysSnapshot | null;
  estimatePln: number | null;
  sourceDocumentIndex?: number;
  zipInnerPath?: string;
  sourceFilename?: string;
  winningCostSource?: string;
  parsedCount: number;
  warnings: string[];
  costPhaseComplete: boolean;
  metadataPhaseComplete: boolean;
  /** COST-MULTI-02 — pełne snapshoty z costCandidates (nie tylko bestKosztorys). */
  costParseArtifacts?: import("@/lib/cost-multi-02-types").CostBranchArtifact[];
}

function emptyDossierParseResult(
  opts?: { existingSwz?: TenderSwzAnalysis | null; ourEstimatePln?: number | null },
): TenderDossierParseResult {
  return {
    kosztorys: null,
    swzFromDoc: null,
    swzMerged: opts?.existingSwz ?? null,
    estimatePln: opts?.ourEstimatePln ?? null,
    scannedCount: 0,
    parsedCount: 0,
    warnings: [],
    costDiscovery: null,
    sevenZUnpackOk: false,
    sevenZInnerCount: 0,
    zipUnpackOk: false,
    zipInnerCount: 0,
  };
}

function buildDossierParseResultFromSession(session: TenderDossierParseSession): TenderDossierParseResult {
  return {
    kosztorys: session.bestKosztorys,
    swzFromDoc: session.swzMerged,
    swzMerged: session.swzMerged,
    estimatePln: session.estimatePln,
    sourceDocumentIndex: session.sourceDocumentIndex,
    zipInnerPath: session.zipInnerPath,
    sourceFilename: session.sourceFilename,
    scannedCount: session.candidates.length,
    parsedCount: session.parsedCount,
    warnings: session.warnings,
    costDiscovery: session.costDiscovery,
    sevenZUnpackOk: session.sevenZUnpackOk,
    sevenZInnerCount: session.sevenZInnerCount,
    zipUnpackOk: session.zipUnpackOk,
    zipInnerCount: session.zipInnerCount,
    costCandidateSources: filterCostCandidateFilenames(
      session.allCandidates.map((c) => c.filename),
    ),
    branchWinnerArtifacts: session.costParseArtifacts?.length
      ? session.costParseArtifacts
      : undefined,
  };
}

function recordCostParseArtifact(
  session: TenderDossierParseSession,
  filename: string,
  snapshot: TenderKosztorysSnapshot,
  documentId?: string,
): void {
  if (!snapshot.ok) return;
  session.costParseArtifacts ??= [];
  const entry = {
    filename,
    ...(documentId ? { documentId } : {}),
    snapshot,
  };
  const i = session.costParseArtifacts.findIndex((a) =>
    (documentId && a.documentId === documentId) || a.filename === filename,
  );
  if (i >= 0) session.costParseArtifacts[i] = entry;
  else session.costParseArtifacts.push(entry);
}

function shouldBzpReadmodelsBytesFallback(
  err: unknown,
  downloadUrl?: string,
  sourcePageUrl?: string,
): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/marketplanet|session replay|ezamawiajacy|nie udało się pobrać dokumentu/i.test(msg)) {
    return true;
  }
  if (downloadUrl && /\/repository\/download\//i.test(downloadUrl) && !sourcePageUrl?.trim()) {
    return true;
  }
  return Boolean(downloadUrl?.trim() || sourcePageUrl?.trim());
}

function isOffPlatformTenderDoc(
  access: ReturnType<typeof resolveTenderDocumentDownload>,
  resolvedUrl?: string,
  sourcePageUrl?: string,
): boolean {
  return Boolean(
    access?.platform === "ezamawiajacy"
    || access?.platform === "logintrade"
    || /\.ezamawiajacy\.pl/i.test(resolvedUrl || "")
    || /\.ezamawiajacy\.pl/i.test(sourcePageUrl || "")
    || /logintrade\.net/i.test(resolvedUrl || ""),
  );
}

function traceDownloadDiag(
  index: number,
  label: string,
  diag: unknown,
  err?: unknown,
): void {
  const payload: Record<string, unknown> = { label };
  if (diag && typeof diag === "object") Object.assign(payload, diag as Record<string, unknown>);
  if (err instanceof Error) payload.error = err.message;
  else if ((err as Error & { diag?: unknown })?.diag) payload.diag = (err as Error & { diag?: unknown }).diag;
  traceDossierPipeline("document_download_diag", `doc#${index}`, payload);
}

async function loadDocBytes(
  tenderId: string,
  index: number,
  docs: TenderBzpDocument[],
  downloadUrl?: string,
): Promise<Uint8Array> {
  const access = resolveTenderDocumentDownload(docs, index);
  const resolvedUrl = downloadUrl ?? access?.downloadUrl;
  const sourcePageUrl = access?.sourcePageUrl;
  const outerName = docs.find((d) => d.index === index)?.filename ?? "";
  const offPlatform = isOffPlatformTenderDoc(access, resolvedUrl, sourcePageUrl);
  const preferBzpReadmodelsFirst =
    Boolean(tenderId)
    && (isZipFilename(outerName) || is7zFilename(outerName))
    && !offPlatform;

  const fetchBytes = async (url?: string, pageUrl?: string, label = "fetch") => {
    try {
      const { base64, diag } = await fetchTenderDocumentBytes(tenderId, index, url, pageUrl);
      if (diag) traceDownloadDiag(index, label, diag);
      return base64ToBytes(base64);
    } catch (err) {
      traceDownloadDiag(index, `${label}_failed`, null, err);
      throw err;
    }
  };

  if (offPlatform && sourcePageUrl) {
    return fetchBytes(resolvedUrl, sourcePageUrl, "platform_session");
  }

  if (preferBzpReadmodelsFirst) {
    try {
      const bytes = await fetchBytes(undefined, undefined, "bzp_primary");
      traceDossierPipeline("document_bytes_bzp_primary", `doc#${index}`, {
        filename: outerName,
        bytes: bytes.byteLength,
      });
      return bytes;
    } catch (bzpErr) {
      traceDossierPipeline("document_bytes_bzp_primary_failed", `doc#${index}`, {
        filename: outerName,
        error: bzpErr instanceof Error ? bzpErr.message : String(bzpErr),
      });
    }
  }

  try {
    return await fetchBytes(resolvedUrl, sourcePageUrl, "platform_or_url");
  } catch (firstErr) {
    if (!shouldBzpReadmodelsBytesFallback(firstErr, resolvedUrl, sourcePageUrl)) {
      throw firstErr;
    }
    traceDossierPipeline("document_bytes_bzp_fallback", `doc#${index}`, {
      filename: access?.filename ?? outerName,
      hadDownloadUrl: Boolean(resolvedUrl),
      error: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    return fetchBytes(undefined, undefined, "bzp_fallback");
  }
}

async function loadZipInnerEntries(
  tenderId: string,
  doc: TenderBzpDocument,
  downloadUrl?: string,
) {
  const access = resolveTenderDocumentDownload([doc], doc.index);
  try {
    const catalog = await fetchTenderZipCatalog({
      tenderId,
      documentIndex: doc.index,
      downloadUrl: downloadUrl ?? access?.downloadUrl,
      sourcePageUrl: access?.sourcePageUrl,
    });
    traceDossierPipeline("zip_catalog_edge", doc.filename, {
      zipSize: catalog.zipSize,
      innerCount: catalog.entries.length,
      ath: catalog.entries.filter((e) => /\.ath$/i.test(e.filename)).map((e) => e.filename).slice(0, 5),
      diag: catalog.diag,
    });
    return catalog.entries;
  } catch (err) {
    traceDossierPipeline("zip_catalog_edge_failed", doc.filename, {
      documentIndex: doc.index,
      error: err instanceof Error ? err.message : String(err),
      diag: (err as Error & { diag?: unknown }).diag,
    });
    return null;
  }
}

function parentDownloadUrl(doc: TenderBzpDocument): string | undefined {
  return doc.downloadUrl?.trim() || undefined;
}

function candidateKey(c: TenderDocCandidate): string {
  return `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
}

async function prefetchDossierDocumentBytes(
  tenderId: string,
  docs: TenderBzpDocument[],
  specs: BytesPrefetchSpec[],
): Promise<void> {
  const todo = filterBytesPrefetchTodo(tenderId, docs, specs);
  if (!todo.length) return;
  traceDossierPipeline("document_bytes_prefetch", "dossier", {
    count: todo.length,
    concurrency: DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
  });
  await prefetchDocumentBytesWithConcurrency(
    todo,
    DOSSIER_DOCUMENT_BYTES_CONCURRENCY,
    async (spec) => {
      await loadDocBytes(tenderId, spec.documentIndex, docs, spec.downloadUrl);
    },
  );
}

function collectArchivePrefetchSpecs(docs: TenderBzpDocument[]): BytesPrefetchSpec[] {
  return docs
    .filter((d) => isZipFilename(d.filename) || is7zFilename(d.filename))
    .map((d) => ({ documentIndex: d.index, downloadUrl: parentDownloadUrl(d) }));
}

interface ArchiveUnpackTask {
  doc: TenderBzpDocument;
  kind: "zip" | "7z";
  downloadUrl?: string;
}

async function unpackZipArchiveInnerCandidates(
  tenderId: string,
  docs: TenderBzpDocument[],
  doc: TenderBzpDocument,
  dl: string | undefined,
): Promise<TenderDocCandidate[]> {
  const innerCandidates: TenderDocCandidate[] = [];
  try {
    traceDossierPipeline("zip_downloaded", doc.filename, {
      documentIndex: doc.index,
      downloadUrl: Boolean(dl),
    });
    const { listZipFiles } = await loadDocParse();
    let inner = await loadZipInnerEntries(tenderId, doc, dl);
    let zipBytes: Uint8Array | null = null;
    if (!inner?.length) {
      zipBytes = await loadDocBytes(tenderId, doc.index, docs, dl);
      traceDossierPipeline("zip_opened", doc.filename, { bytes: zipBytes.byteLength });
      inner = await listZipFiles(zipBytes);
    } else {
      traceDossierPipeline("zip_opened", doc.filename, { bytes: "edge_catalog", innerViaEdge: true });
    }
    const docZipBoost = /dokumentacja\s*projektowa|przedmiar|kosztorys/i.test(doc.filename) ? 20 : 0;
    traceDossierPipeline("zip_inner_files_found", doc.filename, {
      count: inner.length,
      ath: inner.filter((e) => /\.ath$/i.test(e.filename)).map((e) => e.filename).slice(0, 5),
    });
    traceCostPipeline("zip_found", doc.filename, { innerCount: inner.length });
    for (const entry of inner.slice(0, ZIP_INNER_MAX)) {
      const innerName = `${doc.filename} → ${entry.filename}`;
      if (/\.ath$/i.test(entry.filename)) {
        traceDossierPipeline("ath_detected", innerName, { path: entry.path, score: entry.score });
        traceCostPipeline("ath_found", innerName, { path: entry.path });
      }
      innerCandidates.push({
        documentIndex: doc.index,
        filename: innerName,
        zipInnerPath: entry.path,
        score: entry.score + (doc.isSwzHint ? 10 : 0) + docZipBoost,
        downloadUrl: dl,
        platform: doc.platform,
      });
    }
  } catch (e) {
    traceDossierPipeline("zip_open_failed", doc.filename, {
      documentIndex: doc.index,
      downloadUrl: Boolean(dl),
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return innerCandidates;
}

async function unpack7zArchiveInnerCandidates(
  tenderId: string,
  docs: TenderBzpDocument[],
  doc: TenderBzpDocument,
  dl: string | undefined,
): Promise<TenderDocCandidate[]> {
  const innerCandidates: TenderDocCandidate[] = [];
  try {
    traceDossierPipeline("7z_downloaded", doc.filename, {
      documentIndex: doc.index,
      downloadUrl: Boolean(dl),
    });
    const { list7zFiles } = await loadDocParse();
    const archiveBytes = await loadDocBytes(tenderId, doc.index, docs, dl);
    traceDossierPipeline("7z_opened", doc.filename, { bytes: archiveBytes.byteLength });
    const inner = await list7zFiles(archiveBytes);
    traceDossierPipeline("7z_inner_files_found", doc.filename, {
      count: inner.length,
      ath: inner.filter((e) => /\.ath$/i.test(e.filename)).map((e) => e.filename).slice(0, 5),
    });
    traceCostPipeline("7z_found", doc.filename, { innerCount: inner.length });
    for (const entry of inner.slice(0, ZIP_INNER_MAX)) {
      const innerName = `${doc.filename} → ${entry.filename}`;
      if (/\.ath$/i.test(entry.filename)) {
        traceDossierPipeline("ath_detected", innerName, { path: entry.path, score: entry.score });
        traceCostPipeline("ath_found", innerName, { path: entry.path });
      }
      innerCandidates.push({
        documentIndex: doc.index,
        filename: innerName,
        zipInnerPath: entry.path,
        score: entry.score + (doc.isSwzHint ? 10 : 0),
        downloadUrl: dl,
        platform: doc.platform,
      });
    }
  } catch (e) {
    traceDossierPipeline("7z_open_failed", doc.filename, {
      documentIndex: doc.index,
      downloadUrl: Boolean(dl),
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return innerCandidates;
}

async function runArchiveUnpackTask(
  tenderId: string,
  docs: TenderBzpDocument[],
  task: ArchiveUnpackTask,
): Promise<TenderDocCandidate[]> {
  if (task.kind === "zip") {
    return unpackZipArchiveInnerCandidates(tenderId, docs, task.doc, task.downloadUrl);
  }
  return unpack7zArchiveInnerCandidates(tenderId, docs, task.doc, task.downloadUrl);
}

function collectCandidatePrefetchSpecs(candidates: TenderDocCandidate[]): BytesPrefetchSpec[] {
  return candidates.map((c) => ({
    documentIndex: c.documentIndex,
    downloadUrl: c.downloadUrl,
  }));
}

function isKosztorysPreviewUsable(preview: AthPreviewResult): boolean {
  if (preview.documentType === "PDF_PRZEDMIAR" && preview.ok) return true;
  if (preview.rows.length > 0) return true;
  if (preview.totalValue?.trim()) return true;
  if ((preview.summaryLines?.length ?? 0) > 0) return true;
  return preview.ok && Boolean(preview.rawPreview?.trim());
}

/** P0 WM PDF Recovery — discovery PDF przedmiar nie może zostać zastąpiony formularzem ofertowym XLSX. */
function isPdfPrzedmiarDiscoveryType(
  type: TenderCostDiscoveryResult["type"] | undefined,
): boolean {
  return type === "pdf_przedmiar" || type === "zip_pdf_przedmiar";
}

function isFormalOfferKosztorysCandidate(filename: string): boolean {
  if (isFormalOfferCostFilename(filename)) return true;
  const base = (filename.split(" → ").pop() ?? filename).toLowerCase();
  return /formularz.*ofert|oferta.*cz[eę][sś][cć]\s*1/i.test(base);
}

function shouldProtectPdfPrzedmiarWinner(
  existing: TenderKosztorysSnapshot | null,
  candFilename: string,
  discovery: TenderCostDiscoveryResult | null,
): boolean {
  if (!existing?.ok || (existing.rowCount ?? 0) <= 0) return false;
  if (existing.pdfPrzedmiarCase !== 1) return false;
  if (!discovery?.found || !isPdfPrzedmiarDiscoveryType(discovery.type)) return false;
  return isFormalOfferKosztorysCandidate(candFilename);
}

function shouldReplaceBestKosztorys(
  existing: TenderKosztorysSnapshot | null,
  incoming: TenderKosztorysSnapshot,
  candFilename: string,
  discovery: TenderCostDiscoveryResult | null,
  opts?: { allowTotalValueFill?: boolean },
): boolean {
  if (!existing?.ok) return true;
  if (shouldProtectPdfPrzedmiarWinner(existing, candFilename, discovery)) return false;
  const pickOpts = discovery?.found
    ? { discoveryWinnerSource: discovery.source }
    : undefined;
  const picked = pickBetterKosztorys(existing, incoming, pickOpts);
  if (picked === incoming) return true;
  if (picked === existing) return false;
  if (opts?.allowTotalValueFill && !existing.totalValue && incoming.totalValue) return true;
  return false;
}

/**
 * P2-E.1B — kosztorys zawsze parsowany (standalone ATH + inner ZIP ATH).
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — Filename Priority boost PDFs
 * enter cost parse queue (filename NEVER rejects; DI decides parse inside parser).
 */
function pickCostParseCandidates(
  all: TenderDocCandidate[],
  costDiscovery: TenderCostDiscoveryResult | null,
): TenderDocCandidate[] {
  const out = new Map<string, TenderDocCandidate>();
  if (costDiscovery?.found && !isFormalOfferCostFilename(costDiscovery.source)) {
    const match = all.find((c) => c.filename === costDiscovery.source);
    if (match) out.set(candidateKey(match), match);
  }
  for (const c of all) {
    if (isFormalOfferCostFilename(c.filename)) continue;
    if (classifyDocumentRole(c.filename) === "kosztorys") {
      out.set(candidateKey(c), c);
    }
    const base = c.filename.split(" → ").pop() ?? c.filename;
    if (isKosztorysPreviewExt(base)) {
      out.set(candidateKey(c), c);
    }
    if (isPdfPrzedmiarCostFilename(c.filename)) {
      out.set(candidateKey(c), c);
    }
    // COND-8: boost / annex quantity cues → candidate (DI may still recommend none)
    if (isPdfFilename(base)) {
      const pri = classifyFilenamePriority(c.filename).priority;
      const annexCue = /za[łl][aą]cznik|wykaz|zakres\s+rzeczowo|rzeczowo[\s-]*finansow/i.test(
        c.filename,
      );
      if (pri === "boost" || annexCue) {
        out.set(candidateKey(c), c);
      }
    }
  }
  return [...out.values()];
}

export async function buildTenderDocCandidates(
  tenderId: string,
  docs: TenderBzpDocument[],
): Promise<TenderDocCandidate[]> {
  await prefetchDossierDocumentBytes(tenderId, docs, collectArchivePrefetchSpecs(docs));
  const candidates: TenderDocCandidate[] = [];
  const unpackTasks: ArchiveUnpackTask[] = [];

  for (const doc of docs) {
    const dl = parentDownloadUrl(doc);
    let score = scoreTenderFilename(doc.filename);
    if (doc.isSwzHint) score += 18;
    candidates.push({
      documentIndex: doc.index,
      filename: doc.filename,
      documentId: doc.documentId || undefined,
      score,
      downloadUrl: dl,
      platform: doc.platform,
    });
    if (isZipFilename(doc.filename)) {
      unpackTasks.push({ doc, kind: "zip", downloadUrl: dl });
    } else if (is7zFilename(doc.filename)) {
      unpackTasks.push({ doc, kind: "7z", downloadUrl: dl });
    }
  }

  if (!isPipelineUnpackParallelEnabled() || unpackTasks.length <= 1) {
    for (const task of unpackTasks) {
      const inners = await runArchiveUnpackTask(tenderId, docs, task);
      candidates.push(...inners);
    }
  } else {
    const outcomes = await runArchiveUnpackWithConcurrency(
      unpackTasks,
      DOSSIER_ARCHIVE_UNPACK_CONCURRENCY,
      async (task) => {
        const inners = await runArchiveUnpackTask(tenderId, docs, task);
        return { value: inners, error: null };
      },
    );
    for (const outcome of outcomes) {
      if (outcome.value?.length) candidates.push(...outcome.value);
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function mergeAwardCriteria(
  a: TenderSwzAnalysis["awardCriteria"],
  b: TenderSwzAnalysis["awardCriteria"],
): TenderAwardCriterion[] {
  const combined = [...(a ?? []), ...(b ?? [])];
  const seen = new Set<string>();
  return combined.filter((c) => {
    const key = `${c.name.toLowerCase()}|${c.weightPct ?? ""}|${c.maxPoints ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

/** P2-H.2/H.3 — outer ZIP/7Z pomijany gdy buildTenderDocCandidates dodał inner wpisy. */
function filterOuterArchiveWhenInnerExists(candidates: TenderDocCandidate[]): TenderDocCandidate[] {
  const innerDocIndices = new Set(
    candidates.filter((c) => c.zipInnerPath).map((c) => c.documentIndex),
  );
  return candidates.filter((c) => {
    if (c.zipInnerPath) return true;
    if (isZipFilename(c.filename) || is7zFilename(c.filename)) {
      return !innerDocIndices.has(c.documentIndex);
    }
    return true;
  });
}

function selectDossierCandidates(candidates: TenderDocCandidate[]): TenderDocCandidate[] {
  const filtered = filterOuterArchiveWhenInnerExists(candidates);
  const ranked = [...filtered].sort((a, b) => {
    const ra = roleParsePriority(classifyDocumentRole(a.filename));
    const rb = roleParsePriority(classifyDocumentRole(b.filename));
    if (ra !== rb) return ra - rb;
    return b.score - a.score;
  });
  const selected = new Map<string, TenderDocCandidate>();
  for (const c of ranked) {
    const role = classifyDocumentRole(c.filename);
    if (!shouldParseRoleForDossier(role, c.score)) continue;
    const key = `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
    selected.set(key, c);
    if (selected.size >= DOSSIER_MAX_CANDIDATES) break;
  }
  if (selected.size < 5) {
    for (const c of ranked) {
      const key = `${c.documentIndex}|${c.zipInnerPath ?? ""}`;
      selected.set(key, c);
      if (selected.size >= DOSSIER_MAX_CANDIDATES) break;
    }
  }
  return [...selected.values()];
}

export async function parseTenderDocumentCandidate(
  tenderId: string,
  candidate: TenderDocCandidate,
  docs: TenderBzpDocument[],
  opts?: { ourEstimatePln?: number | null; mergeSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const {
    analyzeSwzFromDocumentText,
    parseDocumentToKosztorys,
    parseDocumentToSwzText,
    pickBestFrom7zBytes,
    pickBestFromZipBytes,
    read7zEntry,
    readZipEntry,
  } = await loadDocParse();

  const loadBytes = (idx: number) => loadDocBytes(
    tenderId,
    idx,
    docs,
    candidate.downloadUrl ?? resolveTenderDocumentDownload(docs, idx)?.downloadUrl,
  );

  const outerDoc = docs.find((d) => d.index === candidate.documentIndex);
  const outerName = outerDoc?.filename ?? candidate.filename.split(" → ")[0] ?? candidate.filename;
  const outerAccess = resolveTenderDocumentDownload(docs, candidate.documentIndex);

  let bytes: Uint8Array;
  let effectiveName: string;

  if (candidate.zipInnerPath && isZipFilename(outerName)) {
    try {
      const innerPayload = await fetchTenderZipEntryBytes({
        tenderId,
        documentIndex: candidate.documentIndex,
        innerPath: candidate.zipInnerPath,
        downloadUrl: candidate.downloadUrl ?? outerAccess?.downloadUrl,
        sourcePageUrl: outerAccess?.sourcePageUrl,
      });
      bytes = base64ToBytes(innerPayload.base64);
      effectiveName = candidate.filename.split(" → ").pop() ?? candidate.filename;
      traceDossierPipeline("zip_inner_bytes_edge", candidate.filename, {
        innerPath: candidate.zipInnerPath,
        bytes: bytes.byteLength,
        diag: innerPayload.diag,
      });
    } catch {
      const outerBytes = await loadBytes(candidate.documentIndex);
      const inner = await readZipEntry(outerBytes, candidate.zipInnerPath);
      bytes = inner ?? outerBytes;
      effectiveName = candidate.filename.split(" → ").pop() ?? candidate.filename;
    }
  } else if (candidate.zipInnerPath) {
    const outerBytes = await loadBytes(candidate.documentIndex);
    const inner = is7zFilename(outerName)
      ? await read7zEntry(outerBytes, candidate.zipInnerPath)
      : await readZipEntry(outerBytes, candidate.zipInnerPath);
    bytes = inner ?? outerBytes;
    effectiveName = candidate.filename.split(" → ").pop() ?? candidate.filename;
  } else if (isZipFilename(candidate.filename)) {
    const outerBytes = await loadBytes(candidate.documentIndex);
    const picked = await pickBestFromZipBytes(outerBytes, candidate.filename);
    if (picked) {
      bytes = picked.bytes;
      effectiveName = picked.filename.includes(" → ")
        ? picked.filename.split(" → ").pop()!
        : picked.filename;
    } else {
      bytes = outerBytes;
      effectiveName = candidate.filename;
    }
  } else if (is7zFilename(candidate.filename)) {
    const outerBytes = await loadBytes(candidate.documentIndex);
    const picked = await pickBestFrom7zBytes(outerBytes, candidate.filename);
    if (picked) {
      bytes = picked.bytes;
      effectiveName = picked.filename.includes(" → ")
        ? picked.filename.split(" → ").pop()!
        : picked.filename;
    } else {
      bytes = outerBytes;
      effectiveName = candidate.filename;
    }
  } else {
    bytes = await loadBytes(candidate.documentIndex);
    effectiveName = candidate.filename;
  }

  if (isKosztorysPreviewExt(effectiveName)) {
    traceDossierPipeline("ath_bytes_loaded", candidate.filename, {
      effectiveName,
      bytes: bytes.byteLength,
      zipInner: Boolean(candidate.zipInnerPath),
      downloadUrl: Boolean(candidate.downloadUrl),
    });
  }

  let kosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;

  const kosztorysPreview = await parseDocumentToKosztorys(bytes, effectiveName);
  if (kosztorysPreview && isKosztorysPreviewUsable(kosztorysPreview)) {
    traceDossierPipeline("ath_parsed", candidate.filename, {
      ok: kosztorysPreview.ok,
      rows: kosztorysPreview.rows.length,
      totalValue: kosztorysPreview.totalValue ?? null,
      summaryLines: kosztorysPreview.summaryLines?.length ?? 0,
    });
    traceCostPipeline("ath_parsed", candidate.filename, {
      rows: kosztorysPreview.rows.length,
      totalValue: kosztorysPreview.totalValue ?? null,
      summaryLines: kosztorysPreview.summaryLines?.length ?? 0,
    });
    const baseSnap = athPreviewToSnapshot({ ...kosztorysPreview, ok: true }, effectiveName);
    kosztorys = enrichKosztorysSnapshotFromPreview(kosztorysPreview, {
      ...baseSnap,
      sourceDocumentIndex: candidate.documentIndex,
      zipInnerPath: candidate.zipInnerPath,
    });
    traceDossierPipeline("kosztorys_created", candidate.filename, {
      rowCount: kosztorys.rowCount,
      totalValue: kosztorys.totalValue ?? null,
    });
    traceCostPipeline("snapshot_created", candidate.filename, {
      rowCount: kosztorys.rowCount,
      totalValue: kosztorys.totalValue ?? null,
      ok: kosztorys.ok,
    });
    if (estimatePln == null) {
      estimatePln = estimatePlnFromKosztorysSnapshot(kosztorys, estimatePln, candidate.filename);
    }
  } else if (kosztorysPreview && isKosztorysPreviewExt(effectiveName)) {
    traceDossierPipeline("ath_parse_failed", candidate.filename, {
      ok: kosztorysPreview.ok,
      warnings: kosztorysPreview.warnings?.slice(0, 3),
    });
  }

  let swzFromDoc: TenderSwzAnalysis | null = null;
  const canSwzText = isPdfFilename(effectiveName) || isDocxFilename(effectiveName);
  if (canSwzText) {
    const { text, source, warnings } = await parseDocumentToSwzText(bytes, effectiveName);
    const base = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    swzFromDoc = base ? enrichSwzFromText(text, base) : null;
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...swzFromDoc.qualificationHints, ...warnings].slice(0, 6),
      };
    }
    if (swzFromDoc && estimatePln == null && swzFromDoc.estimatedValuePln != null) {
      estimatePln = swzFromDoc.estimatedValuePln;
    }
  }

  if (!kosztorys && isPdfFilename(effectiveName) && !canSwzText) {
    /* noop */
  }

  if (!kosztorys && isPdfFilename(effectiveName) && !swzFromDoc) {
    const { text, source, warnings } = await parseDocumentToSwzText(bytes, effectiveName);
    const base = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    swzFromDoc = base ? enrichSwzFromText(text, base) : null;
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...(swzFromDoc.qualificationHints ?? []), ...warnings].slice(0, 6),
      };
    }
  }

  return {
    kosztorys,
    swzFromDoc,
    estimatePln,
    sourceDocumentIndex: candidate.documentIndex,
    zipInnerPath: candidate.zipInnerPath,
    sourceFilename: effectiveName,
  };
}

/** Parsowanie pliku z zewnętrznego źródła (BIP / link z ogłoszenia) — bez e-Zamówień. */
export async function parseExternalTenderFile(
  bytes: Uint8Array,
  filename: string,
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const {
    analyzeSwzFromDocumentText,
    parseDocumentToKosztorys,
    parseDocumentToSwzText,
    pickBestFrom7zBytes,
    pickBestFromZipBytes,
  } = await loadDocParse();

  let effectiveBytes = bytes;
  let effectiveName = filename;

  if (isZipFilename(filename)) {
    const picked = await pickBestFromZipBytes(bytes, filename);
    if (picked) {
      effectiveBytes = picked.bytes;
      effectiveName = picked.filename;
    }
  } else if (is7zFilename(filename)) {
    const picked = await pickBestFrom7zBytes(bytes, filename);
    if (picked) {
      effectiveBytes = picked.bytes;
      effectiveName = picked.filename;
    }
  }

  let kosztorys: TenderKosztorysSnapshot | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;

  const kosztorysPreview = await parseDocumentToKosztorys(effectiveBytes, effectiveName);
  if (
    kosztorysPreview?.ok
    && (
      kosztorysPreview.rows.length > 0
      || kosztorysPreview.totalValue
      || kosztorysPreview.documentType === "PDF_PRZEDMIAR"
    )
  ) {
    kosztorys = {
      ...athPreviewToSnapshot(kosztorysPreview, effectiveName),
      sourceDocumentIndex: undefined,
    };
    if (estimatePln == null) {
      estimatePln = parsePlnFromKosztorysTotal(kosztorys.totalValue, kosztorys.currency);
    }
  }

  let swzFromDoc: TenderSwzAnalysis | null = null;
  const canSwzText = isPdfFilename(effectiveName) || isDocxFilename(effectiveName);
  if (canSwzText) {
    const { text, source, warnings } = await parseDocumentToSwzText(effectiveBytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...swzFromDoc.qualificationHints, ...warnings].slice(0, 6),
      };
    }
    if (swzFromDoc && estimatePln == null && swzFromDoc.estimatedValuePln != null) {
      estimatePln = swzFromDoc.estimatedValuePln;
    }
  }

  if (!kosztorys && !swzFromDoc && isPdfFilename(effectiveName)) {
    const { text, source, warnings } = await parseDocumentToSwzText(effectiveBytes, effectiveName);
    swzFromDoc = analyzeSwzFromDocumentText(text, source, {
      sourceFilename: effectiveName,
      ourEstimatePln: estimatePln,
    });
    if (swzFromDoc && warnings.length) {
      swzFromDoc = {
        ...swzFromDoc,
        qualificationHints: [...(swzFromDoc.qualificationHints ?? []), ...warnings].slice(0, 6),
      };
    }
  }

  return {
    kosztorys,
    swzFromDoc,
    estimatePln,
    sourceFilename: effectiveName,
  };
}

export async function parseExternalTenderDocuments(
  files: { filename: string; score: number; publicUrl: string }[],
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  const sorted = [...files].sort((a, b) => b.score - a.score).slice(0, 6);
  let bestKosztorys: TenderKosztorysSnapshot | null = null;
  let bestSwz: TenderSwzAnalysis | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;
  let sourceFilename: string | undefined;

  for (const file of sorted) {
    try {
      const res = await fetch(file.publicUrl);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024 || bytes.byteLength < 80) continue;
      const parsed = await parseExternalTenderFile(bytes, file.filename, {
        ourEstimatePln: estimatePln,
        existingSwz: opts?.existingSwz,
      });
      if (parsed.kosztorys?.ok && !bestKosztorys) {
        bestKosztorys = parsed.kosztorys;
        sourceFilename = parsed.sourceFilename;
        if (parsed.estimatePln != null) estimatePln = parsed.estimatePln;
      }
      if (parsed.swzFromDoc && !bestSwz) {
        bestSwz = parsed.swzFromDoc;
        if (!sourceFilename) sourceFilename = parsed.sourceFilename;
      }
      if (bestKosztorys?.ok && bestSwz) break;
    } catch {
      /* kolejny plik */
    }
  }

  return {
    kosztorys: bestKosztorys,
    swzFromDoc: bestSwz,
    estimatePln,
    sourceFilename,
  };
}

export async function parseBestTenderDocuments(
  tenderId: string,
  docs: TenderBzpDocument[],
  opts?: { ourEstimatePln?: number | null; existingSwz?: TenderSwzAnalysis | null },
): Promise<TenderDocumentParseResult> {
  if (!docs.length) {
    return { kosztorys: null, swzFromDoc: null, estimatePln: opts?.ourEstimatePln ?? null };
  }

  const candidates = await buildTenderDocCandidates(tenderId, docs);
  const top = candidates.filter((c) => c.score >= 8).slice(0, 6);
  const toTry = top.length > 0 ? top : candidates.slice(0, 3);

  let bestKosztorys: TenderKosztorysSnapshot | null = null;
  let bestSwz: TenderSwzAnalysis | null = null;
  let estimatePln = opts?.ourEstimatePln ?? null;
  let sourceDocumentIndex: number | undefined;
  let zipInnerPath: string | undefined;
  let sourceFilename: string | undefined;

  for (const cand of toTry) {
    const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, {
      ourEstimatePln: estimatePln,
      mergeSwz: opts?.existingSwz,
    });
    if (parsed.kosztorys?.ok && !bestKosztorys) {
      bestKosztorys = parsed.kosztorys;
      sourceDocumentIndex = parsed.sourceDocumentIndex;
      zipInnerPath = parsed.zipInnerPath;
      sourceFilename = parsed.sourceFilename;
      if (parsed.estimatePln != null) estimatePln = parsed.estimatePln;
    }
    if (parsed.swzFromDoc && !bestSwz) {
      bestSwz = parsed.swzFromDoc;
      if (!sourceDocumentIndex) {
        sourceDocumentIndex = parsed.sourceDocumentIndex;
        zipInnerPath = parsed.zipInnerPath;
        sourceFilename = parsed.sourceFilename;
      }
    }
    if (bestKosztorys?.ok && bestSwz) break;
  }

  if (!bestKosztorys && !bestSwz) {
    const legacy = pickBestKosztorysDocument(docs);
    if (legacy) {
      const cand: TenderDocCandidate = {
        documentIndex: legacy.index,
        filename: legacy.filename,
        score: scoreTenderFilename(legacy.filename),
        downloadUrl: parentDownloadUrl(legacy),
        platform: legacy.platform,
      };
      const parsed = await parseTenderDocumentCandidate(tenderId, cand, docs, { ourEstimatePln: estimatePln });
      bestKosztorys = parsed.kosztorys;
      bestSwz = parsed.swzFromDoc;
      estimatePln = parsed.estimatePln ?? estimatePln;
      sourceDocumentIndex = parsed.sourceDocumentIndex;
      zipInnerPath = parsed.zipInnerPath;
      sourceFilename = parsed.sourceFilename;
    }
  }

  return {
    kosztorys: bestKosztorys,
    swzFromDoc: bestSwz,
    estimatePln,
    sourceDocumentIndex,
    zipInnerPath,
    sourceFilename,
  };
}

/** NG11-A1 — setup + prefetch (shared przez cost i metadata). COST-PARSER-01: 1× ZIP unpack retry. */
export async function prepareTenderDossierParseSession(
  tenderId: string,
  docs: TenderBzpDocument[],
  opts?: {
    ourEstimatePln?: number | null;
    existingSwz?: TenderSwzAnalysis | null;
    tenderTitle?: string;
    pipelineTimingItemId?: string;
  },
): Promise<TenderDossierParseSession | null> {
  if (!docs.length) return null;

  const timingItemId = opts?.pipelineTimingItemId;
  const hasTopLevelZip = docs.some((d) => isZipFilename(d.filename));

  const buildCandidates = () =>
    timingItemId
      ? withPipelineTimingStage(timingItemId, "heavy.archive_unpack", () =>
          buildTenderDocCandidates(tenderId, docs))
      : buildTenderDocCandidates(tenderId, docs);

  let allCandidates = await buildCandidates();
  let zipUnpackRetryUsed = false;
  let zipUnpackFailReason: import("@/lib/cost-parser-zip-unpack").CostParserZipUnpackFailReason | undefined;

  const computeZipFlags = (candidates: TenderDocCandidate[]) => {
    const zipDocIndices = new Set(
      docs.filter((d) => isZipFilename(d.filename)).map((d) => d.index),
    );
    const zipWithInner = new Set(
      candidates
        .filter((c) => c.zipInnerPath && zipDocIndices.has(c.documentIndex))
        .map((c) => c.documentIndex),
    );
    const zipInnerCount = candidates.filter(
      (c) => c.zipInnerPath && zipDocIndices.has(c.documentIndex),
    ).length;
    const zipUnpackOk = zipDocIndices.size === 0 || zipWithInner.size > 0;
    const zipCostInnerPresent = hasZipCostInnerFromCandidates(candidates);
    return { zipDocIndices, zipWithInner, zipInnerCount, zipUnpackOk, zipCostInnerPresent };
  };

  let zipFlags = computeZipFlags(allCandidates);

  /* COST-PARSER-01 §6 — dokładnie 1× retry unpack gdy pierwszy pass fail. */
  if (hasTopLevelZip && !zipFlags.zipUnpackOk && !zipUnpackRetryUsed) {
    zipUnpackRetryUsed = true;
    traceDossierPipeline("zip_unpack_retry", "dossier", {
      tenderId,
      reason: "zipUnpackOk_false",
    });
    allCandidates = await buildCandidates();
    zipFlags = computeZipFlags(allCandidates);
    if (!zipFlags.zipUnpackOk) {
      zipUnpackFailReason = "unknown";
    }
  }

  let costDiscovery = discoverBestCostDocument(allCandidates, { tenderTitle: opts?.tenderTitle });
  if (costDiscovery.found) {
    traceDossierPipeline("cost_document_discovered", costDiscovery.source, {
      type: costDiscovery.type,
      confidence: costDiscovery.confidence,
    });
  }

  const sevenZDocIndices = new Set(
    docs.filter((d) => is7zFilename(d.filename)).map((d) => d.index),
  );
  const sevenZWithInner = new Set(
    allCandidates
      .filter((c) => c.zipInnerPath && sevenZDocIndices.has(c.documentIndex))
      .map((c) => c.documentIndex),
  );
  const sevenZInnerCount = allCandidates.filter(
    (c) => c.zipInnerPath && sevenZDocIndices.has(c.documentIndex),
  ).length;
  const sevenZUnpackOk = sevenZDocIndices.size === 0 || sevenZWithInner.size > 0;

  const { zipDocIndices, zipWithInner, zipInnerCount, zipUnpackOk, zipCostInnerPresent } = zipFlags;

  const candidates = selectDossierCandidates(allCandidates);
  const costCandidates = pickCostParseCandidates(allCandidates, costDiscovery);

  if (timingItemId) {
    await withPipelineTimingStage(timingItemId, "heavy.prefetch", () =>
      prefetchDossierDocumentBytes(
        tenderId,
        docs,
        collectCandidatePrefetchSpecs([...costCandidates, ...candidates]),
      ));
  } else {
    await prefetchDossierDocumentBytes(
      tenderId,
      docs,
      collectCandidatePrefetchSpecs([...costCandidates, ...candidates]),
    );
  }

  const warnings: string[] = [];
  for (const doc of docs) {
    traceDossierPipeline("document_discovered", doc.filename, {
      index: doc.index,
      role: classifyDocumentRole(doc.filename),
    });
    if (is7zFilename(doc.filename)) {
      const supported = sevenZWithInner.has(doc.index);
      traceDossierPipeline("document_classified", doc.filename, { role: "7z", supported });
      if (!supported) {
        warnings.push(`Wykryto archiwum 7Z: ${doc.filename} — nie udało się odczytać zawartości`);
      }
    }
    if (isZipFilename(doc.filename)) {
      const supported = zipWithInner.has(doc.index);
      traceDossierPipeline("document_classified", doc.filename, {
        role: "zip",
        supported,
        inner: zipInnerCount,
        retryUsed: zipUnpackRetryUsed,
      });
      if (!supported) {
        warnings.push(`Wykryto archiwum ZIP: ${doc.filename} — nie udało się odczytać zawartości`);
      }
    }
  }

  return {
    tenderId,
    docs,
    opts: opts ?? {},
    allCandidates,
    candidates,
    costCandidates,
    costDiscovery,
    sevenZUnpackOk,
    sevenZInnerCount,
    zipUnpackOk,
    zipInnerCount,
    zipUnpackRetryUsed,
    zipCostInnerPresent,
    zipUnpackFailReason,
    swzMerged: opts?.existingSwz ?? null,
    bestKosztorys: null,
    estimatePln: opts?.ourEstimatePln ?? null,
    parsedCount: 0,
    warnings,
    costPhaseComplete: false,
    metadataPhaseComplete: false,
    costParseArtifacts: [],
  };
}

function shouldSkipMetadataCandidate(
  session: TenderDossierParseSession,
  cand: TenderDocCandidate,
): boolean {
  const role = classifyDocumentRole(cand.filename);
  const contributesMeta =
    roleContributesMetadata(role, "estimatedValue")
    || roleContributesMetadata(role, "awardCriteria")
    || roleContributesMetadata(role, "wadium")
    || roleContributesMetadata(role, "implementationDeadline");
  if (!contributesMeta && role !== "kosztorys" && roleParsePriority(role) > 7) return true;
  const skipDuplicateCost = session.costCandidates.some((cc) => candidateKey(cc) === candidateKey(cand))
    && session.bestKosztorys?.ok
    && classifyDocumentRole(cand.filename) === "kosztorys";
  return skipDuplicateCost;
}

function applyCostCandidateParseToSession(
  session: TenderDossierParseSession,
  cand: TenderDocCandidate,
  parsed: TenderDocumentParseResult | null,
  errorMessage: string | null,
): void {
  if (errorMessage) {
    session.warnings.push(`${cand.filename}: ${errorMessage}`);
    return;
  }
  if (!parsed) return;
  session.parsedCount += 1;
  if (parsed.kosztorys?.ok) {
    // COST-MULTI-02 — zachowaj snapshot per kandydat (nie tylko bestKosztorys / ONE).
    recordCostParseArtifact(session, cand.filename, parsed.kosztorys, cand.documentId);
    if (shouldReplaceBestKosztorys(session.bestKosztorys, parsed.kosztorys, cand.filename, session.costDiscovery, {
      allowTotalValueFill: true,
    })) {
      session.bestKosztorys = parsed.kosztorys;
      session.sourceDocumentIndex = parsed.sourceDocumentIndex;
      session.zipInnerPath = parsed.zipInnerPath;
      session.sourceFilename = parsed.sourceFilename;
      session.winningCostSource = cand.filename;
    }
    if (parsed.estimatePln != null) {
      session.estimatePln = parsed.estimatePln;
      traceDossierPipeline("cost_estimate_extracted", cand.filename, { estimatePln: parsed.estimatePln });
    }
  }
}

function applyMetadataCandidateParseToSession(
  session: TenderDossierParseSession,
  cand: TenderDocCandidate,
  parsed: TenderDocumentParseResult | null,
  errorMessage: string | null,
): void {
  if (errorMessage) {
    session.warnings.push(`${cand.filename}: ${errorMessage}`);
    return;
  }
  if (!parsed) return;
  session.parsedCount += 1;
  traceDossierPipeline("document_parsed", cand.filename, {
    kosztorys: Boolean(parsed.kosztorys?.ok),
    swz: Boolean(parsed.swzFromDoc),
  });

  if (parsed.kosztorys?.ok) {
    recordCostParseArtifact(session, cand.filename, parsed.kosztorys, cand.documentId);
    if (shouldReplaceBestKosztorys(session.bestKosztorys, parsed.kosztorys, cand.filename, session.costDiscovery)) {
      session.bestKosztorys = parsed.kosztorys;
      session.sourceDocumentIndex = parsed.sourceDocumentIndex;
      session.zipInnerPath = parsed.zipInnerPath;
      session.sourceFilename = parsed.sourceFilename;
      session.winningCostSource = cand.filename;
    }
    if (parsed.estimatePln != null) {
      session.estimatePln = parsed.estimatePln;
      traceDossierPipeline("cost_estimate_extracted", cand.filename, { estimatePln: parsed.estimatePln });
    }
  }

  if (parsed.swzFromDoc) {
    const role = classifyDocumentRole(cand.filename);
    const valueConf = scoreEstimatedValueConfidence({
      valuePln: parsed.swzFromDoc.estimatedValuePln,
      valueRaw: parsed.swzFromDoc.estimatedValueRaw,
      sourceFilename: parsed.swzFromDoc.sourceFilename,
    });
    traceDossierPipeline("value_document_trace", cand.filename, {
      role,
      valueFound: parsed.swzFromDoc.estimatedValuePln != null,
      value: parsed.swzFromDoc.estimatedValuePln,
      confidence: valueConf,
    });
    if (parsed.swzFromDoc.estimatedValuePln != null) {
      traceDossierPipeline("value_extracted", cand.filename, {
        value: parsed.swzFromDoc.estimatedValuePln,
      });
    }
    if ((parsed.swzFromDoc.awardCriteria?.length ?? 0) > 0) {
      traceDossierPipeline("criteria_extracted", cand.filename, {
        count: parsed.swzFromDoc.awardCriteria?.length,
      });
    }
    session.swzMerged = mergeSwzAnalysis(session.swzMerged, parsed.swzFromDoc);
    if (parsed.swzFromDoc.estimatedValuePln != null && session.estimatePln == null) {
      session.estimatePln = parsed.swzFromDoc.estimatedValuePln;
    }
  }
}

async function parseCostCandidateForSession(
  session: TenderDossierParseSession,
  cand: TenderDocCandidate,
): Promise<{ value: TenderDocumentParseResult | null; error: string | null }> {
  traceDossierPipeline("document_downloaded", cand.filename, {
    documentIndex: cand.documentIndex,
    phase: "cost",
    downloadUrl: Boolean(cand.downloadUrl),
  });
  try {
    const parsed = await parseTenderDocumentCandidate(session.tenderId, cand, session.docs, {
      ourEstimatePln: session.estimatePln,
      mergeSwz: session.swzMerged,
    });
    return { value: parsed, error: null };
  } catch (e) {
    return {
      value: null,
      error: e instanceof Error ? e.message : "błąd kosztorysu",
    };
  }
}

async function parseMetadataCandidateForSession(
  session: TenderDossierParseSession,
  cand: TenderDocCandidate,
): Promise<{ value: TenderDocumentParseResult | null; error: string | null }> {
  traceDossierPipeline("document_downloaded", cand.filename, { documentIndex: cand.documentIndex });
  try {
    const parsed = await parseTenderDocumentCandidate(session.tenderId, cand, session.docs, {
      ourEstimatePln: session.estimatePln,
      mergeSwz: session.swzMerged,
    });
    return { value: parsed, error: null };
  } catch (e) {
    return {
      value: null,
      error: e instanceof Error ? e.message : "błąd parsowania",
    };
  }
}

async function runCostParseLoop(session: TenderDossierParseSession): Promise<void> {
  if (!isPipelineParseConcurrencyEnabled()) {
    for (const cand of session.costCandidates) {
      const outcome = await parseCostCandidateForSession(session, cand);
      applyCostCandidateParseToSession(session, cand, outcome.value, outcome.error);
    }
    return;
  }

  const outcomes = await runParseCandidatesWithConcurrency(
    session.costCandidates,
    DOSSIER_PARSE_COST_CONCURRENCY,
    (cand) => parseCostCandidateForSession(session, cand),
  );
  for (let i = 0; i < outcomes.length; i += 1) {
    const cand = session.costCandidates[i];
    const outcome = outcomes[i];
    applyCostCandidateParseToSession(session, cand, outcome.value, outcome.error);
  }
}

async function runMetadataParseLoop(session: TenderDossierParseSession): Promise<void> {
  const toParse: TenderDocCandidate[] = [];
  for (const cand of session.candidates) {
    const role = classifyDocumentRole(cand.filename);
    traceDossierPipeline("document_classified", cand.filename, { role, score: cand.score });
    if (shouldSkipMetadataCandidate(session, cand)) continue;
    toParse.push(cand);
  }

  if (!isPipelineParseConcurrencyEnabled()) {
    for (const cand of toParse) {
      const outcome = await parseMetadataCandidateForSession(session, cand);
      applyMetadataCandidateParseToSession(session, cand, outcome.value, outcome.error);
    }
    return;
  }

  const outcomes = await runParseCandidatesWithConcurrency(
    toParse,
    DOSSIER_PARSE_METADATA_CONCURRENCY,
    (cand) => parseMetadataCandidateForSession(session, cand),
  );
  for (let i = 0; i < outcomes.length; i += 1) {
    const cand = toParse[i];
    const outcome = outcomes[i];
    applyMetadataCandidateParseToSession(session, cand, outcome.value, outcome.error);
  }
}

/** NG11-A1 — faza kosztorysu (ATH/PDF inner ZIP). */
export async function executeTenderDossierCostPhase(session: TenderDossierParseSession): Promise<void> {
  if (session.costPhaseComplete) return;
  const timingItemId = session.opts.pipelineTimingItemId;
  if (timingItemId) {
    await withPipelineTimingStage(timingItemId, "heavy.parse_cost", () => runCostParseLoop(session));
  } else {
    await runCostParseLoop(session);
  }
  session.costPhaseComplete = true;
}

/** NG11-A1 — faza metadanych SWZ (tło po partial persist). */
export async function executeTenderDossierMetadataPhase(
  session: TenderDossierParseSession,
): Promise<TenderDossierParseResult> {
  if (session.metadataPhaseComplete) {
    return buildDossierParseResultFromSession(session);
  }

  const timingItemId = session.opts.pipelineTimingItemId;
  if (timingItemId) {
    await withPipelineTimingStage(timingItemId, "heavy.parse_metadata", () => runMetadataParseLoop(session));
  } else {
    await runMetadataParseLoop(session);
  }

  if (session.swzMerged) {
    session.swzMerged = applyMetadataConfidence(session.swzMerged);
  }

  if (session.bestKosztorys?.ok && session.winningCostSource) {
    const matchCand = session.allCandidates.find((c) => c.filename === session.winningCostSource);
    if (matchCand) {
      const { type, confidence } = classifyCostDocumentType(matchCand.filename);
      session.costDiscovery = {
        found: true,
        type,
        source: session.winningCostSource,
        confidence: Math.min(0.99, confidence + (matchCand.score ?? 0) / 100 * 0.05),
      };
    }
  }

  traceDossierPipeline("dossier_updated", session.sourceFilename ?? "dossier", {
    kosztorysOk: Boolean(session.bestKosztorys?.ok),
    estimatePln: session.estimatePln,
    valuePln: session.swzMerged?.estimatedValuePln ?? null,
    wadiumPercent: session.swzMerged?.wadiumPercent ?? null,
    wadiumPln: session.swzMerged?.wadiumPln ?? null,
    criteriaCount: session.swzMerged?.awardCriteria?.length ?? 0,
  });

  session.metadataPhaseComplete = true;
  return buildDossierParseResultFromSession(session);
}

/** Pełne parsowanie dossier — wiele dokumentów, merge SWZ + kosztorys (P2-E.0). */
export async function parseTenderDossierDocuments(
  tenderId: string,
  docs: TenderBzpDocument[],
  opts?: {
    ourEstimatePln?: number | null;
    existingSwz?: TenderSwzAnalysis | null;
    tenderTitle?: string;
    /** NG11-F0 — telemetry ring buffer key. */
    pipelineTimingItemId?: string;
  },
): Promise<TenderDossierParseResult> {
  const session = await prepareTenderDossierParseSession(tenderId, docs, opts);
  if (!session) {
    return emptyDossierParseResult(opts);
  }
  await executeTenderDossierCostPhase(session);
  return executeTenderDossierMetadataPhase(session);
}

export function mergeSwzAnalysis(
  primary: TenderSwzAnalysis | null | undefined,
  fromDoc: TenderSwzAnalysis | null | undefined,
): TenderSwzAnalysis | null {
  if (!primary && !fromDoc) return null;
  if (!primary) return fromDoc ?? null;
  if (!fromDoc) return primary;
  const wadiumPercent = primary.wadiumPercent ?? fromDoc.wadiumPercent;
  const wadiumPln = pickBetterWadiumPln(primary.wadiumPln, fromDoc.wadiumPln);
  const rawCandidate = isWeakWadiumRaw(primary.wadiumRaw)
    ? (fromDoc.wadiumRaw ?? primary.wadiumRaw)
    : (primary.wadiumRaw ?? fromDoc.wadiumRaw);
  const wadiumRaw = formatSwzWadiumDisplay({ wadiumPercent, wadiumPln, wadiumRaw: rawCandidate })
    ?? (isWeakWadiumRaw(rawCandidate) ? null : rawCandidate);
  const awardCriteria = mergeAwardCriteria(primary.awardCriteria, fromDoc.awardCriteria);
  return {
    ...primary,
    estimatedValuePln: primary.estimatedValuePln ?? fromDoc.estimatedValuePln,
    estimatedValueRaw: primary.estimatedValueRaw ?? fromDoc.estimatedValueRaw,
    wadiumPln,
    wadiumRaw,
    wadiumPercent,
    awardCriteria: awardCriteria.length > 0 ? awardCriteria : primary.awardCriteria ?? fromDoc.awardCriteria,
    referenceRequirement: primary.referenceRequirement ?? fromDoc.referenceRequirement,
    qualificationHints: [...new Set([...primary.qualificationHints, ...fromDoc.qualificationHints])].slice(0, 8),
    formalRequirements: mergeFormalRequirements(primary.formalRequirements, fromDoc.formalRequirements),
    participationRequirements: mergeParticipationRequirements(
      primary.participationRequirements,
      fromDoc.participationRequirements,
    ),
    experienceRequirements: mergeExperienceRequirements(
      primary.experienceRequirements,
      fromDoc.experienceRequirements,
    ),
    implementationDeadlineRaw: primary.implementationDeadlineRaw ?? fromDoc.implementationDeadlineRaw,
    implementationDays: primary.implementationDays ?? fromDoc.implementationDays,
    technicalRequirements: primary.technicalRequirements.length >= fromDoc.technicalRequirements.length
      ? primary.technicalRequirements
      : fromDoc.technicalRequirements,
    costLines: primary.costLines.length >= fromDoc.costLines.length ? primary.costLines : fromDoc.costLines,
    tableExtracts: [...new Set([...primary.tableExtracts, ...fromDoc.tableExtracts])].slice(0, 12),
    source: primary.source === "html" && fromDoc.source !== "html" ? fromDoc.source : primary.source,
    sourceFilename: fromDoc.sourceFilename ?? primary.sourceFilename,
    parsedAt: new Date().toISOString(),
    profitabilityHint: primary.profitabilityHint !== "unknown" ? primary.profitabilityHint : fromDoc.profitabilityHint,
    profitabilityNote: primary.profitabilityNote || fromDoc.profitabilityNote,
  };
}
