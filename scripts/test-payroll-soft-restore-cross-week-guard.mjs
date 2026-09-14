/**
 * PAYROLL — D5 Soft Restore cross-week guard (2026-09-14).
 *
 * Regression: after rollover, rotational kw-week-employees-prev holds the
 * previous calendar week's hours. ADD must not overlay those hours onto the
 * new week (ea1b0a6e leak). Same-week session restore must still work.
 *
 * npx vite-node scripts/test-payroll-soft-restore-cross-week-guard.mjs
 */
import { readFileSync } from "fs";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

const {
  rememberPayrollSoftRestoreSnapshot,
  applyPayrollSoftRestoreOverlay,
  canSoftRestoreHoursFromPrevRoster,
  clearPayrollSoftRestoreSnapshot,
  peekPayrollSoftRestoreSession,
} = await import("../src/lib/payroll-soft-restore.ts");

const { weekEmployeeFromDir, defaultDay, dayTotalHours, DAYS } = await import(
  "../src/app/app-domain.ts"
);
const { empTotalHours } = await import("../src/lib/payroll-hours-collapse-gate.ts");

localStorage.removeItem("wg-payroll-soft-restore");
localStorage.removeItem("wg-payroll-soft-restore-session");

const WEEK_A = { from: "2026-09-07", to: "2026-09-12" };
const WEEK_B = { from: "2026-09-14", to: "2026-09-19" };

function day(active, from = "07:00", to = "16:00") {
  return { active, from, to, zaliczka: "" };
}

/** Piotrek fingerprint — 63 h (unique vs template 45). */
function daysPiotrek63() {
  return {
    Pn: day(true, "07:00", "16:00"),
    Wt: day(true, "07:00", "16:00"),
    Sr: day(true, "07:00", "18:00"),
    Cz: day(true, "07:00", "19:00"),
    Pt: day(true, "07:00", "18:00"),
    So: day(true, "07:00", "17:00"),
  };
}

/** Kola fingerprint — Wed–Sat extended (RCA golden). */
function daysKola62() {
  return {
    Pn: day(true, "07:00", "16:00"),
    Wt: day(true, "07:00", "16:00"),
    Sr: day(true, "07:00", "18:00"),
    Cz: day(true, "07:00", "19:00"),
    Pt: day(true, "07:00", "18:00"),
    So: day(true, "07:00", "17:00"),
  };
}

function emp(id, dirId, days, name) {
  return {
    id,
    directoryId: dirId,
    name,
    rate: "25",
    days: structuredClone(days),
    prevSaturday: day(false),
    extraCosts: [],
    settled: false,
  };
}

function fingerprint(days) {
  return DAYS.map((k) => {
    const d = days[k];
    return `${k}:${d?.active ? 1 : 0}:${d?.from}-${d?.to}`;
  }).join("|");
}

function totalFromDays(days) {
  return +DAYS.reduce((s, k) => s + dayTotalHours(days[k] ?? day(false)), 0).toFixed(2);
}

assert("canSoftRestore unbound false", canSoftRestoreHoursFromPrevRoster({
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
}) === false);

assert("canSoftRestore cross-week false", canSoftRestoreHoursFromPrevRoster({
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRosterWeekFrom: WEEK_A.from,
  prevRosterWeekTo: WEEK_A.to,
}) === false);

assert("canSoftRestore same-week true", canSoftRestoreHoursFromPrevRoster({
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRosterWeekFrom: WEEK_B.from,
  prevRosterWeekTo: WEEK_B.to,
}) === true);

// --- Scenario 1: CROSS-WEEK MUST NOT RESTORE ---
const piotrekA = emp("a-p", "dir-1", daysPiotrek63(), "Piotrek Ukraina");
const kolaA = emp("a-k", "dir-3", daysKola62(), "Kola Ukraina");
assert("A Piotrek hours ~63", Math.abs(empTotalHours(piotrekA) - 63) < 0.01 || empTotalHours(piotrekA) > 50);
assert("A Kola fingerprint unique", fingerprint(kolaA.days).includes("Cz:1:07:00-19:00"));

const prevRosterAfterRollover = [piotrekA, kolaA]; // rotational -prev = week A

const dirPiotrek = {
  id: "dir-1",
  name: "Piotrek Ukraina",
  phone: "",
  position: "Pracownik",
  defaultRate: "25",
  active: true,
};
const dirKola = {
  id: "dir-3",
  name: "Kola Ukraina",
  phone: "",
  position: "Pracownik",
  defaultRate: "25",
  active: true,
};

const createdP = weekEmployeeFromDir(dirPiotrek);
const createdK = weekEmployeeFromDir(dirKola);
assert("factory 0h Pn inactive", createdP.days.Pn.active === false);
assert("factory new uuid ≠ A", createdP.id !== piotrekA.id);

// Simulate ADD without preferEmptyHours but with unbound -prev (App path after rollover)
const crossWeek = applyPayrollSoftRestoreOverlay([createdP, createdK], {
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRoster: prevRosterAfterRollover,
  // no prevRosterWeekFrom/To — rotational backup
});

