/**
 * TEMP · PAYROLL-DISPLAY-RUNTIME-TRACE-01 — diagnostyka warstwy renderu LP; usuń po audycie.
 * Aktywacja: __WG_PAYROLL_DISPLAY_TRACE__.enable() (sessionStorage — przetrwa Ctrl+Shift+R)
 */

const MAX_EVENTS = 4_000;
const SESSION_FLAG = "wg-payroll-display-trace-enabled";

export type PayrollDisplayTraceEvent = {
  seq: number;
  ts: string;
  t: number;
  caller: string;
  reason: string;
  weekEmployeesLength: number;
  productionWeekEmployeesLength?: number;
  displayEmployeesLength: number;
  isClosedWeek: boolean;
  hasRolloverBlockers?: boolean;
  archivedForWeekLength?: number;
  savedWeeksLength?: number;
  weekFrom: string;
  weekTo: string;
  currentWeekFrom: string;
  currentWeekTo: string;
  stack: string;
};

export type PayrollDisplayTraceInput = {
  caller: string;
  reason: string;
  weekEmployeesLength: number;
  productionWeekEmployeesLength?: number;
  displayEmployeesLength: number;
  isClosedWeek: boolean;
  hasRolloverBlockers?: boolean;
  archivedForWeekLength?: number;
  savedWeeksLength?: number;
  weekFrom: string;
  weekTo: string;
  currentWeekFrom: string;
  currentWeekTo: string;
  stack?: string;
};

type DisplayTraceGlobals = {
  __WG_ENABLE_PAYROLL_DISPLAY_TRACE__?: boolean;
  __WG_PAYROLL_DISPLAY_TRACE__?: {
    download: () => void;
    dump: () => PayrollDisplayTraceEvent[];
    clear: () => void;
    enable: () => void;
    disable: () => void;
    findFirstDisplayCollapse: () => PayrollDisplayTraceEvent | null;
  };
};

let memoryEnabled = false;
let seq = 0;
const events: PayrollDisplayTraceEvent[] = [];

function traceGlobals(): DisplayTraceGlobals {
  return globalThis as DisplayTraceGlobals;
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
    || traceGlobals().__WG_ENABLE_PAYROLL_DISPLAY_TRACE__ === true
    || sessionFlagOn()
  );
}

function push(input: PayrollDisplayTraceInput): void {
  if (!isEnabled()) return;
  const row: PayrollDisplayTraceEvent = {
    seq: ++seq,
    ts: new Date().toISOString(),
    t: Date.now(),
    stack: input.stack ?? captureStack(),
    caller: input.caller,
    reason: input.reason,
    weekEmployeesLength: input.weekEmployeesLength,
    productionWeekEmployeesLength: input.productionWeekEmployeesLength,
    displayEmployeesLength: input.displayEmployeesLength,
    isClosedWeek: input.isClosedWeek,
    hasRolloverBlockers: input.hasRolloverBlockers,
    archivedForWeekLength: input.archivedForWeekLength,
    savedWeeksLength: input.savedWeeksLength,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    currentWeekFrom: input.currentWeekFrom,
    currentWeekTo: input.currentWeekTo,
  };
  events.push(row);
  if (events.length > MAX_EVENTS) events.shift();
  console.info("[payroll-display-trace]", row);
}

export function setPayrollDisplayRuntimeTraceEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  traceGlobals().__WG_ENABLE_PAYROLL_DISPLAY_TRACE__ = enabled;
  try {
    if (enabled) sessionStorage.setItem(SESSION_FLAG, "1");
    else sessionStorage.removeItem(SESSION_FLAG);
  } catch { /* ignore */ }
  if (enabled) {
    console.info(
      "[payroll-display-trace] ACTIVE · przetrwa Ctrl+Shift+R · export: __WG_PAYROLL_DISPLAY_TRACE__.download()",
    );
  }
}

export function logPayrollDisplayTrace(input: PayrollDisplayTraceInput): void {
  push(input);
}

function isDisplayCollapseEvent(e: PayrollDisplayTraceEvent): boolean {
  return e.weekEmployeesLength > 0 && e.displayEmployeesLength === 0;
}

export function payrollDisplayTraceDump(): PayrollDisplayTraceEvent[] {
  return [...events];
}

export function payrollDisplayTraceFindFirstDisplayCollapse(): PayrollDisplayTraceEvent | null {
  return events.find(isDisplayCollapseEvent) ?? null;
}

export function installPayrollDisplayRuntimeTraceGlobals(): void {
  traceGlobals().__WG_PAYROLL_DISPLAY_TRACE__ = {
    download: () => {
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-display-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    dump: payrollDisplayTraceDump,
    clear: () => {
      events.length = 0;
      seq = 0;
    },
    enable: () => setPayrollDisplayRuntimeTraceEnabled(true),
    disable: () => setPayrollDisplayRuntimeTraceEnabled(false),
    findFirstDisplayCollapse: payrollDisplayTraceFindFirstDisplayCollapse,
  };
  if (sessionFlagOn()) {
    memoryEnabled = true;
    traceGlobals().__WG_ENABLE_PAYROLL_DISPLAY_TRACE__ = true;
  }
}
