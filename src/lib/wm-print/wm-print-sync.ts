import {
  fetchKeysFromCloud,
  mergeRecordsById,
  persistKey,
  pushKeysToCloud,
} from "@/lib/cloud-sync";
import { normalizeWmPrintJobDocuments } from "@/lib/wm-print/job-documents";
import { mergeWmPrintSettings, normalizeWmPrintSettings } from "@/lib/wm-print/settings";
import { normalizeWmPrintTemplates } from "@/lib/wm-print/templates";
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
  const merged = mergeRecordsById(local, normalizeWmPrintTemplates(cloud)) as WmPrintTemplate[];
  return merged.filter((t) => !tomb.has(t.id)).sort((a, b) => a.sortOrder - b.sortOrder);
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

export async function pushWmPrintToCloud(
  templates: WmPrintTemplate[],
  jobDocs: WmPrintJobDocument[],
  settings: WmPrintSettings,
  deletedTemplateIds: string[],
  deletedJobDocIds: string[],
): Promise<void> {
  persistKey(WM_PRINT_TEMPLATES_KEY, templates);
  persistKey(WM_PRINT_JOB_DOCS_KEY, jobDocs);
  persistKey(WM_PRINT_SETTINGS_KEY, settings);
  persistKey(WM_PRINT_DELETED_TEMPLATE_IDS_KEY, deletedTemplateIds);
  persistKey(WM_PRINT_DELETED_JOB_DOC_IDS_KEY, deletedJobDocIds);
  await pushKeysToCloud(
    [
      WM_PRINT_TEMPLATES_KEY,
      WM_PRINT_JOB_DOCS_KEY,
      WM_PRINT_SETTINGS_KEY,
      WM_PRINT_DELETED_TEMPLATE_IDS_KEY,
      WM_PRINT_DELETED_JOB_DOC_IDS_KEY,
    ],
    [templates, jobDocs, settings, deletedTemplateIds, deletedJobDocIds],
  );
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

  persistKey(WM_PRINT_TEMPLATES_KEY, templates);
  persistKey(WM_PRINT_JOB_DOCS_KEY, jobDocs);
  persistKey(WM_PRINT_SETTINGS_KEY, settings);

  return { templates, jobDocs, settings };
}
