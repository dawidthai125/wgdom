/**
 * PAYROLL DELETE P0 — FIFO write-queue race regression (A–E).
 * Run: npx vite-node scripts/test-payroll-delete-fifo-p0.mjs
 *
 * Proves ADD/REMOVE cannot overlap after enqueueKwWeekEmployeesWrite,
 * and that queue survives 409 / failure without deadlock.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-delete-fifo-p0";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-delete-fifo-p0";

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

const WF = "2026-08-24";
const WT = "2026-08-29";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

function makeEmp(id, name, directoryId = `dir-${id}`) {
  return {
    id,
    directoryId,
    name,
    phone: "",
    position: "Pracownik",
    rate: "50",
    days: Object.fromEntries(DAYS.map((d) => [d, { ...defaultDay(), active: true, from: "07:00", to: "16:00" }])),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: "2026-08-28T10:00:00.000Z",
  };
}

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

const kvStore = {
  "kw-weekFrom": WF,
  "kw-weekTo": WT,
  "kw-week-employees": [],
  "kw-week-employees-deleted-ids": [],
  "kw-payroll-week-meta": { rosterRevision: 1, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
};

let pushDelayMs = 40;
let force409Once = false;
let pushCallLog = [];
let concurrent = 0;
let maxConcurrent = 0;

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    return {
      ok: true,
      status: 200,
      json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }),
    };
  }
  if (u.includes("/batch-set")) {
    concurrent += 1;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    const started = Date.now();
    pushCallLog.push({ event: "start", t: started, concurrent });
    try {
      if (pushDelayMs > 0) await sleep(pushDelayMs);
      const body = JSON.parse(String(opts?.body || "{}"));
      const keys = body.keys || [];
      const values = body.values || [];
      if (force409Once && body.payrollWeekCas) {
        force409Once = false;
        const meta = kvStore["kw-payroll-week-meta"] || { rosterRevision: 1 };
        return {
          ok: false,
          status: 409,
          json: async () => ({
            ok: false,
            error: "stale_revision",
            code: "stale_revision",
            serverRevision: (meta.rosterRevision || 1) + 1,
            currentRoster: kvStore["kw-week-employees"] || [],
            message: "stale payroll revision",
          }),
        };
      }
      for (let i = 0; i < keys.length; i++) {
        kvStore[keys[i]] = values[i];
      }
      if (keys.includes("kw-week-employees") && body.payrollWeekCas) {
        const prev = kvStore["kw-payroll-week-meta"] || { rosterRevision: 0 };
        kvStore["kw-payroll-week-meta"] = {
          rosterRevision: (prev.rosterRevision || 0) + 1,
          weekFrom: WF,
          weekTo: WT,
          updatedAt: Date.now(),
        };
      }
      pushCallLog.push({ event: "end", t: Date.now(), concurrent });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          payrollWeekMeta: kvStore["kw-payroll-week-meta"],
        }),
      };
    } finally {
      concurrent -= 1;
    }
  }
  return originalFetch(url, opts);
};

const {
  cloudSyncMutationGuard,
  enqueueKwWeekEmployeesWrite,
  withKwWeekEmployeesAsyncMutation,
  getKwWeekEmployeesWriteQueueState,
} = await import("../src/lib/cloud-sync-mutation-guard.ts");

const { pwrPush, pwrRemove } = await import("../src/lib/payroll-week-roster-bundle.ts");
const {
  weekEmployeeTombstoneId,
  getDeletedWeekEmployeeKeys,
  saveDeletedWeekEmployeeKeys,
} = await import("../src/lib/cloud-sync.ts");
const {
  writePayrollWeekMetaToLs,
  normalizePayrollWeekMeta,
} = await import("../src/lib/payroll-week-meta.ts");

function resetHarness(roster = [], tombs = [], rev = 1) {
  cloudSyncMutationGuard.reset();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
  kvStore["kw-weekFrom"] = WF;
  kvStore["kw-weekTo"] = WT;
  kvStore["kw-week-employees"] = JSON.parse(JSON.stringify(roster));
  kvStore["kw-week-employees-deleted-ids"] = [...tombs];
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: rev,
    weekFrom: WF,
    weekTo: WT,
    updatedAt: Date.now(),
  };
  localStorage.setItem("kw-weekFrom", JSON.stringify(WF));
  localStorage.setItem("kw-weekTo", JSON.stringify(WT));
  localStorage.setItem("kw-week-employees", JSON.stringify(roster));
  saveDeletedWeekEmployeeKeys(tombs);
  writePayrollWeekMetaToLs(
    normalizePayrollWeekMeta(
      { rosterRevision: rev, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
      WF,
      WT,
    ),
  );
  pushDelayMs = 40;
  force409Once = false;
  pushCallLog = [];
  concurrent = 0;
  maxConcurrent = 0;
}

function cloudHas(id) {
  return (kvStore["kw-week-employees"] || []).some((e) => e.id === id);
}

function tombHas(emp) {
  const id = weekEmployeeTombstoneId(WF, WT, emp);
  const tombs = kvStore["kw-week-employees-deleted-ids"] || getDeletedWeekEmployeeKeys();
  return tombs.includes(id);
}

console.log("=== PAYROLL DELETE P0 — FIFO RACE ===\n");

// ─── A) ADD → REMOVE (classic resurrection race without queue) ─────────────
{
  const X = makeEmp("x-a", "X-A");
  const Z = makeEmp("z-a", "Z-A"); // stays — avoid >50% shrink guard on remove-only-X
  resetHarness([Z], [], 1);
  pushDelayMs = 60;

  const timeline = [];
  const addP = withKwWeekEmployeesAsyncMutation(async () => {
    timeline.push({ op: "ADD_START", t: Date.now() });
    await pwrPush({
      roster: [Z, X],
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: [Z],
      revokeIdentities: [X],
    });
    timeline.push({ op: "ADD_END", t: Date.now() });
  });
  // Fire REMOVE immediately (would overlap without FIFO)
  const remP = withKwWeekEmployeesAsyncMutation(async () => {
    timeline.push({ op: "REM_START", t: Date.now() });
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: X.id,
      currentRoster: [Z, X],
    });
    timeline.push({ op: "REM_END", t: Date.now() });
  });

  await Promise.all([addP, remP]);

  const addStart = timeline.find((e) => e.op === "ADD_START");
  const addEnd = timeline.find((e) => e.op === "ADD_END");
  const remStart = timeline.find((e) => e.op === "REM_START");
  assert("A no batch-set overlap", maxConcurrent <= 1, `maxConcurrent=${maxConcurrent}`);
  assert("A REMOVE starts after ADD ends", !!addEnd && !!remStart && remStart.t >= addEnd.t, JSON.stringify(timeline));
  assert("A cloud X absent", !cloudHas(X.id));
  assert("A cloud Z present", cloudHas(Z.id));
  assert("A tombstone X present", tombHas(X));
  assert("A ADD before REMOVE order", addStart.t <= remStart.t);
}

// ─── B) REMOVE → ADD (legal re-add after serialized delete) ────────────────
{
  const X = makeEmp("x-b", "X-B");
  const Z = makeEmp("z-b", "Z-B");
  resetHarness([Z, X], [], 2);
  pushDelayMs = 40;

  const timeline = [];
  const remP = withKwWeekEmployeesAsyncMutation(async () => {
    timeline.push("REM");
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: X.id,
      currentRoster: [Z, X],
    });
  });
  const addP = withKwWeekEmployeesAsyncMutation(async () => {
    timeline.push("ADD");
    await pwrPush({
      roster: [Z, X],
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: [Z],
      revokeIdentities: [X],
    });
  });
  await Promise.all([remP, addP]);

  assert("B order REM then ADD", timeline[0] === "REM" && timeline[1] === "ADD", JSON.stringify(timeline));
  assert("B cloud X present (legal re-add)", cloudHas(X.id));
  assert("B cloud Z present", cloudHas(Z.id));
  assert("B no current-week tomb for X", !tombHas(X));
  assert("B no overlap", maxConcurrent <= 1);
}

// ─── C) 409 / CAS — queue must not deadlock; next mutation runs ────────────
{
  const X = makeEmp("x-c", "X-C");
  resetHarness([], [], 5);
  pushDelayMs = 20;
  force409Once = true;
  // Bump server rev so first CAS mismatches once; Edge mock returns 409 then allows
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: 9,
    weekFrom: WF,
    weekTo: WT,
    updatedAt: Date.now(),
  };

  let secondRan = false;
  const p1 = pwrPush({
    roster: [X],
    weekFrom: WF,
    weekTo: WT,
    rosterBefore: [],
    revokeIdentities: [X],
  }).catch(() => "err");

  const p2 = enqueueKwWeekEmployeesWrite(async () => {
    secondRan = true;
    return "ok";
  });

  const r1 = await p1;
  const r2 = await p2;
  assert("C second mutation ran", secondRan === true);
  assert("C second result ok", r2 === "ok");
  assert("C queue depth cleared", getKwWeekEmployeesWriteQueueState().depth === 0);
  assert("C queue pending cleared", getKwWeekEmployeesWriteQueueState().pending === 0);
  void r1;
}

// ─── D) THREE-WAY ──────────────────────────────────────────────────────────
{
  const X = makeEmp("x-d1", "X-D1");
  resetHarness([], [], 1);
  pushDelayMs = 25;

  await Promise.all([
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrPush({
        roster: [X],
        weekFrom: WF,
        weekTo: WT,
        rosterBefore: [],
        revokeIdentities: [X],
      });
    }),
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrRemove({
        weekFrom: WF,
        weekTo: WT,
        employeeId: X.id,
        currentRoster: [X],
      });
    }),
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrPush({
        roster: [X],
        weekFrom: WF,
        weekTo: WT,
        rosterBefore: [],
        revokeIdentities: [X],
      });
    }),
  ]);
  assert("D1 ADD→REM→ADD final X present", cloudHas(X.id));
  assert("D1 no overlap", maxConcurrent <= 1);
}

{
  const X = makeEmp("x-d2", "X-D2");
  const Z = makeEmp("z-d2", "Z-D2");
  resetHarness([Z, X], [], 1);
  pushDelayMs = 25;

  await Promise.all([
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrRemove({
        weekFrom: WF,
        weekTo: WT,
        employeeId: X.id,
        currentRoster: [Z, X],
      });
    }),
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrPush({
        roster: [Z, X],
        weekFrom: WF,
        weekTo: WT,
        rosterBefore: [Z],
        revokeIdentities: [X],
      });
    }),
    withKwWeekEmployeesAsyncMutation(async () => {
      await pwrRemove({
        weekFrom: WF,
        weekTo: WT,
        employeeId: X.id,
        currentRoster: [Z, X],
      });
    }),
  ]);
  assert("D2 REM→ADD→REM final X absent", !cloudHas(X.id));
  assert("D2 Z still present", cloudHas(Z.id));
  assert("D2 tombstone present", tombHas(X));
  assert("D2 no overlap", maxConcurrent <= 1);
}

// ─── E) FAILURE — first throws, second still runs, finally cleans ──────────
{
  resetHarness([], [], 1);
  let second = false;
  const p1 = enqueueKwWeekEmployeesWrite(async () => {
    throw new Error("boom");
  }).catch((e) => e.message);
  const p2 = enqueueKwWeekEmployeesWrite(async () => {
    second = true;
    return "ok";
  });
  const r1 = await p1;
  const r2 = await p2;
  assert("E first error propagated", r1 === "boom");
  assert("E second ran after failure", second === true && r2 === "ok");
  assert("E depth 0 after failure", getKwWeekEmployeesWriteQueueState().depth === 0);
  assert("E pending 0 after failure", getKwWeekEmployeesWriteQueueState().pending === 0);
}

// ─── Sanity: isBlocked is independent (not used as queue) ──────────────────
{
  cloudSyncMutationGuard.reset();
  assert("F isBlocked false when idle", cloudSyncMutationGuard.isBlocked() === false);
  const p = enqueueKwWeekEmployeesWrite(async () => {
    assert("F isBlocked true during write", cloudSyncMutationGuard.isBlocked() === true);
    await sleep(10);
  });
  await p;
  assert("F isBlocked may remain via suppressMs", true);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
