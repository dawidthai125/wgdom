/**
 * PAYROLL Runtime Trace — scenariusz repro cross-device (symulacja node).
 * Run: npx vite-node scripts/test-payroll-runtime-trace-repro.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { weekEmployeeMergeKey } from "../src/lib/payroll-week-employee-merge.ts";

process.env.VITE_SUPABASE_PROJECT_ID = "mock-trace-repro";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-trace";

globalThis.__wgdomPayrollTraceForce = true;

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
  return { ok: false, status: 404, text: async () => "not found" };
};

const {
  DATA_KEYS,
  pushWeekEmployeesToCloud,
  computeMergedDataBundle,
  mergeAllDataKeys,
  applyBootstrapPayrollMerge,
  bootstrapMergedShouldPush,
} = await import("../src/lib/cloud-sync.ts");

const {
  payrollTraceSetDeviceLabel,
  payrollTraceSetOperationId,
  payrollTraceSetSubject,
  payrollTraceDump,
  payrollTraceFindFirstSubjectLoss,
} = await import("../src/lib/payroll-runtime-trace.ts");

const W = { from: "2026-06-30", to: "2026-07-05" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays(active = true) {
  const d = defaultDay();
  return Object.fromEntries(DAYS.map((k) => [k, k === "So" ? d : { ...d, active, from: "07:00", to: "16:00" }]));
}

function makeEmp(id, dirId, name) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: defaultDays(true),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function bundle(emps) {
  const b = DATA_KEYS.map(() => null);
  b[DATA_KEYS.indexOf("kw-weekFrom")] = W.from;
  b[DATA_KEYS.indexOf("kw-weekTo")] = W.to;
  b[DATA_KEYS.indexOf("kw-week-employees")] = emps;
  return b;
}

const existing = [makeEmp("e1", "dir-1", "Jan Kowalski")];
const newEmp = makeEmp("e2", "dir-new", "Nowy Pracownik");
const OP_ID = "op-trace-repro-20260704";

lsStore["kw-weekFrom"] = JSON.stringify(W.from);
lsStore["kw-weekTo"] = JSON.stringify(W.to);
lsStore["kw-week-employees"] = JSON.stringify(existing);
kvStore["kw-week-employees"] = existing;
kvStore["kw-weekFrom"] = W.from;
kvStore["kw-weekTo"] = W.to;

payrollTraceSetOperationId(OP_ID);
payrollTraceSetSubject(weekEmployeeMergeKey(newEmp), newEmp.id);

console.log("\n=== DEVICE A (chrome) — add ===\n");
payrollTraceSetDeviceLabel("chrome-desktop");
const rosterAfterAdd = [...existing, newEmp];
lsStore["kw-week-employees"] = JSON.stringify(rosterAfterAdd);
await pushWeekEmployeesToCloud(rosterAfterAdd, { skipPayrollGuard: true });

console.log("\n=== DEVICE B (safari) — bootstrap refresh ===\n");
payrollTraceSetDeviceLabel("iphone-safari");
const localValues = DATA_KEYS.map((key) => {
  const raw = lsStore[key];
  return raw ? JSON.parse(raw) : null;
});
const cloudValues = DATA_KEYS.map((key) => kvStore[key] ?? null);
let mergedB = mergeAllDataKeys(localValues, cloudValues, [], [], [], []);
mergedB = applyBootstrapPayrollMerge(mergedB, localValues, cloudValues);
const empIdx = DATA_KEYS.indexOf("kw-week-employees");
const mergedEmps = mergedB[empIdx];
const cloudEmp = cloudValues[empIdx];
if (bootstrapMergedShouldPush("kw-week-employees", mergedEmps, cloudEmp)) {
  const { pushKeysToCloud } = await import("../src/lib/cloud-sync.ts");
  await pushKeysToCloud(["kw-week-employees"], [mergedEmps], {
    replaceWeekEmployeesKeys: ["kw-week-employees"],
    skipPayrollGuard: true,
  });
}
lsStore["kw-week-employees"] = JSON.stringify(mergedEmps);

console.log("\n=== DEVICE A — runCloudSync (merge pull) ===\n");
payrollTraceSetDeviceLabel("chrome-desktop");
const adminBundle = bundle(rosterAfterAdd);
const { merged: mergedA } = await computeMergedDataBundle(adminBundle);
lsStore["kw-week-employees"] = JSON.stringify(mergedA[empIdx]);

const dump = payrollTraceDump(OP_ID);
const loss = dump.firstSubjectLoss ?? payrollTraceFindFirstSubjectLoss(dump.events);

console.log("\n=== TRACE SUMMARY ===");
console.log("operationId:", OP_ID);
console.log("eventCount:", dump.eventCount);
console.log("subjectMergeKey:", dump.subjectMergeKey);
console.log("KV roster count after A sync:", Array.isArray(mergedA[empIdx]) ? mergedA[empIdx].length : 0);

if (loss) {
  console.log("\nFIRST subjectPresent TRUE→FALSE:");
  console.log(JSON.stringify(loss, null, 2));
  const lossEvent = dump.events[loss.index];
  console.log("\nLoss event detail:");
  console.log(JSON.stringify(lossEvent, null, 2));
} else {
  console.log("\nNo subject loss detected in trace (incident not reproduced in sim).");
}

const subjectStillPresent = Array.isArray(mergedA[empIdx])
  && mergedA[empIdx].some((e) => weekEmployeeMergeKey(e) === weekEmployeeMergeKey(newEmp));

console.log("\nFinal subjectPresent in merged roster:", subjectStillPresent);

console.log("\n=== ADVERSARIAL — richness override (RC-04b probe) ===\n");
lsStore["kw-week-employees"] = JSON.stringify(rosterAfterAdd);
kvStore["kw-week-employees"] = existing;
const richCloud = existing.map((e) => ({
  ...e,
  days: defaultDays(true),
  dataUpdatedAt: new Date().toISOString(),
}));
richCloud[0].days = Object.fromEntries(DAYS.map((k) => [k, { ...defaultDay(), active: true, from: "06:00", to: "18:00", extraHours: [{ from: "18:00", to: "20:00" }] }]));
kvStore["kw-week-employees"] = richCloud;
const thinLocal = rosterAfterAdd.map((e) =>
  e.directoryId === "dir-new"
    ? { ...e, days: defaultDays(false), dataUpdatedAt: "2020-01-01T00:00:00.000Z" }
    : e,
);
payrollTraceSetSubject(weekEmployeeMergeKey(newEmp), newEmp.id);
const advBundle = bundle(thinLocal);
const { merged: advMerged } = await computeMergedDataBundle(advBundle);
const advDump = payrollTraceDump(OP_ID);
const advLoss = advDump.firstSubjectLoss;
const advPresent = Array.isArray(advMerged[empIdx])
  && advMerged[empIdx].some((e) => weekEmployeeMergeKey(e) === weekEmployeeMergeKey(newEmp));
console.log("Adversarial merged count:", Array.isArray(advMerged[empIdx]) ? advMerged[empIdx].length : 0);
console.log("Adversarial subjectPresent:", advPresent);
if (advLoss) {
  console.log("\nADVERSARIAL FIRST subjectPresent TRUE→FALSE:");
  console.log(JSON.stringify(advLoss, null, 2));
  console.log("\nLoss event:");
  console.log(JSON.stringify(advDump.events[advLoss.index], null, 2));
}

process.exit(subjectStillPresent && !loss ? 0 : loss ? 0 : 1);
