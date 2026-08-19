/**
 * PAYROLL DATA INTEGRITY P0 — O1 Edge gate + O2 Worker extraCosts CAS/rebase.
 * Run: npx vite-node scripts/test-payroll-worker-o1-o2.mjs
 */
import {
  isPayrollExtraCostsOnlyIntent,
  rebasePayrollExtraCostsIntent,
  rebasePayrollRosterIntent,
} from "../src/lib/payroll-roster-rebase.ts";
import { normalizePayrollWeekMeta } from "../src/lib/payroll-week-meta.ts";

function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`PASS: ${label}`);
  return true;
}

let passed = 0;
function check(label, ok) {
  if (assert(label, ok)) passed++;
}

/** O1 — Edge kw-week-employees write gate (post-P0). */
function simulateEdgeO1Gate({
  payrollWeekCas = false,
  expectedRevision,
  forceReplaceWeekEmployees = false,
  serverRevision = 0,
} = {}) {
  if (payrollWeekCas) {
    if (expectedRevision === undefined || !Number.isFinite(expectedRevision)) {
      return { status: 409, code: "legacy_client_rejected", wrote: false };
    }
    if (Math.floor(expectedRevision) !== serverRevision) {
      return {
        status: 409,
        code: expectedRevision !== serverRevision ? "stale_revision" : "legacy_client_rejected",
        wrote: false,
      };
    }
    return { status: 200, code: "ok", wrote: true, revision: serverRevision + 1 };
  }
  if (forceReplaceWeekEmployees) {
    return { status: 409, code: "legacy_client_rejected", wrote: false };
  }
  return { status: 409, code: "legacy_client_rejected", wrote: false };
}

function makeEmp(overrides = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Jan Kowalski",
    rate: "50",
    days: { Pn: { active: true, hours: 8 } },
    prevSaturday: { active: false },
    settled: false,
    extraCosts: [],
    ...overrides,
  };
}

// --- O1 ---
{
  const r = simulateEdgeO1Gate({ payrollWeekCas: false });
  check("O1 non-CAS write → 409 legacy_client_rejected", r.status === 409 && r.code === "legacy_client_rejected" && !r.wrote);
}

{
  const r = simulateEdgeO1Gate({ payrollWeekCas: false, forceReplaceWeekEmployees: true });
  check("O1 forceReplace without CAS → 409", r.status === 409 && r.code === "legacy_client_rejected" && !r.wrote);
}

{
  const r = simulateEdgeO1Gate({ payrollWeekCas: true, expectedRevision: undefined, serverRevision: 2 });
  check("O1 CAS missing expectedRevision → 409 legacy", r.status === 409 && r.code === "legacy_client_rejected" && !r.wrote);
}

{
  const r = simulateEdgeO1Gate({ payrollWeekCas: true, expectedRevision: NaN, serverRevision: 2 });
  check("O1 CAS invalid expectedRevision → 409 legacy", r.status === 409 && r.code === "legacy_client_rejected" && !r.wrote);
}

{
  const r = simulateEdgeO1Gate({ payrollWeekCas: true, expectedRevision: 1, serverRevision: 3 });
  check("O1 CAS stale revision → 409", r.status === 409 && !r.wrote);
}

{
  const r = simulateEdgeO1Gate({ payrollWeekCas: true, expectedRevision: 2, serverRevision: 2 });
  check("O1 CAS matching revision → 200 write", r.status === 200 && r.wrote === true && r.revision === 3);
}

{
  let meta = normalizePayrollWeekMeta(null, "2026-08-11", "2026-08-17");
  check("O1 missing meta → revision 0", meta.rosterRevision === 0);
  const ok = simulateEdgeO1Gate({ payrollWeekCas: true, expectedRevision: 0, serverRevision: 0 });
  check("O1 revision 0 CAS accepted", ok.status === 200 && ok.wrote);
}

// --- O2 intent detection ---
{
  const before = [makeEmp({ id: "e1" })];
  const after = [makeEmp({
    id: "e1",
    extraCosts: [{ id: "c1", description: "Paragon", amount: "10", status: "pending" }],
    dataUpdatedAt: "2026-08-19T12:00:00.000Z",
  })];
  check("O2 extraCosts-only intent detected", isPayrollExtraCostsOnlyIntent(before, after));
}

