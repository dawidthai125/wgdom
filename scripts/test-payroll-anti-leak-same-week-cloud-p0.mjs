/**
 * PAYROLL-ANTI-LEAK-FIX-01 — T-AL-01 / T-AL-04 / T-AL-05 (subset)
 * Run: npx vite-node scripts/test-payroll-anti-leak-same-week-cloud-p0.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-payroll-anti-leak-01";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-payroll-anti-leak-01";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

const kvStore = {};
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const { keys } = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }) };
  }
  if (u.includes("/batch-set")) {
    const { keys, values } = JSON.parse(opts.body);
    keys.forEach((k, i) => { kvStore[k] = values[i]; });
    return { ok: true, text: async () => "" };
  }
  return { ok: false, status: 404 };
};

const { defaultDay } = await import("../src/app/app-domain.ts");
const {
  DATA_KEYS,
  computeMergedDataBundle,
  applyBootstrapPayrollMerge,
  mergeAllDataKeys,
  finalizePayrollBundleMerge,
  applyRuntimePayrollAntiLeak,
  weekEmployeesListRichness,
} = await import("../src/lib/cloud-sync.ts");

const W_PREV = { from: "2026-07-06", to: "2026-07-11" };
const W_CUR = { from: "2026-07-13", to: "2026-07-18" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays(activePnOnly = true) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "Pn" && activePnOnly
        ? { ...d, active: true, from: "07:00", to: "16:00" }
        : k === "So"
          ? d
          : { ...d, active: false, from: "07:00", to: "16:00" },
    ]),
  );
}

function makeEmp(id, dirId, name, opts = {}) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: opts.days ?? defaultDays(true),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-07-13T06:12:00.000Z",
  };
}

function richRoster(n, weekStyle = "full") {
  return Array.from({ length: n }, (_, i) =>
    makeEmp(
      `emp-${i + 1}`,
      `dir-${i + 1}`,
      `Pracownik ${i + 1}`,
      weekStyle === "pn"
        ? { days: defaultDays(true), dataUpdatedAt: "2026-07-13T06:12:00.000Z" }
        : {
            days: Object.fromEntries(
              DAYS.map((k) => [
                k,
                k === "So"
                  ? defaultDay()
                  : { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
              ]),
            ),
            dataUpdatedAt: "2026-06-08T10:00:00.000Z",
          },
    ),
  );
}

function buildArchiveSnapshot(weekFrom, weekTo, weekEmployees) {
  return {
    id: `arch-${weekFrom}`,
    weekFrom,
    weekTo,
    savedAt: new Date().toISOString(),
    weekEmployees,
    employees: weekEmployees.map((e) => ({ name: e.name, position: e.position })),
    jobs: [],
  };
}

function emptyBundle() {
  return DATA_KEYS.map(() => null);
}

function bundleFromAdminShape({
  directory = [],
  weekEmployees = [],
  savedWeeks = [],
  weekFrom = "",
  weekTo = "",
}) {
  const b = emptyBundle();
  b[DATA_KEYS.indexOf("kw-directory")] = directory;
  b[DATA_KEYS.indexOf("kw-week-employees")] = weekEmployees;
  b[DATA_KEYS.indexOf("kw-archive")] = savedWeeks;
  b[DATA_KEYS.indexOf("kw-weekFrom")] = weekFrom;
  b[DATA_KEYS.indexOf("kw-weekTo")] = weekTo;
  return b;
}

function empCount(bundle) {
  const i = DATA_KEYS.indexOf("kw-week-employees");
  const emps = bundle[i];
  return Array.isArray(emps) ? emps.length : 0;
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

console.log("=== PAYROLL ANTI-LEAK FIX-01 — same-week cloud P0 ===\n");

const prevRoster = richRoster(15, "full");
const curRoster = richRoster(14, "pn");
const archive = [buildArchiveSnapshot(W_PREV.from, W_PREV.to, prevRoster)];
const directory = prevRoster.map((e) => ({
  id: e.directoryId,
  name: e.name,
  phone: e.phone,
  position: e.position,
  rate: e.rate,
  active: true,
}));

// —— T-AL-01 / T-AL-04: prod scenario — stale React + empty LS, cloud 14 same week ——
Object.keys(kvStore).forEach((k) => delete kvStore[k]);
Object.keys(lsStore).forEach((k) => delete lsStore[k]);

kvStore["kw-weekFrom"] = W_CUR.from;
kvStore["kw-weekTo"] = W_CUR.to;
kvStore["kw-week-employees"] = curRoster;
kvStore["kw-archive"] = archive;
kvStore["kw-directory"] = directory;

lsStore["kw-weekFrom"] = JSON.stringify(W_CUR.from);
lsStore["kw-weekTo"] = JSON.stringify(W_CUR.to);
lsStore["kw-archive"] = JSON.stringify(archive);

const staleBundle = bundleFromAdminShape({
  directory,
  weekEmployees: [],
  savedWeeks: archive,
  weekFrom: W_CUR.from,
  weekTo: W_CUR.to,
});

const { merged: focusMerged } = await computeMergedDataBundle(staleBundle);
const focusCount = empCount(focusMerged);

assert("T-AL-01 same-week cloud 14 — anti-leak OFF — roster stays 14", focusCount === 14);
assert("T-AL-04 focus pull path — computeMergedDataBundle keeps 14", focusCount === 14);

// —— T-AL-02: historical rollover leak — stale archive republish (T3 parity) ——
const W1 = { from: "2026-06-22", to: "2026-06-28" };
const W2 = { from: "2026-06-29", to: "2026-07-04" };
const w1Roster = richRoster(8, "full");
const w1Archive = [buildArchiveSnapshot(W1.from, W1.to, w1Roster)];
const w1Directory = w1Roster.map((e) => ({
  id: e.directoryId,
  name: e.name,
  phone: e.phone,
  position: e.position,
  rate: e.rate,
  active: true,
}));

Object.keys(kvStore).forEach((k) => delete kvStore[k]);
Object.keys(lsStore).forEach((k) => delete lsStore[k]);

kvStore["kw-weekFrom"] = W2.from;
kvStore["kw-weekTo"] = W2.to;
kvStore["kw-week-employees"] = w1Roster;
kvStore["kw-archive"] = w1Archive;
kvStore["kw-directory"] = w1Directory;

lsStore["kw-weekFrom"] = JSON.stringify(W2.from);
lsStore["kw-weekTo"] = JSON.stringify(W2.to);
lsStore["kw-archive"] = JSON.stringify(w1Archive);

const leakBundle = bundleFromAdminShape({
  directory: w1Directory,
  weekEmployees: [],
  savedWeeks: w1Archive,
  weekFrom: W2.from,
  weekTo: W2.to,
});

const { merged: leakMerged } = await computeMergedDataBundle(leakBundle);
assert("T-AL-02 stale archive republish — anti-leak ON — roster 0", empCount(leakMerged) === 0);

// —— T-AL-02b: cross-week cloud keys (local W2, cloud KV still W1) ——
kvStore["kw-weekFrom"] = W1.from;
kvStore["kw-weekTo"] = W1.to;
kvStore["kw-week-employees"] = w1Roster;

const crossBundle = bundleFromAdminShape({
  directory: w1Directory,
  weekEmployees: [],
  savedWeeks: w1Archive,
  weekFrom: W2.from,
  weekTo: W2.to,
});

const { merged: crossMerged } = await computeMergedDataBundle(crossBundle);
assert("T-AL-02b cross-week cloud keys — anti-leak ON — roster 0", empCount(crossMerged) === 0);

// —— T-AL-05: bootstrap path — no anti-leak in applyBootstrapPayrollMerge ——
const localVals = emptyBundle();
localVals[DATA_KEYS.indexOf("kw-week-employees")] = [];
localVals[DATA_KEYS.indexOf("kw-weekFrom")] = W_CUR.from;
localVals[DATA_KEYS.indexOf("kw-weekTo")] = W_CUR.to;
localVals[DATA_KEYS.indexOf("kw-archive")] = archive;

const cloudVals = emptyBundle();
cloudVals[DATA_KEYS.indexOf("kw-week-employees")] = curRoster;
cloudVals[DATA_KEYS.indexOf("kw-weekFrom")] = W_CUR.from;
cloudVals[DATA_KEYS.indexOf("kw-weekTo")] = W_CUR.to;
cloudVals[DATA_KEYS.indexOf("kw-archive")] = archive;

const mergedBase = mergeAllDataKeys(localVals, cloudVals);
const bootstrapOut = applyBootstrapPayrollMerge(mergedBase, localVals, cloudVals);
assert("T-AL-05 bootstrap adopts same-week cloud roster", empCount(bootstrapOut) === 14);

// Direct anti-leak unit: same week SSOT skip
const afterFinalize = mergeAllDataKeys(localVals, cloudVals);
const finalized = finalizePayrollBundleMerge(afterFinalize, localVals, cloudVals);
const antiOut = applyRuntimePayrollAntiLeak(finalized, localVals, cloudVals);
assert("T-AL-01 direct applyRuntimePayrollAntiLeak — keeps 14", empCount(antiOut) === 14);

assert("archive richness >= 8", weekEmployeesListRichness(prevRoster) >= 8);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
