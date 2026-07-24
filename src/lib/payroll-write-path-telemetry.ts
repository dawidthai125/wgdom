/**
 * PAYROLL-IMPLEMENT-01 D1 — Write-path telemetry (passive).
 *
 * Ring always ON (unless kill-switch). Console only via existing payroll-trace opt-in.
 * Zero influence on Domain Push / Cloud Sync / guards / SSOT.
 */
import type { DayData, DayKey, WeekEmployee } from "@/app/app-domain";
import { DAYS, dayTotalHours } from "@/app/app-domain";
import {
  payrollTraceDump,
  payrollTraceEmitWritePath,
  rosterTraceSnapshot,
  type PayrollTraceDump,
} from "@/lib/payroll-runtime-trace";

/** Kill-switch: localStorage `wg-payroll-write-path-telemetry=0` disables ring append. Default ON. */
const KILL_SWITCH_KEY = "wg-payroll-write-path-telemetry";

export type PayrollWritePathSource =
  | "domain_push_flush"
  | "pwrPush"
  | "pwrRemove"
  | "pwrAdd"
  | "persistPayrollRoster";

export type PayrollWritePathTelemetryInput = {
  source: PayrollWritePathSource | string;
  weekFrom: string;
  weekTo: string;
  rosterAfter: unknown[];
  /** Optional pre-mutation roster; if omitted, best-effort read from LS (passive). */
  rosterBefore?: unknown[];
  /** D3 flag — logged only; D1 does not set or interpret for control flow. */
  intentionalHoursClear?: boolean;
  skipPayrollGuard?: boolean;
  empSample?: Array<{ directoryId?: string; id?: string; hours?: number }>;
};

function isWritePathTelemetryEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(KILL_SWITCH_KEY) !== "0";
  } catch {
    return true;
  }
}

function asEmpList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

/** Total hours (active days + prevSaturday) — local mirror, no cloud-sync import. */
export function rosterTotalHoursPassive(list: unknown): number {
  let total = 0;
  for (const emp of asEmpList(list)) {
    if (!emp || typeof emp !== "object") continue;
    const days = emp.days as Partial<Record<DayKey, DayData>> | undefined;
    if (days) {
      for (const k of DAYS) {
        const d = days[k];
        if (d) total += dayTotalHours(d);
      }
    }
    const ps = emp.prevSaturday as DayData | undefined;
    if (ps) total += dayTotalHours(ps);
  }
  return +total.toFixed(2);
}

function readLocalRosterPassive(): unknown[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem("kw-week-employees");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sampleEmps(list: unknown[], limit = 8): Array<{ directoryId?: string; id?: string; hours?: number }> {
  const out: Array<{ directoryId?: string; id?: string; hours?: number }> = [];
  for (const item of asEmpList(list).slice(0, limit)) {
    out.push({
      directoryId: item.directoryId,
      id: item.id,
      hours: rosterTotalHoursPassive([item]),
    });
  }
  return out;
}

/**
 * Passive write-path forensic record. Never throws. Never mutates roster / options.
 */
export function emitPayrollWritePathTelemetry(input: PayrollWritePathTelemetryInput): void {
  try {
    if (!isWritePathTelemetryEnabled()) return;
    const after = Array.isArray(input.rosterAfter) ? input.rosterAfter : [];
    const before = Array.isArray(input.rosterBefore)
      ? input.rosterBefore
      : readLocalRosterPassive();
    const hoursBefore = rosterTotalHoursPassive(before);
    const hoursAfter = rosterTotalHoursPassive(after);
    payrollTraceEmitWritePath("payroll.write_path", "PUSH", "info", {
      source: input.source,
      weekFrom: input.weekFrom,
      weekTo: input.weekTo,
      hoursBefore,
      hoursAfter,
      hoursDelta: +(hoursAfter - hoursBefore).toFixed(2),
      countBefore: asEmpList(before).length,
      countAfter: asEmpList(after).length,
      intentionalHoursClear: input.intentionalHoursClear === true,
      skipPayrollGuard: input.skipPayrollGuard === true,
      empSample: input.empSample ?? sampleEmps(after),
      rosterAfter: rosterTraceSnapshot(after, input.weekFrom, input.weekTo, "LOCAL", "PRESENT"),
    });
  } catch {
    /* D1 passive */
  }
}

export function payrollWritePathTelemetryDump(): PayrollTraceDump {
  const dump = payrollTraceDump();
  const events = dump.events.filter(
    (e) => e.writePath === true || e.event === "payroll.write_path",
  );
  return {
    ...dump,
    eventCount: events.length,
    events,
    firstSubjectLoss: null,
  };
}

export function installPayrollWritePathTelemetryGlobals(): void {
  const g = globalThis as {
    __WG_PAYROLL_WRITE_PATH__?: {
      dump: () => PayrollTraceDump;
      disable: () => void;
      enable: () => void;
    };
  };
  g.__WG_PAYROLL_WRITE_PATH__ = {
    dump: payrollWritePathTelemetryDump,
    disable: () => {
      try {
        localStorage.setItem(KILL_SWITCH_KEY, "0");
      } catch { /* ignore */ }
    },
    enable: () => {
      try {
        localStorage.removeItem(KILL_SWITCH_KEY);
      } catch { /* ignore */ }
    },
  };
}
