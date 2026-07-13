/**
 * TEMP · PAYROLL-BOOTSTRAP-RUNTIME-TRACE-01 — diagnostyka F5 bootstrap; usuń po audycie.
 * Aktywacja: __WG_PAYROLL_BOOTSTRAP_TRACE__.enable() (sessionStorage — przetrwa Ctrl+Shift+R)
 */

const MAX_EVENTS = 4_000;
const SESSION_FLAG = "wg-payroll-bootstrap-trace-enabled";

export type PayrollBootstrapTraceEvent = {
  seq: number;
  ts: string;
  t: number;
  caller: string;
  reason: string;
  weekFrom?: string;
  weekTo?: string;
  targetWeekKey?: string;
  cloudWeekKey?: string;
  localWeekKey?: string;
  employeeCount?: number;
  employeeCountBefore?: number;
  employeeCountAfter?: number;
  persistKwWeekEmployees?: boolean;
  persistSkipped?: boolean;
  bootstrapPersistEmpty?: boolean;
  bootstrapPersist14?: boolean;
  tryPayrollWeekCycleCleared?: boolean;
  autoArchiveAndAdvanceCalled?: boolean;
  stack: string;
};

type BootstrapTraceGlobals = {
  __WG_ENABLE_PAYROLL_BOOTSTRAP_TRACE__?: boolean;
  __WG_PAYROLL_BOOTSTRAP_TRACE__?: {
    download: () => void;
    dump: () => PayrollBootstrapTraceEvent[];
    clear: () => void;
    enable: () => void;
    disable: () => void;
    findFirstRosterLoss: () => PayrollBootstrapTraceEvent | null;
  };
};

let memoryEnabled = false;
let seq = 0;
const events: PayrollBootstrapTraceEvent[] = [];

function traceGlobals(): BootstrapTraceGlobals {
  return globalThis as BootstrapTraceGlobals;
}

function captureStack(): string {
  try {
    const s = new Error().stack ?? "";
    return s
      .split("\n")
      .slice(2, 12)
      .map((l) => l.trim())
      .join("\n");
  } catch {
    return "";
  }
}

function sessionFlagOn(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

function isEnabled(): boolean {
  return (
    memoryEnabled
    || traceGlobals().__WG_ENABLE_PAYROLL_BOOTSTRAP_TRACE__ === true
    || sessionFlagOn()
  );
}

function empCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Public helper — week key bez importu z cloud-sync (unikaj cykli). */
export function bootstrapTraceWeekRangeKey(from: unknown, to: unknown): string {
  if (typeof from !== "string" || !from || typeof to !== "string" || !to) return "";
  return `${from}|${to}`;
}

function push(
  event: Omit<PayrollBootstrapTraceEvent, "seq" | "ts" | "t" | "stack"> & { stack?: string },
): void {
  if (!isEnabled()) return;
  const row: PayrollBootstrapTraceEvent = {
    seq: ++seq,
    ts: new Date().toISOString(),
    t: Date.now(),
    stack: event.stack ?? captureStack(),
    ...event,
  };
  events.push(row);
  if (events.length > MAX_EVENTS) events.shift();
  console.info("[payroll-bootstrap-trace]", row);
}

export function setPayrollBootstrapRuntimeTraceEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  traceGlobals().__WG_ENABLE_PAYROLL_BOOTSTRAP_TRACE__ = enabled;
  try {
    if (enabled) sessionStorage.setItem(SESSION_FLAG, "1");
    else sessionStorage.removeItem(SESSION_FLAG);
  } catch { /* ignore */ }
  if (enabled) {
    console.info(
      "[payroll-bootstrap-trace] ACTIVE · przetrwa Ctrl+Shift+R · export: __WG_PAYROLL_BOOTSTRAP_TRACE__.download()",
    );
  }
}

export function logPayrollBootstrapTrace(
  input: Omit<PayrollBootstrapTraceEvent, "seq" | "ts" | "t" | "stack"> & { stack?: string },
): void {
  push(input);
}

