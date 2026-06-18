/**
 * P2-F.4 — szybki dostęp do przedmiaru ATH w karcie ofertowej (reuse JobFilePreviewModal + downloadKosztorysPdf).
 */

import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  loadTenderBzpDocumentBytes,
  loadTenderBzpDocumentBytesResolved,
  resolveTenderDocumentDownload,
} from "@/lib/tenders-bzp";
import {
  fetchAndParseKosztorys,
  isKosztorysPreviewExt,
  kosztorysResultForDisplay,
  parseKosztorysBytes,
  type AthPreviewResult,
} from "@/lib/ath-parser";
import { is7zFilename, isZipFilename } from "@/lib/tenders-bzp-filename";
import { downloadKosztorysPdf } from "@/lib/ath-kosztorys-pdf";
import { buildPreviewContextFromPipelineItem } from "@/lib/tender-pdf-preview-ux";
import {
  classifyCostDocument,
  resolvedCostStatus,
  type CostDocumentUiType,
  type ResolvedCostStatus,
} from "@/lib/tender-data-ssot";

export interface AthQuickAccessContext {
  enabled: boolean;
  source: "ATH";
  rowCount: number;
  costStatus: ResolvedCostStatus;
  previewItem: InspectorFileItem | null;
  filename: string | null;
}

export function traceAthQuickAccess(detail: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[ATH QUICK ACCESS TRACE]", detail);
  }
}

function resolveAthDownloadMeta(
  item: TenderPipelineItem,
  documentIndex: number,
): { downloadUrl?: string; platform?: string } {
  return resolveTenderDocumentDownload(item.bzpDocuments, documentIndex) ?? {};
}

async function loadTenderBzpBytesForAth(
  tenderId: string,
  documentIndex: number,
  downloadUrl: string | undefined,
  bzpDocuments: TenderBzpDocument[] | undefined,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  if (bzpDocuments?.length) {
    return loadTenderBzpDocumentBytesResolved(tenderId, documentIndex, bzpDocuments);
  }
  return loadTenderBzpDocumentBytes(tenderId, documentIndex, downloadUrl);
}

function isQuickAccessPreviewDocType(docType: CostDocumentUiType): boolean {
  return docType === "ATH" || docType === "PDF";
}

function resolveOuterArchiveFilename(
  bzpDocuments: TenderBzpDocument[] | undefined,
  documentIndex: number,
): string | undefined {
  return bzpDocuments?.find((d) => d.index === documentIndex)?.filename;
}

/** Zbuduj kontekst ATH quick access — kosztorys/przedmiar z podglądem (ATH, NOR, PDF). */
export function buildAthQuickAccessContext(item: TenderPipelineItem): AthQuickAccessContext {
  const costStatus = resolvedCostStatus(item);
  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const k = item.tenderDossier?.kosztorys;

  const previewItem = costStatus !== "NOT_FOUND" && isQuickAccessPreviewDocType(docType)
    ? resolveAthPreviewItem(item)
    : null;
  const enabled = previewItem != null;
  const filename = previewItem
    ? (previewItem.kind === "tenderBzp" || previewItem.kind === "tenderUpload" ? previewItem.filename : null)
    : k?.sourceFilename ?? null;

  if (enabled) {
    const dl = k?.sourceDocumentIndex != null
      ? resolveAthDownloadMeta(item, k.sourceDocumentIndex)
      : {};
    traceAthQuickAccess({
      source: "ATH",
      rows: rowCount,
      costStatus,
      docType,
      previewReady: previewItem != null,
      platform: dl.platform ?? null,
      downloadUrlResolved: Boolean(
        previewItem?.kind === "tenderBzp" && previewItem.downloadUrl,
      ),
      zipInnerPath: k?.zipInnerPath ?? null,
      outerArchiveFilename: previewItem?.kind === "tenderBzp"
        ? previewItem.outerArchiveFilename ?? null
        : null,
    });
  }

  return {
    enabled,
    source: "ATH",
    rowCount,
    costStatus,
    previewItem,
    filename,
  };
}

