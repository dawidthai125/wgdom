/** WM Druk audit log — append-only KV `kw-wm-druk-audit-log` (Pomiary · Schematy · Katalog). */

import { fetchKeysFromCloud, pushKeysToCloud } from "@/lib/cloud-sync";

export const WM_DRUK_AUDIT_LOG_KEY = "kw-wm-druk-audit-log";
export const WM_DRUK_AUDIT_CAP = 3000;

export type WmDrukAuditModule = "measurements" | "schematics" | "katalog";

export type WmDrukAuditAction =
  | "rap_created"
  | "rap_edited"
  | "rap_deleted"
  | "docx_exported"
  | "zip_exported"
  | "schematic_created"
  | "schematic_edited"
  | "schematic_deleted"
  | "schematic_duplicated"
  | "pdf_exported"
  | "measurement_imported";

export interface WmDrukAuditEntry {
  id: string;
  at: string;
  actor: string;
  actorUserId?: string;
  module: WmDrukAuditModule;
  action: WmDrukAuditAction;
  summary: string;
  detail?: string;
  jobId?: string;
  rapNumber?: string;
  measurementId?: string;
  schematicId?: string;
}

export const WM_DRUK_AUDIT_ACTION_LABEL_PL: Record<WmDrukAuditAction, string> = {
  rap_created: "Utworzono RAP",
  rap_edited: "Edycja RAP",
  rap_deleted: "Usunięto RAP",
  docx_exported: "Eksport DOCX",
  zip_exported: "Eksport ZIP",
  schematic_created: "Utworzono schemat",
  schematic_edited: "Edycja schematu",
  schematic_deleted: "Usunięto schemat",
  schematic_duplicated: "Duplikacja schematu",
  pdf_exported: "Eksport PDF schematu",
  measurement_imported: "Import z pomiaru",
};

const VALID_MODULES = new Set<string>(["measurements", "schematics", "katalog"]);
const VALID_ACTIONS = new Set<string>(Object.keys(WM_DRUK_AUDIT_ACTION_LABEL_PL));

export type RecordWmDrukAuditInput = {
  actor: string;
  actorUserId?: string;
  module: WmDrukAuditModule;
  action: WmDrukAuditAction;
  summary: string;
  detail?: string;
  jobId?: string;
  rapNumber?: string;
  measurementId?: string;
  schematicId?: string;
  at?: string;
};

function feedActorString(raw: string | undefined | null, fallback = "Administrator"): string {
  const trimmed = (raw ?? "").trim();
  return trimmed || fallback;
}

function feedAtString(raw: string | undefined | null): string {
  return raw != null ? String(raw) : "";
}

function parseWmDrukAuditEntry(raw: unknown): WmDrukAuditEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WmDrukAuditEntry>;
  if (!r.id || !r.action || !VALID_ACTIONS.has(String(r.action))) return null;
  if (!r.module || !VALID_MODULES.has(String(r.module))) return null;
  if (!r.summary) return null;
  return {
    id: String(r.id),
    at: feedAtString(r.at) || new Date().toISOString(),
    actor: feedActorString(r.actor),
    actorUserId: r.actorUserId ? String(r.actorUserId) : undefined,
    module: r.module as WmDrukAuditModule,
    action: r.action as WmDrukAuditAction,
    summary: String(r.summary),
    detail: r.detail ? String(r.detail) : undefined,
    jobId: r.jobId ? String(r.jobId) : undefined,
    rapNumber: r.rapNumber ? String(r.rapNumber) : undefined,
    measurementId: r.measurementId ? String(r.measurementId) : undefined,
    schematicId: r.schematicId ? String(r.schematicId) : undefined,
  };
}

export function normalizeWmDrukAuditLog(raw: unknown): WmDrukAuditEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: WmDrukAuditEntry[] = [];
  for (const item of raw) {
    const parsed = parseWmDrukAuditEntry(item);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function mergeWmDrukAuditLog(local: unknown, cloud: unknown): WmDrukAuditEntry[] {
  const byId = new Map<string, WmDrukAuditEntry>();
  for (const item of normalizeWmDrukAuditLog(local)) byId.set(item.id, item);
  for (const item of normalizeWmDrukAuditLog(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.at >= prev.at) byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, WM_DRUK_AUDIT_CAP);
}

export function appendWmDrukAuditLog(
  log: WmDrukAuditEntry[],
  entries: WmDrukAuditEntry | WmDrukAuditEntry[],
): WmDrukAuditEntry[] {
  const batch = Array.isArray(entries) ? entries : [entries];
  if (batch.length === 0) return log;
  const byId = new Map<string, WmDrukAuditEntry>();
  for (const item of log) byId.set(item.id, item);
  for (const item of batch) byId.set(item.id, item);
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, WM_DRUK_AUDIT_CAP);
}

export function buildWmDrukAuditEntry(input: RecordWmDrukAuditInput): WmDrukAuditEntry {
  return {
    id: crypto.randomUUID(),
    at: input.at ?? new Date().toISOString(),
    actor: feedActorString(input.actor),
    actorUserId: input.actorUserId,
    module: input.module,
    action: input.action,
    summary: input.summary.trim(),
    detail: input.detail,
    jobId: input.jobId,
    rapNumber: input.rapNumber,
    measurementId: input.measurementId,
    schematicId: input.schematicId,
  };
}

function readWmDrukAuditLogLocal(): WmDrukAuditEntry[] {
  try {
    const raw = localStorage.getItem(WM_DRUK_AUDIT_LOG_KEY);
    if (!raw) return [];
    return normalizeWmDrukAuditLog(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Append + merge z chmurą + push pojedynczego klucza AUX (bez pełnego runCloudSync). */
export async function recordWmDrukAudit(input: RecordWmDrukAuditInput): Promise<WmDrukAuditEntry> {
  const entry = buildWmDrukAuditEntry(input);
  const withEntry = appendWmDrukAuditLog(readWmDrukAuditLogLocal(), entry);
  let merged = withEntry;
  try {
    const [cloud] = await fetchKeysFromCloud([WM_DRUK_AUDIT_LOG_KEY]);
    merged = mergeWmDrukAuditLog(withEntry, cloud);
  } catch {
    /* offline — zostaw lokalny append */
  }
  try {
    localStorage.setItem(WM_DRUK_AUDIT_LOG_KEY, JSON.stringify(merged));
  } catch {
    /* ignore quota */
  }
  void pushKeysToCloud([WM_DRUK_AUDIT_LOG_KEY], [merged]).catch(() => {});
  return entry;
}
