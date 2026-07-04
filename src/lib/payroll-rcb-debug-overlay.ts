/** RC-B — tymczasowy overlay diagnostyczny (usunąć po zamknięciu RC-B). */

export const PAYROLL_RCB_DEBUG_LS_KEY = "wgdom-payroll-rcb-debug";

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

let snapshot: PayrollRcbDebugOverlaySnapshot = {};
const listeners = new Set<() => void>();

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

export function subscribePayrollRcbDebugOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchPayrollRcbDebugOverlay(patch: Partial<PayrollRcbDebugOverlaySnapshot>): void {
  if (!isPayrollRcbDebugOverlayEnabled()) return;
  snapshot = { ...snapshot, ...patch, updatedAt: new Date().toISOString() };
  listeners.forEach((listener) => listener());
}