/** SSOT — InspectorFileItem do JobFilePreviewModal. */
export function resolveAthPreviewItem(item: TenderPipelineItem): InspectorFileItem | null {
  const k = item.tenderDossier?.kosztorys;
  if (k?.ok && k.sourceDocumentIndex != null && item.tenderId) {
    const dl = resolveAthDownloadMeta(item, k.sourceDocumentIndex);
    const outerArchiveFilename = k.zipInnerPath
      ? resolveOuterArchiveFilename(item.bzpDocuments, k.sourceDocumentIndex)
      : undefined;
    return {
      kind: "tenderBzp",
      tenderId: item.tenderId,
      documentIndex: k.sourceDocumentIndex,
      filename: k.sourceFilename,
      outerArchiveFilename,
      zipInnerPath: k.zipInnerPath,
      downloadUrl: dl.downloadUrl,
      sourcePageUrl: resolveTenderDocumentDownload(item.bzpDocuments, k.sourceDocumentIndex)?.sourcePageUrl,
      previewContext: buildPreviewContextFromPipelineItem(item),
    };
  }
  if (item.uploadedFile && isKosztorysPreviewExt(item.uploadedFile.filename)) {
    return {
      kind: "tenderUpload",
      filename: item.uploadedFile.filename,
      publicUrl: item.uploadedFile.publicUrl,
      path: item.uploadedFile.path,
    };
  }
  return null;
}

async function parseTenderBzpPreviewItem(
  previewItem: Extract<InspectorFileItem, { kind: "tenderBzp" }>,
  athPreviewEnabled: boolean,
  bzpDocuments?: TenderBzpDocument[],
): Promise<AthPreviewResult> {
  if (!athPreviewEnabled) {
    return { ok: false, format: "unknown", rows: [], warnings: ["Podgląd ATH wyłączony w ustawieniach."] };
  }
  const {
    list7zFiles,
    listZipFiles,
    parseDocumentToKosztorys,
    read7zEntry,
    readZipEntry,
    resolveDocumentBytes,
  } = await import("@/lib/tenders-bzp-doc-parse");

  const downloadUrl = previewItem.downloadUrl
    ?? resolveTenderDocumentDownload(bzpDocuments, previewItem.documentIndex)?.downloadUrl;

  const { bytes: outerBytes, filename: serverName } = await loadTenderBzpBytesForAth(
    previewItem.tenderId,
    previewItem.documentIndex,
    downloadUrl,
    bzpDocuments,
  );
  const innerFilename = previewItem.filename || serverName;
  const outerArchiveFilename = previewItem.outerArchiveFilename ?? serverName;
  const zipInner = previewItem.zipInnerPath;

  const loadBytes = async (idx: number) => {
    if (idx === previewItem.documentIndex) return outerBytes;
    const r = await loadTenderBzpBytesForAth(
      previewItem.tenderId,
      idx,
      downloadUrl,
      bzpDocuments,
    );
    return r.bytes;
  };

  let bytes = await resolveDocumentBytes(
    loadBytes,
    previewItem.documentIndex,
    innerFilename,
    zipInner,
    zipInner ? outerArchiveFilename : undefined,
  );
  let name = zipInner ? innerFilename : innerFilename;

  if (isZipFilename(outerArchiveFilename) && !zipInner) {
    const entries = await listZipFiles(outerBytes);
    if (entries.length > 0) {
      const inner = await readZipEntry(outerBytes, entries[0].path);
      if (inner) {
        bytes = inner;
        name = entries[0].filename;
      }
    }
  } else if (is7zFilename(outerArchiveFilename) && !zipInner) {
    const entries = await list7zFiles(outerBytes);
    if (entries.length > 0) {
      const inner = await read7zEntry(outerBytes, entries[0].path);
      if (inner) {
        bytes = inner;
        name = entries[0].filename;
      }
    }
  }

  if (isKosztorysPreviewExt(name)) {
    return kosztorysResultForDisplay(parseKosztorysBytes(bytes, name));
  }
  const parsed = await parseDocumentToKosztorys(bytes, name);
  if (parsed) return kosztorysResultForDisplay(parsed);
  return { ok: false, format: "unknown", rows: [], warnings: ["Nie rozpoznano formatu kosztorysu."] };
}

