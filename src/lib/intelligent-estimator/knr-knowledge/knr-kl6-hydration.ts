/**
 * IK-KNR KL-6 CORPUS hydration (Option A).
 *
 * Local JSON file payloads -> session queue only.
 * ZERO verify/approve/reject transitions.
 * ZERO catalog writes.
 * ZERO evidence writes.
 * ZERO HTTP/fetch/research.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import { loadKnrCatalogStoreLocal, type KnrCatalogStore } from "./knr-catalog-store";
import { KNR_KNOWLEDGE_SCHEMA_VERSION } from "./types";
import type { KnrNormBundle } from "./knr-catalog-entry-types";
import type { KnrRawEvidenceStore } from "./knr-evidence-store";
import { emptyKnrRawEvidenceStore, normalizeKnrRawEvidenceStore } from "./knr-evidence-store";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import { validateKnrCatalogEntryCandidate } from "./knr-validate-contract";

export const KNR_KL6_HYDRATION_IMPLEMENTED = true as const;
export const KNR_KNOWLEDGE_KL6_HYDRATION_MARKER = true as const;
export const KNR_KL6_HYDRATION_HTTP_ENABLED = false as const;
export const KNR_KL6_HYDRATION_AUTO_VERIFY_ENABLED = false as const;
export const KNR_KL6_HYDRATION_BATCH_VERIFY_ENABLED = false as const;

type UnknownRecord = Record<string, unknown>;

export type KnrHydrationRejectCode =
  | "INVALID_JSON"
  | "SCHEMA_INVALID"
  | "PENDING_REQUIRED"
  | "STATUS_FORBIDDEN"
  | "IDENTITY_KEY_MISSING"
  | "IDENTITY_KEY_INVALID"
  | "EVIDENCE_REF_MISSING"
  | "EVIDENCE_BLOB_MISSING"
  | "VALIDATION_FAILED";

export type KnrKl6HydrationSkip = {
  index: number;
  identityKeyV2: string;
  code: KnrHydrationRejectCode;
  messagePl: string;
};

export type KnrKl6HydrationQueueItem = {
  entry: KnrCatalogEntry;
  sourceAthFilename: string | null;
  sourceAthStoragePath: string | null;
};

export type KnrKl6HydrationResult = {
  ok: boolean;
  messagePl: string;
  queue: KnrKl6HydrationQueueItem[];
  evidenceStore: KnrRawEvidenceStore;
  skipped: KnrKl6HydrationSkip[];
  duplicateDropped: number;
  hasForbiddenStatuses: boolean;
  verificationTransitions: 0;
  catalogWrites: 0;
};

function asString(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function asOptionalString(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function isObject(raw: unknown): raw is UnknownRecord {
  return Boolean(raw) && typeof raw === "object" && !Array.isArray(raw);
}

function parseIdentityFromIdentityKeyV2(identityKeyV2: string): KnrIdentityV2Partial | null {
  const parts = identityKeyV2.split("|");
  if (parts.length < 9) return null;
  const [family, catalog, publisher, edition, chapter, table, column, item, variant] = parts;
  if (!family?.trim() || !catalog?.trim()) return null;
  return {
    family: family.trim() as KnrIdentityV2Partial["family"],
    catalog: catalog.trim(),
    publisher: publisher?.trim() || null,
    edition: edition?.trim() || null,
    chapter: chapter?.trim() || null,
    table: table?.trim() || null,
    column: column?.trim() || null,
    item: item?.trim() || null,
    variant: variant?.trim() || null,
  };
}

function isForbiddenStatus(status: string): boolean {
  const u = status.trim().toUpperCase();
  return u === "VERIFIED" || u === "APPROVED" || u === "REJECTED";
}

function mapNorms(normsRaw: unknown): KnrNormBundle {
  const norms = isObject(normsRaw) ? normsRaw : {};
  const mapRows = (rows: unknown, kind: "R" | "M" | "S") => {
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((row) => isObject(row))
      .map((row) => ({
        kind,
        code: asString(row.code).trim(),
        description: asString(row.description).trim(),
        unit: asString(row.unit).trim(),
        quantity: Number(row.quantity) || 0,
        sourceRef: asOptionalString(row.sourceRef),
      }))
      .filter((row) => row.code && row.description && row.unit && Number.isFinite(row.quantity));
  };
  return {
    laborNorms: mapRows(norms.laborNorms, "R"),
    materialNorms: mapRows(norms.materialNorms, "M"),
    equipmentNorms: mapRows(norms.equipmentNorms, "S"),
  };
}

function normalizePendingArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];
  if (Array.isArray(payload.pending)) return payload.pending;
  if (isObject(payload.pack) && Array.isArray(payload.pack.pending)) return payload.pack.pending;
  return [];
}

function normalizeEvidencePayload(
  evidenceJsonRaw: unknown,
  nowIso: string,
  baseStore?: KnrRawEvidenceStore,
): KnrRawEvidenceStore {
  const parsed = normalizeKnrRawEvidenceStore(evidenceJsonRaw, nowIso);
  if (!baseStore) return parsed;
  const mergedBlobs = { ...baseStore.blobs };
  for (const [refId, blob] of Object.entries(parsed.blobs)) {
    if (!mergedBlobs[refId]) mergedBlobs[refId] = blob;
  }
  return normalizeKnrRawEvidenceStore(
    {
      ...baseStore,
      updatedAt: nowIso,
      blobs: mergedBlobs,
    },
    nowIso,
  );
}

export function hydrateKnrCorpusPendingQueueFromParsed(input: {
  pendingJsonRaw: unknown;
  evidenceJsonRaw: unknown;
  existingQueue?: KnrKl6HydrationQueueItem[];
  existingEvidenceStore?: KnrRawEvidenceStore;
  nowIso: string;
}): KnrKl6HydrationResult {
  const queueIn = input.existingQueue ?? [];
  const evidenceStore = normalizeEvidencePayload(
    input.evidenceJsonRaw,
    input.nowIso,
    input.existingEvidenceStore ?? emptyKnrRawEvidenceStore(input.nowIso),
  );
  const pendingRows = normalizePendingArray(input.pendingJsonRaw);

  const skipped: KnrKl6HydrationSkip[] = [];
  const dedup = new Map<string, KnrKl6HydrationQueueItem>();
  let duplicateDropped = 0;
  let forbiddenStatusSeen = false;

  for (const row of queueIn) {
    dedup.set(`${row.entry.identityKeyV2}::${row.entry.contentHash}`, row);
  }

  pendingRows.forEach((raw, index) => {
    if (!isObject(raw)) {
      skipped.push({
        index,
        identityKeyV2: "",
        code: "SCHEMA_INVALID",
        messagePl: "Rekord PENDING nie jest obiektem JSON.",
      });
      return;
    }

    const identityKeyV2 = asString(raw.identityKeyV2).trim();
    if (!identityKeyV2) {
      skipped.push({
        index,
        identityKeyV2: "",
        code: "IDENTITY_KEY_MISSING",
        messagePl: "Brak identityKeyV2.",
      });
      return;
    }

    const status = asString(raw.verificationStatus).trim();
    if (isForbiddenStatus(status)) {
      forbiddenStatusSeen = true;
      skipped.push({
        index,
        identityKeyV2,
        code: "STATUS_FORBIDDEN",
        messagePl: `Niedozwolony status w payload: ${status}`,
      });
      return;
    }
    if (status !== "PENDING_VERIFY") {
      skipped.push({
        index,
        identityKeyV2,
        code: "PENDING_REQUIRED",
        messagePl: `Oczekiwano PENDING_VERIFY, otrzymano: ${status || "brak"}`,
      });
      return;
    }

    const identity = parseIdentityFromIdentityKeyV2(identityKeyV2);
    if (!identity) {
      skipped.push({
        index,
        identityKeyV2,
        code: "IDENTITY_KEY_INVALID",
        messagePl: "identityKeyV2 ma nieprawidłowy format.",
      });
      return;
    }

    const provenanceRaw = isObject(raw.provenance) ? raw.provenance : {};
    const rawEvidenceRef = isObject(provenanceRaw.rawEvidenceRef) ? provenanceRaw.rawEvidenceRef : null;
    const evidenceRefId = asString(rawEvidenceRef?.refId).trim();
    if (!evidenceRefId) {
      skipped.push({
        index,
        identityKeyV2,
        code: "EVIDENCE_REF_MISSING",
        messagePl: "Brak provenance.rawEvidenceRef.refId.",
      });
      return;
    }
    if (!evidenceStore.blobs[evidenceRefId]) {
      skipped.push({
        index,
        identityKeyV2,
        code: "EVIDENCE_BLOB_MISSING",
        messagePl: `Brak blobu evidence dla refId=${evidenceRefId}.`,
      });
      return;
    }

    const displayCode = asString(raw.displayCode).trim();
    const evidenceKeyV1 = asString(raw.evidenceKeyV1).trim();
    const contentHash = asString(raw.contentHash).trim();
    const liveAt = asString(raw.liveAt).trim() || input.nowIso;
    const norms = mapNorms(raw.norms);

    const entry: KnrCatalogEntry = {
      schemaVersion: KNR_KNOWLEDGE_SCHEMA_VERSION,
      identityKeyV2,
      evidenceKeyV1,
      identity,
      originalSourceCode: displayCode || evidenceKeyV1 || identityKeyV2,
      displayCode,
      description: asString(raw.description).trim(),
      unit: asString(raw.unit).trim(),
      norms,
      provenance: {
        sourceType: (asString(provenanceRaw.sourceType).trim() || "LICENSED_PROGRAM_EXPORT") as KnrCatalogEntry["provenance"]["sourceType"],
        sourceIdentifier: asString(provenanceRaw.sourceIdentifier).trim() || asString(raw.sourceAth && isObject(raw.sourceAth) ? raw.sourceAth.filename : ""),
        sourceProgram: asOptionalString(provenanceRaw.sourceProgram) ?? "Norma",
        sourceProgramVersion: asOptionalString(provenanceRaw.sourceProgramVersion),
        acquisitionMethod: (asString(provenanceRaw.acquisitionMethod).trim() || "LICENSED_EXPORT") as KnrCatalogEntry["provenance"]["acquisitionMethod"],
        capturedAt: asString(provenanceRaw.capturedAt).trim() || liveAt,
        retrievedAt: asOptionalString(provenanceRaw.retrievedAt) ?? liveAt,
        parserVersion: asString(provenanceRaw.parserVersion).trim() || "KL-5-ath-rms-v1",
        contentHash: asString(provenanceRaw.contentHash).trim() || contentHash,
        rawEvidenceRef: {
          refId: evidenceRefId,
          kind: (asString(rawEvidenceRef?.kind).trim() || "export_file") as "export_file" | "import_batch" | "inline_stub",
          sourceFilename:
            asOptionalString(rawEvidenceRef?.sourceFilename)
            ?? asOptionalString(raw.sourceAth && isObject(raw.sourceAth) ? raw.sourceAth.filename : null),
          sourceRow:
            Number.isFinite(Number(rawEvidenceRef?.sourceRow)) ? Number(rawEvidenceRef?.sourceRow) : null,
        },
        importBatchId: asOptionalString(provenanceRaw.importBatchId),
        licenceId: asOptionalString(provenanceRaw.licenceId),
        originId: asOptionalString(provenanceRaw.originId),
        revision:
          Number.isFinite(Number(provenanceRaw.revision)) ? Number(provenanceRaw.revision) : 1,
        evidenceMetadata:
          isObject(provenanceRaw.evidenceMetadata)
            ? (provenanceRaw.evidenceMetadata as Record<string, string | number | boolean | null>)
            : undefined,
      },
      verificationStatus: "PENDING_VERIFY",
      validationState: asString(raw.validationState).trim() === "PASS" ? "PASS" : "INCOMPLETE",
      lifecycleState: "ACTIVE",
      contentHash,
      verifiedAt: null,
      verifiedBy: null,
      createdAt: liveAt,
      updatedAt: liveAt,
      supersededBy: null,
    };

    const validation = validateKnrCatalogEntryCandidate({
      entry,
      forVerifiedTarget: false,
    });
    if (validation.validationState !== "PASS") {
      skipped.push({
        index,
        identityKeyV2,
        code: "VALIDATION_FAILED",
        messagePl: `Walidacja hydracji: ${validation.codes.join(", ")}`,
      });
      return;
    }
    entry.validationState = validation.validationState;
    entry.contentHash = validation.contentHash || entry.contentHash;
    entry.provenance.contentHash = entry.provenance.contentHash || entry.contentHash;

    const key = `${entry.identityKeyV2}::${entry.contentHash}`;
    if (dedup.has(key)) {
      duplicateDropped += 1;
      return;
    }
    dedup.set(key, {
      entry,
      sourceAthFilename: asOptionalString(raw.sourceAth && isObject(raw.sourceAth) ? raw.sourceAth.filename : null),
      sourceAthStoragePath: asOptionalString(raw.sourceAth && isObject(raw.sourceAth) ? raw.sourceAth.storagePath : null),
    });
  });

  const queue = [...dedup.values()];
  const ok = skipped.length === 0;
  return {
    ok,
    messagePl: ok
      ? `Załadowano kolejkę KNR (${queue.length}) bez błędów.`
      : `Hydracja zakończona z pominięciami: ${skipped.length}.`,
    queue,
    evidenceStore,
    skipped,
    duplicateDropped,
    hasForbiddenStatuses: forbiddenStatusSeen,
    verificationTransitions: 0,
    catalogWrites: 0,
  };
}

/**
 * Read PENDING_VERIFY rows from local kw-knr-catalog into session queue (no writes).
 */
