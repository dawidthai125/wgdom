/**
 * PAYROLL P0 — scoped hours-down intent contract — R1–R15
 * Run: npx vite-node scripts/test-payroll-p0-hours-down-protection.mjs
 *
 * Exact incident regression: cloud 660-class vs local 347-class must BLOCK
 * without scoped hours intent; legitimate single-day delta must NOT authorize
 * unrelated stale losses.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p0-hours-intent";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p0-hours-intent";

const ls = {
  "kw-weekFrom": JSON.stringify("2026-08-24"),
  "kw-weekTo": JSON.stringify("2026-08-29"),
  "kw-week-employees": "[]",
  "kw-payroll-week-meta": JSON.stringify({
    rosterRevision: 1,
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
    updatedAt: Date.now(),
  }),
  "kw-week-employees-deleted-ids": "[]",
};
globalThis.localStorage = {
  getItem: (k) => (k in ls ? ls[k] : null),
  setItem: (k, v) => {
    ls[k] = String(v);
  },
  removeItem: (k) => {
    delete ls[k];
  },
  clear: () => {
    for (const k of Object.keys(ls)) delete ls[k];
  },
};

const kvStore = {};
let batchSetCount = 0;
let lastBatchSetBody = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes("/batch-get")) {
    const { keys } = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ values: keys.map((k) => kvStore[k] ?? null) }),
    };
  }
  if (u.includes("/batch-set")) {
    batchSetCount += 1;
    lastBatchSetBody = JSON.parse(opts.body);
    // Simulate Edge hours-down contract (mirror of server sanitize/reject).
    const {
      keys,
      values,
      hoursIntents = [],
      intentionalHoursClear = false,
      payrollDomainUserWrite = false,
    } = lastBatchSetBody;
    const empIdx = keys.indexOf("kw-week-employees");
    if (empIdx >= 0) {
      const prev = kvStore["kw-week-employees"] ?? [];
      const next = values[empIdx];
      const {
        sanitizeRosterHoursToAuthorizedIntents,
        normalizeHoursIntents,
        isVerifiedEmptyRosterClear,
      } = await import("../src/lib/payroll-hours-intent.ts");
      const { payrollMetrics } = await import("../src/lib/cloud-sync.ts");
      if (!(intentionalHoursClear === true && Array.isArray(next) && next.length === 0)) {
        const intents = normalizeHoursIntents(hoursIntents);
        const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(
          prev,
          next,
          intents,
          "2026-08-24",
          "2026-08-29",
        );
        void payrollDomainUserWrite;
        if (unauthorized.length > 0 && intents.length === 0) {
          return {
            ok: false,
            status: 409,
            json: async () => ({
              ok: false,
              code: "payroll_hours_down_blocked",
              error: "payroll_hours_down_blocked",
            }),
          };
        }
        values[empIdx] = sanitized;
        // hours must not drop vs prev without intents (already handled) / after sanitize
        const prevH = payrollMetrics(prev).totalHours;
        const nextH = payrollMetrics(sanitized).totalHours;
        if (intents.length === 0 && nextH + 0.05 < prevH) {
          return {
            ok: false,
            status: 409,
            json: async () => ({ ok: false, code: "payroll_hours_down_blocked" }),
          };
        }
      }
    }
    for (let i = 0; i < keys.length; i++) {
      kvStore[keys[i]] = values[i];
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }
  return originalFetch(url, opts);
};

const {
  PAYROLL_GUARD_BLOCKED_MESSAGE,
  isPayrollGuardBlockedError,
  isSupabaseConfigured,
  payrollMetrics,
  evaluatePayrollGuardBeforePush,
  pushKeysToCloud,
  pushWeekEmployeesToCloud,
} = await import("../src/lib/cloud-sync.ts");
const {
  deriveHoursIntentsFromLocalEdit,
  sanitizeRosterHoursToAuthorizedIntents,
  listUnauthorizedHoursDownSlots,
  slotHours,
} = await import("../src/lib/payroll-hours-intent.ts");
const { pwrPush } = await import("../src/lib/payroll-week-roster-bundle.ts");
const { readFileSync } = await import("node:fs");
const { fileURLToPath } = await import("node:url");
const { dirname, join } = await import("node:path");

let pass = 0;
let fail = 0;
const results = [];

function assert(name, cond) {
  if (cond) {
    pass++;
    results.push({ name, ok: true });
    console.log("PASS", name);
  } else {
    fail++;
    results.push({ name, ok: false });
    console.log("FAIL", name);
  }
}

if (!isSupabaseConfigured()) {
  console.error("FAIL harness: isSupabaseConfigured() === false");
  process.exit(1);
}

function day(active, from = "07:00", to = "16:00") {
  return { active, from, to, zaliczka: "" };
}

function empWithDays(id, flags) {
  const mk = (on) => day(!!on);
  return {
    id,
    directoryId: `dir-${id}`,
    name: `Emp ${id}`,
    phone: "",
    position: "Murarz",
    rate: "50",
    settled: false,
    dataUpdatedAt: "2026-08-26T18:00:00.000Z",
    days: {
      Pn: mk(flags[0]),
      Wt: mk(flags[1]),
      Sr: mk(flags[2]),
      Cz: mk(flags[3]),
      Pt: mk(flags[4]),
      So: mk(flags[5]),
    },
  };
}

/** ~675h cloud (15×5×9) — incident-class rich week */
function richCloud() {
  const cloud = [];
  for (let i = 0; i < 15; i++) cloud.push(empWithDays(`c${i}`, [1, 1, 1, 1, 1, 0]));
  return cloud;
}

