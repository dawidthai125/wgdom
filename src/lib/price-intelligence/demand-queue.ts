/**
 * PRICE-INTELLIGENCE-01 P3.2 — demand identity / priority / upsert (pure).
 */

import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type {
  PriceDemandCandidate,
  PriceDemandMissingLayer,
  PriceDemandPriority,
  PriceDemandRecord,
  PriceDemandStore,
} from "./demand-types";
import {
  PRICE_DEMAND_ENTRIES_CAP,
  PRICE_DEMAND_SCHEMA_VERSION,
  PRICE_DEMAND_TENDER_IDS_CAP,
} from "./demand-types";

export function normalizeDemandName(namePl: string): string {
  return foldPolishText(String(namePl || "").trim());
}

export function buildPriceDemandId(opts: {
  materialKey: string;
  catalogWorkId: string | null;
  region: string;
  missingLayer: PriceDemandMissingLayer;
}): string {
  const mk = String(opts.materialKey || "").trim() || "_";
  const cw = String(opts.catalogWorkId || "").trim() || "_";
  const region = String(opts.region || "").trim() || "wroclaw";
  return `${mk}|${cw}|${region}|${opts.missingLayer}`;
}

export function buildPriceDemandFamilyKey(opts: {
  materialKey: string;
  catalogWorkId: string | null;
  region: string;
}): string {
  const mk = String(opts.materialKey || "").trim() || "_";
  const cw = String(opts.catalogWorkId || "").trim() || "_";
  const region = String(opts.region || "").trim() || "wroclaw";
  return `${mk}|${cw}|${region}`;
}

export function computePriceDemandPriority(
  occurrenceCount: number,
  tenderCount: number,
): PriceDemandPriority {
  if (occurrenceCount >= 10 || tenderCount >= 3) return "HIGH";
  if (occurrenceCount >= 3 || tenderCount >= 2) return "MEDIUM";
  return "LOW";
}

function emptyStore(updatedAt = ""): PriceDemandStore {
  return {
    schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
    updatedAt: updatedAt || "1970-01-01T00:00:00.000Z",
    demands: [],
  };
}

export function normalizePriceDemandStore(raw: unknown): PriceDemandStore {
  if (!raw || typeof raw !== "object") return emptyStore();
  const s = raw as Partial<PriceDemandStore>;
  if (s.schemaVersion !== PRICE_DEMAND_SCHEMA_VERSION || !Array.isArray(s.demands)) {
    return emptyStore(typeof s.updatedAt === "string" ? s.updatedAt : undefined);
  }
  const demands: PriceDemandRecord[] = [];
  for (const d of s.demands) {
    if (!d || typeof d !== "object") continue;
    if (typeof d.demandId !== "string" || !d.demandId) continue;
    if (typeof d.materialKey !== "string" || !d.materialKey) continue;
    const missingLayer = d.missingLayer;
    if (
      missingLayer !== "PURCHASE_MISSING" &&
      missingLayer !== "MARKET_QUOTE_MISSING" &&
      missingLayer !== "BOTH_MISSING"
    ) {
      continue;
    }
    const status =
      d.status === "RESOLVED" || d.status === "MISSING" || d.status === "QUEUED"
        ? d.status
        : "QUEUED";
    const priority =
      d.priority === "HIGH" || d.priority === "MEDIUM" || d.priority === "LOW"
        ? d.priority
        : "LOW";
    const tenderIds = Array.isArray(d.tenderIds)
      ? d.tenderIds
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .slice(0, PRICE_DEMAND_TENDER_IDS_CAP)
      : [];
    demands.push({
      demandId: d.demandId,
      materialKey: d.materialKey,
      catalogWorkId:
        typeof d.catalogWorkId === "string" && d.catalogWorkId.trim()
          ? d.catalogWorkId.trim()
          : null,
      normalizedName:
        typeof d.normalizedName === "string"
          ? d.normalizedName
          : normalizeDemandName(String((d as { namePl?: string }).namePl || d.materialKey)),
      unit: typeof d.unit === "string" ? d.unit : "",
      region: typeof d.region === "string" && d.region.trim() ? d.region.trim() : "wroclaw",
      missingLayer,
      status,
      priority,
      occurrenceCount: Math.max(0, Number(d.occurrenceCount) || 0),
      tenderIds,
      firstRequestedAt: typeof d.firstRequestedAt === "string" ? d.firstRequestedAt : "",
      lastRequestedAt: typeof d.lastRequestedAt === "string" ? d.lastRequestedAt : "",
      reason: typeof d.reason === "string" ? d.reason : "PRICE DATA MISSING",
    });
  }
  return {
    schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
    updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : emptyStore().updatedAt,
    demands: demands.slice(0, PRICE_DEMAND_ENTRIES_CAP),
  };
}

