/**
 * PR-PAY-S6 — Archive Restore Eligibility Guard.
 * Baner (G1) i restore (G2) używają wyłącznie eligible archive roster
 * (archiwum minus tombstony PR-PAY-S2). Reuse: deletedWeekEmployeeMergeKeySet +
 * filterDeletedWeekEmployees. Bez nowych KV, bez zmian merge/metrics.
 *
 * Run: npx vite-node scripts/test-payroll-archive-restore-eligibility-s6.mjs
 */
import { readFileSync } from "node:fs";
import {
  eligibleArchiveWeekEmployees,
  shouldShowPayrollRestoreBanner,
  payrollMetrics,
  deletedWeekEmployeeMergeKeySet,
  filterDeletedWeekEmployees,
  weekEmployeeTombstoneId,
} from "../src/lib/cloud-sync.ts";

let pass = 0;

function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS: ${label}`);
  pass += 1;
}

const CUR = { from: "2026-06-22", to: "2026-06-28" };
const NEXT = { from: "2026-06-29", to: "2026-07-05" };

function activeDay(from = "07:00", to = "16:00") {
  return { active: true, from, to, zaliczka: "" };
}
function inactiveDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}
function workWeek() {
  return {
    Pn: activeDay(),
    Wt: activeDay(),
    Sr: inactiveDay(),
    Cz: inactiveDay(),
    Pt: inactiveDay(),
    So: inactiveDay(),
  };
}
function makeEmp({ id, directoryId, name }, days) {
  return {
    id,
    directoryId: directoryId ?? "",
    name: name ?? "Test Worker",
    rate: "50",
    days: JSON.parse(JSON.stringify(days)),
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    extraCosts: [],
    settled: false,
  };
}
function mergeKeys(list) {
  return list.map((e) => (e.directoryId ? `dir:${e.directoryId}` : `name:${String(e.name).trim().toLowerCase()}`));
}

const keep = makeEmp({ id: "keep", directoryId: "dir-keep", name: "Keeper" }, workWeek());
const ghost = makeEmp({ id: "ghost", directoryId: "dir-ghost", name: "Ghost" }, workWeek());
const lost = makeEmp({ id: "lost", directoryId: "dir-lost", name: "Lost" }, workWeek());
const smoke = makeEmp({ id: "smoke", directoryId: "", name: "Smoke Worker" }, workWeek());

const tombGhostCur = [weekEmployeeTombstoneId(CUR.from, CUR.to, ghost)];
const tombSmokeCur = [weekEmployeeTombstoneId(CUR.from, CUR.to, smoke)];

console.log("=== PR-PAY-S6 · Archive Restore Eligibility Guard ===\n");

// ─── AC1 — eligible == live → baner OFF (tombstonowany ghost tylko w archiwum) ─
{
  const live = [keep];
  const archive = [keep, ghost];
  const eligible = eligibleArchiveWeekEmployees(archive, CUR.from, CUR.to, tombGhostCur);
  assert("AC1 eligible drops ghost", eligible.length === 1 && !mergeKeys(eligible).includes("dir:dir-ghost"));
  assert("AC1 eligible metrics == live", JSON.stringify(payrollMetrics(eligible)) === JSON.stringify(payrollMetrics(live)));
  assert("AC1 banner OFF", !shouldShowPayrollRestoreBanner(live, archive, CUR.from, CUR.to, tombGhostCur));
  assert("AC1 raw archive would false-positive", shouldShowPayrollRestoreBanner(live, archive, CUR.from, CUR.to, []));
}

// ─── AC2 / AC7 — realna utrata nietombstonowanych danych → baner ON ───────────
{
  const live = [keep];
  const archive = [keep, lost]; // lost NIE tombstonowany, ma godziny tylko w archiwum
  assert("AC2 eligible keeps lost", eligibleArchiveWeekEmployees(archive, CUR.from, CUR.to, tombGhostCur).length === 2);
  assert("AC2 banner ON (real loss)", shouldShowPayrollRestoreBanner(live, archive, CUR.from, CUR.to, tombGhostCur));
}

// ─── AC3 — restore (G2) nie wskrzesza tombstonowanego ─────────────────────────
{
  const restored = eligibleArchiveWeekEmployees([keep, ghost], CUR.from, CUR.to, tombGhostCur);
  assert("AC3 restore skips tombstoned", restored.length === 1 && mergeKeys(restored)[0] === "dir:dir-keep");
}

// ─── AC3 — smoke worker (synthetic, name-key) też pominięty ───────────────────
{
  const live = [keep];
  const archive = [keep, smoke];
  assert("AC3 smoke banner OFF", !shouldShowPayrollRestoreBanner(live, archive, CUR.from, CUR.to, tombSmokeCur));
  const restored = eligibleArchiveWeekEmployees(archive, CUR.from, CUR.to, tombSmokeCur);
  assert("AC3 smoke skipped on restore", restored.length === 1 && !mergeKeys(restored).includes("name:smoke worker"));
}

// ─── AC4 — week-scope S2: tombstone CUR nie wpływa na NEXT ─────────────────────
{
  const setCur = deletedWeekEmployeeMergeKeySet(tombGhostCur, CUR.from, CUR.to);
  const setNext = deletedWeekEmployeeMergeKeySet(tombGhostCur, NEXT.from, NEXT.to);
  assert("AC4 tombstone matches CUR", setCur.has("dir:dir-ghost"));
  assert("AC4 tombstone empty for NEXT", setNext.size === 0);
  const eligibleNext = eligibleArchiveWeekEmployees([keep, ghost], NEXT.from, NEXT.to, tombGhostCur);
  assert("AC4 NEXT keeps both", eligibleNext.length === 2);
}

// ─── T6 — null / empty / brak week range (kompatybilność wsteczna) ────────────
{
  const live = [keep];
  assert("T6 null archive OFF", !shouldShowPayrollRestoreBanner(live, null, CUR.from, CUR.to, []));
  assert("T6 empty archive OFF", !shouldShowPayrollRestoreBanner(live, [], CUR.from, CUR.to, []));
  const raw = eligibleArchiveWeekEmployees([keep, ghost], undefined, undefined, tombGhostCur);
  assert("T6 no week range → raw roster", raw.length === 2);
}

// ─── Reuse sanity: filterDeletedWeekEmployees kluczem tygodnia ─────────────────
{
  const set = deletedWeekEmployeeMergeKeySet(tombGhostCur, CUR.from, CUR.to);
  assert("reuse filter drops ghost", filterDeletedWeekEmployees([keep, ghost], set).length === 1);
}

// ─── Wiring: call-sites używają eligible roster (G1 + G2), AC6 brak nowych KV ──
{
  const cs = readFileSync("src/lib/cloud-sync.ts", "utf8");
  const pv = readFileSync("src/app/PayrollView.tsx", "utf8");
  const app = readFileSync("src/app/App.tsx", "utf8");
  assert("wiring: helper exported", cs.includes("export function eligibleArchiveWeekEmployees("));
  assert("wiring: banner uses eligible", cs.includes("return archivePayrollRicherThanLive(eligible, weekEmployees)"));
  assert("wiring: PayrollView passes weekFrom/weekTo", pv.includes("shouldShowPayrollRestoreBanner(weekEmployees, archivedForWeek?.weekEmployees, weekFrom, weekTo)"));
  assert("wiring: App restore uses eligible", app.includes("eligibleArchiveWeekEmployees(snap.weekEmployees, weekFrom, weekTo)"));
  assert("wiring: App restore not raw clone", !app.includes("JSON.stringify(snap.weekEmployees)"));
  assert("AC6 reuse S2 KV (no new deleted-ids key)", cs.includes("getDeletedWeekEmployeeKeys()") && (cs.match(/= "kw-week-employees-deleted-ids"/g) || []).length === 1);
}

console.log(`\nPR-PAY-S6: ${pass} PASS`);
if (process.exitCode) process.exit(process.exitCode);
