/**
 * PAYROLL Phase 3 — pwrRemove CAS / 409 rebase / fail-loud.
 * Run: npx vite-node scripts/test-payroll-pwr-remove-cas.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-pwr-remove-cas";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-pwr-remove-cas";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function defaultDay() {
  return { active: false, from: "07:00", to: "16:00", zaliczka: "" };
}

function makeEmp(id, name, overrides = {}) {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        { ...defaultDay(), active: true, from: "07:00", to: "16:00", updatedAt: "2026-09-14T10:00:00.000Z" },
      ]),
    ),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
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

let force409Count = 0;
let batchSetCalls = 0;
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
    batchSetCalls += 1;
    const body = JSON.parse(String(opts?.body || "{}"));
    const keys = body.keys || [];
    const values = body.values || [];
    if (force409Count > 0 && body.payrollWeekCas) {
      force409Count -= 1;
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

const {
  cloudSyncMutationGuard,
} = await import("../src/lib/cloud-sync-mutation-guard.ts");
const { pwrPush, pwrRemove, pwrAdd } = await import("../src/lib/payroll-week-roster-bundle.ts");
const {
  weekEmployeeTombstoneId,
  getDeletedWeekEmployeeKeys,
  saveDeletedWeekEmployeeKeys,
  deletedWeekEmployeeMergeKeySet,
  PayrollStaleRevisionError,
} = await import("../src/lib/cloud-sync.ts");
const {
  writePayrollWeekMetaToLs,
  normalizePayrollWeekMeta,
} = await import("../src/lib/payroll-week-meta.ts");
const { readFileSync } = await import("fs");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");
const __dir = dirname(fileURLToPath(import.meta.url));

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
  batchSetCalls = 0;
  lastPushedRoster = null;
}

function cloudHas(id) {
  return (kvStore["kw-week-employees"] || []).some((e) => e.id === id);
}

function tombHas(emp) {
  const id = weekEmployeeTombstoneId(WF, WT, emp);
  const tombs = kvStore["kw-week-employees-deleted-ids"] || getDeletedWeekEmployeeKeys();
  return tombs.includes(id) || getDeletedWeekEmployeeKeys().includes(id);
}

function pnHours(emp) {
  const d = emp?.days?.Pn;
  if (!d?.active) return 0;
  const [fh, fm] = String(d.from || "0").split(":").map(Number);
  const [th, tm] = String(d.to || "0").split(":").map(Number);
  return (th + tm / 60) - (fh + fm / 60);
}

const Z = makeEmp("z1", "Zygmunt", {
  payrollManualAdjustment: { amount: 40, description: "urlop", updatedAt: "2026-09-14T09:00:00.000Z" },
  extraCosts: [{ id: "c-z", description: "Parking", amount: "12", status: "approved", updatedAt: "2026-09-14T09:00:00.000Z" }],
  payrollCarryForward: {
    amount: 200,
    targetWeekFrom: "2026-09-21",
    targetWeekTo: "2026-09-26",
    createdAt: "2026-09-14T08:00:00.000Z",
  },
  settled: true,
  settledUpdatedAt: "2026-09-14T07:00:00.000Z",
});
const K = makeEmp("k1", "Karol");
const Y = makeEmp("y1", "York");

console.log("=== PAYROLL PHASE 3 — pwrRemove CAS ===\n");

// T1 — remove + CAS success
{
  resetHarness([Z, K], [], 5);
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T1 pushed", result.pushed === true);
  assert("T1 cloud K absent", !cloudHas(K.id));
  assert("T1 cloud Z present", cloudHas(Z.id));
  assert("T1 tomb present", tombHas(K));
  assert("T1 result no K", !result.roster.some((e) => e.id === K.id));
}

// T2 — 409 + unrelated Cloud change (Z rate)
{
  const Zrate = {
    ...Z,
    rate: "60",
    rateUpdatedAt: "2026-09-14T12:00:00.000Z",
    dataUpdatedAt: "2026-09-14T12:00:00.000Z",
  };
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Zrate, K];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T2 K removed", !cloudHas(K.id) && !result.roster.some((e) => e.id === K.id));
  const zOut = result.roster.find((e) => e.id === Z.id) || (kvStore["kw-week-employees"] || []).find((e) => e.id === Z.id);
  assert("T2 Z rate preserved", zOut?.rate === "60");
  assert("T2 tomb", tombHas(K));
}

// T3 — 409 + concurrent ADD Y
{
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Z, K, Y];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T3 K removed", !result.roster.some((e) => e.id === K.id) && !cloudHas(K.id));
  assert("T3 Y preserved", result.roster.some((e) => e.id === Y.id) && cloudHas(Y.id));
  assert("T3 Z preserved", result.roster.some((e) => e.id === Z.id));
}

// T4 — 409 + concurrent hours on Z (same total hours — shift Pn window)
{
  const Zshift = {
    ...Z,
    days: {
      ...Z.days,
      Pn: { ...Z.days.Pn, from: "08:00", to: "17:00", updatedAt: "2026-09-14T13:00:00.000Z" },
    },
    dataUpdatedAt: "2026-09-14T13:00:00.000Z",
  };
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Zshift, K];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  const zOut = result.roster.find((e) => e.id === Z.id);
  assert("T4 K gone", !result.roster.some((e) => e.id === K.id));
  assert("T4 Pn shift kept", zOut?.days?.Pn?.from === "08:00" && zOut?.days?.Pn?.to === "17:00");
}

// T5 — 409 + concurrent extraCosts on Z
{
  const Zcost = {
    ...Z,
    extraCosts: [
      ...(Z.extraCosts || []),
      { id: "c-new", description: "Taxi", amount: "30", status: "approved", updatedAt: "2026-09-14T14:00:00.000Z" },
    ],
    dataUpdatedAt: "2026-09-14T14:00:00.000Z",
  };
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Zcost, K];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  const zOut = result.roster.find((e) => e.id === Z.id);
  const ids = (zOut?.extraCosts || []).map((c) => c.id).sort().join(",");
  assert("T5 K gone", !result.roster.some((e) => e.id === K.id));
  assert("T5 extraCosts preserved", ids.includes("c-new") && ids.includes("c-z"));
}

// T6 — fresh Cloud still contains K; intentional REMOVE wins
{
  resetHarness([Z, K], [], 5);
  force409Count = 1;
  // Cloud unchanged on 409 still has K
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T6 K absent final", !result.roster.some((e) => e.id === K.id) && !cloudHas(K.id));
}

// T7 — tombstone survives rebase
{
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Z, K, Y];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T7 tomb after rebase", tombHas(K));
}

// T8 — successful retry cannot resurrect K
{
  resetHarness([Z, K], [], 5);
  force409Count = 1;
  await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T8 cloud no K", !cloudHas(K.id));
  assert("T8 last push no K", !(lastPushedRoster || []).some((e) => e.id === K.id));
}

// T9 — multiple 409s within bound (2 × 409 then success)
{
  resetHarness([Z, K], [], 5);
  force409Count = 2;
  batchSetCalls = 0;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T9 success after 2×409", result.pushed === true && !cloudHas(K.id));
  assert("T9 batch-set calls >= 3", batchSetCalls >= 3);
}

// T10 — retry exhaustion → THROW (not pushed:false)
{
  resetHarness([Z, K], [], 5);
  force409Count = 10;
  let threw = null;
  try {
    await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId: K.id,
      currentRoster: [Z, K],
    });
  } catch (e) {
    threw = e;
  }
  assert("T10 threw", threw != null);
  assert(
    "T10 stale revision",
    threw instanceof PayrollStaleRevisionError || threw?.name === "PayrollStaleRevisionError" || /stale/i.test(String(threw?.message || "")),
  );
  assert("T10 not silent pushed:false", true);
}

// T11 — ACK roster includes concurrent Y
{
  resetHarness([Z, K], [], 5);
  kvStore["kw-week-employees"] = [Z, K, Y];
  kvStore["kw-payroll-week-meta"] = { rosterRevision: 9, weekFrom: WF, weekTo: WT, updatedAt: Date.now() };
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T11 ACK has Y", result.roster.some((e) => e.id === Y.id));
  assert("T11 ACK no K", !result.roster.some((e) => e.id === K.id));
  const appSrc = readFileSync(join(__dir, "../src/app/App.tsx"), "utf8");
  assert("T11 App pwrRemove.ack", appSrc.includes('pwrRemove.ack') && appSrc.includes("setWeekEmployees(result.roster"));
}

// T12 — pwrAdd unchanged (still uses pushRosterWithRebase; smoke ADD)
{
  resetHarness([Z], [], 5);
  const dir = [{ id: "dir-y1", name: "York", phone: "", position: "Pracownik", rate: "50", active: true }];
  const add = await pwrAdd({
    weekFrom: WF,
    weekTo: WT,
    directoryIds: ["dir-y1"],
    directory: dir,
    currentRoster: [Z],
  });
  assert("T12 add pushed", add.pushed === true);
  assert("T12 Y present", (kvStore["kw-week-employees"] || []).some((e) => e.directoryId === "dir-y1"));
  const bundleSrc = readFileSync(join(__dir, "../src/lib/payroll-week-roster-bundle.ts"), "utf8");
  assert("T12 pwrAdd still rebase", /pwrAdd[\s\S]*?pushRosterWithRebase/.test(bundleSrc));
}

// T13 — pwrPush unchanged
{
  resetHarness([Z], [], 5);
  const pushed = await pwrPush({
    roster: [{ ...Z, rate: "55", rateUpdatedAt: "2026-09-14T15:00:00.000Z" }],
    weekFrom: WF,
    weekTo: WT,
    rosterBefore: [Z],
  });
  assert("T13 push ok", pushed.roster.some((e) => e.id === Z.id));
  const bundleSrc = readFileSync(join(__dir, "../src/lib/payroll-week-roster-bundle.ts"), "utf8");
  assert("T13 pwrPush still rebase", /pwrPush[\s\S]*?pushRosterWithRebase/.test(bundleSrc));
}

// T14 — I1: after successful REMOVE, Cloud without K → tomb cannot be stripped by I1 (person ∉ cloud)
{
  resetHarness([Z, K], [], 5);
  force409Count = 1;
  await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T14 tomb after success", tombHas(K));
  assert("T14 cloud no K (I1 safe)", !cloudHas(K.id));
  // I1 strips tomb only when mergeKey ∈ cloud roster — Cloud lacks K ⇒ tomb stays.
  const tombKey = weekEmployeeTombstoneId(WF, WT, K);
  const mergeKeysOnCloud = deletedWeekEmployeeMergeKeySet(
    [tombKey],
    WF,
    WT,
  );
  const cloudHasMerge = (kvStore["kw-week-employees"] || []).some((e) => {
    const id = e.directoryId ? `dir:${e.directoryId}` : `id:${e.id}`;
    return mergeKeysOnCloud.has(id) || mergeKeysOnCloud.has(`dir:${e.directoryId}`);
  });
  assert("T14 cloud does not carry K merge identity", cloudHasMerge === false);
  assert("T14 local tomb still listed", getDeletedWeekEmployeeKeys().includes(tombKey));
}

// T15 / T16 — only K removed; Z data intact
{
  resetHarness([Z, K], [], 5);
  force409Count = 1;
  kvStore["kw-week-employees"] = [Z, K];
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  assert("T15 Z still present", result.roster.some((e) => e.id === Z.id));
  assert("T16 only K removed", result.roster.every((e) => e.id !== K.id) && result.roster.length === 1);
}

// T17–T20 — field preservation on Z
{
  resetHarness([Z, K], [], 5);
  force409Count = 1;
  const result = await pwrRemove({
    weekFrom: WF,
    weekTo: WT,
    employeeId: K.id,
    currentRoster: [Z, K],
  });
  const zOut = result.roster.find((e) => e.id === Z.id);
  assert("T17 MA unchanged", zOut?.payrollManualAdjustment?.amount === 40);
  assert("T18 extraCosts unchanged", (zOut?.extraCosts || []).some((c) => c.id === "c-z"));
  assert("T19 carryForward unchanged", zOut?.payrollCarryForward?.amount === 200);
  assert("T20 settled unchanged", zOut?.settled === true);
}

console.log(`\n=== PHASE3 pwrRemove RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
