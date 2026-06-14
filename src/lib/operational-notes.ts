/** Notatki operacyjne — osobna domena KV (≠ job.notes, ≠ job.jobNotes WM/billing). */

import type { Job } from "@/app/app-domain";
import type { AdminRole, AdminSession } from "@/lib/admin-auth";
import { adminIsInspector } from "@/lib/admin-auth";
import {
  buildOperationalNoteAuditEntry,
  type OperationalNoteAuditEntry,
} from "@/lib/operational-notes-audit";

export const OPERATIONAL_NOTES_KEY = "kw-operational-notes";

export type OperationalNoteStatus = "active" | "archived";

export interface OperationalNoteComment {
  id: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRole: AdminRole;
  text: string;
  createdAt: string;
}

export interface OperationalNoteRevision {
  id: string;
  contentRev: number;
  changedAt: string;
  changedByUserId: string;
  changedByDisplayName: string;
  previousContent: string;
}

export interface OperationalNote {
  id: string;
  title: string;
  content: string;
  authorUserId: string;
  authorDisplayName: string;
  authorRole: AdminRole;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  lastActivityByUserId: string;
  status: OperationalNoteStatus;
  archivedAt?: string;
  archivedByUserId?: string;
  linkedJobId?: string;
  linkedJobNameSnapshot?: string;
  shareWithInspector: boolean;
  contentRev: number;
  comments: OperationalNoteComment[];
  revisions: OperationalNoteRevision[];
}

export type OperationalNoteMutationResult = {
  notes: OperationalNote[];
  auditEntries: OperationalNoteAuditEntry[];
};

function parseComment(raw: unknown): OperationalNoteComment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OperationalNoteComment>;
  if (!r.id || !r.authorUserId || !r.text) return null;
  return {
    id: String(r.id),
    authorUserId: String(r.authorUserId),
    authorDisplayName: String(r.authorDisplayName ?? ""),
    authorRole: (r.authorRole ?? "admin") as AdminRole,
    text: String(r.text),
    createdAt: String(r.createdAt ?? new Date().toISOString()),
  };
}

function parseRevision(raw: unknown): OperationalNoteRevision | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OperationalNoteRevision>;
  if (!r.id || typeof r.contentRev !== "number") return null;
  return {
    id: String(r.id),
    contentRev: r.contentRev,
    changedAt: String(r.changedAt ?? new Date().toISOString()),
    changedByUserId: String(r.changedByUserId ?? ""),
    changedByDisplayName: String(r.changedByDisplayName ?? ""),
    previousContent: String(r.previousContent ?? ""),
  };
}

function parseNote(raw: unknown): OperationalNote | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OperationalNote>;
  if (!r.id || !r.authorUserId) return null;
  const createdAt = String(r.createdAt ?? new Date().toISOString());
  const status: OperationalNoteStatus = r.status === "archived" ? "archived" : "active";
  const comments: OperationalNoteComment[] = [];
  if (Array.isArray(r.comments)) {
    for (const c of r.comments) {
      const parsed = parseComment(c);
      if (parsed) comments.push(parsed);
    }
  }
  const revisions: OperationalNoteRevision[] = [];
  if (Array.isArray(r.revisions)) {
    for (const rev of r.revisions) {
      const parsed = parseRevision(rev);
      if (parsed) revisions.push(parsed);
    }
  }
  return {
    id: String(r.id),
    title: String(r.title ?? "").trim(),
    content: String(r.content ?? ""),
    authorUserId: String(r.authorUserId),
    authorDisplayName: String(r.authorDisplayName ?? ""),
    authorRole: (r.authorRole ?? "admin") as AdminRole,
    createdAt,
    updatedAt: String(r.updatedAt ?? createdAt),
    lastActivityAt: String(r.lastActivityAt ?? r.updatedAt ?? createdAt),
    lastActivityByUserId: String(r.lastActivityByUserId ?? r.authorUserId),
    status,
    archivedAt: r.archivedAt ? String(r.archivedAt) : undefined,
    archivedByUserId: r.archivedByUserId ? String(r.archivedByUserId) : undefined,
    linkedJobId: r.linkedJobId ? String(r.linkedJobId) : undefined,
    linkedJobNameSnapshot: r.linkedJobNameSnapshot ? String(r.linkedJobNameSnapshot) : undefined,
    shareWithInspector: r.shareWithInspector === true,
    contentRev: typeof r.contentRev === "number" && r.contentRev > 0 ? r.contentRev : 1,
    comments,
    revisions,
  };
}

