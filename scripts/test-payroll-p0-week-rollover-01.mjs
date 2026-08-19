/**
 * PAYROLL-P0-WEEK-ROLLOVER-01 — PAYROLL-ROLL-001
 * Run: npx vite-node scripts/test-payroll-p0-week-rollover-01.mjs
 *
 * Real rollover (Sun ≥20:00 / calendar behind, no archive):
 *   archive semantics → clear roster → advance keys
 * Bootstrap label race (stored week archived, but live roster no longer mirrors it):
 *   align labels only
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  classifyPayrollWeekTransition,
  getPayrollWeekRange,
  isPayrollWeekRolloverTime,
  isSamePayrollWeekRange,
  PAYROLL_ROLL_001,
  findPayrollWeekSnapshot,
} from "../src/lib/payroll-cycle.ts";

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

/** Minimal model of autoArchiveAndAdvance (no React / no cloud). */
function simulateFullRollover(weekFrom, weekTo, weekEmployees, savedWeeks, targetFrom, targetTo) {
  let nextArchive = savedWeeks;
  if (weekEmployees.length > 0) {
    const existing = findPayrollWeekSnapshot(savedWeeks, weekFrom, weekTo);
    const snapshot = {
      id: existing?.id || `snap-${weekFrom}`,
      weekFrom,
      weekTo,
      weekEmployees: weekEmployees.map((e) => ({ ...e })),
      savedAt: new Date().toISOString(),
    };
    nextArchive = existing
      ? savedWeeks.map((w) => (w.id === existing.id ? snapshot : w))
      : [...savedWeeks, snapshot];
  }
  return {
    weekFrom: targetFrom,
    weekTo: targetTo,
    weekEmployees: [],
    savedWeeks: nextArchive,
    pushedKeys: ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"],
  };
}

assert("PAYROLL-ROLL-001 id", PAYROLL_ROLL_001 === "PAYROLL-ROLL-001");

// T1 — Sunday 20:01: real rollover → archive + clear + advance
{
  const now = new Date("2026-07-19T20:01:00");
  assert("T1 isPayrollWeekRolloverTime", isPayrollWeekRolloverTime(now) === true);
  const current = getPayrollWeekRange(now);
  assert("T1 current from 2026-07-20", current.from === "2026-07-20");
  assert("T1 current to 2026-07-25", current.to === "2026-07-25");

  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = Array.from({ length: 5 }, (_, i) => makeEmp(`t1-${i}`));
  const transition = classifyPayrollWeekTransition(prev.from, prev.to, roster, [], now);
  assert("T1 kind rollover", transition.kind === "rollover");

  const after = simulateFullRollover(
    prev.from,
    prev.to,
    roster,
    [],
    transition.from,
    transition.to,
  );
  assert("T1 live roster cleared", after.weekEmployees.length === 0);
  assert("T1 keys advanced", isSamePayrollWeekRange(after.weekFrom, after.weekTo, current.from, current.to));
  const snap = findPayrollWeekSnapshot(after.savedWeeks, prev.from, prev.to);
  assert("T1 archive has prev week", !!snap?.weekEmployees?.length);
  assert("T1 archive roster count", snap.weekEmployees.length === 5);
  assert("T1 push 4 keys", after.pushedKeys.length === 4);
}

// T2 — Sunday 19:59: still previous calendar week → no transition
{
  const now = new Date("2026-07-19T19:59:00");
  assert("T2 not rollover time", isPayrollWeekRolloverTime(now) === false);
  const current = getPayrollWeekRange(now);
  assert("T2 still 2026-07-13", current.from === "2026-07-13");
  const roster = [makeEmp("t2")];
  const t = classifyPayrollWeekTransition(current.from, current.to, roster, [], now);
  assert("T2 kind none (on current)", t.kind === "none");
}

// T3 — stored week archived + live roster still mirrors it → real rollover (no stale carry)
{
  const now = new Date("2026-07-20T10:00:00");
  const current = getPayrollWeekRange(now);
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = Array.from({ length: 3 }, (_, i) => makeEmp(`t3-${i}`));
  const archive = [
    {
      id: "arch-prev",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-19T18:00:00.000Z",
    },
  ];
  const t = classifyPayrollWeekTransition(prev.from, prev.to, roster, archive, now);
  assert("T3 kind rollover", t.kind === "rollover");
  assert("T3 target current", t.from === current.from && t.to === current.to);
  const after = simulateFullRollover(prev.from, prev.to, roster, archive, t.from, t.to);
  assert("T3 live roster cleared", after.weekEmployees.length === 0);
}

// T3b — bootstrap label race: archived stored week + current-week identity roster → align
{
  const now = new Date("2026-07-20T10:00:00");
  const current = getPayrollWeekRange(now);
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const archivedRoster = Array.from({ length: 3 }, (_, i) => makeEmp(`t3b-arch-${i}`));
  const liveCurrentWeekRoster = archivedRoster.map((emp) => ({
    ...emp,
    days: Object.fromEntries(
      DAYS.map((k) => [k, defaultDay()]),
    ),
  }));
  const archive = [
    {
      id: "arch-prev-b",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: archivedRoster.map((e) => ({ ...e })),
      savedAt: "2026-07-19T18:00:00.000Z",
    },
  ];
  const t = classifyPayrollWeekTransition(prev.from, prev.to, liveCurrentWeekRoster, archive, now);
  assert("T3b kind align", t.kind === "align");
  assert("T3b target current", t.from === current.from && t.to === current.to);
}

// T4 — biweekly consumer: after real rollover, prev week is in archive (prevWeekNet source)
{
  const now = new Date("2026-07-19T20:05:00");
  const current = getPayrollWeekRange(now);
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = [makeEmp("bi-1")];
  roster[0].directoryId = "dir-bi";
  const t = classifyPayrollWeekTransition(prev.from, prev.to, roster, [], now);
  assert("T4 rollover", t.kind === "rollover");
  const after = simulateFullRollover(prev.from, prev.to, roster, [], t.from, t.to);
  const snap = findPayrollWeekSnapshot(after.savedWeeks, prev.from, prev.to);
  assert("T4 archive for biweekly prevWeek lookup", !!snap);
  assert("T4 new week empty (no stale hours)", after.weekEmployees.length === 0);
  assert("T4 advanced to current", after.weekFrom === current.from);
}

console.log(`\nPAYROLL-P0-WEEK-ROLLOVER-01: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
