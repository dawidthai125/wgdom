/**
 * PAYROLL-CLOUD-RESURRECTION-01 — unit tests
 * Run: npx vite-node scripts/test-payroll-cloud-resurrection-01.mjs
 */
import {
  evaluatePayrollResurrectionFence,
  payrollRosterFingerprint,
  stripLocalOnlyArchiveWeek,
  bootstrapPayrollPushAllowed,
  PAYROLL_RESURRECTION_01,
} from "../src/lib/payroll-bootstrap-resurrection-fence.ts";
import {
  mergeWeekEmployeesForWeekRange,
  mergeArchive,
  applyBootstrapPayrollMerge,
  bootstrapMergedShouldPush,
  DATA_KEYS,
  normalizeArrayValue,
} from "../src/lib/cloud-sync.ts";

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

function makeEmp(id, dayPattern = "111110") {
  const days = {};
  DAYS.forEach((k, i) => {
    const active = dayPattern[i] === "1";
    days[k] = {
      active,
      from: "07:00",
      to: "16:00",
      zaliczka: "",
      extraHours: [],
    };
  });
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    rate: "30",
    days,
    prevSaturday: { active: false, from: "", to: "", zaliczka: "" },
    extraCosts: [],
    settled: true,
  };
}

function emptyBundle(from, to, emps, archive) {
  const values = DATA_KEYS.map(() => null);
  values[DATA_KEYS.indexOf("kw-weekFrom")] = from;
  values[DATA_KEYS.indexOf("kw-weekTo")] = to;
  values[DATA_KEYS.indexOf("kw-week-employees")] = emps;
  values[DATA_KEYS.indexOf("kw-archive")] = archive;
  return values;
}

assert("principle id", PAYROLL_RESURRECTION_01 === "PAYROLL-CLOUD-RESURRECTION-01");

// --- T1: fence detects clone of historical archive ---
{
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const roster = [makeEmp("a", "111110"), makeEmp("b", "010110")];
  const archive = [
    {
      id: "arch-prev",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-19T16:00:00.000Z",
    },
  ];
  const fence = evaluatePayrollResurrectionFence({
    localEmps: roster,
    cloudEmps: [],
    localFrom: cur.from,
    localTo: cur.to,
    cloudFrom: cur.from,
    cloudTo: cur.to,
    localArchive: [
      ...archive,
      {
        id: "arch-cur-clone",
        weekFrom: cur.from,
        weekTo: cur.to,
        weekEmployees: roster.map((e) => ({ ...e })),
        savedAt: "2026-07-19T21:39:00.000Z",
      },
    ],
    cloudArchive: archive,
    calendarFrom: cur.from,
    calendarTo: cur.to,
  });
  assert("T1 preferCloudEmpty", fence.preferCloudEmptyRoster === true);
  assert("T1 block push emps", fence.blockBootstrapPushWeekEmployees === true);
  assert("T1 fingerprint match", payrollRosterFingerprint(roster) === payrollRosterFingerprint(archive[0].weekEmployees));
}

// --- T2: legitimate new-week local (different fingerprint) may push ---
{
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const oldRoster = [makeEmp("a", "111110")];
  const newRoster = [makeEmp("a", "100000")]; // different pattern
  const fence = evaluatePayrollResurrectionFence({
    localEmps: newRoster,
    cloudEmps: [],
    localFrom: cur.from,
    localTo: cur.to,
    cloudFrom: cur.from,
    cloudTo: cur.to,
    localArchive: [
      {
        id: "arch-prev",
        weekFrom: prev.from,
        weekTo: prev.to,
        weekEmployees: oldRoster,
        savedAt: "2026-07-19T16:00:00.000Z",
      },
    ],
    cloudArchive: [
      {
        id: "arch-prev",
        weekFrom: prev.from,
        weekTo: prev.to,
        weekEmployees: oldRoster,
        savedAt: "2026-07-19T16:00:00.000Z",
      },
    ],
    calendarFrom: cur.from,
    calendarTo: cur.to,
  });
  assert("T2 no fence for genuine new hours", fence.preferCloudEmptyRoster === false);
  assert(
    "T2 push allowed",
    bootstrapPayrollPushAllowed({
      key: "kw-week-employees",
      mergedValue: newRoster,
      cloudValue: [],
      fence,
    }).allow === true,
  );
}

// --- T3: mergeWeekEmployeesForWeekRange picks cloud empty on stale clone ---
{
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = [makeEmp("x", "111110"), makeEmp("y", "111110")];
  const archive = [
    {
      id: "p",
      weekFrom: prev.from,
      weekTo: prev.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-19T16:00:00.000Z",
    },
    {
      id: "c",
      weekFrom: cur.from,
      weekTo: cur.to,
      weekEmployees: roster.map((e) => ({ ...e })),
      savedAt: "2026-07-19T21:39:00.000Z",
    },
  ];
  const merged = mergeWeekEmployeesForWeekRange(
    cur.from,
    cur.to,
    cur.from,
    cur.to,
    roster,
    cur.from,
    cur.to,
    [],
    archive,
  );
  assert("T3 merge picks empty cloud", Array.isArray(merged) && merged.length === 0);
}