export function normalizeOperationalNotes(raw: unknown): OperationalNote[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalNote[] = [];
  for (const item of raw) {
    const parsed = parseNote(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

function mergeComments(a: OperationalNoteComment[], b: OperationalNoteComment[]): OperationalNoteComment[] {
  const byId = new Map<string, OperationalNoteComment>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const prev = byId.get(item.id);
    if (!prev || item.createdAt >= prev.createdAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

function mergeRevisions(a: OperationalNoteRevision[], b: OperationalNoteRevision[]): OperationalNoteRevision[] {
  const byId = new Map<string, OperationalNoteRevision>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const prev = byId.get(item.id);
    if (!prev || item.changedAt >= prev.changedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((x, y) => x.contentRev - y.contentRev);
}

export function mergeOperationalNotePair(prev: OperationalNote, next: OperationalNote): OperationalNote {
  const scalarWinner = next.updatedAt >= prev.updatedAt ? next : prev;
  const other = scalarWinner === next ? prev : next;
  return {
    ...scalarWinner,
    comments: mergeComments(prev.comments, next.comments),
    revisions: mergeRevisions(prev.revisions, next.revisions),
    contentRev: Math.max(prev.contentRev, next.contentRev),
    shareWithInspector: scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.shareWithInspector : other.shareWithInspector,
    status: scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.status : other.status,
    archivedAt: scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.archivedAt : other.archivedAt,
    archivedByUserId: scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.archivedByUserId : other.archivedByUserId,
    linkedJobId: scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.linkedJobId : other.linkedJobId,
    linkedJobNameSnapshot:
      scalarWinner.updatedAt >= other.updatedAt ? scalarWinner.linkedJobNameSnapshot : other.linkedJobNameSnapshot,
    lastActivityAt:
      scalarWinner.lastActivityAt >= other.lastActivityAt ? scalarWinner.lastActivityAt : other.lastActivityAt,
    lastActivityByUserId:
      scalarWinner.lastActivityAt >= other.lastActivityAt
        ? scalarWinner.lastActivityByUserId
        : other.lastActivityByUserId,
  };
}

export function mergeOperationalNotes(
  local: unknown,
  cloud: unknown,
  deletedIds: string[] = [],
): OperationalNote[] {
  const deleted = new Set(deletedIds);
  const loc = normalizeOperationalNotes(local).filter((n) => !deleted.has(n.id));
  const clo = normalizeOperationalNotes(cloud).filter((n) => !deleted.has(n.id));
  const byId = new Map<string, OperationalNote>();
  for (const item of loc) byId.set(item.id, item);
  for (const item of clo) {
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, mergeOperationalNotePair(prev, item));
  }
  return [...byId.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export function isStaffOperationalNoteRole(role: AdminRole): boolean {
  return role === "super_admin" || role === "admin" || role === "moderator";
}

export function canViewOperationalNote(note: OperationalNote, session: AdminSession | null | undefined): boolean {
  if (!session) return false;
  if (isStaffOperationalNoteRole(session.role)) return true;
  if (adminIsInspector(session.role)) {
    return note.authorUserId === session.id || note.shareWithInspector;
  }
  return false;
}

export function canCreateOperationalNote(session: AdminSession | null | undefined): boolean {
  if (!session) return false;
  return isStaffOperationalNoteRole(session.role) || adminIsInspector(session.role);
}

export function canEditOperationalNote(session: AdminSession | null | undefined): boolean {
  if (!session) return false;
  return isStaffOperationalNoteRole(session.role);
}

export function canCommentOperationalNote(
  note: OperationalNote,
  session: AdminSession | null | undefined,
): boolean {
  if (!session) return false;
  if (!canViewOperationalNote(note, session)) return false;
  return isStaffOperationalNoteRole(session.role) || adminIsInspector(session.role);
}

export function canArchiveOperationalNote(session: AdminSession | null | undefined): boolean {
  return canEditOperationalNote(session);
}

export function canDeleteOperationalNote(session: AdminSession | null | undefined): boolean {
  return canEditOperationalNote(session);
}

export function canToggleShareOperationalNote(session: AdminSession | null | undefined): boolean {
  return canEditOperationalNote(session);
}

export function filterOperationalNotesForViewer(
  notes: OperationalNote[],
  session: AdminSession | null | undefined,
): OperationalNote[] {
  return notes.filter((n) => canViewOperationalNote(n, session));
}

/** Inspektor — tylko aktywne notatki widoczne wg ACL (P2A). */
export function filterOperationalNotesForInspectorActive(
  notes: OperationalNote[],
  session: AdminSession | null | undefined,
): OperationalNote[] {
  return filterOperationalNotesForViewer(notes, session).filter((n) => n.status === "active");
}

function inspectorStaffMutationBlocked(session: AdminSession): boolean {
  return adminIsInspector(session.role);
}

export function filterOperationalNotesForJob(
  notes: OperationalNote[],
  jobId: string,
  session: AdminSession | null | undefined,
): OperationalNote[] {
  return filterOperationalNotesForViewer(notes, session).filter((n) => n.linkedJobId === jobId);
}

export function jobLabelForOperationalNote(job: Job | undefined, snapshot?: string): string {
  if (job) {
    const addr = job.address?.trim() || "";
    const flat = job.flatNumber?.trim() || "";
    if (addr && flat) return `${addr} / ${flat}`;
    return addr || flat || job.client?.trim() || job.id;
  }
  return snapshot?.trim() || "";
}

export function resolveOperationalNoteJobLabel(note: OperationalNote, jobs: Job[]): string {
  if (!note.linkedJobId) return "";
  const job = jobs.find((j) => j.id === note.linkedJobId);
  return jobLabelForOperationalNote(job, note.linkedJobNameSnapshot);
}

function replaceNote(notes: OperationalNote[], updated: OperationalNote): OperationalNote[] {
  return notes.map((n) => (n.id === updated.id ? updated : n));
}

function touchActivity(
  note: OperationalNote,
  userId: string,
  at: string,
): Pick<OperationalNote, "lastActivityAt" | "lastActivityByUserId" | "updatedAt"> {
  return {
    lastActivityAt: at,
    lastActivityByUserId: userId,
    updatedAt: at,
  };
}

function auditFor(
  session: AdminSession,
  action: OperationalNoteAuditEntry["action"],
  note: OperationalNote,
  detail?: string,
): OperationalNoteAuditEntry {
  return buildOperationalNoteAuditEntry({
    action,
    userId: session.id,
    displayName: session.displayName,
    role: session.role,
    noteId: note.id,
    noteTitleSnapshot: note.title,
    detail,
  });
}

export function createOperationalNote(input: {
  notes: OperationalNote[];
  session: AdminSession;
  title: string;
  content: string;
  linkedJobId?: string;
  linkedJobNameSnapshot?: string;
  shareWithInspector?: boolean;
}): OperationalNoteMutationResult {
  const now = new Date().toISOString();
  const isInspector = adminIsInspector(input.session.role);
  const note: OperationalNote = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    content: input.content,
    authorUserId: input.session.id,
    authorDisplayName: input.session.displayName,
    authorRole: input.session.role,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    lastActivityByUserId: input.session.id,
    status: "active",
    linkedJobId: input.linkedJobId?.trim() || undefined,
    linkedJobNameSnapshot: input.linkedJobNameSnapshot?.trim() || undefined,
    shareWithInspector: isInspector ? true : input.shareWithInspector === true,
    contentRev: 1,
    comments: [],
    revisions: [],
  };
  return {
    notes: [note, ...input.notes],
    auditEntries: [auditFor(input.session, "create", note)],
  };
}

export function updateOperationalNoteContent(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
  title: string;
  content: string;
}): OperationalNoteMutationResult {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [] };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing) return { notes: input.notes, auditEntries: [] };
  const now = new Date().toISOString();
  const contentChanged = existing.content !== input.content;
  const titleChanged = existing.title !== input.title.trim();
  if (!contentChanged && !titleChanged) return { notes: input.notes, auditEntries: [] };

  const nextContentRev = contentChanged || titleChanged ? existing.contentRev + 1 : existing.contentRev;
  const revisions = contentChanged
    ? [
        ...existing.revisions,
        {
          id: crypto.randomUUID(),
          contentRev: nextContentRev,
          changedAt: now,
          changedByUserId: input.session.id,
          changedByDisplayName: input.session.displayName,
          previousContent: existing.content,
        },
      ]
    : existing.revisions;

  const updated: OperationalNote = {
    ...existing,
    title: input.title.trim(),
    content: input.content,
    contentRev: nextContentRev,
    revisions,
    ...touchActivity(existing, input.session.id, now),
  };

  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "update", updated)],
  };
}

