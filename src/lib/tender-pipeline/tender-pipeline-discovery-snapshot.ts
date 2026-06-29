/**
 * NG-02.1B — dev-only discovery telemetry (ring buffer, bez PII).
 */

import type { TenderFullDiscoveryMeta } from "@/lib/tender-pipeline/tender-full-document-discovery";

export type DiscoverySnapshotEntry = TenderFullDiscoveryMeta & {
  at: string;
  itemId: string;
};

const MAX_ENTRIES = 30;
const snapshotsByItemId = new Map<string, DiscoverySnapshotEntry[]>();

export function isDiscoverySnapshotEnabled(): boolean {
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}

export function recordDiscoverySnapshot(
  itemId: string,
  meta: TenderFullDiscoveryMeta,
): void {
  if (!isDiscoverySnapshotEnabled()) return;
  const row: DiscoverySnapshotEntry = {
    ...meta,
    at: new Date().toISOString(),
    itemId,
  };
  const prev = snapshotsByItemId.get(itemId) ?? [];
  const next = [...prev, row];
  if (next.length > MAX_ENTRIES) {
    next.splice(0, next.length - MAX_ENTRIES);
  }
  snapshotsByItemId.set(itemId, next);
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[wgdom:discovery-snapshot]", row);
  }
}

export function readDiscoverySnapshots(itemId: string): DiscoverySnapshotEntry[] {
  return snapshotsByItemId.get(itemId) ?? [];
}

export function resetDiscoverySnapshotsForTests(): void {
  snapshotsByItemId.clear();
}
