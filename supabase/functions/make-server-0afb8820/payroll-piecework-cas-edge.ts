/**
 * Edge-local piecework CAS helpers (Deno) — mirrors src/lib Phase 2 merge + 4A invariant.
 * Keep in sync with payroll-piecework-merge / invariant / server-write (no src/ imports on Edge).
 */

export const PAYROLL_PIECEWORK_KEY_EDGE = "kw-payroll-piecework";
export const PAYROLL_PIECEWORK_META_KEY_EDGE = "kw-payroll-piecework-meta";

export const PIECEWORK_STALE_REVISION_CODE_EDGE = "piecework_stale_revision";
export const PIECEWORK_LEGACY_CLIENT_CODE_EDGE = "piecework_legacy_client_rejected";
export const PIECEWORK_INVARIANT_VIOLATED_CODE_EDGE = "piecework_invariant_violated";

type TimedRow = { id: string; updatedAt: string; deletedAt?: string; createdAt?: string };

function parseTs(v: unknown): number {
  if (typeof v !== "string" || !v) return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

function isDeleted(row: { deletedAt?: string } | null | undefined): boolean {
  return typeof row?.deletedAt === "string" && row.deletedAt.length > 0;
}

function recordClock(row: { updatedAt?: string; deletedAt?: string; createdAt?: string }): number {
  const del = parseTs(row.deletedAt);
  if (del > 0) return del;
  const u = parseTs(row.updatedAt);
  if (u > 0) return u;
  return parseTs(row.createdAt);
}

function pickByLww<T extends TimedRow>(a: T, b: T): T {
  const aDel = isDeleted(a);
  const bDel = isDeleted(b);
  if (aDel && !bDel) return a;
  if (bDel && !aDel) return b;
  if (aDel && bDel) {
    return recordClock(b) > recordClock(a) ? b : a;
  }
  const aAt = parseTs(a.updatedAt) || recordClock(a);
  const bAt = parseTs(b.updatedAt) || recordClock(b);
  return bAt > aAt ? b : a;
}

function mergeById<T extends TimedRow>(local: T[], cloud: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of local) {
    if (!item?.id) continue;
    byId.set(item.id, item);
  }
  for (const item of cloud) {
    if (!item?.id) continue;
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? pickByLww(prev, item) : item);
  }
  return [...byId.values()];
}

function money(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
  else return null;
  if (!Number.isFinite(n)) return null;
  return +n.toFixed(2);
}

function nid(raw: unknown): string {
  return String(raw ?? "").trim();
}

export type EdgePieceworkState = {
  jobs: Array<Record<string, unknown> & TimedRow>;
  allocations: Array<Record<string, unknown> & TimedRow & { agreedAmount: number }>;
  advances: Array<Record<string, unknown> & TimedRow & { amount: number; allocationId: string }>;
};

export function emptyEdgePieceworkState(): EdgePieceworkState {
  return { jobs: [], allocations: [], advances: [] };
}

function normalizeList(
  raw: unknown,
  normalizeOne: (x: unknown) => (Record<string, unknown> & TimedRow) | null,
): Array<Record<string, unknown> & TimedRow> {
  if (!Array.isArray(raw)) return [];
  const out: Array<Record<string, unknown> & TimedRow> = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const n = normalizeOne(item);
    if (!n) continue;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out;
}

function normalizeJob(raw: unknown): (Record<string, unknown> & TimedRow) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = nid(r.id);
  const jobId = nid(r.jobId);
  if (!id || !jobId) return null;
  const createdAt = String(r.createdAt ?? "").trim() || String(r.updatedAt ?? "").trim();
  const updatedAt = String(r.updatedAt ?? "").trim() || createdAt;
  if (!createdAt || !updatedAt) return null;
  return {
    id,
    jobId,
    status: r.status === "closed" ? "closed" : "active",
    createdAt,
    updatedAt,
    ...(typeof r.label === "string" && r.label.trim() ? { label: r.label.trim() } : {}),
    ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
  };
}

