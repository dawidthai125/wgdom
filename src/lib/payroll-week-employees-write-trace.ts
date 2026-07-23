/**
 * PAYROLL-P0-DIAGNOSTIC-02 — weekEmployees write timeline + sourceFunction.
 * TEMP · 2.65.25-diag — tylko obserwowalność; usuń po zrzucie Ownera.
 *
 * window.__WG_PAYROLL_WRITE_TRACE__
 *   .enable() | .disable() | .clear() | .report() | .download() | .dump()
 *   .findFirst0to14()
 *
 * Diag build: auto-enable przy loacie modułu (jeden Ctrl+Shift+R wystarczy).
 *
 * Każdy SET: reason + sourceFunction (applyAdminDataBundle / pullFromCloudAndMerge / …).
 */

const MAX_EVENTS = 8_000;
const SESSION_FLAG = "wg-payroll-write-trace-enabled";

/** INCIDENT-23-07 cleanup — opt-in only (`__WG_PAYROLL_WRITE_TRACE__.enable()` / session). */
export const PAYROLL_WRITE_TRACE_DIAG_AUTO_ENABLE = false;

export type PayrollWriteKind =
  | "INIT"
  | "SET"
  | "STORAGE_EVENT"
  | "PRODUCTION_RECOMPUTE"
  | "DISPLAY_RECOMPUTE";

export type PayrollWriteTraceEvent = {
  writeNo: number;
  seq: number;
  kind: PayrollWriteKind;
  ts: string;
  t: number;
  timestamp: string;
  caller: string;
  reason: string;
  /** DIAG-02 — jawny kod źródłowy setWeekEmployees (nie zgaduj ze stack). */
  sourceFunction: string;
  beforeCount: number | null;
  afterCount: number | null;
  weekFrom: string;
  weekTo: string;
  directoryLength?: number;
  displayEmployeesLength?: number;
  isClosedWeek?: boolean;
  stack: string;
  delta?: "14→0" | "0→14" | "N→0" | "0→N" | "same" | "other";
};

/** FIFO of sourceFunctions — one push per with(...), one shift per setWeekEmployees call. */
const writeSourceQueue: string[] = [];

/** Annotate next setWeekEmployees write (DIAG-02). */
export function markPayrollWeekEmployeesWriteSource(sourceFunction: string): void {
  if (sourceFunction) writeSourceQueue.push(sourceFunction);
}

/** Clear one pending annotation without logging (noop set / early return). */
export function clearPayrollWeekEmployeesWriteSource(): void {
  writeSourceQueue.shift();
}

/**
 * Wrap a setWeekEmployees call with sourceFunction (DIAG-02 · no behaviour change).
 * Source is bound at set() call time (queue), not inside React setState updater — avoids race.
 */
export function withPayrollWeekEmployeesWriteSource<T>(sourceFunction: string, fn: () => T): T {
  writeSourceQueue.push(sourceFunction);
  return fn();
}

/** Take source for the setWeekEmployees invocation about to schedule setState (DIAG-02). */
export function takePayrollWeekEmployeesWriteSource(): string {
  return writeSourceQueue.shift() ?? "unknown";
}

function consumeWriteSource(explicit?: string): string {
  if (explicit) return explicit;
  return takePayrollWeekEmployeesWriteSource();
}

type WriteTraceGlobals = {
  __WG_ENABLE_PAYROLL_WRITE_TRACE__?: boolean;
  __WG_PAYROLL_WRITE_TRACE__?: {
    enable: () => void;
    disable: () => void;
    clear: () => void;
    dump: () => PayrollWriteTraceEvent[];
    report: () => string;
    download: () => void;
    findFirst14to0: () => PayrollWriteTraceEvent | null;
    findFirst0to14: () => PayrollWriteTraceEvent | null;
    /** DIAG-02 — pierwszy restore 0→N z sourceFunction (Owner capture). */
    firstRestore: () => PayrollWriteTraceEvent | null;
  };
};

let memoryEnabled = false;
let seq = 0;
let writeNo = 0;
const events: PayrollWriteTraceEvent[] = [];

