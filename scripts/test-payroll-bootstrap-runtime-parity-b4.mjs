/**
 * B4 — bootstrap/runtime payroll merge SSOT parity
 * Run: npx vite-node scripts/test-payroll-bootstrap-runtime-parity-b4.mjs
 */
import { readFileSync, existsSync } from "fs";
import { defaultDay } from "../src/app/app-domain.ts";

process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-b4-parity";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-b4-parity";

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

const {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  finalizePayrollBundleMerge,
  applyRuntimePayrollAntiLeak,
  payrollMetrics,
  weekEmployeesListRichness,
  computeMergedDataBundle,
} = await import("../src/lib/cloud-sync.ts");

const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = { from: "2026-06-08", to: "2026-06-13" };
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

function emptyBundle() {
  return DATA_KEYS.map(() => null);
}

function bundleWithPayroll({ weekFrom, weekTo, weekEmployees, archive = [] }) {
  const b = emptyBundle();
  b[DATA_KEYS.indexOf("kw-weekFrom")] = weekFrom;
  b[DATA_KEYS.indexOf("kw-weekTo")] = weekTo;
  b[DATA_KEYS.indexOf("kw-week-employees")] = weekEmployees;
  b[DATA_KEYS.indexOf("kw-archive")] = archive;
  return b;
}

function defaultDays(active = true) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So"
        ? d
        : { ...d, active, from: "07:00", to: "16:00" },
    ]),
  );
}

function makeEmp(id, dirId, name, active = true) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: defaultDays(active),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function richRoster(n = 11) {
  return Array.from({ length: n }, (_, i) =>
    makeEmp(`emp-${i + 1}`, `dir-${i + 1}`, `Pracownik ${i + 1}`),
  );
}

function staleZeroHoursRoster(source) {
  return source.map((e) => ({
    ...e,
    days: Object.fromEntries(
      Object.entries(e.days || {}).map(([k, d]) => [k, { ...d, active: false }]),
    ),
    prevSaturday: { ...(e.prevSaturday || {}), active: false },
    dataUpdatedAt: "2026-06-02T12:00:00.000Z",
  }));
}

function runBootstrap(localValues, cloudValues) {
  const merged = mergeAllDataKeys(localValues, cloudValues);
  return applyBootstrapPayrollMerge(merged, localValues, cloudValues);
}

function runRuntime(localValues, cloudValues, valuesForMerge = localValues) {
  const merged = mergeAllDataKeys(localValues, cloudValues);
  let out = finalizePayrollBundleMerge(merged, valuesForMerge, cloudValues);
  out = applyRuntimePayrollAntiLeak(out, valuesForMerge, cloudValues);
  return out;
}

function runRuntimeFinalizeOnly(localValues, cloudValues, valuesForMerge = localValues) {
  const merged = mergeAllDataKeys(localValues, cloudValues);
  return finalizePayrollBundleMerge(merged, valuesForMerge, cloudValues);
}

function payrollSlice(bundle) {
  const i = DATA_KEYS.indexOf("kw-week-employees");
  return bundle[i];
}

function bundlesPayrollEqual(a, b) {
  return JSON.stringify(payrollSlice(a)) === JSON.stringify(payrollSlice(b));
}

function weekdayHours(list) {
  const arr = Array.isArray(list) ? list : [];
  let h = 0;
  const parse = (t) => {
    const m = String(t || "").match(/^(\d+):(\d+)$/);
    return m ? +m[1] * 60 + +m[2] : null;
  };
  for (const e of arr) {
    for (const d of Object.values(e.days || {})) {
      if (d?.active) {
        const f = parse(d.from);
        const to = parse(d.to);
        if (f != null && to != null && to > f) h += (to - f) / 60;
      }
    }
  }
  return +h.toFixed(1);
}

console.log("=== PAYROLL BOOTSTRAP/RUNTIME PARITY B4 ===\n");

