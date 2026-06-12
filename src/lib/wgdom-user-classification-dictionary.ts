/**
 * P2-G.2A — WGDOM User Classification Dictionary (uczenie z przetargów).
 * Chmura: kw-wgdom-classification-dictionary
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import { foldPolishText } from "@/lib/wgdom-ath-classifier";
import type { WgdomCostCategoryId } from "@/lib/wgdom-cost-catalog";
import { WGDOM_COST_CATEGORY_IDS } from "@/lib/wgdom-cost-catalog";

export const WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY = "kw-wgdom-classification-dictionary";

export type UserClassificationSource = "manual" | "imported";

export type UserClassificationCategory = Exclude<WgdomCostCategoryId, "UNKNOWN">;

export interface UserClassificationEntry {
  id: string;
  phrase: string;
  category: UserClassificationCategory;
  source: UserClassificationSource;
  updatedAt: string;
}

export interface WgdomUserClassificationDictionaryStore {
  schemaVersion: 1;
  entries: UserClassificationEntry[];
  updatedAt: string;
}

let _cache: WgdomUserClassificationDictionaryStore = defaultUserClassificationDictionaryStore();

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function newEntryId(): string {
  return `ucl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeClassificationPhrase(phrase: string): string {
  return foldPolishText(phrase.trim()).replace(/\s+/g, " ");
}

export function isUserClassificationCategory(
  value: string,
): value is UserClassificationCategory {
  return (WGDOM_COST_CATEGORY_IDS as readonly string[]).includes(value);
}

/** Fraza do zapisu z opisu pozycji ATH (skrót dla długich linii). */
export function phraseFromAthDescription(description: string): string {
  const folded = normalizeClassificationPhrase(description);
  if (!folded) return "";
  if (folded.length <= 96) return folded;
  const cut = folded.slice(0, 96);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim();
}

