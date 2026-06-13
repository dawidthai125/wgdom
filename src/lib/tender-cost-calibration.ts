/**
 * P2-G.3B — Historical Cost Calibration (MIN).
 * Własna baza wiedzy kosztowej W&G — uczenie z realnych ofert, bez zewnętrznych API.
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { matchPriorityBuyer } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { buildClassificationSummary } from "@/lib/tender-classification-inspector";
import type { WgdomCostCategoryId } from "@/lib/wgdom-cost-catalog";

export const TENDER_CALIBRATION_KEY = "kw-tender-calibration";

export const CALIBRATION_HINTS_MIN_SNAPSHOTS = 10;

export interface HistoricalCostSnapshotCategory {
  id: WgdomCostCategoryId;
  count: number;
  quantity: number;
}

export interface HistoricalCostSnapshot {
  id: string;
  tenderId: string;
  tenderTitle?: string;
  recommendedBidPln: number | null;
  submittedBidPln: number;
  costPricePln: number | null;
  awardValuePln: number | null;
  tenderType: string;
  categories: HistoricalCostSnapshotCategory[];
  createdAt: string;
  statusAtCapture?: string;
}

export interface TenderCalibrationStore {
  schemaVersion: 1;
  snapshots: HistoricalCostSnapshot[];
  updatedAt: string;
}

export interface CalibrationDelta {
  pct: number | null;
  pln: number | null;
  basePln: number | null;
  comparePln: number | null;
}

export interface CalibrationSummary {
  snapshotCount: number;
  withSubmitted: number;
  withAward: number;
  recommendedVsSubmitted: CalibrationDelta | null;
  submittedVsAward: CalibrationDelta | null;
  recommendedVsAward: CalibrationDelta | null;
}

export interface CatalogCalibrationHint {
  categoryId: WgdomCostCategoryId;
  avgDeltaPct: number;
  snapshotCount: number;
  suggestionPl: string;
}

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function newSnapshotId(): string {
  return `hcs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultTenderCalibrationStore(): TenderCalibrationStore {
  return {
    schemaVersion: 1,
    snapshots: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function inferTenderType(item: Pick<TenderPipelineItem, "priorityBuyerId" | "priorityBuyerLabel" | "organizationName" | "organizationCity">): string {
  if (item.priorityBuyerLabel) return item.priorityBuyerLabel;
  const matched = matchPriorityBuyer(item.organizationName, item.organizationCity);
  if (matched) return matched.label;
  const org = (item.organizationName || "").toLowerCase();
  if (/wspólnot|wspolnot/.test(org)) return "Wspólnota";
  if (item.priorityBuyerId === "wm") return "Wrocławskie Mieszkania";
  if (item.priorityBuyerId === "tbs") return "TBS Wrocław";
  return "Inne (Dolny Śląsk)";
}

export function computeCalibrationDelta(
  basePln: number | null | undefined,
  comparePln: number | null | undefined,
): CalibrationDelta | null {
  if (basePln == null || comparePln == null) return null;
  if (!Number.isFinite(basePln) || !Number.isFinite(comparePln) || basePln === 0) {
    return {
      pct: null,
      pln: comparePln - basePln,
      basePln,
      comparePln,
    };
  }
  const pln = comparePln - basePln;
  const pct = (pln / basePln) * 100;
  return { pct, pln, basePln, comparePln };
}

function averageDelta(deltas: CalibrationDelta[]): CalibrationDelta | null {
  const valid = deltas.filter((d) => d.pct != null && Number.isFinite(d.pct));
  if (valid.length === 0) return null;
  const avgPct = valid.reduce((s, d) => s + d.pct!, 0) / valid.length;
  const avgPln = valid.reduce((s, d) => s + (d.pln ?? 0), 0) / valid.length;
  return {
    pct: avgPct,
    pln: avgPln,
    basePln: null,
    comparePln: null,
  };
}

/** Najnowszy snapshot per tenderId (do analityki bez duplikatów). */
export function latestSnapshotsByTender(store: TenderCalibrationStore): HistoricalCostSnapshot[] {
  const map = new Map<string, HistoricalCostSnapshot>();
  for (const snap of store.snapshots) {
    const prev = map.get(snap.tenderId);
    if (!prev || ts(snap.createdAt) >= ts(prev.createdAt)) {
      map.set(snap.tenderId, snap);
    }
  }
  return [...map.values()];
}

