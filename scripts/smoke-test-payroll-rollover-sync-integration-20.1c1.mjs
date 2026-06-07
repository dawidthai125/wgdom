/**
 * Sprint 20.1C.1 — pełna symulacja incydentu rollover → refresh → edit → F5
 * Uruchom: npx vite-node scripts/smoke-test-payroll-rollover-sync-integration-20.1c1.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { buildWeekSnapshot } from "../src/app/app-domain.ts";

// —— Env + mocks PRZED importem cloud-sync ——
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-20_1c1";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-key-20_1c1";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

/** Symulowany Supabase KV */
const kvStore = {};

function kvSnapshot(keys) {
  const snap = {};
  for (const k of keys) {
    snap[k] = kvStore[k] ?? null;
  }
  return JSON.parse(JSON.stringify(snap));
}

function payrollSummary(emps) {
  const arr = Array.isArray(emps) ? emps : [];
  let activeDays = 0;
  let totalHours = 0;
  const parse = (t) => {
    const m = String(t || "").match(/^(\d+):(\d+)$/);
    return m ? +m[1] * 60 + +m[2] : null;
  };
  for (const e of arr) {
    for (const d of Object.values(e?.days || {})) {
      if (d?.active) {
        const f = parse(d.from);
        const to = parse(d.to);
        if (f != null && to != null && to > f) {
          activeDays++;
          totalHours += (to - f) / 60;
        }
      }
    }
  }
  return { count: arr.length, activeDays, totalHours: +totalHours.toFixed(1) };
}

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
    const body = JSON.parse(opts.body);
    const { keys, values } = body;
    keys.forEach((k, i) => { kvStore[k] = values[i]; });
    return { ok: true, text: async () => "" };
  }
  return originalFetch(url, opts);
};

const {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  payrollMetrics,
  mergeWeekEmployees,
  pushPayrollWeekAfterRollover,
  pushWeekEmployeesToCloud,
  evaluatePayrollGuardBeforePush,
} = await import("../src/lib/cloud-sync.ts");

const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = { from: "2026-06-08", to: "2026-06-13" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const PAYROLL_KEYS = ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"];

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
}

function emptyDays() {
  const d = defaultDay();
  return Object.fromEntries(DAYS.map((k) => [k, { ...d }]));
}

function makeEmp(id, dirId, name, days = defaultDays()) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days,
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function makeDirectory(n = 11) {
  return Array.from({ length: n }, (_, i) => ({
    id: `dir-${i + 1}`,
    name: `Pracownik ${i + 1}`,
    phone: `+48 500 000 ${String(i + 1).padStart(3, "0")}`,
    position: "Pracownik",
    defaultRate: "50",
    startDate: "2026-01-01",
    active: true,
    notes: "",
  }));
}

