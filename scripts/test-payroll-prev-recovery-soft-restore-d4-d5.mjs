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

assert("prev richer than live", prevPayrollRicherThanLive(prevRich, liveThin) === true);
assert("D4 banner ON overlapping", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich) === true);
assert("D4 banner OFF equal", shouldShowPayrollPrevRecoveryBanner(prevRich, prevRich) === false);
assert("D4 banner OFF no overlap", shouldShowPayrollPrevRecoveryBanner(
  [emp("l2", "dir-X", daysInactive)],
  [emp("p2", "dir-Y", daysActive)],
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

const restored = applyPrevRecoveryToLiveRoster(liveThin, prevRich);
assert("restore keeps live UUID", restored[0].id === "live-1");
assert("restore overlays days", restored[0].days.Pn.active === true);
assert("restore richer metrics", payrollMetrics(restored).totalHours > payrollMetrics(liveThin).totalHours);

const slices = overlappingPrevLiveSlices(liveThin, prevRich);
assert("overlap slices", slices && slices.liveOverlap.length === 1);

// Kill-switch
localStorage.setItem("wg-payroll-recovery-banner-prev", "0");
assert("kill-switch disables banner", shouldShowPayrollPrevRecoveryBanner(liveThin, prevRich) === false);
assert("kill-switch helper false", isPayrollPrevRecoveryBannerEnabled() === false);
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

// Soft restore from -prev when no session
const created3 = weekEmployeeFromDir({ ...dir, id: "dir-prev-only" });
const fromPrev = applyPayrollSoftRestoreOverlay([created3], {
  weekFrom,
  weekTo,
  prevRoster: [emp("px", "dir-prev-only", daysActive, "Jan")],
});
assert("soft from -prev", fromPrev.restoredDirectoryIds.includes("dir-prev-only"));
assert("soft from -prev hours", fromPrev.roster[0].days.Pn.active === true);

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