export function defaultUserClassificationDictionaryStore(): WgdomUserClassificationDictionaryStore {
  return {
    schemaVersion: 1,
    entries: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function normalizeWgdomUserClassificationDictionaryStore(
  raw: unknown,
): WgdomUserClassificationDictionaryStore {
  const base = defaultUserClassificationDictionaryStore();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<WgdomUserClassificationDictionaryStore>;
  const entries: UserClassificationEntry[] = [];
  const seen = new Set<string>();

  if (Array.isArray(r.entries)) {
    for (const item of r.entries) {
      if (!item || typeof item !== "object") continue;
      const e = item as Partial<UserClassificationEntry>;
      const phrase = normalizeClassificationPhrase(String(e.phrase ?? ""));
      if (!phrase || phrase.length < 2 || seen.has(phrase)) continue;
      if (!isUserClassificationCategory(String(e.category ?? ""))) continue;
      seen.add(phrase);
      entries.push({
        id: typeof e.id === "string" && e.id ? e.id : newEntryId(),
        phrase,
        category: e.category as UserClassificationCategory,
        source: e.source === "imported" ? "imported" : "manual",
        updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : new Date().toISOString(),
      });
    }
  }

  entries.sort((a, b) => a.phrase.localeCompare(b.phrase, "pl"));

  return {
    schemaVersion: 1,
    entries,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
}

export function mergeWgdomUserClassificationDictionaryStore(
  local: unknown,
  cloud: unknown,
): WgdomUserClassificationDictionaryStore {
  const l = normalizeWgdomUserClassificationDictionaryStore(local);
  const c = normalizeWgdomUserClassificationDictionaryStore(cloud);
  const byPhrase = new Map<string, UserClassificationEntry>();

  for (const e of [...c.entries, ...l.entries]) {
    const key = e.phrase;
    const prev = byPhrase.get(key);
    if (!prev || ts(e.updatedAt) >= ts(prev.updatedAt)) {
      byPhrase.set(key, e);
    }
  }

  const entries = [...byPhrase.values()].sort((a, b) => a.phrase.localeCompare(b.phrase, "pl"));
  return {
    schemaVersion: 1,
    entries,
    updatedAt: new Date(Math.max(ts(l.updatedAt), ts(c.updatedAt), Date.now())).toISOString(),
  };
}

export function setUserClassificationDictionaryCache(
  store: WgdomUserClassificationDictionaryStore,
): void {
  _cache = normalizeWgdomUserClassificationDictionaryStore(store);
}

export function getUserClassificationDictionaryCache(): WgdomUserClassificationDictionaryStore {
  return _cache;
}

/** Dopasowanie słownika użytkownika (sync — wymaga wcześniejszego cache). */
export function matchUserClassificationDictionary(
  foldedHaystack: string,
): UserClassificationCategory | null {
  if (!foldedHaystack.trim()) return null;
  const entries = [..._cache.entries].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const e of entries) {
    if (foldedHaystack.includes(e.phrase)) return e.category;
  }
  return null;
}

export function loadWgdomUserClassificationDictionaryStoreLocal(): WgdomUserClassificationDictionaryStore {
  try {
    const raw = localStorage.getItem(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY);
    if (!raw) return defaultUserClassificationDictionaryStore();
    const normalized = normalizeWgdomUserClassificationDictionaryStore(JSON.parse(raw));
    setUserClassificationDictionaryCache(normalized);
    return normalized;
  } catch {
    return defaultUserClassificationDictionaryStore();
  }
}

export async function loadWgdomUserClassificationDictionaryStore(): Promise<WgdomUserClassificationDictionaryStore> {
  try {
    const local = loadWgdomUserClassificationDictionaryStoreLocal();
    const [cloud] = await fetchKeysFromCloud([WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY]);
    if (cloud == null || typeof cloud !== "object") return local;
    const merged = mergeWgdomUserClassificationDictionaryStore(local, cloud);
    localStorage.setItem(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, JSON.stringify(merged));
    setUserClassificationDictionaryCache(merged);
    return merged;
  } catch {
    return loadWgdomUserClassificationDictionaryStoreLocal();
  }
}

export async function saveWgdomUserClassificationDictionaryStore(
  store: WgdomUserClassificationDictionaryStore,
): Promise<void> {
  const next = normalizeWgdomUserClassificationDictionaryStore({
    ...store,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
  });
  localStorage.setItem(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, JSON.stringify(next));
  setUserClassificationDictionaryCache(next);
  await persistKey(WGDOM_USER_CLASSIFICATION_DICTIONARY_KEY, next);
}

export function restoreDefaultUserClassificationDictionaryStore(): WgdomUserClassificationDictionaryStore {
  const empty = defaultUserClassificationDictionaryStore();
  setUserClassificationDictionaryCache(empty);
  return empty;
}

export function addUserClassificationEntry(
  store: WgdomUserClassificationDictionaryStore,
  phrase: string,
  category: UserClassificationCategory,
  source: UserClassificationSource = "manual",
): WgdomUserClassificationDictionaryStore {
  const normalized = normalizeClassificationPhrase(phrase);
  if (!normalized) return store;
  const now = new Date().toISOString();
  const without = store.entries.filter((e) => e.phrase !== normalized);
  const entry: UserClassificationEntry = {
    id: newEntryId(),
    phrase: normalized,
    category,
    source,
    updatedAt: now,
  };
  return normalizeWgdomUserClassificationDictionaryStore({
    schemaVersion: 1,
    entries: [...without, entry],
    updatedAt: now,
  });
}

export function updateUserClassificationEntry(
  store: WgdomUserClassificationDictionaryStore,
  id: string,
  patch: Partial<Pick<UserClassificationEntry, "phrase" | "category" | "source">>,
): WgdomUserClassificationDictionaryStore {
  const now = new Date().toISOString();
  const entries = store.entries.map((e) => {
    if (e.id !== id) return e;
    const phrase = patch.phrase != null ? normalizeClassificationPhrase(patch.phrase) : e.phrase;
    const category = patch.category && isUserClassificationCategory(patch.category)
      ? patch.category
      : e.category;
    const source = patch.source === "imported" || patch.source === "manual" ? patch.source : e.source;
    return { ...e, phrase, category, source, updatedAt: now };
  });
  return normalizeWgdomUserClassificationDictionaryStore({
    schemaVersion: 1,
    entries,
    updatedAt: now,
  });
}

export function removeUserClassificationEntry(
  store: WgdomUserClassificationDictionaryStore,
  id: string,
): WgdomUserClassificationDictionaryStore {
  return normalizeWgdomUserClassificationDictionaryStore({
    ...store,
    entries: store.entries.filter((e) => e.id !== id),
    updatedAt: new Date().toISOString(),
  });
}

export function assignUserCategoryFromAthLine(
  store: WgdomUserClassificationDictionaryStore,
  description: string,
  category: UserClassificationCategory,
): WgdomUserClassificationDictionaryStore {
  const phrase = phraseFromAthDescription(description);
  return addUserClassificationEntry(store, phrase, category, "manual");
}