// —— B4-T1 P11 — local 0h vs cloud rich (ten sam tydzień) ——
console.log("B4-T1 P11 bootstrap/runtime parity");
let cloudEmps;
let weekFrom;
let weekTo;
const p11Backup = "backups/auto/wgdom-full-2026-06-02T07-51-08/kv-data.json";
if (existsSync(p11Backup)) {
  const backup = JSON.parse(readFileSync(p11Backup, "utf8"));
  cloudEmps = backup["kw-week-employees"];
  weekFrom = backup["kw-weekFrom"];
  weekTo = backup["kw-weekTo"];
} else {
  cloudEmps = richRoster(12);
  weekFrom = "2026-06-02";
  weekTo = "2026-06-07";
}

const staleLocal = staleZeroHoursRoster(cloudEmps);
const localValuesP11 = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return staleLocal;
  if (k === "kw-weekFrom") return weekFrom;
  if (k === "kw-weekTo") return weekTo;
  return null;
});
const cloudValuesP11 = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return cloudEmps;
  if (k === "kw-weekFrom") return weekFrom;
  if (k === "kw-weekTo") return weekTo;
  return null;
});

const bootP11 = runBootstrap(localValuesP11, cloudValuesP11);
const rtP11 = runRuntime(localValuesP11, cloudValuesP11);
const bootMetrics = payrollMetrics(payrollSlice(bootP11));
const rtMetrics = payrollMetrics(payrollSlice(rtP11));

assert("B4-T1 bootstrap adopts cloud activeDays", bootMetrics.activeDays >= 22);
assert("B4-T1 runtime adopts cloud activeDays (P11 parity)", rtMetrics.activeDays >= 22);
assert("B4-T1 bootstrap === runtime bundle", bundlesPayrollEqual(bootP11, rtP11));
assert(
  "B4-T1 runtime weekdayHours matches cloud",
  weekdayHours(payrollSlice(rtP11)) === weekdayHours(cloudEmps),
);

// —— B4-T2 fixture parity matrix (anti-leak off) ——
console.log("\nB4-T2 fixture parity matrix");
const parityFixtures = [
  {
    name: "same week both rich",
    local: bundleWithPayroll({ weekFrom, weekTo, weekEmployees: cloudEmps }),
    cloud: bundleWithPayroll({ weekFrom, weekTo, weekEmployees: cloudEmps }),
  },
  {
    name: "same week local empty cloud rich",
    local: bundleWithPayroll({ weekFrom, weekTo, weekEmployees: [] }),
    cloud: bundleWithPayroll({ weekFrom, weekTo, weekEmployees: cloudEmps }),
  },
  {
    name: "W2 local edit vs stale W1 cloud",
    local: bundleWithPayroll({
      weekFrom: W2.from,
      weekTo: W2.to,
      weekEmployees: richRoster(11).map((e, i) =>
        i === 0
          ? {
              ...e,
              days: {
                ...e.days,
                Pn: { ...e.days.Pn, active: true, from: "08:00", to: "16:00" },
              },
            }
          : e,
      ),
    }),
    cloud: bundleWithPayroll({
      weekFrom: W1.from,
      weekTo: W1.to,
      weekEmployees: richRoster(11),
    }),
  },
];

for (const fx of parityFixtures) {
  const boot = runBootstrap(fx.local, fx.cloud);
  const rt = runRuntimeFinalizeOnly(fx.local, fx.cloud);
  assert(`B4-T2 ${fx.name} bootstrap === runtime finalize`, bundlesPayrollEqual(boot, rt));
}

// —— B4-T3 20.1C.1 stale KV rollover F5 — no 495h leak ——
console.log("\nB4-T3 20.1C.1 stale KV");
const oldCloud = richRoster(11);
const localW2 = bundleWithPayroll({
  weekFrom: W2.from,
  weekTo: W2.to,
  weekEmployees: oldCloud.map((e, i) => {
    const inactiveDays = defaultDays(false);
    if (i !== 0) {
      return { ...e, days: inactiveDays, prevSaturday: defaultDay() };
    }
    return {
      ...e,
      days: { ...inactiveDays, Pn: { ...inactiveDays.Pn, active: true, from: "08:00", to: "16:00" } },
      prevSaturday: defaultDay(),
    };
  }),
});
const cloudW1 = bundleWithPayroll({
  weekFrom: W1.from,
  weekTo: W1.to,
  weekEmployees: oldCloud,
});

