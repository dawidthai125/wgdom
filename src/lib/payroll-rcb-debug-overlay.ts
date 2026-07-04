/** RC-B — tymczasowy overlay diagnostyczny (usunąć po zamknięciu RC-B). */

export const PAYROLL_RCB_DEBUG_LS_KEY = "wgdom-payroll-rcb-debug";
const TIMELINE_CAP = 10;

export type PayrollRcbDebugOverlaySnapshot = {
  mergedCount?: number | null;
  cloudCount?: number | null;
  shouldPush?: boolean | null;
  payloadCount?: number | null;
  payrollGuardBlocked?: boolean | null;
  batchSetStatus?: number | null;
  batchSetCount?: number | null;
  updatedAt?: string;
};

export type PayrollRcbDebugTimelineEntry = {
  time: string;
  event: string;
  mergedCount: number | null;
  cloudCount: number | null;
  payloadCount: number | null;
  batchSetCount: number | null;
  batchSetStatus: number | null;
};

let snapshot: PayrollRcbDebugOverlaySnapshot = {};
let timeline: PayrollRcbDebugTimelineEntry[] = [];
const listeners = new Set<() => void>();

function formatTimelineTime(date = new Date()): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function snapshotToTimelineEntry(event: string): PayrollRcbDebugTimelineEntry {
  return {
    time: formatTimelineTime(),
    event,
    mergedCount: snapshot.mergedCount ?? null,
    cloudCount: snapshot.cloudCount ?? null,
    payloadCount: snapshot.payloadCount ?? null,
    batchSetCount: snapshot.batchSetCount ?? null,
    batchSetStatus: snapshot.batchSetStatus ?? null,
  };
}

export function isPayrollRcbDebugOverlayEnabled(): boolean {
  try {
    return localStorage.getItem(PAYROLL_RCB_DEBUG_LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function getPayrollRcbDebugOverlaySnapshot(): PayrollRcbDebugOverlaySnapshot {
  return snapshot;
}

export function getPayrollRcbDebugTimeline(): readonly PayrollRcbDebugTimelineEntry[] {
  return timeline;
}

export function subscribePayrollRcbDebugOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchPayrollRcbDebugOverlay(
  patch: Partial<PayrollRcbDebugOverlaySnapshot>,
  timelineEvent?: string,
): void {
  if (!isPayrollRcbDebugOverlayEnabled()) return;
  snapshot = { ...snapshot, ...patch, updatedAt: new Date().toISOString() };
  if (timelineEvent) {
    timeline = [...timeline, snapshotToTimelineEntry(timelineEvent)].slice(-TIMELINE_CAP);
  }
  listeners.forEach((listener) => listener());
}