function weekEmployeeFromDir(dir) {
  return {
    id: crypto.randomUUID(),
    directoryId: dir.id,
    name: dir.name,
    phone: dir.phone,
    position: dir.position,
    rate: dir.defaultRate,
    days: emptyDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function writeLs(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function readLs(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsPayrollSnapshot() {
  return {
    "kw-weekFrom": readLs("kw-weekFrom"),
    "kw-weekTo": readLs("kw-weekTo"),
    "kw-week-employees": payrollSummary(readLs("kw-week-employees")),
    "kw-archive": Array.isArray(readLs("kw-archive")) ? readLs("kw-archive").length : 0,
  };
}

function bundleFromLs() {
  return DATA_KEYS.map((k) => readLs(k));
}

function bundleFromKv() {
  return DATA_KEYS.map((k) => (kvStore[k] ?? null));
}

/** Symuluje stary bug: richness override bez sprawdzenia tygodnia */
function simulatePreFixBootstrap(merged, localValues, cloudValues) {
  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const localEmps = Array.isArray(localValues[empIdx]) ? localValues[empIdx] : [];
  const cloudEmps = Array.isArray(cloudValues[empIdx]) ? cloudValues[empIdx] : [];
  const localM = payrollMetrics(localEmps);
  const cloudM = payrollMetrics(cloudEmps);
  if (cloudM.activeDays > localM.activeDays) {
    return mergeWeekEmployees([], cloudEmps);
  }
  return merged[empIdx];
}

/** Czy wynik wygląda jak leak starego tygodnia (11 osób, ~55 dni aktywnych) */
function looksLikeOldWeekLeak(emps, oldCloudEmps) {
  const m = payrollMetrics(emps);
  const oldM = payrollMetrics(oldCloudEmps);
  const count = Array.isArray(emps) ? emps.length : 0;
  return m.activeDays >= oldM.activeDays * 0.9 && count >= 11;
}

async function runIncidentSimulation(runId) {
  localStorage.clear();
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);

  const directory = makeDirectory(11);
  const weekAEmployees = directory.map((d, i) =>
    makeEmp(`we-a-${i}`, d.id, d.name, defaultDays()),
  );
  let savedWeeks = [];
  const jobs = [];

  const steps = [];

  const record = (step, extra = {}) => {
    steps.push({
      step,
      runId,
      local: lsPayrollSnapshot(),
      kv: {
        "kw-weekFrom": kvStore["kw-weekFrom"] ?? null,
        "kw-weekTo": kvStore["kw-weekTo"] ?? null,
        "kw-week-employees": payrollSummary(kvStore["kw-week-employees"]),
        "kw-archive": Array.isArray(kvStore["kw-archive"]) ? kvStore["kw-archive"].length : 0,
      },
      ...extra,
    });
  };

  // —— S0: Tydzień A — lokal + chmura zsynchronizowane ze starymi godzinami ——
  writeLs("kw-weekFrom", W1.from);
  writeLs("kw-weekTo", W1.to);
  writeLs("kw-week-employees", weekAEmployees);
  writeLs("kw-archive", savedWeeks);
  kvStore["kw-weekFrom"] = W1.from;
  kvStore["kw-weekTo"] = W1.to;
  kvStore["kw-week-employees"] = weekAEmployees;
  kvStore["kw-archive"] = savedWeeks;
  record("S0_initial_week_A");

  const oldCloudEmps = JSON.parse(JSON.stringify(weekAEmployees));

  // —— S1: Rollover (autoArchiveAndAdvance + pushPayrollWeekAfterRollover) ——
  const snapshot = buildWeekSnapshot(W1.from, W1.to, weekAEmployees, jobs, undefined, [], savedWeeks);
  savedWeeks = [snapshot];

  writeLs("kw-weekFrom", W2.from);
  writeLs("kw-weekTo", W2.to);
  writeLs("kw-week-employees", []);
  writeLs("kw-archive", savedWeeks);

  const guardBeforeRolloverPush = await evaluatePayrollGuardBeforePush(
    ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"],
    [W2.from, W2.to, [], savedWeeks],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], cloudWeekEmployees: oldCloudEmps },
  );

  await pushPayrollWeekAfterRollover({
    weekFrom: W2.from,
    weekTo: W2.to,
    weekEmployees: [],
    archive: savedWeeks,
  });

  record("S1_after_rollover_push", { guardWouldBlockWithoutSkip: guardBeforeRolloverPush.blocked });

  // —— S2: Odśwież skład ludzi (replaceWeekWithAllActive + persistPayrollRoster) ——
  const freshRoster = directory.map((d) => weekEmployeeFromDir(d));
  writeLs("kw-week-employees", freshRoster);

  const guardBeforeRosterPushStaleKv = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [freshRoster],
    { replaceWeekEmployeesKeys: ["kw-week-employees"], cloudWeekEmployees: oldCloudEmps },
  );

  await pushWeekEmployeesToCloud(freshRoster, { skipPayrollGuard: true });

  record("S2_after_refresh_roster_push", {
    guardWouldBlockIfKvStillStale: guardBeforeRosterPushStaleKv.blocked,
  });

  // —— S3: Edycja godzin jednego pracownika ——
  const edited = freshRoster.map((e, i) => {
    if (i !== 0) return e;
    const now = new Date().toISOString();
    return {
      ...e,
      days: {
        ...e.days,
        Pn: { ...e.days.Pn, active: true, from: "08:00", to: "16:00" },
      },
      dataUpdatedAt: now,
    };
  });
  writeLs("kw-week-employees", edited);
  record("S3_after_single_edit");

  // —— S4: Simulated F5 (CloudLoader bootstrap) ——
  const localValues = bundleFromLs();
  const cloudValues = bundleFromKv();
  let merged = mergeAllDataKeys(localValues, cloudValues);
  merged = applyBootstrapPayrollMerge(merged, localValues, cloudValues);

  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  const bootstrappedEmps = merged[empIdx];
  const bootMetrics = payrollMetrics(bootstrappedEmps);

  const preFixEmps = simulatePreFixBootstrap(merged, localValues, cloudValues);
  const preFixMetrics = payrollMetrics(preFixEmps);

  const targetFrom = merged[fromIdx];
  const targetTo = merged[toIdx];
  const cloudFrom = cloudValues[fromIdx];
  const cloudTo = cloudValues[toIdx];
  const weekMismatch = `${targetFrom}|${targetTo}` !== `${cloudFrom}|${cloudTo}`;

  // Zapis wyniku bootstrap do LS (jak CloudLoader)
  writeLs("kw-week-employees", bootstrappedEmps);
  writeLs("kw-weekFrom", targetFrom);
  writeLs("kw-weekTo", targetTo);

  record("S4_after_F5_bootstrap", {
    bootMetrics,
    preFixMetrics,
    weekMismatch,
    leakAfterFix: looksLikeOldWeekLeak(bootstrappedEmps, oldCloudEmps),
    leakPreFixSimulated: looksLikeOldWeekLeak(preFixEmps, oldCloudEmps),
  });

  const s1 = steps.find((s) => s.step === "S1_after_rollover_push");
  const s2 = steps.find((s) => s.step === "S2_after_refresh_roster_push");
  const s4 = steps.find((s) => s.step === "S4_after_F5_bootstrap");

  const checks = {
    rolloverKvWeek: s1.kv["kw-weekFrom"] === W2.from && s1.kv["kw-weekTo"] === W2.to,
    rolloverKvEmpsEmpty: s1.kv["kw-week-employees"].count === 0 && s1.kv["kw-week-employees"].activeDays === 0,
    rolloverGuardBlocked: s1.guardWouldBlockWithoutSkip === true,
    rosterKvUpdated: s2.kv["kw-week-employees"].count === 11 && s2.kv["kw-week-employees"].activeDays === 0,
    rosterGuardBlockedIfKvStale: s2.guardWouldBlockIfKvStillStale === true,
    f5NoLeak: !s4.leakAfterFix,
    f5OnlyOneActiveDay: s4.bootMetrics.activeDays <= 1,
    f5CorrectWeek: targetFrom === W2.from && targetTo === W2.to,
  };

  const pass = Object.values(checks).every(Boolean);

  return { runId, pass, checks, steps, bootMetrics: s4.bootMetrics, track: "HAPPY" };
}