/** Parsuj ATH do PDF — reuse ścieżek JobFilePreviewModal. */
export async function loadAthPreviewResult(
  previewItem: InspectorFileItem,
  athPreviewEnabled: boolean,
  bzpDocuments?: TenderBzpDocument[],
): Promise<AthPreviewResult> {
  if (previewItem.kind === "tenderUpload") {
    return fetchAndParseKosztorys(
      previewItem.publicUrl,
      previewItem.filename,
      previewItem.path,
    );
  }
  if (previewItem.kind === "tenderBzp") {
    return parseTenderBzpPreviewItem(previewItem, athPreviewEnabled, bzpDocuments);
  }
  return { ok: false, format: "unknown", rows: [], warnings: ["Brak podglądu dla tego typu pliku."] };
}

export async function downloadAthKosztorysPdf(
  item: TenderPipelineItem,
  athPreviewEnabled: boolean,
): Promise<void> {
  const ctx = buildAthQuickAccessContext(item);
  if (!ctx.previewItem || !ctx.filename) {
    throw new Error("Brak pliku ATH do pobrania");
  }
  const parseResult = await loadAthPreviewResult(ctx.previewItem, athPreviewEnabled, item.bzpDocuments);
  if (!parseResult.ok || parseResult.rows.length === 0) {
    throw new Error(parseResult.warnings?.[0] ?? "Nie udało się sparsować ATH");
  }
  await downloadKosztorysPdf(parseResult, ctx.filename);
  traceAthQuickAccess({
    source: "ATH",
    rows: parseResult.rows.length,
    viewerOpened: false,
    pdfDownloaded: true,
    downloadUrlResolved: ctx.previewItem.kind === "tenderBzp" && Boolean(ctx.previewItem.downloadUrl),
    zipInnerPath: ctx.previewItem.kind === "tenderBzp" ? ctx.previewItem.zipInnerPath ?? null : null,
  });
}

/** Pobierz oryginalny plik ATH/NOR/XML (bez PDF, bez zmian parsera). */
export async function downloadAthSourceFile(
  item: TenderPipelineItem,
  athPreviewEnabled: boolean,
): Promise<void> {
  const previewItem = resolveAthPreviewItem(item);
  if (!previewItem) throw new Error("Brak pliku ATH do pobrania");
  if (!athPreviewEnabled) throw new Error("Podgląd ATH wyłączony w ustawieniach");

  const { saveAs } = await import("file-saver");
  let bytes: Uint8Array;
  let filename: string;

  if (previewItem.kind === "tenderUpload") {
    const res = await fetch(previewItem.publicUrl);
    if (!res.ok) throw new Error(`Nie udało się pobrać pliku (${res.status})`);
    bytes = new Uint8Array(await res.arrayBuffer());
    filename = previewItem.filename;
  } else {
    const {
      resolveDocumentBytes,
    } = await import("@/lib/tenders-bzp-doc-parse");
    const downloadUrl = previewItem.downloadUrl
      ?? resolveTenderDocumentDownload(item.bzpDocuments, previewItem.documentIndex)?.downloadUrl;
    const { bytes: outerBytes, filename: serverName } = await loadTenderBzpBytesForAth(
      previewItem.tenderId,
      previewItem.documentIndex,
      downloadUrl,
      item.bzpDocuments,
    );
    const innerFilename = previewItem.filename || serverName;
    const outerArchiveFilename = previewItem.outerArchiveFilename ?? serverName;
    const loadBytes = async (idx: number) => {
      if (idx === previewItem.documentIndex) return outerBytes;
      const r = await loadTenderBzpBytesForAth(
        previewItem.tenderId,
        idx,
        downloadUrl,
        item.bzpDocuments,
      );
      return r.bytes;
    };
    bytes = await resolveDocumentBytes(
      loadBytes,
      previewItem.documentIndex,
      innerFilename,
      previewItem.zipInnerPath,
      previewItem.zipInnerPath ? outerArchiveFilename : undefined,
    );
    filename = previewItem.zipInnerPath
      ? innerFilename.split(/[/\\]/).pop() ?? innerFilename
      : innerFilename;
  }

  const blob = new Blob([bytes], { type: "application/octet-stream" });
  saveAs(blob, filename);
  traceAthQuickAccess({
    source: "ATH",
    viewerOpened: false,
    pdfDownloaded: false,
    athSourceDownloaded: true,
    filename,
  });
}