export function logPayrollBootstrapTraceFromWeekKeys(input: {
  caller: string;
  reason: string;
  weekFrom?: string;
  weekTo?: string;
  targetFrom?: unknown;
  targetTo?: unknown;
  cloudFrom?: unknown;
  cloudTo?: unknown;
  localFrom?: unknown;
  localTo?: unknown;
  employeeCount?: number;
  employeeCountBefore?: number;
  employeeCountAfter?: number;
  roster?: unknown;
  persistKwWeekEmployees?: boolean;
  persistSkipped?: boolean;
  bootstrapPersistEmpty?: boolean;
  bootstrapPersist14?: boolean;
  tryPayrollWeekCycleCleared?: boolean;
  autoArchiveAndAdvanceCalled?: boolean;
}): void {
  const wf = input.weekFrom ?? (typeof input.targetFrom === "string" ? input.targetFrom : "");
  const wt = input.weekTo ?? (typeof input.targetTo === "string" ? input.targetTo : "");
  const count = input.employeeCount ?? (input.roster != null ? empCount(input.roster) : undefined);
  push({
    caller: input.caller,
    reason: input.reason,
    weekFrom: wf || undefined,
    weekTo: wt || undefined,
    targetWeekKey: bootstrapTraceWeekRangeKey(input.targetFrom ?? wf, input.targetTo ?? wt),
    cloudWeekKey: bootstrapTraceWeekRangeKey(input.cloudFrom, input.cloudTo),
    localWeekKey: bootstrapTraceWeekRangeKey(input.localFrom, input.localTo),
    employeeCount: count,
    employeeCountBefore: input.employeeCountBefore,
    employeeCountAfter: input.employeeCountAfter,
    persistKwWeekEmployees: input.persistKwWeekEmployees,
    persistSkipped: input.persistSkipped,
    bootstrapPersistEmpty: input.bootstrapPersistEmpty,
    bootstrapPersist14: input.bootstrapPersist14 ?? (count === 14 ? true : undefined),
    tryPayrollWeekCycleCleared: input.tryPayrollWeekCycleCleared,
    autoArchiveAndAdvanceCalled: input.autoArchiveAndAdvanceCalled,
  });
}

export function payrollBootstrapTraceDump(): PayrollBootstrapTraceEvent[] {
  return [...events];
}

function isRosterLossEvent(e: PayrollBootstrapTraceEvent): boolean {
  if (e.autoArchiveAndAdvanceCalled) return true;
  if (e.tryPayrollWeekCycleCleared) return true;
  if (
    e.employeeCountBefore != null
    && e.employeeCountBefore > 0
    && (e.employeeCountAfter === 0 || e.employeeCount === 0)
  ) {
    return true;
  }
  if (e.caller === "setWeekEmployees" && e.employeeCount === 0 && e.employeeCountBefore != null && e.employeeCountBefore > 0) {
    return true;
  }
  if (e.reason === "bootstrap_persist_skipped_empty" && (e.employeeCountBefore ?? 0) > 0) {
    return true;
  }
  return false;
}

export function payrollBootstrapTraceFindFirstRosterLoss(): PayrollBootstrapTraceEvent | null {
  return events.find(isRosterLossEvent) ?? null;
}

export function installPayrollBootstrapRuntimeTraceGlobals(): void {
  traceGlobals().__WG_PAYROLL_BOOTSTRAP_TRACE__ = {
    download: () => {
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-bootstrap-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    dump: payrollBootstrapTraceDump,
    clear: () => {
      events.length = 0;
      seq = 0;
    },
    enable: () => setPayrollBootstrapRuntimeTraceEnabled(true),
    disable: () => setPayrollBootstrapRuntimeTraceEnabled(false),
    findFirstRosterLoss: payrollBootstrapTraceFindFirstRosterLoss,
  };
  if (sessionFlagOn()) {
    memoryEnabled = true;
    traceGlobals().__WG_ENABLE_PAYROLL_BOOTSTRAP_TRACE__ = true;
  }
}