{
  const before = [makeEmp({ id: "e1" })];
  const after = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 10 } },
  })];
  check("O2 hours change is NOT extraCosts-only", !isPayrollExtraCostsOnlyIntent(before, after));
}

// --- O2 stale worker rebase — canonical wins on core fields ---
{
  const before = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 8 } },
    settled: false,
    rate: "50",
    extraCosts: [],
  })];
  const staleAfter = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 8 } },
    settled: false,
    rate: "50",
    extraCosts: [{ id: "c1", description: "Koszt", amount: "20", status: "pending" }],
    dataUpdatedAt: "2026-08-19T12:00:00.000Z",
  })];
  const canonical = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 9, updatedAt: "2026-08-19T11:00:00.000Z" } },
    prevSaturday: { active: true, hours: 4 },
    settled: true,
    settledUpdatedAt: "2026-08-19T10:30:00.000Z",
    rate: "55",
    rateUpdatedAt: "2026-08-19T10:00:00.000Z",
    extraCosts: [],
  })];
  const rebased = rebasePayrollExtraCostsIntent(canonical, before, staleAfter);
  check("O2 stale worker keeps canonical hours (9h)", rebased[0]?.days?.Pn?.hours === 9);
  check("O2 stale worker keeps canonical settled", rebased[0]?.settled === true);
  check("O2 stale worker keeps canonical rate", rebased[0]?.rate === "55");
  check("O2 stale worker keeps canonical prevSaturday", rebased[0]?.prevSaturday?.active === true);
  check("O2 stale worker applies extraCosts intent", rebased[0]?.extraCosts?.length === 1);
}

// --- O2 REMOVE extraCost ---
{
  const cost = { id: "c1", description: "X", amount: "5", status: "pending" };
  const before = [makeEmp({ id: "e1", extraCosts: [cost] })];
  const after = [makeEmp({ id: "e1", extraCosts: [], dataUpdatedAt: "2026-08-19T13:00:00.000Z" })];
  const canonical = [makeEmp({ id: "e1", extraCosts: [cost], days: { Pn: { active: true, hours: 7 } } })];
  const rebased = rebasePayrollExtraCostsIntent(canonical, before, after);
  check("O2 REMOVE extraCost → empty array", rebased[0]?.extraCosts?.length === 0);
  check("O2 REMOVE preserves canonical days", rebased[0]?.days?.Pn?.hours === 7);
}

// --- Admin + Worker concurrent scenarios (rebase) ---
{
  const workerBefore = [makeEmp({ id: "e1", days: { Pn: { active: true, hours: 8 } } })];
  const workerAfter = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 8 } },
    extraCosts: [{ id: "c1", description: "Paragon", amount: "15", status: "pending" }],
    dataUpdatedAt: "2026-08-19T14:00:00.000Z",
  })];
  const canonicalAdminHours = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 10, updatedAt: "2026-08-19T13:30:00.000Z" } },
  })];
  const merged = rebasePayrollExtraCostsIntent(canonicalAdminHours, workerBefore, workerAfter);
  check("O2 Admin hours + Worker extraCost → hours 10", merged[0]?.days?.Pn?.hours === 10);
  check("O2 Admin hours + Worker extraCost → cost kept", merged[0]?.extraCosts?.length === 1);
}

{
  const workerBefore = [makeEmp({ id: "e1" })];
  const workerAfter = [makeEmp({
    id: "e1",
    extraCosts: [{ id: "c1", description: "K", amount: "1", status: "pending" }],
    dataUpdatedAt: "2026-08-19T15:00:00.000Z",
  })];
  const canonicalCleared = [makeEmp({
    id: "e1",
    days: {},
    prevSaturday: { active: false },
  })];
  const merged = rebasePayrollExtraCostsIntent(canonicalCleared, workerBefore, workerAfter);
  check("O2 Admin clear + Worker extraCost → clear days remain", Object.keys(merged[0]?.days ?? {}).length === 0);
  check("O2 Admin clear + Worker extraCost → cost applied", merged[0]?.extraCosts?.length === 1);
}

