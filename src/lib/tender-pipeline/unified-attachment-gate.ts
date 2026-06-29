/**
 * NG-02.1A — SSOT bramki załączników → start Heavy Parse (runtime-only adapter).
 */

import type { TenderBzpDocument, TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderExternalFetchedFile } from "@/lib/tender-external-docs";
import { isKosztorysPreviewExt } from "@/lib/ath-parser";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";

/** Pochodzenie załącznika — jedyny enum (bez rozproszonych stringów). */
export enum AttachmentOrigin {
  Bzp = "Bzp",
  External = "External",
  Upload = "Upload",
}

export enum UnifiedGateStatus {
  Closed = "Closed",
  Open = "Open",
}

export enum UnifiedGateReason {
  NoTenderId = "NoTenderId",
  HeavyDone = "HeavyDone",
  NoAttachments = "NoAttachments",
  OpenBzp = "OpenBzp",
  OpenExternal = "OpenExternal",
  OpenMixed = "OpenMixed",
  OpenUploadOnly = "OpenUploadOnly",
}

export interface UnifiedAttachmentRef {
  origin: AttachmentOrigin;
  id: string;
  filename: string;
  asBzpDocument: TenderBzpDocument;
}

export interface UnifiedAttachmentGate {
  canStartHeavyParse: boolean;
  heavyEligibleCount: number;
  totalAttachmentCount: number;
  heavyParseDocuments: TenderBzpDocument[];
  refs: UnifiedAttachmentRef[];
  gateStatus: UnifiedGateStatus;
  gateReason: UnifiedGateReason;
  sources: {
    bzp: number;
    external: number;
    hasUpload: boolean;
  };
  /** Stabilny fingerprint do deps hooków. */
  fingerprint: string;
}

const EXTERNAL_DOC_INDEX_BASE = 10_000;
const EXTERNAL_DOC_PARSE_MAX = 6;

export function attachmentOriginPlatform(origin: AttachmentOrigin): string {
  return origin;
}

function countTotalAttachments(item: TenderPipelineItem): number {
  return (item.bzpDocuments?.length ?? 0)
    + (item.uploadedFile ? 1 : 0)
    + (item.externalDocDiscovery?.files?.length ?? 0);
}

function uploadHeavyEligible(item: TenderPipelineItem): boolean {
  const uploaded = item.uploadedFile;
  if (!uploaded?.filename) return false;
  if (!isKosztorysPreviewExt(uploaded.filename)) return false;
  if (item.tenderDossier?.kosztorys?.ok) return false;
  return true;
}

function mapBzpRef(doc: TenderBzpDocument): UnifiedAttachmentRef {
  return {
    origin: AttachmentOrigin.Bzp,
    id: doc.documentId || `bzp-${doc.index}`,
    filename: doc.filename,
    asBzpDocument: doc,
  };
}

function mapExternalRef(file: TenderExternalFetchedFile, index: number): UnifiedAttachmentRef {
  const doc: TenderBzpDocument = {
    index: EXTERNAL_DOC_INDEX_BASE + index,
    documentId: `ext-${file.id}`,
    filename: file.filename,
    contentType: file.contentType,
    downloadUrl: file.publicUrl,
    isSwzHint: file.isSwzHint,
    platform: attachmentOriginPlatform(AttachmentOrigin.External),
    sourcePageUrl: file.sourcePageUrl,
  };
  return {
    origin: AttachmentOrigin.External,
    id: file.id,
    filename: file.filename,
    asBzpDocument: doc,
  };
}

/**
 * Zestaw dokumentów dla buildTenderDossierHeavy (BZP + external, dedup URL).
 */
export function buildHeavyParseDocumentSet(item: TenderPipelineItem): TenderBzpDocument[] {
  const refs = buildHeavyParseAttachmentRefs(item);
  return refs.map((r) => r.asBzpDocument);
}

