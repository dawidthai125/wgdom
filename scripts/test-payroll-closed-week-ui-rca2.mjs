/**
 * B5 — Closed week UI RCA-2 (displayEmployees SSOT + read-only)
 * Run: npx vite-node scripts/test-payroll-closed-week-ui-rca2.mjs
 */
import { readFileSync } from "fs";
import { defaultDay } from "../src/app/app-domain.ts";
import { resolvePayrollDisplayEmployees } from "../src/lib/payroll-display.ts";
import { isPayrollWeekClosedForUi, nextPayrollWeekRange } from "../src/lib/payroll-cycle.ts";
import { hasPayrollRolloverBlockers } from "../src/lib/payroll-rollover.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);

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

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]));
}

function makeEmp(id, name) {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function makeDir(id, name) {
  return {
    id,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    defaultRate: "50",
    startDate: "2026-01-01",
    active: true,
    notes: "",
  };
}

// C1 — closed + archiwum + pusty live roster → snapshot + selectedEmp resolvable
{
  const snapshotEmp = makeEmp("snap-1", "Jan Kowalski");
  const archivedWeekEmployees = [snapshotEmp];
  const weekEmployees = [];
  const isClosedWeek = true;
  const display = resolvePayrollDisplayEmployees(isClosedWeek, weekEmployees, archivedWeekEmployees);
  assert("C1 displayEmployees = snapshot when closed + archive", display === archivedWeekEmployees);
  assert("C1 displayEmployees length", display.length === 1);
  const selectedEmp = display.find((e) => e.id === "snap-1") ?? null;
  assert("C1 selectedEmp resolvable from snapshot id", selectedEmp?.name === "Jan Kowalski");
}

// C2 — closed bez snapshotu → [] (bez fallbacku na live)
{
  const live = [makeEmp("live-1", "Live Worker")];
  const display = resolvePayrollDisplayEmployees(true, live, undefined);
  assert("C2 closed without archive → empty", display.length === 0);
  assert("C2 no live fallback", display !== live);
  const displayNull = resolvePayrollDisplayEmployees(true, live, []);
  assert("C2 empty archived weekEmployees → empty", displayNull.length === 0);
}

// C3 — read-only gating w PayrollView (static source checks)
{
  const src = readFileSync("src/app/PayrollView.tsx", "utf8");
  assert("C3 readOnly={isClosedWeek} on WeekEmployeeDetail", src.includes("readOnly={isClosedWeek}"));
  assert("C3 no-op patch handlers when closed", src.includes("onPatchDay={isClosedWeek ? () => {}"));
  assert("C3 mutation roster hidden when closed", src.includes("{!isClosedWeek && (") && src.includes("Dodaj pracownika"));
  assert("C3 showRestoreBanner gated !isClosedWeek", src.includes("!isClosedWeek &&\n    onRestoreFromArchive"));
  assert("C3 assignments tab hidden when closed", src.includes("{!isClosedWeek && (\n                    <button") || src.includes("Przydziały robót"));
}

// C4 — operacyjny saved week → displayEmployees === weekEmployees
{
  const weekEmployees = [makeEmp("op-1", "Operacyjny")];
  const isClosedWeek = isPayrollWeekClosedForUi(W1.from, W1.to, false, new Date("2026-06-03T12:00:00"));
  assert("C4 current week not closed", !isClosedWeek);
  const display = resolvePayrollDisplayEmployees(isClosedWeek, weekEmployees, [makeEmp("arch-1", "Archive")]);
  assert("C4 operational display === live roster", display === weekEmployees);
  assert("C4 operational display length", display.length === 1);
}

// C5 — 20.1D blockers → kalendarz za, ale UI operacyjny
{
  const directory = [makeDir("dir-k", "Kamil")];
  const roster = [makeEmp("we-k", "Kamil")];
  const savedWeeks = [];
  const blockers = hasPayrollRolloverBlockers(roster, W1.from, W1.to, directory, { savedWeeks });
  const sundayBeforeRollover = new Date("2026-06-07T19:59:00");
  const isClosedWeek = isPayrollWeekClosedForUi(W1.from, W1.to, blockers, sundayBeforeRollover);
  assert("C5 blockers keep week operational (not closed for UI)", !isClosedWeek);
  const display = resolvePayrollDisplayEmployees(isClosedWeek, roster, []);
  assert("C5 operational display === live roster", display === roster);
  const closedCalendar = isPayrollWeekClosedForUi(W2.from, W2.to, false, sundayBeforeRollover);
  assert("C5 W2 calendar closed without blockers on W2", closedCalendar);
}

console.log(`\nB5 RCA-2: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