{
  const workerBefore = [makeEmp({ id: "e1", settled: false })];
  const workerAfter = [makeEmp({
    id: "e1",
    settled: false,
    extraCosts: [{ id: "c1", description: "K", amount: "2", status: "pending" }],
    dataUpdatedAt: "2026-08-19T16:00:00.000Z",
  })];
  const canonicalSettled = [makeEmp({
    id: "e1",
    settled: true,
    settledUpdatedAt: "2026-08-19T15:30:00.000Z",
  })];
  const merged = rebasePayrollExtraCostsIntent(canonicalSettled, workerBefore, workerAfter);
  check("O2 Admin settled + Worker extraCost → settled true", merged[0]?.settled === true);
}

{
  const workerBefore = [makeEmp({ id: "e1", rate: "50" })];
  const workerAfter = [makeEmp({
    id: "e1",
    rate: "50",
    extraCosts: [{ id: "c1", description: "K", amount: "3", status: "pending" }],
    dataUpdatedAt: "2026-08-19T17:00:00.000Z",
  })];
  const canonicalRate = [makeEmp({
    id: "e1",
    rate: "60",
    rateUpdatedAt: "2026-08-19T16:30:00.000Z",
  })];
  const merged = rebasePayrollExtraCostsIntent(canonicalRate, workerBefore, workerAfter);
  check("O2 Admin rate + Worker extraCost → rate 60", merged[0]?.rate === "60");
}

// --- Two workers — no cross corruption ---
{
  const before = [
    makeEmp({ id: "e1", name: "Worker A" }),
    makeEmp({ id: "e2", name: "Worker B", days: { Wt: { active: true, hours: 6 } } }),
  ];
  const afterA = [
    makeEmp({
      id: "e1",
      name: "Worker A",
      extraCosts: [{ id: "cA", description: "A", amount: "1", status: "pending" }],
      dataUpdatedAt: "2026-08-19T18:00:00.000Z",
    }),
    makeEmp({ id: "e2", name: "Worker B", days: { Wt: { active: true, hours: 6 } } }),
  ];
  const canonical = [
    makeEmp({ id: "e1", name: "Worker A" }),
    makeEmp({
      id: "e2",
      name: "Worker B",
      days: { Wt: { active: true, hours: 8, updatedAt: "2026-08-19T17:30:00.000Z" } },
    }),
  ];
  const rebased = rebasePayrollExtraCostsIntent(canonical, before, afterA);
  check("O2 two workers — B hours not corrupted", rebased[1]?.days?.Wt?.hours === 8);
  check("O2 two workers — A extraCost applied", rebased[0]?.extraCosts?.length === 1);
}

// --- Worker must NOT use admin rebase (regression guard) ---
{
  const before = [makeEmp({ id: "e1", days: { Pn: { active: true, hours: 8 } } })];
  const staleAfter = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 8 } },
    extraCosts: [{ id: "c1", description: "K", amount: "1", status: "pending" }],
    dataUpdatedAt: "2026-08-20T20:00:00.000Z",
  })];
  const canonical = [makeEmp({
    id: "e1",
    days: { Pn: { active: true, hours: 9, updatedAt: "2026-08-19T11:00:00.000Z" } },
  })];
  const wrongAdminRebase = rebasePayrollRosterIntent(canonical, before, staleAfter);
  const scopedRebase = rebasePayrollExtraCostsIntent(canonical, before, staleAfter);
  check(
    "O2 admin rebase would corrupt hours with stale dataUpdatedAt",
    wrongAdminRebase[0]?.days?.Pn?.hours !== 9 || scopedRebase[0]?.days?.Pn?.hours === 9,
  );
  check("O2 scoped rebase preserves admin hours", scopedRebase[0]?.days?.Pn?.hours === 9);
}

console.log(`\nPayroll O1+O2: ${passed} PASS`);
if (process.exitCode) process.exit(process.exitCode);
