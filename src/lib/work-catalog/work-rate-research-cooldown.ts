/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — anti-storm (dedupe · single-flight · cooldown).
 * ONE workId|unit at a time · no mass harvest.
 * Durable mirror: kw-work-rate-research-cooldown (survives process reload within TTL).
 */

import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const WORK_RATE_RESEARCH_COOLDOWN_MS = 60_000;
export const WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY =
  "kw-work-rate-research-cooldown" as const;
export const WORK_RATE_RESEARCH_COOLDOWN_SCHEMA_VERSION = 1 as const;

const cooldownUntilByKey = new Map<string, number>();
const inFlightByKey = new Map<string, Promise<unknown>>();

export type WorkRateResearchCooldownEntry = {
  key: string;
  workId: string;
  unit: string;
  cooldownUntilMs: number;
  lastVerifiedAt: string;
  evidenceHash: string | null;
};

export type WorkRateResearchCooldownStore = {
  schemaVersion: typeof WORK_RATE_RESEARCH_COOLDOWN_SCHEMA_VERSION;
  updatedAt: string;
  entries: WorkRateResearchCooldownEntry[];
};

function emptyCooldownStore(nowIso = new Date().toISOString()): WorkRateResearchCooldownStore {
  return {
    schemaVersion: WORK_RATE_RESEARCH_COOLDOWN_SCHEMA_VERSION,
    updatedAt: nowIso,
    entries: [],
  };
}

export function normalizeWorkRateResearchCooldownStore(raw: unknown): WorkRateResearchCooldownStore {
  if (!raw || typeof raw !== "object") return emptyCooldownStore();
  const r = raw as Partial<WorkRateResearchCooldownStore>;
  const entries = Array.isArray(r.entries)
    ? r.entries.filter(
        (e): e is WorkRateResearchCooldownEntry =>
          !!e
          && typeof e === "object"
          && typeof (e as WorkRateResearchCooldownEntry).key === "string"
          && typeof (e as WorkRateResearchCooldownEntry).cooldownUntilMs === "number",
      )
    : [];
  return {
    schemaVersion: WORK_RATE_RESEARCH_COOLDOWN_SCHEMA_VERSION,
    updatedAt:
      typeof r.updatedAt === "string" && r.updatedAt.trim()
        ? r.updatedAt
        : new Date().toISOString(),
    entries,
  };
}

export function emptyWorkRateResearchCooldownStore(
  nowIso = new Date().toISOString(),
): WorkRateResearchCooldownStore {
  return emptyCooldownStore(nowIso);
}

let cooldownMemory: WorkRateResearchCooldownStore | null = null;

function loadCooldownDurable(): WorkRateResearchCooldownStore {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY);
      if (raw) {
        const fromLs = normalizeWorkRateResearchCooldownStore(JSON.parse(raw));
        cooldownMemory = fromLs;
        // hydrate process maps for active TTLs
        const now = Date.now();
        for (const e of fromLs.entries) {
          if (e.cooldownUntilMs > now) {
            cooldownUntilByKey.set(e.key, e.cooldownUntilMs);
          }
        }
        return fromLs;
      }
    }
  } catch {
    /* fall through */
  }
  return cooldownMemory
    ? normalizeWorkRateResearchCooldownStore(cooldownMemory)
    : emptyCooldownStore();
}

function saveCooldownDurable(store: WorkRateResearchCooldownStore): void {
  const next = normalizeWorkRateResearchCooldownStore(store);
  // prune expired
  const now = Date.now();
  const entries = next.entries.filter((e) => e.cooldownUntilMs > now - 5 * 60_000);
  const pruned: WorkRateResearchCooldownStore = {
    ...next,
    entries,
    updatedAt: new Date().toISOString(),
  };
  cooldownMemory = pruned;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY, JSON.stringify(pruned));
    }
  } catch {
    /* memory-only */
  }
  void pushCooldownToCloudSafe(pruned);
}

async function pushCooldownToCloudSafe(store: WorkRateResearchCooldownStore): Promise<void> {
  try {
    const { persistKey, isSupabaseConfigured } = await import("@/lib/cloud-sync");
    if (!isSupabaseConfigured()) return;
    await persistKey(WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY, store);
  } catch {
    /* offline */
  }
}

