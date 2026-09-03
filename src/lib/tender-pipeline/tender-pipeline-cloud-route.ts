/**
 * OD-OCR-29B — isolate kw-tenders-pipeline from generic raw cloud push.
 * Canonical write remains pushTenderPipelineToCloud (lean + guard + verify).
 */

import { TENDERS_PIPELINE_KEY } from "@/lib/tenders-sync";
import { TENDERS_PIPELINE_GUARD_KEY } from "@/lib/tender-pipeline/tender-pipeline-guard";

export function findTenderPipelinePushIndex(keys: readonly string[]): number {
  return keys.indexOf(TENDERS_PIPELINE_KEY);
}

export function findTenderPipelineGuardPushIndex(keys: readonly string[]): number {
  return keys.indexOf(TENDERS_PIPELINE_GUARD_KEY);
}

/** True when a generic push carries pipeline body without the guard pair. */
export function shouldRoutePipelinePushToCanonicalSeam(
  keys: readonly string[],
  opts?: {
    skipIntercept?: boolean;
    leanGuardEnabled?: boolean;
    migrationComplete?: boolean;
  },
): boolean {
  if (opts?.skipIntercept === true) return false;
  if (opts?.leanGuardEnabled === false) return false;
  if (opts?.migrationComplete === false) return false;
  const pipeIdx = keys.indexOf(TENDERS_PIPELINE_KEY);
  if (pipeIdx < 0) return false;
  return keys.indexOf(TENDERS_PIPELINE_GUARD_KEY) < 0;
}

export function extractUnguardedPipelineFromPushKeys(
  keys: string[],
  values: unknown[],
): {
  pipeline: unknown | undefined;
  otherKeys: string[];
  otherValues: unknown[];
  extracted: boolean;
} {
  const pipeIdx = keys.indexOf(TENDERS_PIPELINE_KEY);
  const guardIdx = keys.indexOf(TENDERS_PIPELINE_GUARD_KEY);
  if (pipeIdx < 0 || guardIdx >= 0) {
    return { pipeline: undefined, otherKeys: keys, otherValues: values, extracted: false };
  }
  return {
    pipeline: values[pipeIdx],
    otherKeys: keys.filter((_, i) => i !== pipeIdx),
    otherValues: values.filter((_, i) => i !== pipeIdx),
    extracted: true,
  };
}

export function asTenderPipelineItems(value: unknown): import("@/lib/tenders-bzp").TenderPipelineItem[] {
  return Array.isArray(value) ? value : [];
}
