/**
 * KL-7-P0 — local ↔ cloud merge for kw-knr-catalog (anti-wipe · fail-safe).
 * Cloud = storage SSOT for legal VERIFIED entries — NOT a new authority path.
 * ZERO PLN · ZERO auto-VERIFIED · ZERO KNR→KNR-W rewrite.
 */

import { buildKnrNormContentHash } from "./knr-content-hash";
import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import {
  hasVerifiedKnrCatalogEntries,
  isDestructiveKnrCatalogReplace,
  isEmptyKnrCatalogStore,
} from "./knr-catalog-authority";
import { isKnrCatalogEntryServable } from "./knr-catalog-lookup";
import {
  emptyKnrCatalogStore,
  normalizeKnrCatalogStore,
  rebuildKnrAliasIndex,
  type KnrCatalogStore,
} from "./knr-catalog-store";

export type KnrCatalogMergeConflict = {
  identityKeyV2: string;
  reason: "CONTENT_HASH_MISMATCH";
  localContentHash: string;
  cloudContentHash: string;
  /** Fail-safe keep — never drop a VERIFIED+ACTIVE without Owner review. */
  keptSide: "local" | "cloud";
};

export type KnrCatalogMergeResult = {
  store: KnrCatalogStore;
  conflicts: KnrCatalogMergeConflict[];
};

function entryContentHash(entry: KnrCatalogEntry): string {
  const h = String(entry.contentHash ?? "").trim();
  if (h) return h;
  return buildKnrNormContentHash(entry.norms);
}

function verificationRank(entry: KnrCatalogEntry): number {
  switch (entry.verificationStatus) {
    case "VERIFIED":
      return 100;
    case "STALE":
      return 90;
    case "PENDING_VERIFY":
      return 50;
    case "NORMATIVE":
      return 40;
    case "RESEARCHED":
      return 30;
    case "STRUCTURAL":
      return 20;
    default:
      return 0;
  }
}

function parseIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Same contentHash — prefer higher verification, then newer verifiedAt/updatedAt. */
function pickSameHashWinner(a: KnrCatalogEntry, b: KnrCatalogEntry): KnrCatalogEntry {
  const ra = verificationRank(a);
  const rb = verificationRank(b);
  if (ra !== rb) return ra >= rb ? a : b;
  const va = parseIsoMs(a.verifiedAt);
  const vb = parseIsoMs(b.verifiedAt);
  if (va !== vb) return va >= vb ? a : b;
  const ua = parseIsoMs(a.updatedAt);
  const ub = parseIsoMs(b.updatedAt);
  return ua >= ub ? a : b;
}

/**
 * Diff contentHash — never overwrite VERIFIED+ACTIVE with a different hash.
 * Prefer servable VERIFIED/STALE; if both servable conflicting → keep local (fail-safe).
 */
function pickConflictWinner(
  local: KnrCatalogEntry,
  cloud: KnrCatalogEntry,
): { entry: KnrCatalogEntry; keptSide: "local" | "cloud" } {
  const localServable = isKnrCatalogEntryServable(local);
  const cloudServable = isKnrCatalogEntryServable(cloud);
  if (localServable && !cloudServable) return { entry: local, keptSide: "local" };
  if (cloudServable && !localServable) return { entry: cloud, keptSide: "cloud" };
  if (localServable && cloudServable) {
    return { entry: local, keptSide: "local" };
  }
  // Neither servable — prefer higher verification rank, then newer updatedAt; local on tie.
  if (verificationRank(local) !== verificationRank(cloud)) {
    return verificationRank(local) >= verificationRank(cloud)
      ? { entry: local, keptSide: "local" }
      : { entry: cloud, keptSide: "cloud" };
  }
  const ua = parseIsoMs(local.updatedAt);
  const ub = parseIsoMs(cloud.updatedAt);
  if (ub > ua) return { entry: cloud, keptSide: "cloud" };
  return { entry: local, keptSide: "local" };
}

/**
 * Prefer non-empty / VERIFIED side when the other is empty (anti-wipe),
 * even if empty side has a newer store.updatedAt.
 */
export function preferAuthoritativeKnrCatalog(
  left: KnrCatalogStore,
  right: KnrCatalogStore,
): KnrCatalogStore | null {
  if (isDestructiveKnrCatalogReplace(left, right)) return right;
  if (isDestructiveKnrCatalogReplace(right, left)) return left;
  return null;
}

