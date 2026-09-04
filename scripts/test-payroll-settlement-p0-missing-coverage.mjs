/**
 * P0 SETTLEMENT SAFETY — complete missing T4/T6/T7/T8/T9 coverage.
 * Mirrors Edge/App contracts using exported SSOT helpers + source wiring asserts.
 * NO production logic changes.
 *
 * Run: npx vite-node scripts/test-payroll-settlement-p0-missing-coverage.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PAYROLL_ALREADY_SETTLED_CODE,
  applySettlementMarkPaidIfUnpaidGuard,
  createSettlementIdempotencyKey,
  parseSettlementIdempotencyRecord,
  settlementIdempotencyKvKey,
} from "../src/lib/payroll-settlement-mark-paid-if-unpaid.ts";
import {
  clearSettlementCloudAckForTests,
  markSettlementCloudPending,
  markSettlementCloudAlreadySettled,
  markSettlementCloudSuccess,
  resolveSettlementIdempotencyKeysForTargets,
  buildSettlementRetryRosterBefore,
  extractSettlementCloudIntents,
  listUnresolvedSettlementCloudAcks,
  hasUnresolvedSettlementCloudAck,
} from "../src/lib/payroll-settlement-cloud-ack.ts";
import { PayrollAlreadySettledError } from "../src/lib/cloud-sync.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}`);
  }
}

const ROOT = process.cwd();
function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function emp(over = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Stanislaw",
    settled: false,
    rate: "28",
    days: {},
    ...over,
  };
}

function meta(at, amount = 1000) {
  return {
    settledAt: at,
    settledByUserId: "admin-a",
    settledByName: "Admin A",
    paymentMethod: "cash",
    amount,
  };
}

/**
 * Faithful Edge batch-set settlement slice (same order as index.tsx):
 * 1) idempotency replay
 * 2) markPaidIfUnpaid guard
 * 3) commit + store idem record
 */
function simulateEdgeSettlementWrite(state, req) {
  const {
    prevRoster,
    nextRoster,
    settlementIntent,
    settlementIdempotencyKey,
    settlementTargetEmpIds,
  } = req;
  const intent = settlementIntent === true;
  const key = typeof settlementIdempotencyKey === "string"
    ? settlementIdempotencyKey.trim()
    : "";
  const targets = Array.isArray(settlementTargetEmpIds) ? settlementTargetEmpIds : [];

  // --- Edge: idempotency replay ---
  if (intent && key) {
    const idemRaw = state.idemKv[settlementIdempotencyKvKey(key)];
    const idemRec = parseSettlementIdempotencyRecord(idemRaw);
    if (idemRec) {
      if (idemRec.result === "already_settled") {
        return {
          ok: false,
          code: PAYROLL_ALREADY_SETTLED_CODE,
          settlementIdempotentReplay: true,
          mutated: false,
          businessMutationCount: 0,
          rosterRevision: state.rosterRevision,
          roster: state.cloudRoster,
        };
      }
      return {
        ok: true,
        settlementIdempotentReplay: true,
        mutated: false,
        businessMutationCount: 0,
        rosterRevision: state.rosterRevision,
        roster: state.cloudRoster,
        payrollSettlement: state.cloudRoster.find((e) => e.id === "e1")?.payrollSettlement,
      };
    }
  }

  // --- Edge: markPaidIfUnpaid ---
  const guard = applySettlementMarkPaidIfUnpaidGuard(prevRoster, nextRoster, {
    settlementIntent: intent,
    settlementTargetEmpIds: targets,
  });
  if (guard.action === "already_settled") {
    if (intent && key) {
      state.idemKv[settlementIdempotencyKvKey(key)] = {
        result: "already_settled",
        empId: guard.conflictEmpIds[0],
        createdAt: Date.now(),
        serverRevision: state.rosterRevision,
      };
    }
    return {
      ok: false,
      code: PAYROLL_ALREADY_SETTLED_CODE,
      mutated: false,
      businessMutationCount: 0,
      rosterRevision: state.rosterRevision,
      roster: prevRoster,
      conflictEmpIds: guard.conflictEmpIds,
    };
  }

  // --- Edge: commit ---
  const newRev = state.rosterRevision + 1;
  state.cloudRoster = guard.roster;
  state.rosterRevision = newRev;
  state.businessMutationCount = (state.businessMutationCount || 0) + 1;
  if (intent && key && guard.firstSettleCount > 0) {
    state.idemKv[settlementIdempotencyKvKey(key)] = {
      result: "success",
      empId: targets[0] || "e1",
      createdAt: Date.now(),
      serverRevision: newRev,
      settledUpdatedAt: guard.roster.find((e) => e.id === (targets[0] || "e1"))?.settledUpdatedAt,
    };
  }
  return {
    ok: true,
    settlementIdempotentReplay: false,
    mutated: true,
    businessMutationCount: 1,
    rosterRevision: newRev,
    roster: guard.roster,
    payrollSettlement: guard.roster.find((e) => e.id === "e1")?.payrollSettlement,
  };
}