export function hydrateKnrPendingQueueFromLocalCatalog(input?: {
  catalogStore?: KnrCatalogStore;
  existingQueue?: KnrKl6HydrationQueueItem[];
}): {
  queue: KnrKl6HydrationQueueItem[];
  loadedCount: number;
  catalogPendingCount: number;
} {
  const catalog = input?.catalogStore ?? loadKnrCatalogStoreLocal();
  const existingKeys = new Set(
    (input?.existingQueue ?? []).map((row) => `${row.entry.identityKeyV2}::${row.entry.contentHash}`),
  );
  const dedup = new Map<string, KnrKl6HydrationQueueItem>();
  for (const row of input?.existingQueue ?? []) {
    dedup.set(`${row.entry.identityKeyV2}::${row.entry.contentHash}`, row);
  }
  let catalogPendingCount = 0;
  let loadedCount = 0;
  for (const entry of Object.values(catalog.entries)) {
    if (entry.verificationStatus !== "PENDING_VERIFY" || entry.lifecycleState !== "ACTIVE") {
      continue;
    }
    catalogPendingCount += 1;
    const key = `${entry.identityKeyV2}::${entry.contentHash}`;
    if (dedup.has(key)) continue;
    dedup.set(key, {
      entry,
      sourceAthFilename: entry.provenance.rawEvidenceRef?.sourceFilename ?? null,
      sourceAthStoragePath: null,
    });
    if (!existingKeys.has(key)) loadedCount += 1;
  }
  return {
    queue: [...dedup.values()],
    loadedCount,
    catalogPendingCount,
  };
}