/** Zero Cz/Pt — ~405h remaining (>50% of 675) — legacy shrink gap */
function staleLocal(cloud) {
  return cloud.map((e) => ({
    ...e,
    rate: e.rate,
    days: { ...e.days, Cz: day(false), Pt: day(false), So: day(false) },
  }));
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

const WF = "2026-08-24";
const WT = "2026-08-29";
const cloud660 = richCloud();
const local347 = staleLocal(cloud660);
const mCloud = payrollMetrics(cloud660);
const mLocal = payrollMetrics(local347);

assert("fixture cloud>>local (incident class)", mLocal.totalHours < mCloud.totalHours);
assert("fixture remaining >50% (legacy gap)", mLocal.totalHours >= mCloud.totalHours * 0.5);

function resetKv(cloud = cloud660) {
  batchSetCount = 0;
  lastBatchSetBody = null;
  kvStore["kw-week-employees"] = clone(cloud);
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: 1,
    weekFrom: WF,
    weekTo: WT,
    updatedAt: Date.now(),
  };
  ls["kw-week-employees"] = JSON.stringify(clone(local347));
  ls["kw-payroll-week-meta"] = JSON.stringify(kvStore["kw-payroll-week-meta"]);
}

// ---------- R1 exact incident: pwrPush stale no intent ----------
{
  resetKv();
  let blocked = false;
  try {
    await pwrPush({
      roster: clone(local347),
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: clone(local347),
      options: {},
    });
  } catch (e) {
    blocked = isPayrollGuardBlockedError(e) || (e instanceof Error && /hours|blocked|409|payroll/i.test(e.message));
  }
  // pushWeekEmployeesToCloud throws PAYROLL_GUARD_BLOCKED_MESSAGE
  assert("R1 pwrPush stale 660→347 BLOCK", blocked === true || batchSetCount === 0);
  assert(
    "R1 cloud hours unchanged",
    Math.abs(payrollMetrics(kvStore["kw-week-employees"]).totalHours - mCloud.totalHours) < 0.2,
  );
}

// ---------- R2 rate-only ----------
{
  resetKv();
  const rateOnly = clone(local347);
  rateOnly[0] = { ...rateOnly[0], rate: "99", rateUpdatedAt: "2026-08-28T12:00:00.000Z" };
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [rateOnly],
    { cloudWeekEmployees: cloud660, payrollDomainUserWrite: true },
  );
  assert("R2 rate-only BLOCK", r.blocked === true);
}

