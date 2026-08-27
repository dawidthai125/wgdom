/**
 * WORK-CATALOG-P0 — optimistic concurrency meta (mirror kw-payroll-week-meta).
 */

export const WORK_CATALOG_META_KEY = "kw-wgdom-work-catalog-meta";

export type WorkCatalogMeta = {
  catalogRevision: number;
  updatedAt: number;
};

export function normalizeWorkCatalogMeta(raw: unknown): WorkCatalogMeta {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const rev =
      typeof o.catalogRevision === "number" && Number.isFinite(o.catalogRevision)
        ? Math.max(0, Math.floor(o.catalogRevision))
        : 0;
    const ua =
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now();
    return { catalogRevision: rev, updatedAt: ua };
  }
  return { catalogRevision: 0, updatedAt: Date.now() };
}

export function readWorkCatalogMetaFromLs(): WorkCatalogMeta | null {
  try {
    const raw = localStorage.getItem(WORK_CATALOG_META_KEY);
    if (!raw) return null;
    return normalizeWorkCatalogMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeWorkCatalogMetaToLs(meta: WorkCatalogMeta): void {
  try {
    localStorage.setItem(WORK_CATALOG_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore quota */
  }
}

export function getExpectedWorkCatalogRevision(): number {
  return readWorkCatalogMetaFromLs()?.catalogRevision ?? 0;
}

export function buildWorkCatalogMetaPlaceholder(): WorkCatalogMeta {
  return readWorkCatalogMetaFromLs() ?? normalizeWorkCatalogMeta(null);
}
