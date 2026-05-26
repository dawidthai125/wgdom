import {
  supabaseProjectId,
  supabaseAnonKey,
  supabaseFunctionsBase,
  isSupabaseConfigured,
} from "@/config/supabase";
import { mergeJobDocuments, mergeJobFiles } from "@/lib/job-documents";

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
export const ADMIN_PASSWORDS_KEY = "kw-admin-passwords";
export const ADMIN_USERS_CONFIG_KEY = "kw-admin-users-config";
export const INSPECTOR_STATS_KEY = "kw-inspector-stats";

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

function jobMergeScore(j: {
  workEntries?: unknown[];
  photos?: unknown[];
  jobFiles?: unknown[];
  activityLog?: unknown[];
}): number {
  return (
    (j.workEntries?.length ?? 0)
    + (j.photos?.length ?? 0)
    + (j.jobFiles?.length ?? 0) * 4
    + (j.activityLog?.length ?? 0)
  );
}

function mergeActivityLogs(
  a: { id: string; at: string }[] | undefined,
  b: { id: string; at: string }[] | undefined,
): { id: string; at: string }[] {
  const map = new Map<string, { id: string; at: string }>();
  for (const ev of [...(a || []), ...(b || [])]) {
    if (ev?.id) map.set(ev.id, ev);
  }
  return [...map.values()]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 200);
}

export const JOBS_DELETED_IDS_KEY = "kw-jobs-deleted-ids";
export const DIRECTORY_DELETED_IDS_KEY = "kw-directory-deleted-ids";

function jobIdOf(j: unknown): string | undefined {
  if (!j || typeof j !== "object" || !("id" in j)) return undefined;
  return String((j as { id: string }).id);
}

