/**
 * P0 — regresja: „Odśwież skład” po rolloverze nie może być skasowany przez opóźniony cloud merge.
 * Run: npx vite-node scripts/test-payroll-refresh-team-race-p0.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-payroll-race-p0";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-payroll-race-p0";

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
  DATA_KEYS,
  computeMergedDataBundle,
  weekEmployeesListRichness,
} = await import("../src/lib/cloud-sync.ts");

const W1 = { from: "2026-06-22", to: "2026-06-28" };
const W2 = { from: "2026-06-29", to: "2026-07-04" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
}

function makeEmp(id, dirId, name) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function richRoster(n = 8) {
  return Array.from({ length: n }, (_, i) => makeEmp(`emp-${i + 1}`, `dir-${i + 1}`, `Pracownik ${i + 1}`));
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

console.log("=== PAYROLL REFRESH TEAM RACE P0 ===\n");

// —— Setup: rollover W1 → W2, bogate archiwum W1 ——
const w1Roster = richRoster(8);
const archive = [buildArchiveSnapshot(W1.from, W1.to, w1Roster)];
const directory = w1Roster.map((e, i) => ({
  id: e.directoryId,
  name: e.name,
  phone: e.phone,
  position: e.position,
  rate: e.rate,
  active: true,
}));

// KV po rolloverze: nowy tydzień, pusty skład, stare dane W1 w chmurze (stale KV)
kvStore["kw-weekFrom"] = W2.from;
kvStore["kw-weekTo"] = W2.to;
kvStore["kw-week-employees"] = [];
kvStore["kw-archive"] = archive;
kvStore["kw-directory"] = directory;

// LS po „Odśwież skład”: pełny skład W2
const refreshedRoster = richRoster(10);
writeLs("kw-weekFrom", W2.from);
writeLs("kw-weekTo", W2.to);
writeLs("kw-week-employees", refreshedRoster);
writeLs("kw-archive", archive);
writeLs("kw-directory", directory);

assert("archive richness >= 8", weekEmployeesListRichness(w1Roster) >= 8);

// Stale React snapshot (pusty skład) — jak pull/sync rozpoczęty przed refresh
const staleReactBundle = bundleFromAdminShape({
  directory,
  weekEmployees: [],
  savedWeeks: archive,
  weekFrom: W2.from,
  weekTo: W2.to,
});

const { merged } = await computeMergedDataBundle(staleReactBundle);
const empIdx = DATA_KEYS.indexOf("kw-week-employees");
const mergedEmps = merged[empIdx];
const mergedCount = Array.isArray(mergedEmps) ? mergedEmps.length : 0;

assert("T1 delayed merge keeps refreshed roster count > 0", mergedCount > 0);
assert("T2 delayed merge keeps refreshed roster count === 10", mergedCount === 10);

// Kontrola: bez LS (tylko pusty snapshot) anti-leak nadal czyści wyciek na nowy tydzień
localStorage.removeItem("kw-week-employees");
writeLs("kw-weekFrom", W2.from);
writeLs("kw-weekTo", W2.to);
writeLs("kw-archive", archive);
kvStore["kw-weekFrom"] = W2.from;
kvStore["kw-weekTo"] = W2.to;
kvStore["kw-week-employees"] = w1Roster;

const { merged: antiLeakMerged } = await computeMergedDataBundle(
  bundleFromAdminShape({
    directory,
    weekEmployees: [],
    savedWeeks: archive,
    weekFrom: W2.from,
    weekTo: W2.to,
  }),
);
const antiLeakCount = Array.isArray(antiLeakMerged[empIdx]) ? antiLeakMerged[empIdx].length : -1;
assert("T3 anti-leak still clears intentional empty new week", antiLeakCount === 0);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
