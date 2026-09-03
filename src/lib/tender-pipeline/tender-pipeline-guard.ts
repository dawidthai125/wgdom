/**
 * OD-OCR-25 — kw-tenders-pipeline-guard schema v1 + ikFinalBid parity.
 */

import type { IkG3FinalBidRecord } from "@/lib/intelligent-estimator/ik-g3-final-bid";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { getDeletedTenderIds } from "@/lib/tenders-sync";

export const TENDERS_PIPELINE_GUARD_KEY = "kw-tenders-pipeline-guard";

export const PIPELINE_GUARD_SCHEMA_VERSION = 1 as const;

export interface TenderPipelineGuardItem {
  id: string;
  updatedAt: string;
  ikFinalBid: IkG3FinalBidRecord | null;
}

export interface TenderPipelineGuardV1 {
  schemaVersion: typeof PIPELINE_GUARD_SCHEMA_VERSION;
  bundleRevision: number;
  bundleAt: string;
  itemCount: number;
  deletedIdsRevision: string;
  items: TenderPipelineGuardItem[];
}

export function computeDeletedIdsRevision(deletedIds: string[]): string {
  const sorted = [...deletedIds].map(String).filter(Boolean).sort();
  return `${sorted.length}:${sorted.join(",")}`;
}

export function ikFinalBidDeepEqual(
  a: IkG3FinalBidRecord | null | undefined,
  b: IkG3FinalBidRecord | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Build guard snapshot from active (non-tombstoned) pipeline body items. */
export function buildTenderPipelineGuard(
  bodyItems: TenderPipelineItem[],
  opts: {
    bundleRevision: number;
    bundleAt: string;
    deletedIds?: string[];
  },
): TenderPipelineGuardV1 {
  const deleted = new Set((opts.deletedIds ?? getDeletedTenderIds()).map(String));
  const active = bodyItems.filter((i) => i?.id && !deleted.has(String(i.id)));
  const items: TenderPipelineGuardItem[] = active
    .map((item) => ({
      id: String(item.id),
      updatedAt: String(item.updatedAt ?? ""),
      ikFinalBid: item.ikFinalBid ?? null,
    }))
    .sort((x, y) => x.id.localeCompare(y.id));

  return {
    schemaVersion: PIPELINE_GUARD_SCHEMA_VERSION,
    bundleRevision: opts.bundleRevision,
    bundleAt: opts.bundleAt,
    itemCount: items.length,
    deletedIdsRevision: computeDeletedIdsRevision([...deleted]),
    items,
  };
}

export function parseTenderPipelineGuard(raw: unknown): TenderPipelineGuardV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as TenderPipelineGuardV1;
  if (g.schemaVersion !== PIPELINE_GUARD_SCHEMA_VERSION) return null;
  if (!Number.isFinite(g.bundleRevision) || g.bundleRevision < 0) return null;
  if (!Array.isArray(g.items)) return null;
  return g;
}

export type PipelineGuardBodyParityResult =
  | { ok: true }
  | { ok: false; mismatches: Array<{ id: string; field: "ikFinalBid" }> };

/** Verify body ikFinalBid matches guard items (pre-push gate). */
export function verifyPipelineBodyGuardIkFinalBidParity(
  bodyItems: TenderPipelineItem[],
  guard: TenderPipelineGuardV1,
): PipelineGuardBodyParityResult {
  const deleted = new Set(getDeletedTenderIds().map(String));
  const bodyById = new Map<string, TenderPipelineItem>();
  for (const item of bodyItems) {
    if (!item?.id || deleted.has(String(item.id))) continue;
    bodyById.set(String(item.id), item);
  }

  const mismatches: Array<{ id: string; field: "ikFinalBid" }> = [];
  for (const gi of guard.items) {
    const body = bodyById.get(gi.id);
    if (!body) {
      mismatches.push({ id: gi.id, field: "ikFinalBid" });
      continue;
    }
    if (!ikFinalBidDeepEqual(body.ikFinalBid ?? null, gi.ikFinalBid)) {
      mismatches.push({ id: gi.id, field: "ikFinalBid" });
    }
  }
  if (guard.itemCount !== bodyById.size) {
    for (const id of bodyById.keys()) {
      if (!guard.items.some((g) => g.id === id)) {
        mismatches.push({ id, field: "ikFinalBid" });
      }
    }
  }
  return mismatches.length === 0 ? { ok: true } : { ok: false, mismatches };
}

export type PipelineGuardVerifyResult =
  | { ok: true; guard: TenderPipelineGuardV1 }
  | { ok: false; reason: string };

/** Post-write verify — expected revision + itemCount. */
export function verifyTenderPipelineGuardWrite(
  readBack: unknown,
  expected: { bundleRevision: number; itemCount: number },
): PipelineGuardVerifyResult {
  const guard = parseTenderPipelineGuard(readBack);
  if (!guard) return { ok: false, reason: "guard_parse_failed" };
  if (guard.bundleRevision !== expected.bundleRevision) {
    return { ok: false, reason: `revision_mismatch:${guard.bundleRevision}!=${expected.bundleRevision}` };
  }
  if (guard.itemCount !== expected.itemCount) {
    return { ok: false, reason: `item_count_mismatch:${guard.itemCount}!=${expected.itemCount}` };
  }
  return { ok: true, guard };
}

export function estimateGuardJsonBytes(guard: TenderPipelineGuardV1): number {
  try {
    return new TextEncoder().encode(JSON.stringify(guard)).length;
  } catch {
    return JSON.stringify(guard).length * 2;
  }
}