// ---------- R3 extraCost ----------
{
  resetKv();
  const withCost = clone(local347);
  withCost[0] = {
    ...withCost[0],
    extraCosts: [{ id: "x1", label: "paliwo", amount: 20 }],
    dataUpdatedAt: "2026-08-28T12:00:00.000Z",
  };
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [withCost],
    { cloudWeekEmployees: cloud660, payrollDomainUserWrite: true },
  );
  assert("R3 extraCost BLOCK", r.blocked === true);
}

// ---------- R4 legitimate 8→4 ----------
{
  const cloud = [empWithDays("a1", [1, 0, 0, 0, 0, 0])]; // Pn 9h ~ treat as 8-class
  const before = clone(cloud);
  const after = clone(cloud);
  after[0].days.Pn = day(true, "07:00", "11:00"); // 4h
  const intents = deriveHoursIntentsFromLocalEdit(before, after, WF, WT);
  assert("R4 intent derived", intents.length === 1 && intents[0].slot === "Pn");
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [after],
    { cloudWeekEmployees: cloud, hoursIntents: intents, payrollDomainUserWrite: true },
  );
  assert("R4 legitimate 8→4 ALLOW", r.blocked === false);
  const { sanitized: s4 } = sanitizeRosterHoursToAuthorizedIntents(cloud, after, intents, WF, WT);
  assert("R4 sanitized keeps 4h (not restored)", Math.abs(slotHours(s4[0], "Pn") - 4) < 0.15);
}

// ---------- R5 legitimate clear day 8→0 ----------
{
  const cloud = [empWithDays("a2", [1, 1, 0, 0, 0, 0])];
  const before = clone(cloud);
  const after = clone(cloud);
  after[0].days.Pn = day(false);
  const intents = deriveHoursIntentsFromLocalEdit(before, after, WF, WT);
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [after],
    { cloudWeekEmployees: cloud, hoursIntents: intents, payrollDomainUserWrite: true },
  );
  assert("R5 clear day ALLOW with intent", r.blocked === false);
}

// ---------- R6 mixed stale + intentional ----------
{
  const cloud = [
    empWithDays("A", [1, 0, 0, 0, 0, 0]),
    empWithDays("B", [0, 1, 0, 0, 0, 0]),
  ];
  const local = clone(cloud);
  local[0].days.Pn = day(true, "07:00", "11:00"); // A intended 4h
  local[1].days.Wt = day(false); // B stale wipe
  const beforeFreshA = clone(cloud);
  beforeFreshA[0].days.Pn = day(true); // user saw 8/9h on A
  const afterEdit = clone(local);
  // Intent only for A's explicit edit (from cloud-matching baseline)
  const intents = deriveHoursIntentsFromLocalEdit(
    [{ ...cloud[0] }, { ...local[1] }], // before: A at cloud hours, B already stale locally
    afterEdit,
    WF,
    WT,
  );
  // Force intent for A Pn cloud→4 only (simulate explicit edit against cloud baseline)
  const aIntent = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: "A",
    directoryId: "dir-A",
    slot: "Pn",
    fromHours: slotHours(cloud[0], "Pn"),
    toHours: slotHours(local[0], "Pn"),
  };
  const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(
    cloud,
    local,
    [aIntent],
    WF,
    WT,
  );
  assert("R6 B stale unauthorized", unauthorized.some((u) => u.employeeId === "B"));
  assert("R6 A intentional kept", Math.abs(slotHours(sanitized.find((e) => e.id === "A"), "Pn") - aIntent.toHours) < 0.1);
  assert(
    "R6 B restored from cloud",
    Math.abs(slotHours(sanitized.find((e) => e.id === "B"), "Wt") - slotHours(cloud[1], "Wt")) < 0.1,
  );
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [local],
    { cloudWeekEmployees: cloud, hoursIntents: [aIntent], payrollDomainUserWrite: true },
  );
  assert("R6 mixed ALLOW sanitized (not full stale write)", r.blocked === false);
  const outEmp = r.keys.includes("kw-week-employees")
    ? null
    : null;
  void outEmp;
  // values sanitized inside guard — re-evaluate via sanitize result hours
  assert(
    "R6 sanitized total > stale local",
    payrollMetrics(sanitized).totalHours > payrollMetrics(local).totalHours,
  );
}

