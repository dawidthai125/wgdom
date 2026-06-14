/** Filtry i paginacja audit log notatek operacyjnych (P2C — Super Admin UI). */

import type { AdminSession } from "@/lib/admin-auth";
import { adminIsSuperAdmin } from "@/lib/admin-auth";
import type {
  OperationalNoteAuditAction,
  OperationalNoteAuditEntry,
} from "@/lib/operational-notes-audit";

export const OPERATIONAL_NOTES_AUDIT_PAGE_SIZE = 50;

export const OPERATIONAL_NOTE_AUDIT_ACTIONS: OperationalNoteAuditAction[] = [
  "create",
  "update",
  "comment",
  "archive",
  "restore",
  "delete",
  "share_toggle",
  "job_link_change",
  "ack",
];

export const OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL: Record<OperationalNoteAuditAction, string> = {
  create: "Utworzenie",
  update: "Edycja",
  comment: "Komentarz",
  archive: "Archiwum",
  restore: "Przywrócenie",
  delete: "Usunięcie",
  share_toggle: "Udostępnienie",
  job_link_change: "Powiązanie roboty",
  ack: "ACK",
};

export type OperationalNotesAuditFilters = {
  action: OperationalNoteAuditAction | "all";
  userId: string | "all";
  noteId: string | "all";
  search: string;
};

export const EMPTY_OPERATIONAL_NOTES_AUDIT_FILTERS: OperationalNotesAuditFilters = {
  action: "all",
  userId: "all",
  noteId: "all",
  search: "",
};

/** Twardy ACL — wyłącznie Super Admin. */
export function canAccessOperationalNotesAudit(
  session: AdminSession | null | undefined,
): boolean {
  return session != null && adminIsSuperAdmin(session.role);
}

export function filterOperationalNotesAuditLog(
  log: OperationalNoteAuditEntry[],
  filters: OperationalNotesAuditFilters,
): OperationalNoteAuditEntry[] {
  const q = filters.search.trim().toLowerCase();
  return log.filter((entry) => {
    if (filters.action !== "all" && entry.action !== filters.action) return false;
    if (filters.userId !== "all" && entry.userId !== filters.userId) return false;
    if (filters.noteId !== "all" && entry.noteId !== filters.noteId) return false;
    if (!q) return true;
    const hay = [
      entry.displayName,
      entry.noteTitleSnapshot ?? "",
      entry.detail ?? "",
      OPERATIONAL_NOTE_AUDIT_ACTION_LABEL_PL[entry.action] ?? entry.action,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function paginateOperationalNotesAuditLog<T>(
  items: T[],
  page: number,
  pageSize: number = OPERATIONAL_NOTES_AUDIT_PAGE_SIZE,
): { items: T[]; page: number; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}

export function collectOperationalNotesAuditFilterOptions(log: OperationalNoteAuditEntry[]): {
  users: { userId: string; displayName: string }[];
  notes: { noteId: string; title: string }[];
} {
  const usersById = new Map<string, string>();
  const notesById = new Map<string, string>();
  for (const entry of log) {
    usersById.set(entry.userId, entry.displayName);
    if (entry.noteId) {
      notesById.set(entry.noteId, entry.noteTitleSnapshot ?? entry.noteId);
    }
  }
  const users = [...usersById.entries()]
    .map(([userId, displayName]) => ({ userId, displayName }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "pl"));
  const notes = [...notesById.entries()]
    .map(([noteId, title]) => ({ noteId, title }))
    .sort((a, b) => a.title.localeCompare(b.title, "pl"));
  return { users, notes };
}

export function buildOperationalNoteAckAuditDetail(contentRev: number): string {
  return `Potwierdził wersję ${contentRev}`;
}
