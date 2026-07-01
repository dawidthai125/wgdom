/**
 * PAYROLL-CLOUD-RECOVERY P0 — merge po dodaniu z kartyoteki + dedup directoryId.
 * npx vite-node scripts/test-payroll-add-from-directory-merge-p0.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-payroll-add-p0";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-payroll-add-p0";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

const kvStore = {};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const { keys } = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }),
    };
  }
  if (u.includes("/batch-set")) {
    const { keys, values } = JSON.parse(opts.body);
    keys.forEach((k, i) => { kvStore[k] = values[i]; });
    return { ok: true, text: async () => "" };
  }
  return originalFetch(url, opts);
};

const { defaultDay } = await import("../src/app/app-domain.ts");
const {
  weekEmployeeFromDir,
  filterDirectoryForPayrollWeekAdd,
} = await import("../src/app/app-domain.ts");
const {
  DATA_KEYS,
  mergeWeekEmployees,
  weekEmployeeMergeKey,
  computeMergedDataBundle,
} = await import("../src/lib/cloud-sync.ts");

const WEEK = { from: "2026-06-23", to: "2026-06-28" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" },
    ]),
  );
}

function makeEmp({ id, directoryId, name, dataUpdatedAt }) {
  return {
    id,
    directoryId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
  };
}

function dirEntry(id, name) {
  return {
    id,
    name,
    phone: "+48 500 000 111",
    position: "Murarz",
    defaultRate: "45.00",
    startDate: "2026-01-01",
    active: true,
    notes: "",
  };
}

function bundleFromShape({ directory = [], weekEmployees = [], weekFrom = WEEK.from, weekTo = WEEK.to }) {
  const b = DATA_KEYS.map(() => null);
  b[DATA_KEYS.indexOf("kw-directory")] = directory;
  b[DATA_KEYS.indexOf("kw-week-employees")] = weekEmployees;
  b[DATA_KEYS.indexOf("kw-weekFrom")] = weekFrom;
  b[DATA_KEYS.indexOf("kw-weekTo")] = weekTo;
  return b;
}

function dirKeys(list) {
  return (Array.isArray(list) ? list : [])
    .map((e) => weekEmployeeMergeKey(e))
    .filter((k) => k.startsWith("dir:"))
    .sort();
}

function writeLs(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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

console.log("=== PAYROLL ADD FROM DIRECTORY MERGE P0 ===\n");

// T1 — local N+1 (nowy UUID), cloud N (stare UUID) → N+1 directoryId
console.log("T1 local N+1 vs stale cloud N");
{
  const base = [
    makeEmp({ id: "e1", directoryId: "dir-1", name: "Jan Kowalski" }),
    makeEmp({ id: "e2", directoryId: "dir-2", name: "Anna Nowak" }),
  ];
  const cloud = base.map((e) => ({ ...e }));
  const local = [
    ...base,
    makeEmp({ id: "new-uuid-x", directoryId: "dir-X", name: "Pracownik X" }),
  ];
  const merged = mergeWeekEmployees(local, cloud);
  assert("T1 count", merged.length === 3);
  assert("T1 has dir-X", dirKeys(merged).includes("dir:dir-X"));
  assert("T1 all base dirs", dirKeys(merged).includes("dir:dir-1") && dirKeys(merged).includes("dir:dir-2"));
}

// T2 — computeMergedDataBundle ze stale cloud po lokalnym dodaniu
console.log("\nT2 computeMergedDataBundle stale cloud");
{
  const directory = [dirEntry("dir-1", "Jan"), dirEntry("dir-X", "Nowy")];
  const cloudRoster = [makeEmp({ id: "c1", directoryId: "dir-1", name: "Jan" })];
  kvStore["kw-week-employees"] = cloudRoster;
  kvStore["kw-weekFrom"] = WEEK.from;
  kvStore["kw-weekTo"] = WEEK.to;
  kvStore["kw-directory"] = directory;

  const localRoster = [
    ...cloudRoster.map((e) => ({ ...e, id: "l1" })),
    makeEmp({ id: "l-new", directoryId: "dir-X", name: "Nowy" }),
  ];
  writeLs("kw-week-employees", localRoster);
  writeLs("kw-weekFrom", WEEK.from);
  writeLs("kw-weekTo", WEEK.to);

  const staleReact = bundleFromShape({ directory, weekEmployees: localRoster });
  const { merged } = await computeMergedDataBundle(staleReact);
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const mergedEmps = merged[empIdx];
  assert("T2 keeps dir-X", dirKeys(mergedEmps).includes("dir:dir-X"));
  assert("T2 count >= 2", Array.isArray(mergedEmps) && mergedEmps.length >= 2);
}

// T3 — brak dir-X po obu stronach → nie wraca znikąd
console.log("\nT3 remote removal — dir-X absent both sides");
{
  const local = [makeEmp({ id: "a", directoryId: "dir-1", name: "Jan" })];
  const cloud = [makeEmp({ id: "b", directoryId: "dir-2", name: "Anna" })];
  const merged = mergeWeekEmployees(local, cloud);
  assert("T3 no dir-X", !dirKeys(merged).includes("dir:dir-X"));
  assert("T3 union both", merged.length === 2);
}

// T4 — ten sam directoryId, różne UUID → jeden rekord
console.log("\nT4 same directoryId different UUID");
{
  const local = [makeEmp({ id: "local-id", directoryId: "dir-1", name: "Jan", dataUpdatedAt: "2026-06-01T10:00:00.000Z" })];
  const cloud = [makeEmp({ id: "cloud-id", directoryId: "dir-1", name: "Jan", dataUpdatedAt: "2026-06-02T10:00:00.000Z" })];
  const merged = mergeWeekEmployees(local, cloud);
  assert("T4 single record", merged.length === 1);
  assert("T4 directoryId", merged[0].directoryId === "dir-1");
}

// T5 — dedup addFromDirectory + directoryId on new records
console.log("\nT5 dedup filterDirectoryForPayrollWeekAdd + weekEmployeeFromDir");
{
  const directory = [dirEntry("dir-1", "Jan"), dirEntry("dir-2", "Anna")];
  const prev = [makeEmp({ id: "e1", directoryId: "dir-1", name: "Jan" })];
  const first = filterDirectoryForPayrollWeekAdd(directory, ["dir-1", "dir-2"], prev);
  assert("T5 first add only dir-2", first.length === 1 && first[0].id === "dir-2");
  const prevWithDir2 = [...prev, weekEmployeeFromDir(directory[1])];
  const second = filterDirectoryForPayrollWeekAdd(directory, ["dir-2"], prevWithDir2);
  assert("T5 second add empty when already assigned", second.length === 0);
  const created = weekEmployeeFromDir(directory[0]);
  assert("T5 weekEmployeeFromDir has directoryId", created.directoryId === "dir-1");
  let threw = false;
  try {
    weekEmployeeFromDir({ ...directory[0], id: "" });
  } catch {
    threw = true;
  }
  assert("T5 rejects missing directoryId", threw);
}

// T7 — sync dwóch urządzeń: A dodaje X, B dodaje Y → X + Y
console.log("\nT7 two-device concurrent add X + Y");
{
  const base = [
    makeEmp({ id: "b1", directoryId: "dir-1", name: "Base One" }),
    makeEmp({ id: "b2", directoryId: "dir-2", name: "Base Two" }),
  ];
  const cloudStale = base.map((e) => ({ ...e }));

  const localA = [
    ...base,
    makeEmp({ id: "uuid-A", directoryId: "dir-X", name: "Worker X" }),
  ];
  const localB = [
    ...base,
    makeEmp({ id: "uuid-B", directoryId: "dir-Y", name: "Worker Y" }),
  ];

  const afterA = mergeWeekEmployees(localA, cloudStale);
  const final = mergeWeekEmployees(localB, afterA);

  assert("T7 count N+2", final.length === 4);
  assert("T7 has dir-X", dirKeys(final).includes("dir:dir-X"));
  assert("T7 has dir-Y", dirKeys(final).includes("dir:dir-Y"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
