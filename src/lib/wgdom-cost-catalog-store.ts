/**
 * P2-G.1C — persystencja WGDOM Cost Catalog (localStorage + chmura).
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import {
  defaultWgdomCostCatalog,
  defaultWgdomCostCatalogStore,
  type WgdomCostCatalog,
  type WgdomCostCatalogStore,
  type WgdomCostCategoryId,
  type WgdomCostRegion,
  type WgdomCostUnit,
  WGDOM_COST_CATEGORY_IDS,
} from "@/lib/wgdom-cost-catalog";

export const WGDOM_COST_CATALOG_KEY = "kw-wgdom-cost-catalog";

export { WGDOM_COST_REGION_LABELS } from "@/lib/wgdom-cost-catalog";

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function getActiveCatalog(store: WgdomCostCatalogStore): WgdomCostCatalog {
  return store.catalogs[store.activeRegion] ?? defaultWgdomCostCatalog(store.activeRegion);
}

export function normalizeWgdomCostCatalogStore(raw: unknown): WgdomCostCatalogStore {
  const base = defaultWgdomCostCatalogStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<WgdomCostCatalogStore>;
  const activeRegion: WgdomCostRegion =
    r.activeRegion === "dolnyslask" ? "dolnyslask" : "wroclaw";

  const normalizeCatalog = (region: WgdomCostRegion, src: unknown): WgdomCostCatalog => {
    const def = defaultWgdomCostCatalog(region);
    if (!src || typeof src !== "object") return def;
    const c = src as Partial<WgdomCostCatalog>;
    const categories = def.categories.map((defCat) => {
      const incoming = Array.isArray(c.categories)
        ? c.categories.find((x) => x && typeof x === "object" && (x as { id?: string }).id === defCat.id)
        : null;
      if (!incoming || typeof incoming !== "object") return defCat;
      const inc = incoming as Partial<typeof defCat>;
      const rates = defCat.rates.map((defRate) => {
        const incRate = Array.isArray(inc.rates)
          ? inc.rates.find((x) => x && typeof x === "object" && (x as { unit?: string }).unit === defRate.unit)
          : null;
        if (!incRate || typeof incRate !== "object") return defRate;
        const ir = incRate as { materialPlnPerUnit?: number; laborRbhPerUnit?: number };
        return {
          unit: defRate.unit,
          materialPlnPerUnit: Number.isFinite(ir.materialPlnPerUnit) ? ir.materialPlnPerUnit! : defRate.materialPlnPerUnit,
          laborRbhPerUnit: Number.isFinite(ir.laborRbhPerUnit) ? ir.laborRbhPerUnit! : defRate.laborRbhPerUnit,
        };
      });
      return {
        ...defCat,
        rates,
        keywords: Array.isArray(inc.keywords) && inc.keywords.length > 0
          ? inc.keywords.map(String)
          : defCat.keywords,
      };
    });
    return {
      schemaVersion: 1,
      region,
      regionMultiplier: region === "dolnyslask" ? 0.92 : 1.0,
      categories,
      unknownFallback: def.unknownFallback,
      updatedAt: typeof c.updatedAt === "string" ? c.updatedAt : def.updatedAt,
    };
  };

  const catalogsRaw = r.catalogs && typeof r.catalogs === "object" ? r.catalogs as Record<string, unknown> : {};
  return {
    schemaVersion: 1,
    activeRegion,
    catalogs: {
      wroclaw: normalizeCatalog("wroclaw", catalogsRaw.wroclaw),
      dolnyslask: normalizeCatalog("dolnyslask", catalogsRaw.dolnyslask),
    },
    updatedAt: typeof (r as { updatedAt?: string }).updatedAt === "string"
      ? (r as { updatedAt: string }).updatedAt
      : new Date().toISOString(),
  };
}

export function mergeWgdomCostCatalogStore(local: unknown, cloud: unknown): WgdomCostCatalogStore {
  const l = normalizeWgdomCostCatalogStore(local);
  const c = normalizeWgdomCostCatalogStore(cloud);
  const lTs = ts(l.updatedAt);
  const cTs = ts(c.updatedAt);
  if (cTs === 0 && lTs === 0) return l;
  if (lTs >= cTs) return l;
  return c;
}

export function loadWgdomCostCatalogStoreLocal(): WgdomCostCatalogStore {
  try {
    const raw = localStorage.getItem(WGDOM_COST_CATALOG_KEY);
    if (!raw) return defaultWgdomCostCatalogStore();
    return normalizeWgdomCostCatalogStore(JSON.parse(raw));
  } catch {
    return defaultWgdomCostCatalogStore();
  }
}

export async function loadWgdomCostCatalogStore(): Promise<WgdomCostCatalogStore> {
  try {
    const local = loadWgdomCostCatalogStoreLocal();
    const [cloud] = await fetchKeysFromCloud([WGDOM_COST_CATALOG_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeWgdomCostCatalogStore(local, cloud);
    localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return loadWgdomCostCatalogStoreLocal();
  }
}

export async function saveWgdomCostCatalogStore(store: WgdomCostCatalogStore): Promise<void> {
  const next: WgdomCostCatalogStore = {
    ...store,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    catalogs: {
      wroclaw: { ...store.catalogs.wroclaw, updatedAt: new Date().toISOString() },
      dolnyslask: { ...store.catalogs.dolnyslask, updatedAt: new Date().toISOString() },
    },
  };
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(next));
  await persistKey(WGDOM_COST_CATALOG_KEY, next);
}

export function restoreDefaultWgdomCostCatalogStore(): WgdomCostCatalogStore {
  return defaultWgdomCostCatalogStore();
}

export function setActiveCatalogRegion(
  store: WgdomCostCatalogStore,
  region: WgdomCostRegion,
): WgdomCostCatalogStore {
  return { ...store, activeRegion: region };
}

export function updateCategoryPrimaryRates(
  store: WgdomCostCatalogStore,
  categoryId: WgdomCostCategoryId,
  materialPlnPerUnit: number,
  laborRbhPerUnit: number,
  region?: WgdomCostRegion,
): WgdomCostCatalogStore {
  const targetRegion = region ?? store.activeRegion;
  const catalog = store.catalogs[targetRegion];
  if (!catalog) return store;
  const categories = catalog.categories.map((cat) => {
    if (cat.id !== categoryId) return cat;
    const primaryUnit = cat.rates[0]?.unit ?? "m2";
    const rates = cat.rates.map((rate, idx) => {
      if (idx !== 0 && rate.unit !== primaryUnit) return rate;
      return {
        ...rate,
        materialPlnPerUnit: Math.max(0, materialPlnPerUnit),
        laborRbhPerUnit: Math.max(0, laborRbhPerUnit),
      };
    });
    if (rates.length === 0) {
      rates.push({
        unit: primaryUnit as WgdomCostUnit,
        materialPlnPerUnit: Math.max(0, materialPlnPerUnit),
        laborRbhPerUnit: Math.max(0, laborRbhPerUnit),
      });
    }
    return { ...cat, rates };
  });
  return {
    ...store,
    catalogs: {
      ...store.catalogs,
      [targetRegion]: { ...catalog, categories },
    },
  };
}

export function listEditableCategories(store: WgdomCostCatalogStore, region?: WgdomCostRegion) {
  const catalog = region ? store.catalogs[region] : getActiveCatalog(store);
  return WGDOM_COST_CATEGORY_IDS.map((id) => {
    const cat = catalog.categories.find((c) => c.id === id);
    const primary = cat?.rates[0];
    return {
      id,
      labelPl: cat?.labelPl ?? id,
      unit: primary?.unit ?? "m2",
      materialPlnPerUnit: primary?.materialPlnPerUnit ?? 0,
      laborRbhPerUnit: primary?.laborRbhPerUnit ?? 0,
    };
  });
}