export function hydrateKnrCorpusPendingQueueFromText(input: {
  pendingJsonText: string;
  evidenceJsonText: string;
  existingQueue?: KnrKl6HydrationQueueItem[];
  existingEvidenceStore?: KnrRawEvidenceStore;
  nowIso: string;
}): KnrKl6HydrationResult {
  let pendingJsonRaw: unknown;
  let evidenceJsonRaw: unknown;
  try {
    pendingJsonRaw = JSON.parse(input.pendingJsonText);
    evidenceJsonRaw = JSON.parse(input.evidenceJsonText);
  } catch {
    return {
      ok: false,
      messagePl: "Nieprawidłowy JSON payload (pending/evidence).",
      queue: input.existingQueue ?? [],
      evidenceStore: input.existingEvidenceStore ?? emptyKnrRawEvidenceStore(input.nowIso),
      skipped: [
        {
          index: -1,
          identityKeyV2: "",
          code: "INVALID_JSON",
          messagePl: "JSON parse failed.",
        },
      ],
      duplicateDropped: 0,
      hasForbiddenStatuses: false,
      verificationTransitions: 0,
      catalogWrites: 0,
    };
  }
  return hydrateKnrCorpusPendingQueueFromParsed({
    pendingJsonRaw,
    evidenceJsonRaw,
    existingQueue: input.existingQueue,
    existingEvidenceStore: input.existingEvidenceStore,
    nowIso: input.nowIso,
  });
}
