/**
 * PAYROLL-DI-P0 — server roster revision cache (kw-payroll-week-meta).
 */

export const PAYROLL_WEEK_META_KEY = "kw-payroll-week-meta";

export type PayrollWeekMeta = {
  rosterRevision: number;
  weekFrom: string;
  weekTo: string;
  updatedAt: number;
};

export function normalizePayrollWeekMeta(raw: unknown, weekFrom = "", weekTo = ""): PayrollWeekMeta {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const rev = typeof o.rosterRevision === "number" && Number.isFinite(o.rosterRevision)
      ? Math.max(0, Math.floor(o.rosterRevision))
      : 0;
    const wf = typeof o.weekFrom === "string" ? o.weekFrom : weekFrom;
    const wt = typeof o.weekTo === "string" ? o.weekTo : weekTo;
    const ua = typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : Date.now();
    return { rosterRevision: rev, weekFrom: wf, weekTo: wt, updatedAt: ua };
  }
  return { rosterRevision: 0, weekFrom, weekTo, updatedAt: Date.now() };
}

export function readPayrollWeekMetaFromLs(): PayrollWeekMeta | null {
  try {
    const raw = localStorage.getItem(PAYROLL_WEEK_META_KEY);
    if (!raw) return null;
    const wf = JSON.parse(localStorage.getItem("kw-weekFrom") ?? '""');
    const wt = JSON.parse(localStorage.getItem("kw-weekTo") ?? '""');
    return normalizePayrollWeekMeta(JSON.parse(raw), typeof wf === "string" ? wf : "", typeof wt === "string" ? wt : "");
  } catch {
    return null;
  }
}

export function writePayrollWeekMetaToLs(meta: PayrollWeekMeta): void {
  try {
    localStorage.setItem(PAYROLL_WEEK_META_KEY, JSON.stringify(meta));
  } catch { /* ignore quota */ }
}

export function getExpectedPayrollRevision(): number {
  return readPayrollWeekMetaFromLs()?.rosterRevision ?? 0;
}

export function buildPayrollWeekMetaPlaceholder(weekFrom: string, weekTo: string): PayrollWeekMeta {
  const cached = readPayrollWeekMetaFromLs();
  if (cached && cached.weekFrom === weekFrom && cached.weekTo === weekTo) {
    return cached;
  }
  return normalizePayrollWeekMeta(null, weekFrom, weekTo);
}
