/**
 * WORK-CATALOG-MIGRATION-SAFETY-01 — identity of an authoritative Work Catalog
 * vs a legacy-synthetic-only fallback (P1.5 `legacy-{category}-{unit}` IDs).
 *
 * No hardcoded work counts. Empty ≠ synthetic-only.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export const LEGACY_SYNTHETIC_WORK_ID_PREFIX = "legacy-";

export type WorkCatalogPersistBlockReason = "destructive_catalog_replace";

export class WorkCatalogDestructivePersistError extends Error {
  readonly code: WorkCatalogPersistBlockReason = "destructive_catalog_replace";

  constructor(message = "Refusing to persist a legacy-synthetic or empty catalog over an authoritative work catalog") {
    super(message);
    this.name = "WorkCatalogDestructivePersistError";
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

/**
 * Candidate would wipe an authoritative catalog with empty or legacy-synthetic-only payload.
 * Legitimate Owner shrink of custom works stays allowed (candidate remains authoritative).
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