export function addOperationalNoteComment(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
  text: string;
}): OperationalNoteMutationResult {
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing) return { notes: input.notes, auditEntries: [] };
  const trimmed = input.text.trim();
  if (!trimmed) return { notes: input.notes, auditEntries: [] };
  const now = new Date().toISOString();
  const comment: OperationalNoteComment = {
    id: crypto.randomUUID(),
    authorUserId: input.session.id,
    authorDisplayName: input.session.displayName,
    authorRole: input.session.role,
    text: trimmed,
    createdAt: now,
  };
  const updated: OperationalNote = {
    ...existing,
    comments: [...existing.comments, comment],
    contentRev: existing.contentRev + 1,
    ...touchActivity(existing, input.session.id, now),
  };
  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "comment", updated, trimmed.slice(0, 120))],
  };
}

export function archiveOperationalNote(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
}): OperationalNoteMutationResult {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [] };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing || existing.status === "archived") return { notes: input.notes, auditEntries: [] };
  const now = new Date().toISOString();
  const updated: OperationalNote = {
    ...existing,
    status: "archived",
    archivedAt: now,
    archivedByUserId: input.session.id,
    contentRev: existing.contentRev + 1,
    ...touchActivity(existing, input.session.id, now),
  };
  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "archive", updated)],
  };
}

