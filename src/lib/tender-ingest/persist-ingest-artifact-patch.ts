/**
 * OD-OCR-45 — ingest artifact patch uses authoritative cloud body, not pruned local items[].
 * Reuses fetchKeysFromCloud + applyIngestArtifactsToPipelineItem + pushTenderPipelineToCloud.
 * Does not change prune / lean / guard / write-safety thresholds.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { fetchKeysFromCloud } from "@/lib/cloud-sync";
import { TENDERS_PIPELINE_KEY } from "@/lib/tenders-sync";
import { TENDERS_PIPELINE_GUARD_KEY } from "@/lib/tender-pipeline/tender-pipeline-guard";
import { pushTenderPipelineToCloud } from "@/lib/tender-pipeline/tender-pipeline-cloud-push";
import { applyIngestArtifactsToPipelineItem } from "@/lib/tender-ingest/artifact-bridge";

export class IngestArtifactCloudPatchError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "IngestArtifactCloudPatchError";
    this.code = code;
  }
}

export type PersistIngestArtifactPatchDeps = {
  fetchPipelineAndGuard?: () => Promise<[unknown, unknown]>;
  pushPipeline?: (items: TenderPipelineItem[]) => Promise<void>;
};

export type IngestArtifactCloudCandidate = {
  candidate: TenderPipelineItem[];
  patch: Partial<TenderPipelineItem>;
  shouldWrite: boolean;
  targetId: string;
};

function asPipelineItems(value: unknown): TenderPipelineItem[] {
  if (!Array.isArray(value)) {
    throw new IngestArtifactCloudPatchError(
      "CLOUD_PIPELINE_UNAVAILABLE",
      "Brak odczytu authoritative kw-tenders-pipeline.",
    );
  }
  return value as TenderPipelineItem[];
}

/** Build write candidate from cloud array + ingest-store artifacts. Never uses pruned local length. */
export function buildIngestArtifactCloudCandidate(
  cloudItems: TenderPipelineItem[],
  tenderId: string,
): IngestArtifactCloudCandidate {
  const id = String(tenderId ?? "").trim();
  if (!id) {
    throw new IngestArtifactCloudPatchError("INGEST_PATCH_TARGET_ABSENT", "Brak tenderId.");
  }
  const idx = cloudItems.findIndex((item) => item?.id === id);
  if (idx < 0) {
    throw new IngestArtifactCloudPatchError(
      "INGEST_PATCH_TARGET_ABSENT",
      `Brak kanonicznego itemu ${id} w cloud pipeline.`,
    );
  }
  const cloudItem = cloudItems[idx];
  const patch = applyIngestArtifactsToPipelineItem({ ...cloudItem });
  if (!patch.tenderDossier) {
    return { candidate: cloudItems, patch, shouldWrite: false, targetId: id };
  }
  const nextItem: TenderPipelineItem = {
    ...cloudItem,
    ...patch,
    id: cloudItem.id,
    updatedAt: new Date().toISOString(),
  };
  const candidate = cloudItems.map((item, i) => (i === idx ? nextItem : item));
  return { candidate, patch, shouldWrite: true, targetId: id };
}

async function defaultFetchPipelineAndGuard(): Promise<[unknown, unknown]> {
  const [body, guard] = await fetchKeysFromCloud([
    TENDERS_PIPELINE_KEY,
    TENDERS_PIPELINE_GUARD_KEY,
  ]);
  return [body, guard];
}

/**
 * PATCH one tender on authoritative cloud body, then canonical lean+guard write.
 * Empty ingest artifacts → no cloud write.
 */
export async function persistIngestArtifactPatchToCloud(
  tenderId: string,
  deps?: PersistIngestArtifactPatchDeps,
): Promise<{ wrote: boolean; itemCount: number; patch: Partial<TenderPipelineItem> }> {
  let fetched: [unknown, unknown];
  try {
    fetched = deps?.fetchPipelineAndGuard
      ? await deps.fetchPipelineAndGuard()
      : await defaultFetchPipelineAndGuard();
  } catch {
    throw new IngestArtifactCloudPatchError(
      "CLOUD_PIPELINE_UNAVAILABLE",
      "Brak odczytu authoritative kw-tenders-pipeline.",
    );
  }

  const cloudItems = asPipelineItems(fetched[0]);
  const built = buildIngestArtifactCloudCandidate(cloudItems, tenderId);
  if (!built.shouldWrite) {
    return { wrote: false, itemCount: cloudItems.length, patch: built.patch };
  }

  const push = deps?.pushPipeline ?? pushTenderPipelineToCloud;
  await push(built.candidate);
  return { wrote: true, itemCount: built.candidate.length, patch: built.patch };
}
