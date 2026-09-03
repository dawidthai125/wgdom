/**
 * OD-OCR-25 — migration primitives (NOT auto-run on prod).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import {
  buildTenderPipelineGuard,
  parseTenderPipelineGuard,
  TENDERS_PIPELINE_GUARD_KEY,
  verifyPipelineBodyGuardIkFinalBidParity,
  verifyTenderPipelineGuardWrite,
} from "@/lib/tender-pipeline/tender-pipeline-guard";
import {
  estimatePipelineJsonBytes,
  stripTenderPipelineForCloud,
} from "@/lib/tender-pipeline/tender-pipeline-cloud-lean";
import { fetchKeysFromCloud, pushKeysToCloud } from "@/lib/cloud-sync";
import { TENDERS_PIPELINE_KEY } from "@/lib/tenders-sync";
import {
  isPipelineCloudLeanGuardEnabled,
  isPipelineCloudLeanMigrationComplete,
  loadAppSettingsLocal,
} from "@/lib/app-settings";
import { clearPipelineCloudUnconfirmed } from "@/lib/tender-pipeline/tender-pipeline-cloud-unconfirmed";

export type PipelineMigrationStepResult =
  | { ok: true; leanBytes: number; guardRevision: number }
  | { ok: false; reason: string };

/**
 * One-time FULL → LEAN + guard (idempotent when guard already matches).
 * Caller must ensure FULL body is recoverable before invoke.
 */
export async function migratePipelineFullToLeanGuard(
  fullItems: TenderPipelineItem[],
  opts?: { deletedIds?: string[]; force?: boolean },
): Promise<PipelineMigrationStepResult> {
  if (!isPipelineCloudLeanGuardEnabled()) {
    return { ok: false, reason: "flag_off" };
  }
  if (isPipelineCloudLeanMigrationComplete() && !opts?.force) {
    return { ok: false, reason: "already_complete" };
  }
  if (!Array.isArray(fullItems) || fullItems.length === 0) {
    return { ok: false, reason: "empty_body" };
  }

  const leanBody = stripTenderPipelineForCloud(fullItems);
  const leanBytes = estimatePipelineJsonBytes(leanBody);

  let prevRevision = 0;
  try {
    const [existingGuard] = await fetchKeysFromCloud([TENDERS_PIPELINE_GUARD_KEY]);
    const parsed = parseTenderPipelineGuard(existingGuard);
    if (parsed) prevRevision = parsed.bundleRevision;
  } catch {
    return { ok: false, reason: "guard_read_failed" };
  }

  const bundleAt = new Date().toISOString();
  const nextRevision = prevRevision + 1;
  const guard = buildTenderPipelineGuard(leanBody, {
    bundleRevision: nextRevision,
    bundleAt,
    deletedIds: opts?.deletedIds,
  });

  const parity = verifyPipelineBodyGuardIkFinalBidParity(leanBody, guard);
  if (!parity.ok) {
    return { ok: false, reason: "bid_parity_failed" };
  }

  try {
    await pushKeysToCloud(
      [TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY],
      [leanBody, guard],
      { skipCloudFreshnessGate: true },
    );
  } catch {
    return { ok: false, reason: "push_failed" };
  }

  try {
    const [, readGuard] = await fetchKeysFromCloud([TENDERS_PIPELINE_KEY, TENDERS_PIPELINE_GUARD_KEY]);
    const verified = verifyTenderPipelineGuardWrite(readGuard, {
      bundleRevision: nextRevision,
      itemCount: guard.itemCount,
    });
    if (!verified.ok) {
      return { ok: false, reason: verified.reason };
    }
  } catch {
    return { ok: false, reason: "verify_read_failed" };
  }

  clearPipelineCloudUnconfirmed();
  return { ok: true, leanBytes, guardRevision: nextRevision };
}

/** Read migration rev from settings (additive). */
export function getPipelineMigrationRev(): number {
  const s = loadAppSettingsLocal();
  const n = (s as { pipelineCloudLeanMigrationRev?: number }).pipelineCloudLeanMigrationRev;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}