export function normalizeDeletedJobIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function getDeletedJobIds(): string[] {
  try {
    const raw = localStorage.getItem(JOBS_DELETED_IDS_KEY);
    if (!raw) return [];
    return normalizeDeletedJobIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDeletedJobIds(ids: string[]): void {
  try {
    localStorage.setItem(JOBS_DELETED_IDS_KEY, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function addDeletedJobId(id: string): string[] {
  const next = [...new Set([...getDeletedJobIds(), id])].slice(-500);
  saveDeletedJobIds(next);
  return next;
}

export function mergeDeletedJobIds(local: string[], cloud: string[]): string[] {
  return [...new Set([...local, ...cloud])].slice(-500);
}

function dirIdOf(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("id" in item)) return undefined;
  return String((item as { id: string }).id);
}

export function normalizeDeletedDirectoryIds(raw: unknown): string[] {
  return normalizeDeletedJobIds(raw);
}

export function getDeletedDirectoryIds(): string[] {
  try {
    const raw = localStorage.getItem(DIRECTORY_DELETED_IDS_KEY);
    if (!raw) return [];
    return normalizeDeletedDirectoryIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDeletedDirectoryIds(ids: string[]): void {
  try {
    localStorage.setItem(DIRECTORY_DELETED_IDS_KEY, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function addDeletedDirectoryId(id: string): string[] {
  const next = [...new Set([...getDeletedDirectoryIds(), id])].slice(-500);
  saveDeletedDirectoryIds(next);
  return next;
}

export function mergeDeletedDirectoryIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

function filterDeletedDirectory(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((item) => {
    const id = dirIdOf(item);
    return id && !deleted.has(id);
  });
}

function filterDeletedJobs(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((j) => {
    const id = jobIdOf(j);
    return id && !deleted.has(id);
  });
}

/** Scal roboty po id — nie gub starszych wpisów gdy chmura ma mniej danych. */
export function mergeJobsById(local: unknown[], cloud: unknown[], deletedJobIds: string[] = []): unknown[] {
  type J = {
    id?: string;
    workEntries?: unknown[];
    photos?: unknown[];
    startDate?: string;
    documents?: Record<string, boolean>;
    jobFiles?: import("@/lib/job-documents").JobFileAttachment[];
    activityLog?: { id: string; at: string }[];
  };
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
      const winnerFirst = jobMergeScore(j) >= jobMergeScore(prev);
      const pick = winnerFirst ? { ...prev, ...j } : { ...j, ...prev };
      map.set(j.id, {
        ...pick,
        documents: mergeJobDocuments(prev.documents, j.documents),
        jobFiles: mergeJobFiles(prev.jobFiles, j.jobFiles),
        activityLog: mergeActivityLogs(prev.activityLog, j.activityLog),
      });
    }
  };
  ingest(filterDeletedJobs(cloud, deletedJobIds));
  ingest(filterDeletedJobs(local, deletedJobIds));
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

function recordRichness(obj: unknown): number {
  if (!obj || typeof obj !== "object") return 0;
  let s = 0;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (typeof v === "string" && v.trim()) s += 1;
    if (typeof v === "number") s += 1;
    if (typeof v === "boolean") s += 0.5;
    if (Array.isArray(v)) s += v.length * 2;
    if (typeof v === "object") s += recordRichness(v) * 0.25;
  }
  return s;
}

/** Scal tablice obiektów po id — bogatszy wpis wygrywa. */
export function mergeRecordsById(local: unknown[], cloud: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const id = String((item as { id?: string }).id || "");
      if (!id) continue;
      const prev = map.get(id);
      if (!prev || recordRichness(item) >= recordRichness(prev)) {
        map.set(id, item);
      }
    }
  };
  ingest(Array.isArray(local) ? local : []);
  ingest(Array.isArray(cloud) ? cloud : []);
  return [...map.values()];
}

/** Kontakty — scal + zachowaj uprawnienia (OR). */
export function mergeContacts(local: unknown[], cloud: unknown[]): unknown[] {
  const map = new Map<string, Record<string, unknown>>();
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown> & { id?: string; allowJobs?: boolean; allowPayroll?: boolean };
      const id = String(c.id || "");
      if (!id) continue;
      const prev = map.get(id);
      if (!prev) {
        map.set(id, { ...c });
        continue;
      }
      const pick = recordRichness(c) >= recordRichness(prev) ? c : prev;
      map.set(id, {
        ...prev,
        ...pick,
        allowJobs: c.allowJobs !== false || prev.allowJobs !== false,
        allowPayroll: c.allowPayroll === true || prev.allowPayroll === true,
      });
    }
  };
  ingest(Array.isArray(local) ? local : []);
  ingest(Array.isArray(cloud) ? cloud : []);
  return [...map.values()];
}

/** Kartoteka: lokalna lista decyduje o składzie; pola scalane po id (bogatszy wygrywa). Usunięci — tombstones. */
export function mergeDirectory(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedDirectoryIds(),
): unknown[] {
  const localArr = filterDeletedDirectory(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedDirectory(normalizeArrayValue(cloud), deletedIds);
  const cloudMap = new Map<string, unknown>();
  for (const item of cloudArr) {
    const id = dirIdOf(item);
    if (id) cloudMap.set(id, item);
  }
  const localIds = new Set<string>();
  const result: unknown[] = [];
  for (const item of localArr) {
    const id = dirIdOf(item);
    if (!id) continue;
    localIds.add(id);
    const cloudItem = cloudMap.get(id);
    if (!cloudItem || recordRichness(item) >= recordRichness(cloudItem)) {
      result.push(item);
    } else {
      result.push(cloudItem);
    }
  }
  for (const [id, item] of cloudMap) {
    if (!localIds.has(id)) result.push(item);
  }
  return result;
}

function pickWeekRange(localFrom: unknown, localTo: unknown, cloudFrom: unknown, cloudTo: unknown, localEmps: unknown, cloudEmps: unknown): { from: string; to: string } {
  const lf = typeof localFrom === "string" ? localFrom : "";
  const cf = typeof cloudFrom === "string" ? cloudFrom : "";
  const lt = typeof localTo === "string" ? localTo : "";
  const ct = typeof cloudTo === "string" ? cloudTo : "";
  const localR = weekEmployeesListRichness(localEmps);
  const cloudR = weekEmployeesListRichness(cloudEmps);
  if (localR > cloudR + 1 && lf && lt) return { from: lf, to: lt };
  if (cloudR > localR + 1 && cf && ct) return { from: cf, to: ct };
  if (lf && lt) return { from: lf, to: lt };
  return { from: cf || lf, to: ct || lt };
}

/** Scal local + chmura dla jednego klucza danych. */
export function mergeDataKey(
  key: DataKey,
  local: unknown,
  cloud: unknown,
  deletedJobIds: string[] = getDeletedJobIds(),
  deletedDirectoryIds: string[] = getDeletedDirectoryIds(),
): unknown {
  switch (key) {
    case "kw-jobs":
      return mergeJobsById(normalizeJobsValue(local ?? []), normalizeJobsValue(cloud), deletedJobIds);
    case "kw-week-employees":
      return mergeWeekEmployees(normalizeArrayValue(local), normalizeArrayValue(cloud));
    case "kw-archive":
      return mergeArchive(normalizeArrayValue(local), normalizeArrayValue(cloud));
    case "kw-directory":
      return mergeDirectory(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedDirectoryIds);
    case "kw-contacts":
      return mergeContacts(normalizeArrayValue(local), normalizeArrayValue(cloud));
    case "kw-weekFrom":
    case "kw-weekTo":
      return typeof local === "string" && local ? local : (typeof cloud === "string" && cloud ? cloud : local ?? cloud);
    default:
      return local ?? cloud;
  }
}

/** Scal wszystkie klucze naraz (np. przed zapisem do chmury). */
export function mergeAllDataKeys(
  localValues: unknown[],
  cloudValues: unknown[],
  deletedJobIds: string[] = getDeletedJobIds(),
  deletedDirectoryIds: string[] = getDeletedDirectoryIds(),
): unknown[] {
  return DATA_KEYS.map((key, i) =>
    mergeDataKey(key, localValues[i], cloudValues[i], deletedJobIds, deletedDirectoryIds),
  );
}

/** Po merge weekFrom/weekTo — dopasuj do tygodnia z bogatszą listą płac. */
export function alignWeekRangeInMerged(merged: unknown[]): unknown[] {
  const out = [...merged];
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return out;
  const range = pickWeekRange(out[fromIdx], out[toIdx], out[fromIdx], out[toIdx], out[empIdx], out[empIdx]);
  if (range.from) out[fromIdx] = range.from;
  if (range.to) out[toIdx] = range.to;
  return out;
}

export function dataKeyRichness(key: DataKey, value: unknown): number {
  switch (key) {
    case "kw-jobs":
      return normalizeJobsValue(value).reduce((s, j) => s + jobMergeScore(j as { workEntries?: unknown[]; photos?: unknown[] }), 0) + normalizeJobsValue(value).length * 3;
    case "kw-week-employees":
      return weekEmployeesListRichness(value);
    case "kw-archive":
      return normalizeArrayValue(value).reduce((s, w) => s + recordRichness(w) + weekEmployeesListRichness((w as { weekEmployees?: unknown[] })?.weekEmployees), 0);
    case "kw-directory":
    case "kw-contacts":
      return normalizeArrayValue(value).reduce((s, e) => s + recordRichness(e), 0);
    default:
      return value != null && value !== "" ? 1 : 0;
  }
}

function sanitizeValueForCloud(key: string, value: unknown): unknown {
  if (key === "kw-jobs") return normalizeJobsValue(value);
  if (key === "kw-week-employees" || key === "kw-archive" || key === "kw-directory" || key === "kw-contacts") {
    return normalizeArrayValue(value);
  }
  return value;
}

/** Zapis wielu kluczy do Supabase KV (kolejność keys = kolejność values). */
export async function pushKeysToCloud(
  keys: string[],
  values: unknown[],
  options?: { replaceJobsKeys?: string[]; replaceDirectoryKeys?: string[] },
): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_*)");
  }
  const safeValues = keys.map((k, i) => sanitizeValueForCloud(k, values[i]));
  const res = await fetch(`${API_BASE}/batch-set`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({
      keys,
      values: safeValues,
      replaceJobsKeys: options?.replaceJobsKeys ?? [],
      replaceDirectoryKeys: options?.replaceDirectoryKeys ?? [],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`batch-set ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
  }
}

/** Natychmiastowy zapis po usunięciu roboty — z listą skasowanych id (tombstones). */
export async function pushJobsAfterDelete(jobs: unknown[], deletedIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  try {
    const [raw] = await fetchKeysFromCloud([JOBS_DELETED_IDS_KEY]);
    cloudDeleted = normalizeDeletedJobIds(raw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedJobIds(deletedIds, cloudDeleted);
  saveDeletedJobIds(mergedDeleted);
  await pushKeysToCloud(
    ["kw-jobs", JOBS_DELETED_IDS_KEY],
    [jobs, mergedDeleted],
    { replaceJobsKeys: ["kw-jobs"] },
  );
}

/** Wszystkie dane aplikacji naraz (kolejność jak DATA_KEYS). */
export async function pushAllDataToCloud(values: unknown[]): Promise<void> {
  await pushAllDataToCloudSafe(values);
}

/**
 * Bezpieczny zapis: pobierz chmurę → scal z lokalnym → zapisz scalone.
 * Chroni przed nadpisaniem pustszą wersją z innej karty / urządzenia.
 */
/** Natychmiastowy zapis kartoteki po usunięciu / edycji pracownika. */
export async function pushDirectoryToCloud(directory: unknown[]): Promise<void> {
  if (!isSupabaseConfigured() || !API_BASE) return;
  let cloudDeleted: string[] = [];
  let cloudDir: unknown[] = [];
  try {
    const [cloudRaw, deletedRaw] = await fetchKeysFromCloud(["kw-directory", DIRECTORY_DELETED_IDS_KEY]);
    cloudDir = normalizeArrayValue(cloudRaw);
    cloudDeleted = normalizeDeletedDirectoryIds(deletedRaw);
  } catch { /* offline */ }
  const mergedDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDeleted);
  saveDeletedDirectoryIds(mergedDeleted);
  const merged = mergeDirectory(directory, cloudDir, mergedDeleted);
  await pushKeysToCloud(
    ["kw-directory", DIRECTORY_DELETED_IDS_KEY],
    [merged, mergedDeleted],
    { replaceDirectoryKeys: ["kw-directory"] },
  );
}

export async function pushAllDataToCloudSafe(values: unknown[]): Promise<void> {
  const keys = [...DATA_KEYS];
  let cloudValues: unknown[] = keys.map(() => null);
  let cloudDeleted: string[] = [];
  let cloudDirDeleted: string[] = [];
  try {
    const fetched = await fetchKeysFromCloud([...keys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY]);
    cloudValues = fetched.slice(0, keys.length);
    cloudDeleted = normalizeDeletedJobIds(fetched[keys.length]);
    cloudDirDeleted = normalizeDeletedDirectoryIds(fetched[keys.length + 1]);
  } catch {
    /* offline */
  }
  const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
  saveDeletedJobIds(mergedDeleted);
  const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
  saveDeletedDirectoryIds(mergedDirDeleted);
  let merged = mergeAllDataKeys(values, cloudValues, mergedDeleted, mergedDirDeleted);
  merged = alignWeekRangeInMerged(merged);

  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  if (
    empIdx >= 0 &&
    archIdx >= 0 &&
    normalizeArrayValue(values[empIdx]).length === 0 &&
    normalizeArrayValue(values[archIdx]).some(
      (w) => weekEmployeesListRichness((w as { weekEmployees?: unknown[] })?.weekEmployees) >= 8,
    )
  ) {
    merged[empIdx] = [];
  }

  await pushKeysToCloud(
    [...keys, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY],
    [...merged, mergedDeleted, mergedDirDeleted],
    {
      replaceJobsKeys: ["kw-jobs"],
      replaceDirectoryKeys: ["kw-directory"],
    },
  );
}

/** Zapis wielu kluczy z merge względem chmury. */
export async function pushKeysToCloudSafe(keys: string[], values: unknown[]): Promise<void> {
  let cloudValues: unknown[] = keys.map(() => null);
  try {
    cloudValues = await fetchKeysFromCloud(keys);
  } catch { /* ignore */ }
  const merged = keys.map((key, i) =>
    isDataKey(key) ? mergeDataKey(key, values[i], cloudValues[i]) : values[i],
  );
  await pushKeysToCloud(keys, merged);
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

export interface FullDataBackupStatus {
  ok: boolean;
  keys: Record<string, { current: number; prev: number; prev2: number; richness: number }>;
  dailyBackupDate: string | null;
}

export async function fetchFullDataBackupStatus(): Promise<FullDataBackupStatus | null> {
  if (!isSupabaseConfigured() || !API_BASE) return null;
  const res = await fetch(`${API_BASE}/data-backup-status`, { headers: API_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.ok) return null;
  return data as FullDataBackupStatus;
}

/** Przywróć wszystkie dane firmy z kopii chmurowej (prev / prev2 / dziś). */
export async function restoreAllCloudDataBackup(
  source: "prev" | "prev2" | "today" = "prev",
): Promise<{ restoredKeys: string[] }> {
  if (!isSupabaseConfigured() || !API_BASE) {
    throw new Error("Brak konfiguracji Supabase");
  }
  const res = await fetch(`${API_BASE}/restore-data-backup`, {
    method: "POST",
    headers: API_HEADERS,
    body: JSON.stringify({ source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `restore failed (${res.status})`);
  }
  return { restoredKeys: (data.restoredKeys as string[]) || [] };
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
    (isDataKey(key) || key === ADMIN_HASH_KEY || key === ADMIN_PASSWORDS_KEY || key === ADMIN_USERS_CONFIG_KEY || key === INSPECTOR_STATS_KEY);
  if (shouldSync) {
    await pushKeyToCloud(key, value);
  }
}