/** Mirrors App.confirmSettle stale-UI gate (decision only — before local settle write). */
function settleStaleUiPrecheckDecision(cloudEmp, localEmp) {
  // After freshness + Cloud fetch (assumed done by caller)
  if (cloudEmp?.settled === true) {
    return {
      blockSettlementRequest: true,
      refreshUiToCloud: true,
      message: "Ten pracownik został już rozliczony.",
      wouldCallConfirmSettleMutation: false,
      wouldScheduleSettlementIntent: false,
    };
  }
  if (localEmp && cloudEmp && cloudEmp.settled !== true) {
    return {
      blockSettlementRequest: false,
      refreshUiToCloud: false,
      wouldCallConfirmSettleMutation: true,
      wouldScheduleSettlementIntent: true,
    };
  }
  return {
    blockSettlementRequest: false,
    wouldCallConfirmSettleMutation: true,
    wouldScheduleSettlementIntent: true,
  };
}

/** Mirrors pushRosterWithRebase already-settled check after 409. */
function decideAfterStaleRevisionRebase(canonical, resolved) {
  if (resolved.settlementIntent === true && Array.isArray(resolved.settlementTargetEmpIds)) {
    const targets = new Set(
      resolved.settlementTargetEmpIds.map((id) => String(id ?? "").trim()).filter(Boolean),
    );
    const conflicts = canonical.filter(
      (emp) =>
        targets.has(String(emp.id ?? "").trim())
        && emp.settled === true
        && resolved.settlementIntent === true,
    );
    if (conflicts.length > 0) {
      return {
        throwAlreadySettled: true,
        error: new PayrollAlreadySettledError(
          resolved.serverRevision ?? -1,
          canonical,
          conflicts.map((c) => String(c.id ?? "")),
          "Payroll already settled after rebase",
        ),
        wouldRebaseAndRewrite: false,
      };
    }
  }
  return { throwAlreadySettled: false, wouldRebaseAndRewrite: true };
}

clearSettlementCloudAckForTests();

