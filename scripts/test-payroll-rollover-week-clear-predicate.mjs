/**
 * PAYROLL-ROLLOVER-CLOUD-PUSH — predicate A–G via evaluatePayrollGuardBeforePush.
 * Run: npx vite-node scripts/test-payroll-rollover-week-clear-predicate.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-rollover-predicate";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-rollover-predicate";

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

const { evaluatePayrollGuardBeforePush } = await import("../src/lib/cloud-sync.ts");
const { defaultDay } = await import("../src/app/app-domain.ts");
const { buildWeekSnapshot } = await import("../src/app/app-domain.ts");

const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = { from: "2026-06-08", to: "2026-06-13" };
const W3 = { from: "2026-06-15", to: "2026-06-20" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

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

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
}

function makeEmp(id, dirId, name, days = defaultDays()) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days,
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function makeRichRoster(n = 11) {
  return Array.from({ length: n }, (_, i) =>
    makeEmp(`we-${i}`, `dir-${i}`, `Pracownik ${i + 1}`),
  );
}

function archiveFrom(W, emps) {
  return [buildWeekSnapshot(W.from, W.to, emps, [], undefined, [], [])];
}

const PAYROLL_KEYS = ["kw-weekFrom", "kw-weekTo", "kw-week-employees", "kw-archive"];
const richCloud = makeRichRoster();

async function guard(keys, values, options = {}) {
  return evaluatePayrollGuardBeforePush(keys, values, {
    cloudWeekEmployees: richCloud,
    ...options,
  });
}

// A. W1 rich → archive W1 → W2 empty + rollover flag → ALLOW
{
  const archive = archiveFrom(W1, richCloud);
  const r = await guard(PAYROLL_KEYS, [W2.from, W2.to, [], archive], {
    payrollWeekRolloverPush: true,
  });
  assert("A rollover W1→W2 empty + flag ALLOW", r.blocked === false);
}

// B. W1 rich → W2 empty, no archive → BLOCK
{
  const r = await guard(PAYROLL_KEYS, [W2.from, W2.to, [], []], {
    payrollWeekRolloverPush: true,
  });
  assert("B W2 empty no archive BLOCK", r.blocked === true);
}

// C. W1 rich → W1 archive → W1 empty (same-week) → ALLOW via isIntentionalPayrollWeekClear
{
  const archive = archiveFrom(W1, richCloud);
  const r = await guard(PAYROLL_KEYS, [W1.from, W1.to, [], archive], {});
  assert("C same-week W1 clear ALLOW (no rollover flag)", r.blocked === false);
}

// D. W1 rich → W2 partial roster → BLOCK
{
  const partial = [makeEmp("partial-1", "dir-1", "Partial", defaultDays())];
  const archive = archiveFrom(W1, richCloud);
  const r = await guard(PAYROLL_KEYS, [W2.from, W2.to, partial, archive], {
    payrollWeekRolloverPush: true,
  });
  assert("D W2 partial roster BLOCK", r.blocked === true);
}

// E. W1 rich → W2 empty → archive W2 (wrong week, no payroll richness) → BLOCK
{
  const wrongArchive = archiveFrom(W2, []);
  const r = await guard(PAYROLL_KEYS, [W2.from, W2.to, [], wrongArchive], {
    payrollWeekRolloverPush: true,
  });
  assert("E W2 empty archive W2 stub BLOCK", r.blocked === true);
}

// F. W1 rich → W3 empty → archive W1 → BLOCK (prev of W3 is W2, not W1)
{
  const archive = archiveFrom(W1, richCloud);
  const r = await guard(PAYROLL_KEYS, [W3.from, W3.to, [], archive], {
    payrollWeekRolloverPush: true,
  });
  assert("F W3 empty archive W1 mismatch BLOCK", r.blocked === true);
}

// G. W1 thin → W2 empty → archive W1 thin → BLOCK
{
  const archive = [{
    id: "snap-thin",
    weekFrom: W1.from,
    weekTo: W1.to,
    weekEmployees: [],
    backlog: false,
  }];
  const r = await guard(PAYROLL_KEYS, [W2.from, W2.to, [], archive], {
    payrollWeekRolloverPush: true,
  });
  assert("G thin archive W1 BLOCK", r.blocked === true);
}

console.log(`\nSummary: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
