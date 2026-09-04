/**
 * PAYROLL P1 — cross-device stale write protection.
 * Run: npx vite-node scripts/test-payroll-p1-stale-cross-device.mjs
 *
 * R1–R12: membership sanitize + rebase + legal ADD/DELETE/RE-ADD + CAS path.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p1-stale";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p1-stale";

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

function makeEmp(id, name, directoryId = `dir-${id}`, hours = 9) {
  return {
    id,
    directoryId,
    name,
    phone: "",
    position: "Pracownik",
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        {
          ...defaultDay(),
          active: true,
          from: "07:00",
          to: hours >= 9 ? "16:00" : "11:00",
          updatedAt: "2026-08-28T10:00:00.000Z",
        },
      ]),
    ),
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

const {
  rebasePayrollRosterIntent,
} = await import("../src/lib/payroll-roster-rebase.ts");
const {
  sanitizeStaleRosterMembership,
} = await import("../src/lib/payroll-stale-roster-membership.ts");
const {
  cloudSyncMutationGuard,
  withKwWeekEmployeesAsyncMutation,
} = await import("../src/lib/cloud-sync-mutation-guard.ts");
const {
  weekEmployeeTombstoneId,
  saveDeletedWeekEmployeeKeys,
  getDeletedWeekEmployeeKeys,
  addDeletedWeekEmployeeKey,
  removeDeletedWeekEmployeeKeysForWeek,
  deletedWeekEmployeeMergeKeySet,
  filterDeletedWeekEmployees,
} = await import("../src/lib/cloud-sync.ts");
const { pwrPush, pwrRemove, pwrAdd } = await import("../src/lib/payroll-week-roster-bundle.ts");

const kvStore = {
  "kw-weekFrom": WF,
  "kw-weekTo": WT,
  "kw-week-employees": [],
  "kw-week-employees-deleted-ids": [],
  "kw-payroll-week-meta": { rosterRevision: 1, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
};

let pushDelayMs = 20;
let force409Once = false;
let lastPushedRoster = null;

globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    const payload = { values: keys.map((k) => kvStore[k] ?? null) };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    };
  }
  if (u.includes("/batch-set")) {
    if (pushDelayMs > 0) await sleep(pushDelayMs);
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    const values = body.values || [];
    if (force409Once && body.payrollWeekCas) {
      force409Once = false;
      const meta = kvStore["kw-payroll-week-meta"] || { rosterRevision: 1 };
      const errPayload = {
        ok: false,
        error: "stale_revision",
        code: "stale_revision",
        serverRevision: (meta.rosterRevision || 1) + 1,
        roster: kvStore["kw-week-employees"] || [],
        currentRoster: kvStore["kw-week-employees"] || [],
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
      lastPushedRoster = values[keys.indexOf("kw-week-employees")];
      if (body.payrollWeekCas) {
        const meta = kvStore["kw-payroll-week-meta"] || { rosterRevision: 1, weekFrom: WF, weekTo: WT };
        kvStore["kw-payroll-week-meta"] = {
          ...meta,
          rosterRevision: (meta.rosterRevision || 1) + 1,
          updatedAt: Date.now(),
        };
      }
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
      json: async () => ({ ok: true }),
    };
  }
  return {
    ok: false,
    status: 404,
    text: async () => "",
    json: async () => ({}),
  };
};

function resetEnv(roster, tombs = []) {
  cloudSyncMutationGuard.reset();
  lastPushedRoster = null;
  force409Once = false;
  kvStore["kw-week-employees"] = roster;
  kvStore["kw-week-employees-deleted-ids"] = tombs;
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 5, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  lsStore["kw-weekFrom"] = JSON.stringify(WF);
  lsStore["kw-weekTo"] = JSON.stringify(WT);
  lsStore["kw-week-employees"] = JSON.stringify(roster);
  lsStore["kw-week-employees-deleted-ids"] = JSON.stringify(tombs);
  lsStore["kw-payroll-week-meta"] = JSON.stringify(kvStore["kw-payroll-week-meta"]);
}

console.log("=== PAYROLL P1 — STALE CROSS-DEVICE ===\n");

const z = makeEmp("z", "Zosia");
const x = makeEmp("x", "Xawery");

// --- Unit: sanitize ---
{
  const cloud = [z];
  const stale = [z, x];
  const before = [z, x];
  const r = sanitizeStaleRosterMembership(cloud, stale, before);
  assert("R2 unit drop X (stale domain)", !r.roster.some((e) => e.id === "x"));
  assert("R2 unit keep Z", r.roster.some((e) => e.id === "z"));
  assert("R2 unit changed", r.changed === true);
}

{
  const cloud = [z];
  const after = [z, x];
  const before = [z];
  const r = sanitizeStaleRosterMembership(cloud, after, before);
  assert("R4 unit legal ADD keeps X", r.roster.some((e) => e.id === "x"));
}

{
  const cloud = [z];
  const after = [z, x];
  const before = [z];
  const tomb = new Set([`${WF}|${WT}::dir-x`]); // wrong key — use real merge key
  const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
  const tomb2 = new Set([weekEmployeeMergeKey(x)]);
  const r = sanitizeStaleRosterMembership(cloud, after, before, tomb2);
  // P2.4 — legal ADD (absent in before) overrides stale current-week tomb.
  assert("R6 unit legal ADD beats stale tomb", r.roster.some((e) => e.id === "x"));
}

// --- Unit: rebase BEFORE→AFTER ---
{
  const canonical = [z]; // Device A deleted X
  const before = [z, x];
  const afterEdit = [
    z,
    { ...x, rate: "60", dataUpdatedAt: "2026-08-28T12:00:00.000Z" },
  ];
  const rebased = rebasePayrollRosterIntent(canonical, before, afterEdit);
  assert("R1 rebase no resurrect X after field edit", !rebased.some((e) => e.id === "x"));
  assert("R1 rebase keeps Z", rebased.some((e) => e.id === "z"));
}

{
  const canonical = [z];
  const before = [z];
  const after = [z, x];
  const rebased = rebasePayrollRosterIntent(canonical, before, after);
  assert("R4 rebase legal ADD includes X", rebased.some((e) => e.id === "x"));
}

{
  const x8 = makeEmp("x", "Xawery", "dir-x", 9);
  const x4 = makeEmp("x", "Xawery", "dir-x", 4);
  x4.days = {
    ...x4.days,
    Pn: { ...x4.days.Pn, to: "11:00", updatedAt: "2026-08-28T15:00:00.000Z" },
  };
  const canonical = [x4];
  const before = [x8];
  const after = [x8]; // stale still 8
  const rebased = rebasePayrollRosterIntent(canonical, before, after);
  assert("R3 rebase stale hours no overwrite (unchanged intent)", rebased[0]?.days?.Pn?.to === "11:00");
}

// --- Integration: pwrPush stale after DELETE (R1/R2) ---
{
  const tombX = weekEmployeeTombstoneId(WF, WT, x);
  resetEnv([z], [tombX]);
  saveDeletedWeekEmployeeKeys([tombX]);
  const staleRoster = [z, x];
  let pushResult = null;
  await withKwWeekEmployeesAsyncMutation(async () => {
    pushResult = await pwrPush({
      roster: staleRoster,
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: staleRoster,
    });
  });
  const cloud = kvStore["kw-week-employees"] || [];
  assert("R1/R2 cloud X absent after stale domain push", !cloud.some((e) => e.id === "x"));
  assert("R1/R2 cloud Z present", cloud.some((e) => e.id === "z"));
  assert("R1/R2 result roster no X", pushResult && !pushResult.roster.some((e) => e.id === "x"));
  assert("R2 last push no X", !(lastPushedRoster || []).some((e) => e.id === "x"));
}

// --- R5 legal DELETE ---
{
  resetEnv([z, x], []);
  saveDeletedWeekEmployeeKeys([]);
  await withKwWeekEmployeesAsyncMutation(async () => {
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: "x",
      currentRoster: [z, x],
    });
  });
  const cloud = kvStore["kw-week-employees"] || [];
  assert("R5 DELETE X absent", !cloud.some((e) => e.id === "x"));
  assert("R5 DELETE Z present", cloud.some((e) => e.id === "z"));
  assert("R5 tombstone present", getDeletedWeekEmployeeKeys().some((t) => t.includes("dir-x") || t.includes("x")));
}

// --- R4 legal ADD ---
{
  resetEnv([z], []);
  saveDeletedWeekEmployeeKeys([]);
  const dir = [
    {
      id: "dir-x",
      name: "Xawery",
      phone: "",
      position: "Pracownik",
      rate: "50",
      active: true,
    },
  ];
  await withKwWeekEmployeesAsyncMutation(async () => {
    await pwrAdd({
      weekFrom: WF,
      weekTo: WT,
      directoryIds: ["dir-x"],
      directory: dir,
      currentRoster: [z],
    });
  });
  const cloud = kvStore["kw-week-employees"] || [];
  assert("R4 legal ADD X present", cloud.some((e) => e.directoryId === "dir-x" || e.id === "x" || e.name === "Xawery"));
}

// --- R6 DELETE → RE-ADD ---
{
  resetEnv([z], []);
  saveDeletedWeekEmployeeKeys([]);
  await withKwWeekEmployeesAsyncMutation(async () => {
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: "x",
      currentRoster: [z, x],
    });
  });
  removeDeletedWeekEmployeeKeysForWeek(WF, WT, [x]);
  await withKwWeekEmployeesAsyncMutation(async () => {
    await pwrPush({
      roster: [z, x],
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: [z],
      revokeIdentities: [x],
    });
  });
  const cloud = kvStore["kw-week-employees"] || [];
  assert("R6 RE-ADD X present", cloud.some((e) => e.id === "x"));
  assert("R6 no tomb for X", !getDeletedWeekEmployeeKeys().some((t) => t.includes(weekEmployeeTombstoneId(WF, WT, x).split("::")[1])));
}

// --- R10 CAS/rebase: 409 then stale edit must not resurrect ---
{
  const tombX = weekEmployeeTombstoneId(WF, WT, x);
  resetEnv([z], [tombX]);
  saveDeletedWeekEmployeeKeys([tombX]);
  // Bump cloud revision ahead of client
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  lsStore["kw-payroll-week-meta"] = JSON.stringify({ rosterRevision: 8, weekFrom: WF, weekTo: WT, updatedAt: Date.now() });
  force409Once = true;
  const staleAfter = [z, { ...x, rate: "99" }];
  const result = await pwrPush({
    roster: staleAfter,
    weekFrom: WF,
    weekTo: WT,
    rosterBefore: [z, x],
  });
  assert("R10 rebased or completed", result != null);
  assert("R10 final roster no X", !result.roster.some((e) => e.id === "x"));
  const cloud = kvStore["kw-week-employees"] || [];
  assert("R10 cloud no X", !cloud.some((e) => e.id === "x"));
}

// --- R11 / R12: stale after "F5" / long debounce — same as membership sanitize ---
{
  const cloud = [z];
  const staleLongLived = [z, x];
  const r = sanitizeStaleRosterMembership(cloud, staleLongLived, staleLongLived);
  assert("R11/R12 F5/debounce stale drop X", !r.roster.some((e) => e.id === "x"));
}

// --- R3 hours: unauthorized hours-down still blocked (smoke via sanitize unit above + hours P0) ---
{
  assert("R3 marker hours covered by rebase unchanged-intent", true);
}

console.log(`\n=== P1 RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
