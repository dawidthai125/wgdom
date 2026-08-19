/**
 * PAYROLL-ROLLOVER-CLOUD-PUSH — integration: legal W1→W2 rollover push + bootstrap no leak.
 * Run: npx vite-node scripts/test-payroll-rollover-cloud-push-integration.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { buildWeekSnapshot } from "../src/app/app-domain.ts";

process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-rollover-cloud-push";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-rollover-cloud-push";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

const kvStore = {};
let batchSetCalls = 0;
let lastBatchSetBody = null;

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
    batchSetCalls++;
    lastBatchSetBody = JSON.parse(opts.body);
    const { keys, values } = lastBatchSetBody;
    keys.forEach((k, i) => { kvStore[k] = values[i]; });
    return {
      ok: true,
      json: async () => ({
        payrollWeekMeta: {
          weekFrom: values[keys.indexOf("kw-weekFrom")] ?? "",
          weekTo: values[keys.indexOf("kw-weekTo")] ?? "",
          revision: 1,
        },
      }),
    };
  }
  return originalFetch(url, opts);
};

const {
  DATA_KEYS,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  payrollMetrics,
  pushPayrollWeekAfterRollover,
  evaluatePayrollGuardBeforePush,
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

function makeRichRoster(n = 11) {
  return Array.from({ length: n }, (_, i) =>
    makeEmp(`we-${i}`, `dir-${i}`, `Pracownik ${i + 1}`),
  );
}

function readLs(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function bundleFromLs() {
  return DATA_KEYS.map((k) => readLs(k));
}

function bundleFromKv() {
  return DATA_KEYS.map((k) => (kvStore[k] ?? null));
}

function looksLikeOldWeekLeak(emps, oldCloudEmps) {
  const m = payrollMetrics(emps);
  const oldM = payrollMetrics(oldCloudEmps);
  const count = Array.isArray(emps) ? emps.length : 0;
  return m.activeDays >= oldM.activeDays * 0.9 && count >= 11;
}

async function runIntegration() {
  localStorage.clear();
  Object.keys(kvStore).forEach((k) => delete kvStore[k]);
  batchSetCalls = 0;
  lastBatchSetBody = null;

  const weekAEmployees = makeRichRoster();
  const oldCloudEmps = JSON.parse(JSON.stringify(weekAEmployees));

  kvStore["kw-weekFrom"] = W1.from;
  kvStore["kw-weekTo"] = W1.to;
  kvStore["kw-week-employees"] = weekAEmployees;
  kvStore["kw-archive"] = [];

  const snapshot = buildWeekSnapshot(W1.from, W1.to, weekAEmployees, [], undefined, [], []);
  const savedWeeks = [snapshot];

  const guardBefore = await evaluatePayrollGuardBeforePush(
    ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"],
    [W2.from, W2.to, [], savedWeeks],
    { payrollWeekRolloverPush: true, cloudWeekEmployees: oldCloudEmps },
  );
  assert("I1 guard legal rollover not blocked", guardBefore.blocked === false);

  await pushPayrollWeekAfterRollover({
    weekFrom: W2.from,
    weekTo: W2.to,
    weekEmployees: [],
    archive: savedWeeks,
  });

  assert("I2 batch-set invoked", batchSetCalls === 1);
  assert("I3 CAS path payrollWeekCas", lastBatchSetBody?.payrollWeekCas === true);
  assert("I4 CAS expectedRevision present", typeof lastBatchSetBody?.expectedRevision === "number");
  assert("I5 KV week W2", kvStore["kw-weekFrom"] === W2.from && kvStore["kw-weekTo"] === W2.to);
  assert("I6 KV roster empty", payrollMetrics(kvStore["kw-week-employees"]).activeDays === 0);
  assert(
    "I7 archive W1 preserved",
    Array.isArray(kvStore["kw-archive"]) &&
      kvStore["kw-archive"].some((w) => w.weekFrom === W1.from && w.weekTo === W1.to),
  );

  localStorage.setItem("kw-weekFrom", JSON.stringify(W2.from));
  localStorage.setItem("kw-weekTo", JSON.stringify(W2.to));
  localStorage.setItem("kw-week-employees", JSON.stringify([]));
  localStorage.setItem("kw-archive", JSON.stringify(savedWeeks));

  const localValues = bundleFromLs();
  const cloudValues = bundleFromKv();
  let merged = mergeAllDataKeys(localValues, cloudValues);
  merged = applyBootstrapPayrollMerge(merged, localValues, cloudValues);

  const empIdx = DATA_KEYS.indexOf("kw-week-employees");
  const fromIdx = DATA_KEYS.indexOf("kw-weekFrom");
  const toIdx = DATA_KEYS.indexOf("kw-weekTo");
  const bootstrappedEmps = merged[empIdx];

  assert("I8 bootstrap week W2", merged[fromIdx] === W2.from && merged[toIdx] === W2.to);
  assert("I9 bootstrap no W1 hours leak", !looksLikeOldWeekLeak(bootstrappedEmps, oldCloudEmps));
  assert("I10 bootstrap roster empty or fresh", payrollMetrics(bootstrappedEmps).activeDays === 0);
}

await runIntegration();

console.log(`\nSummary: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