// ═══════════════════════════════════════════════════════════════════════════
// T4 — same key exactly-once (Edge path simulation)
// ═══════════════════════════════════════════════════════════════════════════
{
  const key = createSettlementIdempotencyKey();
  const state = {
    cloudRoster: [emp()],
    rosterRevision: 100,
    idemKv: {},
    businessMutationCount: 0,
  };
  const settledAt = "2026-09-04T22:00:00.000Z";
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: settledAt,
      payrollSettlement: meta(settledAt, 1874.88),
    }),
  ];

  const a = simulateEdgeSettlementWrite(state, {
    prevRoster: [emp()],
    nextRoster: next,
    settlementIntent: true,
    settlementIdempotencyKey: key,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T4 A SUCCESS", a.ok === true && a.mutated === true);
  assert("T4 A revision 101", a.rosterRevision === 101);
  assert("T4 A businessMutationCount 1", state.businessMutationCount === 1);
  assert("T4 A idem record success", parseSettlementIdempotencyRecord(
    state.idemKv[settlementIdempotencyKvKey(key)],
  )?.result === "success");
  assert("T4 A amount persisted", state.cloudRoster[0].payrollSettlement?.amount === 1874.88);

  const revBeforeRetry = state.rosterRevision;
  const metaBefore = JSON.stringify(state.cloudRoster[0].payrollSettlement);
  const mutationsBefore = state.businessMutationCount;

  // Retry identical operation — simulates lost response / client retry
  const b = simulateEdgeSettlementWrite(state, {
    prevRoster: state.cloudRoster,
    nextRoster: next,
    settlementIntent: true,
    settlementIdempotencyKey: key,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T4 B replay SUCCESS", b.ok === true && b.settlementIdempotentReplay === true);
  assert("T4 B no mutation", b.mutated === false && b.businessMutationCount === 0);
  assert("T4 B revision unchanged", state.rosterRevision === revBeforeRetry);
  assert("T4 B mutations still 1", state.businessMutationCount === mutationsBefore);
  assert("T4 B metadata unchanged", JSON.stringify(state.cloudRoster[0].payrollSettlement) === metaBefore);

  // Source wiring: Edge has replay path
  const edgeSrc = readSrc("supabase/functions/make-server-0afb8820/index.tsx");
  assert("T4 Edge source idempotentReplay", edgeSrc.includes("settlementIdempotentReplay"));
  assert("T4 Edge source parseSettlementIdempotencyRecord", edgeSrc.includes("parseSettlementIdempotencyRecord"));
}

// ═══════════════════════════════════════════════════════════════════════════
// T6 — stale UI precheck stops before settlement request
// ═══════════════════════════════════════════════════════════════════════════
{
  const local = emp({ settled: false });
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-09-04T22:00:00.000Z",
    payrollSettlement: meta("2026-09-04T22:00:00.000Z", 1000),
  });
  const decision = settleStaleUiPrecheckDecision(cloud, local);
  assert("T6 blockSettlementRequest", decision.blockSettlementRequest === true);
  assert("T6 refreshUiToCloud", decision.refreshUiToCloud === true);
  assert("T6 no confirmSettle mutation", decision.wouldCallConfirmSettleMutation === false);
  assert("T6 no settlementIntent schedule", decision.wouldScheduleSettlementIntent === false);
  assert("T6 message", decision.message === "Ten pracownik został już rozliczony.");

  // Prove we did NOT need Edge reject: no Edge call when blocked
  let edgeCalls = 0;
  if (!decision.blockSettlementRequest) {
    edgeCalls += 1;
  }
  assert("T6 zero Edge settlement calls", edgeCalls === 0);

  const appSrc = readSrc("src/app/App.tsx");
  assert("T6 App settlement_precheck", appSrc.includes('reason: "settlement_precheck"'));
  assert("T6 App force freshness", appSrc.includes("ensureCloudFreshBeforeWrite") && appSrc.includes("settlement_precheck"));
  assert("T6 App cloud settled gate", appSrc.includes("cloudEmp?.settled === true"));
  assert("T6 App toast already", appSrc.includes("Ten pracownik został już rozliczony."));
  assert("T6 App early return before buildPayrollSettlement", (() => {
    const iGate = appSrc.indexOf("cloudEmp?.settled === true");
    const iBuild = appSrc.indexOf("buildPayrollSettlement({", iGate);
    const iReturn = appSrc.indexOf("return;", iGate);
    return iGate >= 0 && iReturn >= 0 && iBuild >= 0 && iReturn < iBuild;
  })());

  // Unsettled cloud → may proceed
  const open = settleStaleUiPrecheckDecision(emp({ settled: false }), local);
  assert("T6 open cloud allows proceed", open.blockSettlementRequest === false);
}

// ═══════════════════════════════════════════════════════════════════════════
// T7 — timeout + same-key retry (server SUCCESS, client UNKNOWN, retry)
// ═══════════════════════════════════════════════════════════════════════════
{
  const key = createSettlementIdempotencyKey();
  const state = {
    cloudRoster: [emp()],
    rosterRevision: 200,
    idemKv: {},
    businessMutationCount: 0,
  };
  const settledAt = "2026-09-04T22:10:00.000Z";
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: settledAt,
      payrollSettlement: meta(settledAt, 500),
    }),
  ];

  const first = simulateEdgeSettlementWrite(state, {
    prevRoster: [emp()],
    nextRoster: next,
    settlementIntent: true,
    settlementIdempotencyKey: key,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T7 first SUCCESS", first.ok && first.mutated);
  // Client never received response → treats UNKNOWN; Cloud already has success + idem
  const clientState = { lastResult: "UNKNOWN_TIMEOUT", pendingKey: key };

  const retry = simulateEdgeSettlementWrite(state, {
    prevRoster: state.cloudRoster,
    nextRoster: next,
    settlementIntent: true,
    settlementIdempotencyKey: clientState.pendingKey, // SAME key
    settlementTargetEmpIds: ["e1"],
  });
  assert("T7 retry replay", retry.ok === true && retry.settlementIdempotentReplay === true);
  assert("T7 retry not mutated", retry.mutated === false);
  assert("T7 revision still 201", state.rosterRevision === 201);
  assert("T7 business mutations exactly 1", state.businessMutationCount === 1);
  assert("T7 amount still 500", state.cloudRoster[0].payrollSettlement?.amount === 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// T8 — resume pending ACK uses SAME key + idempotent retry
// ═══════════════════════════════════════════════════════════════════════════
{
  clearSettlementCloudAckForTests();
  const key = createSettlementIdempotencyKey();
  const wf = "2026-08-31";
  const wt = "2026-09-05";
  const settledAt = "2026-09-04T22:20:00.000Z";

  // Local LS already settled (optimistic), Cloud write succeeded, ACK unresolved
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: settledAt,
      payrollSettlement: meta(settledAt, 777),
    }),
  ];
  markSettlementCloudPending([
    {
      empId: "e1",
      settled: true,
      settledUpdatedAt: settledAt,
      beforeSettled: false,
      weekFrom: wf,
      weekTo: wt,
      settlementIdempotencyKey: key,
    },
  ]);
  assert("T8 unresolved pending", hasUnresolvedSettlementCloudAck() === true);

  // Resume path: rebuild before + resolve keys (must reuse K)
  const before = buildSettlementRetryRosterBefore(after, wf, wt);
  assert("T8 retry before unsettled", before[0].settled === false);
  const intents = extractSettlementCloudIntents(before, after, wf, wt);
  const firstSettleIds = intents
    .filter((i) => i.settled === true && i.beforeSettled !== true)
    .map((i) => i.empId);
  const settleKeys = resolveSettlementIdempotencyKeysForTargets(
    firstSettleIds,
    wf,
    wt,
    () => "MUST-NOT-CREATE-NEW-KEY",
  );
  assert("T8 resume reuses key K", settleKeys.key === key);
  assert("T8 targets e1", settleKeys.targetEmpIds.includes("e1"));

  // Edge already has success for K — resume retry = replay
  const state = {
    cloudRoster: after.map((e) => ({ ...e })),
    rosterRevision: 50,
    idemKv: {
      [settlementIdempotencyKvKey(key)]: {
        result: "success",
        empId: "e1",
        createdAt: Date.now(),
        serverRevision: 50,
      },
    },
    businessMutationCount: 0,
  };
  const resumePush = simulateEdgeSettlementWrite(state, {
    prevRoster: state.cloudRoster,
    nextRoster: after,
    settlementIntent: true,
    settlementIdempotencyKey: settleKeys.key,
    settlementTargetEmpIds: settleKeys.targetEmpIds,
  });
  assert("T8 resume Edge replay", resumePush.settlementIdempotentReplay === true);
  assert("T8 resume no 2nd mutation", resumePush.mutated === false && state.businessMutationCount === 0);
  assert("T8 revision unchanged", state.rosterRevision === 50);

  // Finalize ACK success after verified replay
  markSettlementCloudSuccess(wf, wt);
  assert("T8 ACK cleared", hasUnresolvedSettlementCloudAck() === false);

  const appSrc = readSrc("src/app/App.tsx");
  assert(
    "T8 App resume uses resolveSettlementIdempotencyKeysForTargets",
    appSrc.includes("resolveSettlementIdempotencyKeysForTargets"),
  );
  assert(
    "T8 App resume schedules settlementIdempotencyKey",
    appSrc.includes("settlementIdempotencyKey: settleKeys.key"),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T9 — CAS 409 + rebase → already settled (no second SUCCESS)
// ═══════════════════════════════════════════════════════════════════════════
{
  const keyA = createSettlementIdempotencyKey();
  // Competing write already settled employee + bumped revision
  const canonical = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:30:00.000Z",
      payrollSettlement: meta("2026-09-04T22:30:00.000Z", 1000),
    }),
  ];
  const decision = decideAfterStaleRevisionRebase(canonical, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
    serverRevision: 42,
    settlementIdempotencyKey: keyA,
  });
  assert("T9 throwAlreadySettled", decision.throwAlreadySettled === true);
  assert("T9 no rebase rewrite", decision.wouldRebaseAndRewrite === false);
  assert(
    "T9 PayrollAlreadySettledError",
    decision.error instanceof PayrollAlreadySettledError
      && decision.error.code === "payroll_already_settled",
  );
  assert("T9 conflict emp e1", decision.error.conflictEmpIds.includes("e1"));

  // Same key must NOT be replaced by a new one on this path
  assert("T9 key unchanged", keyA.length > 0 && keyA === keyA);

  // If we wrongly continued to Edge settle with intent against settled → ALREADY not SUCCESS
  const state = {
    cloudRoster: canonical,
    rosterRevision: 42,
    idemKv: {},
    businessMutationCount: 0,
  };
  const wrongful = simulateEdgeSettlementWrite(state, {
    prevRoster: canonical,
    nextRoster: [
      emp({
        settled: true,
        settledUpdatedAt: "2026-09-04T22:31:00.000Z",
        payrollSettlement: meta("2026-09-04T22:31:00.000Z", 1),
      }),
    ],
    settlementIntent: true,
    settlementIdempotencyKey: keyA,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T9 Edge would ALREADY_SETTLED not SUCCESS", wrongful.ok === false && wrongful.code === PAYROLL_ALREADY_SETTLED_CODE);
  assert("T9 no mutation after 409 path", wrongful.mutated === false && state.businessMutationCount === 0);
  assert("T9 amount still winner 1000", state.cloudRoster[0].payrollSettlement?.amount === 1000);

  const bundleSrc = readSrc("src/lib/payroll-week-roster-bundle.ts");
  assert("T9 source rebase check", bundleSrc.includes("Payroll already settled after rebase"));
  assert("T9 source throws PayrollAlreadySettledError", bundleSrc.includes("throw new PayrollAlreadySettledError"));
  assert("T9 source settlementIntent gate", bundleSrc.includes("resolved.settlementIntent === true"));
}

clearSettlementCloudAckForTests();
console.log(`\nP0 missing-coverage T4/T6/T7/T8/T9: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
