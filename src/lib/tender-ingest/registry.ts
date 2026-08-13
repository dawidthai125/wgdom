/**
 * INGEST-01 — document registry store (localStorage, no Cloud).
 */

import { TENDER_INGEST_LS_KEY, TENDER_INGEST_SCHEMA_VERSION } from "@/lib/tender-ingest/constants";
import { classifyDocumentHint, isCostParseEligible } from "@/lib/tender-ingest/classify";
import { expandZipArchive } from "@/lib/tender-ingest/archive";
import { newDocumentId, safeDisplayName, sha256Hex } from "@/lib/tender-ingest/hash";
import { refreshPhases } from "@/lib/tender-ingest/readiness";
import { assertSingleFileSize } from "@/lib/tender-ingest/security";
import type {
  TenderIngestDocument,
  TenderIngestMode,
  TenderIngestRetention,
  TenderIngestState,
  TenderIngestStore,
} from "@/lib/tender-ingest/types";

export function emptyIngestStore(): TenderIngestStore {
  return { version: TENDER_INGEST_SCHEMA_VERSION, byTenderId: {} };
}

export function emptyIngestState(
  tenderId: string,
  opts?: {
    ingestMode?: TenderIngestMode;
    retention?: TenderIngestRetention;
    ocdsId?: string;
    bzpNumber?: string;
    sourceUrls?: string[];
  },
): TenderIngestState {
  return {
    tenderId: String(tenderId ?? "").trim(),
    ingestMode: opts?.ingestMode ?? "owner_requested",
    retention: opts?.retention ?? "normal",
    ocdsId: opts?.ocdsId,
    bzpNumber: opts?.bzpNumber,
    sourceUrls: opts?.sourceUrls ?? [],
    documents: [],
    archives: [],
    artifacts: [],
    ingestPhase: "INGEST_PENDING",
    parsePhase: "PARSE_PENDING",
    skippedDocumentIds: [],
    expectedDocumentCount: null,
    warnings: [],
    updatedAt: new Date().toISOString(),
  };
}

export function setExpectedDocumentCount(
  tenderId: string,
  count: number | null,
): TenderIngestState {
  const prev = getIngestState(tenderId) ?? emptyIngestState(tenderId);
  const expected =
    count == null || !Number.isFinite(count) || count <= 0
      ? null
      : Math.floor(count);
  return upsertIngestState({ ...prev, expectedDocumentCount: expected });
}

function stripBytes(docs: TenderIngestDocument[]): TenderIngestDocument[] {
  return docs.map(({ bytes: _b, ...rest }) => rest);
}

function persistableState(state: TenderIngestState): TenderIngestState {
  return {
    ...state,
    documents: stripBytes(state.documents),
  };
}

export function loadIngestStore(): TenderIngestStore {
  if (typeof localStorage === "undefined") return emptyIngestStore();
  try {
    const raw = localStorage.getItem(TENDER_INGEST_LS_KEY);
    if (!raw) return emptyIngestStore();
    const parsed = JSON.parse(raw) as TenderIngestStore;
    if (!parsed || typeof parsed !== "object") return emptyIngestStore();
    return {
      version: TENDER_INGEST_SCHEMA_VERSION,
      byTenderId: parsed.byTenderId && typeof parsed.byTenderId === "object" ? parsed.byTenderId : {},
    };
  } catch {
    return emptyIngestStore();
  }
}

export function saveIngestStore(store: TenderIngestStore): void {
  if (typeof localStorage === "undefined") return;
  const out: TenderIngestStore = {
    version: TENDER_INGEST_SCHEMA_VERSION,
    byTenderId: {},
  };
  for (const [k, v] of Object.entries(store.byTenderId)) {
    out.byTenderId[k] = persistableState(v);
  }
  localStorage.setItem(TENDER_INGEST_LS_KEY, JSON.stringify(out));
}

export function clearIngestStore(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(TENDER_INGEST_LS_KEY);
}

export function getIngestState(tenderId: string): TenderIngestState | null {
  const id = String(tenderId ?? "").trim();
  if (!id) return null;
  return loadIngestStore().byTenderId[id] ?? null;
}

export function upsertIngestState(state: TenderIngestState): TenderIngestState {
  const next = refreshPhases(state);
  const store = loadIngestStore();
  store.byTenderId[next.tenderId] = next;
  saveIngestStore(store);
  return next;
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".zip")) return "application/zip";
  if (n.endsWith(".ath") || n.endsWith(".nor") || n.endsWith(".xml")) return "application/xml";
  return "application/octet-stream";
}

