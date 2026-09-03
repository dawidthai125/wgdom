/**
 * OD-OCR-25 — lean cloud push + guard write protocol (fail-closed).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  fetchKeysFromCloud,
  pushKeysToCloud,
  pushKeysToCloudSafe,
} from "@/lib/cloud-sync";
import {
  isPipelineCloudLeanClientVersionAllowed,
  isPipelineCloudLeanGuardEnabled,
  isPipelineCloudLeanMigrationComplete,
} from "@/lib/app-settings";
import {
  estimatePipelineJsonBytes,
  stripTenderPipelineForCloud,
} from "@/lib/tender-pipeline/tender-pipeline-cloud-lean";
import {
  buildTenderPipelineGuard,
  parseTenderPipelineGuard,
  TENDERS_PIPELINE_GUARD_KEY,
  verifyPipelineBodyGuardIkFinalBidParity,
  verifyTenderPipelineGuardWrite,
} from "@/lib/tender-pipeline/tender-pipeline-guard";
import {
  clearPipelineCloudUnconfirmed,
  isPipelineCloudWriteUnconfirmed,
  markPipelineCloudUnconfirmed,
} from "@/lib/tender-pipeline/tender-pipeline-cloud-unconfirmed";
import {
  assertTenderPipelineCloudWriteAllowed,
  PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
  PIPELINE_GUARD_BODY_MISMATCH_BLOCKED,
  PIPELINE_STALE_CLIENT_BLOCKED,
  PipelineWriteSafetyBlockedError,
} from "@/lib/tender-pipeline-write-safety";
import { getDeletedTenderIds, TENDERS_PIPELINE_KEY } from "@/lib/tenders-sync";
import { mergeTenderPipelineForCloud } from "@/lib/tenders-sync";

export class PipelineCloudPushError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PipelineCloudPushError";
    this.code = code;
  }
}

function assertLeanGuardClientCapable(): void {
  if (!isPipelineCloudLeanClientVersionAllowed()) {
    throw new PipelineWriteSafetyBlockedError({
      allowed: false,
      code: PIPELINE_STALE_CLIENT_BLOCKED,
      cloudCount: 0,
      localCount: 0,
      missingRecords: 0,
      missingIds: [],
      criticalLoss: [],
    });
  }
}

function assertNotUnconfirmed(): void {
  if (isPipelineCloudWriteUnconfirmed()) {
    throw new PipelineWriteSafetyBlockedError({
      allowed: false,
      code: PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
      cloudCount: 0,
      localCount: 0,
      missingRecords: 0,
      missingIds: [],
      criticalLoss: [],
    });
  }
}

/** Push FULL local intent to cloud — lean strip + guard when flag ON. */
export async function pushTenderPipelineToCloud(fullItems: TenderPipelineItem[]): Promise<void> {
  if (!isPipelineCloudLeanGuardEnabled()) {
    await pushKeysToCloudSafe([TENDERS_PIPELINE_KEY], [fullItems]);
    return;
  }

  assertLeanGuardClientCapable();
  assertNotUnconfirmed();

  if (!isPipelineCloudLeanMigrationComplete()) {
    await pushKeysToCloudSafe([TENDERS_PIPELINE_KEY], [fullItems]);
    return;
  }

  const deletedIds = getDeletedTenderIds();
  let cloudBody: unknown = null;
  let cloudGuard: unknown = null;
  let cloudFetchOk = false;

  try {
    [cloudBody, cloudGuard] = await fetchKeysFromCloud([
      TENDERS_PIPELINE_KEY,
      TENDERS_PIPELINE_GUARD_KEY,
    ]);
    cloudFetchOk = true;
  } catch {
    cloudFetchOk = false;
  }

  const cloudOrUnavailable: unknown | "UNAVAILABLE" = cloudFetchOk ? cloudBody : "UNAVAILABLE";
  try {
    assertTenderPipelineCloudWriteAllowed(fullItems, cloudOrUnavailable, { deletedIds });
  } catch (e) {
    throw e;
  }

  const mergedFull = cloudFetchOk && Array.isArray(cloudBody)
    ? mergeTenderPipelineForCloud(fullItems, cloudBody, deletedIds)
    : fullItems;

  const leanBody = stripTenderPipelineForCloud(mergedFull);
  const prevGuard = parseTenderPipelineGuard(cloudGuard);
  const nextRevision = (prevGuard?.bundleRevision ?? 0) + 1;
  const bundleAt = new Date().toISOString();
  const guard = buildTenderPipelineGuard(leanBody, {
    bundleRevision: nextRevision,
    bundleAt,
    deletedIds,
  });

  const parity = verifyPipelineBodyGuardIkFinalBidParity(leanBody, guard);
  if (!parity.ok) {
    throw new PipelineWriteSafetyBlockedError({
      allowed: false,
      code: PIPELINE_GUARD_BODY_MISMATCH_BLOCKED,
      cloudCount: guard.itemCount,
      localCount: leanBody.length,
      missingRecords: parity.mismatches.length,
      missingIds: parity.mismatches.map((m) => m.id).slice(0, 50),
      criticalLoss: parity.mismatches.map((m) => ({
        id: m.id,
        field: "ikFinalBid" as const,
        reason: "critical_field_absent_on_local" as const,
      })),
    });
  }

  try {
    await pushKeysToCloud(
      [TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY],
      [leanBody, guard],
    );
  } catch (e) {
    markPipelineCloudUnconfirmed("body_or_guard_push_failed");
    throw e;
  }

  try {
    const [, readGuard] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY]);
    const verified = verifyTenderPipelineGuardWrite(readGuard, {
      bundleRevision: nextRevision,
      itemCount: guard.itemCount,
    });
    if (!verified.ok) {
      markPipelineCloudUnconfirmed(verified.reason);
      throw new PipelineCloudPushError("guard_verify_failed", verified.reason);
    }
    const parityAfter = verifyPipelineBodyGuardIkFinalBidParity(leanBody, verified.guard);
    if (!parityAfter.ok) {
      markPipelineCloudUnconfirmed("post_verify_bid_parity_failed");
      throw new PipelineCloudPushError("guard_bid_parity_failed", "post_write_parity");
    }
  } catch (e) {
    if (e instanceof PipelineCloudPushError) throw e;
    markPipelineCloudUnconfirmed("guard_verify_read_failed");
    throw e;
  }

  clearPipelineCloudUnconfirmed();
}

export type PipelinePayloadSizeReport = {
  fullBytes: number;
  leanBytes: number;
  guardBytes: number;
  reductionPct: number;
};

/** Harness — measure FULL vs LEAN vs guard without network write. */
export function measurePipelineCloudPayloadSizes(
  fullItems: TenderPipelineItem[],
): PipelinePayloadSizeReport {
  const leanBody = stripTenderPipelineForCloud(fullItems);
  const guard = buildTenderPipelineGuard(leanBody, {
    bundleRevision: 1,
    bundleAt: new Date().toISOString(),
    deletedIds: getDeletedTenderIds(),
  });
  const fullBytes = estimatePipelineJsonBytes(fullItems);
  const leanBytes = estimatePipelineJsonBytes(leanBody);
  const guardBytes = estimatePipelineJsonBytes(guard);
  const reductionPct = fullBytes > 0 ? Math.round((1 - leanBytes / fullBytes) * 1000) / 10 : 0;
  return { fullBytes, leanBytes, guardBytes, reductionPct };
}
