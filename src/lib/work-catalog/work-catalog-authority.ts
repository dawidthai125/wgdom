/**
 * WORK-CATALOG-MIGRATION-SAFETY-01 — identity of an authoritative Work Catalog
 * vs a legacy-synthetic-only fallback (P1.5 `legacy-{category}-{unit}` IDs).
 *
 * No hardcoded work counts. Empty ≠ synthetic-only.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export const LEGACY_SYNTHETIC_WORK_ID_PREFIX = "legacy-";

export type WorkCatalogPersistBlockReason = "destructive_catalog_replace";
export type WorkCatalogShrinkBlockReason = "catalog_shrink_rejected";

export class WorkCatalogDestructivePersistError extends Error {
  readonly code: WorkCatalogPersistBlockReason = "destructive_catalog_replace";

  constructor(message = "Refusing to persist a legacy-synthetic or empty catalog over an authoritative work catalog") {
    super(message);
    this.name = "WorkCatalogDestructivePersistError";
  }
}

/**
 * P0 shrink guard — removal of authoritative workIds without an explicit tombstone/delete SSOT.
 * There is currently NO `deletedWorkIds[]` / tombstone mechanism for catalog works;
 * default policy is fail-closed on any authoritative id loss vs cloud baseline.
 */
export class WorkCatalogShrinkRejectedError extends Error {
  readonly code: WorkCatalogShrinkBlockReason = "catalog_shrink_rejected";
  readonly removedWorkIds: readonly string[];

  constructor(removedWorkIds: string[]) {
    super(
      `Refusing catalog shrink: ${removedWorkIds.length} authoritative workId(s) removed without tombstone SSOT`,
    );
    this.name = "WorkCatalogShrinkRejectedError";
    this.removedWorkIds = removedWorkIds;
  }
}

export function isLegacySyntheticWorkId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(LEGACY_SYNTHETIC_WORK_ID_PREFIX);
}

export function listAllCatalogWorks(store: WorkCatalogStore | null | undefined): CatalogWork[] {
  if (!store?.catalogs) return [];
  return [
    ...(store.catalogs.wroclaw?.works ?? []),
    ...(store.catalogs.dolnyslask?.works ?? []),
  ];
}

export function isEmptyWorkCatalogStore(store: WorkCatalogStore | null | undefined): boolean {
  return listAllCatalogWorks(store).length === 0;
}

/** Every work ID is P1.5 synthetic `legacy-*`. Empty store is not synthetic-only. */
export function isLegacySyntheticOnlyStore(store: WorkCatalogStore | null | undefined): boolean {
  const works = listAllCatalogWorks(store);
  if (works.length === 0) return false;
  return works.every((work) => isLegacySyntheticWorkId(work.id));
}

/** At least one work whose id is not a P1.5 synthetic `legacy-*` (custom / seed-manifest / copied). */
export function isAuthoritativeWorkCatalogStore(store: WorkCatalogStore | null | undefined): boolean {
  return listAllCatalogWorks(store).some((work) => !isLegacySyntheticWorkId(work.id));
}

export function listAuthoritativeWorkIds(store: WorkCatalogStore | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const work of listAllCatalogWorks(store)) {
    if (!isLegacySyntheticWorkId(work.id)) ids.add(work.id);
  }
  return ids;
}

export function countCatalogWorks(store: WorkCatalogStore | null | undefined): number {
  return listAllCatalogWorks(store).length;
}

/** Authoritative workIds present in baseline but absent in candidate. */
export function findRemovedAuthoritativeWorkIds(
  baseline: WorkCatalogStore | null | undefined,
  candidate: WorkCatalogStore | null | undefined,
): string[] {
  const baseIds = listAuthoritativeWorkIds(baseline);
  const candIds = listAuthoritativeWorkIds(candidate);
  return [...baseIds].filter((id) => !candIds.has(id));
}

/**
 * Fail-closed shrink guard (P0). Preserves empty/legacy-synthetic guards via
 * `isDestructiveWorkCatalogReplace`.
 */
export function assertWorkCatalogShrinkAllowed(
  baseline: WorkCatalogStore | null | undefined,
  candidate: WorkCatalogStore | null | undefined,
): void {
  if (isDestructiveWorkCatalogReplace(candidate, baseline)) {
    throw new WorkCatalogDestructivePersistError();
  }
  const removed = findRemovedAuthoritativeWorkIds(baseline, candidate);
  if (removed.length > 0) {
    throw new WorkCatalogShrinkRejectedError(removed);
  }
}

/**
 * Candidate would wipe an authoritative catalog with empty or legacy-synthetic-only payload.
 * P0: authoritative shrink without tombstone is handled by `assertWorkCatalogShrinkAllowed`.
 */
export function isDestructiveWorkCatalogReplace(
  candidate: WorkCatalogStore | null | undefined,
  baseline: WorkCatalogStore | null | undefined,
): boolean {
  if (!isAuthoritativeWorkCatalogStore(baseline)) return false;
  if (isEmptyWorkCatalogStore(candidate)) return true;
  if (isLegacySyntheticOnlyStore(candidate)) return true;
  return false;
}

/**
 * Merge helper: never let empty / legacy-synthetic-only win over an authoritative catalog,
 * even when its `updatedAt` is newer.
 */
export function preferAuthoritativeWorkCatalog(
  left: WorkCatalogStore,
  right: WorkCatalogStore,
): WorkCatalogStore | null {
  if (isDestructiveWorkCatalogReplace(left, right)) return right;
  if (isDestructiveWorkCatalogReplace(right, left)) return left;
  return null;
}
