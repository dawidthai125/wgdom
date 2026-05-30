import {
  supabaseProjectId,
  supabaseAnonKey,
  supabaseFunctionsBase,
  isSupabaseConfigured,
} from "@/config/supabase";
import { mergeJobFiles, mergeJobsDocumentsOnConflict, mergeReportDocSaOverrideOnConflict } from "@/lib/job-documents";
import { mergeJobNotes, mergeInspectorPhotos, mergeHandoverStage, mergePlannedHandoverDate } from "@/lib/job-wm";
import { mergeHiddenInspectorFeedIds } from "@/lib/job-activity";
import {
  mergeTenderDataKey,
  TENDERS_PIPELINE_KEY,
  TENDERS_COMPANY_PROFILE_KEY,
  TENDERS_CUSTOM_KEYWORDS_KEY,
  TENDERS_DELETED_IDS_KEY,
} from "@/lib/tenders-sync";

/** Klucze danych biznesowych — każdy nowy typ zapisu MUSI być tutaj. */
export const DATA_KEYS = [
  "kw-directory",
  "kw-week-employees",
  "kw-archive",
  "kw-weekFrom",
  "kw-weekTo",
  "kw-jobs",
  "kw-contacts",
  "kw-tenders-pipeline",
  "kw-tenders-company-profile",
  "kw-tenders-custom-keywords",
] as const;

export type DataKey = (typeof DATA_KEYS)[number];

export const ADMIN_HASH_KEY = "kw-admin-hash";
export const ADMIN_PASSWORDS_KEY = "kw-admin-passwords";
export const ADMIN_USERS_CONFIG_KEY = "kw-admin-users-config";
export const INSPECTOR_STATS_KEY = "kw-inspector-stats";
export const APP_SETTINGS_KEY = "kw-app-settings";

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
  jobNotes?: unknown[];
  inspectorPhotos?: unknown[];
}): number {
  return (
    (j.workEntries?.length ?? 0)
    + (j.photos?.length ?? 0)
    + (j.jobFiles?.length ?? 0) * 4
    + (j.activityLog?.length ?? 0)
    + (j.jobNotes?.length ?? 0) * 2
    + (j.inspectorPhotos?.length ?? 0) * 2
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
export const CONTACTS_DELETED_IDS_KEY = "kw-contacts-deleted-ids";
export const ARCHIVE_DELETED_IDS_KEY = "kw-archive-deleted-ids";

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

function recordIdOf(item: unknown): string | undefined {
  if (!item || typeof item !== "object" || !("id" in item)) return undefined;
  return String((item as { id: string }).id);
}

function getDeletedIdsFromKey(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return normalizeDeletedJobIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveDeletedIdsToKey(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(-500)));
  } catch { /* ignore */ }
}

export function getDeletedContactsIds(): string[] {
  return getDeletedIdsFromKey(CONTACTS_DELETED_IDS_KEY);
}

export function saveDeletedContactsIds(ids: string[]): void {
  saveDeletedIdsToKey(CONTACTS_DELETED_IDS_KEY, ids);
}

export function addDeletedContactId(id: string): string[] {
  const next = [...new Set([...getDeletedContactsIds(), id])].slice(-500);
  saveDeletedContactsIds(next);
  return next;
}

export function mergeDeletedContactsIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

export function getDeletedArchiveIds(): string[] {
  return getDeletedIdsFromKey(ARCHIVE_DELETED_IDS_KEY);
}

export function saveDeletedArchiveIds(ids: string[]): void {
  saveDeletedIdsToKey(ARCHIVE_DELETED_IDS_KEY, ids);
}

export function addDeletedArchiveId(id: string): string[] {
  const next = [...new Set([...getDeletedArchiveIds(), id])].slice(-500);
  saveDeletedArchiveIds(next);
  return next;
}

export function mergeDeletedArchiveIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedJobIds(local, cloud);
}

