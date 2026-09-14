/**
 * PAYROLL AKORD Phase 2 — durable piecework domain.
 * npx vite-node scripts/test-payroll-piecework-p2.mjs
 *
 * ZERO production writes. Does not touch PWRB / kw-week-employees CAS.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p2";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p2";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

import {
  emptyPayrollPieceworkState,
  normalizeMoneyPln,
  normalizePayrollPieceworkState,
  PAYROLL_PIECEWORK_KEY,
} from "../src/lib/payroll-piecework-types.ts";
import { mergePayrollPieceworkState, pickPieceworkRecordByLww } from "../src/lib/payroll-piecework-merge.ts";
import {
  canAddAdvanceAmount,
  createAdvance,
  createAllocation,
  createPieceworkJob,
  persistRoundTripPieceworkState,
  remainingForAllocation,
  softDeleteAdvance,
  softDeleteAllocation,
  softDeletePieceworkJob,
  sumActiveAdvances,
  updateAdvance,
  updateAllocation,
  updatePieceworkJob,
} from "../src/lib/payroll-piecework.ts";
import { DATA_KEYS, isDataKey, mergeIncomingWithStored } from "../src/lib/cloud-sync.ts";
import { directoryCompensationModel } from "../src/lib/payroll-compensation-model.ts";
import { calcWeekEmployee, defaultDays, weekEmployeeFromDir } from "../src/app/app-domain.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name);
  }
}

const T0 = "2026-09-14T10:00:00.000Z";
const T1 = "2026-09-14T11:00:00.000Z";
const T2 = "2026-09-14T12:00:00.000Z";
const T3 = "2026-09-14T13:00:00.000Z";

let state = emptyPayrollPieceworkState();

// --- A. Job ---
const jobRes = createPieceworkJob(state, {
  jobId: "job-korea-1-132",
  label: "Koreańska 1/132",
  id: "pw-job-1",
  now: T0,
});
assert("A create job ok", jobRes.ok === true);
state = jobRes.state;
assert("A stable job id", state.jobs[0].id === "pw-job-1");
assert("A references existing Job.id", state.jobs[0].jobId === "job-korea-1-132");
assert("A label", state.jobs[0].label === "Koreańska 1/132");
assert("A reject empty jobId", createPieceworkJob(state, { jobId: "" }).ok === false);
const jobUp = updatePieceworkJob(state, { id: "pw-job-1", label: "Koreańska 1/132 AKORD", now: T1 });
assert("A update ok", jobUp.ok === true);
state = jobUp.state;
assert("A update LWW clock", state.jobs[0].updatedAt === T1);
assert("A update label", state.jobs[0].label === "Koreańska 1/132 AKORD");

const round1 = persistRoundTripPieceworkState(state);
assert("A persistence round-trip job id", round1.jobs[0].id === "pw-job-1");
assert("A persistence round-trip jobId", round1.jobs[0].jobId === "job-korea-1-132");

// --- B. Allocation ---
const a1 = createAllocation(state, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-piotrek",
  agreedAmount: 4200,
  id: "alloc-piotrek",
  now: T0,
});
assert("B create allocation Piotrek", a1.ok === true);
state = a1.state;
const a2 = createAllocation(state, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-kola",
  agreedAmount: 3800,
  id: "alloc-kola",
  now: T0,
});
assert("B create allocation Kola same job", a2.ok === true);
state = a2.state;
assert("B two employees one job", state.allocations.filter((a) => a.pieceworkJobId === "pw-job-1").length === 2);
assert("B agreed amounts independent", state.allocations.find((a) => a.id === "alloc-piotrek").agreedAmount === 4200
  && state.allocations.find((a) => a.id === "alloc-kola").agreedAmount === 3800);

const job2 = createPieceworkJob(state, { jobId: "job-b", id: "pw-job-2", now: T0 });
state = job2.state;
const a3 = createAllocation(state, {
  pieceworkJobId: "pw-job-2",
  directoryId: "dir-piotrek",
  agreedAmount: 2500,
  id: "alloc-piotrek-b",
  now: T0,
});
assert("B same employee multiple jobs", a3.ok === true);
state = a3.state;
assert("B Piotrek has 2 allocations", state.allocations.filter((a) => a.directoryId === "dir-piotrek").length === 2);
assert("B reject negative agreed", createAllocation(state, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-x",
  agreedAmount: -1,
}).ok === false);
assert("B reject NaN agreed", createAllocation(state, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-x",
  agreedAmount: Number.NaN,
}).ok === false);

// --- C. Advances ---
const adv1 = createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 500,
  id: "adv-a",
  paidAt: T0,
  weekFrom: "2026-09-14",
  weekTo: "2026-09-19",
  now: T0,
});
assert("C create advance A", adv1.ok === true);
state = adv1.state;
assert("C advance refs", state.advances[0].allocationId === "alloc-piotrek"
  && state.advances[0].pieceworkJobId === "pw-job-1"
  && state.advances[0].directoryId === "dir-piotrek");
assert("C week audit fields", state.advances[0].weekFrom === "2026-09-14" && state.advances[0].weekTo === "2026-09-19");
assert("C reject zero amount", createAdvance(state, { allocationId: "alloc-piotrek", amount: 0 }).ok === false);
assert("C reject negative", createAdvance(state, { allocationId: "alloc-piotrek", amount: -5 }).ok === false);
assert("C reject Infinity", createAdvance(state, { allocationId: "alloc-piotrek", amount: Infinity }).ok === false);

// --- D. Additive merge ---
const deviceA = persistRoundTripPieceworkState(state);
const deviceB = persistRoundTripPieceworkState(state);
const advB = createAdvance(deviceB, {
  allocationId: "alloc-piotrek",
  amount: 700,
  id: "adv-b",
  paidAt: T1,
  now: T1,
});
assert("D device B advance ok", advB.ok === true);
const mergedAB = mergePayrollPieceworkState(deviceA, advB.state);
assert("D additive both advances", mergedAB.advances.filter((a) => !a.deletedAt).length >= 2);
assert("D ADV-A present", mergedAB.advances.some((a) => a.id === "adv-a" && !a.deletedAt));
assert("D ADV-B present", mergedAB.advances.some((a) => a.id === "adv-b" && !a.deletedAt));
assert("D sum 1200", sumActiveAdvances(mergedAB.advances, "alloc-piotrek") === 1200);
state = mergedAB;

// --- E. LWW ---
const localAlloc = {
  ...state.allocations.find((a) => a.id === "alloc-piotrek"),
  agreedAmount: 4200,
  updatedAt: T1,
};
const cloudAlloc = {
  ...localAlloc,
  agreedAmount: 4500,
  updatedAt: T2,
};
const lww = pickPieceworkRecordByLww(localAlloc, cloudAlloc);
assert("E newer update wins", lww.agreedAmount === 4500 && lww.updatedAt === T2);
const lwwOld = pickPieceworkRecordByLww(cloudAlloc, localAlloc);
assert("E older cannot overwrite", lwwOld.agreedAmount === 4500);

const allocUp = updateAllocation(state, { id: "alloc-piotrek", agreedAmount: 4200, now: T3 });
assert("E restore agreed via newer local update", allocUp.ok === true);
state = allocUp.state;

// --- F/G. Tombstone + anti-resurrection ---
const delA = softDeleteAdvance(state, "adv-a", T2);
assert("F delete ADV-A", delA.ok === true);
state = delA.state;
assert("F deletedAt set", !!state.advances.find((a) => a.id === "adv-a")?.deletedAt);
assert("F sum after delete 700", sumActiveAdvances(state.advances, "alloc-piotrek") === 700);

const staleLiveA = {
  ...deviceA.advances.find((a) => a.id === "adv-a"),
  deletedAt: undefined,
  updatedAt: T0,
};
const afterResurrectionAttempt = mergePayrollPieceworkState(
  { ...state, advances: state.advances.map((a) => (a.id === "adv-a" ? { ...a } : a)) },
  { ...emptyPayrollPieceworkState(), advances: [staleLiveA] },
);
const mergedDel = afterResurrectionAttempt.advances.find((a) => a.id === "adv-a");
assert("G no resurrection — deleted wins", !!mergedDel?.deletedAt);
assert("G sum still 700", sumActiveAdvances(afterResurrectionAttempt.advances, "alloc-piotrek") === 700);
state = afterResurrectionAttempt;

// --- H. New advance after delete (new UUID) ---
const advNew = createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 100,
  id: "adv-c-new",
  paidAt: T3,
  now: T3,
});
assert("H new UUID after delete", advNew.ok === true);
state = advNew.state;
assert("H new id not reuse", state.advances.some((a) => a.id === "adv-c-new"));
assert("H cannot reuse deleted id as live create", createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 50,
  id: "adv-a",
  now: T3,
}).ok === false);

// Reset to clean 500+700 scenario for I/J (rebuild)
state = emptyPayrollPieceworkState();
state = createPieceworkJob(state, { jobId: "job-1", id: "pw-job-1", now: T0 }).state;
state = createAllocation(state, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-piotrek",
  agreedAmount: 4200,
  id: "alloc-piotrek",
  now: T0,
}).state;
state = createAdvance(state, { allocationId: "alloc-piotrek", amount: 500, id: "adv-a", now: T0 }).state;
state = createAdvance(state, { allocationId: "alloc-piotrek", amount: 700, id: "adv-b", now: T1 }).state;

// --- I. Remaining ---
const allocP = state.allocations.find((a) => a.id === "alloc-piotrek");
assert("I remaining 3000", remainingForAllocation(allocP, state.advances) === 3000);

// --- J. Limit ---
assert("J exactly at limit accepted (3000)", createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 3000,
  id: "adv-fill",
  now: T2,
}).ok === true);
const over = createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 3000,
  id: "adv-over1",
  now: T2,
});
// wait - state still has 500+700=1200, so 3000 fits. Need state after fill for over-limit with 1300
const filled = createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 3000,
  id: "adv-fill",
  now: T2,
});
assert("J fill to 4200 ok", filled.ok === true);
assert("J over 1zł rejected", createAdvance(filled.state, {
  allocationId: "alloc-piotrek",
  amount: 1,
  id: "adv-over",
  now: T3,
}).ok === false);
assert("J canAdd false for over", canAddAdvanceAmount(allocP, filled.state.advances, 1) === false);

// Partial path: 1200 + 1300 = 2500 OK; attempt that would make 4300
assert("J 1300 on 1200 base would be 2500 ok", createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 1300,
  id: "adv-1300",
  now: T2,
}).ok === true);
assert("J attempt 3100 on 1200 = 4300 rejected", createAdvance(state, {
  allocationId: "alloc-piotrek",
  amount: 3100,
  id: "adv-4300",
  now: T2,
}).ok === false);

// --- K. Money normalize ---
assert("K normalize 4200.1", normalizeMoneyPln(4200.129) === 4200.13);
assert("K normalize string", normalizeMoneyPln("1 200,50") === 1200.5);
assert("K normalize NaN null", normalizeMoneyPln(Number.NaN) === null);
assert("K normalize Infinity null", normalizeMoneyPln(Infinity) === null);

// --- L. Multi-week identity ---
const week1 = persistRoundTripPieceworkState(state);
const week2 = persistRoundTripPieceworkState(week1);
const week3 = persistRoundTripPieceworkState(week2);
assert("L job id stable week1-3", week3.jobs[0].id === week1.jobs[0].id);
assert("L allocation id stable", week3.allocations[0].id === week1.allocations[0].id);
assert("L advances retained", week3.advances.length === week1.advances.length);
assert("L no duplicate job on merge self", mergePayrollPieceworkState(week1, week3).jobs.filter((j) => j.id === "pw-job-1").length === 1);

// Soft-delete job does not wipe advances
const delJob = softDeletePieceworkJob(week3, "pw-job-1", T3);
assert("L soft delete job keeps advances", delJob.ok && delJob.state.advances.length === week3.advances.length);
assert("L soft delete alloc keeps advances", softDeleteAllocation(week3, "alloc-piotrek", T3).state.advances.length === week3.advances.length);

// --- Multi-device scenario (full) ---
let cloud = emptyPayrollPieceworkState();
cloud = createPieceworkJob(cloud, { jobId: "job-1", id: "pw-job-1", now: T0 }).state;
cloud = createAllocation(cloud, {
  pieceworkJobId: "pw-job-1",
  directoryId: "dir-piotrek",
  agreedAmount: 4200,
  id: "alloc-piotrek",
  now: T0,
}).state;
let snapA = persistRoundTripPieceworkState(cloud);
let snapB = persistRoundTripPieceworkState(cloud);
snapA = createAdvance(snapA, { allocationId: "alloc-piotrek", amount: 500, id: "ADV-A", now: T1 }).state;
snapB = createAdvance(snapB, { allocationId: "alloc-piotrek", amount: 700, id: "ADV-B", now: T1 }).state;
cloud = mergePayrollPieceworkState(snapA, snapB);
assert("MD merge sum 1200", sumActiveAdvances(cloud.advances, "alloc-piotrek") === 1200);
snapB = softDeleteAdvance(cloud, "ADV-A", T2).state;
const staleA = persistRoundTripPieceworkState(snapA); // still has live ADV-A
cloud = mergePayrollPieceworkState(staleA, snapB);
assert("MD delete wins over stale A", !!cloud.advances.find((a) => a.id === "ADV-A")?.deletedAt);
assert("MD final 700", sumActiveAdvances(cloud.advances, "alloc-piotrek") === 700);

// cloud-sync wiring
assert("DATA_KEYS includes piecework", DATA_KEYS.includes("kw-payroll-piecework"));
assert("isDataKey", isDataKey(PAYROLL_PIECEWORK_KEY));
const mergedViaCloud = mergeIncomingWithStored(
  "kw-payroll-piecework",
  snapA,
  snapB,
);
assert("mergeIncomingWithStored additive+delete", sumActiveAdvances(normalizePayrollPieceworkState(mergedViaCloud).advances, "alloc-piotrek") === 700);

// Phase 1 / hourly regression
assert("compensationModel still hourly default", directoryCompensationModel({}) === "hourly");
const we = weekEmployeeFromDir({
  id: "dir-1",
  name: "X",
  phone: "",
  position: "",
  defaultRate: "30",
  startDate: "2026-01-01",
  active: true,
  notes: "",
});
const calc = calcWeekEmployee({
  ...we,
  days: { ...defaultDays(), Pn: { active: true, from: "07:00", to: "16:00", zaliczka: "" } },
});
assert("hourly calc still works", calc.weekHours > 0 && calc.grossPay > 0);

// updateAdvance over limit
let lim = emptyPayrollPieceworkState();
lim = createPieceworkJob(lim, { jobId: "j", id: "pj", now: T0 }).state;
lim = createAllocation(lim, {
  pieceworkJobId: "pj",
  directoryId: "d",
  agreedAmount: 1000,
  id: "al",
  now: T0,
}).state;
lim = createAdvance(lim, { allocationId: "al", amount: 800, id: "ad1", now: T0 }).state;
assert("updateAdvance over limit rejected", updateAdvance(lim, { id: "ad1", amount: 1100, now: T1 }).ok === false);
assert("updateAdvance within limit ok", updateAdvance(lim, { id: "ad1", amount: 900, now: T1 }).ok === true);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
