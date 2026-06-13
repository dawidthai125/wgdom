/**
 * P3.3B — historia stawek robocizny Bazy cen (snapshots przy zapisie).
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  getActiveCatalog,
  listEditableCategories,
  type WgdomCostCatalogStore,
} from "@/lib/wgdom-cost-catalog-store";
import type { WgdomCostCategoryId, WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const WGDOM_COST_CATALOG_HISTORY_KEY = "kw-wgdom-cost-catalog-history";

export const COST_CATALOG_HISTORY_MAX_SNAPSHOTS = 100;

export interface CostCatalogLaborRateEntry {
  categoryId: WgdomCostCategoryId;
  unit: WgdomCostUnit;
  laborRbhPerUnit: number;
  laborPlnPerUnit: number;
}

export interface CostCatalogLaborSnapshot {
  at: string;
  region: WgdomCostRegion;
  rates: CostCatalogLaborRateEntry[];
}

export interface WgdomCostCatalogHistoryStore {
  schemaVersion: 1;
  snapshots: CostCatalogLaborSnapshot[];
  updatedAt: string;
}

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function defaultWgdomCostCatalogHistoryStore(): WgdomCostCatalogHistoryStore {
  return {
    schemaVersion: 1,
    snapshots: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function normalizeSnapshot(raw: unknown): CostCatalogLaborSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<CostCatalogLaborSnapshot>;
  if (typeof s.at !== "string" || !s.at) return null;
  const region: WgdomCostRegion = s.region === "dolnyslask" ? "dolnyslask" : "wroclaw";
  const rates: CostCatalogLaborRateEntry[] = [];
  if (Array.isArray(s.rates)) {
    for (const r of s.rates) {
      if (!r || typeof r !== "object") continue;
      const entry = r as Partial<CostCatalogLaborRateEntry>;
      if (typeof entry.categoryId !== "string") continue;
      const unit = entry.unit as WgdomCostUnit;
      if (!["m2", "mb", "szt", "rbh", "m3", "kpl"].includes(unit)) continue;
      const laborRbh = Number(entry.laborRbhPerUnit);
      const laborPln = Number(entry.laborPlnPerUnit);
      if (!Number.isFinite(laborRbh) || laborRbh < 0) continue;
      if (!Number.isFinite(laborPln) || laborPln < 0) continue;
      rates.push({
        categoryId: entry.categoryId as WgdomCostCategoryId,
        unit,
        laborRbhPerUnit: laborRbh,
        laborPlnPerUnit: laborPln,
      });
    }
  }
  if (rates.length === 0) return null;
  return { at: s.at, region, rates };
}

export function normalizeWgdomCostCatalogHistoryStore(raw: unknown): WgdomCostCatalogHistoryStore {
  const base = defaultWgdomCostCatalogHistoryStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<WgdomCostCatalogHistoryStore>;
  const snapshots: CostCatalogLaborSnapshot[] = [];
  if (Array.isArray(r.snapshots)) {
    for (const s of r.snapshots) {
      const norm = normalizeSnapshot(s);
      if (norm) snapshots.push(norm);
    }
  }
  snapshots.sort((a, b) => ts(b.at) - ts(a.at));
  return {
    schemaVersion: 1,
    snapshots: snapshots.slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
}

function snapshotKey(s: CostCatalogLaborSnapshot): string {
  return `${s.at}|${s.region}`;
}

export function mergeWgdomCostCatalogHistoryStore(
  local: unknown,
  cloud: unknown,
): WgdomCostCatalogHistoryStore {
  const l = normalizeWgdomCostCatalogHistoryStore(local);
  const c = normalizeWgdomCostCatalogHistoryStore(cloud);
  const map = new Map<string, CostCatalogLaborSnapshot>();
  for (const s of [...l.snapshots, ...c.snapshots]) {
    const key = snapshotKey(s);
    const prev = map.get(key);
    if (!prev || s.rates.length >= prev.rates.length) {
      map.set(key, s);
    }
  }
  const merged = [...map.values()].sort((a, b) => ts(b.at) - ts(a.at));
  return {
    schemaVersion: 1,
    snapshots: merged.slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS),
    updatedAt: ts(l.updatedAt) >= ts(c.updatedAt) ? l.updatedAt : c.updatedAt,
  };
}

export function loadWgdomCostCatalogHistoryLocal(): WgdomCostCatalogHistoryStore {
  try {
    const raw = localStorage.getItem(WGDOM_COST_CATALOG_HISTORY_KEY);
    if (!raw) return defaultWgdomCostCatalogHistoryStore();
    return normalizeWgdomCostCatalogHistoryStore(JSON.parse(raw));
  } catch {
    return defaultWgdomCostCatalogHistoryStore();
  }
}

export async function loadWgdomCostCatalogHistory(): Promise<WgdomCostCatalogHistoryStore> {
  try {
    const local = loadWgdomCostCatalogHistoryLocal();
    const [cloud] = await fetchKeysFromCloud([WGDOM_COST_CATALOG_HISTORY_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeWgdomCostCatalogHistoryStore(local, cloud);
    localStorage.setItem(WGDOM_COST_CATALOG_HISTORY_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return loadWgdomCostCatalogHistoryLocal();
  }
}

async function saveWgdomCostCatalogHistoryStore(store: WgdomCostCatalogHistoryStore): Promise<void> {
  const next: WgdomCostCatalogHistoryStore = {
    ...store,
    schemaVersion: 1,
    snapshots: store.snapshots.slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(WGDOM_COST_CATALOG_HISTORY_KEY, JSON.stringify(next));
  await persistKey(WGDOM_COST_CATALOG_HISTORY_KEY, next);
}

function laborRatesFingerprint(
  store: WgdomCostCatalogStore,
  region: WgdomCostRegion,
): string {
  const rows = listEditableCategories(store, region);
  return rows
    .map((r) => `${r.id}:${r.unit}:${r.laborRbhPerUnit}`)
    .join("|");
}

export function buildLaborSnapshotFromCatalog(
  store: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
  region?: WgdomCostRegion,
): CostCatalogLaborSnapshot {
  const targetRegion = region ?? store.activeRegion;
  const rows = listEditableCategories(store, targetRegion);
  return {
    at: new Date().toISOString(),
    region: targetRegion,
    rates: rows.map((row) => ({
      categoryId: row.id,
      unit: row.unit,
      laborRbhPerUnit: row.laborRbhPerUnit,
      laborPlnPerUnit: computeLaborPlnPerUnitFromRbh(row.laborRbhPerUnit, costModel),
    })),
  };
}

export function hasLaborRateChange(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  region?: WgdomCostRegion,
): boolean {
  const targetRegion = region ?? next.activeRegion;
  return laborRatesFingerprint(previous, targetRegion) !== laborRatesFingerprint(next, targetRegion);
}

export async function appendCostCatalogHistoryIfLaborChanged(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
): Promise<WgdomCostCatalogHistoryStore> {
  const region = next.activeRegion;
  if (!hasLaborRateChange(previous, next, region)) {
    return loadWgdomCostCatalogHistoryLocal();
  }
  const history = loadWgdomCostCatalogHistoryLocal();
  const snapshot = buildLaborSnapshotFromCatalog(next, costModel, region);
  const snapshots = [snapshot, ...history.snapshots].slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS);
  const updated: WgdomCostCatalogHistoryStore = {
    schemaVersion: 1,
    snapshots,
    updatedAt: new Date().toISOString(),
  };
  await saveWgdomCostCatalogHistoryStore(updated);
  return updated;
}

export const LABOR_HISTORY_WINDOW_DAYS = 90;

function computeLaborPlnPerUnitFromRbh(
  laborRbhPerUnit: number,
  costModel: TenderCompanyCostModel,
): number {
  const flHourly = fullyLoadedHourly(costModel);
  const laborNormFactor = costModel.laborNormIndexPct / 100;
  return Math.round(laborRbhPerUnit * flHourly * laborNormFactor * 100) / 100;
}

export function findOldestLaborRateInWindow(
  history: WgdomCostCatalogHistoryStore,
  region: WgdomCostRegion,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  windowDays = LABOR_HISTORY_WINDOW_DAYS,
  now = Date.now(),
): { laborPlnPerUnit: number; at: string; daysAgo: number } | null {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const candidates = history.snapshots
    .filter((s) => s.region === region && ts(s.at) >= cutoff && ts(s.at) <= now - 60_000)
    .sort((a, b) => ts(a.at) - ts(b.at));

  for (const snap of candidates) {
    const rate = snap.rates.find((r) => r.categoryId === categoryId && r.unit === unit);
    if (rate && rate.laborPlnPerUnit > 0) {
      const daysAgo = Math.round((now - ts(snap.at)) / (24 * 60 * 60 * 1000));
      return {
        laborPlnPerUnit: rate.laborPlnPerUnit,
        at: snap.at,
        daysAgo,
      };
    }
  }
  return null;
}
