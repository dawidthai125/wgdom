/**
 * IK-KNR KL-5 — Raw evidence store (local-only · kw-knr-evidence).
 * ADAPT: labor-source-evidence CAS pattern · separate from kw-knr-catalog.
 */

import { fnv1aHex } from "@/lib/global-knowledge/canonical-id";
import { sha256Hex } from "@/lib/tender-ingest/hash";
import type { KnrRawEvidenceRef } from "./knr-provenance-types";

export const KNR_EVIDENCE_STORAGE_KEY = "kw-knr-evidence";

export const KNR_EVIDENCE_STORE_SCHEMA_VERSION = 1 as const;

export type KnrEvidenceBlobRecord = {
  refId: string;
  sourceFilename: string;
  format: "ATH" | "UNKNOWN";
  contentHash: string;
  /** Base64 payload — local-only retention. */
  bytesBase64: string;
  byteLength: number;
  capturedAt: string;
  originId: string;
  licenceId: string;
  parserVersion: string;
  importedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type KnrRawEvidenceStore = {
  schemaVersion: typeof KNR_EVIDENCE_STORE_SCHEMA_VERSION;
  updatedAt: string;
  etag: string;
  blobs: Record<string, KnrEvidenceBlobRecord>;
};

export type KnrEvidenceCasResult =
  | { ok: true; store: KnrRawEvidenceStore }
  | {
      ok: false;
      reason: "etag_mismatch" | "empty_destructive";
      store: KnrRawEvidenceStore;
      messagePl: string;
    };

function buildEvidenceStoreEtag(store: Pick<KnrRawEvidenceStore, "blobs">): string {
  const keys = Object.keys(store.blobs).sort();
  return fnv1aHex(keys.join(","));
}

export function emptyKnrRawEvidenceStore(nowIso = "2026-08-19T12:00:00.000Z"): KnrRawEvidenceStore {
  const blobs: Record<string, KnrEvidenceBlobRecord> = {};
  return {
    schemaVersion: KNR_EVIDENCE_STORE_SCHEMA_VERSION,
    updatedAt: nowIso,
    etag: buildEvidenceStoreEtag({ blobs }),
    blobs,
  };
}

export function normalizeKnrRawEvidenceStore(raw: unknown, nowIso?: string): KnrRawEvidenceStore {
  const stamp = nowIso ?? "2026-08-19T12:00:00.000Z";
  if (!raw || typeof raw !== "object") return emptyKnrRawEvidenceStore(stamp);
  const obj = raw as Record<string, unknown>;
  const blobs: Record<string, KnrEvidenceBlobRecord> = {};
  if (obj.blobs && typeof obj.blobs === "object") {
    for (const [refId, value] of Object.entries(obj.blobs as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const b = value as Record<string, unknown>;
      if (typeof b.bytesBase64 !== "string" || typeof b.contentHash !== "string") continue;
      blobs[refId] = {
        refId,
        sourceFilename: String(b.sourceFilename ?? ""),
        format: b.format === "ATH" ? "ATH" : "UNKNOWN",
        contentHash: String(b.contentHash),
        bytesBase64: String(b.bytesBase64),
        byteLength: Number(b.byteLength) || 0,
        capturedAt: String(b.capturedAt ?? stamp),
        originId: String(b.originId ?? ""),
        licenceId: String(b.licenceId ?? ""),
        parserVersion: String(b.parserVersion ?? ""),
        importedAt: String(b.importedAt ?? stamp),
        metadata:
          b.metadata && typeof b.metadata === "object"
            ? (b.metadata as Record<string, string | number | boolean | null>)
            : undefined,
      };
    }
  }
  return {
    schemaVersion: KNR_EVIDENCE_STORE_SCHEMA_VERSION,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : stamp,
    etag: buildEvidenceStoreEtag({ blobs }),
    blobs,
  };
}

export function loadKnrRawEvidenceStoreLocal(): KnrRawEvidenceStore {
  try {
    if (typeof localStorage === "undefined") return emptyKnrRawEvidenceStore();
    const raw = localStorage.getItem(KNR_EVIDENCE_STORAGE_KEY);
    if (!raw) return emptyKnrRawEvidenceStore();
    return normalizeKnrRawEvidenceStore(JSON.parse(raw));
  } catch {
    return emptyKnrRawEvidenceStore();
  }
}

export function saveKnrRawEvidenceStoreLocal(store: KnrRawEvidenceStore): void {
  if (typeof localStorage === "undefined") return;
  const next = normalizeKnrRawEvidenceStore(store);
  localStorage.setItem(KNR_EVIDENCE_STORAGE_KEY, JSON.stringify(next));
}

export function clearKnrRawEvidenceStoreLocalForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KNR_EVIDENCE_STORAGE_KEY);
}

