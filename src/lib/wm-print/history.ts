/** Historia wygenerowanych dokumentów WM Druk — metadane only, KV `kw-wm-print-history`. */

import type { Job } from "@/app/app-domain";
import { jobDisplayTitle } from "@/app/app-domain";
import type { WmPrintTemplate } from "@/lib/wm-print/types";

export const WM_PRINT_HISTORY_KEY = "kw-wm-print-history";
export const WM_PRINT_HISTORY_CAP = 1000;
export const WM_PRINT_HISTORY_ZIP_TEMPLATE_ID = "__zip__";
export const WM_PRINT_HISTORY_ZIP_TEMPLATE_NAME = "Pakiet odbiorowy ZIP";

export type WmPrintHistoryOutputType = "pdf" | "docx" | "zip";

export interface WmPrintHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  templateId: string;
  templateName: string;
  outputType: WmPrintHistoryOutputType;
  jobId: string;
  jobName: string;
}

const VALID_OUTPUT_TYPES = new Set<string>(["pdf", "docx", "zip"]);

function parseHistoryEntry(raw: unknown): WmPrintHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WmPrintHistoryEntry>;
  if (!r.id || !r.userId || !r.userName || !r.templateId || !r.templateName) return null;
  if (!r.jobId || !r.jobName) return null;
  if (!r.outputType || !VALID_OUTPUT_TYPES.has(String(r.outputType))) return null;
  return {
    id: String(r.id),
    timestamp: String(r.timestamp ?? new Date().toISOString()),
    userId: String(r.userId),
    userName: String(r.userName),
    templateId: String(r.templateId),
    templateName: String(r.templateName),
    outputType: r.outputType as WmPrintHistoryOutputType,
    jobId: String(r.jobId),
    jobName: String(r.jobName),
  };
}

export function normalizeWmPrintHistory(raw: unknown): WmPrintHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: WmPrintHistoryEntry[] = [];
  for (const item of raw) {
    const parsed = parseHistoryEntry(item);
    if (parsed) out.push(parsed);
  }
  return sortWmPrintHistoryDesc(out);
}

export function sortWmPrintHistoryDesc(entries: WmPrintHistoryEntry[]): WmPrintHistoryEntry[] {
  return [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function mergeWmPrintHistory(local: unknown, cloud: unknown): WmPrintHistoryEntry[] {
  const byId = new Map<string, WmPrintHistoryEntry>();
  for (const item of normalizeWmPrintHistory(local)) byId.set(item.id, item);
  for (const item of normalizeWmPrintHistory(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.timestamp >= prev.timestamp) byId.set(item.id, item);
  }
  return sortWmPrintHistoryDesc([...byId.values()]).slice(0, WM_PRINT_HISTORY_CAP);
}

export function appendWmPrintHistory(
  log: WmPrintHistoryEntry[],
  entries: WmPrintHistoryEntry | WmPrintHistoryEntry[],
): WmPrintHistoryEntry[] {
  const batch = Array.isArray(entries) ? entries : [entries];
  if (batch.length === 0) return log;
  const byId = new Map<string, WmPrintHistoryEntry>();
  for (const item of log) byId.set(item.id, item);
  for (const item of batch) byId.set(item.id, item);
  return sortWmPrintHistoryDesc([...byId.values()]).slice(0, WM_PRINT_HISTORY_CAP);
}

export function filterWmPrintHistoryForJob(
  entries: WmPrintHistoryEntry[],
  jobId: string,
): WmPrintHistoryEntry[] {
  if (!jobId) return [];
  return sortWmPrintHistoryDesc(entries.filter((e) => e.jobId === jobId));
}

export function resolveWmPrintOutputType(template: Pick<WmPrintTemplate, "type">): "pdf" | "docx" {
  return template.type === "docx" ? "docx" : "pdf";
}

export function buildWmPrintHistoryEntry(input: {
  userId: string;
  userName: string;
  templateId: string;
  templateName: string;
  outputType: WmPrintHistoryOutputType;
  job: Job;
  timestamp?: string;
}): WmPrintHistoryEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    userId: input.userId,
    userName: input.userName,
    templateId: input.templateId,
    templateName: input.templateName,
    outputType: input.outputType,
    jobId: input.job.id,
    jobName: jobDisplayTitle(input.job),
  };
}

export function buildWmPrintHistoryZipEntry(
  job: Job,
  userId: string,
  userName: string,
): WmPrintHistoryEntry {
  return buildWmPrintHistoryEntry({
    userId,
    userName,
    templateId: WM_PRINT_HISTORY_ZIP_TEMPLATE_ID,
    templateName: WM_PRINT_HISTORY_ZIP_TEMPLATE_NAME,
    outputType: "zip",
    job,
  });
}

export function buildWmPrintHistoryTemplateEntry(
  job: Job,
  template: WmPrintTemplate,
  userId: string,
  userName: string,
): WmPrintHistoryEntry {
  return buildWmPrintHistoryEntry({
    userId,
    userName,
    templateId: template.id,
    templateName: template.name,
    outputType: resolveWmPrintOutputType(template),
    job,
  });
}

export function wmPrintHistoryOutputTypeLabel(type: WmPrintHistoryOutputType): string {
  if (type === "docx") return "DOCX";
  if (type === "zip") return "ZIP";
  return "PDF";
}

export function formatWmPrintHistoryTimestamp(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pl-PL");
}
