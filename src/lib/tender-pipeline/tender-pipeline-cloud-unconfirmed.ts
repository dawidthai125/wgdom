/**
 * OD-OCR-25 — pipeline cloud unconfirmed / reconciliation session state.
 */

import { markCloudFreshnessUnconfirmed } from "@/lib/cloud-freshness-gate";

const LS_UNCONFIRMED = "wg-pipeline-cloud-unconfirmed-v1";

/** In-memory fallback when sessionStorage unavailable (vite-node tests). */
let memUnconfirmed: { at: number; reason: string } | null = null;

function writeUnconfirmed(reason: string): void {
  memUnconfirmed = { at: Date.now(), reason };
  try {
    sessionStorage.setItem(LS_UNCONFIRMED, JSON.stringify(memUnconfirmed));
  } catch {
    /* ignore — mem fallback active */
  }
}

export function markPipelineCloudUnconfirmed(reason: string): void {
  writeUnconfirmed(reason);
  markCloudFreshnessUnconfirmed("reconcile_fail");
}

export function clearPipelineCloudUnconfirmed(): void {
  memUnconfirmed = null;
  try {
    sessionStorage.removeItem(LS_UNCONFIRMED);
  } catch {
    /* ignore */
  }
}

export function isPipelineCloudWriteUnconfirmed(): boolean {
  if (memUnconfirmed != null) return true;
  try {
    return sessionStorage.getItem(LS_UNCONFIRMED) != null;
  } catch {
    return memUnconfirmed != null;
  }
}

export function getPipelineCloudUnconfirmedReason(): string | null {
  if (memUnconfirmed?.reason) return memUnconfirmed.reason;
  try {
    const raw = sessionStorage.getItem(LS_UNCONFIRMED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { reason?: string };
    return parsed.reason ?? "unknown";
  } catch {
    return memUnconfirmed?.reason ?? null;
  }
}