function filterDeletedByRecordId(list: unknown[], deletedIds: string[]): unknown[] {
  if (deletedIds.length === 0) return list;
  const deleted = new Set(deletedIds);
  return list.filter((item) => {
    const id = recordIdOf(item);
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

function parseRecordTs(v: unknown): number {
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function jobUpdatedTs(j: {
  updatedAt?: string;
  activityLog?: { at: string }[];
  startDate?: string;
}): number {
  const direct = parseRecordTs(j.updatedAt);
  if (direct) return direct;
  if (Array.isArray(j.activityLog)) {
    let max = 0;
    for (const ev of j.activityLog) max = Math.max(max, parseRecordTs(ev.at));
    if (max) return max;
  }
  return parseRecordTs(j.startDate);
}

/** Scal roboty po id — nie gub starszych wpisów; przy konflikcie wygrywa nowszy updatedAt. */
export function mergeJobsById(local: unknown[], cloud: unknown[], deletedJobIds: string[] = []): unknown[] {
  type J = {
    id?: string;
    updatedAt?: string;
    workEntries?: unknown[];
    photos?: unknown[];
    startDate?: string;
    documents?: Record<string, boolean>;
    reportDocSaOverride?: import("@/lib/job-documents").ReportDocSaOverride;
    jobFiles?: import("@/lib/job-documents").JobFileAttachment[];
    activityLog?: { id: string; at: string }[];
    jobNotes?: import("@/lib/job-wm").JobNote[];
    inspectorPhotos?: import("@/lib/job-wm").InspectorPhotoEntry[];
    handoverStage?: string;
    plannedHandoverDate?: string;
    hiddenInspectorFeedIds?: string[];
  };
  const map = new Map<string, J>();
  const mergePair = (prev: J, j: J): J => {
    const prevTs = jobUpdatedTs(prev);
    const jTs = jobUpdatedTs(j);
    let newer: J;
    let older: J;
    if (jTs >= prevTs) {
      newer = j;
      older = prev;
    } else {
      newer = prev;
      older = j;
    }
    if (prevTs === jTs) {
      const winnerFirst = jobMergeScore(j) >= jobMergeScore(prev);
      newer = winnerFirst ? j : prev;
      older = winnerFirst ? prev : j;
    }
    const pick = { ...older, ...newer };
    const mergedLogs = mergeActivityLogs(prev.activityLog, j.activityLog);
    const hiddenInspectorFeedIds = mergeHiddenInspectorFeedIds(
      prev.hiddenInspectorFeedIds,
      j.hiddenInspectorFeedIds,
    );
    const latestTs = new Date(Math.max(prevTs, jTs, Date.now())).toISOString();
    return {
      ...pick,
      documents: mergeJobsDocumentsOnConflict(prev, j),
      reportDocSaOverride: mergeReportDocSaOverrideOnConflict(prev, j),
      jobFiles: jTs !== prevTs
        ? (jTs >= prevTs ? (j.jobFiles || []) : (prev.jobFiles || []))
        : mergeJobFiles(prev.jobFiles, j.jobFiles),
      activityLog: mergedLogs,
      jobNotes: mergeJobNotes(prev.jobNotes, j.jobNotes),
      inspectorPhotos: jTs !== prevTs
        ? (jTs >= prevTs ? (j.inspectorPhotos || []) : (prev.inspectorPhotos || []))
        : mergeInspectorPhotos(prev.inspectorPhotos, j.inspectorPhotos),
      plannedHandoverDate: mergePlannedHandoverDate(prev.plannedHandoverDate, j.plannedHandoverDate),
      handoverStage: mergeHandoverStage(
        prev.handoverStage as import("@/lib/job-wm").JobHandoverStage | undefined,
        j.handoverStage as import("@/lib/job-wm").JobHandoverStage | undefined,
        mergedLogs as { type: string; at: string; text: string }[],
      ) || pick.handoverStage,
      hiddenInspectorFeedIds,
      updatedAt: newer.updatedAt ?? older.updatedAt ?? latestTs,
    };
  };
  const ingest = (list: unknown[]) => {
    for (const item of list) {
      const j = item as J;
      if (!j?.id) continue;
      const prev = map.get(j.id);
      if (!prev) {
        map.set(j.id, j);
        continue;
      }
      map.set(j.id, mergePair(prev, j));
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

function pickRateByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): unknown {
  const lAt = parseRecordTs(l.rateUpdatedAt);
  const cAt = parseRecordTs(c.rateUpdatedAt);
  if (lAt && cAt && lAt !== cAt) return lAt > cAt ? l.rate : c.rate;
  if (lAt && !cAt) return l.rate;
  if (cAt && !lAt) return c.rate;
  if (c.rate !== undefined && String(c.rate).trim() !== "") return c.rate;
  if (l.rate !== undefined && String(l.rate).trim() !== "") return l.rate;
  return c.rate;
}

function pickSettledByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): boolean {
  const lAt = parseRecordTs(l.settledUpdatedAt);
  const cAt = parseRecordTs(c.settledUpdatedAt);
  if (lAt > 0 || cAt > 0) {
    if (lAt >= cAt) return Boolean(l.settled);
    return Boolean(c.settled);
  }
  // Legacy (bez settledUpdatedAt): nie tracimy rozliczeń z innej karty / admina
  return Boolean(l.settled) || Boolean(c.settled);
}

function pickDaysByTimestamps(l: Record<string, unknown>, c: Record<string, unknown>): Record<string, DayLike> {
  const lDays = (l.days as Record<string, DayLike>) || {};
  const cDays = (c.days as Record<string, DayLike>) || {};
  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  if (lAt > cAt) return { ...cDays, ...lDays };
  if (cAt > lAt) return { ...lDays, ...cDays };
  return { ...lDays, ...cDays };
}

function pickPrevSaturdayByTimestamps(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
): DayLike | undefined {
  const lps = l.prevSaturday as DayLike | undefined;
  const cps = c.prevSaturday as DayLike | undefined;
  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  if (lAt > cAt) return lps !== undefined ? lps : cps;
  if (cAt > lAt) return cps !== undefined ? cps : lps;
  return cps !== undefined ? cps : lps;
}

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

/** Scal dwa wpisy tego samego pracownika — stawka i godziny osobno (rateUpdatedAt / dataUpdatedAt). */
export function mergeWeekEmployeeRecord(local: unknown, cloud: unknown): unknown {
  const l = local as Record<string, unknown>;
  const c = cloud as Record<string, unknown>;

  const days = pickDaysByTimestamps(l, c);
  const prevSaturday = pickPrevSaturdayByTimestamps(l, c);

  const lAt = parseRecordTs(l.dataUpdatedAt);
  const cAt = parseRecordTs(c.dataUpdatedAt);
  const extraCosts =
    lAt >= cAt
      ? Array.isArray(l.extraCosts)
        ? l.extraCosts
        : Array.isArray(c.extraCosts)
          ? c.extraCosts
          : []
      : Array.isArray(c.extraCosts)
        ? c.extraCosts
        : Array.isArray(l.extraCosts)
          ? l.extraCosts
          : [];

  const rate = pickRateByTimestamps(l, c);
  const lRateAt = parseRecordTs(l.rateUpdatedAt);
  const cRateAt = parseRecordTs(c.rateUpdatedAt);
  const dataWinner = lAt >= cAt ? l : c;

  return {
    ...c,
    ...l,
    ...dataWinner,
    days,
    prevSaturday,
    extraCosts,
    rate,
    rateUpdatedAt: lRateAt >= cRateAt ? l.rateUpdatedAt ?? c.rateUpdatedAt : c.rateUpdatedAt ?? l.rateUpdatedAt,
    dataUpdatedAt: lAt >= cAt ? l.dataUpdatedAt ?? c.dataUpdatedAt : c.dataUpdatedAt ?? l.dataUpdatedAt,
    settled: pickSettledByTimestamps(l, c),
    settledUpdatedAt:
      parseRecordTs(l.settledUpdatedAt) >= parseRecordTs(c.settledUpdatedAt)
        ? l.settledUpdatedAt ?? c.settledUpdatedAt
        : c.settledUpdatedAt ?? l.settledUpdatedAt,
  };
}

/** Odczyt klucza danych z localStorage (między kartami / przed zapisem do chmury). */
export function readLocalStorageDataKey(key: DataKey): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Przed pushem do chmury — localStorage może być świeższy niż React (inna karta). stored wygrywa nad incoming. */
export function mergeIncomingWithStored(key: DataKey, stored: unknown, incoming: unknown): unknown {
  if (stored == null) return incoming;
  if (incoming == null) return stored;
  return mergeDataKey(key, stored, incoming);
}

/** Przed pushem do chmury — uwzględnij localStorage (inna karta mogła zapisać świeższe dane). */
export function prepareDataBundleForCloudPush(values: unknown[]): unknown[] {
  const prepared = [...values];
  for (let i = 0; i < DATA_KEYS.length; i++) {
    const key = DATA_KEYS[i];
    const stored = readLocalStorageDataKey(key);
    if (stored == null) continue;
    const incoming = prepared[i];
    const hasIncoming =
      incoming != null && !(Array.isArray(incoming) && incoming.length === 0) && incoming !== "";
    const hasStored =
      stored != null && !(Array.isArray(stored) && stored.length === 0) && stored !== "";
    if (!hasIncoming && !hasStored) continue;
    prepared[i] = mergeIncomingWithStored(key, stored, incoming);
  }
  return prepared;
}

/** Scal listę płac tygodnia — po id; odznaczenie dnia / stawka z bieżącej karty nie wraca z chmury. */
export function mergeWeekEmployees(local: unknown[], cloud: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  const localArr = Array.isArray(local) ? local : [];
  const cloudArr = Array.isArray(cloud) ? cloud : [];

  for (const item of localArr) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: string }).id || "");
    if (id) map.set(id, item);
  }
  for (const item of cloudArr) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: string }).id || "");
    if (!id) continue;
    const prev = map.get(id);
    map.set(id, prev ? mergeWeekEmployeeRecord(prev, item) : item);
  }
  return [...map.values()];
}

