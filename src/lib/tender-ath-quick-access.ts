/**
 * P2-F.4 — szybki dostęp do przedmiaru ATH w karcie ofertowej (reuse JobFilePreviewModal + downloadKosztorysPdf).
 */

import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { loadTenderBzpDocumentBytes } from "@/lib/tenders-bzp";
import {
  fetchAndParseKosztorys,
  isKosztorysPreviewExt,
  kosztorysResultForDisplay,
  parseKosztorysBytes,
  type AthPreviewResult,
} from "@/lib/ath-parser";
import { downloadKosztorysPdf } from "@/lib/ath-kosztorys-pdf";
import {
  classifyCostDocument,
  resolvedCostStatus,
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

/** Zbuduj kontekst ATH quick access — tylko ATH + FOUND_WITH_VALUE / FOUND_NO_VALUE. */
export function buildAthQuickAccessContext(item: TenderPipelineItem): AthQuickAccessContext {
  const costStatus = resolvedCostStatus(item);
  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;
  const k = item.tenderDossier?.kosztorys;

  const enabled = costStatus !== "NOT_FOUND" && docType === "ATH";
  const previewItem = enabled ? resolveAthPreviewItem(item) : null;
  const filename = previewItem
    ? (previewItem.kind === "tenderBzp" || previewItem.kind === "tenderUpload" ? previewItem.filename : null)
    : k?.sourceFilename ?? null;

  if (enabled) {
    traceAthQuickAccess({
      source: "ATH",
      rows: rowCount,
      costStatus,
      previewReady: previewItem != null,
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
    return {
      kind: "tenderBzp",
      tenderId: item.tenderId,
      documentIndex: k.sourceDocumentIndex,
      filename: k.sourceFilename,
      zipInnerPath: k.zipInnerPath,
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
): Promise<AthPreviewResult> {
  if (!athPreviewEnabled) {
    return { ok: false, format: "unknown", rows: [], warnings: ["Podgląd ATH wyłączony w ustawieniach."] };
  }
  const {
    listZipFiles,
    parseDocumentToKosztorys,
    readZipEntry,
    resolveDocumentBytes,
  } = await import("@/lib/tenders-bzp-doc-parse");

  const { bytes: outerBytes, filename: serverName } = await loadTenderBzpDocumentBytes(
    previewItem.tenderId,
    previewItem.documentIndex,
    previewItem.downloadUrl,
  );
  const outerName = previewItem.filename || serverName;
  const zipInner = previewItem.zipInnerPath;

  const loadBytes = async (idx: number) => {
    if (idx === previewItem.documentIndex) return outerBytes;
    const r = await loadTenderBzpDocumentBytes(previewItem.tenderId, idx, previewItem.downloadUrl);
    return r.bytes;
  };

  let bytes = await resolveDocumentBytes(loadBytes, previewItem.documentIndex, outerName, zipInner);
  let name = zipInner
    ? (outerName.includes(" → ") ? outerName.split(" → ").pop()! : outerName)
    : outerName;

  if (/\.zip$/i.test(outerName) && !zipInner) {
    const entries = await listZipFiles(outerBytes);
    if (entries.length > 0) {
      const inner = await readZipEntry(outerBytes, entries[0].path);
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
): Promise<AthPreviewResult> {
  if (previewItem.kind === "tenderUpload") {
    return fetchAndParseKosztorys(
      previewItem.publicUrl,
      previewItem.filename,
      previewItem.path,
    );
  }
  if (previewItem.kind === "tenderBzp") {
    return parseTenderBzpPreviewItem(previewItem, athPreviewEnabled);
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
  const parseResult = await loadAthPreviewResult(ctx.previewItem, athPreviewEnabled);
  if (!parseResult.ok || parseResult.rows.length === 0) {
    throw new Error(parseResult.warnings?.[0] ?? "Nie udało się sparsować ATH");
  }
  await downloadKosztorysPdf(parseResult, ctx.filename);
  traceAthQuickAccess({
    source: "ATH",
    rows: parseResult.rows.length,
    viewerOpened: false,
    pdfDownloaded: true,
  });
}