assert("S1 no restore ids", crossWeek.restoredDirectoryIds.length === 0);
assert("S1 Piotrek 0h", empTotalHours(crossWeek.roster[0]) === 0);
assert("S1 Kola 0h", empTotalHours(crossWeek.roster[1]) === 0);
assert("S1 Piotrek default fingerprint", fingerprint(crossWeek.roster[0].days) === fingerprint(
  Object.fromEntries(DAYS.map((d) => [d, defaultDay()])),
));
assert(
  "S1 Kola Cz 19:00 MUST NOT appear",
  !fingerprint(crossWeek.roster[1].days).includes("Cz:1:07:00-19:00"),
);
assert("S1 new uuid kept", crossWeek.roster[0].id === createdP.id);
assert("S1 directoryId kept", crossWeek.roster[0].directoryId === "dir-1");

// Explicit wrong-week binding also blocked
const crossBound = applyPayrollSoftRestoreOverlay([weekEmployeeFromDir(dirPiotrek)], {
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRoster: prevRosterAfterRollover,
  prevRosterWeekFrom: WEEK_A.from,
  prevRosterWeekTo: WEEK_A.to,
});
assert("S1 bound cross-week blocked", crossBound.restoredDirectoryIds.length === 0);
assert("S1 bound cross-week 0h", empTotalHours(crossBound.roster[0]) === 0);

// --- Scenario 2: SAME-WEEK D5 session restore MUST STILL WORK ---
localStorage.removeItem("wg-payroll-soft-restore-session");
const liveB = emp("b-p", "dir-1", daysPiotrek63(), "Piotrek Ukraina");
rememberPayrollSoftRestoreSnapshot(liveB, WEEK_B.from, WEEK_B.to);
assert(
  "S2 session peek same week",
  peekPayrollSoftRestoreSession("dir-1", WEEK_B.from, WEEK_B.to) != null,
);
assert(
  "S2 session peek other week null",
  peekPayrollSoftRestoreSession("dir-1", WEEK_A.from, WEEK_A.to) == null,
);

const readd = weekEmployeeFromDir(dirPiotrek);
const sameWeek = applyPayrollSoftRestoreOverlay([readd], {
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRoster: prevRosterAfterRollover, // still week A — must not matter; session wins
});
assert("S2 restored", sameWeek.restoredDirectoryIds.includes("dir-1"));
assert("S2 hours restored", Math.abs(empTotalHours(sameWeek.roster[0]) - empTotalHours(liveB)) < 0.01);
assert(
  "S2 Cz 19 fingerprint",
  fingerprint(sameWeek.roster[0].days).includes("Cz:1:07:00-19:00"),
);
assert("S2 new uuid", sameWeek.roster[0].id === readd.id);

// Same-week -prev with explicit binding still allowed (D5 contract)
const createdSamePrev = weekEmployeeFromDir({ ...dirKola, id: "dir-3" });
const samePrev = applyPayrollSoftRestoreOverlay([createdSamePrev], {
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  prevRoster: [emp("b-k", "dir-3", daysKola62(), "Kola")],
  prevRosterWeekFrom: WEEK_B.from,
  prevRosterWeekTo: WEEK_B.to,
});
assert("S2 same-week -prev ok", samePrev.restoredDirectoryIds.includes("dir-3"));
assert("S2 same-week -prev hours", empTotalHours(samePrev.roster[0]) > 0);

// --- Scenario 3: preferEmpty ---
rememberPayrollSoftRestoreSnapshot(liveB, WEEK_B.from, WEEK_B.to);
const emptyAdd = applyPayrollSoftRestoreOverlay([weekEmployeeFromDir(dirPiotrek)], {
  weekFrom: WEEK_B.from,
  weekTo: WEEK_B.to,
  preferEmptyHours: true,
  prevRoster: [liveB],
  prevRosterWeekFrom: WEEK_B.from,
  prevRosterWeekTo: WEEK_B.to,
});
assert("S3 preferEmpty no restore", emptyAdd.restoredDirectoryIds.length === 0);
assert("S3 preferEmpty 0h", empTotalHours(emptyAdd.roster[0]) === 0);
clearPayrollSoftRestoreSnapshot("dir-1");

// --- Scenario 4: static App path must not pass unbound prevRoster ---
const appSrc = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
const addFn = appSrc.match(/const addFromDirectory[\s\S]*?^\s*\};/m)?.[0] ?? "";
assert(
  "App addFromDirectory no payrollPrevRoster in overlay",
  addFn.includes("applyPayrollSoftRestoreOverlay")
    && !addFn.includes("prevRoster: payrollPrevRoster"),
);

const viewSrc = readFileSync(new URL("../src/app/PayrollView.tsx", import.meta.url), "utf8");
assert(
  "copyFromLastWeek preferEmptyHours",
  /copyFromLastWeek[\s\S]*?preferEmptyHours:\s*true/.test(viewSrc),
);
assert(
  "Wszyscy aktywni preferEmptyHours",
  viewSrc.includes("availableFromDir.map((d) => d.id), { preferEmptyHours: true }"),
);

console.log(`\nCross-week guard: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
