/**
 * PAYROLL AKORD Phase 4A — piecework Cloud CAS meta (≠ payroll week CAS).
 */

export const PAYROLL_PIECEWORK_META_KEY = "kw-payroll-piecework-meta" as const;

export type PayrollPieceworkMeta = {
  pieceworkRevision: number;
  updatedAt: number;
};

export function normalizePayrollPieceworkMeta(raw: unknown): PayrollPieceworkMeta {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const rev =
      typeof o.pieceworkRevision === "number" && Number.isFinite(o.pieceworkRevision)
        ? Math.max(0, Math.floor(o.pieceworkRevision))
        : 0;
    const updatedAt =
      typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now();
    return { pieceworkRevision: rev, updatedAt };
  }
  return { pieceworkRevision: 0, updatedAt: Date.now() };
}

export function buildPayrollPieceworkMetaPlaceholder(): PayrollPieceworkMeta {
  return { pieceworkRevision: -1, updatedAt: Date.now() };
}

export function readPayrollPieceworkMetaFromLs(): PayrollPieceworkMeta | null {
  try {
    const raw = localStorage.getItem(PAYROLL_PIECEWORK_META_KEY);
    if (!raw) return null;
    return normalizePayrollPieceworkMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writePayrollPieceworkMetaToLs(meta: PayrollPieceworkMeta): void {
  try {
    localStorage.setItem(PAYROLL_PIECEWORK_META_KEY, JSON.stringify(normalizePayrollPieceworkMeta(meta)));
  } catch {
    /* quota */
  }
}

export function getExpectedPayrollPieceworkRevision(): number {
  return readPayrollPieceworkMetaFromLs()?.pieceworkRevision ?? 0;
}
