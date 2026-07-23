/**
 * PAYROLL-P0-REGRESSION-06 — storage pipeline timeline (kw-week-employees).
 * TEMP · 2.65.24-diag — tylko obserwowalność; usuń po zrzucie Ownera.
 *
 * Instalacja: import FIRST w main.tsx (przed @/lib/cloud-sync i App).
 *
 * window.__WG_PAYROLL_STORAGE_TRACE__
 *   .enable() | .disable() | .clear() | .report() | .download() | .dump()
 *
 * Diag build: auto-enable przy loacie (Ctrl+Shift+R wystarczy).
 */

const KEY = "kw-week-employees";
const MAX_EVENTS = 8_000;
const SESSION_FLAG = "wg-payroll-storage-trace-enabled";

/** INCIDENT-23-07 cleanup — opt-in only (`__WG_PAYROLL_STORAGE_TRACE__.enable()` / session). */
export const PAYROLL_STORAGE_TRACE_DIAG_AUTO_ENABLE = false;

export type PayrollStorageOp = "BOOT_SNAPSHOT" | "GET" | "SET" | "REMOVE" | "PHASE" | "NOTE";

export type PayrollStorageTraceEvent = {
  seq: number;
  op: PayrollStorageOp;
  ts: string;
  t: number;
  timestamp: string;
  key: string;
  /** bajty payloadu (raw string); null gdy brak */
  payloadSize: number | null;
  /** liczba elementów tablicy; -1 = key missing; -2 = non-array; -3 = JSON parse fail */
  employeeCount: number | null;
  /** przed SET/REMOVE */
  beforeCount: number | null;
  afterCount: number | null;
  caller: string;
  reason: string;
  stack: string;
  /** raw preview (obcięty) — tylko SET/BOOT */
  rawPreview?: string;
};

type StorageTraceGlobals = {
  __WG_ENABLE_PAYROLL_STORAGE_TRACE__?: boolean;
  __WG_PAYROLL_STORAGE_TRACE__?: {
    enable: () => void;
    disable: () => void;
    clear: () => void;
    dump: () => PayrollStorageTraceEvent[];
    report: () => string;
    download: () => void;
    findEmptyWrites: () => PayrollStorageTraceEvent[];
    findReadsBeforeFirstReactInitHint: () => PayrollStorageTraceEvent[];
  };
};

let memoryEnabled = false;
let seq = 0;
let installed = false;
let suppressSelf = false;
const events: PayrollStorageTraceEvent[] = [];

function g(): StorageTraceGlobals {
  return globalThis as StorageTraceGlobals;
}

