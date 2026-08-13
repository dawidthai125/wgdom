/**
 * OWNER-INPUT-01 — localStorage store (append-only · Cloud Sync OFF).
 */

import {
  OWNER_RATE_INPUT_LS_KEY,
  OWNER_RATE_INPUT_SCHEMA_VERSION,
  type OwnerRateEvent,
  type OwnerRateInputStore,
} from "./types";

export function emptyOwnerRateInputStore(): OwnerRateInputStore {
  return { version: 1, events: [] };
}

function isActor(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const a = raw as { userId?: unknown; displayName?: unknown };
  if (typeof a.userId !== "string" || !a.userId.trim()) return false;
  if (a.displayName != null && typeof a.displayName !== "string") return false;
  return true;
}

function isEquipmentPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  if (typeof p.namePl !== "string" || !p.namePl.trim()) return false;
  if (p.equipmentKey != null && typeof p.equipmentKey !== "string") return false;
  if (p.quantity != null && typeof p.quantity !== "number") return false;
  if (p.unit != null && typeof p.unit !== "string") return false;
  return true;
}

function isTransportPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  if (typeof p.namePl !== "string" || !p.namePl.trim()) return false;
  if (p.transportKind != null && typeof p.transportKind !== "string") return false;
  if (p.quantity != null && typeof p.quantity !== "number") return false;
  if (p.unit != null && typeof p.unit !== "string") return false;
  if (p.distanceKm != null && typeof p.distanceKm !== "number") return false;
  if (p.trips != null && typeof p.trips !== "number") return false;
  if (p.tonnage != null && typeof p.tonnage !== "number") return false;
  return true;
}

function isPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as { domain?: unknown; equipment?: unknown; transport?: unknown };
  if (p.domain === "equipment") return isEquipmentPayload(p.equipment);
  if (p.domain === "transport") return isTransportPayload(p.transport);
  return false;
}

function isEvent(raw: unknown): raw is OwnerRateEvent {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Partial<OwnerRateEvent> & { kind?: string };
  if (e.schemaVersion !== OWNER_RATE_INPUT_SCHEMA_VERSION) return false;
  if (typeof e.questionId !== "string" || !e.questionId) return false;
  if (typeof e.tenderId !== "string" || !e.tenderId) return false;

  if (e.kind === "question_opened") {
    const q = e as Partial<OwnerRateQuestionOpenedLike>;
    if (q.domain !== "equipment" && q.domain !== "transport") return false;
    if (typeof q.promptPl !== "string" || !q.promptPl.trim()) return false;
    if (typeof q.evidenceSummaryPl !== "string") return false;
    if (
      q.askedByRole !== "cost_expert" &&
      q.askedByRole !== "chief" &&
      q.askedByRole !== "owner" &&
      q.askedByRole !== "system"
    ) {
      return false;
    }
    if (typeof q.askedAt !== "string" || !q.askedAt) return false;
    if (typeof q.createdAt !== "string" || !q.createdAt) return false;
    if (q.lineRef != null && typeof q.lineRef !== "string") return false;
    return isPayload(q.payload);
  }

  if (e.kind === "answer_submitted") {
    const a = e as Partial<OwnerRateAnswerLike>;
    if (typeof a.answerId !== "string" || !a.answerId) return false;
    if (typeof a.amountPlnNet !== "number" || !Number.isFinite(a.amountPlnNet)) return false;
    if (!(a.amountPlnNet > 0)) return false;
    if (typeof a.unit !== "string" || !a.unit.trim()) return false;
    if (a.currency !== "PLN") return false;
    if (a.notePl != null && typeof a.notePl !== "string") return false;
    if (!isActor(a.approvedBy)) return false;
    if (typeof a.approvedAt !== "string" || !a.approvedAt) return false;
    if (a.sourceClass !== "owner_input") return false;
    if (a.scope !== "tender_only") return false;
    if (typeof a.revisionN !== "number" || !Number.isInteger(a.revisionN) || a.revisionN < 1) {
      return false;
    }
    if (a.supersedesAnswerId != null && typeof a.supersedesAnswerId !== "string") return false;
    return true;
  }

  if (e.kind === "question_cancelled") {
    const c = e as Partial<OwnerRateCancelLike>;
    if (typeof c.cancelledAt !== "string" || !c.cancelledAt) return false;
    if (c.cancelledBy != null && !isActor(c.cancelledBy)) return false;
    return true;
  }

  return false;
}

/** Local duck types for narrow validation without circular imports. */
interface OwnerRateQuestionOpenedLike {
  domain: string;
  promptPl: string;
  evidenceSummaryPl: string;
  askedByRole: string;
  askedAt: string;
  createdAt: string;
  lineRef?: string;
  payload: unknown;
}

interface OwnerRateAnswerLike {
  answerId: string;
  amountPlnNet: number;
  unit: string;
  currency: string;
  notePl?: string;
  approvedBy: unknown;
  approvedAt: string;
  sourceClass: string;
  scope: string;
  revisionN: number;
  supersedesAnswerId?: string;
}

interface OwnerRateCancelLike {
  cancelledAt: string;
  cancelledBy?: unknown;
}

export function loadOwnerRateInputStore(): OwnerRateInputStore {
  try {
    if (typeof localStorage === "undefined") return emptyOwnerRateInputStore();
    const raw = localStorage.getItem(OWNER_RATE_INPUT_LS_KEY);
    if (!raw) return emptyOwnerRateInputStore();
    const parsed = JSON.parse(raw) as Partial<OwnerRateInputStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) {
      return emptyOwnerRateInputStore();
    }
    return { version: 1, events: parsed.events.filter(isEvent) };
  } catch {
    return emptyOwnerRateInputStore();
  }
}

/** Append-only write. Returns false on quota / unavailable. */
export function saveOwnerRateInputStore(store: OwnerRateInputStore): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(OWNER_RATE_INPUT_LS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function appendOwnerRateEvent(
  store: OwnerRateInputStore,
  event: OwnerRateEvent,
): OwnerRateInputStore {
  return {
    version: 1,
    events: [...store.events, event],
  };
}

/** Test / reset helper — does not delete history semantics; clears LS key. */
export function clearOwnerRateInputStore(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.removeItem(OWNER_RATE_INPUT_LS_KEY);
    return true;
  } catch {
    return false;
  }
}
