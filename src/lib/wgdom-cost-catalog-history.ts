/**
 * P3.3B / P3.4A — historia stawek Bazy cen (robocizna + materiały, snapshots przy zapisie).
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  listEditableCategories,
  type WgdomCostCatalogStore,
} from "@/lib/wgdom-cost-catalog-store";
import type { WgdomCostCategoryId, WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const WGDOM_COST_CATALOG_HISTORY_KEY = "kw-wgdom-cost-catalog-history";

export const COST_CATALOG_HISTORY_MAX_SNAPSHOTS = 100;
export const LABOR_HISTORY_WINDOW_DAYS = 90;
export const MATERIAL_HISTORY_WINDOW_DAYS = 90;

/** @deprecated alias P3.3B */
export type CostCatalogLaborRateEntry = CostCatalogRateEntry;
/** @deprecated alias P3.3B */
export type CostCatalogLaborSnapshot = CostCatalogSnapshot;

export interface CostCatalogRateEntry {
  categoryId: WgdomCostCategoryId;
  unit: WgdomCostUnit;
  laborRbhPerUnit: number;
  laborPlnPerUnit: number;
  materialPlnPerUnit: number;
}

export interface CostCatalogSnapshot {
  at: string;
  region: WgdomCostRegion;
  rates: CostCatalogRateEntry[];
}

export interface WgdomCostCatalogHistoryStore {
  schemaVersion: 1;
  snapshots: CostCatalogSnapshot[];
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

function normalizeRateEntry(raw: unknown): CostCatalogRateEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<CostCatalogRateEntry>;
  if (typeof entry.categoryId !== "string") return null;
  const unit = entry.unit as WgdomCostUnit;
  if (!["m2", "mb", "szt", "rbh", "m3", "kpl"].includes(unit)) return null;
  const laborRbh = Number(entry.laborRbhPerUnit);
  const laborPln = Number(entry.laborPlnPerUnit);
  const materialPln = Number(entry.materialPlnPerUnit);
  if (!Number.isFinite(laborRbh) || laborRbh < 0) return null;
  if (!Number.isFinite(laborPln) || laborPln < 0) return null;
  return {
    categoryId: entry.categoryId as WgdomCostCategoryId,
    unit,
    laborRbhPerUnit: laborRbh,
    laborPlnPerUnit: laborPln,
    materialPlnPerUnit: Number.isFinite(materialPln) && materialPln >= 0 ? materialPln : 0,
  };
}

function normalizeSnapshot(raw: unknown): CostCatalogSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<CostCatalogSnapshot>;
  if (typeof s.at !== "string" || !s.at) return null;
  const region: WgdomCostRegion = s.region === "dolnyslask" ? "dolnyslask" : "wroclaw";
  const rates: CostCatalogRateEntry[] = [];
  if (Array.isArray(s.rates)) {
    for (const r of s.rates) {
      const norm = normalizeRateEntry(r);
      if (norm) rates.push(norm);
    }
  }
  if (rates.length === 0) return null;
  return { at: s.at, region, rates };
}

export function normalizeWgdomCostCatalogHistoryStore(raw: unknown): WgdomCostCatalogHistoryStore {
  const base = defaultWgdomCostCatalogHistoryStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<WgdomCostCatalogHistoryStore>;
  const snapshots: CostCatalogSnapshot[] = [];
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

function snapshotKey(s: CostCatalogSnapshot): string {
  return `${s.at}|${s.region}`;
}

export function mergeWgdomCostCatalogHistoryStore(
  local: unknown,
  cloud: unknown,
): WgdomCostCatalogHistoryStore {
  const l = normalizeWgdomCostCatalogHistoryStore(local);
  const c = normalizeWgdomCostCatalogHistoryStore(cloud);
  const map = new Map<string, CostCatalogSnapshot>();
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

export async function saveWgdomCostCatalogHistoryStore(store: WgdomCostCatalogHistoryStore): Promise<void> {
  const next: WgdomCostCatalogHistoryStore = {
    ...store,
    schemaVersion: 1,
    snapshots: store.snapshots.slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(WGDOM_COST_CATALOG_HISTORY_KEY, JSON.stringify(next));
  await persistKey(WGDOM_COST_CATALOG_HISTORY_KEY, next);
}

function ratesFingerprint(
  store: WgdomCostCatalogStore,
  region: WgdomCostRegion,
): string {
  const rows = listEditableCategories(store, region);
  return rows
    .map((r) => `${r.id}:${r.unit}:${r.laborRbhPerUnit}:${r.materialPlnPerUnit}`)
    .join("|");
}

export function hasLaborRateChange(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  region?: WgdomCostRegion,
): boolean {
  const targetRegion = region ?? next.activeRegion;
  const prevRows = listEditableCategories(previous, targetRegion);
  const nextRows = listEditableCategories(next, targetRegion);
  const prevFp = prevRows.map((r) => `${r.id}:${r.unit}:${r.laborRbhPerUnit}`).join("|");
  const nextFp = nextRows.map((r) => `${r.id}:${r.unit}:${r.laborRbhPerUnit}`).join("|");
  return prevFp !== nextFp;
}

export function hasMaterialRateChange(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  region?: WgdomCostRegion,
): boolean {
  const targetRegion = region ?? next.activeRegion;
  const prevRows = listEditableCategories(previous, targetRegion);
  const nextRows = listEditableCategories(next, targetRegion);
  const prevFp = prevRows.map((r) => `${r.id}:${r.unit}:${r.materialPlnPerUnit}`).join("|");
  const nextFp = nextRows.map((r) => `${r.id}:${r.unit}:${r.materialPlnPerUnit}`).join("|");
  return prevFp !== nextFp;
}

export function hasCatalogRateChange(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  region?: WgdomCostRegion,
): boolean {
  const targetRegion = region ?? next.activeRegion;
  return ratesFingerprint(previous, targetRegion) !== ratesFingerprint(next, targetRegion);
}

function computeLaborPlnPerUnitFromRbh(
  laborRbhPerUnit: number,
  costModel: TenderCompanyCostModel,
): number {
  const flHourly = fullyLoadedHourly(costModel);
  const laborNormFactor = costModel.laborNormIndexPct / 100;
  return Math.round(laborRbhPerUnit * flHourly * laborNormFactor * 100) / 100;
}

export function buildCatalogSnapshotFromStore(
  store: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
  region?: WgdomCostRegion,
): CostCatalogSnapshot {
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
      materialPlnPerUnit: row.materialPlnPerUnit,
    })),
  };
}