function sessionOn(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

function isEnabled(): boolean {
  return memoryEnabled || g().__WG_ENABLE_PAYROLL_STORAGE_TRACE__ === true || sessionOn();
}

function captureStack(): string {
  try {
    return (new Error().stack ?? "")
      .split("\n")
      .slice(2, 18)
      .map((l) => l.trim())
      .join("\n");
  } catch {
    return "";
  }
}

function inferCaller(stack: string): string {
  const lines = stack.split("\n").filter(Boolean);
  for (const line of lines) {
    if (/payroll-kw-week-employees-storage-trace/i.test(line)) continue;
    if (/Object\.(getItem|setItem|removeItem)/i.test(line)) continue;
    const m =
      line.match(/at\s+([^\s(]+)/) ||
      line.match(/([A-Za-z0-9_$.]+)@/);
    if (m?.[1]) return m[1].replace(/^Object\./, "");
  }
  return "unknown";
}

function employeeCountFromRaw(raw: string | null): number {
  if (raw == null) return -1;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.length;
    return -2;
  } catch {
    return -3;
  }
}

function previewRaw(raw: string | null, max = 120): string | undefined {
  if (raw == null) return undefined;
  return raw.length <= max ? raw : `${raw.slice(0, max)}…(+${raw.length - max})`;
}

function pushEvent(partial: {
  op: PayrollStorageOp;
  caller?: string;
  reason: string;
  payloadSize?: number | null;
  employeeCount?: number | null;
  beforeCount?: number | null;
  afterCount?: number | null;
  rawPreview?: string;
  stack?: string;
}): void {
  if (!isEnabled()) return;
  const now = Date.now();
  const stack = partial.stack ?? captureStack();
  const ev: PayrollStorageTraceEvent = {
    seq: ++seq,
    op: partial.op,
    ts: new Date(now).toISOString(),
    t: now,
    timestamp: new Date(now).toISOString(),
    key: KEY,
    payloadSize: partial.payloadSize ?? null,
    employeeCount: partial.employeeCount ?? null,
    beforeCount: partial.beforeCount ?? null,
    afterCount: partial.afterCount ?? null,
    caller: partial.caller ?? inferCaller(stack),
    reason: partial.reason,
    stack,
    rawPreview: partial.rawPreview,
  };
  events.push(ev);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  try {
    console.info(
      `[PAYROLL-STORAGE-TRACE] #${ev.seq} ${ev.op} count=${ev.employeeCount ?? "n/a"} size=${ev.payloadSize ?? "n/a"} ← ${ev.caller} (${ev.reason})`,
    );
  } catch {
    /* ignore */
  }
}

function readRawViaOrig(origGet: Storage["getItem"]): string | null {
  suppressSelf = true;
  try {
    return origGet.call(localStorage, KEY);
  } finally {
    suppressSelf = false;
  }
}

export function logPayrollStoragePhase(reason: string, extra?: { caller?: string; employeeCount?: number }): void {
  let raw: string | null = null;
  try {
    suppressSelf = true;
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  } finally {
    suppressSelf = false;
  }
  pushEvent({
    op: "PHASE",
    caller: extra?.caller ?? "CloudLoader",
    reason,
    payloadSize: raw != null ? raw.length : null,
    employeeCount: extra?.employeeCount ?? employeeCountFromRaw(raw),
    beforeCount: null,
    afterCount: null,
    rawPreview: previewRaw(raw),
  });
}

export function logPayrollStorageNote(reason: string, caller = "audit"): void {
  pushEvent({
    op: "NOTE",
    caller,
    reason,
    payloadSize: null,
    employeeCount: null,
    beforeCount: null,
    afterCount: null,
  });
}

function buildReport(): string {
  const lines: string[] = [];
  lines.push("=== PAYROLL-P0-REGRESSION-06 STORAGE TRACE ===");
  lines.push(`events: ${events.length}`);
  lines.push("");
  const emptySets = events.filter(
    (e) => e.op === "SET" && (e.afterCount === 0 || e.employeeCount === 0),
  );
  lines.push(`empty SET count: ${emptySets.length}`);
  for (const e of emptySets.slice(0, 20)) {
    lines.push(`  SET#${e.seq} t=${e.ts} caller=${e.caller} size=${e.payloadSize} ← ${e.reason}`);
  }
  lines.push("");
  lines.push("--- timeline ---");
  for (const e of events) {
    lines.push(
      `#${e.seq} ${e.ts} ${e.op} count=${e.employeeCount ?? "n/a"} before=${e.beforeCount ?? "n/a"} after=${e.afterCount ?? "n/a"} size=${e.payloadSize ?? "n/a"} caller=${e.caller} reason=${e.reason}`,
    );
  }
  lines.push("");
  lines.push("--- stacks (SET + BOOT + first GET) ---");
  const stackEv = events.filter(
    (e) => e.op === "SET" || e.op === "BOOT_SNAPSHOT" || (e.op === "GET" && e.seq <= 5),
  );
  for (const e of stackEv.slice(0, 40)) {
    lines.push(`#${e.seq} ${e.op} ${e.caller}`);
    lines.push(e.stack || "(no stack)");
    lines.push("");
  }
  return lines.join("\n");
}

function installApi(): void {
  g().__WG_PAYROLL_STORAGE_TRACE__ = {
    enable: () => {
      memoryEnabled = true;
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* ignore */
      }
      console.info("[PAYROLL-STORAGE-TRACE] enabled");
    },
    disable: () => {
      memoryEnabled = false;
      try {
        sessionStorage.removeItem(SESSION_FLAG);
      } catch {
        /* ignore */
      }
      console.info("[PAYROLL-STORAGE-TRACE] disabled");
    },
    clear: () => {
      events.length = 0;
      seq = 0;
      console.info("[PAYROLL-STORAGE-TRACE] cleared");
    },
    dump: () => events.slice(),
    report: () => {
      const text = buildReport();
      console.info(text);
      return text;
    },
    download: () => {
      const blob = new Blob(
        [JSON.stringify({ version: "2.65.24-diag", generatedAt: new Date().toISOString(), events }, null, 2)],
        { type: "application/json" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `payroll-storage-trace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    findEmptyWrites: () =>
      events.filter((e) => e.op === "SET" && (e.afterCount === 0 || e.employeeCount === 0)),
    findReadsBeforeFirstReactInitHint: () => {
      const initHint = events.find(
        (e) =>
          e.op === "GET" &&
          (/useLocalStorage/i.test(e.caller) || /react_state_init/i.test(e.reason)),
      );
      if (!initHint) return events.filter((e) => e.op === "GET" || e.op === "SET" || e.op === "BOOT_SNAPSHOT");
      return events.filter((e) => e.seq < initHint.seq);
    },
  };
}

export function installPayrollKwWeekEmployeesStorageTrace(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  installApi();

  if (PAYROLL_STORAGE_TRACE_DIAG_AUTO_ENABLE) {
    memoryEnabled = true;
    try {
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      /* ignore */
    }
  }

  const origGet = Storage.prototype.getItem;
  const origSet = Storage.prototype.setItem;
  const origRemove = Storage.prototype.removeItem;

  Storage.prototype.getItem = function (this: Storage, key: string): string | null {
    const value = origGet.call(this, key);
    if (!suppressSelf && this === localStorage && key === KEY) {
      pushEvent({
        op: "GET",
        reason: "localStorage.getItem",
        payloadSize: value != null ? value.length : null,
        employeeCount: employeeCountFromRaw(value),
        beforeCount: null,
        afterCount: null,
        rawPreview: previewRaw(value),
      });
    }
    return value;
  };

  Storage.prototype.setItem = function (this: Storage, key: string, value: string): void {
    if (!suppressSelf && this === localStorage && key === KEY) {
      const beforeRaw = readRawViaOrig(origGet);
      const beforeCount = employeeCountFromRaw(beforeRaw);
      const afterCount = employeeCountFromRaw(value);
      pushEvent({
        op: "SET",
        reason: "localStorage.setItem",
        payloadSize: value != null ? String(value).length : null,
        employeeCount: afterCount,
        beforeCount,
        afterCount,
        rawPreview: previewRaw(String(value)),
      });
    }
    return origSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function (this: Storage, key: string): void {
    if (!suppressSelf && this === localStorage && key === KEY) {
      const beforeRaw = readRawViaOrig(origGet);
      const beforeCount = employeeCountFromRaw(beforeRaw);
      pushEvent({
        op: "REMOVE",
        reason: "localStorage.removeItem",
        payloadSize: null,
        employeeCount: -1,
        beforeCount,
        afterCount: -1,
      });
    }
    return origRemove.call(this, key);
  };

  // Snapshot BEFORE any app module writes (main imports this first).
  try {
    const raw = readRawViaOrig(origGet);
    pushEvent({
      op: "BOOT_SNAPSHOT",
      caller: "storage-trace.install",
      reason: "pre_module_load_ls_snapshot",
      payloadSize: raw != null ? raw.length : null,
      employeeCount: employeeCountFromRaw(raw),
      beforeCount: null,
      afterCount: employeeCountFromRaw(raw),
      rawPreview: previewRaw(raw),
      stack: captureStack(),
    });
  } catch {
    pushEvent({
      op: "BOOT_SNAPSHOT",
      caller: "storage-trace.install",
      reason: "pre_module_load_ls_snapshot_failed",
      payloadSize: null,
      employeeCount: null,
    });
  }

  logPayrollStorageNote(
    "storage_patch_installed — every GET/SET/REMOVE for kw-week-employees is traced",
    "storage-trace.install",
  );
}
