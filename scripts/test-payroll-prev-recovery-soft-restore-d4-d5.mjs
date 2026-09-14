/**
 * PAYROLL-IMPLEMENT-03 D4+D5 — prev recovery banner + soft restore overlay.
 * npx vite-node scripts/test-payroll-prev-recovery-soft-restore-d4-d5.mjs
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
  shouldShowPayrollPrevRecoveryBanner,
  prevPayrollRicherThanLive,
  applyPrevRecoveryToLiveRoster,
  overlappingPrevLiveSlices,
  isPayrollPrevRecoveryBannerEnabled,
  canApplyPayrollPrevRecovery,
} = await import("../src/lib/payroll-prev-recovery.ts");

const {
  shouldShowPayrollRestoreBanner,
  payrollMetrics,
} = await import("../src/lib/cloud-sync.ts");

const {
  rememberPayrollSoftRestoreSnapshot,
  applyPayrollSoftRestoreOverlay,
  peekPayrollSoftRestoreSession,
  clearPayrollSoftRestoreSnapshot,
} = await import("../src/lib/payroll-soft-restore.ts");

const { weekEmployeeFromDir, defaultDay, defaultDays } = await import("../src/app/app-domain.ts");

const activeDay = { active: true, from: "07:00", to: "16:00", zaliczka: "" };
const inactiveDay = { active: false, from: "07:00", to: "16:00", zaliczka: "" };
const daysActive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...activeDay }]));
const daysInactive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...inactiveDay }]));

function emp(id, dirId, days, name = "Piotrek") {
  return {
    id,
    directoryId: dirId,
    name,
    rate: "25",
    days: structuredClone(days),
    prevSaturday: { ...inactiveDay },
    extraCosts: [],
    settled: false,
  };
}

localStorage.removeItem("wg-payroll-recovery-banner-prev");
localStorage.removeItem("wg-payroll-soft-restore");
localStorage.removeItem("wg-payroll-soft-restore-session");

const liveThin = [emp("live-1", "dir-1", daysInactive)];
const prevRich = [emp("prev-1", "dir-1", daysActive)];
const archiveRich = [emp("arch-1", "dir-1", daysActive)];

const WEEK_CUR = { from: "2026-09-14", to: "2026-09-19" };
const WEEK_OLD = { from: "2026-09-07", to: "2026-09-12" };
const bindSame = {
  weekFrom: WEEK_CUR.from,
  weekTo: WEEK_CUR.to,
  prevRosterWeekFrom: WEEK_CUR.from,
  prevRosterWeekTo: WEEK_CUR.to,
};
const bindCross = {
  weekFrom: WEEK_CUR.from,
  weekTo: WEEK_CUR.to,
  prevRosterWeekFrom: WEEK_OLD.from,
  prevRosterWeekTo: WEEK_OLD.to,
};
const bindLiveOnly = { weekFrom: WEEK_CUR.from, weekTo: WEEK_CUR.to };

const days9h = {
  Pn: { ...activeDay, from: "07:00", to: "16:00" },
  Wt: { ...inactiveDay },
  Sr: { ...inactiveDay },
  Cz: { ...inactiveDay },
  Pt: { ...inactiveDay },
  So: { ...inactiveDay },
};
const liveCurrent9h = [emp("live-1409", "dir-1", days9h)];
const prevOldRich = [emp("prev-0709", "dir-1", daysActive)];

assert("prev richer than live", prevPayrollRicherThanLive(prevRich, liveThin) === true);

// T1 — incident: current 14–19 vs prev 07–12, same directoryId, prev hours >
assert("T1 cross-week banner OFF", shouldShowPayrollPrevRecoveryBanner(liveCurrent9h, prevOldRich, bindCross) === false);
assert("T1 canApply cross-week false", canApplyPayrollPrevRecovery(bindCross) === false);

// T2 — restore no-op (same reference, hours unchanged)
const t2 = applyPrevRecoveryToLiveRoster(liveCurrent9h, prevOldRich, bindCross);
assert("T2 restore same reference", t2 === liveCurrent9h);
assert("T2 hours still 9h day", t2[0].days.Pn.active === true && t2[0].days.Wt.active === false);

// T3 — App restore must not pwrPush when banner/gate false (cross-week / unbound)
const appSrc = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
const restoreFn = appSrc.match(/const restorePayrollHoursFromPrev = useCallback\(\(\) => \{[\s\S]*?\}, \[weekEmployees, payrollPrevRoster, weekFrom, weekTo, setWeekEmployees\]\);/);
assert("T3 restore handler present", Boolean(restoreFn));
assert(
  "T3 shouldShow before pwrPush",
  restoreFn && restoreFn[0].indexOf("shouldShowPayrollPrevRecoveryBanner") < restoreFn[0].indexOf("pwrPush"),
);
assert(
  "T3 early return when banner false",
  Boolean(restoreFn && restoreFn[0].includes("return;") && restoreFn[0].indexOf("return;") < restoreFn[0].indexOf("pwrPush")),
);
assert(
  "T3 no-op skip pwrPush (next === before)",
  Boolean(restoreFn && restoreFn[0].includes("next === before") && restoreFn[0].indexOf("next === before") < restoreFn[0].indexOf("pwrPush")),
);
assert(
  "T3 does not invent prev week from live",
  Boolean(restoreFn && !restoreFn[0].includes("prevRosterWeekFrom: weekFrom") && !restoreFn[0].includes("prevRosterWeekTo: weekTo")),
);
assert("T3 cross-week would not show → no push", shouldShowPayrollPrevRecoveryBanner(liveCurrent9h, prevOldRich, bindCross) === false);

// T4 — same-week + richer + explicit binding preserves overlay
assert("T4 same-week richer banner ON", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich, bindSame) === true);
const restored = applyPrevRecoveryToLiveRoster(liveThin, prevRich, bindSame);
assert("T4 restore keeps live UUID", restored[0].id === "live-1");
assert("T4 restore overlays days", restored[0].days.Pn.active === true);
assert("T4 restore richer metrics", payrollMetrics(restored).totalHours > payrollMetrics(liveThin).totalHours);

assert("D4 banner OFF no overlap (bound)", shouldShowPayrollPrevRecoveryBanner(
  [emp("l2", "dir-X", daysInactive)],
  [emp("p2", "dir-Y", daysActive)],
  bindSame,
) === false);

// Archive banner still independent (≠ D4)
assert("archive banner ON separately", shouldShowPayrollRestoreBanner(liveThin, archiveRich) === true);
assert(
  "D4 does not import archive banner",
  !readFileSync(new URL("../src/lib/payroll-prev-recovery.ts", import.meta.url), "utf8")
    .includes("shouldShowPayrollRestoreBanner(")
  && !readFileSync(new URL("../src/lib/payroll-prev-recovery.ts", import.meta.url), "utf8")
    .match(/import\s*\{[^}]*shouldShowPayrollRestoreBanner/),
);

const slices = overlappingPrevLiveSlices(liveThin, prevRich);
assert("overlap slices", slices && slices.liveOverlap.length === 1);

// T5 — same-week but not richer
assert("T5 equal hours banner OFF", shouldShowPayrollPrevRecoveryBanner(prevRich, prevRich, bindSame) === false);
assert("T5 live richer than prev banner OFF", shouldShowPayrollPrevRecoveryBanner(prevRich, liveThin, bindSame) === false);

// T6 — unbound rotational -prev
assert("T6 unbound 2-arg banner OFF", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich) === false);
assert("T6 live-week-only banner OFF", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich, bindLiveOnly) === false);
assert("T6 canApply unbound false", canApplyPayrollPrevRecovery(bindLiveOnly) === false);
const t6 = applyPrevRecoveryToLiveRoster(liveThin, prevRich);
assert("T6 unbound restore no-op", t6 === liveThin);

// T7 — kill-switch still OFF even with same-week richer binding
localStorage.setItem("wg-payroll-recovery-banner-prev", "0");
assert("T7 kill-switch disables banner", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich, bindSame) === false);
assert("T7 kill-switch helper false", isPayrollPrevRecoveryBannerEnabled() === false);
localStorage.removeItem("wg-payroll-recovery-banner-prev");

// --- D5 Soft Restore ---
const weekFrom = "2026-07-20";
const weekTo = "2026-07-25";
const rich = emp("r1", "dir-sr", daysActive, "Tomek");
rememberPayrollSoftRestoreSnapshot(rich, weekFrom, weekTo);
assert("session remembered", peekPayrollSoftRestoreSession("dir-sr", weekFrom, weekTo) != null);

const dir = {
  id: "dir-sr",
  name: "Tomek",
  phone: "",
  position: "Murarz",
  defaultRate: "30",
  active: true,
};
const created = weekEmployeeFromDir(dir);
assert("factory PURE defaultDays", created.days.Pn.active === false && created.days.Pn.from === defaultDay().from);
assert("factory new UUID", created.id !== "r1");

const { roster: soft, restoredDirectoryIds } = applyPayrollSoftRestoreOverlay([created], {
  weekFrom,
  weekTo,
  prevRoster: [],
});
assert("soft restore applied", restoredDirectoryIds.includes("dir-sr"));
assert("soft restore hours", soft[0].days.Pn.active === true);
assert("soft restore new id kept", soft[0].id === created.id);
assert("session cleared after apply", peekPayrollSoftRestoreSession("dir-sr", weekFrom, weekTo) == null);

// preferEmpty — AC-D5-2
rememberPayrollSoftRestoreSnapshot(rich, weekFrom, weekTo);
const created2 = weekEmployeeFromDir(dir);
const emptyAdd = applyPayrollSoftRestoreOverlay([created2], {
  weekFrom,
  weekTo,
  preferEmptyHours: true,
});
assert("preferEmpty skips overlay", emptyAdd.restoredDirectoryIds.length === 0);
assert("preferEmpty stays defaultDay", emptyAdd.roster[0].days.Pn.active === false);
clearPayrollSoftRestoreSnapshot("dir-sr");

// Soft restore from -prev when no session — same-week binding required
const created3 = weekEmployeeFromDir({ ...dir, id: "dir-prev-only" });
const fromPrev = applyPayrollSoftRestoreOverlay([created3], {
  weekFrom,
  weekTo,
  prevRoster: [emp("px", "dir-prev-only", daysActive, "Jan")],
  prevRosterWeekFrom: weekFrom,
  prevRosterWeekTo: weekTo,
});
assert("soft from -prev", fromPrev.restoredDirectoryIds.includes("dir-prev-only"));
assert("soft from -prev hours", fromPrev.roster[0].days.Pn.active === true);

// Unbound rotational -prev must NOT restore (cross-week guard)
const created3b = weekEmployeeFromDir({ ...dir, id: "dir-prev-unbound" });
const fromPrevUnbound = applyPayrollSoftRestoreOverlay([created3b], {
  weekFrom,
  weekTo,
  prevRoster: [emp("px2", "dir-prev-unbound", daysActive, "Jan")],
});
assert("unbound -prev skips hours", fromPrevUnbound.restoredDirectoryIds.length === 0);
assert("unbound -prev stays empty", fromPrevUnbound.roster[0].days.Pn.active === false);

// weekEmployeeFromDir source PURE (no soft restore in factory)
const factorySrc = readFileSync(new URL("../src/app/app-domain.ts", import.meta.url), "utf8");
const fnMatch = factorySrc.match(/export function weekEmployeeFromDir[\s\S]*?\n\}/);
assert("factory body has defaultDays", fnMatch && fnMatch[0].includes("defaultDays()"));
assert("factory body no soft restore", fnMatch && !fnMatch[0].includes("softRestore") && !fnMatch[0].includes("SoftRestore"));

// W1/W2 regression markers — D2/D3 untouched
const gateSrc = readFileSync(new URL("../src/lib/payroll-hours-collapse-gate.ts", import.meta.url), "utf8");
assert("D2 gate still present", gateSrc.includes("detectHoursCollapse") && gateSrc.includes("intentionalHoursClear"));
const d1Src = readFileSync(new URL("../src/lib/payroll-write-path-telemetry.ts", import.meta.url), "utf8");
assert("D1 telemetry still present", d1Src.includes("emitPayrollWritePathTelemetry"));

// UI copy ≠ archive
const viewSrc = readFileSync(new URL("../src/app/PayrollView.tsx", import.meta.url), "utf8");
assert("UI has -prev banner copy", viewSrc.includes("Przywróć z -prev") || viewSrc.includes("data-payroll-prev-recovery-banner"));
assert("UI has Dodaj puste", viewSrc.includes("preferEmptyHours") || viewSrc.includes("Dodaj puste"));

console.log(`\nD4+D5 results: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