/** Scenariusz produkcyjny: rollover + refresh BEZ aktualizacji KV (stary bug) → Fix A przy F5 */
async function runStaleKvSimulation(runId) {
  localStorage.clear();
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);

  const directory = makeDirectory(11);
  const weekAEmployees = directory.map((d, i) =>
    makeEmp(`we-a-${i}`, d.id, d.name, defaultDays()),
  );
  const oldCloudEmps = JSON.parse(JSON.stringify(weekAEmployees));
  const steps = [];

  const record = (step, extra = {}) => {
    steps.push({
      step,
      runId,
      track: "STALE_KV",
      local: lsPayrollSnapshot(),
      kv: {
        "kw-weekFrom": kvStore["kw-weekFrom"] ?? null,
        "kw-weekTo": kvStore["kw-weekTo"] ?? null,
        "kw-week-employees": payrollSummary(kvStore["kw-week-employees"]),
        "kw-archive": Array.isArray(kvStore["kw-archive"]) ? kvStore["kw-archive"].length : 0,
      },
      ...extra,
    });
  };

  writeLs("kw-weekFrom", W1.from);
  writeLs("kw-weekTo", W1.to);
  writeLs("kw-week-employees", weekAEmployees);
  kvStore["kw-weekFrom"] = W1.from;
  kvStore["kw-weekTo"] = W1.to;
  kvStore["kw-week-employees"] = weekAEmployees;
  record("S0_initial_week_A");

  // Rollover TYLKO lokalnie — KV pozostaje tydzień A (symuluje zablokowany guard)
  writeLs("kw-weekFrom", W2.from);
  writeLs("kw-weekTo", W2.to);
  writeLs("kw-week-employees", []);
  record("S1_rollover_local_only_kv_stale");

  const freshRoster = directory.map((d) => weekEmployeeFromDir(d));
  writeLs("kw-week-employees", freshRoster);
  record("S2_refresh_roster_local_only_kv_stale");

  const edited = freshRoster.map((e, i) => {
    if (i !== 0) return e;
    return {
      ...e,
      days: { ...e.days, Pn: { ...e.days.Pn, active: true, from: "08:00", to: "16:00" } },
      dataUpdatedAt: new Date().toISOString(),
    };
  });
  writeLs("kw-week-employees", edited);
  record("S3_single_edit_local_kv_stale");

  const localValues = bundleFromLs();
  const cloudValues = bundleFromKv();
  let merged = mergeAllDataKeys(localValues, cloudValues);
  merged = applyBootstrapPayrollMerge(merged, localValues, cloudValues);

  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  const bootstrappedEmps = merged[empIdx];
  const bootMetrics = payrollMetrics(bootstrappedEmps);
  const preFixEmps = simulatePreFixBootstrap(merged, localValues, cloudValues);
  const preFixMetrics = payrollMetrics(preFixEmps);

  const targetFrom = merged[fromIdx];
  const targetTo = merged[toIdx];
  const cloudFrom = cloudValues[fromIdx];
  const cloudTo = cloudValues[toIdx];
  const weekMismatch = `${targetFrom}|${targetTo}` !== `${cloudFrom}|${cloudTo}`;

  record("S4_F5_bootstrap_stale_kv", {
    bootMetrics,
    preFixMetrics,
    weekMismatch,
    kvStillWeekA: kvStore["kw-weekFrom"] === W1.from,
    leakAfterFix: looksLikeOldWeekLeak(bootstrappedEmps, oldCloudEmps),
    leakPreFixSimulated: looksLikeOldWeekLeak(preFixEmps, oldCloudEmps),
    adoptedCloudViaEmptyMerge: preFixMetrics.activeDays >= 50,
  });

  const s4 = steps.find((s) => s.step === "S4_F5_bootstrap_stale_kv");
  const checks = {
    kvStillStaleWeekA: s4.kvStillWeekA,
    weekMismatchAtBootstrap: weekMismatch,
    f5NoLeakWithFixA: !s4.leakAfterFix,
    f5OnlyOneActiveDay: bootMetrics.activeDays <= 1,
    preFixWouldLeak: s4.leakPreFixSimulated,
    preFixAdopts495h: s4.adoptedCloudViaEmptyMerge,
  };

  return {
    runId,
    pass: Object.values(checks).every(Boolean),
    checks,
    steps,
    bootMetrics,
    track: "STALE_KV",
  };
}

