/** Stan przeczytania notatek operacyjnych — KV `kw-operational-notes-read-state` (P1 ACK). */

import type { AdminAccount, AdminSession } from "@/lib/admin-auth";
import { adminIsInspector } from "@/lib/admin-auth";
import {
  appendOperationalNotesAuditLog,
  buildOperationalNoteAuditEntry,
  type OperationalNoteAuditEntry,
} from "@/lib/operational-notes-audit";
import { buildOperationalNoteAckAuditDetail } from "@/lib/operational-notes-audit-filters";
import {
  canViewOperationalNote,
  filterOperationalNotesForViewer,
  operationalNoteVisibleToInspector,
  type OperationalNote,
} from "@/lib/operational-notes";

export const OPERATIONAL_NOTES_READ_STATE_KEY = "kw-operational-notes-read-state";

export interface OperationalNoteReadReceipt {
  noteId: string;
  userId: string;
  ackAt: string;
  contentRevAtAck: number;
}

export type OperationalNoteReadStatusEntry = {
  userId: string;
  displayName: string;
  ackAt?: string;
};

export type OperationalNoteReadStatusSplit = {
  read: OperationalNoteReadStatusEntry[];
  unread: OperationalNoteReadStatusEntry[];
};

function receiptKey(noteId: string, userId: string): string {
  return `${noteId}:${userId}`;
}

function parseReceipt(raw: unknown): OperationalNoteReadReceipt | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<OperationalNoteReadReceipt>;
  if (!r.noteId || !r.userId) return null;
  return {
    noteId: String(r.noteId),
    userId: String(r.userId),
    ackAt: String(r.ackAt ?? ""),
    contentRevAtAck: typeof r.contentRevAtAck === "number" ? r.contentRevAtAck : 0,
  };
}

export function normalizeOperationalNotesReadState(raw: unknown): OperationalNoteReadReceipt[] {
  if (!Array.isArray(raw)) return [];
  const out: OperationalNoteReadReceipt[] = [];
  for (const item of raw) {
    const parsed = parseReceipt(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function mergeOperationalNotesReadState(
  local: unknown,
  cloud: unknown,
): OperationalNoteReadReceipt[] {
  const byKey = new Map<string, OperationalNoteReadReceipt>();
  for (const item of normalizeOperationalNotesReadState(local)) {
    byKey.set(receiptKey(item.noteId, item.userId), item);
  }
  for (const item of normalizeOperationalNotesReadState(cloud)) {
    const key = receiptKey(item.noteId, item.userId);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevAck = prev.ackAt || "";
    const nextAck = item.ackAt || "";
    byKey.set(key, nextAck >= prevAck ? item : prev);
  }
  return [...byKey.values()];
}

export function getOperationalNoteReceipt(
  readState: OperationalNoteReadReceipt[],
  noteId: string,
  userId: string,
): OperationalNoteReadReceipt | undefined {
  return readState.find((r) => r.noteId === noteId && r.userId === userId);
}

export function isOperationalNoteAcked(
  note: OperationalNote,
  userId: string,
  readState: OperationalNoteReadReceipt[],
): boolean {
  const receipt = getOperationalNoteReceipt(readState, note.id, userId);
  return receipt != null && receipt.contentRevAtAck === note.contentRev;
}

export function upsertOperationalNoteReceipt(
  readState: OperationalNoteReadReceipt[],
  receipt: OperationalNoteReadReceipt,
): OperationalNoteReadReceipt[] {
  const key = receiptKey(receipt.noteId, receipt.userId);
  const next = readState.filter((r) => receiptKey(r.noteId, r.userId) !== key);
  next.push(receipt);
  return next;
}

export function ackOperationalNote(
  readState: OperationalNoteReadReceipt[],
  note: OperationalNote,
  userId: string,
  at: string = new Date().toISOString(),
): OperationalNoteReadReceipt[] {
  return upsertOperationalNoteReceipt(readState, {
    noteId: note.id,
    userId,
    ackAt: at,
    contentRevAtAck: note.contentRev,
  });
}

export function ackOperationalNoteWithAudit(
  readState: OperationalNoteReadReceipt[],
  auditLog: OperationalNoteAuditEntry[],
  note: OperationalNote,
  session: AdminSession,
  at: string = new Date().toISOString(),
): { readState: OperationalNoteReadReceipt[]; auditLog: OperationalNoteAuditEntry[] } {
  const nextReadState = ackOperationalNote(readState, note, session.id, at);
  const ackEntry = buildOperationalNoteAuditEntry({
    action: "ack",
    userId: session.id,
    displayName: session.displayName,
    role: session.role,
    noteId: note.id,
    noteTitleSnapshot: note.title,
    detail: buildOperationalNoteAckAuditDetail(note.contentRev),
    at,
  });
  return {
    readState: nextReadState,
    auditLog: appendOperationalNotesAuditLog(auditLog, ackEntry),
  };
}

export function buildAuthorAutoAckReceipt(
  note: OperationalNote,
  at: string = new Date().toISOString(),
): OperationalNoteReadReceipt {
  return {
    noteId: note.id,
    userId: note.authorUserId,
    ackAt: at,
    contentRevAtAck: note.contentRev,
  };
}

function accountToSession(account: AdminAccount): AdminSession {
  return {
    id: account.id,
    login: account.login,
    displayName: account.displayName,
    role: account.role,
  };
}

export function resolveOperationalNoteAudience(
  note: OperationalNote,
  accounts: AdminAccount[],
): AdminAccount[] {
  return accounts.filter((account) => canViewOperationalNote(note, accountToSession(account)));
}

export function resolveOperationalNoteReadStatus(
  note: OperationalNote,
  readState: OperationalNoteReadReceipt[],
  accounts: AdminAccount[],
): OperationalNoteReadStatusSplit {
  const read: OperationalNoteReadStatusEntry[] = [];
  const unread: OperationalNoteReadStatusEntry[] = [];

  for (const account of resolveOperationalNoteAudience(note, accounts)) {
    const receipt = getOperationalNoteReceipt(readState, note.id, account.id);
    const entry: OperationalNoteReadStatusEntry = {
      userId: account.id,
      displayName: account.displayName,
      ackAt: receipt?.ackAt,
    };
    if (receipt && receipt.contentRevAtAck === note.contentRev) {
      read.push(entry);
    } else {
      unread.push({ userId: account.id, displayName: account.displayName });
    }
  }

  read.sort((a, b) => a.displayName.localeCompare(b.displayName, "pl"));
  unread.sort((a, b) => a.displayName.localeCompare(b.displayName, "pl"));
  return { read, unread };
}

export function countUnreadOperationalNotes(
  notes: OperationalNote[],
  readState: OperationalNoteReadReceipt[],
  session: AdminSession | null | undefined,
  options?: { includeArchived?: boolean; visibleJobIds?: ReadonlySet<string> },
): number {
  if (!session) return 0;
  const includeArchived = options?.includeArchived === true;
  const visibleJobIds = options?.visibleJobIds;
  const baseNotes = adminIsInspector(session.role) && visibleJobIds
    ? notes.filter((n) => operationalNoteVisibleToInspector(n, session, visibleJobIds))
    : filterOperationalNotesForViewer(notes, session);
  return baseNotes.filter((note) => {
    if (!includeArchived && note.status !== "active") return false;
    return !isOperationalNoteAcked(note, session.id, readState);
  }).length;
}
