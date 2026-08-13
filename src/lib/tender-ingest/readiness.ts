/**
 * INGEST-01 — readiness phases (PARTIAL ≠ COMPLETE).
 */

import type {
  TenderArchiveRecord,
  TenderIngestDocument,
  TenderIngestPhase,
  TenderIngestState,
} from "@/lib/tender-ingest/types";
import { isCostParseEligible } from "@/lib/tender-ingest/classify";

export function deriveIngestPhase(
  docs: TenderIngestDocument[],
  opts?: {
    expectedDocumentCount?: number | null;
    archives?: TenderArchiveRecord[];
  },
): TenderIngestPhase {
  const retained = docs.filter((d) => d.ingestStatus === "retained");
  const rejected = docs.filter((d) => d.ingestStatus === "rejected_unsafe");
  const pending = docs.filter((d) => d.ingestStatus === "pending_bytes");
  const badArchives = (opts?.archives ?? []).filter(
    (a) => a.status === "corrupt" || a.status === "rejected_unsafe",
  );
  const expected = opts?.expectedDocumentCount;

  if (docs.length === 0) {
    if (badArchives.length > 0) return "HOLD";
    return "INGEST_PENDING";
  }
  if (retained.length === 0 && (rejected.length > 0 || pending.length > 0 || badArchives.length > 0)) {
    return "HOLD";
  }
  if (
    typeof expected === "number"
    && expected > 0
    && retained.length < expected
  ) {
    return "INGEST_PARTIAL";
  }
  if (rejected.length > 0 || pending.length > 0 || badArchives.length > 0) {
    return "INGEST_PARTIAL";
  }
  if (retained.length === docs.length) return "INGEST_COMPLETE";
  return "INGEST_PARTIAL";
}

export function deriveParsePhase(
  state: Pick<TenderIngestState, "documents" | "artifacts" | "skippedDocumentIds" | "archives">,
): TenderIngestPhase {
  const costDocs = state.documents.filter(
    (d) =>
      d.ingestStatus === "retained"
      && isCostParseEligible(d.displayName || d.originalFilename, d.classHint),
  );
  const badArchives = (state.archives ?? []).filter(
    (a) => a.status === "corrupt" || a.status === "rejected_unsafe",
  );
  if (costDocs.length === 0) {
    return badArchives.length > 0 ? "HOLD" : "PARSE_COMPLETE";
  }
  const parsedIds = new Set(state.artifacts.map((a) => a.documentId));
  const done = costDocs.filter(
    (d) =>
      parsedIds.has(d.documentId)
      || d.parseStatus === "failed"
      || d.parseStatus === "skipped",
  );
  const queued = costDocs.filter((d) => d.parseStatus === "queued" || d.parseStatus === "none");
  if (state.skippedDocumentIds.length > 0 && done.length < costDocs.length) {
    return "PARSE_PARTIAL";
  }
  if (queued.length > 0 && done.length === 0) return "PARSE_PENDING";
  if (queued.length > 0 || done.length < costDocs.length) return "PARSE_PARTIAL";
  if (costDocs.some((d) => d.parseStatus === "failed")) return "PARSE_PARTIAL";
  // Missing artifact for a "parsed" claim → HOLD (never false COMPLETE)
  const missingArtifact = costDocs.some(
    (d) => d.parseStatus === "parsed" && !parsedIds.has(d.documentId),
  );
  if (missingArtifact) return "HOLD";
  return "PARSE_COMPLETE";
}

export function refreshPhases(state: TenderIngestState): TenderIngestState {
  return {
    ...state,
    ingestPhase: deriveIngestPhase(state.documents, {
      expectedDocumentCount: state.expectedDocumentCount,
      archives: state.archives,
    }),
    parsePhase: deriveParsePhase(state),
    updatedAt: new Date().toISOString(),
  };
}

/** Explicit visible cap: mark skipped, never pretend COMPLETE. */
export function applyExplicitParseCap(
  state: TenderIngestState,
  cap: number,
): TenderIngestState {
  const cost = state.documents.filter(
    (d) =>
      d.ingestStatus === "retained"
      && isCostParseEligible(d.displayName || d.originalFilename, d.classHint),
  );
  if (cost.length <= cap) {
    return refreshPhases({ ...state, skippedDocumentIds: [] });
  }
  const keep = cost.slice(0, cap).map((d) => d.documentId);
  const skipped = cost.slice(cap).map((d) => d.documentId);
  const documents = state.documents.map((d) => {
    if (skipped.includes(d.documentId)) {
      return {
        ...d,
        parseStatus: "skipped" as const,
        warnings: [...d.warnings, "EXPLICIT_CAP_SKIP"],
      };
    }
    if (keep.includes(d.documentId) && d.parseStatus === "none") {
      return { ...d, parseStatus: "queued" as const };
    }
    return d;
  });
  return refreshPhases({
    ...state,
    documents,
    skippedDocumentIds: skipped,
    warnings: [...state.warnings, `EXPLICIT_CAP:${cap}/${cost.length}`],
  });
}
