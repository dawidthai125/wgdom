/**
 * PAYROLL FINAL GAPS — cross-gap interaction (X1–X5).
 * Run: npx vite-node scripts/test-payroll-final-gaps-cross.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-final-gaps-x";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-final-gaps-x";

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

const WF = "2026-09-14";
const WT = "2026-09-19";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

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

function defaultDay() {
  return { active: true, from: "07:00", to: "16:00", zaliczka: "", updatedAt: "2026-09-14T10:00:00.000Z" };
}
function defaultDays() {
  return Object.fromEntries(DAYS.map((d) => [d, defaultDay()]));
}
function emp(id, directoryId, name, patch = {}) {
  return {
    id,
    directoryId,
    name,
    rate: "30",
    days: defaultDays(),
    settled: false,
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
    ...patch,
  };
}

const NOW = "2026-09-14T12:00:00.000Z";
const EARLIER = "2026-09-14T11:00:00.000Z";

function cost(id, desc, amount, updatedAt, deletedAt) {
  return {
    id,
    description: desc,
    amount: String(amount),
    status: "approved",
    ...(updatedAt ? { updatedAt } : {}),
    ...(deletedAt ? { deletedAt } : {}),
  };
}

const A = emp("id-a", "dir-a", "Alice", {
  extraCosts: [cost("c1", "glue", 20, EARLIER)],
  payrollCarryForward: {
    amount: 100,
    targetWeekFrom: "2026-09-21",
    targetWeekTo: "2026-09-26",
    createdAt: EARLIER,
  },
});
const B = emp("id-b", "dir-b", "Bob", {
  extraCosts: [cost("c2", "tape", 15, EARLIER)],
  payrollCarryForward: {
    amount: 50,
    targetWeekFrom: "2026-09-21",
    targetWeekTo: "2026-09-26",
    createdAt: EARLIER,
  },
});
const C = emp("id-c", "dir-c", "Carol");

const kvStore = {
  "kw-weekFrom": WF,
  "kw-weekTo": WT,
  "kw-week-employees": [],
  "kw-week-employees-deleted-ids": [],
  "kw-payroll-week-meta": { rosterRevision: 1, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
};

let force409Count = 0;

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    const payload = { values: keys.map((k) => kvStore[k] ?? null) };
    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    };
  }
  if (u.includes("/batch-set") || u.includes("/kv-batch-set")) {
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    const values = body.values || [];
    if (force409Count > 0) {
      force409Count -= 1;
      const errPayload = {
        error: "stale_revision",
        code: "stale_revision",
        serverRevision: (kvStore["kw-payroll-week-meta"]?.rosterRevision || 0) + 1,
        roster: kvStore["kw-week-employees"],
        message: "stale payroll revision",
      };
      return {
        ok: false,
        status: 409,
        text: async () => JSON.stringify(errPayload),
        json: async () => errPayload,
      };
    }
    for (let i = 0; i < keys.length; i++) {
      kvStore[keys[i]] = values[i];
    }
    if (keys.includes("kw-week-employees")) {
      const prev = kvStore["kw-payroll-week-meta"] || { rosterRevision: 0 };
      kvStore["kw-payroll-week-meta"] = {
        rosterRevision: (prev.rosterRevision || 0) + 1,
        weekFrom: WF,
        weekTo: WT,
        updatedAt: Date.now(),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ ok: true, payrollWeekMeta: kvStore["kw-payroll-week-meta"] }),
      json: async () => ({ ok: true, payrollWeekMeta: kvStore["kw-payroll-week-meta"] }),
    };
  }
  return { ok: true, status: 200, json: async () => ({}), text: async () => "{}" };
};

const { cloudSyncMutationGuard } = await import("../src/lib/cloud-sync-mutation-guard.ts");
const { pwrRemove, pwrPush } = await import("../src/lib/payroll-week-roster-bundle.ts");
const {
  weekEmployeeTombstoneId,
  getDeletedWeekEmployeeKeys,
  saveDeletedWeekEmployeeKeys,
} = await import("../src/lib/cloud-sync.ts");
const {
  writePayrollWeekMetaToLs,
  normalizePayrollWeekMeta,
} = await import("../src/lib/payroll-week-meta.ts");
const { setCloudFreshnessAllowWritesForTests } = await import("../src/lib/cloud-freshness-gate.ts");
const {
  stampExtraCostsOnEdit,
  mergeExtraCostsById,
  isExtraCostDeleted,
} = await import("../src/lib/payroll-extra-costs-merge.ts");
const { mergeWeekEmployeeRecord } = await import("../src/lib/payroll-week-employee-record-merge.ts");
const { rebasePayrollFieldIntents } = await import("../src/lib/payroll-field-intent.ts");

setCloudFreshnessAllowWritesForTests(true);

function resetHarness(roster = [], tombs = [], rev = 5) {
  cloudSyncMutationGuard.reset();
  cloudSyncMutationGuard.resetWriteChainForTests();
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
  force409Count = 0;
}

console.log("=== PAYROLL FINAL GAPS CROSS ===\n");

// X1 failed REMOVE + employee has extraCosts → no unrelated corruption
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  const cloudA = (kvStore["kw-week-employees"] || []).find((e) => e.id === A.id);
  const cloudB = (kvStore["kw-week-employees"] || []).find((e) => e.id === B.id);
  assert("X1 A extraCosts intact", cloudA?.extraCosts?.[0]?.id === "c1");
  assert("X1 B still on Cloud with costs", cloudB?.extraCosts?.[0]?.id === "c2");
  assert("X1 B tomb revoked", !getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)));
}

// X2 failed REMOVE + concurrent extraCost DELETE/UPDATE
{
  const Bdel = {
    ...B,
    extraCosts: stampExtraCostsOnEdit(B.extraCosts, [], NOW),
  };
  const BupdPeer = {
    ...B,
    extraCosts: [cost("c2", "tape-edit", 40, NOW)],
  };
  const mergedCosts = mergeExtraCostsById(Bdel.extraCosts, BupdPeer.extraCosts);
  assert("X2 cost delete beats stale update", isExtraCostDeleted(mergedCosts.find((c) => c.id === "c2")));

  resetHarness([A, BupdPeer], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, Bdel] });
  } catch {
    /* expected */
  }
  assert("X2 B remains on Cloud", (kvStore["kw-week-employees"] || []).some((e) => e.id === B.id));
}

