/**
 * PAYROLL P1 — remove failure recovery: no optimistic membership drop.
 * Run: npx vite-node scripts/test-payroll-p1-remove-failure-recovery.mjs
 *
 * Primary fix is App.removeWeekEmployee (membership only on ACK).
 * Phase 3 pwrRemove / I1 / tombstone algorithm unchanged — reused here.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p1-remove-fail";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p1-remove-fail";

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
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    };
  }
  if (u.includes("/batch-set")) {
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
const { pwrRemove } = await import("../src/lib/payroll-week-roster-bundle.ts");
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
const { readFileSync } = await import("fs");
const { join, dirname } = await import("path");
const { fileURLToPath } = await import("url");
const __dir = dirname(fileURLToPath(import.meta.url));

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

/** Mimic App: UI roster only mutates on ACK; failure keeps prior UI. */
async function appRemovePolicy(uiRoster, employeeId) {
  const uiBefore = uiRoster.map((e) => ({ ...e }));
  let ui = uiBefore;
  try {
    const result = await pwrRemove({
      weekFrom: WF,
      weekTo: WT,
      employeeId,
      currentRoster: uiBefore,
    });
    if (result.pushed) ui = result.roster;
  } catch {
    // failure — membership unchanged (P1 contract)
  }
  return { uiBefore, ui, cloud: kvStore["kw-week-employees"] || [] };
}

console.log("=== PAYROLL P1 REMOVE FAILURE RECOVERY ===\n");

// ─── App / Phase 3 source contracts ─────────────────────────────────────────
{
  const appSrc = readFileSync(join(__dir, "../src/app/App.tsx"), "utf8");
  const fnStart = appSrc.indexOf("const removeWeekEmployee = ");
  assert("P1-R12 removeWeekEmployee exists", fnStart > 0);
  const fnSlice = appSrc.slice(fnStart, fnStart + 2500);

  assert(
    "P1-R1 no optimistic filter membership",
    !/const removeWeekEmployee[\s\S]{0,1200}prev\.filter\(\(e\)\s*=>\s*e\.id\s*!==\s*id\)/.test(appSrc),
  );
  const beforePwr = fnSlice.split("void pwrRemove")[0] ?? "";
  assert("P1-R1 no setWeekEmployees before pwrRemove", !beforePwr.includes("setWeekEmployees"));
  assert(
    "P1-R12 ACK still uses result.roster",
    fnSlice.includes("pwrRemove.ack") && fnSlice.includes("setWeekEmployees(result.roster"),
  );
  const catchIdx = fnSlice.indexOf(".catch(");
  const catchBlock = catchIdx >= 0 ? fnSlice.slice(catchIdx, catchIdx + 450) : "";
  assert(
    "P1-R8/R9 catch clears pending without roster invent",
    catchBlock.includes("setRemovingWeekEmployeeIds")
      && !catchBlock.includes("setWeekEmployees"),
  );
  assert(
    "P1 pending UI state present",
    appSrc.includes("removingWeekEmployeeIds") && appSrc.includes("no optimistic membership drop"),
  );

  const bundleSrc = readFileSync(join(__dir, "../src/lib/payroll-week-roster-bundle.ts"), "utf8");
  assert(
    "P1-R12 Phase 3 pwrRemove still pushRosterWithRebase",
    /export async function pwrRemove[\s\S]*?pushRosterWithRebase/.test(bundleSrc),
  );
  assert(
    "P1-R6 tomb still before push (Phase 3)",
    /export async function pwrRemove[\s\S]*?addDeletedWeekEmployeeKey[\s\S]*?pushRosterWithRebase/.test(
      bundleSrc,
    ),
  );

  const i1Src = readFileSync(join(__dir, "../src/lib/cloud-sync.ts"), "utf8");
  assert(
    "P1-R7 I1 helper unchanged signature",
    i1Src.includes("function applyI1CloudRosterTombstoneRevocation"),
  );
}

