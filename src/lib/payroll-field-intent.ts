/**
 * PAYROLL P2 — field-level intent contract for stale-client write safety.
 *
 * Rule: only fields the user changed in the current action (before→after),
 * and whose baseline matches canonical cloud, may overwrite cloud.
 * Everything else stays canonical — including hours-UP without verified intent.
 *
 * Membership (aligned with P1):
 * - REMOTE DELETE ghost (in before+after, absent from cloud) → drop
 * - Legal ADD (in after, absent from before+cloud) → keep after record
 * - Intentional REMOVE (in before+cloud, absent from after) → drop
 * - Remote ADD (in cloud, absent from before+after) → keep canonical
 */

import {
  dayTotalHours,
  type DayData,
  type DayKey,
  type WeekEmployee,
} from "@/app/app-domain";
import {
  findMatchingEmployee,
  normalizeHoursIntents,
  PAYROLL_HOURS_INTENT_EPS,
  slotHours,
  type PayrollHoursSlot,
  type PayrollScopedHoursIntent,
} from "@/lib/payroll-hours-intent";
import { applyEarlyPayoutFieldIntent } from "@/lib/payroll-early-payout";
import { applySettlementFieldIntent } from "@/lib/payroll-settlement";
import { resolveUnresolvedSettlementAckEmpIds } from "@/lib/payroll-settlement-cloud-ack";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";
import { resolvePayrollPendingAddKeys } from "@/lib/payroll-pending-add-intent";

const DAY_SLOTS: DayKey[] = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const SLOTS: PayrollHoursSlot[] = [...DAY_SLOTS, "prevSaturday"];

function asEmpList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

function hoursClose(a: number, b: number, eps = PAYROLL_HOURS_INTENT_EPS): boolean {
  return Math.abs(a - b) <= eps;
}

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function slotDay(emp: WeekEmployee | undefined, slot: PayrollHoursSlot): DayData | undefined {
  if (!emp) return undefined;
  if (slot === "prevSaturday") return emp.prevSaturday;
  return emp.days?.[slot];
}

function setSlotDay(emp: WeekEmployee, slot: PayrollHoursSlot, day: DayData | undefined): void {
  if (slot === "prevSaturday") {
    emp.prevSaturday = day as DayData;
    return;
  }
  emp.days = { ...(emp.days || {}), [slot]: day as DayData };
}

