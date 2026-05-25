import {
  supabaseProjectId,
  supabaseAnonKey,
  supabaseFunctionsBase,
} from "@/config/supabase";

/** Klucze danych biznesowych — każdy nowy typ zapisu MUSI być tutaj. */
export const DATA_KEYS = [
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-contacts",
] as const;

export type DataKey = (typeof DATA_KEYS)[number];

export const ADMIN_HASH_KEY = "kw-admin-hash";

export const API_BASE = supabaseFunctionsBase;

export const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${supabaseAnonKey}`,
};

export function isDataKey(key: string): key is DataKey {
  return (DATA_KEYS as readonly string[]).includes(key);
}

/** Zapis wielu kluczy do Supabase KV (kolejność keys = kolejność values). */
export async function pushKeysToCloud(
  keys: string[],
  values: unknown[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/batch-set`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ keys, values }),
  });
  if (!res.ok) throw new Error(`batch-set failed: ${res.status}`);
}

/** Wszystkie dane aplikacji naraz (kolejność jak DATA_KEYS). */
export async function pushAllDataToCloud(values: unknown[]): Promise<void> {
  await pushKeysToCloud([...DATA_KEYS], values);
}

/** Pobranie wielu kluczy z chmury. */
export async function fetchKeysFromCloud(
  keys: string[],
): Promise<unknown[]> {
  const res = await fetch(`${API_BASE}/batch-get`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get failed: ${res.status}`);
  const { values } = await res.json();
  return values as unknown[];
}

/** Zapis jednego klucza — używaj przy pilnych zmianach (np. zdjęcia pracownika). */
export async function pushKeyToCloud(
  key: string,
  value: unknown,
): Promise<void> {
  await pushKeysToCloud([key], [value]);
}

/** Zapis do localStorage + chmura (gdy klucz jest w DATA_KEYS lub ADMIN_HASH_KEY). */
export async function persistKey(
  key: string,
  value: unknown,
  options?: { cloud?: boolean },
): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
  const shouldSync =
    options?.cloud !== false &&
    (isDataKey(key) || key === ADMIN_HASH_KEY);
  if (shouldSync) {
    await pushKeyToCloud(key, value);
  }
}
