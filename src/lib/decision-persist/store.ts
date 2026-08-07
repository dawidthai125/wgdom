/**
 * DECISION-PERSIST-01 — localStorage store (append-only).
 */

import {
  DECISION_PERSIST_LS_KEY,
  type DecisionPersistRecord,
  type DecisionPersistStore,
} from "./types";

export function emptyDecisionPersistStore(): DecisionPersistStore {
  return { version: 1, records: [] };
}

function isRecord(raw: unknown): raw is DecisionPersistRecord {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Partial<DecisionPersistRecord>;
  if (typeof r.decisionId !== "string" || !r.decisionId) return false;
  if (typeof r.tenderId !== "string" || !r.tenderId) return false;
  if (typeof r.caseId !== "string" || !r.caseId) return false;
  if (r.action !== "approve" && r.action !== "reject" && r.action !== "needs_review") {
    return false;
  }
  if (r.scenario != null && typeof r.scenario !== "string") return false;
  if (!r.actor || typeof r.actor.userId !== "string" || !r.actor.userId) return false;
  if (typeof r.createdAt !== "string" || !r.createdAt) return false;
  if (typeof r.dossierFinishedAt !== "string" || !r.dossierFinishedAt) return false;
  const snap = r.validationSnapshot;
  if (!snap || typeof snap !== "object") return false;
  if (
    snap.verdict !== "validated" &&
    snap.verdict !== "needs_review" &&
    snap.verdict !== "blocked"
  ) {
    return false;
  }
  if (typeof snap.hardCount !== "number" || typeof snap.softCount !== "number") {
    return false;
  }
  if (!r.audit || r.audit.kind !== "recorded") return false;
  if (r.schemaVersion !== 1) return false;
  return true;
}

export function loadDecisionPersistStore(): DecisionPersistStore {
  try {
    if (typeof localStorage === "undefined") return emptyDecisionPersistStore();
    const raw = localStorage.getItem(DECISION_PERSIST_LS_KEY);
    if (!raw) return emptyDecisionPersistStore();
    const parsed = JSON.parse(raw) as Partial<DecisionPersistStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
      return emptyDecisionPersistStore();
    }
    const records = parsed.records.filter(isRecord);
    return { version: 1, records };
  } catch {
    return emptyDecisionPersistStore();
  }
}

/** Append-only write. Returns false on quota / unavailable. */
export function saveDecisionPersistStore(store: DecisionPersistStore): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(DECISION_PERSIST_LS_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function appendRecordToStore(
  store: DecisionPersistStore,
  record: DecisionPersistRecord,
): DecisionPersistStore {
  return {
    version: 1,
    records: [...store.records, record],
  };
}