function g(): WriteTraceGlobals {
  return globalThis as WriteTraceGlobals;
}

function sessionOn(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

function isEnabled(): boolean {
  return memoryEnabled || g().__WG_ENABLE_PAYROLL_WRITE_TRACE__ === true || sessionOn();
}

function captureStack(): string {
  try {
    return (new Error().stack ?? "")
      .split("\n")
      .slice(2, 16)
      .map((l) => l.trim())
      .join("\n");
  } catch {
    return "";
  }
}

function weekRangeFromLs(): { weekFrom: string; weekTo: string } {
  try {
    const wf = JSON.parse(localStorage.getItem("kw-weekFrom") ?? '""');
    const wt = JSON.parse(localStorage.getItem("kw-weekTo") ?? '""');
    return {
      weekFrom: typeof wf === "string" ? wf : "",
      weekTo: typeof wt === "string" ? wt : "",
    };
  } catch {
    return { weekFrom: "", weekTo: "" };
  }
}

function classifyDelta(
  before: number | null,
  after: number | null,
): PayrollWriteTraceEvent["delta"] {
  if (before == null || after == null) return undefined;
  if (before === after) return "same";
  if (before === 14 && after === 0) return "14→0";
  if (before === 0 && after === 14) return "0→14";
  if (after === 0 && before > 0) return "N→0";
  if (before === 0 && after > 0) return "0→N";
  return "other";
}

function push(input: {
  kind: PayrollWriteKind;
  caller: string;
  reason: string;
  sourceFunction?: string;
  beforeCount: number | null;
  afterCount: number | null;
  weekFrom: string;
  weekTo: string;
  directoryLength?: number;
  displayEmployeesLength?: number;
  isClosedWeek?: boolean;
  stack?: string;
  countAsWrite?: boolean;
}): void {
  if (!isEnabled()) return;
  const countAsWrite = input.countAsWrite !== false
    && (input.kind === "INIT" || input.kind === "SET" || input.kind === "STORAGE_EVENT");
  const ts = new Date().toISOString();
  const sourceFunction =
    input.sourceFunction
    ?? (input.kind === "SET" ? consumeWriteSource() : input.kind === "INIT" ? "useLocalStorage.init" : input.kind === "STORAGE_EVENT" ? "StorageEvent" : "—");
  const row: PayrollWriteTraceEvent = {
    writeNo: countAsWrite ? ++writeNo : writeNo,
    seq: ++seq,
    kind: input.kind,
    ts,
    t: Date.now(),
    timestamp: ts,
    caller: input.caller,
    reason: input.reason,
    sourceFunction,
    beforeCount: input.beforeCount,
    afterCount: input.afterCount,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    directoryLength: input.directoryLength,
    displayEmployeesLength: input.displayEmployeesLength,
    isClosedWeek: input.isClosedWeek,
    stack: input.stack ?? captureStack(),
    delta: classifyDelta(input.beforeCount, input.afterCount),
  };
  events.push(row);
  if (events.length > MAX_EVENTS) events.shift();
  const tag = countAsWrite ? `WRITE #${row.writeNo}` : `RECOMPUTE #${row.seq}`;
  console.info(
    `[payroll-write-trace] ${tag} source=${row.sourceFunction} ${row.beforeCount ?? "—"}→${row.afterCount ?? "—"}`,
    row,
  );
}

export function setPayrollWriteTraceEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  g().__WG_ENABLE_PAYROLL_WRITE_TRACE__ = enabled;
  try {
    if (enabled) sessionStorage.setItem(SESSION_FLAG, "1");
    else sessionStorage.removeItem(SESSION_FLAG);
  } catch { /* ignore */ }
  if (enabled) {
    console.info(
      "[payroll-write-trace] ACTIVE · 2.65.25-diag · sourceFunction · po smoke: __WG_PAYROLL_WRITE_TRACE__.download()",
    );
  }
}

