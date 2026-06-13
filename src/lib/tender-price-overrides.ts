/**
 * P3.5B — nadpisania cen per przetarg (bez zmiany globalnej Bazy cen).
 */

import type { WgdomCostCategoryId, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";

export const TENDER_PRICE_OVERRIDES_KEY = "kw-tender-price-overrides";

export type TenderPriceOverrideType = "material" | "labor";

export interface TenderPriceOverrideEntry {
  categoryId: WgdomCostCategoryId;
  priceType: TenderPriceOverrideType;
  unit: WgdomCostUnit;
  overridePlnPerUnit: number;
  updatedAt: string;
}

export interface TenderPriceOverrides {
  tenderId: string;
  overrides: TenderPriceOverrideEntry[];
  updatedAt: string;
}

export interface TenderPriceOverridesStore {
  schemaVersion: 1;
  byTenderId: Record<string, TenderPriceOverrides>;
  updatedAt: string;
}

export interface TenderPriceOverrideLookup {
  material: Map<string, number>;
  labor: Map<string, number>;
}

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function overrideKey(categoryId: WgdomCostCategoryId, unit: WgdomCostUnit): string {
  return `${categoryId}:${unit}`;
}

export function defaultTenderPriceOverridesStore(): TenderPriceOverridesStore {
  return {
    schemaVersion: 1,
    byTenderId: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeTenderPriceOverridesStore(raw: unknown): TenderPriceOverridesStore {
  const base = defaultTenderPriceOverridesStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TenderPriceOverridesStore>;
  const byTenderId: Record<string, TenderPriceOverrides> = {};

  if (r.byTenderId && typeof r.byTenderId === "object") {
    for (const [tenderId, val] of Object.entries(r.byTenderId)) {
      if (!val || typeof val !== "object") continue;
      const v = val as Partial<TenderPriceOverrides>;
      const overrides: TenderPriceOverrideEntry[] = [];
      if (Array.isArray(v.overrides)) {
        for (const o of v.overrides) {
          if (!o || typeof o !== "object") continue;
          const entry = o as Partial<TenderPriceOverrideEntry>;
          const categoryId = entry.categoryId as WgdomCostCategoryId;
          if (!WGDOM_COST_CATEGORY_IDS.includes(categoryId)) continue;
          if (entry.priceType !== "material" && entry.priceType !== "labor") continue;
          const unit = entry.unit as WgdomCostUnit;
          if (!["m2", "mb", "szt", "rbh", "m3"].includes(unit)) continue;
          const price = Number(entry.overridePlnPerUnit);
          if (!Number.isFinite(price) || price < 0) continue;
          overrides.push({
            categoryId,
            priceType: entry.priceType,
            unit,
            overridePlnPerUnit: price,
            updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
          });
        }
      }
      byTenderId[tenderId] = {
        tenderId,
        overrides,
        updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
      };
    }
  }

  return {
    schemaVersion: 1,
    byTenderId,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export function mergeTenderPriceOverridesStore(local: unknown, cloud: unknown): TenderPriceOverridesStore {
  const l = normalizeTenderPriceOverridesStore(local);
  const c = normalizeTenderPriceOverridesStore(cloud);
  const byTenderId: Record<string, TenderPriceOverrides> = { ...c.byTenderId };

  for (const [tenderId, localTender] of Object.entries(l.byTenderId)) {
    const cloudTender = c.byTenderId[tenderId];
    if (!cloudTender || ts(localTender.updatedAt) >= ts(cloudTender.updatedAt)) {
      byTenderId[tenderId] = localTender;
    }
  }

  const lTs = ts(l.updatedAt);
  const cTs = ts(c.updatedAt);
  return {
    schemaVersion: 1,
    byTenderId,
    updatedAt: lTs >= cTs ? l.updatedAt : c.updatedAt,
  };
}

export function loadTenderPriceOverridesStoreLocal(): TenderPriceOverridesStore {
  try {
    const raw = localStorage.getItem(TENDER_PRICE_OVERRIDES_KEY);
    if (!raw) return defaultTenderPriceOverridesStore();
    return normalizeTenderPriceOverridesStore(JSON.parse(raw));
  } catch {
    return defaultTenderPriceOverridesStore();
  }
}

export async function loadTenderPriceOverridesStore(): Promise<TenderPriceOverridesStore> {
  try {
    const local = loadTenderPriceOverridesStoreLocal();
    const { fetchKeysFromCloud } = await import("@/lib/cloud-sync");
    const [cloud] = await fetchKeysFromCloud([TENDER_PRICE_OVERRIDES_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeTenderPriceOverridesStore(local, cloud);
    try {
      localStorage.setItem(TENDER_PRICE_OVERRIDES_KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
    return merged;
  } catch {
    return loadTenderPriceOverridesStoreLocal();
  }
}

export async function saveTenderPriceOverridesStore(store: TenderPriceOverridesStore): Promise<void> {
  const next: TenderPriceOverridesStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(TENDER_PRICE_OVERRIDES_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  const { persistKey } = await import("@/lib/cloud-sync");
  await persistKey(TENDER_PRICE_OVERRIDES_KEY, next);
}

export function getTenderPriceOverrides(
  store: TenderPriceOverridesStore,
  tenderId: string,
): TenderPriceOverrides {
  return store.byTenderId[tenderId] ?? {
    tenderId,
    overrides: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function buildTenderPriceOverrideLookup(
  entries: TenderPriceOverrideEntry[] | null | undefined,
): TenderPriceOverrideLookup | null {
  if (!entries?.length) return null;
  const material = new Map<string, number>();
  const labor = new Map<string, number>();
  for (const e of entries) {
    const key = overrideKey(e.categoryId, e.unit);
    if (e.priceType === "material") material.set(key, e.overridePlnPerUnit);
    else labor.set(key, e.overridePlnPerUnit);
  }
  return { material, labor };
}

export function upsertTenderPriceOverride(
  store: TenderPriceOverridesStore,
  tenderId: string,
  entry: Omit<TenderPriceOverrideEntry, "updatedAt">,
): TenderPriceOverridesStore {
  const current = getTenderPriceOverrides(store, tenderId);
  const now = new Date().toISOString();
  const without = current.overrides.filter(
    (o) => !(o.categoryId === entry.categoryId && o.priceType === entry.priceType && o.unit === entry.unit),
  );
  const overrides = [
    ...without,
    { ...entry, updatedAt: now },
  ];
  return {
    schemaVersion: 1,
    byTenderId: {
      ...store.byTenderId,
      [tenderId]: { tenderId, overrides, updatedAt: now },
    },
    updatedAt: now,
  };
}

export function removeTenderPriceOverride(
  store: TenderPriceOverridesStore,
  tenderId: string,
  categoryId: WgdomCostCategoryId,
  priceType: TenderPriceOverrideType,
  unit: WgdomCostUnit,
): TenderPriceOverridesStore {
  const current = getTenderPriceOverrides(store, tenderId);
  const now = new Date().toISOString();
  const overrides = current.overrides.filter(
    (o) => !(o.categoryId === categoryId && o.priceType === priceType && o.unit === unit),
  );
  return {
    schemaVersion: 1,
    byTenderId: {
      ...store.byTenderId,
      [tenderId]: { tenderId, overrides, updatedAt: now },
    },
    updatedAt: now,
  };
}

export function findTenderPriceOverride(
  entries: TenderPriceOverrideEntry[],
  categoryId: WgdomCostCategoryId,
  priceType: TenderPriceOverrideType,
  unit: WgdomCostUnit,
): TenderPriceOverrideEntry | null {
  return entries.find(
    (o) => o.categoryId === categoryId && o.priceType === priceType && o.unit === unit,
  ) ?? null;
}
