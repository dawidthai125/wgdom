/**
 * Durable TechnologyPack store — cloud authority + local cache.
 * Pack NEVER contains prices. registerPack must survive cold start.
 */

import type { TechnologyPack } from "./types";
import { normalizeTechnologyPack } from "./pack-schema";

export const TECHNOLOGY_PACK_STORAGE_KEY = "kw-technology-packs";
export const TECHNOLOGY_PACK_SCHEMA_VERSION = 1 as const;

export type TechnologyPackDurableStore = {
  schemaVersion: typeof TECHNOLOGY_PACK_SCHEMA_VERSION;
  etag: string;
  updatedAt: string;
  packs: TechnologyPack[];
};

function packKey(packId: string, packVersion: string): string {
  return `${packId}@@${packVersion}`;
}

function simpleEtag(packs: TechnologyPack[]): string {
  const ids = packs
    .map((p) => `${p.packId}@${p.packVersion}:${p.lifecycle}`)
    .sort()
    .join("|");
  let h = 2166136261;
  for (let i = 0; i < ids.length; i++) {
    h ^= ids.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `tp:${(h >>> 0).toString(16)}:${packs.length}`;
}

export function emptyTechnologyPackDurableStore(
  nowIso = new Date().toISOString(),
): TechnologyPackDurableStore {
  return {
    schemaVersion: TECHNOLOGY_PACK_SCHEMA_VERSION,
    etag: simpleEtag([]),
    updatedAt: nowIso,
    packs: [],
  };
}

export function normalizeTechnologyPackDurableStore(raw: unknown): TechnologyPackDurableStore {
  if (!raw || typeof raw !== "object") return emptyTechnologyPackDurableStore();
  const r = raw as Partial<TechnologyPackDurableStore>;
  const packs: TechnologyPack[] = [];
  if (Array.isArray(r.packs)) {
    for (const p of r.packs) {
      try {
        packs.push(normalizeTechnologyPack(p));
      } catch {
        /* skip invalid */
      }
    }
  }
  const updatedAt =
    typeof r.updatedAt === "string" && r.updatedAt.trim()
      ? r.updatedAt
      : new Date().toISOString();
  return {
    schemaVersion: TECHNOLOGY_PACK_SCHEMA_VERSION,
    etag: typeof r.etag === "string" && r.etag.trim() ? r.etag : simpleEtag(packs),
    updatedAt,
    packs,
  };
}

let memoryStore: TechnologyPackDurableStore | null = null;

export function loadTechnologyPackDurableStoreLocal(): TechnologyPackDurableStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(TECHNOLOGY_PACK_STORAGE_KEY);
      if (raw) {
        const fromLs = normalizeTechnologyPackDurableStore(JSON.parse(raw));
        memoryStore = fromLs;
        return fromLs;
      }
    }
  } catch {
    /* fall through */
  }
  return memoryStore
    ? normalizeTechnologyPackDurableStore(memoryStore)
    : emptyTechnologyPackDurableStore();
}

export function saveTechnologyPackDurableStoreLocal(
  store: TechnologyPackDurableStore,
): void {
  const next = normalizeTechnologyPackDurableStore(store);
  const cur = loadTechnologyPackDurableStoreLocal();
  if (next.packs.length === 0 && cur.packs.length > 0) {
    throw new Error("technology-packs: refusing empty write over non-empty store");
  }
  const withEtag: TechnologyPackDurableStore = {
    ...next,
    etag: simpleEtag(next.packs),
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
  memoryStore = withEtag;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(TECHNOLOGY_PACK_STORAGE_KEY, JSON.stringify(withEtag));
    }
  } catch {
    /* memory-only ok for tests */
  }
}

export function clearTechnologyPackDurableStoreForTests(): void {
  memoryStore = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(TECHNOLOGY_PACK_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Upsert pack into durable store (same packId@@version replaces only if identical key — immutable content). */
export function upsertTechnologyPackDurable(pack: TechnologyPack, nowIso?: string): TechnologyPackDurableStore {
  const normalized = normalizeTechnologyPack(pack);
  const key = packKey(normalized.packId, normalized.packVersion);
  const cur = loadTechnologyPackDurableStoreLocal();
  const idx = cur.packs.findIndex(
    (p) => packKey(p.packId, p.packVersion) === key,
  );
  const packs = cur.packs.slice();
  if (idx >= 0) {
    // Idempotent: keep existing (immutable version)
    packs[idx] = packs[idx]!;
  } else {
    packs.push(normalized);
  }
  const next: TechnologyPackDurableStore = {
    schemaVersion: TECHNOLOGY_PACK_SCHEMA_VERSION,
    etag: simpleEtag(packs),
    updatedAt: nowIso || new Date().toISOString(),
    packs,
  };
  saveTechnologyPackDurableStoreLocal(next);
  return loadTechnologyPackDurableStoreLocal();
}

/** LWW union by packId@@packVersion — empty never wipes non-empty. */
export function mergeTechnologyPackDurableStore(
  local: unknown,
  cloud: unknown,
): TechnologyPackDurableStore {
  const a = normalizeTechnologyPackDurableStore(local);
  const b = normalizeTechnologyPackDurableStore(cloud);
  if (a.packs.length > 0 && b.packs.length === 0) return a;
  if (a.packs.length === 0 && b.packs.length > 0) return b;
  const map = new Map<string, TechnologyPack>();
  for (const p of a.packs) map.set(packKey(p.packId, p.packVersion), p);
  for (const p of b.packs) {
    const k = packKey(p.packId, p.packVersion);
    if (!map.has(k)) map.set(k, p);
  }
  const packs = [...map.values()].sort((x, y) =>
    `${x.packId}@${x.packVersion}`.localeCompare(`${y.packId}@${y.packVersion}`),
  );
  const ta = Date.parse(a.updatedAt) || 0;
  const tb = Date.parse(b.updatedAt) || 0;
  return {
    schemaVersion: TECHNOLOGY_PACK_SCHEMA_VERSION,
    etag: simpleEtag(packs),
    updatedAt: new Date(Math.max(ta, tb) || Date.now()).toISOString(),
    packs,
  };
}

export function mergeTechnologyPackDataKey(local: unknown, cloud: unknown): unknown {
  return mergeTechnologyPackDurableStore(local, cloud);
}
