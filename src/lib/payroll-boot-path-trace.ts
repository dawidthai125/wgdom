/**
 * PAYROLL-P0-RCA-07 — rozróżnienie BOOT PATH A (TIMEOUT) vs B (SUCCESS + persist skip).
 * TEMP diagnostyka only — bez zmiany logiki.
 *
 * window.__WG_PAYROLL_BOOT_PATH__
 *   .enable() | .clear() | .dump() | .report() | .verdict()
 *
 * Auto-enable przy loacie.
 */

const MAX = 2_000;
const SESSION_FLAG = "wg-payroll-boot-path-enabled";
export const PAYROLL_BOOT_PATH_DIAG_AUTO_ENABLE = true;

export type BootPathEventName =
  | "BOOT_START"
  | "BOOT_FETCH_DONE"
  | "BOOT_MERGE_DONE"
  | "BOOT_SHOULD_PERSIST"
  | "BOOT_LOCALSTORAGE_WRITE"
  | "BOOT_MARK_SUCCESS"
  | "BOOT_OPEN_PHASE"
  | "BOOT_TIMEOUT"
  | "APP_MOUNT"
  | "USELOCALSTORAGE_INIT";

export type BootPathEvent = {
  seq: number;
  event: BootPathEventName;
  timestamp: string;
  t: number;
  employeeCount: number | null;
  weekFrom: string;
  weekTo: string;
  phase: string;
  reason: string;
  shouldPersist?: boolean;
};

type G = {
  __WG_PAYROLL_BOOT_PATH__?: {
    enable: () => void;
    disable: () => void;
    clear: () => void;
    dump: () => BootPathEvent[];
    report: () => string;
    verdict: () => "A" | "B" | "UNKNOWN" | "INCOMPLETE";
  };
};

let enabled = false;
let seq = 0;
const events: BootPathEvent[] = [];
let lastPhase = "PENDING";

function g(): G {
  return globalThis as G;
}

function on(): boolean {
  if (enabled) return true;
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    return false;
  }
}

