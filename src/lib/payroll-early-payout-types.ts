/**
 * Early payout transaction types + normalize (no payroll-cycle import — breaks ESM cycles).
 */

export type PayrollEarlyPayoutMethod = "cash" | "transfer";

export interface PayrollEarlyPayout {
  id: string;
  amount: number;
  method: PayrollEarlyPayoutMethod;
  paidAt: string;
  periodKey: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export function isActiveEarlyPayout(tx: PayrollEarlyPayout | null | undefined): boolean {
  if (!tx) return false;
  if (tx.deletedAt) return false;
  if (!(typeof tx.amount === "number" && Number.isFinite(tx.amount) && tx.amount > 0)) return false;
  if (tx.method !== "cash" && tx.method !== "transfer") return false;
  if (!String(tx.periodKey ?? "").trim()) return false;
  if (!String(tx.id ?? "").trim()) return false;
  return true;
}

export function normalizeEarlyPayoutList(raw: unknown): PayrollEarlyPayout[] {
  if (!Array.isArray(raw)) return [];
  const out: PayrollEarlyPayout[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<PayrollEarlyPayout>;
    const id = String(r.id ?? "").trim();
    const amount = typeof r.amount === "number" && Number.isFinite(r.amount) ? +r.amount.toFixed(2) : 0;
    const method = r.method === "cash" || r.method === "transfer" ? r.method : null;
    const paidAt = String(r.paidAt ?? "").trim();
    const periodKey = String(r.periodKey ?? "").trim();
    if (!id || !(amount > 0) || !method || !paidAt || !periodKey) continue;
    const createdAt = String(r.createdAt ?? paidAt);
    const updatedAt = String(r.updatedAt ?? createdAt);
    out.push({
      id,
      amount,
      method,
      paidAt,
      periodKey,
      ...(r.description != null && String(r.description).trim()
        ? { description: String(r.description).trim() }
        : {}),
      createdAt,
      updatedAt,
      ...(r.deletedAt ? { deletedAt: String(r.deletedAt) } : {}),
    });
  }
  return out;
}
