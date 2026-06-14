import {
  fetchKeysFromCloud,
  mergeRecordsById,
  pushKeysToCloud,
} from "@/lib/cloud-sync";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { mergeWmPrintSettings, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import { normalizeWmPrintTemplates, migrateWmPrintTemplate, getWmPrintTemplateFiles } from "@/lib/wm-print/templates";
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
  const cloudNorm = normalizeWmPrintTemplates(cloud);
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
  keys.forEach((key, i) => {
    try {
      localStorage.setItem(key, JSON.stringify(values[i]));
    } catch {
      /* ignore quota */
    }
  });
}

export async function pushWmPrintToCloud(
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  deletedTemplateIds: string[],
  deletedJobDocIds: string[],
): Promise<void> {
  const keys = [
    WM_PRINT_TEMPLATES_KEY,
    WM_PRINT_JOB_DOCS_KEY,
    WM_PRINT_SETTINGS_KEY,
    WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
    WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
  ];
  const values = [templates, jobDocs, settings, deletedTemplateIds, deletedJobDocIds];
  persistWmPrintLocal(keys, values);
  // Bez pushKeysToCloudSafe — union merge przywracał usunięte pliki z chmury
  await pushKeysToCloud(keys, values);
}

export async function syncWmPrintFromCloud(): Promise<{
  templates: WmPrintTemplate[];
  jobDocs: WmPrintJobDocument[];
  settings: WmPrintSettings;
}> {
  const keys = [
    WM_PRINT_TEMPLATES_KEY,
    WM_PRINT_JOB_DOCS_KEY,
    WM_PRINT_SETTINGS_KEY,
    WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
    WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
  ];
  const [cloud] = await fetchKeysFromCloud(keys);
  const localTemplates = normalizeWmPrintTemplates(
    JSON.parse(localStorage.getItem(WM_PRINT_TEMPLATES_KEY) || "[]"),
  );
  const localDocs = normalizeWmPrintJobDocuments(
    JSON.parse(localStorage.getItem(WM_PRINT_JOB_DOCS_KEY) || "[]"),
  );
  const localSettings = normalizeWmPrintSettings(
    JSON.parse(localStorage.getItem(WM_PRINT_SETTINGS_KEY) || "null"),
  );
  const delTpl = getDeletedWmPrintTemplateIds();
  const delDoc = getDeletedWmPrintJobDocIds();

  const templates = mergeWmPrintTemplates(localTemplates, cloud?.[0], delTpl);
  const jobDocs = mergeWmPrintJobDocuments(localDocs, cloud?.[1], delDoc);
  const settings = mergeWmPrintSettings(localSettings, normalizeWmPrintSettings(cloud?.[2]));

  persistWmPrintLocal(
    [WM_PRINT_TEMPLATES_KEY, WM_PRINT_JOB_DOCS_KEY, WM_PRINT_SETTINGS_KEY],
    [templates, jobDocs, settings],
  );

  return { templates, jobDocs, settings };
}
