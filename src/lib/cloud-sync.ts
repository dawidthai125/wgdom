import {
  supabaseProjectId,
  supabaseAnonKey,
  supabaseFunctionsBase,
  isSupabaseConfigured,
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

/** kw-jobs musi być tablicą — w chmurze czasem lądował pojedynczy obiekt. */
export function normalizeJobsValue(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && "id" in (raw as object)) return [raw];
  return [];
}

function jobMergeScore(j: { workEntries?: unknown[]; photos?: unknown[] }): number {
  return (j.workEntries?.length ?? 0) + (j.photos?.length ?? 0);
}

/** Scal roboty po id — nie gub starszych wpisów gdy chmura ma mniej danych. */
export function mergeJobsById(local: unknown[], cloud: unknown[]): unknown[] {
  type J = { id?: string; workEntries?: unknown[]; photos?: unknown[]; startDate?: string };
  const map = new Map<string, J>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      const j = item as J;
      if (!j?.id) continue;
      const prev = map.get(j.id);
      if (!prev) {
        map.set(j.id, j);
        continue;
      }
      const pick = jobMergeScore(j) >= jobMergeScore(prev) ? { ...prev, ...j } : prev;
      map.set(j.id, pick);
    }
  };
  ingest(cloud);
  ingest(local);
  return [...map.values()].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

function sanitizeValueForCloud(key: string, value: unknown): unknown {
  if (key === "kw-jobs") return normalizeJobsValue(value);
  return value;
}

/** Zapis wielu kluczy do Supabase KV (kolejność keys = kolejność values). */
export async function pushKeysToCloud(
  keys: string[],
  values: unknown[],
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_*)");
  }
  const safeValues = keys.map((k, i) => sanitizeValueForCloud(k, values[i]));
  const res = await fetch(`${API_BASE}/batch-set`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ keys, values: safeValues }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`batch-set ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
  }
}

/** Wszystkie dane aplikacji naraz (kolejność jak DATA_KEYS). */
export async function pushAllDataToCloud(values: unknown[]): Promise<void> {
  await pushKeysToCloud([...DATA_KEYS], values);
}

/** Pobranie wielu kluczy z chmury. */
export async function fetchKeysFromCloud(
  keys: string[],
): Promise<unknown[]> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_*)");
  }
  const res = await fetch(`${API_BASE}/batch-get`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get failed: ${res.status}`);
  const { values } = await res.json();
  return values as unknown[];
}

export interface JobsBackupStatus {
  current: number;
  prev: number;
  prev2: number;
  today: number;
}

export async function fetchJobsBackupStatus(): Promise<JobsBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/jobs-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return { current: data.current, prev: data.prev, prev2: data.prev2, today: data.today };
}

export async function restoreCloudJobsBackup(
  source: "prev" | "prev2" | "today" = "prev",
): Promise<{ count: number }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-jobs-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore failed (${res.status})`);
  }
  return { count: data.count as number };
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