export function logPayrollWeekEmployeesInit(input: {
  employeeCount: number;
  weekFrom?: string;
  weekTo?: string;
}): void {
  const wk = weekRangeFromLs();
  push({
    kind: "INIT",
    caller: "useLocalStorage.init",
    reason: "react_state_init_from_ls",
    sourceFunction: "useLocalStorage.init",
    beforeCount: null,
    afterCount: input.employeeCount,
    weekFrom: input.weekFrom ?? wk.weekFrom,
    weekTo: input.weekTo ?? wk.weekTo,
    countAsWrite: true,
  });
}

export function logPayrollWeekEmployeesWrite(input: {
  caller?: string;
  reason: string;
  sourceFunction?: string;
  employeeCountBefore: number;
  employeeCountAfter: number;
  weekFrom?: string;
  weekTo?: string;
}): void {
  const wk = weekRangeFromLs();
  push({
    kind: "SET",
    caller: input.caller ?? "setWeekEmployees",
    reason: input.reason,
    sourceFunction: input.sourceFunction ?? consumeWriteSource(),
    beforeCount: input.employeeCountBefore,
    afterCount: input.employeeCountAfter,
    weekFrom: input.weekFrom ?? wk.weekFrom,
    weekTo: input.weekTo ?? wk.weekTo,
    countAsWrite: true,
  });
}

export function logPayrollWeekEmployeesStorageEvent(input: {
  employeeCountBefore: number;
  employeeCountAfter: number;
}): void {
  const wk = weekRangeFromLs();
  push({
    kind: "STORAGE_EVENT",
    caller: "useLocalStorage.storage",
    reason: "storage_event_kw_week_employees",
    sourceFunction: "StorageEvent",
    beforeCount: input.employeeCountBefore,
    afterCount: input.employeeCountAfter,
    weekFrom: wk.weekFrom,
    weekTo: wk.weekTo,
    countAsWrite: true,
  });
}

export function logPayrollProductionRecompute(input: {
  weekEmployeesLength: number;
  productionLength: number;
  directoryLength: number;
  weekFrom: string;
  weekTo: string;
}): void {
  push({
    kind: "PRODUCTION_RECOMPUTE",
    caller: "App.productionWeekEmployees",
    reason: "filterProductionWeekEmployees",
    sourceFunction: "—",
    beforeCount: input.weekEmployeesLength,
    afterCount: input.productionLength,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    directoryLength: input.directoryLength,
    countAsWrite: false,
  });
}

export function logPayrollDisplayRecompute(input: {
  weekEmployeesLength: number;
  displayLength: number;
  weekFrom: string;
  weekTo: string;
  isClosedWeek: boolean;
  reason: string;
}): void {
  push({
    kind: "DISPLAY_RECOMPUTE",
    caller: "resolvePayrollDisplayEmployees",
    reason: input.reason,
    sourceFunction: "—",
    beforeCount: input.weekEmployeesLength,
    afterCount: input.displayLength,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    displayEmployeesLength: input.displayLength,
    isClosedWeek: input.isClosedWeek,
    countAsWrite: false,
  });
}

export function payrollWriteTraceDump(): PayrollWriteTraceEvent[] {
  return [...events];
}