export function buildCalibrationSummary(store: TenderCalibrationStore): CalibrationSummary {
  const latest = latestSnapshotsByTender(store);
  const recVsSub: CalibrationDelta[] = [];
  const subVsAward: CalibrationDelta[] = [];
  const recVsAward: CalibrationDelta[] = [];

  for (const snap of latest) {
    const a = computeCalibrationDelta(snap.recommendedBidPln, snap.submittedBidPln);
    if (a) recVsSub.push(a);
    const b = computeCalibrationDelta(snap.submittedBidPln, snap.awardValuePln);
    if (b) subVsAward.push(b);
    const c = computeCalibrationDelta(snap.recommendedBidPln, snap.awardValuePln);
    if (c) recVsAward.push(c);
  }

  return {
    snapshotCount: store.snapshots.length,
    withSubmitted: latest.length,
    withAward: latest.filter((s) => s.awardValuePln != null).length,
    recommendedVsSubmitted: averageDelta(recVsSub),
    submittedVsAward: averageDelta(subVsAward),
    recommendedVsAward: averageDelta(recVsAward),
  };
}

export function formatCalibrationDeltaPct(delta: CalibrationDelta | null): string {
  if (!delta || delta.pct == null || !Number.isFinite(delta.pct)) return "—";
  const sign = delta.pct > 0 ? "+" : "";
  return `${sign}${delta.pct.toFixed(1)}%`;
}

export function buildCatalogCalibrationHints(
  store: TenderCalibrationStore,
  minSnapshots = CALIBRATION_HINTS_MIN_SNAPSHOTS,
): CatalogCalibrationHint[] {
  const latest = latestSnapshotsByTender(store);
  if (latest.length < minSnapshots) return [];

  const overallDeltas = latest
    .map((s) => computeCalibrationDelta(s.recommendedBidPln, s.submittedBidPln))
    .filter((d): d is CalibrationDelta => d != null && d.pct != null);
  if (overallDeltas.length < minSnapshots) return [];

  const avgOverallPct =
    overallDeltas.reduce((sum, d) => sum + d.pct!, 0) / overallDeltas.length;

  const byCategory = new Map<WgdomCostCategoryId, { weightedPct: number; weight: number; count: number }>();

  for (const snap of latest) {
    const delta = computeCalibrationDelta(snap.recommendedBidPln, snap.submittedBidPln);
    if (!delta?.pct) continue;
    const totalQty = snap.categories
      .filter((c) => c.id !== "UNKNOWN")
      .reduce((s, c) => s + c.quantity, 0);
    if (totalQty <= 0) continue;
    for (const cat of snap.categories) {
      if (cat.id === "UNKNOWN" || cat.quantity <= 0) continue;
      const share = cat.quantity / totalQty;
      const prev = byCategory.get(cat.id) ?? { weightedPct: 0, weight: 0, count: 0 };
      prev.weightedPct += delta.pct * share;
      prev.weight += share;
      prev.count += 1;
      byCategory.set(cat.id, prev);
    }
  }

  const hints: CatalogCalibrationHint[] = [];
  for (const [categoryId, agg] of byCategory) {
    if (agg.count < 3) continue;
    const avgDeltaPct = agg.weight > 0 ? agg.weightedPct / agg.weight : avgOverallPct;
    if (Math.abs(avgDeltaPct) < 2) continue;
    const low = Math.max(1, Math.round(Math.abs(avgDeltaPct) * 0.6));
    const high = Math.round(Math.abs(avgDeltaPct));
    const direction = avgDeltaPct > 0 ? "podniesienie" : "obniżenie";
    hints.push({
      categoryId,
      avgDeltaPct,
      snapshotCount: agg.count,
      suggestionPl: `rozważ ${direction} stawek ${categoryId} o ${low}–${high}%`,
    });
  }

  return hints.sort((a, b) => Math.abs(b.avgDeltaPct) - Math.abs(a.avgDeltaPct));
}

