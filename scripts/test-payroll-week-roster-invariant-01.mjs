/**
 * PAYROLL-WEEK-ROSTER-INVARIANT-01 — D-F3 fence + D-F4 intentional clear semantics
 * Run: npx vite-node scripts/test-payroll-week-roster-invariant-01.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { mergeWeekEmployeesList } from "../src/lib/payroll-week-employee-merge.ts";
import {
  liveRosterHasPositiveHours,
  liveRosterTotalHours,
  mayPersistPayrollRosterUnderWeekKeys,
  rosterOverlapsArchivedHistorical,
  PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON,
} from "../src/lib/payroll-week-roster-binding.ts";
import { getPayrollWeekRange } from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

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

function makeEmp(id, withHours = true) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((k) => [
        k,
        k === "So" || !withHours
          ? defaultDay()
          : { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
      ]),
    ),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

/** Pure D-F4 Edge semantics: intentional clear skips union. */
function applyCasWrite(prev, next, intentionalHoursClear) {
  if (intentionalHoursClear === true) return next;
  return mergeWeekEmployeesList(prev, next, (a, b) => b ?? a);
}

const now = new Date("2026-08-24T10:00:00");
const current = getPayrollWeekRange(now);
const prev = { from: "2026-08-17", to: "2026-08-22" };

// Hours SSOT
{
  const rich = [makeEmp("h1", true)];
  const zero = [makeEmp("z1", false)];
  assert("hours rich > 0", liveRosterHasPositiveHours(rich));
  assert("hours zero == 0", !liveRosterHasPositiveHours(zero));
  assert("totalHours rich ~9*", liveRosterTotalHours(rich) >= 40);
}

// T-FENCE — historical residual under current keys → mayPersist false
{
  const archived = Array.from({ length: 13 }, (_, i) => makeEmp(`a-${i}`, true));
  const live = [...archived.map((e) => ({ ...e })), makeEmp("a-extra", true)];
  const archive = [
    {
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: archived,
    },
  ];
  assert(
    "overlap detects historical",
    rosterOverlapsArchivedHistorical(live, archive, current.from, current.to),
  );
  const gate = mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: current.from,
    weekTo: current.to,
    roster: live,
    archive,
    currentFrom: current.from,
    currentTo: current.to,
  });
  assert("T-FENCE mayPersist false", gate.allow === false);
  assert(
    "T-FENCE reason blocked",
    gate.reason === PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON,
  );
}

// Zero-hours seed under current → allow (ALIGN-legal)
{
  const archived = Array.from({ length: 3 }, (_, i) => makeEmp(`zarch-${i}`, true));
  const live0 = archived.map((e) => ({
    ...e,
    days: Object.fromEntries(DAYS.map((k) => [k, defaultDay()])),
  }));
  const archive = [{ weekFrom: prev.from, weekTo: prev.to, weekEmployees: archived }];
  const gate = mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: current.from,
    weekTo: current.to,
    roster: live0,
    archive,
    currentFrom: current.from,
    currentTo: current.to,
  });
  assert("zero-hours seed mayPersist true", gate.allow === true);
  assert("zero-hours no overlap fence", !rosterOverlapsArchivedHistorical(live0, archive, current.from, current.to));
}

// Legal current-week edits (no archive overlap) → allow
{
  const fresh = [makeEmp("fresh-1", true)];
  const gate = mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: current.from,
    weekTo: current.to,
    roster: fresh,
    archive: [],
    currentFrom: current.from,
    currentTo: current.to,
  });
  assert("legal current hours mayPersist true", gate.allow === true);
}

// D-F4 — intentional clear: empty next replaces prev (no union)
{
  const prevRoster = [makeEmp("p1", true), makeEmp("p2", true)];
  const empty = [];
  const withUnion = applyCasWrite(prevRoster, empty, false);
  const withClear = applyCasWrite(prevRoster, empty, true);
  assert("without flag union keeps prev", withUnion.length === 2);
  assert("D-F4 intentional clear → empty Cloud", withClear.length === 0);
}

// D-F4 — intentional clear must NOT apply to non-empty next (union still for normal CAS)
{
  const prevRoster = [makeEmp("p1", true)];
  const nextRoster = [makeEmp("p1", true), makeEmp("p2", true)];
  // When intentional clear + non-empty: Edge still skips union — next wins as-is (replace).
  // Product only sets flag for empty clear / empty rollover; document that contract.
  const replaced = applyCasWrite(prevRoster, nextRoster, true);
  assert("intentional+nonEmpty replaces with next", replaced.length === 2);
}

console.log(`\nPAYROLL-WEEK-ROSTER-INVARIANT-01: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