export function defaultPriceDemandStoreForPersist(): PriceDemandStore {
  return emptyStore();
}

function mergeDemandPair(a: PriceDemandRecord, b: PriceDemandRecord): PriceDemandRecord {
  const tenderSet = new Set([...a.tenderIds, ...b.tenderIds]);
  const tenderIds = [...tenderSet].slice(0, PRICE_DEMAND_TENDER_IDS_CAP);
  const occurrenceCount = Math.max(a.occurrenceCount, b.occurrenceCount);
  const ta = Date.parse(a.lastRequestedAt || "") || 0;
  const tb = Date.parse(b.lastRequestedAt || "") || 0;
  const newer = ta >= tb ? a : b;
  const older = ta >= tb ? b : a;
  const fa = Date.parse(a.firstRequestedAt || "") || Number.POSITIVE_INFINITY;
  const fb = Date.parse(b.firstRequestedAt || "") || Number.POSITIVE_INFINITY;
  const status =
    a.status === "QUEUED" || b.status === "QUEUED"
      ? "QUEUED"
      : a.status === "MISSING" || b.status === "MISSING"
        ? "MISSING"
        : newer.status;
  return {
    ...newer,
    occurrenceCount,
    tenderIds,
    firstRequestedAt: fa <= fb ? a.firstRequestedAt || b.firstRequestedAt : b.firstRequestedAt || a.firstRequestedAt,
    lastRequestedAt: newer.lastRequestedAt || older.lastRequestedAt,
    priority: computePriceDemandPriority(occurrenceCount, tenderIds.length),
    status,
  };
}

/** Cloud merge — union po demandId. */
export function mergePriceDemandStore(local: unknown, cloud: unknown): PriceDemandStore {
  const left = normalizePriceDemandStore(local);
  const right = normalizePriceDemandStore(cloud);
  const byId = new Map<string, PriceDemandRecord>();

  for (const d of right.demands) byId.set(d.demandId, d);
  for (const d of left.demands) {
    const prev = byId.get(d.demandId);
    byId.set(d.demandId, prev ? mergeDemandPair(d, prev) : d);
  }

  const leftTs = Date.parse(left.updatedAt || "") || 0;
  const rightTs = Date.parse(right.updatedAt || "") || 0;
  return normalizePriceDemandStore({
    schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
    updatedAt: leftTs >= rightTs ? left.updatedAt : right.updatedAt,
    demands: [...byId.values()],
  });
}

export interface UpsertPriceDemandsResult {
  store: PriceDemandStore;
  changed: boolean;
  upserted: number;
  resolved: number;
}

/**
 * Upsert candidates (dedupe po demandId) + resolve sibling layers when layer changes.
 */
