/**
 * P0 Payroll Cloud Recovery — Payroll Guard fail-loud (pushKeysToCloud throws).
 * Run: npx vite-node scripts/test-payroll-guard-push-fail-loud-p0.mjs
 *
 * CI-2: VITE_SUPABASE_* must be present in the process env *before* vite-node
 * starts (Gate B job env / shell / .env). Assignments to process.env inside
 * this file do NOT populate import.meta.env — see supabase.ts.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p0-guard";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p0-guard";

const kvStore = {};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

let batchGetHits = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    batchGetHits++;
    const { keys } = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }),
    };
  }
  if (u.includes("/batch-set")) {
    throw new Error("batch-set should not run when guard blocks");
  }
  return originalFetch(url, opts);
};

const {
  PAYROLL_GUARD_BLOCKED_MESSAGE,
  isPayrollGuardBlockedError,
  isSupabaseConfigured,
  pushKeysToCloud,
  weekEmployeesListRichness,
} = await import("../src/lib/cloud-sync.ts");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

if (!isSupabaseConfigured()) {
  console.error(
    "FAIL harness: isSupabaseConfigured() === false.\n" +
      "CI-2: Gate B / shell must set VITE_SUPABASE_PROJECT_ID + VITE_SUPABASE_ANON_KEY " +
      "before vite-node starts (import.meta.env). process.env set inside this script is NOT enough.",
  );
  process.exit(1);
}
assert("supabase configured", true);

function richEmp(hours = 8) {
  return {
    id: crypto.randomUUID(),
    directoryId: "dir-1",
    name: "Jan Test",
    phone: "",
    position: "Murarz",
    rate: "50",
    settled: false,
    dataUpdatedAt: "2026-06-22T10:00:00.000Z",
    days: {
      Pn: { active: true, from: "07:00", to: hours >= 8 ? "16:00" : "12:00", zaliczka: "" },
      Wt: { active: true, from: "07:00", to: "16:00", zaliczka: "" },
      Sr: { active: true, from: "07:00", to: "16:00", zaliczka: "" },
      Cz: { active: true, from: "07:00", to: "16:00", zaliczka: "" },
      Pt: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
      So: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    },
  };
}

const cloudEmps = [richEmp(8), richEmp(8), richEmp(8)];
kvStore["kw-week-employees"] = cloudEmps;
assert("cloud richness", weekEmployeesListRichness(cloudEmps) >= 8);

const thinLocal = [{
  id: cloudEmps[0].id,
  ...cloudEmps[0],
  days: {
    ...cloudEmps[0].days,
    Pn: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Wt: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Sr: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    Cz: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
  },
}];

let threw = false;
let errMsg = "";
try {
  await pushKeysToCloud(
    ["kw-week-employees", "kw-jobs"],
    [thinLocal, []],
    { replaceWeekEmployeesKeys: ["kw-week-employees"] },
  );
} catch (e) {
  threw = true;
  errMsg = e instanceof Error ? e.message : String(e);
}

assert("guard throws", threw);
assert("guard message", errMsg === PAYROLL_GUARD_BLOCKED_MESSAGE);
if (threw && errMsg !== PAYROLL_GUARD_BLOCKED_MESSAGE) {
  console.error("  expected:", PAYROLL_GUARD_BLOCKED_MESSAGE);
  console.error("  actual:  ", errMsg);
}
assert("guard fetched cloud (batch-get)", batchGetHits >= 1);
assert("isPayrollGuardBlockedError", isPayrollGuardBlockedError(new Error(PAYROLL_GUARD_BLOCKED_MESSAGE)));

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