function normalizeAllocation(
  raw: unknown,
): (Record<string, unknown> & TimedRow & { agreedAmount: number }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = nid(r.id);
  const pieceworkJobId = nid(r.pieceworkJobId);
  const directoryId = nid(r.directoryId);
  const agreedAmount = money(r.agreedAmount);
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

function normalizeAdvance(
  raw: unknown,
): (Record<string, unknown> & TimedRow & { amount: number; allocationId: string }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = nid(r.id);
  const pieceworkJobId = nid(r.pieceworkJobId);
  const allocationId = nid(r.allocationId);
  const directoryId = nid(r.directoryId);
  const amount = money(r.amount);
  const paidAt = String(r.paidAt ?? "").trim();
  if (!id || !pieceworkJobId || !allocationId || !directoryId || amount == null || !(amount > 0) || !paidAt) {
    return null;
  }
  const createdAt = String(r.createdAt ?? "").trim() || paidAt;
  const updatedAt = String(r.updatedAt ?? "").trim() || createdAt;
  return {
    id,
    pieceworkJobId,
    allocationId,
    directoryId,
    amount,
    paidAt,
    createdAt,
    updatedAt,
    ...(r.weekFrom ? { weekFrom: String(r.weekFrom) } : {}),
    ...(r.weekTo ? { weekTo: String(r.weekTo) } : {}),
    ...(r.note ? { note: String(r.note) } : {}),
    ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
  };
}

export function normalizeEdgePieceworkState(raw: unknown): EdgePieceworkState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyEdgePieceworkState();
  const r = raw as Record<string, unknown>;
  return {
    jobs: normalizeList(r.jobs, normalizeJob) as EdgePieceworkState["jobs"],
    allocations: normalizeList(r.allocations, normalizeAllocation) as EdgePieceworkState["allocations"],
    advances: normalizeList(r.advances, normalizeAdvance) as EdgePieceworkState["advances"],
  };
}

export function mergeEdgePieceworkState(local: unknown, cloud: unknown): EdgePieceworkState {
  const l = normalizeEdgePieceworkState(local);
  const c = normalizeEdgePieceworkState(cloud);
  return {
    jobs: mergeById(l.jobs, c.jobs) as EdgePieceworkState["jobs"],
    allocations: mergeById(l.allocations, c.allocations) as EdgePieceworkState["allocations"],
    advances: mergeById(l.advances, c.advances) as EdgePieceworkState["advances"],
  };
}

export function findEdgePieceworkCapViolations(state: EdgePieceworkState): Array<{
  allocationId: string;
  agreedAmount: number;
  activeAdvancesSum: number;
}> {
  const out: Array<{ allocationId: string; agreedAmount: number; activeAdvancesSum: number }> = [];
  for (const alloc of state.allocations) {
    if (isDeleted(alloc)) continue;
    let sum = 0;
    for (const a of state.advances) {
      if (isDeleted(a)) continue;
      if (a.allocationId !== alloc.id) continue;
      if (!(a.amount > 0)) continue;
      sum += a.amount;
    }
    sum = +sum.toFixed(2);
    if (sum > alloc.agreedAmount) {
      out.push({ allocationId: alloc.id, agreedAmount: alloc.agreedAmount, activeAdvancesSum: sum });
    }
  }
  return out;
}

export function normalizePieceworkMetaEdge(raw: unknown): {
  pieceworkRevision: number;
  updatedAt: number;
} {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const rev =
      typeof o.pieceworkRevision === "number" && Number.isFinite(o.pieceworkRevision)
        ? Math.max(0, Math.floor(o.pieceworkRevision))
        : 0;
    return {
      pieceworkRevision: rev,
      updatedAt:
        typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now(),
    };
  }
  return { pieceworkRevision: 0, updatedAt: Date.now() };
}
