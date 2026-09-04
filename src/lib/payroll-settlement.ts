/**
 * PAYROLL settlement metadata — who / when / method / frozen amount.
 * Reuses cash|transfer from early-payout types (single SSOT).
 */

import type { DirectoryEmployee, WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import {
  calcWeekEmployeeForPayroll,
} from "@/lib/payroll-carry-forward";
import {
  calcBiweeklyRowDisplay,
  isBiweeklyPayrollEmployee,
} from "@/lib/payroll-cycle";
import type { PayrollEarlyPayoutMethod } from "@/lib/payroll-early-payout-types";
export { pickPayrollSettlementForMerge } from "./payroll-settlement-merge-pick";

/** Alias — do NOT invent a second cash/transfer enum. */
export type PayrollPayoutMethod = PayrollEarlyPayoutMethod;

export interface PayrollSettlement {
  settledAt: string;
  settledByUserId: string;
  settledByName: string;
  paymentMethod: PayrollPayoutMethod;
  amount: number;
}

export type PayrollSettlementDisplay = {
  statusLabel: string;
  methodLabel: string | null;
  settledByLine: string | null;
  settledAtLine: string | null;
  amountLine: string | null;
  isSettled: boolean;
  hasMetadata: boolean;
  /** Single-cell / compact export text (PDF/Word/Email). */
  compactStatus: string;
};

const METHOD_LABEL: Record<PayrollPayoutMethod, string> = {
  cash: "Gotówka",
  transfer: "Przelew",
};

function fmtPln(n: number): string {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSettledAt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

/** Strict validation for NEW settle writes (malformed → reject). */
export function validatePayrollSettlementForWrite(
  raw: unknown,
): { ok: true; settlement: PayrollSettlement } | { ok: false; error: string } {
  const s = normalizePayrollSettlement(raw);
  if (!s) {
    return {
      ok: false,
      error: "Nieprawidłowe dane rozliczenia (forma, kto, data, kwota ≥ 0).",
    };
  }
  return { ok: true, settlement: s };
}

export function buildPayrollSettlement(input: {
  settledByUserId: string;
  settledByName: string;
  paymentMethod: PayrollPayoutMethod;
  amount: number;
  settledAt?: string;
}): PayrollSettlement {
  const settledAt = input.settledAt ?? new Date().toISOString();
  const v = validatePayrollSettlementForWrite({
    settledAt,
    settledByUserId: String(input.settledByUserId ?? "").trim(),
    settledByName: String(input.settledByName ?? "").trim(),
    paymentMethod: input.paymentMethod,
    amount: +Number(input.amount).toFixed(2),
  });
  if (!v.ok) throw new Error(v.error);
  return v.settlement;
}

/**
 * Payable amount frozen at settlement — same SSOT as Lista Płac display.
 */
export function resolveSettlementPayableAmount(
  emp: WeekEmployee,
  directory: DirectoryEmployee[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
  opts?: {
    employeeLeaves?: EmployeeLeave[];
    archivedSnapshot?: WeekSnapshot | null;
    livePayroll?: boolean;
  },
): number {
  const r = calcWeekEmployeeForPayroll(emp, {
    weekFrom,
    weekTo,
    employeeLeaves: opts?.employeeLeaves,
    archivedSnapshot: opts?.archivedSnapshot ?? undefined,
    livePayroll: opts?.livePayroll !== false,
    savedWeeks,
  });
  const leaveStatus = r.leaveStatus;
  const carryOut = r.carryForwardOut != null && r.carryForwardOut > 0;
  const carryIn = r.carryForwardIn != null && r.carryForwardIn > 0;
  const biweekly =
    !leaveStatus && !carryOut && !carryIn && isBiweeklyPayrollEmployee(emp, directory);
  const bw = biweekly
    ? calcBiweeklyRowDisplay(emp, directory, weekFrom, weekTo, savedWeeks)
    : null;
  if (carryOut) return 0;
  if (leaveStatus) return +(r.displayNetPay ?? r.netPay ?? 0).toFixed(2);
  if (carryIn) return +(r.displayNetPay ?? r.netPay ?? 0).toFixed(2);
  if (bw) return +bw.displayNet.toFixed(2);
  return +(r.displayNetPay ?? r.netPay ?? 0).toFixed(2);
}

export function payrollSettlementDisplay(input: {
  settled: boolean;
  payrollSettlement?: unknown;
}): PayrollSettlementDisplay {
  const isSettled = input.settled === true;
  const meta = normalizePayrollSettlement(input.payrollSettlement);
  const hasMetadata = !!meta;

  if (!isSettled) {
    return {
      statusLabel: "Oczekuje",
      methodLabel: null,
      settledByLine: null,
      settledAtLine: null,
      amountLine: null,
      isSettled: false,
      hasMetadata: false,
      compactStatus: "Oczekuje",
    };
  }

  if (!hasMetadata || !meta) {
    return {
      statusLabel: "Rozliczono",
      methodLabel: null,
      settledByLine: null,
      settledAtLine: null,
      amountLine: null,
      isSettled: true,
      hasMetadata: false,
      compactStatus: "Rozliczono",
    };
  }

  const methodLabel = METHOD_LABEL[meta.paymentMethod];
  const amountLine = `${fmtPln(meta.amount)} zł`;
  const settledByLine = meta.settledByName;
  const settledAtLine = fmtSettledAt(meta.settledAt);
  const compactStatus = [
    "Rozliczono",
    `Kwota: ${amountLine}`,
    `Forma: ${methodLabel}`,
    `Rozliczył: ${settledByLine}`,
    `Data: ${settledAtLine}`,
  ].join("\n");

  return {
    statusLabel: "Rozliczono",
    methodLabel,
    settledByLine,
    settledAtLine,
    amountLine,
    isSettled: true,
    hasMetadata: true,
    compactStatus,
  };
}

function settlementBundleEqual(
  a: { settled?: boolean; settledUpdatedAt?: string; payrollSettlement?: unknown },
  b: { settled?: boolean; settledUpdatedAt?: string; payrollSettlement?: unknown },
): boolean {
  if (Boolean(a.settled) !== Boolean(b.settled)) return false;
  if (String(a.settledUpdatedAt ?? "") !== String(b.settledUpdatedAt ?? "")) return false;
  return (
    JSON.stringify(normalizePayrollSettlement(a.payrollSettlement) ?? null)
    === JSON.stringify(normalizePayrollSettlement(b.payrollSettlement) ?? null)
  );
}

function hasOwnSettlementKey(rec: object | undefined): boolean {
  return !!rec && Object.prototype.hasOwnProperty.call(rec, "payrollSettlement");
}

export type PayrollSettlementFieldIntentOptions = {
  /**
   * GO8.2 — this employee has an unresolved settlement→cloud ACK (pending/failure).
   * Resolved by the orchestrating layer; this function never reads the ledger.
   */
  unresolvedCloudAck?: boolean;
};

/**
 * P2 scoped settlement intent: settled + settledUpdatedAt + payrollSettlement atomic.
 * Absent payrollSettlement on after (old client) preserves cloud metadata.
 */
export function applySettlementFieldIntent(
  cloudEmp: Pick<WeekEmployee, "settled" | "settledUpdatedAt" | "payrollSettlement">,
  beforeEmp: Pick<WeekEmployee, "settled" | "settledUpdatedAt" | "payrollSettlement"> | undefined,
  afterEmp: Pick<WeekEmployee, "settled" | "settledUpdatedAt" | "payrollSettlement"> | undefined,
  options?: PayrollSettlementFieldIntentOptions,
): {
  settled: boolean;
  settledUpdatedAt: string | undefined;
  payrollSettlement: PayrollSettlement | undefined;
  changed: boolean;
} {
  const cloudSettled = Boolean(cloudEmp.settled);
  const cloudAt = cloudEmp.settledUpdatedAt;
  const cloudMeta = normalizePayrollSettlement(cloudEmp.payrollSettlement);

  if (!beforeEmp || !afterEmp) {
    return {
      settled: cloudSettled,
      settledUpdatedAt: cloudAt,
      payrollSettlement: cloudMeta,
      changed: false,
    };
  }

  const afterSettled = Boolean(afterEmp.settled);
  const afterAt = afterEmp.settledUpdatedAt;
  const afterAtStr = String(afterAt ?? "");
  const cloudAtStr = String(cloudAt ?? "");
  const afterMetaExplicit = hasOwnSettlementKey(afterEmp)
    ? normalizePayrollSettlement(afterEmp.payrollSettlement)
    : undefined;

  /**
   * GO8.1 — retain conscious local settlement/unsettle when baselineOk fails
   * because LS is already ahead of Cloud (typical re-settle / re-flush).
   *
   * Settle: Cloud unsettled + after settled + valid meta + after clock newer
   *   (or Cloud has no settlement clock) → apply after.
   * Unsettle: Cloud settled + after unsettled + after clock strictly newer
   *   than Cloud → apply after (does not clobber a newer Cloud settle).
   * If Cloud already settled with clock ≥ after → keep Cloud (safety).
   */
  const retainLocalSettlementIntentWhenLsAhead = (): {
    settled: boolean;
    settledUpdatedAt: string | undefined;
    payrollSettlement: PayrollSettlement | undefined;
    changed: boolean;
  } | null => {
    // A: Cloud unsettled + local settle intent
    if (!cloudSettled && afterSettled && afterMetaExplicit) {
      if (cloudAtStr && !(afterAtStr > cloudAtStr)) return null;
      return {
        settled: true,
        settledUpdatedAt: afterAt ?? cloudAt,
        payrollSettlement: afterMetaExplicit,
        changed:
          afterSettled !== cloudSettled
          || afterAtStr !== cloudAtStr
          || JSON.stringify(afterMetaExplicit) !== JSON.stringify(cloudMeta ?? null),
      };
    }
    // Unsettle: only conscious before→after unsettle, or identical LS-ahead re-flush
    // (!edited). A stale clock bump on already-unsettled local must NOT clobber Cloud (H8).
    if (cloudSettled && !afterSettled && afterAtStr && afterAtStr > cloudAtStr) {
      const consciousUnsettle = Boolean(beforeEmp.settled);
      const reflushUnsettle = settlementBundleEqual(beforeEmp, afterEmp);
      if (consciousUnsettle || reflushUnsettle) {
        const nextMeta = afterMetaExplicit ?? cloudMeta;
        return {
          settled: false,
          settledUpdatedAt: afterAt ?? cloudAt,
          payrollSettlement: nextMeta,
          changed: true,
        };
      }
    }
    return null;
  };

  const edited = !settlementBundleEqual(beforeEmp, afterEmp);
  if (!edited) {
    /**
     * GO8.2 — passive local settlement with an unresolved cloud ACK must not ride
     * along an unrelated write (membership ADD, other employee's hours edit).
     * Explicit settle/unsettle and GO3 retry both produce edited === true and are
     * therefore untouched by this branch.
     */
    const retained = options?.unresolvedCloudAck === true
      ? null
      : retainLocalSettlementIntentWhenLsAhead();
    if (retained) return retained;
    return {
      settled: cloudSettled,
      settledUpdatedAt: cloudAt,
      payrollSettlement: cloudMeta,
      changed: false,
    };
  }

  const baselineOk =
    Boolean(beforeEmp.settled) === cloudSettled
    && String(beforeEmp.settledUpdatedAt ?? "") === String(cloudAt ?? "")
    && JSON.stringify(normalizePayrollSettlement(beforeEmp.payrollSettlement) ?? null)
      === JSON.stringify(cloudMeta ?? null);

  if (!baselineOk) {
    const retained = retainLocalSettlementIntentWhenLsAhead();
    if (retained) return retained;
    // Stale local intent vs settled/newer Cloud — keep canonical cloud.
    return {
      settled: cloudSettled,
      settledUpdatedAt: cloudAt,
      payrollSettlement: cloudMeta,
      changed: true,
    };
  }

  const nextSettled = afterSettled;
  const nextAt = afterAt ?? cloudAt;
  let nextMeta: PayrollSettlement | undefined;

  if (hasOwnSettlementKey(afterEmp)) {
    const afterMeta = normalizePayrollSettlement(afterEmp.payrollSettlement);
    if (nextSettled && afterMeta) {
      nextMeta = afterMeta;
    } else if (!nextSettled) {
      // Unsettle: keep last metadata (after should still carry it; else preserve cloud).
      nextMeta = afterMeta ?? cloudMeta;
    } else {
      // Settled=true but invalid/missing metadata on explicit key — keep cloud meta if any.
      nextMeta = afterMeta ?? cloudMeta;
    }
  } else {
    // Old client: preserve cloud settlement metadata.
    nextMeta = cloudMeta;
  }

  const changed =
    nextSettled !== cloudSettled
    || String(nextAt ?? "") !== String(cloudAt ?? "")
    || JSON.stringify(nextMeta ?? null) !== JSON.stringify(cloudMeta ?? null);

  return {
    settled: nextSettled,
    settledUpdatedAt: nextAt,
    payrollSettlement: nextMeta,
    changed,
  };
}

/**
 * Explicit merge picker — settledUpdatedAt LWW; never dataUpdatedAt / dataWinner.
 * Absent metadata on winner preserves other side's metadata when valid.
 */
/** Explicit settlement-clock winner — SSOT in payroll-settlement-merge-pick (Edge-safe). */

export function methodLabelPl(method: PayrollPayoutMethod): string {
  return METHOD_LABEL[method];
}
