/**
 * WR-SOURCE-EVIDENCE-DB-01 — local store + etag/CAS (MVP).
 * NEVER writes Work Catalog / OUR RATE / Accept / margin.
 */

import { assertLaborSourceEvidenceHostLock } from "@/lib/labor-source-evidence/host-lock";
import {
  applyLaborSourceEvidenceDelta,
  mergeLaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/merge";
import {
  emptyLaborSourceEvidenceStore,
  normalizeLaborSourceEvidenceObservation,
  normalizeLaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/normalize";
import {
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceObservation,
  type LaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/types";

export { LABOR_SOURCE_EVIDENCE_STORAGE_KEY };

export function loadLaborSourceEvidenceStoreLocal(): LaborSourceEvidenceStore {
  try {
    if (typeof localStorage === "undefined") return emptyLaborSourceEvidenceStore();
    const raw = localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
    if (!raw) return emptyLaborSourceEvidenceStore();
    return normalizeLaborSourceEvidenceStore(JSON.parse(raw));
  } catch {
    return emptyLaborSourceEvidenceStore();
  }
}

/** Persist only Evidence key — never touches Work Catalog. */
export function saveLaborSourceEvidenceStoreLocal(store: LaborSourceEvidenceStore): void {
  if (typeof localStorage === "undefined") return;
  const next = normalizeLaborSourceEvidenceStore(store);
  localStorage.setItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(next));
}

/**
 * Optimistic concurrency: write only if expectedEtag matches current store etag.
 * On mismatch → conflict (caller reloads, re-merges, retries).
 */
export function casWriteLaborSourceEvidenceStore(input: {
  expectedEtag: string;
  next: LaborSourceEvidenceStore;
}): LaborSourceEvidenceCasResult {
  const current = loadLaborSourceEvidenceStoreLocal();
  if (current.etag !== input.expectedEtag) {
    return {
      ok: false,
      reason: "etag_mismatch",
      store: current,
      messagePl: "Evidence CAS conflict — reload, re-merge, retry.",
    };
  }
  const normalized = normalizeLaborSourceEvidenceStore(input.next);
  // Never allow empty next to wipe non-empty current via CAS
  if (normalized.observations.length === 0 && current.observations.length > 0) {
    return {
      ok: false,
      reason: "empty_destructive",
      store: current,
      messagePl: "Refusing empty CAS write over non-empty evidence store.",
    };
  }
  saveLaborSourceEvidenceStoreLocal(normalized);
  return { ok: true, store: loadLaborSourceEvidenceStoreLocal() };
}

/**
 * Append/upsert observations with host lock + caps + CAS retry loop (local).
 */
export function upsertLaborSourceEvidenceObservations(input: {
  observations: LaborSourceEvidenceObservation[];
  maxRetries?: number;
  nowIso?: string;
}): LaborSourceEvidenceCasResult {
  const nowIso = input.nowIso || new Date().toISOString();
  const normalizedIncoming: LaborSourceEvidenceObservation[] = [];
  for (const raw of input.observations) {
    const o = normalizeLaborSourceEvidenceObservation(raw, nowIso);
    if (!o) continue;
    const host = assertLaborSourceEvidenceHostLock({
      sourceId: o.sourceId,
      sourceUrl: o.sourceUrl,
    });
    if (!host.ok) {
      return {
        ok: false,
        reason: "host_rejected",
        store: loadLaborSourceEvidenceStoreLocal(),
        messagePl: host.messagePl,
      };
    }
    normalizedIncoming.push(o);
  }

  const maxRetries = input.maxRetries ?? 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = loadLaborSourceEvidenceStoreLocal();
    const merged = applyLaborSourceEvidenceDelta(current, normalizedIncoming, nowIso);
    if (!merged.ok) {
      return {
        ok: false,
        reason: merged.reason === "cap_exceeded" ? "cap_exceeded" : "empty_destructive",
        store: merged.store,
        messagePl: merged.messagePl,
        capReport: merged.capReport,
      };
    }
    const cas = casWriteLaborSourceEvidenceStore({
      expectedEtag: current.etag,
      next: merged.store,
    });
    if (cas.ok) return cas;
    if (cas.reason !== "etag_mismatch") return cas;
    // conflict → retry
  }
  return {
    ok: false,
    reason: "etag_mismatch",
    store: loadLaborSourceEvidenceStoreLocal(),
    messagePl: "Evidence CAS retries exhausted.",
  };
}

/** Cloud-sync adapter — pure union merge. */
export function mergeLaborSourceEvidenceDataKey(local: unknown, cloud: unknown): unknown {
  const r = mergeLaborSourceEvidenceStore(local, cloud);
  return r.ok ? r.store : r.store;
}

export function clearLaborSourceEvidenceStoreLocalForTests(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
}
