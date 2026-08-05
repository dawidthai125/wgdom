/** WM Druk audit log — append-only KV `kw-wm-druk-audit-log` (Pomiary · Schematy · Katalog). */

import { fetchKeysFromCloud, pushKeysToCloud } from "@/lib/cloud-sync";
import { readAuditRingLocal, writeAuditRingLocal } from "@/lib/storage/storage-audit-ring";

export const WM_DRUK_AUDIT_LOG_KEY = "kw-wm-druk-audit-log";
export const WM_DRUK_AUDIT_CAP = 3000;
const WM_DRUK_AUDIT_IDB_KEY = "audit-ring:kw-wm-druk-audit-log";

export type WmDrukAuditModule = "measurements" | "schematics" | "katalog" | "drawings";

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
  | "measurement_imported"
  | "drawing_created"
  | "drawing_deleted"
  | "drawing_duplicated"
  | "drawing_pdf_exported"
  | "drawing_zip_included"
  | "drawing_finalized"
  | "drawing_unfinalized"
  | "sketch_created"
  | "sketch_submitted"
  | "sketch_resubmitted"
  | "sketch_needs_changes"
  | "sketch_accepted"
  | "sketch_published"
  | "sketch_soft_deleted";

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
  drawingId?: string;
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
  drawing_created: "Utworzono rysunek",
  drawing_deleted: "Usunięto rysunek",
  drawing_duplicated: "Duplikacja rysunku",
  drawing_pdf_exported: "Eksport PDF rysunku",
  drawing_zip_included: "Rysunki w paczce ZIP",
  drawing_finalized: "Oznaczono rysunek jako Finalny",
  drawing_unfinalized: "Oznaczono rysunek jako Roboczy",
  sketch_created: "Utworzono szkic pracownika",
  sketch_submitted: "Przesłano szkic do weryfikacji",
  sketch_resubmitted: "Ponownie przesłano szkic",
  sketch_needs_changes: "Szkic odesłany do poprawy",
  sketch_accepted: "Zaakceptowano szkic techniczny",
  sketch_published: "Opublikowano szkic (placement)",
  sketch_soft_deleted: "Usunięto szkic (soft)",
};

const VALID_MODULES = new Set<string>(["measurements", "schematics", "katalog", "drawings"]);
const VALID_ACTIONS = new Set<string>(Object.keys(WM_DRUK_AUDIT_ACTION_LABEL_PL));

/** Callback z warstwy App — zapis + odświeżenie stanu React (bez React w tej bibliotece). */
export type OnRecordWmDrukAuditFn = (input: RecordWmDrukAuditInput) => void;

export type RecordWmDrukAuditInput = {
  actor?: string;
  actorUserId?: string;
  module: WmDrukAuditModule;
  action: WmDrukAuditAction;
  summary: string;
  detail?: string;
  jobId?: string;
  rapNumber?: string;
  measurementId?: string;
  schematicId?: string;
  drawingId?: string;
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
    drawingId: r.drawingId ? String(r.drawingId) : undefined,
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
    drawingId: input.drawingId,
  };
}

export function getWmDrukAuditLogLocal(): WmDrukAuditEntry[] {
  return readAuditRingLocal(WM_DRUK_AUDIT_LOG_KEY, WM_DRUK_AUDIT_IDB_KEY, normalizeWmDrukAuditLog);
}

function readWmDrukAuditLogLocal(): WmDrukAuditEntry[] {
  return getWmDrukAuditLogLocal();
}

/** Append + merge z chmurą + push pojedynczego klucza AUX (bez pełnego runCloudSync). */
export async function recordWmDrukAudit(input: RecordWmDrukAuditInput): Promise<WmDrukAuditEntry> {
  const entry = buildWmDrukAuditEntry({
    ...input,
    actor: input.actor ?? "Administrator",
  });
  const withEntry = appendWmDrukAuditLog(readWmDrukAuditLogLocal(), entry);
  let merged = withEntry;
  try {
    const [cloud] = await fetchKeysFromCloud([WM_DRUK_AUDIT_LOG_KEY]);
    merged = mergeWmDrukAuditLog(withEntry, cloud);
  } catch {
    /* offline — zostaw lokalny append */
  }
  writeAuditRingLocal(WM_DRUK_AUDIT_LOG_KEY, WM_DRUK_AUDIT_IDB_KEY, merged, "wm-druk-audit.record");
  void pushKeysToCloud([WM_DRUK_AUDIT_LOG_KEY], [merged]).catch(() => {});
  return entry;
}
