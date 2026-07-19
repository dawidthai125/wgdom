/**
 * PAYROLL-P0-REGRESSION-03 — natychmiastowy render + PAYROLL-ROLL-001
 * Run: npx vite-node scripts/test-payroll-display-p0-regression-03.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { BOOTSTRAP_CORE_KEYS, BOOTSTRAP_DEFERRED_KEYS } from "../src/lib/cloud-sync.ts";
import { resolvePayrollDisplayEmployees } from "../src/lib/payroll-display.ts";
import {
  getPayrollWeekRange,
  isPayrollWeekClosedForUi,
  resolvePayrollOperationalWeekKeys,
  classifyPayrollWeekTransition,
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

// R1 — employee-leaves w CORE
{
  assert("R1 kw-employee-leaves in BOOTSTRAP_CORE_KEYS", BOOTSTRAP_CORE_KEYS.includes("kw-employee-leaves"));
  assert("R1 kw-employee-leaves not in DEFERRED", !BOOTSTRAP_DEFERRED_KEYS.includes("kw-employee-leaves"));
}

// R2 — bootstrap align: stale keys + live roster + stored week archived → align (bez wipe)
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`e-${i}`));
  const archive = [
    {
      id: "snap-prev",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-12T18:00:00.000Z",
    },
  ];
  const aligned = resolvePayrollOperationalWeekKeys(
    prev.from,
    prev.to,
    roster.length,
    mondayNewWeek,
    archive,
  );
  assert("R2 didAlign stale keys", aligned.didAlign === true);
  assert("R2 kind align", aligned.kind === "align");
  assert("R2 aligned to current from", aligned.from === current.from);
  assert("R2 aligned to current to", aligned.to === current.to);

  const closedBefore = isPayrollWeekClosedForUi(prev.from, prev.to, false, mondayNewWeek);
  const closedAfter = isPayrollWeekClosedForUi(aligned.from, aligned.to, false, mondayNewWeek);
  assert("R2 stale keys wrongly closed", closedBefore === true);
  assert("R2 aligned keys not closed", closedAfter === false);

  const displayBefore = resolvePayrollDisplayEmployees(
    closedBefore,
    roster,
    undefined,
    prev.from,
    prev.to,
  );
  const displayAfter = resolvePayrollDisplayEmployees(
    closedAfter,
    roster,
    undefined,
    aligned.from,
    aligned.to,
  );
  assert("R2 display collapsed before align", displayBefore.length === 0);
  assert("R2 display immediate after align", displayAfter.length === 14);
}

// R2b — real rollover: no archive → kind rollover (not align-only)
{
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`x-${i}`));
  const t = classifyPayrollWeekTransition(prev.from, prev.to, roster.length, [], mondayNewWeek);
  assert("R2b kind rollover", t.kind === "rollover");
  assert("R2b didAlign false via resolve", {
    ...resolvePayrollOperationalWeekKeys(prev.from, prev.to, roster.length, mondayNewWeek, []),
  }.didAlign === false);
}

// R3 — empty roster: no align
{
  const prev = { from: "2026-07-06", to: "2026-07-12" };
  const aligned = resolvePayrollOperationalWeekKeys(prev.from, prev.to, 0, mondayNewWeek, []);
  assert("R3 empty roster no align", aligned.didAlign === false);
  assert("R3 kind none", aligned.kind === "none");
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