function buildHeavyParseAttachmentRefs(item: TenderPipelineItem): UnifiedAttachmentRef[] {
  const seenUrls = new Set<string>();
  const refs: UnifiedAttachmentRef[] = [];

  for (const doc of item.bzpDocuments ?? []) {
    const url = doc.downloadUrl?.trim();
    if (url && seenUrls.has(url)) continue;
    if (url) seenUrls.add(url);
    refs.push(mapBzpRef(doc));
  }

  const externalFiles = [...(item.externalDocDiscovery?.files ?? [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, EXTERNAL_DOC_PARSE_MAX);

  externalFiles.forEach((file, i) => {
    const url = file.publicUrl?.trim();
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    refs.push(mapExternalRef(file, i));
  });

  return refs;
}

export function buildHeavyParseDocumentFingerprint(item: TenderPipelineItem): string {
  const refs = buildHeavyParseAttachmentRefs(item);
  const parts = refs.map((r) => `${r.origin}:${r.id}:${r.filename}`);
  const upload = item.uploadedFile
    ? `${AttachmentOrigin.Upload}:${item.uploadedFile.id}:${item.uploadedFile.filename}`
    : "";
  return [parts.join("|"), upload, item.tenderId ?? "", String(item.tenderDossier?.parserVersion ?? "")].join(";");
}

/** Jedyny SSOT — czy Heavy Parse może wystartować. */
export function deriveUnifiedAttachmentGate(item: TenderPipelineItem): UnifiedAttachmentGate {
  const refs = buildHeavyParseAttachmentRefs(item);
  const heavyParseDocuments = refs.map((r) => r.asBzpDocument);
  const heavyEligibleCount = heavyParseDocuments.length;
  const totalAttachmentCount = countTotalAttachments(item);
  const sources = {
    bzp: item.bzpDocuments?.length ?? 0,
    external: item.externalDocDiscovery?.files?.length ?? 0,
    hasUpload: Boolean(item.uploadedFile),
  };

  const bzpOrigin = refs.some((r) => r.origin === AttachmentOrigin.Bzp);
  const extOrigin = refs.some((r) => r.origin === AttachmentOrigin.External);
  const uploadOnly = uploadHeavyEligible(item) && heavyEligibleCount === 0;

  let gateStatus = UnifiedGateStatus.Closed;
  let gateReason = UnifiedGateReason.NoAttachments;
  let canStartHeavyParse = false;

  if (!item.tenderId?.trim()) {
    gateReason = UnifiedGateReason.NoTenderId;
  } else if (tenderDossierHeavyParseDone(item.tenderDossier)) {
    gateReason = UnifiedGateReason.HeavyDone;
  } else if (heavyEligibleCount > 0) {
    canStartHeavyParse = true;
    gateStatus = UnifiedGateStatus.Open;
    if (bzpOrigin && extOrigin) gateReason = UnifiedGateReason.OpenMixed;
    else if (extOrigin) gateReason = UnifiedGateReason.OpenExternal;
    else gateReason = UnifiedGateReason.OpenBzp;
  } else if (uploadOnly) {
    canStartHeavyParse = true;
    gateStatus = UnifiedGateStatus.Open;
    gateReason = UnifiedGateReason.OpenUploadOnly;
  } else if (totalAttachmentCount === 0) {
    gateReason = UnifiedGateReason.NoAttachments;
  } else {
    gateReason = UnifiedGateReason.NoAttachments;
  }

  return {
    canStartHeavyParse,
    heavyEligibleCount,
    totalAttachmentCount,
    heavyParseDocuments,
    refs,
    gateStatus,
    gateReason,
    sources,
    fingerprint: buildHeavyParseDocumentFingerprint(item),
  };
}

/** Skrót — jedyny publiczny warunek startu heavy (deleguje do gate). */
export function canStartHeavyParse(item: TenderPipelineItem): boolean {
  return deriveUnifiedAttachmentGate(item).canStartHeavyParse;
}