async function main() {
  const happyRuns = [];
  for (let i = 1; i <= 3; i++) {
    happyRuns.push(await runIncidentSimulation(i));
  }

  const staleRuns = [];
  for (let i = 1; i <= 3; i++) {
    staleRuns.push(await runStaleKvSimulation(i));
  }

  const runs = [...happyRuns, ...staleRuns];

  const allPass = runs.every((r) => r.pass);
  const happyDeterministic =
    happyRuns[0].bootMetrics.activeDays === happyRuns[1].bootMetrics.activeDays
    && happyRuns[1].bootMetrics.activeDays === happyRuns[2].bootMetrics.activeDays;
  const staleDeterministic =
    staleRuns[0].bootMetrics.activeDays === staleRuns[1].bootMetrics.activeDays
    && staleRuns[1].bootMetrics.activeDays === staleRuns[2].bootMetrics.activeDays;

  const report = {
    sprint: "20.1C.1",
    test: "payroll-rollover-sync-integration",
    happyRuns: happyRuns.map((r) => ({ runId: r.runId, pass: r.pass, checks: r.checks, bootMetrics: r.bootMetrics })),
    staleKvRuns: staleRuns.map((r) => ({ runId: r.runId, pass: r.pass, checks: r.checks, bootMetrics: r.bootMetrics, steps: r.steps })),
    allPass,
    deterministic: happyDeterministic && staleDeterministic,
    canReproduceOldBugAfterFix: runs.some((r) => r.checks.f5NoLeak === false || r.checks.f5NoLeakWithFixA === false)
      ? "TAK"
      : "NIE",
    preFixWouldLeakOnStaleKv: staleRuns.every((r) => r.checks.preFixWouldLeak),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(allPass && report.deterministic ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
