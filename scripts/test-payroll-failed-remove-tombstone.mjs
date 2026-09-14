/**
 * PAYROLL GAP-3 — failed REMOVE tomb revoke when Cloud still contains person.
 * Phase 3 success / 409 mid-path unchanged (tomb still before push).
 * Run: npx vite-node scripts/test-payroll-failed-remove-tombstone.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-gap3-remove";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-gap3-remove";

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
const WF2 = "2026-09-21";
const WT2 = "2026-09-26";
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
    ...patch,
  };
}

const A = emp("id-a", "dir-a", "Alice");
const B = emp("id-b", "dir-b", "Bob");
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
  filterDeletedWeekEmployees,
  deletedWeekEmployeeMergeKeySet,
} = await import("../src/lib/cloud-sync.ts");
const {
  writePayrollWeekMetaToLs,
  normalizePayrollWeekMeta,
} = await import("../src/lib/payroll-week-meta.ts");
const { setCloudFreshnessAllowWritesForTests } = await import("../src/lib/cloud-freshness-gate.ts");
const { readFileSync } = await import("fs");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");
const __dir = dirname(fileURLToPath(import.meta.url));

setCloudFreshnessAllowWritesForTests(true);

function resetHarness(roster = [], tombs = [], rev = 5, weekFrom = WF, weekTo = WT) {
  cloudSyncMutationGuard.reset();
  cloudSyncMutationGuard.resetWriteChainForTests();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
  kvStore["kw-weekFrom"] = weekFrom;
  kvStore["kw-weekTo"] = weekTo;
  kvStore["kw-week-employees"] = JSON.parse(JSON.stringify(roster));
  kvStore["kw-week-employees-deleted-ids"] = [...tombs];
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: rev,
    weekFrom,
    weekTo,
    updatedAt: Date.now(),
  };
  localStorage.setItem("kw-weekFrom", JSON.stringify(weekFrom));
  localStorage.setItem("kw-weekTo", JSON.stringify(weekTo));
  localStorage.setItem("kw-week-employees", JSON.stringify(roster));
  saveDeletedWeekEmployeeKeys(tombs);
  writePayrollWeekMetaToLs(
    normalizePayrollWeekMeta(
      { rosterRevision: rev, weekFrom, weekTo, updatedAt: Date.now() },
      weekFrom,
      weekTo,
    ),
  );
  force409Count = 0;
}

console.log("=== PAYROLL GAP-3 FAILED REMOVE TOMBSTONE ===\n");

{
  const src = readFileSync(join(__dir, "../src/lib/payroll-week-roster-bundle.ts"), "utf8");
  assert(
    "I1-F source tomb still before push",
    /export async function pwrRemove[\s\S]*?addDeletedWeekEmployeeKey[\s\S]*?pushRosterWithRebase/.test(src),
  );
  assert(
    "I1-F source revoke on fail when Cloud has person",
    /export async function pwrRemove[\s\S]*?stillOnCloud[\s\S]*?removeDeletedWeekEmployeeKeysForWeek/.test(src),
  );
  const i1 = readFileSync(join(__dir, "../src/lib/cloud-sync.ts"), "utf8");
  assert(
    "I1-F I1 helper signature unchanged",
    i1.includes("function applyI1CloudRosterTombstoneRevocation"),
  );
}

// I1-F1 failed remove + Cloud contains B → tomb revoked
{
  resetHarness([A, B, C], [], 5);
  force409Count = 99;
  let threw = false;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B, C] });
  } catch {
    threw = true;
  }
  const tombKey = weekEmployeeTombstoneId(WF, WT, B);
  assert("I1-F1 threw", threw);
  assert("I1-F1 Cloud still has B", (kvStore["kw-week-employees"] || []).some((e) => e.id === B.id));
  assert("I1-F1 tomb revoked", !getDeletedWeekEmployeeKeys().includes(tombKey));
}

// I1-F2 failed remove + I1 path: after revoke, filterDeleted does not suppress B
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  const tombKeys = deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT);
  const filtered = filterDeletedWeekEmployees([A, B], tombKeys);
  assert("I1-F2 B not suppressed by tomb filter", filtered.some((e) => e.id === B.id));
}

// I1-F3 failed remove + later re-add (pwrAdd) works
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  force409Count = 0;
  const dir = [{ id: "dir-b", name: "Bob", phone: "", position: "", rate: "30" }];
  // Soft path: push with B present (concurrent re-add already on cloud)
  kvStore["kw-week-employees"] = [A, B];
  const result = await pwrPush({
    roster: [A, B],
    weekFrom: WF,
    weekTo: WT,
    rosterBefore: [A, B],
  });
  assert("I1-F3 later push keeps B", result.roster.some((e) => e.id === B.id));
  assert("I1-F3 no B tomb after fail+push", !getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)));
}

// I1-F4 failed remove + subsequent pwrPush must not apply stale delete intent
{
  resetHarness([A, B, C], [], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B, C] });
  } catch {
    /* expected */
  }
  force409Count = 0;
  const pushed = await pwrPush({
    roster: [A, B, C],
    weekFrom: WF,
    weekTo: WT,
    rosterBefore: [A, B, C],
  });
  assert("I1-F4 push keeps B", pushed.roster.some((e) => e.id === B.id));
  assert(
    "I1-F4 Cloud keeps B",
    (kvStore["kw-week-employees"] || []).some((e) => e.id === B.id),
  );
}

// I1-F5 successful remove unchanged
{
  resetHarness([A, B, C], [], 5);
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: B.id,
    currentRoster: [A, B, C],
  });
  assert("I1-F5 success drops B", !result.roster.some((e) => e.id === B.id));
  assert("I1-F5 Cloud no B", !(kvStore["kw-week-employees"] || []).some((e) => e.id === B.id));
  assert(
    "I1-F5 tomb survives success",
    getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)),
  );
}

// I1-F6 409 remove then success unchanged
{
  resetHarness([A, B, C], [], 5);
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: B.id,
    currentRoster: [A, B, C],
  });
  assert("I1-F6 409-then-ok drops B", !result.roster.some((e) => e.id === B.id));
  assert(
    "I1-F6 tomb after success",
    getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)),
  );
}

// I1-F7 cross-week tombstone isolation
{
  const otherTomb = weekEmployeeTombstoneId(WF2, WT2, B);
  resetHarness([A, B], [otherTomb], 5);
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  const tombs = getDeletedWeekEmployeeKeys();
  assert("I1-F7 other-week tomb preserved", tombs.includes(otherTomb));
  assert(
    "I1-F7 current-week B tomb revoked",
    !tombs.includes(weekEmployeeTombstoneId(WF, WT, B)),
  );
}

// I1-F8 concurrent ADD/remove — fail remove B while Cloud has C; revoke B tomb
{
  resetHarness([A, B], [], 5);
  kvStore["kw-week-employees"] = [A, B, C];
  force409Count = 99;
  try {
    await pwrRemove({ weekFrom: WF, weekTo: WT, employeeId: B.id, currentRoster: [A, B] });
  } catch {
    /* expected */
  }
  assert("I1-F8 Cloud keeps C", (kvStore["kw-week-employees"] || []).some((e) => e.id === C.id));
  assert(
    "I1-F8 B tomb revoked (Cloud still has B)",
    !getDeletedWeekEmployeeKeys().includes(weekEmployeeTombstoneId(WF, WT, B)),
  );
}

console.log(`\n=== GAP-3 RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
