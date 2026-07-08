/**
 * PAYROLL-RACE-01 — stale apply reconcile + guard parity
 * Run: npx vite-node scripts/test-payroll-race-apply-reconcile.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeJobsById,
  mergeWeekEmployees,
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

function makeEmp(id, opts = {}) {
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

function makeJob(id, workEntries = [], updatedAt = "2026-07-08T08:00:00.000Z") {
  return {
    id,
    address: `Ulica ${id}`,
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
    workEntries,
    materials: [],
    photos: [],
    keysHandedOver: false,
    updatedAt,
  };
}

function emptyBundle() {
  return DATA_KEYS.map(() => null);
}

function bundleWithPayroll(weekEmployees, jobs) {
  const bundle = emptyBundle();
  bundle[DATA_KEYS.indexOf("kw-week-employees")] = weekEmployees;
  bundle[DATA_KEYS.indexOf("kw-jobs")] = jobs;
  return bundle;
}

function empDayActive(emp, dayKey) {
  return Boolean(emp?.days?.[dayKey]?.active);
}

function jobHasEntry(jobs, entryId) {
  return (jobs ?? []).some((j) => (j.workEntries ?? []).some((e) => e.id === entryId));
}

function syncPipeline(staleMerged, fresh) {
  const reconciled = reconcilePayrollKeysWithFreshLocal(staleMerged, fresh);
  return reconciled;
}

console.log("=== T-RACE-01 — fresh day edit survives stale merged (AC1) ===");
{
  const staleEmp = makeEmp("e1");
  const freshDays = defaultDays();
  freshDays.Wt = { ...defaultDay(), active: true, from: "07:00", to: "16:00" };
  const freshEmp = makeEmp("e1", {
    days: freshDays,
    dataUpdatedAt: "2026-07-08T09:00:00.000Z",
  });
  const staleMerged = bundleWithPayroll([staleEmp], []);
  const out = syncPipeline(staleMerged, { weekEmployees: [freshEmp], jobs: [] });
  const emps = out[DATA_KEYS.indexOf("kw-week-employees")];
  assert(empDayActive(emps[0], "Wt"), "T-RACE-01 Wt active after reconcile");
}

console.log("\n=== T-RACE-02 — fresh workEntry survives stale merged jobs (AC2) ===");
{
  const entry = {
    id: "we-race-1",
    directoryId: "dir-e1",
    employeeName: "Jan",
    date: "2026-07-08",
    hours: 8,
    rate: 50,
    notes: "fresh",
  };
  const staleJob = makeJob("j1", []);
  const freshJob = makeJob("j1", [entry], "2026-07-08T09:00:00.000Z");
  const staleMerged = bundleWithPayroll([], [staleJob]);
  const out = syncPipeline(staleMerged, { weekEmployees: [], jobs: [freshJob] });
  const jobs = out[DATA_KEYS.indexOf("kw-jobs")];
  assert(jobHasEntry(jobs, "we-race-1"), "T-RACE-02 workEntry present after reconcile");
}

console.log("\n=== T-RACE-03 — two employees, two fresh day edits (AC1) ===");
{
  const stale = [makeEmp("e1"), makeEmp("e2")];
  const fresh1Days = defaultDays();
  fresh1Days.Pn = { ...defaultDay(), active: true, from: "07:00", to: "15:00" };
  const fresh2Days = defaultDays();
  fresh2Days.Cz = { ...defaultDay(), active: true, from: "08:00", to: "16:00" };
  const fresh = [
    makeEmp("e1", { days: fresh1Days, dataUpdatedAt: "2026-07-08T09:01:00.000Z" }),
    makeEmp("e2", { days: fresh2Days, dataUpdatedAt: "2026-07-08T09:02:00.000Z" }),
  ];
  const out = syncPipeline(bundleWithPayroll(stale, []), { weekEmployees: fresh, jobs: [] });
  const emps = out[DATA_KEYS.indexOf("kw-week-employees")];
  assert(empDayActive(emps.find((e) => e.id === "e1"), "Pn"), "T-RACE-03 e1 Pn");
  assert(empDayActive(emps.find((e) => e.id === "e2"), "Cz"), "T-RACE-03 e2 Cz");
}

console.log("\n=== T-RACE-04 — helper touches only payroll keys ===");
{
  const dirIdx = DATA_KEYS.indexOf("kw-directory");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const bundle = emptyBundle();
  bundle[dirIdx] = [{ id: "d1", name: "A", phone: "", position: "X", defaultRate: "1", active: true }];
  bundle[archIdx] = [{ weekFrom: "2026-01-01", weekTo: "2026-01-07", weekEmployees: [] }];
  const sentinelDir = bundle[dirIdx];
  const sentinelArch = bundle[archIdx];
  const out = reconcilePayrollKeysWithFreshLocal(bundle, { weekEmployees: [], jobs: [] });
  assert(out[dirIdx] === sentinelDir, "T-RACE-04 kw-directory unchanged");
  assert(out[archIdx] === sentinelArch, "T-RACE-04 kw-archive unchanged");
}

console.log("\n=== T-RACE-05 — null fresh falls back to merge semantics (AC9 baseline) ===");
{
  const local = [makeEmp("e1")];
  const cloud = [makeEmp("e1", { dataUpdatedAt: "2026-07-08T07:00:00.000Z" })];
  const mergedEmps = mergeWeekEmployees(local, cloud);
  const staleMerged = bundleWithPayroll(mergedEmps, []);
  const out = reconcilePayrollKeysWithFreshLocal(staleMerged, {
    weekEmployees: null,
    jobs: null,
  });
  const emps = out[DATA_KEYS.indexOf("kw-week-employees")];
  assert(Array.isArray(emps) && emps.length === 1, "T-RACE-05 employee preserved");
}

console.log("\n=== T-RACE-06 — stress 15 emp × 100 edits (AC6) ===");
{
  let lost = 0;
  const baseline = Array.from({ length: 15 }, (_, i) => makeEmp(`emp-${i}`));
  const emps = baseline.map((e) => ({ ...e, days: { ...e.days } }));
  for (let iter = 0; iter < 100; iter++) {
    const idx = iter % 15;
    const dayKey = DAYS[iter % DAYS.length];
    const active = iter % 2 === 0;
    emps[idx] = {
      ...emps[idx],
      days: {
        ...emps[idx].days,
        [dayKey]: { ...defaultDay(), active, from: "07:00", to: "16:00" },
      },
      dataUpdatedAt: new Date(2026, 6, 8, 10, 0, iter).toISOString(),
    };
    const staleMerged = bundleWithPayroll(baseline.map((e) => ({ ...e, days: { ...e.days } })), []);
    const out = syncPipeline(staleMerged, { weekEmployees: emps.map((e) => ({ ...e, days: { ...e.days } })), jobs: [] });
    const result = out[DATA_KEYS.indexOf("kw-week-employees")].find((e) => e.id === `emp-${idx}`);
    if (empDayActive(result, dayKey) !== active) lost += 1;
  }
  assert(lost === 0, `T-RACE-06 lost=${lost} (expect 0)`);
}

console.log("\n=== T-RACE-07 — stress 200 rapid edits mix days + jobs (AC7) ===");
{
  let lost = 0;
  const baselineEmps = Array.from({ length: 15 }, (_, i) => makeEmp(`s-${i}`));
  const emps = baselineEmps.map((e) => ({ ...e, days: { ...e.days } }));
  const baselineJobs = [makeJob("job-a", []), makeJob("job-b", [])];
  let jobs = baselineJobs.map((j) => ({ ...j, workEntries: [...(j.workEntries ?? [])] }));
  for (let iter = 0; iter < 200; iter++) {
    if (iter % 3 === 0) {
      const idx = iter % 15;
      const dayKey = DAYS[iter % DAYS.length];
      emps[idx] = {
        ...emps[idx],
        days: {
          ...emps[idx].days,
          [dayKey]: { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
        },
        dataUpdatedAt: new Date(2026, 6, 8, 11, 0, iter).toISOString(),
      };
      const staleMerged = bundleWithPayroll(
        baselineEmps.map((e) => ({ ...e, days: { ...e.days } })),
        baselineJobs.map((j) => ({ ...j, workEntries: [] })),
      );
      const out = syncPipeline(staleMerged, {
        weekEmployees: emps.map((e) => ({ ...e, days: { ...e.days } })),
        jobs: jobs.map((j) => ({ ...j, workEntries: [...(j.workEntries ?? [])] })),
      });
      const result = out[DATA_KEYS.indexOf("kw-week-employees")].find((e) => e.id === emps[idx].id);
      if (!empDayActive(result, dayKey)) lost += 1;
    } else {
      const entryId = `we-${iter}`;
      const entry = {
        id: entryId,
        directoryId: "dir-s0",
        employeeName: "Stress",
        date: "2026-07-08",
        hours: 4,
        rate: 50,
        notes: "",
      };
      jobs = [
        {
          ...jobs[0],
          workEntries: [...(jobs[0].workEntries ?? []), entry],
          updatedAt: new Date(2026, 6, 8, 11, 0, iter).toISOString(),
        },
        { ...jobs[1] },
      ];
      const staleMerged = bundleWithPayroll(
        baselineEmps.map((e) => ({ ...e, days: { ...e.days } })),
        baselineJobs.map((j) => ({ ...j, workEntries: [] })),
      );
      const out = syncPipeline(staleMerged, {
        weekEmployees: emps.map((e) => ({ ...e, days: { ...e.days } })),
        jobs: jobs.map((j) => ({ ...j, workEntries: [...(j.workEntries ?? [])] })),
      });
      const resultJobs = out[DATA_KEYS.indexOf("kw-jobs")];
      if (!jobHasEntry(resultJobs, entryId)) lost += 1;
    }
  }
  assert(lost === 0, `T-RACE-07 lost=${lost} (expect 0)`);
}

console.log("\n=== T-RACE-08 — mid-flight pull: edit after merged built (AC8) ===");
{
  const staleEmp = makeEmp("mid-1");
  const staleMerged = bundleWithPayroll([staleEmp], []);
  const freshDays = defaultDays();
  freshDays.Sr = { ...defaultDay(), active: true, from: "06:00", to: "14:00" };
  const midFlightFresh = makeEmp("mid-1", {
    days: freshDays,
    dataUpdatedAt: "2026-07-08T12:30:00.000Z",
  });
  const out = syncPipeline(staleMerged, { weekEmployees: [midFlightFresh], jobs: [] });
  const emps = out[DATA_KEYS.indexOf("kw-week-employees")];
  assert(empDayActive(emps[0], "Sr"), "T-RACE-08 mid-flight Sr survives apply");
}

console.log("\n=== T-RACE-09 — two-device: cloud delta without mid-flight local race (AC9) ===");
{
  const localJob = makeJob("j9", [], "2026-07-08T08:00:00.000Z");
  const cloudEntry = {
    id: "we-cloud",
    directoryId: "dir-9",
    employeeName: "Cloud",
    date: "2026-07-08",
    hours: 7,
    rate: 50,
    notes: "from device B",
  };
  const cloudJob = makeJob("j9", [cloudEntry], "2026-07-08T10:00:00.000Z");
  const mergedJobs = mergeJobsById([localJob], [cloudJob]);
  const staleMerged = bundleWithPayroll([], mergedJobs);
  const baseline = bundleWithPayroll([], mergedJobs);
  const out = syncPipeline(staleMerged, { weekEmployees: [], jobs: [localJob] });
  const outJobs = out[DATA_KEYS.indexOf("kw-jobs")];
  const baseJobs = baseline[DATA_KEYS.indexOf("kw-jobs")];
  assert(
    JSON.stringify(outJobs) === JSON.stringify(baseJobs),
    "T-RACE-09 reconcile equals normal merge when local unchanged during pull",
  );
  assert(jobHasEntry(outJobs, "we-cloud"), "T-RACE-09 cloud entry preserved");
}

console.log(`\n=== PAYROLL-RACE-01 reconcile: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
