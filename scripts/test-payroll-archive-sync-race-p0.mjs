/**
 * PAYROLL-ARCHIVE-01 — kw-archive stale apply reconcile
 * Run: npx vite-node scripts/test-payroll-archive-sync-race-p0.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeArchive,
  reconcileArchiveWithFreshLocal,
  reconcilePayrollKeysWithFreshLocal,
} from "../src/lib/cloud-sync.ts";

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

function makeArchiveEmp(id, opts = {}) {
  const days = opts.days ?? defaultDays();
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name: opts.name ?? `Emp ${id}`,
    phone: "",
    position: "Murarz",
    rate: "50",
    days,
    settled: false,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-07-08T08:00:00.000Z",
  };
}

function makeWeekSnapshot(weekFrom, weekTo, weekEmployees, opts = {}) {
  return {
    id: opts.id ?? `week-${weekFrom}`,
    weekFrom,
    weekTo,
    savedAt: opts.savedAt ?? "2026-07-08T08:00:00.000Z",
    employees: [],
    totalEmployees: weekEmployees.length,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
    weekEmployees,
    workEntries: [],
  };
}

function emptyBundle() {
  return DATA_KEYS.map(() => null);
}

function bundleWithArchive(archiveWeeks) {
  const bundle = emptyBundle();
  bundle[DATA_KEYS.indexOf("kw-archive")] = archiveWeeks;
  return bundle;
}

function empDayActive(weekEmployees, empId, dayKey) {
  const emp = weekEmployees?.find((e) => e.id === empId);
  return Boolean(emp?.days?.[dayKey]?.active);
}

function archiveWeekEmployees(bundle) {
  const arch = bundle[DATA_KEYS.indexOf("kw-archive")];
  return arch?.[0]?.weekEmployees ?? [];
}

function stalePullMerge(staleLocalArchive, cloudArchive) {
  const mergedArchive = mergeArchive(staleLocalArchive, cloudArchive, []);
  return bundleWithArchive(mergedArchive);
}

function syncWithReconcile(staleLocalArchive, freshArchive, cloudArchive) {
  const staleMerged = stalePullMerge(staleLocalArchive, cloudArchive);
  return reconcileArchiveWithFreshLocal(staleMerged, freshArchive);
}

console.log("=== PA-T01 — fresh Pn edit in archive survives stale merged ===");
{
  const weekFrom = "2026-07-07";
  const weekTo = "2026-07-13";
  const staleEmp = makeArchiveEmp("piotrek", { name: "Piotrek" });
  const staleWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp]);
  const freshDays = defaultDays();
  freshDays.Pn = { ...defaultDay(), active: true, from: "07:00", to: "16:00" };
  const freshEmp = makeArchiveEmp("piotrek", {
    name: "Piotrek",
    days: freshDays,
    dataUpdatedAt: "2026-07-12T14:00:00.000Z",
  });
  const freshWeek = makeWeekSnapshot(weekFrom, weekTo, [freshEmp], {
    savedAt: "2026-07-12T14:00:01.000Z",
  });
  const cloudWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp], {
    savedAt: "2026-07-08T08:00:00.000Z",
  });
  const out = syncWithReconcile([staleWeek], [freshWeek], [cloudWeek]);
  assert(empDayActive(archiveWeekEmployees(out), "piotrek", "Pn"), "PA-T01 Pn active after reconcile");
}

console.log("\n=== PA-T02 — stale pull bez reconcile cofa Pn (regresja) ===");
{
  const weekFrom = "2026-07-07";
  const weekTo = "2026-07-13";
  const staleEmp = makeArchiveEmp("piotrek", { name: "Piotrek" });
  const staleWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp]);
  const freshDays = defaultDays();
  freshDays.Pn = { ...defaultDay(), active: true, from: "07:00", to: "16:00" };
  const freshEmp = makeArchiveEmp("piotrek", {
    name: "Piotrek",
    days: freshDays,
    dataUpdatedAt: "2026-07-12T14:00:00.000Z",
  });
  const freshWeek = makeWeekSnapshot(weekFrom, weekTo, [freshEmp]);
  const cloudWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp]);
  const staleMerged = stalePullMerge([staleWeek], [cloudWeek]);
  const empsBefore = archiveWeekEmployees(staleMerged);
  assert(!empDayActive(empsBefore, "piotrek", "Pn"), "PA-T02 stale merged Pn inactive (bug path)");
  const reconciled = reconcileArchiveWithFreshLocal(staleMerged, [freshWeek]);
  assert(empDayActive(archiveWeekEmployees(reconciled), "piotrek", "Pn"), "PA-T02 reconcile restores Pn");
}

console.log("\n=== PA-T03 — multi-round sync zachowuje archived edit ===");
{
  const weekFrom = "2026-06-30";
  const weekTo = "2026-07-06";
  const staleEmp = makeArchiveEmp("e1");
  const staleWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp]);
  const cloudWeek = makeWeekSnapshot(weekFrom, weekTo, [staleEmp]);
  const freshDays = defaultDays();
  freshDays.Wt = { ...defaultDay(), active: true, from: "08:00", to: "16:00" };
  const freshEmp = makeArchiveEmp("e1", {
    days: freshDays,
    dataUpdatedAt: "2026-07-12T15:00:00.000Z",
  });
  const freshWeek = makeWeekSnapshot(weekFrom, weekTo, [freshEmp]);
  for (let round = 1; round <= 3; round++) {
    const out = syncWithReconcile([staleWeek], [freshWeek], [cloudWeek]);
    assert(
      empDayActive(archiveWeekEmployees(out), "e1", "Wt"),
      `PA-T03 round ${round} Wt active`,
    );
  }
}

console.log("\n=== PA-T04 — helper touches only kw-archive ===");
{
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const dirIdx = DATA_KEYS.indexOf("kw-directory");
  const bundle = emptyBundle();
  const sentinelEmps = [makeArchiveEmp("live-1")];
  bundle[empIdx] = sentinelEmps;
  bundle[dirIdx] = [{ id: "d1", name: "A", phone: "", position: "X", defaultRate: "1", active: true }];
  bundle[DATA_KEYS.indexOf("kw-archive")] = [
    makeWeekSnapshot("2026-01-01", "2026-01-07", [makeArchiveEmp("a1")]),
  ];
  const freshArchive = [
    makeWeekSnapshot("2026-01-01", "2026-01-07", [
      makeArchiveEmp("a1", {
        days: { ...defaultDays(), Pn: { ...defaultDay(), active: true, from: "07:00", to: "15:00" } },
        dataUpdatedAt: "2026-07-12T16:00:00.000Z",
      }),
    ]),
  ];
  const out = reconcileArchiveWithFreshLocal(bundle, freshArchive);
  assert(out[empIdx] === sentinelEmps, "PA-T04 kw-week-employees unchanged");
  assert(out[dirIdx] === bundle[dirIdx], "PA-T04 kw-directory unchanged");
  assert(empDayActive(archiveWeekEmployees(out), "a1", "Pn"), "PA-T04 archive reconciled");
}

console.log("\n=== PA-T05 — payroll reconcile still isolated from archive ===");
{
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const bundle = emptyBundle();
  const sentinelArch = [makeWeekSnapshot("2026-02-01", "2026-02-07", [makeArchiveEmp("x1")])];
  bundle[archIdx] = sentinelArch;
  const out = reconcilePayrollKeysWithFreshLocal(bundle, { weekEmployees: [], jobs: [] });
  assert(out[archIdx] === sentinelArch, "PA-T05 kw-archive untouched by payroll reconcile");
}

console.log(`\n=== PAYROLL-ARCHIVE-01 reconcile: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
