/**
 * PAYROLL-ASSIGNMENTS-P1 — smoke T01–T07
 * Run: npx vite-node scripts/test-payroll-assignments-p1.mjs
 */
import {
  defaultDay,
  payrollJobConsistencyAlerts,
  jobSitesForEmployeeOnDate,
  dayBaseHoursOnly,
} from "../src/app/app-domain.ts";
import {
  dayPayrollAssignmentFooter,
  employeePayrollAssignmentBadge,
  updateWorkEntryHoursInJobs,
  addWorkEntryForEmployee,
  jobsForPayrollAssignmentDropdown,
  payrollAssignmentAlertsForWeek,
} from "../src/lib/payroll-job-assignments.ts";
import { inferJobPhase } from "../src/lib/job-list-status.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function defaultDays() {
  return Object.fromEntries(DAYS.map((d) => [d, defaultDay()]));
}

function makeEmp(id, dirId, name, wtHours = 9) {
  const days = defaultDays();
  days.Wt = { ...defaultDay(), active: true, from: "07:00", to: "16:00" };
  return {
    id,
    directoryId: dirId,
    name,
    phone: "",
    position: "Murarz",
    rate: "50",
    days,
    settled: false,
  };
}

function makeJob(id, address, workEntries = [], status = "in_progress") {
  return {
    id,
    address,
    flatNumber: "",
    client: "WM",
    status,
    documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
    workEntries,
    materials: [],
    photos: [],
    keysHandedOver: false,
  };
}

const weekFrom = "2026-06-09";
const weekTo = "2026-06-14";
const wtIso = "2026-06-10";
const directory = [{ id: "d1", name: "Jan Kowalski", phone: "+48123456789", position: "Murarz", defaultRate: "50", active: true }];
const emp = makeEmp("we1", "d1", "Jan Kowalski");

console.log("=== T01 — 1 pracownik, 1 robota, 9h = 9h ===");
{
  const entry = {
    id: "e1",
    directoryId: "d1",
    employeeName: "Jan Kowalski",
    date: wtIso,
    hours: 9,
    rate: 50,
    notes: "",
  };
  const jobs = [makeJob("j1", "Kleczkowska 26", [entry])];
  const footer = dayPayrollAssignmentFooter(emp, jobs, wtIso, weekFrom, directory, payrollAssignmentAlertsForWeek([emp], jobs, weekFrom, weekTo, directory));
  assert(footer.status === "ok" && footer.message.includes("Spójne"), "T01 footer spójne");
  assert(employeePayrollAssignmentBadge(emp, payrollAssignmentAlertsForWeek([emp], jobs, weekFrom, weekTo, directory), directory) === "ok", "T01 badge ok");
}

console.log("\n=== T02 — 1 pracownik, 2 roboty, 5+4=9h ===");
{
  const jobs = [
    makeJob("j1", "Kleczkowska 26", [{
      id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 5, rate: 50, notes: "",
    }]),
    makeJob("j2", "Brochów 12", [{
      id: "e2", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 4, rate: 50, notes: "",
    }]),
  ];
  const sites = jobSitesForEmployeeOnDate(emp, jobs, wtIso, directory);
  assert(sites.length === 2 && sites.reduce((s, x) => s + x.hours, 0) === 9, "T02 suma 9h na 2 robotach");
  const footer = dayPayrollAssignmentFooter(emp, jobs, wtIso, weekFrom, directory, payrollAssignmentAlertsForWeek([emp], jobs, weekFrom, weekTo, directory));
  assert(footer.status === "ok", "T02 footer ok");
}

console.log("\n=== T03 — LP 9h, roboty 7h → FAIL ===");
{
  const jobs = [makeJob("j1", "Kleczkowska 26", [{
    id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 7, rate: 50, notes: "",
  }])];
  const alerts = payrollJobConsistencyAlerts([emp], jobs, weekFrom, weekTo, directory);
  const wtAlert = alerts.find((a) => a.dateIso === wtIso);
  assert(wtAlert?.kind === "mismatch", "T03 alert mismatch");
  const footer = dayPayrollAssignmentFooter(emp, jobs, wtIso, weekFrom, directory, alerts);
  assert(footer.status === "mismatch" && footer.message.includes("Brakuje"), "T03 footer brakuje 2h");
  assert(employeePayrollAssignmentBadge(emp, alerts, directory) === "mismatch", "T03 badge mismatch");
}

console.log("\n=== T04 — edycja Roboty widoczna w Przydziały ===");
{
  const jobsViewEntry = {
    id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 8, rate: 50, notes: "z roboty",
  };
  const jobs = [makeJob("j1", "Kleczkowska 26", [jobsViewEntry])];
  const rows = jobSitesForEmployeeOnDate(emp, jobs, wtIso, directory);
  assert(rows[0]?.hours === 8, "T04 godziny z workEntries widoczne");
}

console.log("\n=== T05 — edycja Przydziały widoczna w Roboty ===");
{
  let jobs = [
    makeJob("j1", "Kleczkowska 26", [{
      id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 9, rate: 50, notes: "",
    }]),
    makeJob("j2", "Brochów 12", []),
  ];
  jobs = updateWorkEntryHoursInJobs(jobs, "j1", "e1", 6);
  jobs = addWorkEntryForEmployee(jobs, "j2", emp, wtIso, 3);
  const total = jobSitesForEmployeeOnDate(emp, jobs, wtIso, directory).reduce((s, r) => s + r.hours, 0);
  assert(total === 9, "T05 suma po edycji z panelu = 9h");
  assert(jobs.find((j) => j.id === "j1")?.workEntries[0]?.hours === 6, "T05 j1 ma 6h");
  assert(jobs.find((j) => j.id === "j2")?.workEntries[0]?.hours === 3, "T05 j2 ma 3h");
}

console.log("\n=== T06 — Grafik bez regresji (dayBaseHoursOnly niezmienione) ===");
{
  assert(dayBaseHoursOnly(emp.days.Wt) === 9, "T06 dayBaseHoursOnly Wt = 9h");
}

console.log("\n=== T07 — Dashboard Spójność bez regresji ===");
{
  const jobs = [makeJob("j1", "Kleczkowska 26", [{
    id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 9, rate: 50, notes: "",
  }])];
  const alerts = payrollJobConsistencyAlerts([emp], jobs, weekFrom, weekTo, directory);
  assert(alerts.filter((a) => a.kind !== undefined).length === 0 || alerts.length === 0, "T07 brak alertów gdy spójne");
  const mismatchJobs = [makeJob("j1", "X", [{
    id: "e1", directoryId: "d1", employeeName: "Jan Kowalski", date: wtIso, hours: 5, rate: 50, notes: "",
  }])];
  const mismatchAlerts = payrollJobConsistencyAlerts([emp], mismatchJobs, weekFrom, weekTo, directory);
  assert(mismatchAlerts.some((a) => a.kind === "mismatch"), "T07 nadal wykrywa mismatch");
}

console.log("\n=== filtr robót — bez zdanych ===");
{
  const jobs = [
    makeJob("j1", "Aktywna", [], "in_progress"),
    makeJob("j2", "Zdana", [], "completed"),
  ];
  jobs[1].keysHandedOver = true;
  const dropdown = jobsForPayrollAssignmentDropdown(jobs);
  assert(dropdown.length === 1 && dropdown[0].id === "j1", "dropdown tylko niearchiwalne");
  assert(inferJobPhase(jobs[1]) === "completed", "j2 completed");
}

console.log(`\n=== wynik: ${passed} pass, ${failed} fail ===`);
process.exit(failed > 0 ? 1 : 0);