/**
 * Retain a single file. Same contentHash → reuse existing documentId (no duplicate artifact later).
 * Same filename + different bytes → new documentId.
 */
export async function retainOwnerFile(opts: {
  tenderId: string;
  originalFilename: string;
  bytes: Uint8Array;
  originReference?: string;
  publicUrl?: string;
}): Promise<{ state: TenderIngestState; documentIds: string[] }> {
  const tenderId = String(opts.tenderId ?? "").trim();
  let state = getIngestState(tenderId) ?? emptyIngestState(tenderId);
  const sizeErr = assertSingleFileSize(opts.bytes.byteLength);
  const displayName = safeDisplayName(opts.originalFilename);
  const isZip = /\.zip$/i.test(displayName);

  if (sizeErr) {
    const rejected: TenderIngestDocument = {
      documentId: newDocumentId(),
      tenderId,
      source: "owner_upload",
      originalFilename: opts.originalFilename,
      displayName,
      contentHash: "",
      mimeType: guessMime(displayName),
      size: opts.bytes.byteLength,
      originReference: opts.originReference,
      ingestStatus: "rejected_unsafe",
      classHint: classifyDocumentHint(displayName),
      parseStatus: "skipped",
      warnings: [sizeErr],
    };
    state = upsertIngestState({
      ...state,
      documents: [...state.documents, rejected],
      warnings: [...state.warnings, sizeErr],
    });
    return { state, documentIds: [] };
  }

  if (isZip) {
    const expanded = await expandZipArchive({
      tenderId,
      originalFilename: opts.originalFilename,
      bytes: opts.bytes,
      originReference: opts.originReference,
    });
    if (!expanded.ok) {
      state = upsertIngestState({
        ...state,
        archives: [...state.archives, expanded.archive],
        warnings: [...state.warnings, ...expanded.archive.warnings],
      });
      return { state, documentIds: [] };
    }
    const mergedDocs: TenderIngestDocument[] = [...state.documents];
    const ids: string[] = [];
    for (const child of expanded.documents) {
      const existing = mergedDocs.find(
        (d) => d.ingestStatus === "retained" && d.contentHash === child.contentHash,
      );
      if (existing) {
        ids.push(existing.documentId);
        continue;
      }
      mergedDocs.push(child);
      ids.push(child.documentId);
    }
    state = upsertIngestState({
      ...state,
      archives: [...state.archives, expanded.archive],
      documents: mergedDocs,
    });
    return { state, documentIds: ids };
  }

  const contentHash = await sha256Hex(opts.bytes);
  const existing = state.documents.find(
    (d) => d.ingestStatus === "retained" && d.contentHash === contentHash,
  );
  if (existing) {
    return { state, documentIds: [existing.documentId] };
  }

  const classHint = classifyDocumentHint(displayName);
  const doc: TenderIngestDocument = {
    documentId: newDocumentId(),
    tenderId,
    source: "owner_upload",
    originalFilename: opts.originalFilename,
    displayName,
    contentHash,
    mimeType: guessMime(displayName),
    size: opts.bytes.byteLength,
    originReference: opts.originReference,
    ingestStatus: "retained",
    classHint,
    parseStatus: isCostParseEligible(displayName, classHint) ? "queued" : "skipped",
    bytes: opts.bytes,
    publicUrl: opts.publicUrl,
    warnings: [],
  };
  state = upsertIngestState({
    ...state,
    documents: [...state.documents, doc],
  });
  return { state, documentIds: [doc.documentId] };
}

export function ensureIngestStateForPin(
  tenderId: string,
  meta: {
    ingestMode: TenderIngestMode;
    retention: TenderIngestRetention;
    ocdsId?: string;
    bzpNumber?: string;
    sourceUrls?: string[];
  },
): TenderIngestState {
  const prev = getIngestState(tenderId);
  const base = prev ?? emptyIngestState(tenderId, meta);
  return upsertIngestState({
    ...base,
    ingestMode: meta.ingestMode,
    retention: meta.retention,
    ocdsId: meta.ocdsId ?? base.ocdsId,
    bzpNumber: meta.bzpNumber ?? base.bzpNumber,
    sourceUrls: meta.sourceUrls?.length ? meta.sourceUrls : base.sourceUrls,
  });
}
