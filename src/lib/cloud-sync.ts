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

type DayLike = {
  active?: boolean;
  from?: string;
  to?: string;
  extraHours?: unknown[];
  notes?: unknown[];
  zaliczka?: string;
};

function dayRichness(d: DayLike | undefined): number {
  if (!d) return 0;
  let s = 0;
  if (d.active) s += 2;
  if (d.from || d.to) s += 1;
  s += (d.extraHours?.length ?? 0) * 8;
  s += (d.notes?.length ?? 0) * 4;
  if (parseFloat(String(d.zaliczka || "")) > 0) s += 1;
  return s;
}

/** Im wyżej, tym więcej godzin / Sob.pr. / dodatkowych wpisów. */
export function weekEmployeeRichness(emp: unknown): number {
  if (!emp || typeof emp !== "object") return 0;
  const e = emp as Record<string, unknown>;
  let s = 0;
  const days = e.days as Record<string, DayLike> | undefined;
  if (days) {
    for (const d of Object.values(days)) s += dayRichness(d);
  }
  s += dayRichness(e.prevSaturday as DayLike);
  s += ((e.extraCosts as unknown[])?.length ?? 0) * 3;
  return s;
}

export function weekEmployeesListRichness(list: unknown): number {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, e) => sum + weekEmployeeRichness(e), 0);
}

/** Scal listę płac tygodnia — po id pracownika, zachowaj bogatszą wersję. */
export function mergeWeekEmployees(local: unknown[], cloud: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: string }).id || "");
      if (!id) continue;
      const prev = map.get(id);
      if (!prev || weekEmployeeRichness(item) >= weekEmployeeRichness(prev)) {
        map.set(id, item);
      }
    }
  };
  ingest(Array.isArray(local) ? local : []);
  ingest(Array.isArray(cloud) ? cloud : []);
  return [...map.values()];
}

/** Scal archiwum tygodni — po id lub weekFrom|weekTo, zachowaj pełniejszy snapshot. */
export function mergeArchive(local: unknown[], cloud: unknown[]): unknown[] {
  type W = { id?: string; weekFrom?: string; weekTo?: string; weekEmployees?: unknown[] };
  const map = new Map<string, W>();
  const keyOf = (w: W) => (w.id ? w.id : `${w.weekFrom}|${w.weekTo}`);
  const score = (w: W) => {
    const we = w.weekEmployees;
    const richness = Array.isArray(we) ? weekEmployeesListRichness(we) : 0;
    return richness + (Array.isArray(we) ? we.length * 5 : 0);
  };
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      const w = item as W;
      if (!w?.weekFrom) continue;
      const k = keyOf(w);
      const prev = map.get(k);
      if (!prev || score(w) >= score(prev)) map.set(k, w);
    }
  };
  ingest(Array.isArray(local) ? local : []);
  ingest(Array.isArray(cloud) ? cloud : []);
  return [...map.values()].sort((a, b) => (b.weekFrom || "").localeCompare(a.weekFrom || ""));
}

export function normalizeArrayValue(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function sanitizeValueForCloud(key: string, value: unknown): unknown {
  if (key === "kw-jobs") return normalizeJobsValue(value);
  if (key === "kw-week-employees" || key === "kw-archive") return normalizeArrayValue(value);
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

/** Przywróć listę płac / archiwum z kopii chmurowej (prev / prev2). */
export async function restoreCloudPayrollBackup(
  source: "prev" | "prev2" = "prev",
): Promise<{ employees: number; archiveWeeks: number }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-payroll-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore payroll failed (${res.status})`);
  }
  return { employees: data.employees as number, archiveWeeks: data.archiveWeeks as number };
}

export interface PayrollBackupStatus {
  employees: number;
  employeesPrev: number;
  employeesPrev2: number;
  archiveWeeks: number;
  archivePrev: number;
  archivePrev2: number;
}

export async function fetchPayrollBackupStatus(): Promise<PayrollBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/payroll-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return {
    employees: data.employees,
    employeesPrev: data.employeesPrev,
    employeesPrev2: data.employeesPrev2,
    archiveWeeks: data.archiveWeeks,
    archivePrev: data.archivePrev,
    archivePrev2: data.archivePrev2,
  };
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