/** @deprecated użyj buildCatalogSnapshotFromStore */
export function buildLaborSnapshotFromCatalog(
  store: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
  region?: WgdomCostRegion,
): CostCatalogSnapshot {
  return buildCatalogSnapshotFromStore(store, costModel, region);
}

export async function appendCostCatalogHistoryIfRatesChanged(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
): Promise<WgdomCostCatalogHistoryStore> {
  const region = next.activeRegion;
  if (!hasCatalogRateChange(previous, next, region)) {
    return loadWgdomCostCatalogHistoryLocal();
  }
  const history = loadWgdomCostCatalogHistoryLocal();
  const snapshot = buildCatalogSnapshotFromStore(next, costModel, region);
  const snapshots = [snapshot, ...history.snapshots].slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS);
  const updated: WgdomCostCatalogHistoryStore = {
    schemaVersion: 1,
    snapshots,
    updatedAt: new Date().toISOString(),
  };
  await saveWgdomCostCatalogHistoryStore(updated);
  return updated;
}

/** @deprecated alias — zapis przy zmianie robocizny lub materiału */
export async function appendCostCatalogHistoryIfLaborChanged(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
): Promise<WgdomCostCatalogHistoryStore> {
  return appendCostCatalogHistoryIfRatesChanged(previous, next, costModel);
}

function findOldestRateInWindow(
  history: WgdomCostCatalogHistoryStore,
  region: WgdomCostRegion,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  pickPln: (rate: CostCatalogRateEntry) => number,
  windowDays: number,
  now: number,
): { plnPerUnit: number; at: string; daysAgo: number } | null {
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const candidates = history.snapshots
    .filter((s) => s.region === region && ts(s.at) >= cutoff && ts(s.at) <= now - 60_000)
    .sort((a, b) => ts(a.at) - ts(b.at));

  for (const snap of candidates) {
    const rate = snap.rates.find((r) => r.categoryId === categoryId && r.unit === unit);
    if (!rate) continue;
    const pln = pickPln(rate);
    if (pln > 0) {
      const daysAgo = Math.round((now - ts(snap.at)) / (24 * 60 * 60 * 1000));
      return { plnPerUnit: pln, at: snap.at, daysAgo };
    }
  }
  return null;
}

export function findOldestLaborRateInWindow(
  history: WgdomCostCatalogHistoryStore,
  region: WgdomCostRegion,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  windowDays = LABOR_HISTORY_WINDOW_DAYS,
  now = Date.now(),
): { laborPlnPerUnit: number; at: string; daysAgo: number } | null {
  const found = findOldestRateInWindow(
    history, region, categoryId, unit, (r) => r.laborPlnPerUnit, windowDays, now,
  );
  if (!found) return null;
  return { laborPlnPerUnit: found.plnPerUnit, at: found.at, daysAgo: found.daysAgo };
}

export function findOldestMaterialRateInWindow(
  history: WgdomCostCatalogHistoryStore,
  region: WgdomCostRegion,
  categoryId: WgdomCostCategoryId,
  unit: WgdomCostUnit,
  windowDays = MATERIAL_HISTORY_WINDOW_DAYS,
  now = Date.now(),
): { materialPlnPerUnit: number; at: string; daysAgo: number } | null {
  const found = findOldestRateInWindow(
    history, region, categoryId, unit, (r) => r.materialPlnPerUnit, windowDays, now,
  );
  if (!found) return null;
  return { materialPlnPerUnit: found.plnPerUnit, at: found.at, daysAgo: found.daysAgo };
}
