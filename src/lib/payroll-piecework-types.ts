/**
 * PAYROLL AKORD Phase 2 — durable piecework types.
 * NOT weekly payroll amounts. Advances = transaction ledger (never DayData.zaliczka).
 */

export const PAYROLL_PIECEWORK_KEY = "kw-payroll-piecework" as const;

export type PieceworkJobStatus = "active" | "closed";

/** Durable akord tied to existing Job (apartment SSOT). */
export interface PieceworkJob {
  id: string;
  /** Existing `Job.id` — address / flatNumber live on Job. */
  jobId: string;
  label?: string;
  status: PieceworkJobStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Per-employee agreed amount on a piecework job. */
export interface PieceworkAllocation {
  id: string;
  pieceworkJobId: string;
  directoryId: string;
  /** PLN — agreed final amount for this employee (V1: user-entered, not m²×rate). */
  agreedAmount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Additive advance transaction — SUM(active) is derived, never a sole LWW scalar. */
export interface PieceworkAdvance {
  id: string;
  pieceworkJobId: string;
  allocationId: string;
  directoryId: string;
  amount: number;
  paidAt: string;
  /** Audit only — does not define piecework lifetime. */
  weekFrom?: string;
  weekTo?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PayrollPieceworkState {
  jobs: PieceworkJob[];
  allocations: PieceworkAllocation[];
  advances: PieceworkAdvance[];
}

export function emptyPayrollPieceworkState(): PayrollPieceworkState {
  return { jobs: [], allocations: [], advances: [] };
}

/** PLN money — finite, 2 decimal places (same style as PayrollEarlyPayout). */
export function normalizeMoneyPln(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
  else return null;
  if (!Number.isFinite(n)) return null;
  return +n.toFixed(2);
}

export function isPieceworkDeleted(row: { deletedAt?: string } | null | undefined): boolean {
  return typeof row?.deletedAt === "string" && row.deletedAt.length > 0;
}

function parseIsoTs(v: unknown): number {
  if (typeof v !== "string" || !v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

export function pieceworkRecordClock(row: { updatedAt?: string; deletedAt?: string; createdAt?: string }): number {
  const del = parseIsoTs(row.deletedAt);
  if (del > 0) return del;
  const u = parseIsoTs(row.updatedAt);
  if (u > 0) return u;
  return parseIsoTs(row.createdAt);
}

function normalizeId(raw: unknown): string {
  return String(raw ?? "").trim();
}

function normalizeJobStatus(raw: unknown): PieceworkJobStatus {
  return raw === "closed" ? "closed" : "active";
}

export function normalizePieceworkJob(raw: unknown): PieceworkJob | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PieceworkJob>;
  const id = normalizeId(r.id);
  const jobId = normalizeId(r.jobId);
  if (!id || !jobId) return null;
  const createdAt = String(r.createdAt ?? "").trim() || String(r.updatedAt ?? "").trim();
  const updatedAt = String(r.updatedAt ?? "").trim() || createdAt;
  if (!createdAt || !updatedAt) return null;
  const label = r.label != null && String(r.label).trim() ? String(r.label).trim() : undefined;
  return {
    id,
    jobId,
    ...(label ? { label } : {}),
    status: normalizeJobStatus(r.status),
    createdAt,
    updatedAt,
    ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
  };
}

export function normalizePieceworkAllocation(raw: unknown): PieceworkAllocation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PieceworkAllocation>;
  const id = normalizeId(r.id);
  const pieceworkJobId = normalizeId(r.pieceworkJobId);
  const directoryId = normalizeId(r.directoryId);
  const agreedAmount = normalizeMoneyPln(r.agreedAmount);
  if (!id || !pieceworkJobId || !directoryId || agreedAmount == null || agreedAmount < 0) return null;
  const createdAt = String(r.createdAt ?? "").trim() || String(r.updatedAt ?? "").trim();
  const updatedAt = String(r.updatedAt ?? "").trim() || createdAt;
  if (!createdAt || !updatedAt) return null;
  return {
    id,
    pieceworkJobId,
    directoryId,
    agreedAmount,
    createdAt,
    updatedAt,
    ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
  };
}

export function normalizePieceworkAdvance(raw: unknown): PieceworkAdvance | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<PieceworkAdvance>;
  const id = normalizeId(r.id);
  const pieceworkJobId = normalizeId(r.pieceworkJobId);
  const allocationId = normalizeId(r.allocationId);
  const directoryId = normalizeId(r.directoryId);
  const amount = normalizeMoneyPln(r.amount);
  const paidAt = String(r.paidAt ?? "").trim();
  if (!id || !pieceworkJobId || !allocationId || !directoryId || amount == null || !(amount > 0) || !paidAt) {
    return null;
  }
  const createdAt = String(r.createdAt ?? "").trim() || paidAt;
  const updatedAt = String(r.updatedAt ?? "").trim() || createdAt;
  const weekFrom = r.weekFrom != null && String(r.weekFrom).trim() ? String(r.weekFrom).trim() : undefined;
  const weekTo = r.weekTo != null && String(r.weekTo).trim() ? String(r.weekTo).trim() : undefined;
  const note = r.note != null && String(r.note).trim() ? String(r.note).trim() : undefined;
  return {
    id,
    pieceworkJobId,
    allocationId,
    directoryId,
    amount,
    paidAt,
    ...(weekFrom ? { weekFrom } : {}),
    ...(weekTo ? { weekTo } : {}),
    ...(note ? { note } : {}),
    createdAt,
    updatedAt,
    ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
  };
}

function normalizeList<T>(raw: unknown, normalizeOne: (x: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const n = normalizeOne(item);
    if (!n) continue;
    const id = (n as { id: string }).id;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(n);
  }
  return out;
}

export function normalizePayrollPieceworkState(raw: unknown): PayrollPieceworkState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyPayrollPieceworkState();
  const r = raw as Partial<PayrollPieceworkState>;
  return {
    jobs: normalizeList(r.jobs, normalizePieceworkJob),
    allocations: normalizeList(r.allocations, normalizePieceworkAllocation),
    advances: normalizeList(r.advances, normalizePieceworkAdvance),
  };
}

export function isActivePieceworkJob(job: PieceworkJob | null | undefined): boolean {
  return !!job && !isPieceworkDeleted(job);
}

export function isActivePieceworkAllocation(a: PieceworkAllocation | null | undefined): boolean {
  return !!a && !isPieceworkDeleted(a) && a.agreedAmount >= 0;
}

export function isActivePieceworkAdvance(a: PieceworkAdvance | null | undefined): boolean {
  return !!a && !isPieceworkDeleted(a) && a.amount > 0;
}
