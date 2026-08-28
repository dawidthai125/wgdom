/**
 * PAYROLL P0 — scoped hours-down intent contract.
 *
 * Proof of hours intent = explicit per-slot mutation verified against
 * canonical cloud baseline (NOT local before→after alone, NOT payrollDomainUserWrite).
 */
import { dayTotalHours, type DayData, type DayKey, type WeekEmployee } from "@/app/app-domain";

export const PAYROLL_HOURS_INTENT_EPS = 0.05;

export type PayrollHoursSlot = DayKey | "prevSaturday";

export type PayrollScopedHoursIntent = {
  weekFrom: string;
  weekTo: string;
  employeeId: string;
  directoryId?: string;
  slot: PayrollHoursSlot;
  /** Claimed baseline hours — must match cloud at guard/Edge time. */
  fromHours: number;
  /** Requested hours after explicit user edit. */
  toHours: number;
};

export type HoursDownSlotFinding = {
  employeeId: string;
  directoryId?: string;
  slot: PayrollHoursSlot;
  cloudHours: number;
  outgoingHours: number;
};

/** Inline day keys — avoid depending on DAYS export at module init (circular SSR). */
const DAY_SLOTS: DayKey[] = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const SLOTS: PayrollHoursSlot[] = [...DAY_SLOTS, "prevSaturday"];

function asEmpList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

function slotDay(emp: WeekEmployee | undefined, slot: PayrollHoursSlot): DayData | undefined {
  if (!emp) return undefined;
  if (slot === "prevSaturday") return emp.prevSaturday;
  return emp.days?.[slot];
}

export function slotHours(emp: WeekEmployee | undefined, slot: PayrollHoursSlot): number {
  const d = slotDay(emp, slot);
  if (!d) return 0;
  return +dayTotalHours(d).toFixed(2);
}

function hoursClose(a: number, b: number, eps = PAYROLL_HOURS_INTENT_EPS): boolean {
  return Math.abs(a - b) <= eps;
}

function normWeekToken(s: string): string {
  return String(s ?? "").trim().replace(/^"|"$/g, "");
}

/** Match cloud emp → outgoing emp (id first, then directoryId). */
export function findMatchingEmployee(
  haystack: WeekEmployee[],
  needle: { id?: string; directoryId?: string },
): WeekEmployee | undefined {
  if (needle.id) {
    const byId = haystack.find((e) => e.id === needle.id);
    if (byId) return byId;
  }
  const dir = typeof needle.directoryId === "string" ? needle.directoryId.trim() : "";
  if (dir) {
    return haystack.find((e) => typeof e.directoryId === "string" && e.directoryId.trim() === dir);
  }
  return undefined;
}

/**
 * Derive scoped intents from a local UI edit (before→after).
 * Guard/Edge still re-verify each intent against cloud baseline.
 */
export function deriveHoursIntentsFromLocalEdit(
  before: unknown,
  after: unknown,
  weekFrom: string,
  weekTo: string,
): PayrollScopedHoursIntent[] {
  const prevList = asEmpList(before);
  const nextList = asEmpList(after);
  const intents: PayrollScopedHoursIntent[] = [];

  for (const next of nextList) {
    if (!next?.id) continue;
    const prev = findMatchingEmployee(prevList, next) ?? prevList.find((e) => e.id === next.id);
    if (!prev) continue; // CREATED — no hours-down vs self
    for (const slot of SLOTS) {
      const fromH = slotHours(prev, slot);
      const toH = slotHours(next, slot);
      if (hoursClose(fromH, toH)) continue;
      intents.push({
        weekFrom,
        weekTo,
        employeeId: next.id,
        directoryId: typeof next.directoryId === "string" ? next.directoryId : undefined,
        slot,
        fromHours: fromH,
        toHours: toH,
      });
    }
  }
  return intents;
}

export function mergeHoursIntents(
  a?: PayrollScopedHoursIntent[] | null,
  b?: PayrollScopedHoursIntent[] | null,
): PayrollScopedHoursIntent[] {
  const out: PayrollScopedHoursIntent[] = [];
  const keyOf = (i: PayrollScopedHoursIntent) =>
    `${i.employeeId}|${i.directoryId ?? ""}|${i.slot}|${i.weekFrom}|${i.weekTo}`;
  const map = new Map<string, PayrollScopedHoursIntent>();
  for (const list of [a ?? [], b ?? []]) {
    for (const intent of list) {
      if (!intent || typeof intent !== "object") continue;
      map.set(keyOf(intent), intent);
    }
  }
  for (const v of map.values()) out.push(v);
  return out;
}

export function normalizeHoursIntents(raw: unknown): PayrollScopedHoursIntent[] {
  if (!Array.isArray(raw)) return [];
  const out: PayrollScopedHoursIntent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const slot = o.slot;
    if (slot !== "prevSaturday" && !DAY_SLOTS.includes(slot as DayKey)) continue;
    const employeeId = typeof o.employeeId === "string" ? o.employeeId : "";
    if (!employeeId) continue;
    const fromHours = Number(o.fromHours);
    const toHours = Number(o.toHours);
    if (!Number.isFinite(fromHours) || !Number.isFinite(toHours)) continue;
    const weekFrom = typeof o.weekFrom === "string" ? o.weekFrom : "";
    const weekTo = typeof o.weekTo === "string" ? o.weekTo : "";
    out.push({
      weekFrom,
      weekTo,
      employeeId,
      directoryId: typeof o.directoryId === "string" ? o.directoryId : undefined,
      slot: slot as PayrollHoursSlot,
      fromHours,
      toHours,
    });
  }
  return out;
}

