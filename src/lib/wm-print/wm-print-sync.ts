import {
  fetchKeysFromCloud,
  mergeRecordsById,
  pushKeysToCloud,
} from "@/lib/cloud-sync";
import { createWmPrintSeedTemplates } from "@/lib/wm-print/default-templates";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { mergeWmPrintSettings, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import {
  dedupeWmPrintTemplatesByName,
  migrateWmPrintTemplate,
  getWmPrintTemplateFiles,
  parseWmPrintTemplates,
} from "@/lib/wm-print/templates";
import {
  mergeWmPrintHistory,
  normalizeWmPrintHistory,
  WM_PRINT_HISTORY_KEY,
  type WmPrintHistoryEntry,
} from "@/lib/wm-print/history";
import {
  WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
  WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
  WM_PRINT_JOB_DOCS_KEY,
  WM_PRINT_SETTINGS_KEY,
  WM_PRINT_TEMPLATES_KEY,
  type WmPrintJobDocument,
  type WmPrintSettings,
  type WmPrintTemplate,
} from "@/lib/wm-print/types";
import { idbSet } from "@/lib/storage/storage-idb";
import { estimateJsonBytes } from "@/lib/storage/storage-budget";
import { recordStorageWrite } from "@/lib/storage/storage-telemetry";

export { mergeWmPrintHistory, normalizeWmPrintHistory, WM_PRINT_HISTORY_KEY };
export type { WmPrintHistoryEntry };

export function getDeletedWmPrintTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(WM_PRINT_DELETED_TEMPLATE_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function addDeletedWmPrintTemplateId(id: string): string[] {
  const next = [...new Set([...getDeletedWmPrintTemplateIds(), id])].slice(-500);
  localStorage.setItem(WM_PRINT_DELETED_TEMPLATE_IDS_KEY, JSON.stringify(next));
  return next;
}

export function mergeDeletedWmPrintTemplateIds(local: string[], cloud: string[]): string[] {
  const norm = (raw: unknown) =>
    Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  return [...new Set([...norm(local), ...norm(cloud)])].slice(-500);
}

export function saveDeletedWmPrintTemplateIds(ids: string[]): void {
  localStorage.setItem(WM_PRINT_DELETED_TEMPLATE_IDS_KEY, JSON.stringify(ids.slice(-500)));
}

export function mergeDeletedWmPrintJobDocIds(local: string[], cloud: string[]): string[] {
  return mergeDeletedWmPrintTemplateIds(local, cloud);
}

export function saveDeletedWmPrintJobDocIds(ids: string[]): void {
  localStorage.setItem(WM_PRINT_DELETED_JOB_DOC_IDS_KEY, JSON.stringify(ids.slice(-500)));
}

export function getDeletedWmPrintJobDocIds(): string[] {
  try {
    const raw = localStorage.getItem(WM_PRINT_DELETED_JOB_DOC_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function addDeletedWmPrintJobDocId(id: string): string[] {
  const next = [...new Set([...getDeletedWmPrintJobDocIds(), id])].slice(-500);
  localStorage.setItem(WM_PRINT_DELETED_JOB_DOC_IDS_KEY, JSON.stringify(next));
  return next;
}

export function mergeWmPrintTemplates(
  local: WmPrintTemplate[],
  cloud: unknown,
  deletedIds: string[],
): WmPrintTemplate[] {
  const tomb = new Set(deletedIds);
  const localNorm = local.map(migrateWmPrintTemplate);
  const cloudNorm = parseWmPrintTemplates(cloud);
  const map = new Map<string, WmPrintTemplate>();
  const ingest = (list: WmPrintTemplate[]) => {
    for (const t of list) {
      if (!t?.id || tomb.has(t.id)) continue;
      const prev = map.get(t.id);
      if (!prev) {
        map.set(t.id, migrateWmPrintTemplate(t));
        continue;
      }
      const localWins = (prev.updatedAt || "") >= (t.updatedAt || "");
      const mergedFiles = localWins
        ? getWmPrintTemplateFiles(prev)
        : getWmPrintTemplateFiles(t);
      const pick = localWins ? prev : t;
      map.set(t.id, migrateWmPrintTemplate({ ...prev, ...t, ...pick, files: mergedFiles }));
    }
  };
  ingest(localNorm);
  ingest(cloudNorm);
  return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function mergeWmPrintJobDocuments(
  local: WmPrintJobDocument[],
  cloud: unknown,
  deletedIds: string[],
): WmPrintJobDocument[] {
  const tomb = new Set(deletedIds);
  const merged = mergeRecordsById(local, normalizeWmPrintJobDocuments(cloud)) as WmPrintJobDocument[];
  return merged.filter((d) => !tomb.has(d.id));
}

function persistWmPrintLocal(keys: string[], values: unknown[]): void {
  const COLD_KEYS = new Set([
    WM_PRINT_TEMPLATES_KEY,
    WM_PRINT_JOB_DOCS_KEY,
    WM_PRINT_HISTORY_KEY,
  ]);

  keys.forEach((key, i) => {
    const value = values[i];
    if (COLD_KEYS.has(key)) {
      // Single-writer (sync path): nie duplikuj LS — React useLocalStorage jest LS hot;
      // cold pełny blob idzie tylko do IndexedDB.
      const idbKey = `wm-print-cold:${key}`;
      void idbSet(idbKey, value).then((ok) => {
        recordStorageWrite({
          key: idbKey,
          bytes: estimateJsonBytes(value),
          writer: "wm-print.persistCold",
          ok,
          tier: 2,
        });
      });
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      recordStorageWrite({
        key,
        bytes: estimateJsonBytes(value),
        writer: "wm-print.persistLocal",
        ok: true,
        tier: 1,
      });
    } catch {
      recordStorageWrite({
        key,
        bytes: estimateJsonBytes(value),
        writer: "wm-print.persistLocal",
        ok: false,
        tier: 1,
        note: "quota_or_error",
      });
    }
  });
}

export async function pushWmPrintToCloud(
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  deletedTemplateIds: string[],
  deletedJobDocIds: string[],
  history: WmPrintHistoryEntry[] = normalizeWmPrintHistory(
    JSON.parse(localStorage.getItem(WM_PRINT_HISTORY_KEY) || "[]"),
  ),
): Promise<void> {
  const deduped = dedupeWmPrintTemplatesByName(templates);
  if (deduped.length !== templates.length) {
    console.warn("[WM PRINT] name uniqueness guard", {
      before: templates.length,
      after: deduped.length,
    });
  }
  const historyNorm = normalizeWmPrintHistory(history);
  const keys = [
    WM_PRINT_TEMPLATES_KEY,
    WM_PRINT_JOB_DOCS_KEY,
    WM_PRINT_SETTINGS_KEY,
    WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
    WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
    WM_PRINT_HISTORY_KEY,
  ];
  const values = [deduped, jobDocs, settings, deletedTemplateIds, deletedJobDocIds, historyNorm];
  persistWmPrintLocal(keys, values);
  await pushKeysToCloud(keys, values);
}

export type WmPrintSeedResult = {
  seeded: boolean;
  templates: WmPrintTemplate[];
};

/** Bootstrap seed — tylko gdy local i cloud są puste (P0 anti-pollution). */
export async function maybeExecuteWmPrintSeed(): Promise<WmPrintSeedResult> {
  let localRaw: unknown = [];
  try {
    localRaw = JSON.parse(localStorage.getItem(WM_PRINT_TEMPLATES_KEY) || "[]");
  } catch {
    localRaw = [];
  }
  const localTemplates = parseWmPrintTemplates(localRaw);

  let cloudTemplates: WmPrintTemplate[] = [];
  try {
    const cloud = await fetchKeysFromCloud([WM_PRINT_TEMPLATES_KEY]);
    cloudTemplates = parseWmPrintTemplates(cloud?.[0]);
  } catch {
    /* offline — traktuj jak niepustą chmurę jeśli local ma dane */
  }

  if (localTemplates.length > 0 || cloudTemplates.length > 0) {
    console.info("WM PRINT SEED SKIPPED", {
      localCount: localTemplates.length,
      cloudCount: cloudTemplates.length,
    });
    return { seeded: false, templates: localTemplates.length > 0 ? localTemplates : cloudTemplates };
  }

  const seeded = createWmPrintSeedTemplates();
  console.info("WM PRINT SEED EXECUTED", { count: seeded.length });
  return { seeded: true, templates: seeded };
}

export async function syncWmPrintFromCloud(): Promise<{
  templates: WmPrintTemplate[];
  jobDocs: WmPrintJobDocument[];
  settings: WmPrintSettings;
  history: WmPrintHistoryEntry[];
}> {
  const keys = [
    WM_PRINT_TEMPLATES_KEY,
    WM_PRINT_JOB_DOCS_KEY,
    WM_PRINT_SETTINGS_KEY,
    WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
    WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
    WM_PRINT_HISTORY_KEY,
  ];
  const cloud = await fetchKeysFromCloud(keys);
  const localTemplates = parseWmPrintTemplates(
    JSON.parse(localStorage.getItem(WM_PRINT_TEMPLATES_KEY) || "[]"),
  );
  const localDocs = normalizeWmPrintJobDocuments(
    JSON.parse(localStorage.getItem(WM_PRINT_JOB_DOCS_KEY) || "[]"),
  );
  const localSettings = normalizeWmPrintSettings(
    JSON.parse(localStorage.getItem(WM_PRINT_SETTINGS_KEY) || "null"),
  );
  const delTpl = mergeDeletedWmPrintTemplateIds(
    getDeletedWmPrintTemplateIds(),
    Array.isArray(cloud?.[3]) ? cloud[3] : [],
  );
  const delDoc = mergeDeletedWmPrintJobDocIds(
    getDeletedWmPrintJobDocIds(),
    Array.isArray(cloud?.[4]) ? cloud[4] : [],
  );
  saveDeletedWmPrintTemplateIds(delTpl);
  saveDeletedWmPrintJobDocIds(delDoc);

  const templates = mergeWmPrintTemplates(localTemplates, cloud?.[0], delTpl);
  const jobDocs = mergeWmPrintJobDocuments(localDocs, cloud?.[1], delDoc);
  const settings = mergeWmPrintSettings(localSettings, normalizeWmPrintSettings(cloud?.[2]));
  const localHistory = normalizeWmPrintHistory(
    JSON.parse(localStorage.getItem(WM_PRINT_HISTORY_KEY) || "[]"),
  );
  const history = mergeWmPrintHistory(localHistory, cloud?.[5]);

  persistWmPrintLocal(
    [WM_PRINT_TEMPLATES_KEY, WM_PRINT_JOB_DOCS_KEY, WM_PRINT_SETTINGS_KEY, WM_PRINT_HISTORY_KEY],
    [templates, jobDocs, settings, history],
  );

  return { templates, jobDocs, settings, history };
}