function weekFromLs(): { weekFrom: string; weekTo: string } {
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

function lsEmpCount(): number | null {
  try {
    const raw = localStorage.getItem("kw-week-employees");
    if (raw == null) return -1;
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.length : -2;
  } catch {
    return -3;
  }
}

export function logPayrollBootPath(
  event: BootPathEventName,
  input?: {
    employeeCount?: number | null;
    weekFrom?: string;
    weekTo?: string;
    phase?: string;
    reason?: string;
    shouldPersist?: boolean;
  },
): void {
  if (!on()) return;
  const wk = weekFromLs();
  if (input?.phase) lastPhase = input.phase;
  const row: BootPathEvent = {
    seq: ++seq,
    event,
    timestamp: new Date().toISOString(),
    t: Date.now(),
    employeeCount: input?.employeeCount ?? lsEmpCount(),
    weekFrom: input?.weekFrom ?? wk.weekFrom,
    weekTo: input?.weekTo ?? wk.weekTo,
    phase: input?.phase ?? lastPhase,
    reason: input?.reason ?? event,
    shouldPersist: input?.shouldPersist,
  };
  events.push(row);
  if (events.length > MAX) events.splice(0, events.length - MAX);
  console.info(
    `[payroll-boot-path] ${row.event} phase=${row.phase} count=${row.employeeCount} persist=${row.shouldPersist ?? "—"} · ${row.reason}`,
    row,
  );
}

/**
 * Map istniejące logi CloudLoader (logPayrollBootstrapTraceFromWeekKeys)
 * → timeline RCA-07 — BEZ zmian w CloudLoader.
 */
export function observePayrollBootstrapForBootPath(input: {
  caller: string;
  reason: string;
  weekFrom?: string;
  weekTo?: string;
  employeeCount?: number;
  employeeCountAfter?: number;
  persistKwWeekEmployees?: boolean;
  persistSkipped?: boolean;
}): void {
  if (!on()) return;
  const count =
    input.employeeCountAfter ?? input.employeeCount ?? null;
  const base = {
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    employeeCount: count,
    reason: input.reason,
  };

  switch (input.reason) {
    case "bootstrap_start":
      logPayrollBootPath("BOOT_START", { ...base, phase: "PENDING" });
      break;
    case "bootstrap_merge_enter":
      logPayrollBootPath("BOOT_FETCH_DONE", {
        ...base,
        phase: "PENDING",
        reason: "fetch_done_implied_by_merge_enter",
      });
      break;
    case "bootstrap_merge_exit":
      logPayrollBootPath("BOOT_MERGE_DONE", { ...base, phase: "PENDING" });
      break;
    case "bootstrap_persist_roster":
      logPayrollBootPath("BOOT_SHOULD_PERSIST", {
        ...base,
        phase: "PENDING",
        shouldPersist: true,
      });
      break;
    case "bootstrap_persist_skipped_empty":
      logPayrollBootPath("BOOT_SHOULD_PERSIST", {
        ...base,
        phase: "PENDING",
        shouldPersist: false,
      });
      break;
    case "bootstrap_ls_write_week_employees":
      logPayrollBootPath("BOOT_LOCALSTORAGE_WRITE", {
        ...base,
        phase: "PENDING",
        shouldPersist: true,
      });
      break;
    case "bootstrap_ready":
      logPayrollBootPath("BOOT_MARK_SUCCESS", {
        ...base,
        phase: "PENDING",
        reason: "bootstrap_ready≈markCloudBootstrapSuccess",
      });
      break;
    case "bootstrap_phase_timeout":
      logPayrollBootPath("BOOT_TIMEOUT", { ...base, phase: "TIMEOUT" });
      logPayrollBootPath("BOOT_OPEN_PHASE", { ...base, phase: "TIMEOUT" });
      break;
    case "bootstrap_phase_success":
      logPayrollBootPath("BOOT_OPEN_PHASE", { ...base, phase: "SUCCESS" });
      break;
    case "bootstrap_phase_failed":
      logPayrollBootPath("BOOT_OPEN_PHASE", { ...base, phase: "FAILED" });
      break;
    default:
      break;
  }
}

/**
 * A = TIMEOUT opened App before/without SUCCESS persist of roster
 * B = SUCCESS opened App but persist of kw-week-employees was skipped (empty merge)
 */
export function verdictPayrollBootPath(): "A" | "B" | "UNKNOWN" | "INCOMPLETE" {
  const init = events.find((e) => e.event === "USELOCALSTORAGE_INIT");
  const appMount = events.find((e) => e.event === "APP_MOUNT");
  const shouldPersist = events.find((e) => e.event === "BOOT_SHOULD_PERSIST");
  const write = events.find((e) => e.event === "BOOT_LOCALSTORAGE_WRITE");
  const firstOpen = events.find(
    (e) => e.event === "BOOT_OPEN_PHASE" || e.event === "BOOT_TIMEOUT",
  );

  if (!init || !appMount || !firstOpen) return "INCOMPLETE";

  const openedViaTimeout =
    firstOpen.event === "BOOT_TIMEOUT" || firstOpen.phase === "TIMEOUT";
  if (openedViaTimeout) return "A";

  if (firstOpen.phase === "SUCCESS") {
    const skipped =
      shouldPersist?.shouldPersist === false ||
      (shouldPersist != null && !write) ||
      (write != null && (write.employeeCount ?? 0) === 0);
    if (skipped || (init.employeeCount === 0 && !write)) return "B";
    return "UNKNOWN";
  }

  return "INCOMPLETE";
}

export function reportPayrollBootPath(): string {
  const v = verdictPayrollBootPath();
  const lines: string[] = [
    "PAYROLL-P0-RCA-07 BOOT PATH",
    `verdict=${v}`,
    "",
    "--- timeline ---",
  ];
  for (const e of events) {
    lines.push(
      `#${e.seq} ${e.timestamp} ${e.event} phase=${e.phase} count=${e.employeeCount} week=${e.weekFrom}..${e.weekTo} persist=${e.shouldPersist ?? "—"} · ${e.reason}`,
    );
  }
  lines.push("");
  lines.push("BOOT PATH");
  if (v === "A") {
    lines.push("A)");
    lines.push("TIMEOUT");
    lines.push("↓");
    lines.push("App mount");
    lines.push("↓");
    lines.push("INIT=0");
  } else if (v === "B") {
    lines.push("B)");
    lines.push("SUCCESS");
    lines.push("↓");
    lines.push("persist skipped");
    lines.push("↓");
    lines.push("INIT=0");
  } else {
    lines.push(`${v} — capture incomplete or ambiguous; paste full dump.`);
  }
  const text = lines.join("\n");
  console.info(text);
  return text;
}

export function installPayrollBootPathGlobals(): void {
  g().__WG_PAYROLL_BOOT_PATH__ = {
    enable: () => {
      enabled = true;
      try {
        sessionStorage.setItem(SESSION_FLAG, "1");
      } catch {
        /* ignore */
      }
    },
    disable: () => {
      enabled = false;
      try {
        sessionStorage.removeItem(SESSION_FLAG);
      } catch {
        /* ignore */
      }
    },
    clear: () => {
      events.length = 0;
      seq = 0;
      lastPhase = "PENDING";
    },
    dump: () => events.slice(),
    report: reportPayrollBootPath,
    verdict: verdictPayrollBootPath,
  };
  if (PAYROLL_BOOT_PATH_DIAG_AUTO_ENABLE) {
    enabled = true;
    try {
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      /* ignore */
    }
  }
}

installPayrollBootPathGlobals();
