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
 *
 * OD-OCR-18: after parseFn, re-read LS — C2 CONNECT may have registered derived
 * documents/artifacts during the call; do not wipe them with a stale local copy.
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
  const queuedIds = state.documents
    .filter(
      (d) =>
        d.ingestStatus === "retained"
        && d.parseStatus === "queued"
        && d.source !== "derived_cost_segment"
        && isCostParseEligible(d.displayName || d.originalFilename, d.classHint)
        && !state!.skippedDocumentIds.includes(d.documentId),
    )
    .slice(0, batchSize)
    .map((d) => d.documentId);

  for (const documentId of queuedIds) {
    state = getIngestState(tenderId);
    if (!state) throw new Error("INGEST_STATE_MISSING");

    const doc = state.documents.find((d) => d.documentId === documentId);
    if (!doc || doc.parseStatus !== "queued") continue;

    const bytes =
      opts.bytesByDocumentId?.[documentId]
      ?? doc.bytes;
    if (!bytes || bytes.byteLength === 0) {
      const documents = state.documents.map((d) =>
        d.documentId === documentId
          ? {
              ...d,
              warnings: [...d.warnings, "PARSE_PENDING_BYTES"],
            }
          : d,
      );
      state = upsertIngestState(refreshPhases({ ...state, documents }));
      continue;
    }

    const filename = doc.displayName || doc.originalFilename;

    try {
      const snap = await opts.parseFn(bytes, filename);

      // Rehydrate — parseFn side-effects (C2 derived docs/artifacts) must survive.
      const live = getIngestState(tenderId);
      if (!live) throw new Error("INGEST_STATE_MISSING");

      let documents = live.documents.map((d) => ({ ...d }));
      let artifacts = [...live.artifacts];
      const idx = documents.findIndex((d) => d.documentId === documentId);

      if (!snap?.ok) {
        if (idx >= 0) {
          documents[idx] = {
            ...documents[idx]!,
            parseStatus: "failed",
            warnings: [...documents[idx]!.warnings, "PARSE_FAILED"],
          };
        }
        state = upsertIngestState(refreshPhases({ ...live, documents, artifacts }));
        continue;
      }

      const contentHash = documents[idx]?.contentHash ?? doc.contentHash;
      const existingArt = artifacts.find(
        (a) => a.documentId === documentId || a.contentHash === contentHash,
      );
      const ref: TenderIngestArtifactRef = {
        documentId,
        filename,
        contentHash,
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
      state = upsertIngestState(
        refreshPhases({
          ...live,
          documents,
          artifacts,
        }),
      );
    } catch (e) {
      const live = getIngestState(tenderId);
      if (!live) throw new Error("INGEST_STATE_MISSING");
      const documents = live.documents.map((d) =>
        d.documentId === documentId
          ? {
              ...d,
              parseStatus: "failed" as const,
              warnings: [
                ...d.warnings,
                `PARSE_ERROR:${e instanceof Error ? e.message : String(e)}`,
              ],
            }
          : d,
      );
      state = upsertIngestState(
        refreshPhases({
          ...live,
          documents,
          artifacts: [...live.artifacts],
        }),
      );
    }
  }

  state = getIngestState(tenderId);
  if (!state) throw new Error("INGEST_STATE_MISSING");
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