export function upsertPriceDemandCandidates(
  rawStore: PriceDemandStore,
  candidates: readonly PriceDemandCandidate[],
): UpsertPriceDemandsResult {
  const store = normalizePriceDemandStore(rawStore);
  const byId = new Map(store.demands.map((d) => [d.demandId, d] as const));
  let changed = false;
  let upserted = 0;
  let resolved = 0;

  const layers: PriceDemandMissingLayer[] = [
    "PURCHASE_MISSING",
    "MARKET_QUOTE_MISSING",
    "BOTH_MISSING",
  ];

  for (const c of candidates) {
    if (!c.materialKey?.trim()) continue;
    const demandId = buildPriceDemandId(c);
    const prev = byId.get(demandId);
    const tenderIds = new Set(prev?.tenderIds ?? []);
    if (c.tenderId?.trim()) tenderIds.add(c.tenderId.trim());
    const tenderList = [...tenderIds].slice(0, PRICE_DEMAND_TENDER_IDS_CAP);
    const occurrenceCount = (prev?.occurrenceCount ?? 0) + 1;
    const next: PriceDemandRecord = {
      demandId,
      materialKey: c.materialKey,
      catalogWorkId: c.catalogWorkId,
      normalizedName: normalizeDemandName(c.namePl),
      unit: c.unit,
      region: c.region || "wroclaw",
      missingLayer: c.missingLayer,
      status: "QUEUED",
      priority: computePriceDemandPriority(occurrenceCount, tenderList.length),
      occurrenceCount,
      tenderIds: tenderList,
      firstRequestedAt: prev?.firstRequestedAt || c.requestedAt,
      lastRequestedAt: c.requestedAt,
      reason: c.reason || "PRICE DATA MISSING",
    };
    if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) {
      changed = true;
      upserted += 1;
      byId.set(demandId, next);
    }

    const family = buildPriceDemandFamilyKey(c);
    for (const layer of layers) {
      if (layer === c.missingLayer) continue;
      const id = buildPriceDemandId({ ...c, missingLayer: layer });
      const sib = byId.get(id);
      if (!sib || sib.status === "RESOLVED") continue;
      if (buildPriceDemandFamilyKey(sib) !== family) continue;
      byId.set(id, { ...sib, status: "RESOLVED", lastRequestedAt: c.requestedAt });
      changed = true;
      resolved += 1;
    }
  }

  const updatedAt = changed
    ? candidates[candidates.length - 1]?.requestedAt || store.updatedAt
    : store.updatedAt;

  return {
    store: normalizePriceDemandStore({
      schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
      updatedAt,
      demands: [...byId.values()],
    }),
    changed,
    upserted,
    resolved,
  };
}

/** Mark family demands RESOLVED when price data is complete. */
export function resolvePriceDemandsForMaterials(
  rawStore: PriceDemandStore,
  opts: {
    materialKeys: readonly string[];
    region: string;
    resolvedAt: string;
  },
): UpsertPriceDemandsResult {
  const store = normalizePriceDemandStore(rawStore);
  const byId = new Map(store.demands.map((d) => [d.demandId, d] as const));
  let changed = false;
  let resolved = 0;
  const keySet = new Set(opts.materialKeys);
  const region = opts.region || "wroclaw";

  for (const [id, d] of [...byId.entries()]) {
    if (!keySet.has(d.materialKey)) continue;
    if (d.region !== region) continue;
    if (d.status === "RESOLVED") continue;
    byId.set(id, { ...d, status: "RESOLVED", lastRequestedAt: opts.resolvedAt });
    changed = true;
    resolved += 1;
  }

  return {
    store: normalizePriceDemandStore({
      schemaVersion: PRICE_DEMAND_SCHEMA_VERSION,
      updatedAt: changed ? opts.resolvedAt : store.updatedAt,
      demands: [...byId.values()],
    }),
    changed,
    upserted: 0,
    resolved,
  };
}

export function listActivePriceDemands(store: PriceDemandStore): PriceDemandRecord[] {
  return normalizePriceDemandStore(store).demands.filter(
    (d) => d.status === "QUEUED" || d.status === "MISSING",
  );
}