/**
 * Per-entry union merge · fail-safe on contentHash conflict · anti-wipe empty.
 */
export function mergeKnrCatalogStoreDetailed(
  local: unknown,
  cloud: unknown,
): KnrCatalogMergeResult {
  const left = normalizeKnrCatalogStore(local);
  const right = normalizeKnrCatalogStore(cloud);
  const conflicts: KnrCatalogMergeConflict[] = [];

  const authoritative = preferAuthoritativeKnrCatalog(left, right);
  if (authoritative) {
    // One side empty vs VERIFIED — take authoritative wholesale (no invent).
    return { store: authoritative, conflicts };
  }

  if (isEmptyKnrCatalogStore(left) && isEmptyKnrCatalogStore(right)) {
    return { store: emptyKnrCatalogStore(), conflicts };
  }

  const keys = new Set([
    ...Object.keys(left.entries),
    ...Object.keys(right.entries),
  ]);
  const entries: Record<string, KnrCatalogEntry> = {};

  for (const key of keys) {
    const localEntry = left.entries[key];
    const cloudEntry = right.entries[key];
    if (localEntry && !cloudEntry) {
      entries[key] = localEntry;
      continue;
    }
    if (cloudEntry && !localEntry) {
      entries[key] = cloudEntry;
      continue;
    }
    if (!localEntry || !cloudEntry) continue;

    const lh = entryContentHash(localEntry);
    const rh = entryContentHash(cloudEntry);
    if (lh === rh) {
      entries[key] = pickSameHashWinner(localEntry, cloudEntry);
      continue;
    }

    const picked = pickConflictWinner(localEntry, cloudEntry);
    entries[key] = picked.entry;
    conflicts.push({
      identityKeyV2: key,
      reason: "CONTENT_HASH_MISMATCH",
      localContentHash: lh,
      cloudContentHash: rh,
      keptSide: picked.keptSide,
    });
  }

  const tombstones = Array.from(
    new Set([...(left.tombstones ?? []), ...(right.tombstones ?? [])]),
  ).sort();

  const leftTs = parseIsoMs(left.updatedAt);
  const rightTs = parseIsoMs(right.updatedAt);
  const updatedAt =
    leftTs >= rightTs ? left.updatedAt || right.updatedAt : right.updatedAt || left.updatedAt;

  const store = normalizeKnrCatalogStore({
    schemaVersion: 1,
    updatedAt,
    etag: "",
    entries,
    aliasIndex: rebuildKnrAliasIndex(entries),
    tombstones,
  });

  return { store, conflicts };
}

/** cloud-sync `mergeDataKey` adapter — store only. */
export function mergeKnrCatalogStore(local: unknown, cloud: unknown): KnrCatalogStore {
  return mergeKnrCatalogStoreDetailed(local, cloud).store;
}

/**
 * Bootstrap / persist push gate — never push empty over VERIFIED cloud;
 * never push when merge would replace cloud VERIFIED with a different contentHash.
 */
export function shouldPushKnrCatalogToCloud(
  merged: unknown,
  cloudVal: unknown,
): boolean {
  const mergedStore = normalizeKnrCatalogStore(merged);
  if (isEmptyKnrCatalogStore(mergedStore)) return false;

  if (cloudVal == null) {
    return hasVerifiedKnrCatalogEntries(mergedStore) || !isEmptyKnrCatalogStore(mergedStore);
  }

  const cloudStore = normalizeKnrCatalogStore(cloudVal);
  if (isEmptyKnrCatalogStore(cloudStore)) {
    return !isEmptyKnrCatalogStore(mergedStore);
  }

  // Refuse push that would replace/drop cloud VERIFIED+ACTIVE with different hash / missing.
  for (const [key, cloudEntry] of Object.entries(cloudStore.entries)) {
    if (!isKnrCatalogEntryServable(cloudEntry)) continue;
    const next = mergedStore.entries[key];
    if (!next) return false;
    if (entryContentHash(next) !== entryContentHash(cloudEntry)) return false;
  }

  return JSON.stringify(mergedStore.entries) !== JSON.stringify(cloudStore.entries)
    || JSON.stringify(mergedStore.tombstones ?? []) !== JSON.stringify(cloudStore.tombstones ?? []);
}

export function preferAuthoritativeKnrCatalogOrNull(
  left: KnrCatalogStore,
  right: KnrCatalogStore,
): KnrCatalogStore | null {
  return preferAuthoritativeKnrCatalog(left, right);
}