/** Scal archiwum tygodni — lokalna lista decyduje o składzie; usunięte tygodnie nie wracają z chmury. */
export function mergeArchive(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedArchiveIds(),
): unknown[] {
  type W = { id?: string; weekFrom?: string; weekTo?: string; savedAt?: string; weekEmployees?: unknown[] };
  const localArr = filterDeletedByRecordId(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedByRecordId(normalizeArrayValue(cloud), deletedIds);
  const keyOf = (w: W) => (w.id ? w.id : `${w.weekFrom}|${w.weekTo}`);
  const score = (w: W) => {
    const we = w.weekEmployees;
    const richness = Array.isArray(we) ? weekEmployeesListRichness(we) : 0;
    return richness + (Array.isArray(we) ? we.length * 5 : 0);
  };
  const mergeWeek = (a: W, b: W): W => {
    const aSaved = parseRecordTs(a.savedAt);
    const bSaved = parseRecordTs(b.savedAt);
    const winner = aSaved > bSaved ? a : bSaved > aSaved ? b : score(a) >= score(b) ? a : b;
    const other = winner === a ? b : a;
    return {
      ...other,
      ...winner,
      weekEmployees: mergeWeekEmployees(
        normalizeArrayValue(winner.weekEmployees),
        normalizeArrayValue(other.weekEmployees),
      ),
    };
  };
  const cloudMap = new Map<string, W>();
  for (const item of cloudArr) {
    const w = item as W;
    if (!w?.weekFrom) continue;
    cloudMap.set(keyOf(w), w);
  }
  const localKeys = new Set<string>();
  const result: W[] = [];
  for (const item of localArr) {
    const w = item as W;
    if (!w?.weekFrom) continue;
    const k = keyOf(w);
    localKeys.add(k);
    const cloudItem = cloudMap.get(k);
    result.push(cloudItem ? mergeWeek(w, cloudItem) : w);
  }
  for (const [k, item] of cloudMap) {
    if (!localKeys.has(k)) result.push(item);
  }
  return result.sort((a, b) => (b.weekFrom || "").localeCompare(a.weekFrom || ""));
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

function pickContactRecord(localItem: unknown, cloudItem: unknown | undefined): unknown {
  if (!cloudItem) return localItem;
  const l = localItem as Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  const c = cloudItem as Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  const lTs = parseRecordTs(l.updatedAt);
  const cTs = parseRecordTs(c.updatedAt);
  let pick: Record<string, unknown> & { allowJobs?: boolean; allowPayroll?: boolean };
  if (lTs && cTs && lTs !== cTs) {
    pick = lTs > cTs ? l : c;
  } else {
    pick = recordRichness(l) >= recordRichness(c) ? l : c;
  }
  return {
    ...l,
    ...c,
    ...pick,
    allowJobs: l.allowJobs !== false || c.allowJobs !== false,
    allowPayroll: l.allowPayroll === true || c.allowPayroll === true,
  };
}

/** Kontakty — lokalna lista decyduje o składzie; usunięte kontakty nie wracają z chmury. */
export function mergeContacts(
  local: unknown[],
  cloud: unknown[],
  deletedIds: string[] = getDeletedContactsIds(),
): unknown[] {
  const localArr = filterDeletedByRecordId(normalizeArrayValue(local), deletedIds);
  const cloudArr = filterDeletedByRecordId(normalizeArrayValue(cloud), deletedIds);
  const cloudMap = new Map<string, unknown>();
  for (const item of cloudArr) {
    const id = recordIdOf(item);
    if (id) cloudMap.set(id, item);
  }
  const localIds = new Set<string>();
  const result: unknown[] = [];
  for (const item of localArr) {
    const id = recordIdOf(item);
    if (!id) continue;
    localIds.add(id);
    result.push(pickContactRecord(item, cloudMap.get(id)));
  }
  for (const [id, item] of cloudMap) {
    if (!localIds.has(id)) result.push(item);
  }
  return result;
}

function pickDirectoryRecord(localItem: unknown, cloudItem: unknown | undefined): unknown {
  if (!cloudItem) return localItem;
  const l = localItem as Record<string, unknown>;
  const c = cloudItem as Record<string, unknown>;
  const lTs = parseRecordTs(l.updatedAt);
  const cTs = parseRecordTs(c.updatedAt);
  if (lTs && cTs && lTs !== cTs) return lTs > cTs ? localItem : cloudItem;
  return recordRichness(l) >= recordRichness(c) ? localItem : cloudItem;
}

/** Kartoteka: lokalna lista decyduje o składzie; pola scalane po id (nowszy updatedAt / bogatszy). */
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
    result.push(pickDirectoryRecord(item, cloudItem));
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
  deletedContactsIds: string[] = getDeletedContactsIds(),
  deletedArchiveIds: string[] = getDeletedArchiveIds(),
): unknown {
  switch (key) {
    case "kw-jobs":
      return mergeJobsById(normalizeJobsValue(local ?? []), normalizeJobsValue(cloud), deletedJobIds);
    case "kw-week-employees":
      return mergeWeekEmployees(normalizeArrayValue(local), normalizeArrayValue(cloud));
    case "kw-archive":
      return mergeArchive(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedArchiveIds);
    case "kw-directory":
      return mergeDirectory(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedDirectoryIds);
    case "kw-contacts":
      return mergeContacts(normalizeArrayValue(local), normalizeArrayValue(cloud), deletedContactsIds);
    case "kw-tenders-pipeline":
      return mergeTenderDataKey(TENDERS_PIPELINE_KEY, local, cloud);
    case "kw-tenders-company-profile":
      return mergeTenderDataKey(TENDERS_COMPANY_PROFILE_KEY, local, cloud);
    case "kw-tenders-custom-keywords":
      return mergeTenderDataKey(TENDERS_CUSTOM_KEYWORDS_KEY, local, cloud);
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
  deletedContactsIds: string[] = getDeletedContactsIds(),
  deletedArchiveIds: string[] = getDeletedArchiveIds(),
): unknown[] {
  return DATA_KEYS.map((key, i) =>
    mergeDataKey(
      key,
      localValues[i],
      cloudValues[i],
      deletedJobIds,
      deletedDirectoryIds,
      deletedContactsIds,
      deletedArchiveIds,
    ),
  );
}

/** Po merge weekFrom/weekTo — dopasuj do tygodnia z bogatszą listą płac (local vs chmura). */
export function alignWeekRangeInMerged(
  merged: unknown[],
  localValues: unknown[],
  cloudValues: unknown[],
): unknown[] {
  const out = [...merged];
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  if (empIdx < 0 || fromIdx < 0 || toIdx < 0) return out;
  const range = pickWeekRange(
    localValues[fromIdx],
    localValues[toIdx],
    cloudValues[fromIdx],
    cloudValues[toIdx],
    localValues[empIdx],
    cloudValues[empIdx],
  );
  if (range.from) out[fromIdx] = range.from;
  if (range.to) out[toIdx] = range.to;
  return out;
}

/** Przed pushem wybranych kluczy — uwzględnij localStorage (inna karta / admin). */
export function prepareKeysForCloudPush(keys: string[], values: unknown[]): unknown[] {
  return keys.map((key, i) => {
    if (!isDataKey(key)) return values[i];
    const stored = readLocalStorageDataKey(key);
    if (stored == null) return values[i];
    return mergeIncomingWithStored(key, stored, values[i]);
  });
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

/** Supabase JSONB NOT NULL — null psuje batch-set (np. kw-tenders-company-profile). */
export function coerceValueForCloudKey(key: string, value: unknown): unknown {
  if (value != null && value !== "") return value;
  if (key.endsWith("-deleted-ids")) return [];
  if (key === "kw-weekFrom" || key === "kw-weekTo") return "";
  if (key === TENDERS_COMPANY_PROFILE_KEY) return {};
  if (key === TENDERS_CUSTOM_KEYWORDS_KEY) {
    return { action: [], scope: [], exclude: [], learnedFromCount: 0, updatedAt: "" };
  }
  if (key.startsWith("kw-")) return [];
  return {};
}

function sanitizeValueForCloud(key: string, value: unknown): unknown {
  const coerced = coerceValueForCloudKey(key, value);
  if (key === "kw-jobs") return normalizeJobsValue(coerced);
  if (key === "kw-week-employees" || key === "kw-archive" || key === "kw-directory" || key === "kw-contacts") {
    return normalizeArrayValue(coerced);
  }
  return coerced;
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

/** Wszystkie dane aplikacji naraz (kolejność jak DATA_KEYS). Zwraca scalony bundle. */
export async function pushAllDataToCloud(values: unknown[]): Promise<unknown[]> {
  return pushAllDataToCloudSafe(values);
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

export async function computeMergedDataBundle(
  values: unknown[],
): Promise<{ merged: unknown[]; cloudReachable: boolean }> {
  const keys = [...DATA_KEYS];
  const valuesForMerge = prepareDataBundleForCloudPush(values);

  let cloudValues: unknown[] = keys.map(() => null);
  let cloudDeleted: string[] = [];
  let cloudDirDeleted: string[] = [];
  let cloudContactsDeleted: string[] = [];
  let cloudArchiveDeleted: string[] = [];
  let cloudReachable = false;
  try {
    const fetched = await fetchKeysFromCloud([
      ...keys,
      JOBS_DELETED_IDS_KEY,
      DIRECTORY_DELETED_IDS_KEY,
      CONTACTS_DELETED_IDS_KEY,
      ARCHIVE_DELETED_IDS_KEY,
    ]);
    cloudValues = fetched.slice(0, keys.length);
    cloudDeleted = normalizeDeletedJobIds(fetched[keys.length]);
    cloudDirDeleted = normalizeDeletedDirectoryIds(fetched[keys.length + 1]);
    cloudContactsDeleted = normalizeDeletedJobIds(fetched[keys.length + 2]);
    cloudArchiveDeleted = normalizeDeletedJobIds(fetched[keys.length + 3]);
    cloudReachable = true;
  } catch {
    /* offline — scal tylko lokalne źródła */
  }
  const mergedDeleted = mergeDeletedJobIds(getDeletedJobIds(), cloudDeleted);
  saveDeletedJobIds(mergedDeleted);
  const mergedDirDeleted = mergeDeletedDirectoryIds(getDeletedDirectoryIds(), cloudDirDeleted);
  saveDeletedDirectoryIds(mergedDirDeleted);
  const mergedContactsDeleted = mergeDeletedContactsIds(getDeletedContactsIds(), cloudContactsDeleted);
  saveDeletedContactsIds(mergedContactsDeleted);
  const mergedArchiveDeleted = mergeDeletedArchiveIds(getDeletedArchiveIds(), cloudArchiveDeleted);
  saveDeletedArchiveIds(mergedArchiveDeleted);
  let merged = mergeAllDataKeys(
    valuesForMerge,
    cloudValues,
    mergedDeleted,
    mergedDirDeleted,
    mergedContactsDeleted,
    mergedArchiveDeleted,
  );
  merged = alignWeekRangeInMerged(merged, valuesForMerge, cloudValues);

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

  return { merged, cloudReachable };
}

/** Pobierz chmurę i scal z lokalnym — bez zapisu (do odświeżenia UI / pull on focus). */
export async function pullAndMergeDataBundle(values: unknown[]): Promise<unknown[]> {
  const { merged } = await computeMergedDataBundle(values);
  return merged;
}

/** Zapis już scalonego bundle do chmury (bez ponownego merge). */
export async function pushMergedDataBundleToCloud(merged: unknown[]): Promise<void> {
  await pushKeysToCloud(
    [...DATA_KEYS, JOBS_DELETED_IDS_KEY, DIRECTORY_DELETED_IDS_KEY, CONTACTS_DELETED_IDS_KEY, ARCHIVE_DELETED_IDS_KEY],
    [
      ...merged,
      getDeletedJobIds(),
      getDeletedDirectoryIds(),
      getDeletedContactsIds(),
      getDeletedArchiveIds(),
    ],
    {
      replaceJobsKeys: ["kw-jobs"],
      replaceDirectoryKeys: ["kw-directory"],
    },
  );
}

export async function pushAllDataToCloudSafe(values: unknown[]): Promise<unknown[]> {
  const { merged } = await computeMergedDataBundle(values);
  await pushMergedDataBundleToCloud(merged);
  return merged;
}

/** Zapis wielu kluczy z merge względem localStorage i chmury. */
export async function pushKeysToCloudSafe(keys: string[], values: unknown[]): Promise<void> {
  const prepared = prepareKeysForCloudPush(keys, values);
  let cloudValues: unknown[] = keys.map(() => null);
  try {
    cloudValues = await fetchKeysFromCloud(keys);
  } catch { /* ignore */ }
  const merged = keys.map((key, i) => {
    if (!isDataKey(key)) return prepared[i];
    return mergeDataKey(
      key,
      prepared[i],
      cloudValues[i],
      getDeletedJobIds(),
      getDeletedDirectoryIds(),
      getDeletedContactsIds(),
      getDeletedArchiveIds(),
    );
  });
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

/** Zapis jednego klucza — z merge dla kluczy danych. */
export async function pushKeyToCloud(
  key: string,
  value: unknown,
): Promise<void> {
  if (isDataKey(key)) {
    await pushKeysToCloudSafe([key], [value]);
    return;
  }
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
    (isDataKey(key) || key === ADMIN_HASH_KEY || key === ADMIN_PASSWORDS_KEY || key === ADMIN_USERS_CONFIG_KEY || key === INSPECTOR_STATS_KEY || key === APP_SETTINGS_KEY || key === TENDERS_DELETED_IDS_KEY);
  if (shouldSync) {
    await pushKeyToCloud(key, value);
  }
}

/** Jednorazowy reset kodów pracownika — flaga w localStorage po udanym zapisie do chmury. */
export const WORKER_PINS_RESET_FLAG = "wg-worker-pins-reset-v2026-05-27";

export function stripWorkerPinHashesFromDirectory<T extends Record<string, unknown>>(
  directory: T[],
): { directory: T[]; cleared: number } {
  let cleared = 0;
  const next = directory.map((item) => {
    if (!item || typeof item !== "object") return item;
    if (!item.workerPinHash) return item;
    cleared += 1;
    const copy = { ...item };
    delete copy.workerPinHash;
    return copy;
  });
  return { directory: next, cleared };
}
