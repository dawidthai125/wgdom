/**
 * Edge-safe settlement merge pick (Deno bundle: no `@/` aliases).
 * SSOT for pickPayrollSettlementForMerge used by client + Edge record merge.
 */

export type PayrollPayoutMethod = "cash" | "transfer";

export interface PayrollSettlement {
  settledAt: string;
  settledByUserId: string;
  settledByName: string;
  paymentMethod: PayrollPayoutMethod;
  amount: number;
}

function parseTs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return 0;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

export function isValidPayrollPayoutMethod(v: unknown): v is PayrollPayoutMethod {
  return v === "cash" || v === "transfer";
}

export function normalizePayrollSettlement(raw: unknown): PayrollSettlement | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const settledAt = String(r.settledAt ?? "").trim();
  const settledByUserId = String(r.settledByUserId ?? "").trim();
  const settledByName = String(r.settledByName ?? "").trim();
  const paymentMethod = isValidPayrollPayoutMethod(r.paymentMethod) ? r.paymentMethod : null;
  const amount =
    typeof r.amount === "number" && Number.isFinite(r.amount) ? +r.amount.toFixed(2) : NaN;
  if (!settledAt || Number.isNaN(Date.parse(settledAt))) return undefined;
  if (!settledByUserId || !settledByName || !paymentMethod) return undefined;
  if (!(amount >= 0)) return undefined;
  return {
    settledAt,
    settledByUserId,
    settledByName,
    paymentMethod,
    amount,
  };
}

function hasOwnSettlementKey(rec: object | undefined): boolean {
  return !!rec && Object.prototype.hasOwnProperty.call(rec, "payrollSettlement");
}

/** Explicit settlement-clock winner for metadata (never dataUpdatedAt). */
export function pickPayrollSettlementForMerge(
  l: Record<string, unknown>,
  c: Record<string, unknown>,
  settled: boolean,
): PayrollSettlement | undefined {
  const lAt = parseTs(l.settledUpdatedAt);
  const cAt = parseTs(c.settledUpdatedAt);
  const lMeta = normalizePayrollSettlement(l.payrollSettlement);
  const cMeta = normalizePayrollSettlement(c.payrollSettlement);

  let winner: Record<string, unknown>;
  let other: Record<string, unknown>;
  if (lAt > cAt) {
    winner = l;
    other = c;
  } else if (cAt > lAt) {
    winner = c;
    other = l;
  } else {
    const lMatch = Boolean(l.settled) === settled;
    const cMatch = Boolean(c.settled) === settled;
    if (lMatch && !cMatch) {
      winner = l;
      other = c;
    } else if (cMatch && !lMatch) {
      winner = c;
      other = l;
    } else {
      winner = lMeta ? l : cMeta ? c : l;
      other = winner === l ? c : l;
    }
  }

  const wMeta = normalizePayrollSettlement(winner.payrollSettlement);
  if (wMeta) return wMeta;
  const oMeta = normalizePayrollSettlement(other.payrollSettlement);
  if (oMeta && !hasOwnSettlementKey(winner)) return oMeta;
  if (!wMeta && oMeta && settled === Boolean(winner.settled)) {
    if (!hasOwnSettlementKey(winner)) return oMeta;
  }
  return wMeta;
}
