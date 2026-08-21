/**
 * KL-7-P2A — local ↔ cloud merge for kw-knr-discovery-evidence (anti-wipe · fail-safe).
 * Cloud = storage SSOT for discovery memory — NOT authority · NOT VERIFIED.
 */

import {
  emptyKnrDiscoveryEvidenceStore,
  hasActiveKnrDiscoveryEvidence,
  isDestructiveKnrDiscoveryReplace,
  isEmptyKnrDiscoveryEvidenceStore,
  normalizeKnrDiscoveryEvidenceStore,
  rebuildKnrDiscoveryIndexes,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
} from "./knr-discovery-evidence-types";

export type KnrDiscoveryMergeConflict = {
  evidenceKeyV1: string;
  reason: "CONTENT_HASH_MISMATCH" | "FAMILY_MISMATCH";
  localContentHash: string;
  cloudContentHash: string;
  keptSide: "local" | "cloud";
};

export type KnrDiscoveryMergeResult = {
  store: KnrDiscoveryEvidenceStore;
  conflicts: KnrDiscoveryMergeConflict[];
};

function parseIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function statusRank(s: KnrDiscoveryEvidenceRecord["discoveryStatus"]): number {
  switch (s) {
    case "READY_FOR_OWNER_VERIFY":
      return 50;
    case "CORROBORATED":
      return 40;
    case "DISCOVERED":
      return 30;
    case "INCOMPLETE":
      return 20;
    case "CONFLICT":
      return 10;
    default:
      return 0;
  }
}

function pickSameHash(
  a: KnrDiscoveryEvidenceRecord,
  b: KnrDiscoveryEvidenceRecord,
): KnrDiscoveryEvidenceRecord {
  const ra = statusRank(a.discoveryStatus);
  const rb = statusRank(b.discoveryStatus);
  if (ra !== rb) return ra >= rb ? a : b;
  return parseIsoMs(a.updatedAt) >= parseIsoMs(b.updatedAt) ? a : b;
}

function pickConflict(
  local: KnrDiscoveryEvidenceRecord,
  cloud: KnrDiscoveryEvidenceRecord,
): { entry: KnrDiscoveryEvidenceRecord; keptSide: "local" | "cloud" } {
  // Fail-safe: never drop non-empty local discovery memory on hash conflict.
  if (local.lifecycleState === "ACTIVE" && cloud.lifecycleState !== "ACTIVE") {
    return { entry: local, keptSide: "local" };
  }
  if (cloud.lifecycleState === "ACTIVE" && local.lifecycleState !== "ACTIVE") {
    return { entry: cloud, keptSide: "cloud" };
  }
  return { entry: local, keptSide: "local" };
}

export function mergeKnrDiscoveryEvidenceStoreDetailed(
  localRaw: unknown,
  cloudRaw: unknown,
): KnrDiscoveryMergeResult {
  const local = normalizeKnrDiscoveryEvidenceStore(localRaw);
  const cloud = normalizeKnrDiscoveryEvidenceStore(cloudRaw);

  if (isEmptyKnrDiscoveryEvidenceStore(cloud) && hasActiveKnrDiscoveryEvidence(local)) {
    return { store: local, conflicts: [] };
  }
  if (isEmptyKnrDiscoveryEvidenceStore(local) && hasActiveKnrDiscoveryEvidence(cloud)) {
    return { store: cloud, conflicts: [] };
  }
  if (isEmptyKnrDiscoveryEvidenceStore(local) && isEmptyKnrDiscoveryEvidenceStore(cloud)) {
    return { store: emptyKnrDiscoveryEvidenceStore(), conflicts: [] };
  }

  const keys = new Set([...Object.keys(local.entries), ...Object.keys(cloud.entries)]);
  const entries: Record<string, KnrDiscoveryEvidenceRecord> = {};
  const conflicts: KnrDiscoveryMergeConflict[] = [];

  for (const key of keys) {
    const L = local.entries[key];
    const C = cloud.entries[key];
    if (L && !C) {
      entries[key] = L;
      continue;
    }
    if (C && !L) {
      entries[key] = C;
      continue;
    }
    if (!L || !C) continue;

    const famL = String(L.family).trim().toUpperCase();
    const famC = String(C.family).trim().toUpperCase();
    if (famL && famC && famL !== famC) {
      const kept = pickConflict(L, C);
      entries[key] = {
        ...kept.entry,
        discoveryStatus: "CONFLICT",
      };
      conflicts.push({
        evidenceKeyV1: key,
        reason: "FAMILY_MISMATCH",
        localContentHash: L.contentHash,
        cloudContentHash: C.contentHash,
        keptSide: kept.keptSide,
      });
      continue;
    }

    if (L.contentHash === C.contentHash) {
      entries[key] = pickSameHash(L, C);
      continue;
    }

    const kept = pickConflict(L, C);
    entries[key] = kept.entry;
    conflicts.push({
      evidenceKeyV1: key,
      reason: "CONTENT_HASH_MISMATCH",
      localContentHash: L.contentHash,
      cloudContentHash: C.contentHash,
      keptSide: kept.keptSide,
    });
  }

  const updatedAt =
    parseIsoMs(local.updatedAt) >= parseIsoMs(cloud.updatedAt)
      ? local.updatedAt
      : cloud.updatedAt;
  const indexes = rebuildKnrDiscoveryIndexes(entries);
  const store = normalizeKnrDiscoveryEvidenceStore({
    schemaVersion: 1,
    updatedAt,
    etag: "",
    entries,
    ...indexes,
  });

  return { store, conflicts };
}

export function mergeKnrDiscoveryEvidenceStore(
  localRaw: unknown,
  cloudRaw: unknown,
): KnrDiscoveryEvidenceStore {
  return mergeKnrDiscoveryEvidenceStoreDetailed(localRaw, cloudRaw).store;
}

/**
 * Prefer not to push empty over non-empty cloud.
 * Prefer push when local richer / differs and not destructive.
 */
export function shouldPushKnrDiscoveryEvidenceToCloud(
  merged: unknown,
  cloudVal: unknown,
): boolean {
  const m = normalizeKnrDiscoveryEvidenceStore(merged);
  const c = normalizeKnrDiscoveryEvidenceStore(cloudVal);
  if (isDestructiveKnrDiscoveryReplace(m, c)) return false;
  if (isEmptyKnrDiscoveryEvidenceStore(m) && !isEmptyKnrDiscoveryEvidenceStore(c)) {
    return false;
  }
  if (isEmptyKnrDiscoveryEvidenceStore(m) && isEmptyKnrDiscoveryEvidenceStore(c)) {
    return false;
  }
  return JSON.stringify(m.entries) !== JSON.stringify(c.entries);
}

export const KNR_DISCOVERY_MERGE_P2A_IMPLEMENTED = true as const;
