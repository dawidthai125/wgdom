/**
 * PAYROLL P0 FINAL AUDIT — contract A–J + mandatory seams (test-only).
 * Run: npx vite-node scripts/test-payroll-p0-intent-final-audit.mjs
 *
 * Does NOT mutate production. Uses mock fetch + local helpers/Edge-sim.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p0-final-audit";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p0-final-audit";

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
};
globalThis.localStorage = {
  getItem: (k) => (k in ls ? ls[k] : null),
  setItem: (k, v) => {
    ls[k] = String(v);
  },
  removeItem: (k) => {
    delete ls[k];
  },
  clear: () => {},
};

const kvStore = {};
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
    const body = JSON.parse(opts.body);
    const {
      keys,
      values,
      hoursIntents = [],
      intentionalHoursClear = false,
      payrollDomainUserWrite = false,
    } = body;
    const empIdx = keys.indexOf("kw-week-employees");
    if (empIdx >= 0) {
      const prev = kvStore["kw-week-employees"] ?? [];
      const next = values[empIdx];
      const {
        sanitizeRosterHoursToAuthorizedIntents,
        normalizeHoursIntents,
      } = await import("../src/lib/payroll-hours-intent.ts");
      void payrollDomainUserWrite;
      if (!(intentionalHoursClear === true && Array.isArray(next) && next.length === 0)) {
        const intents = normalizeHoursIntents(hoursIntents);
        const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(
          prev,
          next,
          intents,
          "2026-08-24",
          "2026-08-29",
        );
        if (unauthorized.length > 0 && intents.length === 0) {
          return {
            ok: false,
            status: 409,
            json: async () => ({ ok: false, code: "payroll_hours_down_blocked" }),
          };
        }
        values[empIdx] = sanitized;
      }
    }
    for (let i = 0; i < keys.length; i++) kvStore[keys[i]] = values[i];
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }
  return originalFetch(url, opts);
};

const {
  isSupabaseConfigured,
  evaluatePayrollGuardBeforePush,
  pushKeysToCloud,
  PAYROLL_GUARD_BLOCKED_MESSAGE,
} = await import("../src/lib/cloud-sync.ts");
const {
  sanitizeRosterHoursToAuthorizedIntents,
  listUnauthorizedHoursDownSlots,
  slotHours,
} = await import("../src/lib/payroll-hours-intent.ts");
const { pwrPush } = await import("../src/lib/payroll-week-roster-bundle.ts");

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
  console.error("FAIL harness supabase");
  process.exit(1);
}

function day(active, from = "07:00", to = "16:00") {
  return { active, from, to, zaliczka: "" };
}
function emp(id, flags) {
  const mk = (on) => day(!!on);
  return {
    id,
    directoryId: `dir-${id}`,
    name: id,
    rate: "50",
    settled: false,
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
function rich15() {
  return Array.from({ length: 15 }, (_, i) => emp(`c${i}`, [1, 1, 1, 1, 1, 0]));
}
function stale(cloud) {
  return cloud.map((e) => ({
    ...e,
    days: { ...e.days, Cz: day(false), Pt: day(false), So: day(false) },
  }));
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

const WF = "2026-08-24";
const WT = "2026-08-29";
const cloud = rich15();
const local = stale(cloud);

function resetKv() {
  kvStore["kw-week-employees"] = clone(cloud);
  kvStore["kw-payroll-week-meta"] = {
    rosterRevision: 1,
    weekFrom: WF,
    weekTo: WT,
    updatedAt: Date.now(),
  };
}

// ---- TEST A / mandatory 1 ----
{
  resetKv();
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [clone(local)],
    { cloudWeekEmployees: cloud, payrollDomainUserWrite: true, hoursIntents: [] },
  );
  assert("A FE stale 660→347 domain=true no intent BLOCK", r.blocked === true);

  let pwrBlocked = false;
  try {
    await pwrPush({
      roster: clone(local),
      weekFrom: WF,
      weekTo: WT,
      rosterBefore: clone(local),
      options: {},
    });
  } catch (e) {
    pwrBlocked = e instanceof Error && e.message === PAYROLL_GUARD_BLOCKED_MESSAGE;
  }
  assert("A pwrPush seam BLOCK", pwrBlocked === true);
}

// ---- TEST B / mandatory 2 Edge-sim ----
{
  resetKv();
  const res = await globalThis.fetch("https://mock/batch-set", {
    method: "POST",
    body: JSON.stringify({
      keys: ["kw-week-employees"],
      values: [clone(local)],
      payrollDomainUserWrite: true,
      intentionalHoursClear: false,
      hoursIntents: [],
    }),
  });
  assert("B Edge-sim domain spoof 409", res.ok === false || res.status === 409);
}

// ---- TEST C / mandatory 6 ----
{
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [clone(local)],
    {
      cloudWeekEmployees: cloud,
      intentionalHoursClear: true,
      hoursIntents: [],
      payrollDomainUserWrite: true,
    },
  );
  assert("C bare intentionalHoursClear non-empty BLOCK", r.blocked === true);
  resetKv();
  const res = await globalThis.fetch("https://mock/batch-set", {
    method: "POST",
    body: JSON.stringify({
      keys: ["kw-week-employees"],
      values: [clone(local)],
      intentionalHoursClear: true,
      hoursIntents: [],
    }),
  });
  assert("C Edge-sim bare clear spoof 409", res.ok === false || res.status === 409);
}

// ---- TEST D / mandatory 3 ----
{
  const c = [emp("A", [1, 0, 0, 0, 0, 0])];
  const o = clone(c);
  o[0].days.Pn = day(true, "07:00", "11:00"); // 4h
  const intent = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: "A",
    directoryId: "dir-A",
    slot: "Pn",
    fromHours: slotHours(c[0], "Pn"),
    toHours: slotHours(o[0], "Pn"),
  };
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [o],
    { cloudWeekEmployees: c, hoursIntents: [intent] },
  );
  assert("D legitimate 8→4 ALLOW", r.blocked === false);
  const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(c, o, [intent], WF, WT);
  assert("D no unauthorized", unauthorized.length === 0);
  assert("D keeps 4h", Math.abs(slotHours(sanitized[0], "Pn") - intent.toHours) < 0.15);
}

// ---- TEST E / mandatory 7 wrong fromHours ----
{
  const c = [emp("A", [1, 0, 0, 0, 0, 0])];
  const o = clone(c);
  o[0].days.Pn = day(true, "07:00", "11:00");
  const bad = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: "A",
    slot: "Pn",
    fromHours: 0,
    toHours: slotHours(o[0], "Pn"),
  };
  const unauth = listUnauthorizedHoursDownSlots(c, o, [bad], WF, WT);
  assert("E wrong fromHours unauthorized", unauth.length === 1);
  const { sanitized } = sanitizeRosterHoursToAuthorizedIntents(c, o, [bad], WF, WT);
  assert("E sanitize restores cloud 9h", Math.abs(slotHours(sanitized[0], "Pn") - slotHours(c[0], "Pn")) < 0.15);
}

// ---- TEST F / mandatory 8 wrong employee ----
{
  const c = [emp("A", [1, 0, 0, 0, 0, 0]), emp("B", [1, 0, 0, 0, 0, 0])];
  const o = clone(c);
  o[0].days.Pn = day(true, "07:00", "11:00"); // A reduced
  const intentB = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: "B",
    directoryId: "dir-B",
    slot: "Pn",
    fromHours: slotHours(c[1], "Pn"),
    toHours: 4,
  };
  const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(c, o, [intentB], WF, WT);
  assert("F A still unauthorized", unauthorized.some((u) => u.employeeId === "A"));
  assert("F A restored to cloud", Math.abs(slotHours(sanitized[0], "Pn") - slotHours(c[0], "Pn")) < 0.15);
}

// ---- TEST G / mandatory 9 wrong week ----
{
  const c = [emp("A", [1, 0, 0, 0, 0, 0])];
  const o = clone(c);
  o[0].days.Pn = day(true, "07:00", "11:00");
  const wrongWeek = {
    weekFrom: "2026-01-01",
    weekTo: "2026-01-06",
    employeeId: "A",
    slot: "Pn",
    fromHours: slotHours(c[0], "Pn"),
    toHours: slotHours(o[0], "Pn"),
  };
  const unauth = listUnauthorizedHoursDownSlots(c, o, [wrongWeek], WF, WT);
  assert("G wrong week intent rejected", unauth.length === 1);
}

// ---- TEST H / mandatory 5 partial ----
{
  const c = [emp("A", [1, 0, 0, 0, 0, 0]), emp("B", [0, 1, 0, 0, 0, 0])];
  const o = clone(c);
  o[0].days.Pn = day(true, "07:00", "11:00");
  o[1].days.Wt = day(false);
  const intentA = {
    weekFrom: WF,
    weekTo: WT,
    employeeId: "A",
    directoryId: "dir-A",
    slot: "Pn",
    fromHours: slotHours(c[0], "Pn"),
    toHours: slotHours(o[0], "Pn"),
  };
  const { sanitized, unauthorized } = sanitizeRosterHoursToAuthorizedIntents(c, o, [intentA], WF, WT);
  assert("H B unauthorized", unauthorized.some((u) => u.employeeId === "B"));
  assert("H A kept 4h", Math.abs(slotHours(sanitized[0], "Pn") - intentA.toHours) < 0.15);
  assert("H B restored cloud", Math.abs(slotHours(sanitized[1], "Wt") - slotHours(c[1], "Wt")) < 0.15);
}

// ---- TEST I / mandatory 4 rate-only on stale ----
{
  const rateOnly = clone(local);
  rateOnly[0] = { ...rateOnly[0], rate: "99" };
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [rateOnly],
    { cloudWeekEmployees: cloud, payrollDomainUserWrite: true, hoursIntents: [] },
  );
  assert("I stale+rate BLOCK", r.blocked === true);
}

// ---- TEST J / mandatory 10 empty clear ----
{
  const r = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [[]],
    { cloudWeekEmployees: cloud, intentionalHoursClear: true },
  );
  assert("J empty+intentionalHoursClear ALLOW", r.blocked === false);

  // non-empty with clear flag already covered in C
  const spoof = await evaluatePayrollGuardBeforePush(
    ["kw-week-employees"],
    [clone(local)],
    { cloudWeekEmployees: cloud, intentionalHoursClear: true },
  );
  assert("J non-empty clear spoof BLOCK", spoof.blocked === true);
}

// direct pushKeysToCloud bypass attempt
{
  resetKv();
  let threw = false;
  try {
    await pushKeysToCloud(
      ["kw-week-employees"],
      [clone(local)],
      {
        cloudWeekEmployees: cloud,
        payrollDomainUserWrite: true,
        payrollWeekCas: true,
        expectedRevision: 1,
      },
    );
  } catch (e) {
    threw = e instanceof Error && e.message === PAYROLL_GUARD_BLOCKED_MESSAGE;
  }
  assert("direct pushKeysToCloud domain spoof BLOCK", threw === true);
}

console.log(`\n=== FINAL AUDIT ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