export function restoreOperationalNote(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
}): OperationalNoteMutationResult {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [] };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing || existing.status !== "archived") return { notes: input.notes, auditEntries: [] };
  const now = new Date().toISOString();
  const updated: OperationalNote = {
    ...existing,
    status: "active",
    archivedAt: undefined,
    archivedByUserId: undefined,
    contentRev: existing.contentRev + 1,
    ...touchActivity(existing, input.session.id, now),
  };
  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "restore", updated)],
  };
}

export function setOperationalNoteShare(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
  shareWithInspector: boolean;
}): OperationalNoteMutationResult {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [] };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing || existing.shareWithInspector === input.shareWithInspector) {
    return { notes: input.notes, auditEntries: [] };
  }
  const now = new Date().toISOString();
  const updated: OperationalNote = {
    ...existing,
    shareWithInspector: input.shareWithInspector,
    contentRev: existing.contentRev + 1,
    ...touchActivity(existing, input.session.id, now),
  };
  const detail = input.shareWithInspector ? "Udostępniono inspektorowi" : "Ukryto przed inspektorem";
  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "share_toggle", updated, detail)],
  };
}

export function setOperationalNoteJobLink(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
  linkedJobId?: string;
  linkedJobNameSnapshot?: string;
}): OperationalNoteMutationResult {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [] };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing) return { notes: input.notes, auditEntries: [] };
  const nextJobId = input.linkedJobId?.trim() || undefined;
  const nextSnapshot = input.linkedJobNameSnapshot?.trim() || undefined;
  if (existing.linkedJobId === nextJobId && existing.linkedJobNameSnapshot === nextSnapshot) {
    return { notes: input.notes, auditEntries: [] };
  }
  const now = new Date().toISOString();
  const updated: OperationalNote = {
    ...existing,
    linkedJobId: nextJobId,
    linkedJobNameSnapshot: nextSnapshot,
    contentRev: existing.contentRev + 1,
    ...touchActivity(existing, input.session.id, now),
  };
  const detail = nextJobId
    ? `Powiązano z robotą: ${nextSnapshot || nextJobId}`
    : "Usunięto powiązanie z robotą";
  return {
    notes: replaceNote(input.notes, updated),
    auditEntries: [auditFor(input.session, "job_link_change", updated, detail)],
  };
}

export function deleteOperationalNoteLogical(input: {
  notes: OperationalNote[];
  session: AdminSession;
  noteId: string;
}): { notes: OperationalNote[]; auditEntries: OperationalNoteAuditEntry[]; deletedId: string } {
  if (inspectorStaffMutationBlocked(input.session)) {
    return { notes: input.notes, auditEntries: [], deletedId: "" };
  }
  const existing = input.notes.find((n) => n.id === input.noteId);
  if (!existing) return { notes: input.notes, auditEntries: [], deletedId: "" };
  return {
    notes: input.notes.filter((n) => n.id !== input.noteId),
    auditEntries: [auditFor(input.session, "delete", existing)],
    deletedId: existing.id,
  };
}

export function applyOperationalNoteMutation(
  notes: OperationalNote[],
  auditLog: OperationalNoteAuditEntry[],
  result: OperationalNoteMutationResult,
): { notes: OperationalNote[]; auditLog: OperationalNoteAuditEntry[] } {
  if (result.auditEntries.length === 0) return { notes, auditLog };
  return {
    notes: result.notes,
    auditLog: [...result.auditEntries, ...auditLog].slice(0, 3000),
  };
}