export function normalizeTenderCalibrationStore(raw: unknown): TenderCalibrationStore {
  const base = defaultTenderCalibrationStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TenderCalibrationStore>;
  const snapshots: HistoricalCostSnapshot[] = [];
  if (Array.isArray(r.snapshots)) {
    for (const item of r.snapshots) {
      if (!item || typeof item !== "object") continue;
      const s = item as Partial<HistoricalCostSnapshot>;
      const tenderId = typeof s.tenderId === "string" ? s.tenderId : "";
      const submitted = Number(s.submittedBidPln);
      if (!tenderId || !Number.isFinite(submitted) || submitted <= 0) continue;
      const categories: HistoricalCostSnapshotCategory[] = [];
      if (Array.isArray(s.categories)) {
        for (const c of s.categories) {
          if (!c || typeof c !== "object") continue;
          const cat = c as Partial<HistoricalCostSnapshotCategory>;
          if (typeof cat.id !== "string") continue;
          categories.push({
            id: cat.id as WgdomCostCategoryId,
            count: Number.isFinite(cat.count) ? cat.count! : 0,
            quantity: Number.isFinite(cat.quantity) ? cat.quantity! : 0,
          });
        }
      }
      snapshots.push({
        id: typeof s.id === "string" && s.id ? s.id : newSnapshotId(),
        tenderId,
        tenderTitle: typeof s.tenderTitle === "string" ? s.tenderTitle : undefined,
        recommendedBidPln: Number.isFinite(s.recommendedBidPln) ? s.recommendedBidPln! : null,
        submittedBidPln: submitted,
        costPricePln: Number.isFinite(s.costPricePln) ? s.costPricePln! : null,
        awardValuePln: Number.isFinite(s.awardValuePln) ? s.awardValuePln! : null,
        tenderType: typeof s.tenderType === "string" ? s.tenderType : "Inne",
        categories,
        createdAt: typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
        statusAtCapture: typeof s.statusAtCapture === "string" ? s.statusAtCapture : undefined,
      });
    }
  }
  return {
    schemaVersion: 1,
    snapshots,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export function mergeTenderCalibrationStore(local: unknown, cloud: unknown): TenderCalibrationStore {
  const l = normalizeTenderCalibrationStore(local);
  const c = normalizeTenderCalibrationStore(cloud);
  const byId = new Map<string, HistoricalCostSnapshot>();
  for (const snap of [...c.snapshots, ...l.snapshots]) {
    const prev = byId.get(snap.id);
    if (!prev || ts(snap.createdAt) >= ts(prev.createdAt)) {
      byId.set(snap.id, snap);
    }
  }
  const snapshots = [...byId.values()].sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  const lTs = ts(l.updatedAt);
  const cTs = ts(c.updatedAt);
  return {
    schemaVersion: 1,
    snapshots,
    updatedAt: lTs >= cTs ? l.updatedAt : c.updatedAt,
  };
}

export function loadTenderCalibrationStoreLocal(): TenderCalibrationStore {
  try {
    const raw = localStorage.getItem(TENDER_CALIBRATION_KEY);
    if (!raw) return defaultTenderCalibrationStore();
    return normalizeTenderCalibrationStore(JSON.parse(raw));
  } catch {
    return defaultTenderCalibrationStore();
  }
}

export async function loadTenderCalibrationStore(): Promise<TenderCalibrationStore> {
  try {
    const local = loadTenderCalibrationStoreLocal();
    const [cloud] = await fetchKeysFromCloud([TENDER_CALIBRATION_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeTenderCalibrationStore(local, cloud);
    try {
      localStorage.setItem(TENDER_CALIBRATION_KEY, JSON.stringify(merged));
    } catch { /* ignore */ }
    return merged;
  } catch {
    return loadTenderCalibrationStoreLocal();
  }
}

export async function saveTenderCalibrationStore(store: TenderCalibrationStore): Promise<void> {
  const next: TenderCalibrationStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(TENDER_CALIBRATION_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  await persistKey(TENDER_CALIBRATION_KEY, next);
}

export function buildHistoricalCostSnapshot(opts: {
  item: TenderPipelineItem;
  bidProposal: TenderBidProposal | null | undefined;
  submittedBidPln: number;
  awardValuePln?: number | null;
}): HistoricalCostSnapshot {
  const { item, bidProposal, submittedBidPln, awardValuePln } = opts;
  const catalogQuantities = item.tenderDossier?.kosztorys?.catalogQuantities;
  let categories: HistoricalCostSnapshotCategory[] = [];
  if (catalogQuantities?.length) {
    const summary = buildClassificationSummary(catalogQuantities);
    categories = summary.categories
      .filter((c) => c.id !== "UNKNOWN" && c.count > 0)
      .map((c) => ({ id: c.id, count: c.count, quantity: c.quantity }));
  }
  return {
    id: newSnapshotId(),
    tenderId: item.id,
    tenderTitle: item.title,
    recommendedBidPln: bidProposal?.recommendedBidPln ?? null,
    submittedBidPln,
    costPricePln: bidProposal?.costPricePln ?? null,
    awardValuePln: awardValuePln ?? item.awardResult?.awardValuePln ?? null,
    tenderType: inferTenderType(item),
    categories,
    createdAt: new Date().toISOString(),
    statusAtCapture: item.status,
  };
}

export function appendHistoricalCostSnapshot(
  store: TenderCalibrationStore,
  snapshot: HistoricalCostSnapshot,
): TenderCalibrationStore {
  const withoutDup = store.snapshots.filter(
    (s) => !(s.tenderId === snapshot.tenderId && ts(s.createdAt) === ts(snapshot.createdAt)),
  );
  return {
    schemaVersion: 1,
    snapshots: [snapshot, ...withoutDup].slice(0, 500),
    updatedAt: new Date().toISOString(),
  };
}

export function updateCalibrationAwardForTender(
  store: TenderCalibrationStore,
  tenderId: string,
  awardValuePln: number | null | undefined,
): TenderCalibrationStore {
  if (awardValuePln == null || !Number.isFinite(awardValuePln)) return store;
  let changed = false;
  const snapshots = store.snapshots.map((s) => {
    if (s.tenderId !== tenderId) return s;
    changed = true;
    return { ...s, awardValuePln };
  });
  if (!changed) return store;
  return { ...store, snapshots, updatedAt: new Date().toISOString() };
}

export async function recordSubmittedBidCalibration(opts: {
  item: TenderPipelineItem;
  bidProposal: TenderBidProposal | null | undefined;
  submittedBidPln: number;
}): Promise<TenderCalibrationStore> {
  const store = await loadTenderCalibrationStore();
  const snapshot = buildHistoricalCostSnapshot({
    item: opts.item,
    bidProposal: opts.bidProposal,
    submittedBidPln: opts.submittedBidPln,
  });
  const next = appendHistoricalCostSnapshot(store, snapshot);
  await saveTenderCalibrationStore(next);
  return next;
}

export async function syncCalibrationAwardFromItem(item: TenderPipelineItem): Promise<void> {
  const award = item.awardResult?.awardValuePln;
  if (award == null) return;
  const store = await loadTenderCalibrationStore();
  const next = updateCalibrationAwardForTender(store, item.id, award);
  if (next !== store) {
    await saveTenderCalibrationStore(next);
  }
}
