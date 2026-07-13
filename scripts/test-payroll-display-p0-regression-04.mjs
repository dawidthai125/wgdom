/**
 * PAYROLL-P0-REGRESSION-04 — mount lifecycle: no setWeekEmployees([]) before key align
 * Run: npx vite-node scripts/test-payroll-display-p0-regression-04.mjs
 *
 * Models App.tryPayrollWeekCycle guard:
 *   resolvePayrollOperationalWeekKeys → didAlign → align + return (NO autoArchiveAndAdvance)
 * Then productionWeekEmployees / display stay 14 without pull.
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { resolvePayrollDisplayEmployees } from "../src/lib/payroll-display.ts";
import {
  getPayrollWeekRange,
  isPayrollCalendarBehind,
  isPayrollWeekClosedForUi,
  resolvePayrollOperationalWeekKeys,
} from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const mondayNewWeek = new Date("2026-07-13T10:00:00");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function makeEmp(id) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((k) => [k, k === "So" ? defaultDay() : { ...defaultDay(), active: true, from: "07:00", to: "16:00" }]),
    ),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

/**
 * Pure SSOT of tryPayrollWeekCycle REGRESSION-04 guard (no React).
 * Returns whether rollover/clear would run.
 */
function simulateTryPayrollWeekCycleMount(weekFrom, weekTo, weekEmployees, now) {
  const keyAlign = resolvePayrollOperationalWeekKeys(weekFrom, weekTo, weekEmployees.length, now);
  if (keyAlign.didAlign) {
    return {
      action: "align_defer_rollover",
      weekFrom: keyAlign.from,
      weekTo: keyAlign.to,
      weekEmployees,
      cleared: false,
    };
  }
  const onCurrentRange = !isPayrollCalendarBehind(weekFrom, weekTo, now);
  if (!onCurrentRange) {
    return {
      action: "auto_archive_and_advance",
      weekFrom,
      weekTo,
      weekEmployees: [],
      cleared: weekEmployees.length > 0,
    };
  }
  return {
    action: "on_current",
    weekFrom,
    weekTo,
    weekEmployees,
    cleared: false,
  };
}

// R1 — bootstrap-like: prev@14 after CloudLoader → mount cycle must NOT clear
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`e-${i}`));

  const legacy = simulateTryPayrollWeekCycleMount(prev.from, prev.to, roster, mondayNewWeek);
  // Without guard, calendar behind + 14 would clear — with guard we align
  assert("R1 action align_defer_rollover", legacy.action === "align_defer_rollover");
  assert("R1 not cleared", legacy.cleared === false);
  assert("R1 roster stays 14", legacy.weekEmployees.length === 14);
  assert("R1 keys → current from", legacy.weekFrom === current.from);
  assert("R1 keys → current to", legacy.weekTo === current.to);

  const afterAlign = simulateTryPayrollWeekCycleMount(
    legacy.weekFrom,
    legacy.weekTo,
    legacy.weekEmployees,
    mondayNewWeek,
  );
  assert("R1 second tick on_current", afterAlign.action === "on_current");
  assert("R1 second tick still 14", afterAlign.weekEmployees.length === 14);

  const isClosed = isPayrollWeekClosedForUi(legacy.weekFrom, legacy.weekTo, false, mondayNewWeek);
  const display = resolvePayrollDisplayEmployees(
    isClosed,
    legacy.weekEmployees,
    null,
    legacy.weekFrom,
    legacy.weekTo,
    { productionWeekEmployeesLength: 14 },
  );
  assert("R1 productionWeekEmployees=14 (topbar/KPI)", legacy.weekEmployees.length === 14);
  assert("R1 displayEmployees=14 (tabela) without pull", display.length === 14);
}

// R2 — empty roster + behind → rollover still allowed (autoArchive semantics untouched)
{
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const result = simulateTryPayrollWeekCycleMount(prev.from, prev.to, [], mondayNewWeek);
  assert("R2 empty → auto_archive_and_advance", result.action === "auto_archive_and_advance");
  assert("R2 cleared flag false when already empty", result.cleared === false);
}

// R3 — already current @14 → no align, no clear
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`c-${i}`));
  const result = simulateTryPayrollWeekCycleMount(current.from, current.to, roster, mondayNewWeek);
  assert("R3 on_current", result.action === "on_current");
  assert("R3 stays 14", result.weekEmployees.length === 14);
}

console.log(`\nPAYROLL-P0-REGRESSION-04: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
