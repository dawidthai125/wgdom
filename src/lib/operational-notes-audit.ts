/** Audit log notatek operacyjnych — append-only KV `kw-operational-notes-audit-log`. */

import type { AdminRole } from "@/lib/admin-auth";
import { readAuditRingLocal, writeAuditRingLocal } from "@/lib/storage/storage-audit-ring";

export const OPERATIONAL_NOTES_AUDIT_LOG_KEY = "kw-operational-notes-audit-log";
export const OPERATIONAL_NOTES_AUDIT_CAP = 3000;
const OPERATIONAL_NOTES_AUDIT_IDB_KEY = "audit-ring:kw-operational-notes-audit-log";

export type OperationalNoteAuditAction =
  | "create"
  | "update"
  | "comment"
  | "archive"
  | "restore"
  | "delete"
  | "share_toggle"
  | "job_link_change"
  | "ack";

export interface OperationalNoteAuditEntry {
  id: string;
  action: OperationalNoteAuditAction;
  at: string;
  userId: string;
  displayName: string;
  role: AdminRole;
  noteId?: string;
  noteTitleSnapshot?: string;
  detail?: string;
}

const VALID_ACTIONS = new Set<string>([
  "create",
  "update",
  "comment",
  "archive",
  "restore",
  "delete",
  "share_toggle",
  "job_link_change",
  "ack",
]);

function parseAuditEntry(raw: unknown): OperationalNoteAuditEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OperationalNoteAuditEntry>;
  if (!r.id || !r.action || !VALID_ACTIONS.has(String(r.action))) return null;
  if (!r.userId || !r.displayName || !r.role) return null;
  return {
    id: String(r.id),
    action: r.action as OperationalNoteAuditAction,
    at: String(r.at ?? new Date().toISOString()),
    userId: String(r.userId),
    displayName: String(r.displayName),
    role: r.role as AdminRole,
    noteId: r.noteId ? String(r.noteId) : undefined,
    noteTitleSnapshot: r.noteTitleSnapshot ? String(r.noteTitleSnapshot) : undefined,
    detail: r.detail ? String(r.detail) : undefined,
  };
}

export function normalizeOperationalNotesAuditLog(raw: unknown): OperationalNoteAuditEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalNoteAuditEntry[] = [];
  for (const item of raw) {
    const parsed = parseAuditEntry(item);
    if (parsed) out.push(parsed);
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function mergeOperationalNotesAuditLog(
  local: unknown,
  cloud: unknown,
): OperationalNoteAuditEntry[] {
  const byId = new Map<string, OperationalNoteAuditEntry>();
  for (const item of normalizeOperationalNotesAuditLog(local)) byId.set(item.id, item);
  for (const item of normalizeOperationalNotesAuditLog(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.at >= prev.at) byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, OPERATIONAL_NOTES_AUDIT_CAP);
}

export function appendOperationalNotesAuditLog(
  log: OperationalNoteAuditEntry[],
  entries: OperationalNoteAuditEntry | OperationalNoteAuditEntry[],
): OperationalNoteAuditEntry[] {
  const batch = Array.isArray(entries) ? entries : [entries];
  if (batch.length === 0) return log;
  const byId = new Map<string, OperationalNoteAuditEntry>();
  for (const item of log) byId.set(item.id, item);
  for (const item of batch) byId.set(item.id, item);
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, OPERATIONAL_NOTES_AUDIT_CAP);
}

export function buildOperationalNoteAuditEntry(input: {
  action: OperationalNoteAuditAction;
  userId: string;
  displayName: string;
  role: AdminRole;
  noteId?: string;
  noteTitleSnapshot?: string;
  detail?: string;
  at?: string;
}): OperationalNoteAuditEntry {
  return {
    id: crypto.randomUUID(),
    action: input.action,
    at: input.at ?? new Date().toISOString(),
    userId: input.userId,
    displayName: input.displayName,
    role: input.role,
    noteId: input.noteId,
    noteTitleSnapshot: input.noteTitleSnapshot,
    detail: input.detail,
  };
}

/** LOCALSTORAGE-ARCH-02 E — hot path UI / migrate. */
export function getOperationalNotesAuditLogLocal(): OperationalNoteAuditEntry[] {
  return readAuditRingLocal(
    OPERATIONAL_NOTES_AUDIT_LOG_KEY,
    OPERATIONAL_NOTES_AUDIT_IDB_KEY,
    normalizeOperationalNotesAuditLog,
  );
}

export function persistOperationalNotesAuditLogLocal(
  entries: OperationalNoteAuditEntry[],
  writer = "operational-notes-audit.persist",
): void {
  writeAuditRingLocal(
    OPERATIONAL_NOTES_AUDIT_LOG_KEY,
    OPERATIONAL_NOTES_AUDIT_IDB_KEY,
    entries,
    writer,
  );
}
