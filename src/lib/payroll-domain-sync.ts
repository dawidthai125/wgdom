/**
 * SYNC-ARCH-01 S2 — debounced domain push mutacji Payroll (godziny, stawki, koszty).
 * RS push nie obejmuje payroll; każda mutacja kw-week-employees kończy się pwrPush.
 */

import type { WeekEmployee } from "@/app/app-domain";
import { emitPayrollWritePathTelemetry } from "@/lib/payroll-write-path-telemetry";

/** Debounce edycji pól — scala szybkie zmiany przed jednym batch-set. */
export const PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS = 1000;

export type PayrollDomainPushHandler = (roster: WeekEmployee[]) => void;

let pushHandler: PayrollDomainPushHandler | null = null;
let pendingRoster: WeekEmployee[] | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function bindPayrollDomainPushHandler(handler: PayrollDomainPushHandler): void {
  pushHandler = handler;
}

export function unbindPayrollDomainPushHandler(): void {
  cancelPayrollDomainPush();
  pushHandler = null;
}

export function schedulePayrollDomainPush(roster: WeekEmployee[]): void {
  pendingRoster = roster;
  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flushPayrollDomainPush();
  }, PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS);
}

export function cancelPayrollDomainPush(): void {
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingRoster = null;
}

/** Natychmiastowy push (testy / flush przed unload). */
export function flushPayrollDomainPush(): void {
  if (!pushHandler || pendingRoster == null) return;
  const roster = pendingRoster;
  pendingRoster = null;
  // D1 passive — telemetry only; does not alter handler / roster
  try {
    let weekFrom = "";
    let weekTo = "";
    try {
      weekFrom = localStorage.getItem("kw-weekFrom") || "";
      weekTo = localStorage.getItem("kw-weekTo") || "";
    } catch { /* ignore */ }
    emitPayrollWritePathTelemetry({
      source: "domain_push_flush",
      weekFrom,
      weekTo,
      rosterAfter: roster,
    });
  } catch { /* ignore */ }
  pushHandler(roster);
}

export function hasPendingPayrollDomainPush(): boolean {
  return pendingRoster != null;
}
