/**
 * TEMP · PAYROLL-DISPLAY-RUNTIME-TRACE-01/02 — diagnostyka warstwy renderu LP; usuń po audycie.
 * Aktywacja: __WG_PAYROLL_DISPLAY_TRACE__.enable() (sessionStorage — przetrwa Ctrl+Shift+R)
 */

import { isPayrollCalendarBehind } from "@/lib/payroll-cycle";

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
  calendarBehind: boolean;
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

export type PayrollDisplayUnlockDiff = {
  savedWeeksLength: number | null;
  archivedForWeekLength: number | null;
  weekFrom: string | null;
  weekTo: string | null;
  isClosedWeek: boolean | null;
  calendarBehind: boolean | null;
};

export type PayrollDisplayUnlockReport = {
  timestamp: string;
  caller: string;
  reason: string;
  weekEmployeesLength: number;
  displayEmployeesLength: number;
  savedWeeksLength?: number;
  archivedForWeekLength?: number;
  weekFrom: string;
  weekTo: string;
  currentWeekFrom: string;
  currentWeekTo: string;
  calendarBehind: boolean;
  isClosedWeek: boolean;
  hasRolloverBlockers?: boolean;
  stack: string;
  previousSeq: number;
  currentSeq: number;
  sameReactCommit: boolean;
  diff: PayrollDisplayUnlockDiff;
  event: PayrollDisplayTraceEvent;
  previousEvent: PayrollDisplayTraceEvent;
};

export type PayrollDisplayTraceExport = {
  firstDisplayUnlock: PayrollDisplayUnlockReport | null;
  events: PayrollDisplayTraceEvent[];
};

type DisplayTraceGlobals = {
  __WG_ENABLE_PAYROLL_DISPLAY_TRACE__?: boolean;
  __WG_PAYROLL_DISPLAY_TRACE__?: {
    download: () => void;
    dump: () => PayrollDisplayTraceEvent[];
    export: () => PayrollDisplayTraceExport;
    clear: () => void;
    enable: () => void;
    disable: () => void;
    findFirstDisplayCollapse: () => PayrollDisplayTraceEvent | null;
    findFirstDisplayUnlock: () => PayrollDisplayUnlockReport | null;
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

function computeCalendarBehind(
  weekFrom: string,
  weekTo: string,
  _currentWeekFrom: string,
  _currentWeekTo: string,
): boolean {
  return isPayrollCalendarBehind(weekFrom, weekTo);
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
    calendarBehind: computeCalendarBehind(
      input.weekFrom,
      input.weekTo,
      input.currentWeekFrom,
      input.currentWeekTo,
    ),
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
      "[payroll-display-trace] ACTIVE · przetrwa Ctrl+Shift+R · export: __WG_PAYROLL_DISPLAY_TRACE__.download() · unlock: findFirstDisplayUnlock()",
    );
  }
}

export function logPayrollDisplayTrace(input: PayrollDisplayTraceInput): void {
  push(input);
}

function isDisplayCollapseEvent(e: PayrollDisplayTraceEvent): boolean {
  return e.weekEmployeesLength > 0 && e.displayEmployeesLength === 0;
}

function isDisplayUnlockPair(
  previous: PayrollDisplayTraceEvent,
  current: PayrollDisplayTraceEvent,
): boolean {
  return previous.displayEmployeesLength === 0 && current.displayEmployeesLength > 0;
}

function buildUnlockDiff(
  previous: PayrollDisplayTraceEvent,
  current: PayrollDisplayTraceEvent,
): PayrollDisplayUnlockDiff {
  const numDelta = (prev: number | undefined, cur: number | undefined): number | null => {
    if (prev === undefined && cur === undefined) return null;
    return (cur ?? 0) - (prev ?? 0);
  };
  const strDelta = (prev: string, cur: string): string | null => {
    if (prev === cur) return null;
    return `${prev} → ${cur}`;
  };
  const boolDelta = (prev: boolean, cur: boolean): boolean | null => {
    if (prev === cur) return null;
    return cur;
  };
  return {
    savedWeeksLength: numDelta(previous.savedWeeksLength, current.savedWeeksLength),
    archivedForWeekLength: numDelta(previous.archivedForWeekLength, current.archivedForWeekLength),
    weekFrom: strDelta(previous.weekFrom, current.weekFrom),
    weekTo: strDelta(previous.weekTo, current.weekTo),
    isClosedWeek: boolDelta(previous.isClosedWeek, current.isClosedWeek),
    calendarBehind: boolDelta(previous.calendarBehind, current.calendarBehind),
  };
}

function buildUnlockReport(
  previous: PayrollDisplayTraceEvent,
  current: PayrollDisplayTraceEvent,
): PayrollDisplayUnlockReport {
  return {
    timestamp: current.ts,
    caller: current.caller,
    reason: current.reason,
    weekEmployeesLength: current.weekEmployeesLength,
    displayEmployeesLength: current.displayEmployeesLength,
    savedWeeksLength: current.savedWeeksLength,
    archivedForWeekLength: current.archivedForWeekLength,
    weekFrom: current.weekFrom,
    weekTo: current.weekTo,
    currentWeekFrom: current.currentWeekFrom,
    currentWeekTo: current.currentWeekTo,
    calendarBehind: current.calendarBehind,
    isClosedWeek: current.isClosedWeek,
    hasRolloverBlockers: current.hasRolloverBlockers,
    stack: current.stack,
    previousSeq: previous.seq,
    currentSeq: current.seq,
    sameReactCommit: previous.t === current.t,
    diff: buildUnlockDiff(previous, current),
    event: current,
    previousEvent: previous,
  };
}

export function payrollDisplayTraceDump(): PayrollDisplayTraceEvent[] {
  return [...events];
}

export function payrollDisplayTraceExport(): PayrollDisplayTraceExport {
  return {
    firstDisplayUnlock: payrollDisplayTraceFindFirstDisplayUnlock(),
    events: payrollDisplayTraceDump(),
  };
}

export function payrollDisplayTraceFindFirstDisplayCollapse(): PayrollDisplayTraceEvent | null {
  return events.find(isDisplayCollapseEvent) ?? null;
}

export function payrollDisplayTraceFindFirstDisplayUnlock(): PayrollDisplayUnlockReport | null {
  for (let i = 1; i < events.length; i++) {
    const previous = events[i - 1]!;
    const current = events[i]!;
    if (!isDisplayUnlockPair(previous, current)) continue;
    const report = buildUnlockReport(previous, current);
    console.info("[payroll-display-trace] firstDisplayUnlock", report);
    return report;
  }
  return null;
}

export function installPayrollDisplayRuntimeTraceGlobals(): void {
  traceGlobals().__WG_PAYROLL_DISPLAY_TRACE__ = {
    download: () => {
      const payload = payrollDisplayTraceExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-display-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    dump: payrollDisplayTraceDump,
    export: payrollDisplayTraceExport,
    clear: () => {
      events.length = 0;
      seq = 0;
    },
    enable: () => setPayrollDisplayRuntimeTraceEnabled(true),
    disable: () => setPayrollDisplayRuntimeTraceEnabled(false),
    findFirstDisplayCollapse: payrollDisplayTraceFindFirstDisplayCollapse,
    findFirstDisplayUnlock: payrollDisplayTraceFindFirstDisplayUnlock,
  };
  if (sessionFlagOn()) {
    memoryEnabled = true;
    traceGlobals().__WG_ENABLE_PAYROLL_DISPLAY_TRACE__ = true;
  }
}