export function casWriteKnrRawEvidenceStore(input: {
  expectedEtag: string;
  next: KnrRawEvidenceStore;
}): KnrEvidenceCasResult {
  const current = loadKnrRawEvidenceStoreLocal();
  if (current.etag !== input.expectedEtag) {
    return {
      ok: false,
      reason: "etag_mismatch",
      store: current,
      messagePl: "Evidence CAS conflict — reload and retry.",
    };
  }
  const normalized = normalizeKnrRawEvidenceStore(input.next);
  if (Object.keys(normalized.blobs).length === 0 && Object.keys(current.blobs).length > 0) {
    return {
      ok: false,
      reason: "empty_destructive",
      store: current,
      messagePl: "Refusing empty evidence wipe.",
    };
  }
  saveKnrRawEvidenceStoreLocal(normalized);
  return { ok: true, store: loadKnrRawEvidenceStoreLocal() };
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function bytesFromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export async function buildKnrEvidenceBlobHash(bytes: Uint8Array): Promise<string> {
  return sha256Hex(bytes);
}

export async function storeKnrEvidenceBlob(input: {
  bytes: Uint8Array;
  sourceFilename: string;
  format: "ATH";
  capturedAt: string;
  originId: string;
  licenceId: string;
  parserVersion: string;
  nowIso: string;
  storeOverride?: KnrRawEvidenceStore;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<{ store: KnrRawEvidenceStore; ref: KnrRawEvidenceRef; contentHash: string }> {
  const contentHash = await buildKnrEvidenceBlobHash(input.bytes);
  const existingStore = input.storeOverride ?? loadKnrRawEvidenceStoreLocal();
  const duplicate = Object.values(existingStore.blobs).find((b) => b.contentHash === contentHash);
  if (duplicate) {
    return {
      store: existingStore,
      ref: {
        refId: duplicate.refId,
        kind: "export_file",
        sourceFilename: duplicate.sourceFilename,
      },
      contentHash,
    };
  }

  const refId = `ev-${contentHash.slice(0, 16)}`;
  const record: KnrEvidenceBlobRecord = {
    refId,
    sourceFilename: input.sourceFilename,
    format: input.format,
    contentHash,
    bytesBase64: bytesToBase64(input.bytes),
    byteLength: input.bytes.length,
    capturedAt: input.capturedAt,
    originId: input.originId,
    licenceId: input.licenceId,
    parserVersion: input.parserVersion,
    importedAt: input.nowIso,
    metadata: input.metadata,
  };

  const nextStore = normalizeKnrRawEvidenceStore(
    {
      ...existingStore,
      updatedAt: input.nowIso,
      blobs: { ...existingStore.blobs, [refId]: record },
    },
    input.nowIso,
  );

  if (input.storeOverride) {
    return {
      store: nextStore,
      ref: { refId, kind: "export_file", sourceFilename: input.sourceFilename },
      contentHash,
    };
  }

  const cas = casWriteKnrRawEvidenceStore({ expectedEtag: existingStore.etag, next: nextStore });
  return {
    store: cas.ok ? cas.store : existingStore,
    ref: { refId, kind: "export_file", sourceFilename: input.sourceFilename },
    contentHash,
  };
}

export function loadKnrEvidenceBytes(
  ref: KnrRawEvidenceRef,
  store?: KnrRawEvidenceStore,
): Uint8Array | null {
  const evidenceStore = store ?? loadKnrRawEvidenceStoreLocal();
  const blob = evidenceStore.blobs[ref.refId];
  if (!blob?.bytesBase64) return null;
  return bytesFromBase64(blob.bytesBase64);
}

/**
 * Tamper detection — recompute SHA-256 and compare to stored contentHash.
 * Evidence integrity ≠ catalog VERIFIED authority.
 */
export async function verifyKnrEvidenceBlobIntegrity(input: {
  blob: KnrEvidenceBlobRecord;
  bytes?: Uint8Array | null;
}): Promise<{ ok: true } | { ok: false; reason: "HASH_MISMATCH" | "MISSING_BYTES" }> {
  const bytes = input.bytes ?? bytesFromBase64(input.blob.bytesBase64);
  if (!bytes?.length) return { ok: false, reason: "MISSING_BYTES" };
  const hash = await buildKnrEvidenceBlobHash(bytes);
  if (hash !== input.blob.contentHash) {
    return { ok: false, reason: "HASH_MISMATCH" };
  }
  return { ok: true };
}

export const KNR_KNOWLEDGE_KL5_EVIDENCE_IMPLEMENTED = true as const;
