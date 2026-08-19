/**
 * PAYROLL-P0-REGRESSION-04 — mount lifecycle + PAYROLL-ROLL-001
 * Run: npx vite-node scripts/test-payroll-display-p0-regression-04.mjs
 *
 * Bootstrap label race (stored week archived, but live roster no longer mirrors it):
 * align labels, NO clear.
 * Real rollover (stored week NOT archived): autoArchiveAndAdvance (clear).
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { resolvePayrollDisplayEmployees } from "../src/lib/payroll-display.ts";
import {
  getPayrollWeekRange,
  isPayrollCalendarBehind,
  isPayrollWeekClosedForUi,
  classifyPayrollWeekTransition,
  PAYROLL_ROLL_001,
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
 * Pure SSOT of tryPayrollWeekCycle PAYROLL-ROLL-001 (no React).
 */
function simulateTryPayrollWeekCycleMount(weekFrom, weekTo, weekEmployees, now, savedWeeks = []) {
  const transition = classifyPayrollWeekTransition(
    weekFrom,
    weekTo,
    weekEmployees,
    savedWeeks,
    now,
  );
  if (transition.kind === "align") {
    return {
      action: "align_defer_rollover",
      weekFrom: transition.from,
      weekTo: transition.to,
      weekEmployees,
      cleared: false,
      reason: transition.reason,
    };
  }
  const onCurrentRange = !isPayrollCalendarBehind(weekFrom, weekTo, now);
  if (!onCurrentRange || transition.kind === "rollover") {
    return {
      action: "auto_archive_and_advance",
      weekFrom,
      weekTo,
      weekEmployees: [],
      cleared: weekEmployees.length > 0,
      reason: transition.reason,
    };
  }
  return {
    action: "on_current",
    weekFrom,
    weekTo,
    weekEmployees,
    cleared: false,
    reason: transition.reason,
  };
}

assert("principle id", PAYROLL_ROLL_001 === "PAYROLL-ROLL-001");

// R1 — bootstrap-like: prev week ALREADY archived → align, keep 14
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const archivedRoster = Array.from({ length: 14 }, (_, i) => makeEmp(`e-${i}`));
  const roster = archivedRoster.map((emp) => ({
    ...emp,
    days: Object.fromEntries(DAYS.map((k) => [k, defaultDay()])),
  }));
  const archive = [
    {
      id: "snap-prev",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: archivedRoster.map((e) => ({ ...e })),
      savedAt: "2026-07-12T18:00:00.000Z",
    },
  ];

  const legacy = simulateTryPayrollWeekCycleMount(prev.from, prev.to, roster, mondayNewWeek, archive);
  assert("R1 action align_defer_rollover", legacy.action === "align_defer_rollover");
  assert("R1 not cleared", legacy.cleared === false);
  assert("R1 roster stays 14", legacy.weekEmployees.length === 14);
  assert("R1 keys → current from", legacy.weekFrom === current.from);
  assert("R1 keys → current to", legacy.weekTo === current.to);
  assert("R1 reason bootstrap_align", legacy.reason === "bootstrap_align_stored_week_archived");

  const afterAlign = simulateTryPayrollWeekCycleMount(
    legacy.weekFrom,
    legacy.weekTo,
    legacy.weekEmployees,
    mondayNewWeek,
    archive,
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

// R1b — stored week archived and live roster still mirrors it → real rollover clears
{
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`r-${i}`));
  const archive = [
    {
      id: "snap-prev-r",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-12T18:00:00.000Z",
    },
  ];
  const result = simulateTryPayrollWeekCycleMount(prev.from, prev.to, roster, mondayNewWeek, archive);
  assert("R1b action auto_archive_and_advance", result.action === "auto_archive_and_advance");
  assert("R1b cleared", result.cleared === true);
  assert("R1b roster empty after", result.weekEmployees.length === 0);
  assert("R1b reason historical_live_roster", result.reason === "stored_week_archived_live_roster_still_historical");
}

// R2 — empty roster + behind → rollover still allowed
{
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const result = simulateTryPayrollWeekCycleMount(prev.from, prev.to, [], mondayNewWeek, []);
  assert("R2 empty → auto_archive_and_advance", result.action === "auto_archive_and_advance");
  assert("R2 cleared flag false when already empty", result.cleared === false);
}

// R3 — already current @14 → no align, no clear
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`c-${i}`));
  const result = simulateTryPayrollWeekCycleMount(current.from, current.to, roster, mondayNewWeek, []);
  assert("R3 on_current", result.action === "on_current");
  assert("R3 stays 14", result.weekEmployees.length === 14);
}

console.log(`\nPAYROLL-P0-REGRESSION-04: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