// P1-R1 / R8 — retry exhaustion: UI keeps B
{
  resetHarness([A, B, C], [], 5);
  force409Count = 99;
  const { ui, cloud } = await appRemovePolicy([A, B, C], B.id);
  assert("P1-R1/R8 UI still has B", ui.some((e) => e.id === B.id) && ui.length === 3);
  assert("P1-R1/R8 Cloud still has B", cloud.some((e) => e.id === B.id));
  assert(
    "P1-R11 follow-up baseline UI not stale-empty-of-B",
    ui.map((e) => e.id).sort().join(",") === "id-a,id-b,id-c",
  );
}

// P1-R9 — non-409 failure (network)
{
  resetHarness([A, B, C], [], 5);
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  const { ui, cloud } = await appRemovePolicy([A, B, C], B.id);
  assert("P1-R9 UI keeps B on network fail", ui.some((e) => e.id === B.id));
  assert("P1-R9 Cloud unchanged length", (cloud || []).length === 3);
  globalThis.fetch = savedFetch;
}

// P1-R2 — concurrent ADD on Cloud while Device A remove fails
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  kvStore["kw-week-employees"] = [A, B, C];
  const { ui, cloud } = await appRemovePolicy([A, B], B.id);
  assert("P1-R2 UI keeps B (no optimistic drop)", ui.some((e) => e.id === B.id));
  assert("P1-R2 Cloud still has concurrent C", cloud.some((e) => e.id === C.id));
}

// P1-R3 — concurrent field edit on A survives failed remove of B
{
  const A2 = { ...A, rate: "55", rateUpdatedAt: "2026-09-14T12:00:00.000Z" };
  resetHarness([A2, B, C], [], 5);
  force409Count = 99;
  const { cloud } = await appRemovePolicy([A, B, C], B.id);
  const aCloud = cloud.find((e) => e.id === A.id);
  assert("P1-R3 Cloud keeps peer rate edit", aCloud?.rate === "55");
  assert("P1-R3 Cloud keeps B", cloud.some((e) => e.id === B.id));
}

// P1-R4 — peer already removed C; A fails remove B
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  kvStore["kw-week-employees"] = [A, B];
  const { ui, cloud } = await appRemovePolicy([A, B, C], B.id);
  assert("P1-R4 UI keeps B", ui.some((e) => e.id === B.id));
  assert("P1-R4 Cloud has no C (peer remove)", !cloud.some((e) => e.id === C.id));
}

// P1-R5 / R6 — failed remove: GAP-3 revokes local tomb when Cloud still has B
{
  resetHarness([A, B], [], 5);
  force409Count = 99;
  await appRemovePolicy([A, B], B.id);
  const tombKey = weekEmployeeTombstoneId(WF, WT, B);
  const tombs = getDeletedWeekEmployeeKeys();
  assert("P1-R6 local tomb revoked when Cloud still has B", !tombs.includes(tombKey));
  assert(
    "P1-R5/R7 Cloud still has B (no permanent suppress)",
    (kvStore["kw-week-employees"] || []).some((e) => e.id === B.id),
  );
}

// P1-R12 — successful remove (optional 1×409) drops B via ACK roster
{
  resetHarness([A, B, C], [], 5);
  force409Count = 1;
  const { ui, cloud } = await appRemovePolicy([A, B, C], B.id);
  assert("P1-R12 success UI no B", !ui.some((e) => e.id === B.id), ui.map((e) => e.id).join(","));
  assert("P1-R12 success Cloud no B", !cloud.some((e) => e.id === B.id));
  assert("P1-R12 success keeps A+C", ui.some((e) => e.id === A.id) && ui.some((e) => e.id === C.id));
}

// P1-R2 success — concurrent ADD preserved on ACK (Phase 3 behavior)
{
  resetHarness([A, B], [], 5);
  kvStore["kw-week-employees"] = [A, B, C];
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: 9,
    weekFrom: WF,
    weekTo: WT,
    updatedAt: Date.now(),
  };
  force409Count = 1;
  const { ui, cloud } = await appRemovePolicy([A, B], B.id);
  assert("P1-R2 success ACK keeps concurrent C", ui.some((e) => e.id === C.id));
  assert("P1-R2 success ACK drops B", !ui.some((e) => e.id === B.id));
  assert(
    "P1-R2 Cloud drops B keeps C",
    !cloud.some((e) => e.id === B.id) && cloud.some((e) => e.id === C.id),
  );
}

console.log(`\n=== P1 REMOVE FAILURE RECOVERY RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
