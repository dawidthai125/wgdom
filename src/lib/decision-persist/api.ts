/**
 * DECISION-PERSIST-01 — public API (LOCKED names).
 * recordDecision · hydrateDecision · listDecisionHistory
 */

import type { DecydentLocalDecision } from "@/lib/decision-workspace-ui";
import {
  appendRecordToStore,
  loadDecisionPersistStore,
  saveDecisionPersistStore,
} from "./store";
import {
  DECISION_PERSIST_SCHEMA_VERSION,
  type DecisionPersistRecord,
  type DecisionPersistValidationSnapshot,
  type ListDecisionHistoryFilter,
  type RecordDecisionInput,
} from "./types";

function newDecisionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `dp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isValidSnapshot(
  snap: DecisionPersistValidationSnapshot | null | undefined,
): snap is DecisionPersistValidationSnapshot {
  if (!snap) return false;
  if (
    snap.verdict !== "validated" &&
    snap.verdict !== "needs_review" &&
    snap.verdict !== "blocked"
  ) {
    return false;
  }
  return (
    typeof snap.hardCount === "number" &&
    Number.isFinite(snap.hardCount) &&
    typeof snap.softCount === "number" &&
    Number.isFinite(snap.softCount)
  );
}

function isValidInput(input: RecordDecisionInput): boolean {
  if (!input.tenderId?.trim()) return false;
  if (!input.caseId?.trim()) return false;
  if (!input.dossierFinishedAt?.trim()) return false;
  if (
    input.action !== "approve" &&
    input.action !== "reject" &&
    input.action !== "needs_review"
  ) {
    return false;
  }
  if (!input.actor?.userId?.trim()) return false;
  if (!isValidSnapshot(input.validationSnapshot)) return false;
  if (input.scenario != null && typeof input.scenario !== "string") return false;
  return true;
}

/**
 * Duck-type thin snapshot from Validation result already in Host (zero Validation BC).
 */
export function buildValidationSnapshot(raw: {
  verdict?: string;
  hardCount?: number;
  softCount?: number;
  report?: { hardCount?: number; softCount?: number };
  hardFindings?: unknown[];
  softFindings?: unknown[];
} | null): DecisionPersistValidationSnapshot | null {
  if (!raw || typeof raw.verdict !== "string") return null;
  if (
    raw.verdict !== "validated" &&
    raw.verdict !== "needs_review" &&
    raw.verdict !== "blocked"
  ) {
    return null;
  }
  const hardCount =
    typeof raw.report?.hardCount === "number"
      ? raw.report.hardCount
      : typeof raw.hardCount === "number"
        ? raw.hardCount
        : Array.isArray(raw.hardFindings)
          ? raw.hardFindings.length
          : NaN;
  const softCount =
    typeof raw.report?.softCount === "number"
      ? raw.report.softCount
      : typeof raw.softCount === "number"
        ? raw.softCount
        : Array.isArray(raw.softFindings)
          ? raw.softFindings.length
          : NaN;
  if (!Number.isFinite(hardCount) || !Number.isFinite(softCount)) return null;
  return {
    verdict: raw.verdict,
    hardCount,
    softCount,
  };
}

export function recordDecision(
  input: RecordDecisionInput,
): DecisionPersistRecord | null {
  if (!isValidInput(input)) return null;

  const record: DecisionPersistRecord = {
    decisionId: newDecisionId(),
    tenderId: input.tenderId.trim(),
    caseId: input.caseId.trim(),
    action: input.action,
    scenario:
      input.action === "approve"
        ? input.scenario?.trim()
          ? input.scenario.trim()
          : null
        : null,
    actor: {
      userId: input.actor.userId.trim(),
      ...(input.actor.displayName?.trim()
        ? { displayName: input.actor.displayName.trim() }
        : {}),
    },
    createdAt: new Date().toISOString(),
    dossierFinishedAt: input.dossierFinishedAt.trim(),
    validationSnapshot: {
      verdict: input.validationSnapshot.verdict,
      hardCount: input.validationSnapshot.hardCount,
      softCount: input.validationSnapshot.softCount,
    },
    audit: { kind: "recorded" },
    schemaVersion: DECISION_PERSIST_SCHEMA_VERSION,
  };

  const store = loadDecisionPersistStore();
  const next = appendRecordToStore(store, record);
  if (!saveDecisionPersistStore(next)) return null;
  return record;
}

function matchesFilter(
  r: DecisionPersistRecord,
  filter?: ListDecisionHistoryFilter,
): boolean {
  if (!filter) return true;
  if (filter.tenderId != null && r.tenderId !== filter.tenderId) return false;
  if (filter.caseId != null && r.caseId !== filter.caseId) return false;
  if (
    filter.dossierFinishedAt != null &&
    r.dossierFinishedAt !== filter.dossierFinishedAt
  ) {
    return false;
  }
  return true;
}

export function listDecisionHistory(
  filter?: ListDecisionHistoryFilter,
): readonly DecisionPersistRecord[] {
  const store = loadDecisionPersistStore();
  return store.records.filter((r) => matchesFilter(r, filter));
}

function selectLatest(
  tenderId: string,
  caseId: string,
  dossierFinishedAt: string,
): DecisionPersistRecord | null {
  // Append-only: on createdAt tie, later store index wins (same-ms double write).
  const store = loadDecisionPersistStore();
  let best: DecisionPersistRecord | null = null;
  let bestIndex = -1;
  for (let i = 0; i < store.records.length; i += 1) {
    const cur = store.records[i]!;
    if (
      cur.tenderId !== tenderId ||
      cur.caseId !== caseId ||
      cur.dossierFinishedAt !== dossierFinishedAt
    ) {
      continue;
    }
    if (
      !best ||
      cur.createdAt > best.createdAt ||
      (cur.createdAt === best.createdAt && i > bestIndex)
    ) {
      best = cur;
      bestIndex = i;
    }
  }
  return best;
}

export function hydrateDecision(
  tenderId: string,
  caseId: string,
  dossierFinishedAt: string,
): DecydentLocalDecision | null {
  if (!tenderId?.trim() || !caseId?.trim() || !dossierFinishedAt?.trim()) {
    return null;
  }
  const latest = selectLatest(
    tenderId.trim(),
    caseId.trim(),
    dossierFinishedAt.trim(),
  );
  if (!latest) return null;
  return {
    action: latest.action,
    scenarioStrategy: latest.scenario,
    decidedAt: latest.createdAt,
    caseId: latest.caseId,
  };
}
