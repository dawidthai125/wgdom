/**
 * PAYROLL-P0-REGRESSION-02 — nowy tydzień: tabela natychmiast (canonical week + display guard)
 * Run: npx vite-node scripts/test-payroll-display-p0-regression-02.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { resolvePayrollDisplayEmployees } from "../src/lib/payroll-display.ts";
import {
  canonicalPayrollWeekTo,
  getPayrollWeekRange,
  isPayrollCalendarBehind,
  isPayrollWeekClosedForUi,
  isSamePayrollWeekRange,
  nextPayrollWeekRange,
  findPayrollWeekSnapshot,
} from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-07-07", to: "2026-07-12" }; // Pn–So (sobota)
const mondayNewWeek = new Date("2026-07-13T10:00:00"); // poniedziałek nowego tygodnia

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
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
}

function makeEmp(id) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

// R1 — Sunday weekTo (Pn+6) ≡ Saturday (Pn+5) dla tego samego tygodnia
{
  const sun = canonicalPayrollWeekTo(W1.from, "2026-07-13");
  assert("R1 canonical Sunday→Saturday", sun === W1.to);
  assert(
    "R1 isSamePayrollWeekRange Sun vs Sat weekTo",
    isSamePayrollWeekRange(W1.from, "2026-07-13", W1.from, W1.to),
  );
}

// R2 — REGRESJA: nowy tydzień (poniedziałek), roster 14, weekTo=niedziela → display natychmiast
{
  const current = getPayrollWeekRange(mondayNewWeek);
  const roster = Array.from({ length: 14 }, (_, i) => makeEmp(`e-${i}`));
  const weekToSunday = (() => {
    const mon = new Date(current.from + "T12:00:00");
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return sun.toISOString().slice(0, 10);
  })();

  assert("R2 setup: Sunday weekTo same week as current", isSamePayrollWeekRange(
    current.from,
    weekToSunday,
    current.from,
    current.to,
  ));

  const wronglyClosed = isPayrollWeekClosedForUi(current.from, weekToSunday, false, mondayNewWeek);
  assert("R2 isClosedWeek false with canonical compare", !wronglyClosed);
  assert("R2 not calendar behind", !isPayrollCalendarBehind(current.from, weekToSunday, mondayNewWeek));

  const display = resolvePayrollDisplayEmployees(
    wronglyClosed,
    roster,
    undefined,
    current.from,
    weekToSunday,
  );
  assert("R2 displayEmployees === roster (14)", display.length === 14);
  assert("R2 display is live roster ref", display === roster);
}

// R3 — stary tydzień z archiwum → snapshot (bez regresji B5)
{
  const roster = [makeEmp("live-1")];
  const archive = [makeEmp("arch-1")];
  const isClosed = isPayrollWeekClosedForUi(W1.from, W1.to, false, mondayNewWeek);
  assert("R3 old week closed for UI", isClosed);
  const display = resolvePayrollDisplayEmployees(isClosed, roster, archive, W1.from, W1.to);
  assert("R3 archive snapshot", display === archive);
}

// R4 — stary tydzień bez archiwum → [] (B5)
{
  const roster = [makeEmp("live-2")];
  const isClosed = isPayrollWeekClosedForUi(W1.from, W1.to, false, mondayNewWeek);
  const display = resolvePayrollDisplayEmployees(isClosed, roster, undefined, W1.from, W1.to);
  assert("R4 closed no archive empty", display.length === 0);
}

// R5 — findPayrollWeekSnapshot canonical (archiwum z weekTo=niedziela)
{
  const snap = {
    id: "snap-1",
    weekFrom: W1.from,
    weekTo: "2026-07-13",
    weekEmployees: [makeEmp("a-1")],
    savedAt: new Date().toISOString(),
  };
  const found = findPayrollWeekSnapshot([snap], W1.from, W1.to);
  assert("R5 find snapshot Sunday key", found?.id === "snap-1");
}

console.log(`\nPAYROLL-P0-REGRESSION-02: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