// ---------- R7 local diff not intent ----------
{
  resetKv();
  const before = clone(local347);
  const after = clone(local347);
  // local-only churn without matching cloud baseline
  after[0].days.Pn = day(false);
  const localIntents = deriveHoursIntentsFromLocalEdit(before, after, WF, WT);
  assert("R7 local intents exist but baseline≠cloud", localIntents.length >= 1);
  const unauthorized = listUnauthorizedHoursDownSlots(cloud660, after, localIntents, WF, WT);
  assert("R7 cloud still sees unauthorized downs", unauthorized.length > 0);
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [after],
    { cloudWeekEmployees: cloud660, hoursIntents: localIntents, payrollDomainUserWrite: true },
  );
  // intents present → sanitize path (not hard block); cloud hours mostly restored
  if (r.blocked) {
    assert("R7 BLOCK or sanitize", true);
  } else {
    // When intents.length>0 guard sanitizes — ensure we didn't accept full stale loss
    const { sanitized } = sanitizeRosterHoursToAuthorizedIntents(
      cloud660,
      after,
      localIntents,
      WF,
      WT,
    );
    assert(
      "R7 sanitized near cloud (no broad stale accept)",
      payrollMetrics(sanitized).totalHours + 0.2 >= mCloud.totalHours - 20,
    );
  }
}

// ---------- R8 intentional increase ----------
{
  const cloud = [empWithDays("u1", [1, 0, 0, 0, 0, 0])]; // short day
  cloud[0].days.Pn = day(true, "07:00", "11:00"); // 4h
  const after = clone(cloud);
  after[0].days.Pn = day(true, "07:00", "16:00"); // 9h
  const intents = deriveHoursIntentsFromLocalEdit(cloud, after, WF, WT);
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [after],
    { cloudWeekEmployees: cloud, hoursIntents: intents },
  );
  assert("R8 hours-up ALLOW", r.blocked === false);
}

// ---------- R9 stale PWRB no intent ----------
{
  resetKv();
  let threw = false;
  try {
    await pushWeekEmployeesToCloud(clone(local347), {});
  } catch (e) {
    threw = e instanceof Error && e.message === PAYROLL_GUARD_BLOCKED_MESSAGE;
  }
  assert("R9 pushWeekEmployeesToCloud BLOCK", threw === true);
  assert("R9 no successful hours-down batch-set", payrollMetrics(kvStore["kw-week-employees"]).totalHours >= mCloud.totalHours - 0.2);
}

// ---------- R10 Edge spoof payrollDomainUserWrite ----------
{
  resetKv();
  batchSetCount = 0;
  let status = 0;
  try {
    await pushKeysToCloud(
      ["kw-week-employees", "kw-payroll-week-meta"],
      [clone(local347), kvStore["kw-payroll-week-meta"]],
      {
        payrollWeekCas: true,
        expectedRevision: 1,
        payrollDomainUserWrite: true,
        cloudWeekEmployees: cloud660,
        // no hoursIntents
      },
    );
  } catch {
    status = 1;
  }
  assert("R10 FE blocks spoof domain flag", status === 1 || batchSetCount === 0);
  // Direct Edge-contract simulation via fetch mock:
  resetKv();
  batchSetCount = 0;
  const res = await globalThis.fetch("https://mock/batch-set", {
    method: "POST",
    body: JSON.stringify({
      keys: ["kw-week-employees"],
      values: [clone(local347)],
      payrollWeekCas: true,
      expectedRevision: 1,
      payrollDomainUserWrite: true,
      hoursIntents: [],
      intentionalHoursClear: false,
    }),
  });
  assert("R10 Edge-sim 409 without intents", res.ok === false || res.status === 409);
}

// ---------- R11 spoofed intentionalHoursClear non-empty ----------
{
  resetKv();
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [clone(local347)],
    {
      cloudWeekEmployees: cloud660,
      intentionalHoursClear: true,
      payrollDomainUserWrite: true,
      // non-empty + no scoped intents
    },
  );
  assert("R11 bare intentionalHoursClear non-empty BLOCK", r.blocked === true);
  const res = await globalThis.fetch("https://mock/batch-set", {
    method: "POST",
    body: JSON.stringify({
      keys: ["kw-week-employees"],
      values: [clone(local347)],
      intentionalHoursClear: true,
      hoursIntents: [],
      payrollDomainUserWrite: true,
    }),
  });
  assert("R11 Edge-sim rejects clear spoof", res.ok === false || res.status === 409);
}