function ratesEqual(a: unknown, b: unknown): boolean {
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function extraCostsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

function dayEqual(a: DayData | undefined, b: DayData | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function intentCoversSlot(
  intent: PayrollScopedHoursIntent,
  emp: WeekEmployee,
  slot: PayrollHoursSlot,
  cloudH: number,
  toH: number,
  weekFrom: string,
  weekTo: string,
): boolean {
  if (intent.slot !== slot) return false;
  const wf = String(weekFrom ?? "").trim();
  const wt = String(weekTo ?? "").trim();
  if (wf && intent.weekFrom && String(intent.weekFrom).trim() !== wf) return false;
  if (wt && intent.weekTo && String(intent.weekTo).trim() !== wt) return false;
  const idOk =
    intent.employeeId === emp.id
    || (!!intent.directoryId
      && !!emp.directoryId
      && intent.directoryId === emp.directoryId);
  if (!idOk) return false;
  if (!hoursClose(intent.fromHours, cloudH)) return false;
  if (!hoursClose(intent.toHours, toH)) return false;
  return true;
}

export type PayrollFieldIntentApplyResult = {
  roster: WeekEmployee[];
  changed: boolean;
};

/** GO8.2 — match ACK empIds against any identity the record carries. */
function hasUnresolvedSettlementAck(
  ackEmpIds: Set<string>,
  emps: Array<{ id?: string } | undefined>,
): boolean {
  if (ackEmpIds.size === 0) return false;
  for (const emp of emps) {
    const id = String(emp?.id ?? "").trim();
    if (id && ackEmpIds.has(id)) return true;
  }
  return false;
}

/**
 * Apply verified field intents onto one cloud employee using before→after.
 */
function applyFieldsOntoCloudEmp(
  cloudEmp: WeekEmployee,
  beforeEmp: WeekEmployee | undefined,
  afterEmp: WeekEmployee | undefined,
  hoursIntents: PayrollScopedHoursIntent[],
  weekFrom: string,
  weekTo: string,
  ackEmpIds: Set<string>,
): { emp: WeekEmployee; changed: boolean } {
  const next = cloneJson(cloudEmp);
  let changed = false;

  if (afterEmp) {
    next.id = afterEmp.id;
    if (afterEmp.directoryId) next.directoryId = afterEmp.directoryId;
  }

  // --- Rate ---
  if (afterEmp && beforeEmp) {
    const rateEdited =
      !ratesEqual(beforeEmp.rate, afterEmp.rate)
      || String(beforeEmp.rateUpdatedAt ?? "") !== String(afterEmp.rateUpdatedAt ?? "");
    if (rateEdited && ratesEqual(beforeEmp.rate, cloudEmp.rate)) {
      next.rate = afterEmp.rate;
      next.rateUpdatedAt = afterEmp.rateUpdatedAt ?? next.rateUpdatedAt;
      if (!ratesEqual(next.rate, cloudEmp.rate)) changed = true;
    }
  }

  // --- ExtraCosts (P2 baseline vs cloud — same contract as rate / MA / settlement) ---
  {
    const beforeCosts = beforeEmp?.extraCosts;
    const afterCosts = afterEmp?.extraCosts;
    const cloudCosts = cloudEmp.extraCosts;
    const costsEdited =
      !!beforeEmp
      && !!afterEmp
      && !extraCostsEqual(beforeCosts, afterCosts);
    const baselineOk = !!beforeEmp && extraCostsEqual(beforeCosts, cloudCosts);
    if (costsEdited && baselineOk) {
      next.extraCosts = cloneJson(afterCosts ?? []);
      next.dataUpdatedAt = afterEmp.dataUpdatedAt ?? next.dataUpdatedAt;
      if (!extraCostsEqual(next.extraCosts, cloudCosts)) changed = true;
    } else {
      next.extraCosts = cloneJson(cloudCosts ?? []);
      if (costsEdited) changed = true;
    }
  }

  // --- Manual payroll adjustment (own updatedAt; never via dataUpdatedAt) ---
  {
    const beforeAdj = beforeEmp?.payrollManualAdjustment;
    const afterAdj = afterEmp?.payrollManualAdjustment;
    const cloudAdj = cloudEmp.payrollManualAdjustment;
    const adjEdited =
      !!beforeEmp
      && !!afterEmp
      && JSON.stringify(beforeAdj ?? null) !== JSON.stringify(afterAdj ?? null);
    const beforeAmt = typeof beforeAdj?.amount === "number" ? beforeAdj.amount : 0;
    const cloudAmt = typeof cloudAdj?.amount === "number" ? cloudAdj.amount : 0;
    const baselineOk = Math.abs(beforeAmt - cloudAmt) < 0.001
      && String(beforeAdj?.updatedAt ?? "") === String(cloudAdj?.updatedAt ?? "");
    if (adjEdited && baselineOk) {
      next.payrollManualAdjustment = afterAdj ? cloneJson(afterAdj) : undefined;
      if (JSON.stringify(next.payrollManualAdjustment ?? null) !== JSON.stringify(cloudAdj ?? null)) {
        changed = true;
      }
    } else {
      next.payrollManualAdjustment = cloudAdj ? cloneJson(cloudAdj) : undefined;
      if (adjEdited) changed = true;
    }
  }

  // --- Day slots / hours ---
  for (const slot of SLOTS) {
    const cloudH = slotHours(cloudEmp, slot);
    const afterH = afterEmp ? slotHours(afterEmp, slot) : cloudH;
    const beforeH = beforeEmp ? slotHours(beforeEmp, slot) : afterH;
    const afterDay = afterEmp ? slotDay(afterEmp, slot) : undefined;
    const cloudDay = slotDay(cloudEmp, slot);
    const slotEdited =
      !!beforeEmp && !!afterEmp && !dayEqual(slotDay(beforeEmp, slot), afterDay);

    const coveredByIntent =
      !!afterEmp
      && hoursIntents.some((i) =>
        intentCoversSlot(i, afterEmp, slot, cloudH, afterH, weekFrom, weekTo),
      );

    const localHoursIntentOk =
      !!beforeEmp
      && !!afterEmp
      && !hoursClose(beforeH, afterH)
      && hoursClose(beforeH, cloudH);

    const hoursUnchangedLocal = hoursClose(beforeH, afterH);
    const baselineMatchesCloud = hoursClose(beforeH, cloudH);

    let useAfterDay = false;
    if (coveredByIntent || localHoursIntentOk) {
      useAfterDay = true;
    } else if (slotEdited && hoursUnchangedLocal && baselineMatchesCloud) {
      useAfterDay = true;
    }

    if (useAfterDay && afterDay) {
      setSlotDay(next, slot, cloneJson(afterDay));
      if (!dayEqual(afterDay, cloudDay)) changed = true;
    } else {
      setSlotDay(next, slot, cloudDay ? cloneJson(cloudDay) : cloudDay);
      if (afterEmp && (slotEdited || !hoursClose(afterH, cloudH))) changed = true;
    }
  }

  next.payrollCarryForward = cloudEmp.payrollCarryForward;

  // --- Settlement (settled + settledUpdatedAt + payrollSettlement atomic; own clock) ---
  {
    const s = applySettlementFieldIntent(cloudEmp, beforeEmp, afterEmp, {
      unresolvedCloudAck: hasUnresolvedSettlementAck(ackEmpIds, [cloudEmp, afterEmp, beforeEmp]),
    });
    next.settled = s.settled;
    next.settledUpdatedAt = s.settledUpdatedAt;
    next.payrollSettlement = s.payrollSettlement;
    if (s.changed) changed = true;
  }

  // --- Early payouts (transaction merge; own updatedAt / deletedAt) ---
  {
    const ep = applyEarlyPayoutFieldIntent(
      cloudEmp.payrollEarlyPayouts,
      beforeEmp?.payrollEarlyPayouts,
      afterEmp?.payrollEarlyPayouts,
    );
    next.payrollEarlyPayouts = ep.list.length ? ep.list : undefined;
    if (ep.changed) changed = true;
  }

  return { emp: next, changed };
}

/**
 * Build outgoing roster = canonical cloud + only verified field / membership intents.
 */
export function applyPayrollFieldIntentsOntoCanonical(
  cloud: unknown,
  intentBefore: unknown | undefined,
  outgoing: unknown,
  hoursIntentsRaw: unknown,
  weekFrom = "",
  weekTo = "",
  pendingAddMergeKeys?: Set<string>,
  unresolvedSettlementAckEmpIds?: Set<string>,
): PayrollFieldIntentApplyResult {
  const cloudList = asEmpList(cloud);
  const beforeList = intentBefore === undefined ? null : asEmpList(intentBefore);
  const outList = asEmpList(outgoing);
  const hoursIntents = normalizeHoursIntents(hoursIntentsRaw);
  // GO8.2 — ACK ledger read once here (orchestrating layer); settlement stays pure.
  const ackEmpIds = resolveUnresolvedSettlementAckEmpIds(
    unresolvedSettlementAckEmpIds,
    weekFrom,
    weekTo,
  );

  if (outList.length === 0 && cloudList.length === 0) {
    return { roster: outList, changed: false };
  }

  let changed = false;
  const roster: WeekEmployee[] = [];
  const consumedAfterKeys = new Set<WeekEmployee>();

  // 1) Canonical employees — apply intents or keep; honor intentional REMOVE.
  for (const cloudEmp of cloudList) {
    const afterEmp =
      findMatchingEmployee(outList, cloudEmp)
      ?? outList.find((e) => e.id === cloudEmp.id);
    const beforeEmp = beforeList
      ? findMatchingEmployee(beforeList, cloudEmp)
        ?? beforeList.find((e) => e.id === cloudEmp.id)
      : undefined;

    // Intentional REMOVE: was local before, absent from after.
    if (beforeList && beforeEmp && !afterEmp) {
      changed = true;
      continue;
    }

    if (afterEmp) consumedAfterKeys.add(afterEmp);

    const applied = applyFieldsOntoCloudEmp(
      cloudEmp,
      beforeEmp,
      afterEmp,
      hoursIntents,
      weekFrom,
      weekTo,
      ackEmpIds,
    );
    if (applied.changed) changed = true;
    roster.push(applied.emp);
  }

  // 2) Outgoing-only rows — legal ADD (absent from before) or pending ADD intent.
  // P2.4 tomb vs ADD is decided in sanitizeStaleRosterMembership / filterDeleted.
  const pendingAdds = resolvePayrollPendingAddKeys(pendingAddMergeKeys);
  for (const afterEmp of outList) {
    if (consumedAfterKeys.has(afterEmp)) continue;
    if (findMatchingEmployee(cloudList, afterEmp)) continue; // already handled

    const pendingAdd = pendingAdds.has(weekEmployeeMergeKey(afterEmp));
    if (pendingAdd) {
      roster.push(cloneJson(afterEmp));
      changed = true;
      continue;
    }

    if (beforeList == null) {
      // No membership baseline → fail-closed (same as P1 sanitize).
      changed = true;
      continue;
    }
    const wasInBefore = !!findMatchingEmployee(beforeList, afterEmp);
    if (!wasInBefore) {
      roster.push(cloneJson(afterEmp));
      changed = true;
      continue;
    }
    // before+after, missing from cloud, no pending ADD → remote DELETE ghost
    changed = true;
  }

  if (!changed && JSON.stringify(roster) !== JSON.stringify(outList)) changed = true;

  return { roster, changed };
}

/**
 * P2 rebase after 409 — same contract as pre-push sanitize (canonical + field intents).
 */
export function rebasePayrollFieldIntents(
  canonical: WeekEmployee[],
  before: WeekEmployee[],
  after: WeekEmployee[],
  hoursIntents?: PayrollScopedHoursIntent[] | null,
  weekFrom = "",
  weekTo = "",
  pendingAddMergeKeys?: Set<string>,
  unresolvedSettlementAckEmpIds?: Set<string>,
): WeekEmployee[] {
  return applyPayrollFieldIntentsOntoCanonical(
    canonical,
    before,
    after,
    hoursIntents ?? [],
    weekFrom,
    weekTo,
    pendingAddMergeKeys,
    unresolvedSettlementAckEmpIds,
  ).roster;
}

/** @internal test helper — slot hours via dayTotalHours for fixtures. */
export function p2SlotHoursForTest(emp: WeekEmployee, slot: PayrollHoursSlot): number {
  return slotHours(emp, slot);
}

export function p2DayTotalHoursForTest(d: DayData | undefined): number {
  if (!d) return 0;
  return +dayTotalHours(d).toFixed(2);
}
