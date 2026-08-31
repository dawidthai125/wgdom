/**
 * Tender pipeline write-safety — pure guards (NO network).
 *
 * Blocks destructive full-array replacement of `kw-tenders-pipeline` when the
 * local snapshot is a regression vs authoritative cloud (truncation / missing
 * records / ikFinalBid loss), or when cloud cannot be read (fail-closed).
 */

export const PIPELINE_SNAPSHOT_REGRESSION_BLOCKED = "PIPELINE_SNAPSHOT_REGRESSION_BLOCKED" as const;
export const PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED =
  "PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED" as const;

export type PipelineWriteSafetyCode =
  | "OK"
  | typeof PIPELINE_SNAPSHOT_REGRESSION_BLOCKED
  | typeof PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED;

export type PipelineWriteSafetyCriticalLoss = {
  id: string;
  field: "ikFinalBid";
  reason: "record_absent_from_local_snapshot" | "critical_field_absent_on_local";
};

export type PipelineWriteSafetyVerdict = {
  allowed: boolean;
  code: PipelineWriteSafetyCode;
  cloudCount: number;
  localCount: number;
  missingRecords: number;
  missingIds: string[];
  criticalLoss: PipelineWriteSafetyCriticalLoss[];
};

export class PipelineWriteSafetyBlockedError extends Error {
  readonly code: typeof PIPELINE_SNAPSHOT_REGRESSION_BLOCKED | typeof PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED;
  readonly details: PipelineWriteSafetyVerdict;

  constructor(verdict: PipelineWriteSafetyVerdict) {
    const code =
      verdict.code === "OK"
        ? PIPELINE_SNAPSHOT_REGRESSION_BLOCKED
        : (verdict.code as typeof PIPELINE_SNAPSHOT_REGRESSION_BLOCKED | typeof PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED);
    super(
      code === PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED
        ? "Zapis pipeline zablokowany — brak odczytu authoritative cloud (kw-tenders-pipeline)."
        : `Zapis pipeline zablokowany — regresja snapshotu (${verdict.cloudCount}→${verdict.localCount}, missing=${verdict.missingRecords}).`,
    );
    this.name = "PipelineWriteSafetyBlockedError";
    this.code = code;
    this.details = { ...verdict, allowed: false, code };
  }
}

export function isPipelineWriteSafetyBlockedError(err: unknown): boolean {
  return (
    err instanceof PipelineWriteSafetyBlockedError
    || (err instanceof Error && (err as { code?: string }).code === PIPELINE_SNAPSHOT_REGRESSION_BLOCKED)
    || (err instanceof Error && (err as { code?: string }).code === PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED)
  );
}

type PipelineLike = {
  id?: unknown;
  ikFinalBid?: unknown;
};

function asPipelineItems(value: unknown): PipelineLike[] {
  return Array.isArray(value) ? (value as PipelineLike[]) : [];
}

function hasIkFinalBid(value: unknown): boolean {
  return value != null && typeof value === "object";
}

/**
 * Compare local pipeline snapshot to authoritative cloud before full-array write.
 * Does not use arbitrary count thresholds — only cloud vs local identity/fields.
 *
 * `deletedIds` — intentional removals (tombstones); those cloud ids are not
 * treated as missing / count regression.
 */
export function evaluatePipelineSnapshotWriteSafety(input: {
  cloudItems: unknown;
  localItems: unknown;
  deletedIds?: Iterable<string>;
}): PipelineWriteSafetyVerdict {
  const cloud = asPipelineItems(input.cloudItems);
  const local = asPipelineItems(input.localItems);
  const deleted = new Set(
    [...(input.deletedIds ?? [])].map((id) => String(id)).filter(Boolean),
  );
  const localCount = local.length;

  const cloudIds = new Set<string>();
  for (const item of cloud) {
    if (item?.id == null || item.id === "") continue;
    const id = String(item.id);
    if (deleted.has(id)) continue;
    cloudIds.add(id);
  }
  const cloudCount = cloudIds.size;

  const localIds = new Set<string>();
  const localById = new Map<string, PipelineLike>();
  for (const item of local) {
    if (item?.id == null || item.id === "") continue;
    const id = String(item.id);
    if (deleted.has(id)) continue;
    localIds.add(id);
    localById.set(id, item);
  }

  const missingIds = [...cloudIds].filter((id) => !localIds.has(id));
  const missingRecords = missingIds.length;

  const criticalLoss: PipelineWriteSafetyCriticalLoss[] = [];
  for (const c of cloud) {
    if (c?.id == null || c.id === "") continue;
    const id = String(c.id);
    if (deleted.has(id)) continue;
    if (!hasIkFinalBid(c.ikFinalBid)) continue;
    const loc = localById.get(id);
    if (!loc) {
      criticalLoss.push({
        id,
        field: "ikFinalBid",
        reason: "record_absent_from_local_snapshot",
      });
      continue;
    }
    if (!hasIkFinalBid(loc.ikFinalBid)) {
      criticalLoss.push({
        id,
        field: "ikFinalBid",
        reason: "critical_field_absent_on_local",
      });
    }
  }

  const countRegression = cloudCount > 0 && localCount < cloudCount;
  const blocked = countRegression || missingRecords > 0 || criticalLoss.length > 0;

  return {
    allowed: !blocked,
    code: blocked ? PIPELINE_SNAPSHOT_REGRESSION_BLOCKED : "OK",
    cloudCount,
    localCount,
    missingRecords,
    missingIds: missingIds.slice(0, 50),
    criticalLoss,
  };
}

/**
 * Fail-closed entry used by cloud-sync before pushing kw-tenders-pipeline.
 * `cloud === "UNAVAILABLE"` → cloud batch-get failed / not read.
 */
export function guardTenderPipelineCloudWrite(
  localItems: unknown,
  cloud: unknown | "UNAVAILABLE",
  opts?: { deletedIds?: Iterable<string> },
): PipelineWriteSafetyVerdict {
  if (cloud === "UNAVAILABLE") {
    const local = asPipelineItems(localItems);
    return {
      allowed: false,
      code: PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED,
      cloudCount: 0,
      localCount: local.length,
      missingRecords: 0,
      missingIds: [],
      criticalLoss: [],
    };
  }
  return evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems,
    deletedIds: opts?.deletedIds,
  });
}

export function assertTenderPipelineCloudWriteAllowed(
  localItems: unknown,
  cloud: unknown | "UNAVAILABLE",
  opts?: { deletedIds?: Iterable<string> },
): void {
  const verdict = guardTenderPipelineCloudWrite(localItems, cloud, opts);
  if (!verdict.allowed) {
    throw new PipelineWriteSafetyBlockedError(verdict);
  }
}