// --- T4: mergeArchive suppresses local-only current week when cloud live empty ---
{
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = [makeEmp("z")];
  const localArch = [
    { id: "prev", weekFrom: prev.from, weekTo: prev.to, weekEmployees: roster, savedAt: "a" },
    { id: "cur", weekFrom: cur.from, weekTo: cur.to, weekEmployees: roster, savedAt: "b" },
  ];
  const cloudArch = [
    { id: "prev", weekFrom: prev.from, weekTo: prev.to, weekEmployees: roster, savedAt: "a" },
  ];
  const out = mergeArchive(localArch, cloudArch, [], {
    cloudLiveFrom: cur.from,
    cloudLiveTo: cur.to,
    cloudLiveEmpty: true,
  });
  assert(
    "T4 no local-only current archive",
    !out.some((w) => w.weekFrom === cur.from && w.weekTo === cur.to),
  );
  assert("T4 keeps prev archive", out.some((w) => w.weekFrom === prev.from));
}

// --- T5: bootstrap merge dual-session simulation ---
{
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const prev = { from: "2026-07-13", to: "2026-07-18" };
  const roster = Array.from({ length: 5 }, (_, i) => makeEmp(`s${i}`, "111110"));
  const archPrev = {
    id: "prev",
    weekFrom: prev.from,
    weekTo: prev.to,
    weekEmployees: roster.map((e) => ({ ...e })),
    savedAt: "2026-07-19T16:12:33.202Z",
  };
  const archClone = {
    id: "b7acb87d-clone",
    weekFrom: cur.from,
    weekTo: cur.to,
    weekEmployees: roster.map((e) => ({ ...e })),
    savedAt: "2026-07-19T21:39:05.077Z",
  };

  // Session A after recovery: cloud empty
  const cloudValues = emptyBundle(cur.from, cur.to, [], [archPrev]);
  // Session B stale LS
  const localValues = emptyBundle(cur.from, cur.to, roster, [archPrev, archClone]);

  const preMerged = DATA_KEYS.map((key, i) => {
    if (key === "kw-week-employees") {
      return mergeWeekEmployeesForWeekRange(
        cur.from,
        cur.to,
        localValues[DATA_KEYS.indexOf("kw-weekFrom")],
        localValues[DATA_KEYS.indexOf("kw-weekTo")],
        localValues[i],
        cloudValues[DATA_KEYS.indexOf("kw-weekFrom")],
        cloudValues[DATA_KEYS.indexOf("kw-weekTo")],
        cloudValues[i],
        localValues[DATA_KEYS.indexOf("kw-archive")],
      );
    }
    if (key === "kw-archive") {
      return mergeArchive(
        normalizeArrayValue(localValues[i]),
        normalizeArrayValue(cloudValues[i]),
        [],
        { cloudLiveFrom: cur.from, cloudLiveTo: cur.to, cloudLiveEmpty: true },
      );
    }
    if (key === "kw-weekFrom" || key === "kw-weekTo") return cloudValues[i] ?? localValues[i];
    return localValues[i] ?? cloudValues[i];
  });

  const merged = applyBootstrapPayrollMerge(preMerged, localValues, cloudValues);
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const archIdx = DATA_KEYS.indexOf("kw-archive");
  const emps = normalizeArrayValue(merged[empIdx]);
  const arch = normalizeArrayValue(merged[archIdx]);
  assert("T5 dual-session merged live empty", emps.length === 0);
  assert(
    "T5 dual-session no clone archive 20-25",
    !arch.some((w) => w.weekFrom === cur.from && (w.weekEmployees?.length || 0) > 0),
  );

  const fence = evaluatePayrollResurrectionFence({
    localEmps: localValues[empIdx],
    cloudEmps: cloudValues[empIdx],
    localFrom: cur.from,
    localTo: cur.to,
    cloudFrom: cur.from,
    cloudTo: cur.to,
    localArchive: localValues[archIdx],
    cloudArchive: cloudValues[archIdx],
    calendarFrom: cur.from,
    calendarTo: cur.to,
  });
  assert(
    "T5 bootstrap push blocked",
    bootstrapMergedShouldPush("kw-week-employees", roster, [], fence) === false,
  );
}

// --- T6: stripLocalOnlyArchiveWeek ---
{
  const cur = { from: "2026-07-20", to: "2026-07-25" };
  const merged = [
    { weekFrom: "2026-07-13", weekTo: "2026-07-18", weekEmployees: [makeEmp("1")] },
    { weekFrom: cur.from, weekTo: cur.to, weekEmployees: [makeEmp("1")] },
  ];
  const cloud = [{ weekFrom: "2026-07-13", weekTo: "2026-07-18", weekEmployees: [makeEmp("1")] }];
  const stripped = stripLocalOnlyArchiveWeek(merged, cloud, cur.from, cur.to);
  assert("T6 stripped current", stripped.length === 1 && stripped[0].weekFrom === "2026-07-13");
}

console.log(`\nPAYROLL-CLOUD-RESURRECTION-01: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
