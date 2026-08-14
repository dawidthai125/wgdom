/**
 * WR-SOURCE-EVIDENCE-DB-01 — union-by-dedupeKey merge + empty-store guard.
 * NEVER whole-store destructive replace by newer timestamp alone.
 */

import {
  buildLaborSourceEvidenceCapReport,
  isLaborSourceEvidenceCapExceeded,
} from "@/lib/labor-source-evidence/caps";
import {
  computeLaborSourceEvidenceEtag,
  emptyLaborSourceEvidenceStore,
  isEmptyLaborSourceEvidenceStore,
  normalizeLaborSourceEvidenceObservation,
  normalizeLaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/normalize";
import type {
  LaborSourceEvidenceCapReport,
  LaborSourceEvidenceObservation,
  LaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/types";

function rankQuality(q: LaborSourceEvidenceObservation["qualityStatus"]): number {
  if (q === "VALID") return 3;
  if (q === "STALE" || q === "UNMATCHED") return 1;
  return 2;
}

function pickBetter(
  a: LaborSourceEvidenceObservation,
  b: LaborSourceEvidenceObservation,
): LaborSourceEvidenceObservation {
  const rq = rankQuality(b.qualityStatus) - rankQuality(a.qualityStatus);
  if (rq > 0) return b;
  if (rq < 0) return a;
  const ta = Date.parse(a.retrievedAt) || 0;
  const tb = Date.parse(b.retrievedAt) || 0;
  if (tb >= ta) return { ...b, evidenceId: a.evidenceId || b.evidenceId };
  return a;
}

/**
 * Empty must never wipe non-empty (LWW 460→34 class).
 * Non-empty peers always proceed to UNION (not document replace).
 */
export function preferAuthoritativeLaborSourceEvidenceStore(
  left: LaborSourceEvidenceStore,
  right: LaborSourceEvidenceStore,
): LaborSourceEvidenceStore | null {
  const leftEmpty = isEmptyLaborSourceEvidenceStore(left);
  const rightEmpty = isEmptyLaborSourceEvidenceStore(right);
  if (!leftEmpty && rightEmpty) return left;
  if (leftEmpty && !rightEmpty) return right;
  return null;
}

export function unionLaborSourceEvidenceObservations(
  existing: LaborSourceEvidenceObservation[],
  incoming: LaborSourceEvidenceObservation[],
  tombstones: ReadonlySet<string> = new Set(),
): LaborSourceEvidenceObservation[] {
  const byDedupe = new Map<string, LaborSourceEvidenceObservation>();
  for (const o of existing) {
    if (tombstones.has(o.evidenceId)) continue;
    byDedupe.set(o.dedupeKey, o);
  }
  for (const o of incoming) {
    if (tombstones.has(o.evidenceId)) continue;
    const prev = byDedupe.get(o.dedupeKey);
    byDedupe.set(o.dedupeKey, prev ? pickBetter(prev, o) : o);
  }
  return [...byDedupe.values()];
}

export type MergeLaborSourceEvidenceResult =
  | { ok: true; store: LaborSourceEvidenceStore }
  | {
      ok: false;
      reason: "cap_exceeded" | "empty_destructive";
      store: LaborSourceEvidenceStore;
      messagePl: string;
      capReport?: LaborSourceEvidenceCapReport;
    };

/**
 * Merge local + cloud (or existing + incoming delta) via UNION — not document LWW.
 */
export function mergeLaborSourceEvidenceStore(
  local: unknown,
  cloud: unknown,
  opts?: { incomingBatch?: LaborSourceEvidenceObservation[]; nowIso?: string },
): MergeLaborSourceEvidenceResult {
  const left = normalizeLaborSourceEvidenceStore(local);
  const right = normalizeLaborSourceEvidenceStore(cloud);
  const sole = preferAuthoritativeLaborSourceEvidenceStore(left, right);

  const tomb = new Set([...(left.tombstones || []), ...(right.tombstones || [])]);
  const incomingBatch = (opts?.incomingBatch || [])
    .map((o) => normalizeLaborSourceEvidenceObservation(o))
    .filter((o): o is LaborSourceEvidenceObservation => o != null);

  const peerObs = sole
    ? sole.observations
    : unionLaborSourceEvidenceObservations(left.observations, right.observations, tomb);

  const existingOnly = peerObs;
  const united = unionLaborSourceEvidenceObservations(existingOnly, incomingBatch, tomb);

  const capReport = buildLaborSourceEvidenceCapReport({
    existing: existingOnly,
    incomingBatch,
    projected: united,
  });
  if (isLaborSourceEvidenceCapExceeded(capReport) && incomingBatch.length > 0) {
    const keep = sole ?? (left.observations.length >= right.observations.length ? left : right);
    return {
      ok: false,
      reason: "cap_exceeded",
      store: {
        ...keep,
        observations: existingOnly,
        etag: computeLaborSourceEvidenceEtag(keep.revision, existingOnly),
      },
      messagePl: capReport.messagePl || "Evidence cap exceeded.",
      capReport,
    };
  }

  if (united.length === 0 && existingOnly.length > 0) {
    return {
      ok: false,
      reason: "empty_destructive",
      store: sole ?? left,
      messagePl: "Refusing empty/destructive evidence merge over non-empty store.",
    };
  }

  const nowIso = opts?.nowIso || new Date().toISOString();
  const baseRev = Math.max(left.revision, right.revision);
  const contentChanged =
    united.length !== existingOnly.length ||
    incomingBatch.length > 0 ||
    (!sole &&
      (united.length !== left.observations.length || united.length !== right.observations.length));
  const nextRevision = contentChanged ? baseRev + 1 : baseRev;

  return {
    ok: true,
    store: {
      schemaVersion: 1,
      revision: nextRevision,
      etag: computeLaborSourceEvidenceEtag(nextRevision, united),
      updatedAt: nowIso,
      observations: united,
      tombstones: [...tomb],
    },
  };
}

/** Apply a delta (incoming observations) onto existing with cap + authority checks. */
export function applyLaborSourceEvidenceDelta(
  existing: LaborSourceEvidenceStore,
  incoming: LaborSourceEvidenceObservation[],
  nowIso = new Date().toISOString(),
): MergeLaborSourceEvidenceResult {
  return mergeLaborSourceEvidenceStore(existing, emptyLaborSourceEvidenceStore(nowIso), {
    incomingBatch: incoming,
    nowIso,
  });
}
