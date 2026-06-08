/**
 * Sprint 20.1D — payroll week closed semantics (blocked rollover exception)
 * Uruchom: npx vite-node scripts/smoke-test-payroll-week-closed-20.1d.mjs
 */
import { defaultDay, buildWeekSnapshot } from "../src/app/app-domain.ts";
import {
  isPayrollWeekClosed,
  isPayrollWeekClosedForUi,
  isPayrollWeekSaved,
  nextPayrollWeekRange,
  previousWeekRange,
} from "../src/lib/payroll-cycle.ts";
import { hasPayrollRolloverBlockers } from "../src/lib/payroll-rollover.ts";
import { canDeferPayroll, calcWeekEmployeeForPayroll } from "../src/lib/payroll-carry-forward.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);
const W0 = previousWeekRange(W1.from);

const SUNDAY_BEFORE_ROLLOVER = new Date("2026-06-07T19:59:00");
const SUNDAY_AFTER_ROLLOVER = new Date("2026-06-07T20:01:00");

const R = {};

function log(m) {
  console.log(m);
}

function defaultDays(h = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: h === 8 ? "16:00" : "15:00" },
    ]),
  );
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

function makeEmp(id, dirId, name, rate = "30", extra = {}) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate,
    days: defaultDays(7),
    settled: false,
    ...extra,
  };
}

function closedForUi(week, roster, directory, now, savedWeeks = []) {
  const blockers = hasPayrollRolloverBlockers(roster, week.from, week.to, directory, {
    savedWeeks,
  });
  return isPayrollWeekClosedForUi(week.from, week.to, blockers, now);
}

function rosterWithBlockers() {
  const directory = [makeDir("dir-kamil", "Kamil Elektryk")];
  const emp = makeEmp("we-kamil", "dir-kamil", "Kamil Elektryk", "30");
  return { directory, roster: [emp] };
}

function rosterSettled() {
  const directory = [makeDir("dir-kamil", "Kamil Elektryk")];
  const emp = makeEmp("we-kamil", "dir-kamil", "Kamil Elektryk", "30", { settled: true });
  return { directory, roster: [emp] };
}

// T1 — Nd 19:59, blockers=true → closed=false
function testT1() {
  log("\n═══ T1 — Nd 19:59 + blockers → operacyjny ═══");
  const { directory, roster } = rosterWithBlockers();
  const blockers = hasPayrollRolloverBlockers(roster, W1.from, W1.to, directory);
  const ui = closedForUi(W1, roster, directory, SUNDAY_BEFORE_ROLLOVER);
  const legacy = isPayrollWeekClosed(W1.from, W1.to, SUNDAY_BEFORE_ROLLOVER);
  log(`  blockers=${blockers} uiClosed=${ui} legacyClosed=${legacy}`);
  R.T1 = blockers && !ui && !legacy ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — Nd 20:01, blockers=true → closed=false (20.1D fix)
function testT2() {
  log("\n═══ T2 — Nd 20:01 + blockers → operacyjny (fix) ═══");
  const { directory, roster } = rosterWithBlockers();
  const blockers = hasPayrollRolloverBlockers(roster, W1.from, W1.to, directory);
  const ui = closedForUi(W1, roster, directory, SUNDAY_AFTER_ROLLOVER);
  const legacy = isPayrollWeekClosed(W1.from, W1.to, SUNDAY_AFTER_ROLLOVER);
  log(`  blockers=${blockers} uiClosed=${ui} legacyClosed=${legacy}`);
  R.T2 = blockers && !ui && legacy ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — Nd 20:01, blockers=false → closed=true
function testT3() {
  log("\n═══ T3 — Nd 20:01 + brak blockers → historyczny ═══");
  const { directory, roster } = rosterSettled();
  const blockers = hasPayrollRolloverBlockers(roster, W1.from, W1.to, directory);
  const ui = closedForUi(W1, roster, directory, SUNDAY_AFTER_ROLLOVER);
  const legacy = isPayrollWeekClosed(W1.from, W1.to, SUNDAY_AFTER_ROLLOVER);
  log(`  blockers=${blockers} uiClosed=${ui} legacyClosed=${legacy}`);
  R.T3 = !blockers && ui && legacy ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — manual historical week (W0) → closed=true
function testT4() {
  log("\n═══ T4 — manual historical week W0 ═══");
  const { directory, roster } = rosterSettled();
  const blockers = hasPayrollRolloverBlockers(roster, W0.from, W0.to, directory);
  const ui = closedForUi(W0, roster, directory, SUNDAY_AFTER_ROLLOVER);
  log(`  W0=${W0.from}–${W0.to} blockers=${blockers} uiClosed=${ui}`);
  R.T4 = ui ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — saved week + blockers on Nd 20:01 → closed=false
function testT5() {
  log("\n═══ T5 — saved + blockers → operacyjny ═══");
  const { directory, roster } = rosterWithBlockers();
  const snap = buildWeekSnapshot(W1.from, W1.to, roster, [], undefined, [], []);
  const saved = isPayrollWeekSaved([snap], W1.from, W1.to);
  const ui = closedForUi(W1, roster, directory, SUNDAY_AFTER_ROLLOVER, [snap]);
  log(`  saved=${saved} uiClosed=${ui}`);
  R.T5 = saved && !ui ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

// T6 — defer available when blockers=true on Nd 20:01
function testT6() {
  log("\n═══ T6 — defer OK przy blockers (Nd 20:01) ═══");
  const { directory, roster } = rosterWithBlockers();
  const emp = roster[0];
  const uiClosed = closedForUi(W1, roster, directory, SUNDAY_AFTER_ROLLOVER);
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: W1.from,
    weekTo: W1.to,
    livePayroll: !uiClosed,
    savedWeeks: [],
  });
  const check = canDeferPayroll(
    emp,
    { ...row, displayNetPay: row.displayNetPay },
    directory,
    uiClosed,
  );
  log(`  uiClosed=${uiClosed} defer.ok=${check.ok} reason=${check.reason ?? "—"}`);
  R.T6 = !uiClosed && check.ok && (check.frozenAmount ?? 0) > 0 ? "PASS" : "FAIL";
  log(`T6: ${R.T6}`);
}

function main() {
  log("Sprint 20.1D — payroll week closed smoke");
  log(`W1=${W1.from}–${W1.to} W2=${W2.from}–${W2.to}`);
  testT1();
  testT2();
  testT3();
  testT4();
  testT5();
  testT6();

  const all = Object.values(R);
  const pass = all.filter((x) => x === "PASS").length;
  log(`\n═══ WYNIK: ${pass}/${all.length} PASS ═══`);
  for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
  if (all.some((x) => x !== "PASS")) process.exit(1);
}

main();