export function payrollWriteTraceReport(): string {
  const lines: string[] = [
    "PAYROLL-P0-DIAGNOSTIC-02 WRITE TIMELINE",
    `version=2.65.25-diag events=${events.length} writes=${writeNo}`,
    "",
  ];
  for (const e of events) {
    if (e.kind === "INIT" || e.kind === "SET" || e.kind === "STORAGE_EVENT") {
      lines.push(`WRITE #${e.writeNo}`);
      lines.push(`  kind: ${e.kind}`);
      lines.push(`  timestamp: ${e.timestamp}`);
      lines.push(`  caller: ${e.caller}`);
      lines.push(`  reason: ${e.reason}`);
      lines.push(`  sourceFunction: ${e.sourceFunction}`);
      lines.push(`  beforeCount: ${e.beforeCount}`);
      lines.push(`  afterCount: ${e.afterCount}`);
      lines.push(`  weekFrom: ${e.weekFrom}`);
      lines.push(`  weekTo: ${e.weekTo}`);
      lines.push(`  delta: ${e.delta ?? "—"}`);
      lines.push(`  stack:`);
      for (const s of e.stack.split("\n").slice(0, 8)) lines.push(`    ${s}`);
      lines.push("");
    } else {
      lines.push(`RECOMPUTE ${e.kind} seq=${e.seq}`);
      lines.push(`  timestamp: ${e.timestamp}`);
      lines.push(`  caller: ${e.caller}`);
      lines.push(`  reason: ${e.reason}`);
      lines.push(`  beforeCount: ${e.beforeCount}`);
      lines.push(`  afterCount: ${e.afterCount}`);
      lines.push(`  weekFrom: ${e.weekFrom}`);
      lines.push(`  weekTo: ${e.weekTo}`);
      if (e.displayEmployeesLength != null) lines.push(`  displayEmployees: ${e.displayEmployeesLength}`);
      if (e.directoryLength != null) lines.push(`  directoryLength: ${e.directoryLength}`);
      if (e.isClosedWeek != null) lines.push(`  isClosedWeek: ${e.isClosedWeek}`);
      lines.push("");
    }
  }
  const firstDown = events.find((e) => e.delta === "14→0" || e.delta === "N→0");
  const firstUp = events.find((e) => e.delta === "0→14" || e.delta === "0→N");
  lines.push("===== CRITICAL =====");
  lines.push(
    firstDown
      ? `FIRST DOWN (N→0 / 14→0): WRITE #${firstDown.writeNo} · source=${firstDown.sourceFunction} · ${firstDown.caller} · ${firstDown.reason} · ${firstDown.timestamp}`
      : "FIRST DOWN: (none recorded)",
  );
  lines.push(
    firstUp
      ? `FIRST UP (0→N / 0→14): WRITE #${firstUp.writeNo} · source=${firstUp.sourceFunction} · ${firstUp.caller} · ${firstUp.reason} · ${firstUp.timestamp}`
      : "FIRST UP: (none recorded)",
  );
  return lines.join("\n");
}

export function installPayrollWriteTraceGlobals(): void {
  g().__WG_PAYROLL_WRITE_TRACE__ = {
    enable: () => setPayrollWriteTraceEnabled(true),
    disable: () => setPayrollWriteTraceEnabled(false),
    clear: () => {
      events.length = 0;
      seq = 0;
      writeNo = 0;
    },
    dump: payrollWriteTraceDump,
    report: () => {
      const text = payrollWriteTraceReport();
      console.info(text);
      return text;
    },
    download: () => {
      const blob = new Blob(
        [JSON.stringify({ report: payrollWriteTraceReport(), events }, null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-write-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    findFirst14to0: () => events.find((e) => e.delta === "14→0" || e.delta === "N→0") ?? null,
    findFirst0to14: () => events.find((e) => e.delta === "0→14" || e.delta === "0→N") ?? null,
    firstRestore: () => {
      const e = events.find((x) => x.delta === "0→14" || x.delta === "0→N") ?? null;
      if (!e) {
        console.info("FIRST 0→14: (none recorded yet)");
        return null;
      }
      const block = [
        `WRITE #${e.writeNo}`,
        `sourceFunction:`,
        e.sourceFunction,
        `caller:`,
        e.caller,
        `reason:`,
        e.reason,
        `before:`,
        String(e.beforeCount),
        `after:`,
        String(e.afterCount),
        `weekFrom:`,
        e.weekFrom,
        `weekTo:`,
        e.weekTo,
        `timestamp:`,
        e.timestamp,
        `stack:`,
        e.stack,
      ].join("\n");
      console.info(block);
      return e;
    },
  };
}

/** Module load — globals + auto-enable BEFORE useLocalStorage.init (diag build). */
installPayrollWriteTraceGlobals();
if (PAYROLL_WRITE_TRACE_DIAG_AUTO_ENABLE) {
  setPayrollWriteTraceEnabled(true);
}