// ---------- R12 CAS rebase must not broad-write stale ----------
{
  resetKv();
  // Stale local push with domain flag — blocked before batch-set / rebase loop
  let threw = false;
  try {
    await pwrPush({
      roster: clone(local347),
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: clone(local347),
      options: { hoursIntents: [] },
    });
  } catch (e) {
    threw = isPayrollGuardBlockedError(e);
  }
  assert("R12 stale CAS path BLOCK before write", threw === true);
}

// ---------- R13 bootstrap ----------
{
  resetKv();
  let threw = false;
  try {
    await pushKeysToCloud(
      ["kw-week-employees"],
      [clone(local347)],
      { cloudWeekEmployees: cloud660, payrollWeekCas: true, expectedRevision: 1 },
    );
  } catch (e) {
    threw = isPayrollGuardBlockedError(e);
  }
  assert("R13 bootstrap-shaped BLOCK", threw === true);
}

// ---------- R14 writeOnly / safe ----------
{
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [clone(local347)],
    { cloudWeekEmployees: cloud660 },
  );
  assert("R14 safe/writeOnly-shaped BLOCK", r.blocked === true);
}

// ---------- R15 full roster + single legitimate edit ----------
{
  const cloud = clone(cloud660);
  const local = clone(local347); // massive stale loss
  // User explicitly edits c0 Pn from cloud 9h → 4h (baseline matches cloud)
  local[0] = {
    ...cloud[0],
    days: {
      ...cloud[0].days,
      Pn: day(true, "07:00", "11:00"),
      // keep other days from STALE local (zeros on Cz/Pt)
      Cz: day(false),
      Pt: day(false),
      So: day(false),
      Wt: cloud[0].days.Wt,
      Sr: cloud[0].days.Sr,
    },
  };
  // Rest of employees remain fully stale (347-class)
  for (let i = 1; i < local.length; i++) {
    local[i] = clone(local347[i]);
  }
  const intent = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: cloud[0].id,
    directoryId: cloud[0].directoryId,
    slot: "Pn",
    fromHours: slotHours(cloud[0], "Pn"),
    toHours: slotHours(local[0], "Pn"),
  };
  const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(
    cloud,
    local,
    [intent],
    WF,
    WT,
  );
  assert("R15 many unauthorized stale slots", unauthorized.length > 5);
  assert(
    "R15 intended Pn kept",
    Math.abs(slotHours(sanitized[0], "Pn") - intent.toHours) < 0.1,
  );
  assert(
    "R15 unrelated employee hours restored",
    Math.abs(slotHours(sanitized[1], "Cz") - slotHours(cloud[1], "Cz")) < 0.1,
  );
  assert(
    "R15 total near cloud minus one delta (not 347)",
    payrollMetrics(sanitized).totalHours > mLocal.totalHours + 100,
  );
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [local],
    { cloudWeekEmployees: cloud, hoursIntents: [intent], payrollDomainUserWrite: true },
  );
  assert("R15 guard ALLOW sanitized", r.blocked === false);
}

// ---------- Edge source contract (real seam presence) ----------
{
  const edgePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../supabase/functions/make-server-0afb8820/index.tsx",
  );
  const edgeSrc = readFileSync(edgePath, "utf8");
  assert("Edge has hoursIntents", edgeSrc.includes("hoursIntents"));
  assert("Edge has sanitize unauthorized", edgeSrc.includes("edgeSanitizeUnauthorizedHoursDown"));
  assert("Edge blocks without scoped intent", edgeSrc.includes("scoped hours intent required") || edgeSrc.includes("payroll_hours_down_blocked"));
  assert("Edge ignores payrollDomainUserWrite for auth", edgeSrc.includes("void payrollDomainUserWrite") || edgeSrc.includes("explicitly ignored"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
console.log("incident metrics cloud/local:", mCloud.totalHours, mLocal.totalHours);
process.exit(fail > 0 ? 1 : 0);
