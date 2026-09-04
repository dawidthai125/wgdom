/**
 * SYNC-ARCH-01 S2 — debounced domain push mutacji Payroll (godziny, stawki, koszty).
 * RS push nie obejmuje payroll; każda mutacja kw-week-employees kończy się pwrPush.
 *
 * GO3: settlement-bearing pending must not be silently cancelled (LS≠cloud).
 */

import type { WeekEmployee } from "@/app/app-domain";
import type { PushWeekEmployeesOptions } from "@/lib/cloud-sync";
import { emitPayrollWritePathTelemetry } from "@/lib/payroll-write-path-telemetry";
import { mergeHoursIntents } from "@/lib/payroll-hours-intent";
import { unionRosterWithPendingAdds } from "@/lib/payroll-pending-add-intent";

/** Debounce edycji pól — scala szybkie zmiany przed jednym batch-set. */
export const PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS = 1000;

export type PayrollDomainPushHandler = (
  roster: WeekEmployee[],
  options?: PushWeekEmployeesOptions,
  rosterBefore?: WeekEmployee[],
) => void;

let pushHandler: PayrollDomainPushHandler | null = null;
let pendingRoster: WeekEmployee[] | null = null;
let pendingRosterBefore: WeekEmployee[] | undefined;
let pendingOptions: PushWeekEmployeesOptions | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function stickySettlementCloudAck(
  next?: PushWeekEmployeesOptions,
  prev?: PushWeekEmployeesOptions,
): true | undefined {
  return next?.settlementCloudAck === true || prev?.settlementCloudAck === true
    ? true
    : undefined;
}

export function bindPayrollDomainPushHandler(handler: PayrollDomainPushHandler): void {
  pushHandler = handler;
}

export function unbindPayrollDomainPushHandler(): void {
  cancelPayrollDomainPush();
  pushHandler = null;
}

/**
 * @param rosterAfter — roster po edycji
 * @param options — D2/D3 push options (intentionalHoursClear) + scoped hoursIntents
 * @param rosterBefore — pre-edit snapshot for D2 domain gate (captured at schedule, not flush)
 */
export function schedulePayrollDomainPush(
  roster: WeekEmployee[],
  options?: PushWeekEmployeesOptions,
  rosterBefore?: WeekEmployee[],
): void {
  pendingRoster = roster;
  // Keep earliest baseline in debounce window (partial wipe across rapid edits)
  if (rosterBefore !== undefined && pendingRosterBefore === undefined) {
    pendingRosterBefore = rosterBefore;
  }
  const mergedIntents = mergeHoursIntents(pendingOptions?.hoursIntents, options?.hoursIntents);
  const settlementCloudAck = stickySettlementCloudAck(options, pendingOptions);
  // Sticky intentionalHoursClear once ACK'd in this debounce window
  if (options?.intentionalHoursClear === true || pendingOptions?.intentionalHoursClear === true) {
    pendingOptions = {
      intentionalHoursClear: true,
      skipPayrollGuard: true,
      hoursIntents: mergedIntents.length > 0 ? mergedIntents : undefined,
      settlementCloudAck,
    };
  } else {
    pendingOptions = {
      ...(options ?? {}),
      hoursIntents: mergedIntents.length > 0 ? mergedIntents : options?.hoursIntents,
      settlementCloudAck,
    };
  }
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
  pendingRosterBefore = undefined;
  pendingOptions = undefined;
}

/**
 * GO3 + confirmed day-OFF safety — on resume/bfcache: never silently drop a
 * pending Payroll domain push (hours OFF/ON, settlement, combined roster).
 *
 * Flushes any pending mutation through the existing domain-push handler
 * (pwrPush / CAS / Guard). No pending → no-op.
 *
 * Prior behaviour flushed only `settlementCloudAck` and cancelled ordinary
 * hours intents — confirmed OFF could vanish during the 1s debounce when
 * focus/visibility/pageshow ran `requestCloudFreshnessOnResume`.
 */
export function cancelPayrollDomainPushPreservingSettlement(): void {
  if (pendingRoster != null) {
    flushPayrollDomainPush();
  }
}

/** Natychmiastowy push (testy / flush przed unload / background). */
export function flushPayrollDomainPush(): void {
  if (!pushHandler || pendingRoster == null) return;
  const roster = unionRosterWithPendingAdds(pendingRoster) as WeekEmployee[];
  const options = pendingOptions;
  const rosterBefore = pendingRosterBefore;
  pendingRoster = null;
  pendingOptions = undefined;
  pendingRosterBefore = undefined;
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
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
      rosterBefore,
      rosterAfter: roster,
      intentionalHoursClear: options?.intentionalHoursClear,
      skipPayrollGuard: options?.skipPayrollGuard,
    });
  } catch { /* ignore */ }
  pushHandler(roster, options, rosterBefore);
}

/** GO3 — pagehide / visibility hidden: flush pending domain push if any. */
export function flushPayrollDomainPushOnBackground(): boolean {
  if (pendingRoster == null) return false;
  flushPayrollDomainPush();
  return true;
}

export function hasPendingPayrollDomainPush(): boolean {
  return pendingRoster != null;
}

export function peekPendingPayrollDomainPushSettlementAck(): boolean {
  return pendingOptions?.settlementCloudAck === true;
}

/** Test helper — inspect debounce pending without flushing. */
export function __testPeekPayrollDomainPushPending(): {
  hasPending: boolean;
  settlementCloudAck: boolean;
  rosterCount: number;
} {
  return {
    hasPending: pendingRoster != null,
    settlementCloudAck: pendingOptions?.settlementCloudAck === true,
    rosterCount: pendingRoster?.length ?? 0,
  };
}
