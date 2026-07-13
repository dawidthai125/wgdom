/**
 * TEMP · PAYROLL-ANTI-LEAK-RUNTIME-TRACE-01 — diagnostyka P0; usuń po audycie Ownera.
 * Aktywacja: window.__WG_ENABLE_PAYROLL_ANTI_LEAK_TRACE__ = true
 * lub __WG_PAYROLL_ANTI_LEAK_TRACE__.enable()
 */

const MAX_EVENTS = 4_000;

export type PayrollAntiLeakTraceEvent = {
  seq: number;
  ts: string;
  t: number;
  kind: "anti_leak" | "apply_admin_bundle";
  antiLeakFired?: boolean;
  reason?: string;
  crossWeekLeak?: boolean;
  staleArchiveRepublish?: boolean;
  sameWeekCloudSsot?: boolean;
  payrollSourceLength?: number;
  archiveRich?: boolean;
  archiveRichness?: number;
  mergedRichness?: number;
  cloudWeekKey?: string;
  targetWeekKey?: string;
  localWeekKey?: string;
  mergedEmployeeCountBefore?: number;
  mergedEmployeeCountAfter?: number;
  incomingRosterCount?: number;
  weekFrom?: string;
  weekTo?: string;
  generation?: number;
  stack: string;
};

type AntiLeakTraceGlobals = {
  __WG_ENABLE_PAYROLL_ANTI_LEAK_TRACE__?: boolean;
  __WG_PAYROLL_ANTI_LEAK_TRACE__?: {
    download: () => void;
    dump: () => PayrollAntiLeakTraceEvent[];
    clear: () => void;
    enable: () => void;
    disable: () => void;
    findFirstAntiLeakFire: () => PayrollAntiLeakTraceEvent | null;
  };
};

let memoryEnabled = false;
let seq = 0;
const events: PayrollAntiLeakTraceEvent[] = [];

function traceGlobals(): AntiLeakTraceGlobals {
  return globalThis as AntiLeakTraceGlobals;
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

function isEnabled(): boolean {
  return memoryEnabled || traceGlobals().__WG_ENABLE_PAYROLL_ANTI_LEAK_TRACE__ === true;
}

function push(event: Omit<PayrollAntiLeakTraceEvent, "seq" | "ts" | "t" | "stack"> & { stack?: string }) {
  if (!isEnabled()) return;
  const row: PayrollAntiLeakTraceEvent = {
    seq: ++seq,
    ts: new Date().toISOString(),
    t: Date.now(),
    stack: event.stack ?? captureStack(),
    ...event,
  };
  events.push(row);
  if (events.length > MAX_EVENTS) events.shift();
  console.info("[payroll-anti-leak-trace]", row);
}

export function setPayrollAntiLeakRuntimeTraceEnabled(enabled: boolean): void {
  memoryEnabled = enabled;
  traceGlobals().__WG_ENABLE_PAYROLL_ANTI_LEAK_TRACE__ = enabled;
  if (enabled) {
    console.info(
      "[payroll-anti-leak-trace] ACTIVE · export: __WG_PAYROLL_ANTI_LEAK_TRACE__.download()",
    );
  }
}

export function isPayrollAntiLeakRuntimeTraceEnabled(): boolean {
  return isEnabled();
}

function resolveAntiLeakReason(input: {
  shouldFireAntiLeak: boolean;
  baseConditions: boolean;
  crossWeekLeak: boolean;
  staleArchiveRepublish: boolean;
  sameWeekCloudSsot: boolean;
}): string {
  if (input.shouldFireAntiLeak) {
    if (input.crossWeekLeak && input.staleArchiveRepublish) return "cross_week_leak+stale_archive_republish";
    if (input.crossWeekLeak) return "cross_week_leak";
    return "stale_archive_republish";
  }
  if (input.baseConditions && input.sameWeekCloudSsot && !input.staleArchiveRepublish) {
    return "skipped_same_week_cloud_ssot";
  }
  if (!input.baseConditions) return "base_conditions_false";
  return "predicates_false";
}

export function logPayrollAntiLeakRuntimeTrace(input: {
  shouldFireAntiLeak: boolean;
  baseConditions: boolean;
  crossWeekLeak: boolean;
  staleArchiveRepublish: boolean;
  sameWeekCloudSsot: boolean;
  payrollSourceLength: number;
  archiveRich: boolean;
  archiveRichness: number;
  mergedRichness: number;
  cloudWeekKey: string;
  targetWeekKey: string;
  localWeekKey: string;
  mergedEmployeeCountBefore: number;
  mergedEmployeeCountAfter: number;
}): void {
  push({
    kind: "anti_leak",
    antiLeakFired: input.shouldFireAntiLeak,
    reason: resolveAntiLeakReason(input),
    crossWeekLeak: input.crossWeekLeak,
    staleArchiveRepublish: input.staleArchiveRepublish,
    sameWeekCloudSsot: input.sameWeekCloudSsot,
    payrollSourceLength: input.payrollSourceLength,
    archiveRich: input.archiveRich,
    archiveRichness: input.archiveRichness,
    mergedRichness: input.mergedRichness,
    cloudWeekKey: input.cloudWeekKey,
    targetWeekKey: input.targetWeekKey,
    localWeekKey: input.localWeekKey,
    mergedEmployeeCountBefore: input.mergedEmployeeCountBefore,
    mergedEmployeeCountAfter: input.mergedEmployeeCountAfter,
  });
}

export function logApplyAdminDataBundleAntiLeakProbe(input: {
  incomingRosterCount: number;
  weekFrom: string;
  weekTo: string;
  generation: number;
}): void {
  push({
    kind: "apply_admin_bundle",
    incomingRosterCount: input.incomingRosterCount,
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
    generation: input.generation,
  });
}

export function payrollAntiLeakTraceDump(): PayrollAntiLeakTraceEvent[] {
  return [...events];
}

export function payrollAntiLeakTraceFindFirstFire(): PayrollAntiLeakTraceEvent | null {
  return events.find((e) => e.kind === "anti_leak" && e.antiLeakFired === true) ?? null;
}

export function installPayrollAntiLeakRuntimeTraceGlobals(): void {
  traceGlobals().__WG_PAYROLL_ANTI_LEAK_TRACE__ = {
    download: () => {
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-anti-leak-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    dump: payrollAntiLeakTraceDump,
    clear: () => {
      events.length = 0;
      seq = 0;
    },
    enable: () => setPayrollAntiLeakRuntimeTraceEnabled(true),
    disable: () => setPayrollAntiLeakRuntimeTraceEnabled(false),
    findFirstAntiLeakFire: payrollAntiLeakTraceFindFirstFire,
  };
}
