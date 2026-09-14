/**
 * PAYROLL AKORD Phase 2 — pure domain ops + calculations.
 * No React. No kw-week-employees. No DayData.zaliczka.
 */

import { mergePayrollPieceworkState } from "@/lib/payroll-piecework-merge";
import {
  emptyPayrollPieceworkState,
  isActivePieceworkAdvance,
  isActivePieceworkAllocation,
  isActivePieceworkJob,
  isPieceworkDeleted,
  normalizeMoneyPln,
  normalizePayrollPieceworkState,
  type PayrollPieceworkState,
  type PieceworkAdvance,
  type PieceworkAllocation,
  type PieceworkJob,
  type PieceworkJobStatus,
} from "@/lib/payroll-piecework-types";

export type PieceworkOpError =
  | "invalid_id"
  | "invalid_job_id"
  | "invalid_directory_id"
  | "invalid_amount"
  | "invalid_agreed_amount"
  | "not_found"
  | "already_deleted"
  | "advance_exceeds_agreed"
  | "missing_paid_at";

export type PieceworkOpResult =
  | { ok: true; state: PayrollPieceworkState }
  | { ok: false; error: PieceworkOpError };

function nowIso(now?: string): string {
  return now && String(now).trim() ? String(now).trim() : new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function cloneState(state: PayrollPieceworkState): PayrollPieceworkState {
  return normalizePayrollPieceworkState(JSON.parse(JSON.stringify(state)));
}

export function sumActiveAdvances(
  advances: PieceworkAdvance[],
  allocationId: string,
  excludeAdvanceId?: string,
): number {
  const aid = String(allocationId ?? "").trim();
  if (!aid) return 0;
  let sum = 0;
  for (const a of advances) {
    if (!isActivePieceworkAdvance(a)) continue;
    if (a.allocationId !== aid) continue;
    if (excludeAdvanceId && a.id === excludeAdvanceId) continue;
    sum += a.amount;
  }
  return +sum.toFixed(2);
}

export function remainingForAllocation(
  allocation: PieceworkAllocation | null | undefined,
  advances: PieceworkAdvance[],
): number {
  if (!allocation || !isActivePieceworkAllocation(allocation)) return 0;
  const rem = allocation.agreedAmount - sumActiveAdvances(advances, allocation.id);
  return +Math.max(0, rem).toFixed(2);
}

export function canAddAdvanceAmount(
  allocation: PieceworkAllocation | null | undefined,
  advances: PieceworkAdvance[],
  amount: number,
  excludeAdvanceId?: string,
): boolean {
  if (!allocation || !isActivePieceworkAllocation(allocation)) return false;
  const money = normalizeMoneyPln(amount);
  if (money == null || !(money > 0)) return false;
  const used = sumActiveAdvances(advances, allocation.id, excludeAdvanceId);
  return +(used + money).toFixed(2) <= allocation.agreedAmount;
}

export function createPieceworkJob(
  state: PayrollPieceworkState,
  input: { jobId: string; label?: string; status?: PieceworkJobStatus; id?: string; now?: string },
): PieceworkOpResult {
  const jobId = String(input.jobId ?? "").trim();
  if (!jobId) return { ok: false, error: "invalid_job_id" };
  const id = String(input.id ?? "").trim() || newId();
  if (!id) return { ok: false, error: "invalid_id" };
  const ts = nowIso(input.now);
  const next = cloneState(state);
  if (next.jobs.some((j) => j.id === id)) return { ok: false, error: "invalid_id" };
  const job: PieceworkJob = {
    id,
    jobId,
    ...(input.label != null && String(input.label).trim() ? { label: String(input.label).trim() } : {}),
    status: input.status === "closed" ? "closed" : "active",
    createdAt: ts,
    updatedAt: ts,
  };
  next.jobs.push(job);
  return { ok: true, state: next };
}

export function updatePieceworkJob(
  state: PayrollPieceworkState,
  input: { id: string; label?: string; status?: PieceworkJobStatus; now?: string },
): PieceworkOpResult {
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.jobs.findIndex((j) => j.id === id);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.jobs[idx];
  if (isPieceworkDeleted(cur)) return { ok: false, error: "already_deleted" };
  const ts = nowIso(input.now);
  const nextJob: PieceworkJob = {
    ...cur,
    updatedAt: ts,
  };
  if (input.status !== undefined) {
    nextJob.status = input.status === "closed" ? "closed" : "active";
  }
  if (input.label !== undefined) {
    const label = String(input.label).trim();
    if (label) nextJob.label = label;
    else delete nextJob.label;
  }
  next.jobs[idx] = nextJob;
  return { ok: true, state: next };
}

export function softDeletePieceworkJob(
  state: PayrollPieceworkState,
  id: string,
  now?: string,
): PieceworkOpResult {
  const jobId = String(id ?? "").trim();
  if (!jobId) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.jobs.findIndex((j) => j.id === jobId);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.jobs[idx];
  if (isPieceworkDeleted(cur)) return { ok: true, state: next };
  const ts = nowIso(now);
  next.jobs[idx] = { ...cur, deletedAt: ts, updatedAt: ts };
  return { ok: true, state: next };
}

export function createAllocation(
  state: PayrollPieceworkState,
  input: {
    pieceworkJobId: string;
    directoryId: string;
    agreedAmount: number;
    id?: string;
    now?: string;
  },
): PieceworkOpResult {
  const pieceworkJobId = String(input.pieceworkJobId ?? "").trim();
  const directoryId = String(input.directoryId ?? "").trim();
  const agreedAmount = normalizeMoneyPln(input.agreedAmount);
  if (!pieceworkJobId) return { ok: false, error: "invalid_id" };
  if (!directoryId) return { ok: false, error: "invalid_directory_id" };
  if (agreedAmount == null || agreedAmount < 0) return { ok: false, error: "invalid_agreed_amount" };
  const job = state.jobs.find((j) => j.id === pieceworkJobId);
  if (!job || !isActivePieceworkJob(job)) return { ok: false, error: "not_found" };
  const id = String(input.id ?? "").trim() || newId();
  if (state.allocations.some((a) => a.id === id)) return { ok: false, error: "invalid_id" };
  const ts = nowIso(input.now);
  const next = cloneState(state);
  next.allocations.push({
    id,
    pieceworkJobId,
    directoryId,
    agreedAmount,
    createdAt: ts,
    updatedAt: ts,
  });
  return { ok: true, state: next };
}

export function updateAllocation(
  state: PayrollPieceworkState,
  input: { id: string; agreedAmount?: number; now?: string },
): PieceworkOpResult {
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.allocations.findIndex((a) => a.id === id);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.allocations[idx];
  if (isPieceworkDeleted(cur)) return { ok: false, error: "already_deleted" };
  let agreedAmount = cur.agreedAmount;
  if (input.agreedAmount !== undefined) {
    const money = normalizeMoneyPln(input.agreedAmount);
    if (money == null || money < 0) return { ok: false, error: "invalid_agreed_amount" };
    agreedAmount = money;
  }
  const advanced = sumActiveAdvances(next.advances, id);
  if (advanced > agreedAmount) return { ok: false, error: "advance_exceeds_agreed" };
  const ts = nowIso(input.now);
  next.allocations[idx] = { ...cur, agreedAmount, updatedAt: ts };
  return { ok: true, state: next };
}

export function softDeleteAllocation(
  state: PayrollPieceworkState,
  id: string,
  now?: string,
): PieceworkOpResult {
  const allocationId = String(id ?? "").trim();
  if (!allocationId) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.allocations.findIndex((a) => a.id === allocationId);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.allocations[idx];
  if (isPieceworkDeleted(cur)) return { ok: true, state: next };
  const ts = nowIso(now);
  next.allocations[idx] = { ...cur, deletedAt: ts, updatedAt: ts };
  return { ok: true, state: next };
}

export function createAdvance(
  state: PayrollPieceworkState,
  input: {
    allocationId: string;
    amount: number;
    paidAt?: string;
    weekFrom?: string;
    weekTo?: string;
    note?: string;
    id?: string;
    now?: string;
  },
): PieceworkOpResult {
  const allocationId = String(input.allocationId ?? "").trim();
  if (!allocationId) return { ok: false, error: "invalid_id" };
  const amount = normalizeMoneyPln(input.amount);
  if (amount == null || !(amount > 0)) return { ok: false, error: "invalid_amount" };
  const allocation = state.allocations.find((a) => a.id === allocationId);
  if (!allocation || !isActivePieceworkAllocation(allocation)) return { ok: false, error: "not_found" };
  if (!canAddAdvanceAmount(allocation, state.advances, amount)) {
    return { ok: false, error: "advance_exceeds_agreed" };
  }
  const id = String(input.id ?? "").trim() || newId();
  if (state.advances.some((a) => a.id === id)) return { ok: false, error: "invalid_id" };
  const ts = nowIso(input.now);
  const paidAt = String(input.paidAt ?? ts).trim();
  if (!paidAt) return { ok: false, error: "missing_paid_at" };
  const next = cloneState(state);
  const row: PieceworkAdvance = {
    id,
    pieceworkJobId: allocation.pieceworkJobId,
    allocationId,
    directoryId: allocation.directoryId,
    amount,
    paidAt,
    createdAt: ts,
    updatedAt: ts,
  };
  if (input.weekFrom != null && String(input.weekFrom).trim()) row.weekFrom = String(input.weekFrom).trim();
  if (input.weekTo != null && String(input.weekTo).trim()) row.weekTo = String(input.weekTo).trim();
  if (input.note != null && String(input.note).trim()) row.note = String(input.note).trim();
  next.advances.push(row);
  return { ok: true, state: next };
}

export function updateAdvance(
  state: PayrollPieceworkState,
  input: {
    id: string;
    amount?: number;
    paidAt?: string;
    note?: string;
    weekFrom?: string;
    weekTo?: string;
    now?: string;
  },
): PieceworkOpResult {
  const id = String(input.id ?? "").trim();
  if (!id) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.advances.findIndex((a) => a.id === id);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.advances[idx];
  if (isPieceworkDeleted(cur)) return { ok: false, error: "already_deleted" };
  const allocation = next.allocations.find((a) => a.id === cur.allocationId);
  if (!allocation || !isActivePieceworkAllocation(allocation)) return { ok: false, error: "not_found" };

  let amount = cur.amount;
  if (input.amount !== undefined) {
    const money = normalizeMoneyPln(input.amount);
    if (money == null || !(money > 0)) return { ok: false, error: "invalid_amount" };
    amount = money;
  }
  if (!canAddAdvanceAmount(allocation, next.advances, amount, id)) {
    return { ok: false, error: "advance_exceeds_agreed" };
  }

  const ts = nowIso(input.now);
  const updated: PieceworkAdvance = {
    ...cur,
    amount,
    updatedAt: ts,
    ...(input.paidAt !== undefined ? { paidAt: String(input.paidAt).trim() || cur.paidAt } : {}),
  };
  if (input.note !== undefined) {
    if (String(input.note).trim()) updated.note = String(input.note).trim();
    else delete updated.note;
  }
  if (input.weekFrom !== undefined) {
    if (String(input.weekFrom).trim()) updated.weekFrom = String(input.weekFrom).trim();
    else delete updated.weekFrom;
  }
  if (input.weekTo !== undefined) {
    if (String(input.weekTo).trim()) updated.weekTo = String(input.weekTo).trim();
    else delete updated.weekTo;
  }
  next.advances[idx] = updated;
  return { ok: true, state: next };
}

export function softDeleteAdvance(
  state: PayrollPieceworkState,
  id: string,
  now?: string,
): PieceworkOpResult {
  const advanceId = String(id ?? "").trim();
  if (!advanceId) return { ok: false, error: "invalid_id" };
  const next = cloneState(state);
  const idx = next.advances.findIndex((a) => a.id === advanceId);
  if (idx < 0) return { ok: false, error: "not_found" };
  const cur = next.advances[idx];
  if (isPieceworkDeleted(cur)) return { ok: true, state: next };
  const ts = nowIso(now);
  next.advances[idx] = { ...cur, deletedAt: ts, updatedAt: ts };
  return { ok: true, state: next };
}

/** Persist round-trip helper (LS / JSON) — does not write Cloud. */
export function persistRoundTripPieceworkState(state: PayrollPieceworkState): PayrollPieceworkState {
  return normalizePayrollPieceworkState(JSON.parse(JSON.stringify(state)));
}

export {
  emptyPayrollPieceworkState,
  mergePayrollPieceworkState,
  normalizePayrollPieceworkState,
};
