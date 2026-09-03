/**
 * INGEST-01 — public exports.
 */

export {
  TENDER_INGEST_LS_KEY,
  TENDER_INGEST_SCHEMA_VERSION,
  INGEST_PARSE_BATCH_SIZE,
  INGEST_ZIP_MAX_ENTRIES,
  INGEST_ZIP_MAX_UNCOMPRESSED_BYTES,
  INGEST_SINGLE_FILE_MAX_BYTES,
} from "@/lib/tender-ingest/constants";

export type {
  ImportTenderRequest,
  TenderIngestMode,
  TenderIngestRetention,
  TenderIngestDocument,
  TenderIngestState,
  TenderIngestPhase,
  TenderArchiveRecord,
  TenderDocumentClassHint,
  OwnerHeavyParsePolicy,
} from "@/lib/tender-ingest/types";

export {
  emptyIngestStore,
  emptyIngestState,
  loadIngestStore,
  saveIngestStore,
  clearIngestStore,
  getIngestState,
  upsertIngestState,
  retainOwnerFile,
  ensureIngestStateForPin,
  setExpectedDocumentCount,
} from "@/lib/tender-ingest/registry";

export {
  buildPinnedPipelineItem,
  mergePinnedIntoPipeline,
  isPinnedRetentionItem,
  resolvePinnedTenderItemId,
} from "@/lib/tender-ingest/pin";

export { expandZipArchive } from "@/lib/tender-ingest/archive";
export { sha256Hex, newDocumentId, safeDisplayName } from "@/lib/tender-ingest/hash";
export { classifyDocumentHint, isCostParseEligible } from "@/lib/tender-ingest/classify";
export {
  deriveIngestPhase,
  deriveParsePhase,
  refreshPhases,
  applyExplicitParseCap,
} from "@/lib/tender-ingest/readiness";
export { processIngestParseBatch, recordIngestArtifact } from "@/lib/tender-ingest/queue";
export { applyIngestArtifactsToPipelineItem } from "@/lib/tender-ingest/artifact-bridge";
export { ingestOwnerFileList, ingestOwnerBrowserFiles } from "@/lib/tender-ingest/owner-files";
export {
  normalizeSegmentText,
  computeDerivedSegmentContentHash,
  joinOcrPagesText,
  proposeIntraPdfCostSegments,
  acceptIntraPdfCostSegments,
  registerDerivedCostDocument,
  connectIntraPdfDerivedCostDocuments,
} from "@/lib/tender-ingest/derived-cost-segment";
export type {
  DerivedSegmentSignal,
  SegmentProposalStatus,
  IntraPdfSegmentProposal,
  IntraPdfSegmentationResult,
} from "@/lib/tender-ingest/derived-cost-segment";
export type { TenderDocumentSource, TenderIngestArtifactRef } from "@/lib/tender-ingest/types";
export {
  isPathTraversalName,
  assertSingleFileSize,
  assertZipEntrySafe,
} from "@/lib/tender-ingest/security";
