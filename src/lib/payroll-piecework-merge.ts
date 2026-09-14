/**
 * PAYROLL AKORD Phase 2 — union-by-id merge + tombstone anti-resurrection.
 * Pattern aligned with extraCosts / early payouts (not kw-week-employees CAS).
 */

import {
  isPieceworkDeleted,
  normalizePayrollPieceworkState,
  pieceworkRecordClock,
  type PayrollPieceworkState,
  type PieceworkAdvance,
  type PieceworkAllocation,
  type PieceworkJob,
} from "@/lib/payroll-piecework-types";

type TimedRow = { id: string; updatedAt: string; deletedAt?: string; createdAt?: string };

function parseTs(v: unknown): number {
  if (typeof v !== "string" || !v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Same-id pick:
 * - deleted vs live → deleted wins (stale live cannot resurrect)
 * - both deleted → newer delete/update clock
 * - both live → newer updatedAt
 */
export function pickPieceworkRecordByLww<T extends TimedRow>(a: T, b: T): T {
  const aDel = isPieceworkDeleted(a);
  const bDel = isPieceworkDeleted(b);
  if (aDel && !bDel) return a;
  if (bDel && !aDel) return b;
  if (aDel && bDel) {
    const aAt = pieceworkRecordClock(a);
    const bAt = pieceworkRecordClock(b);
    if (bAt > aAt) return b;
    return a;
  }
  const aAt = parseTs(a.updatedAt) || pieceworkRecordClock(a);
  const bAt = parseTs(b.updatedAt) || pieceworkRecordClock(b);
  if (bAt > aAt) return b;
  return a;
}

export function mergePieceworkRecordsById<T extends TimedRow>(
  local: T[],
  cloud: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of local) {
    if (!item?.id) continue;
    byId.set(item.id, item);
  }
  for (const item of cloud) {
    if (!item?.id) continue;
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? pickPieceworkRecordByLww(prev, item) : item);
  }
  return [...byId.values()];
}

export function mergePayrollPieceworkState(local: unknown, cloud: unknown): PayrollPieceworkState {
  const l = normalizePayrollPieceworkState(local);
  const c = normalizePayrollPieceworkState(cloud);
  return {
    jobs: mergePieceworkRecordsById<PieceworkJob>(l.jobs, c.jobs),
    allocations: mergePieceworkRecordsById<PieceworkAllocation>(l.allocations, c.allocations),
    advances: mergePieceworkRecordsById<PieceworkAdvance>(l.advances, c.advances),
  };
}
