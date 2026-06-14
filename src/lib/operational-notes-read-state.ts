/** Stan przeczytania notatek operacyjnych — KV `kw-operational-notes-read-state` (ACK w P1). */

export const OPERATIONAL_NOTES_READ_STATE_KEY = "kw-operational-notes-read-state";

export interface OperationalNoteReadReceipt {
  noteId: string;
  userId: string;
  ackAt: string;
  contentRevAtAck: number;
}

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
