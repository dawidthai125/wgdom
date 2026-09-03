/**
 * INGEST-01 — incremental parse queue (batch 5–10).
 * REUSE parseDocumentToKosztorys — no new parser.
 */

import { INGEST_PARSE_BATCH_SIZE } from "@/lib/tender-ingest/constants";
import { isCostParseEligible } from "@/lib/tender-ingest/classify";
import { getIngestState, upsertIngestState } from "@/lib/tender-ingest/registry";
import { refreshPhases } from "@/lib/tender-ingest/readiness";
import type { TenderIngestArtifactRef, TenderIngestState } from "@/lib/tender-ingest/types";
import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";

export type IngestParseFn = (
  bytes: Uint8Array,
  filename: string,
) => Promise<TenderKosztorysSnapshot | null>;

/**
 * Process up to batchSize queued COST documents that still have bytes.
 * Missing bytes → leave queued (PARTIAL), never invent snapshot.
 */
export async function processIngestParseBatch(opts: {
  tenderId: string;
  parseFn: IngestParseFn;
  batchSize?: number;
  /** In-memory bytes by documentId (harness / UI session). */
  bytesByDocumentId?: Record<string, Uint8Array>;
}): Promise<TenderIngestState> {
  const tenderId = String(opts.tenderId ?? "").trim();
  let state = getIngestState(tenderId);
  if (!state) throw new Error("INGEST_STATE_MISSING");

  const batchSize = opts.batchSize ?? INGEST_PARSE_BATCH_SIZE;
  const queued = state.documents.filter(
    (d) =>
      d.ingestStatus === "retained"
      && d.parseStatus === "queued"
      && isCostParseEligible(d.displayName || d.originalFilename, d.classHint)
      && !state!.skippedDocumentIds.includes(d.documentId),
  );

  const slice = queued.slice(0, batchSize);
  const artifacts = [...state.artifacts];
  const documents = state.documents.map((d) => ({ ...d }));

  for (const doc of slice) {
    const bytes =
      opts.bytesByDocumentId?.[doc.documentId]
      ?? documents.find((d) => d.documentId === doc.documentId)?.bytes;
    const idx = documents.findIndex((d) => d.documentId === doc.documentId);
    if (!bytes || bytes.byteLength === 0) {
      if (idx >= 0) {
        documents[idx] = {
          ...documents[idx]!,
          warnings: [...documents[idx]!.warnings, "PARSE_PENDING_BYTES"],
        };
      }
      continue;
    }

    try {
      const snap = await opts.parseFn(bytes, doc.displayName || doc.originalFilename);
      if (!snap?.ok) {
        if (idx >= 0) {
          documents[idx] = {
            ...documents[idx]!,
            parseStatus: "failed",
            warnings: [...documents[idx]!.warnings, "PARSE_FAILED"],
          };
        }
        continue;
      }
      // Dedup artifact by documentId / contentHash
      const existingArt = artifacts.find(
        (a) => a.documentId === doc.documentId || a.contentHash === doc.contentHash,
      );
      const ref: TenderIngestArtifactRef = {
        documentId: doc.documentId,
        filename: doc.displayName || doc.originalFilename,
        contentHash: doc.contentHash,
        snapshot: snap,
      };
      if (existingArt) {
        const ai = artifacts.indexOf(existingArt);
        artifacts[ai] = ref;
      } else {
        artifacts.push(ref);
      }
      if (idx >= 0) {
        documents[idx] = { ...documents[idx]!, parseStatus: "parsed", bytes: undefined };
      }
    } catch (e) {
      if (idx >= 0) {
        documents[idx] = {
          ...documents[idx]!,
          parseStatus: "failed",
          warnings: [
            ...documents[idx]!.warnings,
            `PARSE_ERROR:${e instanceof Error ? e.message : String(e)}`,
          ],
        };
      }
    }
  }

  state = upsertIngestState(
    refreshPhases({
      ...state,
      documents,
      artifacts,
    }),
  );
  return state;
}

/** Record a synthetic/prebuilt snapshot for harness (still requires documentId). */
export function recordIngestArtifact(opts: {
  tenderId: string;
  documentId: string;
  filename: string;
  contentHash: string;
  snapshot: TenderKosztorysSnapshot;
  /** OD-OCR-15 — explicit branch for derived segments (optional for legacy). */
  branch?: import("@/lib/cost-multi-01-types").BranchCode;
}): TenderIngestState {
  const state = getIngestState(opts.tenderId);
  if (!state) throw new Error("INGEST_STATE_MISSING");
  if (!opts.snapshot?.ok) throw new Error("ARTIFACT_REQUIRES_OK_SNAPSHOT");

  const artifacts = [...state.artifacts];
  const existing = artifacts.findIndex(
    (a) => a.documentId === opts.documentId || a.contentHash === opts.contentHash,
  );
  const ref: TenderIngestArtifactRef = {
    documentId: opts.documentId,
    filename: opts.filename,
    contentHash: opts.contentHash,
    snapshot: opts.snapshot,
    ...(opts.branch ? { branch: opts.branch } : {}),
  };
  if (existing >= 0) artifacts[existing] = ref;
  else artifacts.push(ref);

  const documents = state.documents.map((d) =>
    d.documentId === opts.documentId ? { ...d, parseStatus: "parsed" as const } : d,
  );

  return upsertIngestState(refreshPhases({ ...state, documents, artifacts }));
}