// X3 failed REMOVE + payrollCarryForward SET (no CLEAR UI — SET preserved)
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  const cloudB = (kvStore["kw-week-employees"] || []).find((e) => e.id === B.id);
  assert("X3 carryForward amount preserved", cloudB?.payrollCarryForward?.amount === 50);
  assert("X3 A carry intact", (kvStore["kw-week-employees"] || []).find((e) => e.id === A.id)?.payrollCarryForward?.amount === 100);
}

// X4 successful REMOVE + mechanisms unchanged
{
  resetHarness([A, B, C], [], 5);
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: B.id,
    currentRoster: [A, B, C],
  });
  assert("X4 success no B", !result.roster.some((e) => e.id === B.id));
  assert("X4 A costs/carry intact", result.roster.find((e) => e.id === A.id)?.extraCosts?.[0]?.id === "c1"
    && result.roster.find((e) => e.id === A.id)?.payrollCarryForward?.amount === 100);
  assert("X4 tomb kept", getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)));
}

// X5 concurrent REMOVE + cost DELETE + carry SET (deterministic merge)
{
  const before = emp("id-x", "dir-x", "Xena", {
    extraCosts: [cost("cx", "old", 1, EARLIER)],
    payrollCarryForward: {
      amount: 10,
      targetWeekFrom: "2026-09-21",
      targetWeekTo: "2026-09-26",
      createdAt: EARLIER,
    },
  });
  const afterLocal = {
    ...before,
    extraCosts: stampExtraCostsOnEdit(before.extraCosts, [], NOW),
    payrollCarryForward: {
      amount: 77,
      targetWeekFrom: "2026-09-21",
      targetWeekTo: "2026-09-26",
      createdAt: NOW,
    },
  };
  const cloudPeer = {
    ...before,
    extraCosts: [cost("cx", "peer", 9, NOW)],
    payrollCarryForward: {
      amount: 10,
      targetWeekFrom: "2026-09-21",
      targetWeekTo: "2026-09-26",
      createdAt: EARLIER,
    },
  };
  const rebased = rebasePayrollFieldIntents(
    [cloudPeer],
    [before],
    [afterLocal],
    undefined,
    WF,
    WT,
  );
  const row = rebased[0];
  assert("X5 cost deleted", isExtraCostDeleted((row.extraCosts || []).find((c) => c.id === "cx")));
  assert("X5 carry SET wins", row.payrollCarryForward?.amount === 77);

  resetHarness([before, A], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: before.id,
      currentRoster: [before, A],
    });
  } catch {
    /* expected */
  }
  assert(
    "X5 failed remove does not permanently tomb when Cloud has person",
    !getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, before)),
  );

  // record merge sanity
  const rec = mergeWeekEmployeeRecord(afterLocal, cloudPeer);
  assert("X5 record merge delete+carry", isExtraCostDeleted((rec.extraCosts || [])[0])
    && rec.payrollCarryForward?.amount === 77);
}

console.log(`\n=== CROSS-GAP RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