export function mergeWorkRateResearchCooldownStore(
  local: unknown,
  cloud: unknown,
): WorkRateResearchCooldownStore {
  const a = normalizeWorkRateResearchCooldownStore(local);
  const b = normalizeWorkRateResearchCooldownStore(cloud);
  if (a.entries.length > 0 && b.entries.length === 0) return a;
  if (a.entries.length === 0 && b.entries.length > 0) return b;
  const map = new Map<string, WorkRateResearchCooldownEntry>();
  for (const e of [...a.entries, ...b.entries]) {
    const prev = map.get(e.key);
    if (!prev || e.cooldownUntilMs >= prev.cooldownUntilMs) map.set(e.key, e);
  }
  return {
    schemaVersion: WORK_RATE_RESEARCH_COOLDOWN_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    entries: [...map.values()].sort((x, y) => x.key.localeCompare(y.key)),
  };
}

export function mergeWorkRateResearchCooldownDataKey(local: unknown, cloud: unknown): unknown {
  return mergeWorkRateResearchCooldownStore(local, cloud);
}

export function workRateResearchIdentityKey(workId: string, unit: WgdomCostUnit): string {
  return buildWorkRateIdentityKey(workId, unit);
}

export function clearWorkRateResearchAntiStormState(): void {
  cooldownUntilByKey.clear();
  inFlightByKey.clear();
  cooldownMemory = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(WORK_RATE_RESEARCH_COOLDOWN_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Clear process Maps only — keep durable LS (reload simulation). */
export function clearWorkRateResearchProcessMapsForTests(): void {
  cooldownUntilByKey.clear();
  inFlightByKey.clear();
}

export function isWorkRateResearchInCooldown(
  workId: string,
  unit: WgdomCostUnit,
  nowMs = Date.now(),
): boolean {
  const key = workRateResearchIdentityKey(workId, unit);
  let until = cooldownUntilByKey.get(key) ?? 0;
  if (until <= nowMs) {
    // durable fallback after process Map clear
    const durable = loadCooldownDurable().entries.find((e) => e.key === key);
    until = durable?.cooldownUntilMs ?? 0;
    if (until > nowMs) cooldownUntilByKey.set(key, until);
  }
  return until > nowMs;
}

export function markWorkRateResearchCooldown(
  workId: string,
  unit: WgdomCostUnit,
  nowMs = Date.now(),
  cooldownMs = WORK_RATE_RESEARCH_COOLDOWN_MS,
  evidenceHash: string | null = null,
): void {
  const key = workRateResearchIdentityKey(workId, unit);
  const until = nowMs + cooldownMs;
  cooldownUntilByKey.set(key, until);
  const store = loadCooldownDurable();
  const entry: WorkRateResearchCooldownEntry = {
    key,
    workId: String(workId),
    unit: String(unit),
    cooldownUntilMs: until,
    lastVerifiedAt: new Date(nowMs).toISOString(),
    evidenceHash,
  };
  const idx = store.entries.findIndex((e) => e.key === key);
  const entries = store.entries.slice();
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  saveCooldownDurable({ ...store, entries });
}

export function isWorkRateResearchInFlight(workId: string, unit: WgdomCostUnit): boolean {
  return inFlightByKey.has(workRateResearchIdentityKey(workId, unit));
}

/**
 * Single-flight: równoległe wywołania tej samej roboty dzielą ten sam Promise.
 */
export async function runWorkRateResearchSingleFlight<T>(
  workId: string,
  unit: WgdomCostUnit,
  run: () => Promise<T>,
): Promise<T> {
  const key = workRateResearchIdentityKey(workId, unit);
  const existing = inFlightByKey.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = run().finally(() => {
    inFlightByKey.delete(key);
  });
  inFlightByKey.set(key, p);
  return p;
}

/** Dedupe listy identity — max jedna pozycja na workId|unit. */
export function dedupeWorkRateResearchTargets<T extends { workId: string; unit: WgdomCostUnit }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = workRateResearchIdentityKey(item.workId, item.unit);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
