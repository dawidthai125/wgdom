/**
 * RB — Restore banner false positive (payrollMetrics SSOT)
 * Run: npx vite-node scripts/test-payroll-restore-banner-false-positive.mjs
 */
import { readFileSync } from "fs";
import {
  shouldShowPayrollRestoreBanner,
  payrollMetrics,
  weekEmployeesListRichness,
} from "../src/lib/cloud-sync.ts";

let pass = 0;

function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${label}`);
  pass++;
}

function makeEmp(id, days, prevSaturday) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: "Test Worker",
    rate: "50",
    days,
    prevSaturday: prevSaturday ?? { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [],
    settled: false,
  };
}

function activeDay(from = "07:00", to = "16:00", extra = {}) {
  return { active: true, from, to, zaliczka: "", ...extra };
}

function inactiveDayWithTimes() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

// T1 — identical metrics → OFF
{
  const day = activeDay();
  const days = { Pn: day, Wt: day, Sr: inactiveDayWithTimes(), Cz: inactiveDayWithTimes(), Pt: inactiveDayWithTimes(), So: inactiveDayWithTimes() };
  const live = [makeEmp("a", days)];
  const arch = [makeEmp("b", JSON.parse(JSON.stringify(days)))];
  const liveM = payrollMetrics(live);
  const archM = payrollMetrics(arch);
  assert("T1 metrics equal", liveM.activeDays === archM.activeDays && liveM.totalHours === archM.totalHours);
  assert("T1 banner OFF", !shouldShowPayrollRestoreBanner(live, arch));
}

// T2 — archive +8h → ON
{
  const liveDays = {
    Pn: activeDay("07:00", "16:00"),
    Wt: inactiveDayWithTimes(),
    Sr: inactiveDayWithTimes(),
    Cz: inactiveDayWithTimes(),
    Pt: inactiveDayWithTimes(),
    So: inactiveDayWithTimes(),
  };
  const archDays = {
    ...liveDays,
    Wt: activeDay("07:00", "15:00"), // +8h vs inactive
  };
  const live = [makeEmp("l1", liveDays)];
  const arch = [makeEmp("a1", archDays)];
  assert("T2 archive more hours", payrollMetrics(arch).totalHours > payrollMetrics(live).totalHours + 0.05);
  assert("T2 banner ON", shouldShowPayrollRestoreBanner(live, arch));
}

// T3 — archive +1 activeDay, hours tie → ON
{
  const fourHours = activeDay("08:00", "12:00");
  const inactive = inactiveDayWithTimes();
  const liveDays = { Pn: activeDay("08:00", "16:00"), Wt: inactive, Sr: inactive, Cz: inactive, Pt: inactive, So: inactive };
  const archDays = { Pn: fourHours, Wt: fourHours, Sr: inactive, Cz: inactive, Pt: inactive, So: inactive };
  const live = [makeEmp("l2", liveDays)];
  const arch = [makeEmp("a2", archDays)];
  const liveM = payrollMetrics(live);
  const archM = payrollMetrics(arch);
  assert("T3 same totalHours", liveM.totalHours === archM.totalHours);
  assert("T3 archive more activeDays", archM.activeDays > liveM.activeDays);
  assert("T3 banner ON", shouldShowPayrollRestoreBanner(live, arch));
}

// T4 — same metrics, different richness (false positive fix) → OFF
{
  const workDay = activeDay();
  const archDay = { ...workDay, notes: "x".repeat(20) };
  const inactive = inactiveDayWithTimes();
  const rest = { Wt: inactive, Sr: inactive, Cz: inactive, Pt: inactive, So: inactive };
  const live = [makeEmp("l3", { Pn: workDay, ...rest })];
  const arch = [makeEmp("a3", { Pn: archDay, ...rest })];
  assert("T4 richness differs", weekEmployeesListRichness(arch) > weekEmployeesListRichness(live) + 1);
  assert("T4 same metrics", JSON.stringify(payrollMetrics(live)) === JSON.stringify(payrollMetrics(arch)));
  assert("T4 banner OFF (no false positive)", !shouldShowPayrollRestoreBanner(live, arch));
}

// T5 — B5 gate: PayrollView still gates !isClosedWeek
{
  const src = readFileSync("src/app/PayrollView.tsx", "utf8");
  assert("T5 !isClosedWeek gate", src.includes("!isClosedWeek &&\n    onRestoreFromArchive"));
  assert("T5 uses shouldShowPayrollRestoreBanner", src.includes("shouldShowPayrollRestoreBanner("));
}

// T6 — no archived weekEmployees → OFF
{
  const live = [makeEmp("l4", { Pn: activeDay(), Wt: inactiveDayWithTimes(), Sr: inactiveDayWithTimes(), Cz: inactiveDayWithTimes(), Pt: inactiveDayWithTimes(), So: inactiveDayWithTimes() })];
  assert("T6 null archive", !shouldShowPayrollRestoreBanner(live, null));
  assert("T6 empty archive", !shouldShowPayrollRestoreBanner(live, []));
}

console.log(`\nRB restore banner: ${pass} PASS`);
if (process.exitCode) process.exit(process.exitCode);