const bootStale = runBootstrap(localW2, cloudW1);
const rtStale = runRuntime(localW2, cloudW1);
const staleBootM = payrollMetrics(payrollSlice(bootStale));
const staleRtM = payrollMetrics(payrollSlice(rtStale));

assert("B4-T3 bootstrap no week leak activeDays <= 1", staleBootM.activeDays <= 1);
assert("B4-T3 runtime no week leak activeDays <= 1", staleRtM.activeDays <= 1);
assert("B4-T3 bootstrap === runtime", bundlesPayrollEqual(bootStale, rtStale));

// —— B4-T4 refresh-team race (computeMergedDataBundle + SSOT) ——
console.log("\nB4-T4 refresh-team race");
localStorage.clear();
Object.keys(kvStore).forEach((k) => delete kvStore[k]);

const W1r = { from: "2026-06-22", to: "2026-06-28" };
const W2r = { from: "2026-06-29", to: "2026-07-04" };
const w1Roster = richRoster(8);
const archive = [
  {
    id: `arch-${W1r.from}`,
    weekFrom: W1r.from,
    weekTo: W1r.to,
    savedAt: new Date().toISOString(),
    weekEmployees: w1Roster,
    employees: w1Roster.map((e) => ({ name: e.name, position: e.position })),
    jobs: [],
  },
];
const directory = w1Roster.map((e) => ({
  id: e.directoryId,
  name: e.name,
  phone: e.phone,
  position: e.position,
  rate: e.rate,
  active: true,
}));

kvStore["kw-weekFrom"] = W2r.from;
kvStore["kw-weekTo"] = W2r.to;
kvStore["kw-week-employees"] = [];
kvStore["kw-archive"] = archive;
kvStore["kw-directory"] = directory;

const refreshedRoster = richRoster(10);
localStorage.setItem("kw-weekFrom", JSON.stringify(W2r.from));
localStorage.setItem("kw-weekTo", JSON.stringify(W2r.to));
localStorage.setItem("kw-week-employees", JSON.stringify(refreshedRoster));
localStorage.setItem("kw-archive", JSON.stringify(archive));
localStorage.setItem("kw-directory", JSON.stringify(directory));

const staleReact = emptyBundle();
staleReact[DATA_KEYS.indexOf("kw-directory")] = directory;
staleReact[DATA_KEYS.indexOf("kw-week-employees")] = [];
staleReact[DATA_KEYS.indexOf("kw-archive")] = archive;
staleReact[DATA_KEYS.indexOf("kw-weekFrom")] = W2r.from;
staleReact[DATA_KEYS.indexOf("kw-weekTo")] = W2r.to;

const { merged: raceMerged } = await computeMergedDataBundle(staleReact);
const raceCount = Array.isArray(raceMerged[DATA_KEYS.indexOf("kw-week-employees")])
  ? raceMerged[DATA_KEYS.indexOf("kw-week-employees")].length
  : 0;

assert("B4-T4 delayed merge keeps roster count === 10", raceCount === 10);

localStorage.removeItem("kw-week-employees");
kvStore["kw-week-employees"] = w1Roster;
const { merged: antiLeakMerged } = await computeMergedDataBundle(staleReact);
const antiLeakCount = Array.isArray(antiLeakMerged[DATA_KEYS.indexOf("kw-week-employees")])
  ? antiLeakMerged[DATA_KEYS.indexOf("kw-week-employees")].length
  : 0;
assert("B4-T4 anti-leak clears intentional empty week", antiLeakCount === 0);

// —— B4-T5 finalize === applyBootstrapPayrollMerge alias ——
console.log("\nB4-T5 SSOT alias");
const mergedBase = mergeAllDataKeys(localValuesP11, cloudValuesP11);
const viaFinalize = finalizePayrollBundleMerge(mergedBase, localValuesP11, cloudValuesP11);
const viaBootstrap = applyBootstrapPayrollMerge(mergedBase, localValuesP11, cloudValuesP11);
assert("B4-T5 finalizePayrollBundleMerge === applyBootstrapPayrollMerge", JSON.stringify(viaFinalize) === JSON.stringify(viaBootstrap));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