function intentCoversDown(
  intent: PayrollScopedHoursIntent,
  finding: HoursDownSlotFinding,
  weekFrom: string,
  weekTo: string,
): boolean {
  if (intent.slot !== finding.slot) return false;
  const wf = normWeekToken(weekFrom);
  const wt = normWeekToken(weekTo);
  const iWf = normWeekToken(intent.weekFrom);
  const iWt = normWeekToken(intent.weekTo);
  if (wf && iWf && iWf !== wf) return false;
  if (wt && iWt && iWt !== wt) return false;
  const idOk =
    intent.employeeId === finding.employeeId
    || (!!intent.directoryId
      && !!finding.directoryId
      && intent.directoryId === finding.directoryId);
  if (!idOk) return false;
  // Baseline MUST match cloud — local-only fromHours is rejected here.
  if (!hoursClose(intent.fromHours, finding.cloudHours)) return false;
  if (!hoursClose(intent.toHours, finding.outgoingHours)) return false;
  return true;
}

/** Hours-down slots for employees present in both cloud and outgoing. */
export function listUnauthorizedHoursDownSlots(
  cloud: unknown,
  outgoing: unknown,
  intents: PayrollScopedHoursIntent[],
  weekFrom = "",
  weekTo = "",
): HoursDownSlotFinding[] {
  const cloudList = asEmpList(cloud);
  const outList = asEmpList(outgoing);
  const unauthorized: HoursDownSlotFinding[] = [];

  for (const cEmp of cloudList) {
    if (!cEmp?.id) continue;
    const oEmp = findMatchingEmployee(outList, cEmp);
    if (!oEmp) continue; // removed — not a day-level stale write
    for (const slot of SLOTS) {
      const cloudH = slotHours(cEmp, slot);
      const outH = slotHours(oEmp, slot);
      if (cloudH <= PAYROLL_HOURS_INTENT_EPS) continue;
      if (outH + PAYROLL_HOURS_INTENT_EPS >= cloudH) continue;
      const finding: HoursDownSlotFinding = {
        employeeId: cEmp.id,
        directoryId: typeof cEmp.directoryId === "string" ? cEmp.directoryId : undefined,
        slot,
        cloudHours: cloudH,
        outgoingHours: outH,
      };
      const covered = intents.some((i) => intentCoversDown(i, finding, weekFrom, weekTo));
      if (!covered) unauthorized.push(finding);
    }
  }
  return unauthorized;
}

function cloneDay(d: DayData | undefined): DayData | undefined {
  if (!d) return undefined;
  return JSON.parse(JSON.stringify(d)) as DayData;
}

/**
 * Constrain outgoing hours-down to verified intents only.
 * Unauthorized slots are restored from cloud (stale loss cannot persist).
 */
export function sanitizeRosterHoursToAuthorizedIntents(
  cloud: unknown,
  outgoing: unknown,
  intents: PayrollScopedHoursIntent[],
  weekFrom = "",
  weekTo = "",
): { sanitized: WeekEmployee[]; unauthorized: HoursDownSlotFinding[]; changed: boolean } {
  const unauthorized = listUnauthorizedHoursDownSlots(cloud, outgoing, intents, weekFrom, weekTo);
  const cloudList = asEmpList(cloud);
  const outList = asEmpList(outgoing);
  if (unauthorized.length === 0) {
    return { sanitized: outList, unauthorized, changed: false };
  }

  const sanitized = outList.map((emp) => JSON.parse(JSON.stringify(emp)) as WeekEmployee);
  let changed = false;

  for (const finding of unauthorized) {
    const cEmp = findMatchingEmployee(cloudList, {
      id: finding.employeeId,
      directoryId: finding.directoryId,
    });
    const oEmp = findMatchingEmployee(sanitized, {
      id: finding.employeeId,
      directoryId: finding.directoryId,
    });
    if (!cEmp || !oEmp) continue;
    const cloudSlot = slotDay(cEmp, finding.slot);
    if (finding.slot === "prevSaturday") {
      oEmp.prevSaturday = cloneDay(cloudSlot) as DayData;
    } else {
      oEmp.days = { ...oEmp.days, [finding.slot]: cloneDay(cloudSlot) as DayData };
    }
    changed = true;
  }

  return { sanitized, unauthorized, changed };
}

/**
 * True when every hours-down vs cloud is covered by a verified intent
 * (or there is no hours-down).
 */
export function isHoursDownFullyAuthorized(
  cloud: unknown,
  outgoing: unknown,
  intents: PayrollScopedHoursIntent[],
  weekFrom = "",
  weekTo = "",
): boolean {
  return listUnauthorizedHoursDownSlots(cloud, outgoing, intents, weekFrom, weekTo).length === 0;
}

/** Verified full-week clear: intentional clear + empty outgoing roster. */
export function isVerifiedEmptyRosterClear(
  outgoing: unknown,
  intentionalHoursClear: boolean,
): boolean {
  return intentionalHoursClear === true && asEmpList(outgoing).length === 0;
}
