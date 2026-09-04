/**
 * PAYROLL P2.5 — atomic membership ADD (freshness-safe + Guard-safe).
 * Run: npx vite-node scripts/test-payroll-p2-5-atomic-membership-add.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p25-add";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p25-add";

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

const WF = "2026-08-31";
const WT = "2026-09-05";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const DAM_DIR = "6bafc80e-ee8c-4183-8e74-8750b7667d59";

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

function defaultDay(active = true, to = "16:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, opts = {}) {
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name,
    phone: "",
    position: opts.position ?? "Pracownik",
    rate: opts.rate ?? "28",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...defaultDay(d !== "So", opts.hoursTo ?? "16:00") }]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: "2026-09-04T07:00:00.000Z",
  };
}

function cloud15() {
  return Array.from({ length: 15 }, (_, i) => makeEmp(`e${i + 1}`, `Emp ${i + 1}`));
}

function damianek() {
  return makeEmp("dam-new", "Damianek", {
    directoryId: DAM_DIR,
    hoursTo: "07:00",
  });
}

const {
  rebuildPayrollOutgoingAfterFreshness,
  wouldBlockPayrollShrink,
  reconcilePayrollKeysWithFreshLocal,
  captureKwWeekEmployeesLsBeforePush,
  restoreKwWeekEmployeesLsAfterFailedPush,
  removeDeletedWeekEmployeeMergeKeysForWeek,
  getDeletedWeekEmployeeKeys,
  addDeletedWeekEmployeeKey,
  DATA_KEYS,
} = await import("../src/lib/cloud-sync.ts");
const { listUnauthorizedHoursDownSlots, slotHours } = await import("../src/lib/payroll-hours-intent.ts");
const { outgoingHasLegalMembershipAdd, sanitizeStaleRosterMembership } = await import(
  "../src/lib/payroll-stale-roster-membership.ts"
);
const {
  rememberPayrollPendingAdds,
  resetPayrollPendingAddIntentsForTests,
  revokePayrollPendingAdd,
  ackPayrollPendingAddsInRoster,
  getPayrollPendingAddKeys,
  unionRosterWithPendingAdds,
} = await import("../src/lib/payroll-pending-add-intent.ts");
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
const { flushPayrollDomainPush, schedulePayrollDomainPush, bindPayrollDomainPushHandler, unbindPayrollDomainPushHandler } =
  await import("../src/lib/payroll-domain-sync.ts");

function rebuild(cloud, before, after, tombstoned) {
  return rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: after,
    intentBefore: before,
    weekFrom: WF,
    weekTo: WT,
    tombstoned,
  });
}

function unauthorized(cloud, outgoing) {
  return listUnauthorizedHoursDownSlots(cloud, outgoing, [], WF, WT);
}

resetPayrollPendingAddIntentsForTests();

// A — Cloud 15 + ADD → outgoing 16 (CAS-ready)
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const rebuilt = rebuild(cloud, before, [...before, add]);
  assert("A outgoing 16", rebuilt.roster.length === 16);
  assert("A Damianek present", rebuilt.roster.some((e) => e.directoryId === DAM_DIR));
  assert("A no hours-down", unauthorized(cloud, rebuilt.roster).length === 0);
  assert("A mode canonical", rebuilt.mode === "canonical_intent");
  resetPayrollPendingAddIntentsForTests();
}

// B — freshness returns old 15; pending snapshot re-attaches ADD
{
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const rebuilt = rebuild(cloud, cloud, cloud);
  assert("B freshness 15 still 16", rebuilt.roster.length === 16);
  assert("B Damianek reattached", rebuilt.roster.some((e) => e.directoryId === DAM_DIR));
  assert("B has legal/pending add", outgoingHasLegalMembershipAdd(cloud, rebuilt.roster, cloud) === true);
  resetPayrollPendingAddIntentsForTests();
}

// C — ADD + current-week tomb → ADD kept; tomb revoked
{
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  addDeletedWeekEmployeeKey(WF, WT, add);
  removeDeletedWeekEmployeeMergeKeysForWeek(WF, WT, getPayrollPendingAddKeys());
  const tombs = getDeletedWeekEmployeeKeys();
  const tombKey = `${WF}|${WT}::${weekEmployeeMergeKey(add)}`;
  assert("C tomb revoked before CAS", !tombs.includes(tombKey));
  const tombSet = new Set([weekEmployeeMergeKey(add)]);
  const rebuilt = rebuild(cloud, cloud, [...cloud, add], tombSet);
  assert("C Damianek persists vs tomb", rebuilt.roster.some((e) => e.directoryId === DAM_DIR));
  resetPayrollPendingAddIntentsForTests();
}

// D — ADD + unrelated hours-down → hours stay cloud; Damianek stays
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e, days: { ...e.days } }));
  const stale = before.map((e, i) =>
    i === 0 ? { ...e, days: { ...e.days, Pn: { ...e.days.Pn, to: "11:00" } } } : e,
  );
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const rebuilt = rebuild(cloud, before, [...stale, add]);
  const e1 = rebuilt.roster.find((e) => e.id === "e1");
  assert("D Damianek present", rebuilt.roster.some((e) => e.directoryId === DAM_DIR));
  assert("D existing Pn cloud 9h", slotHours(e1, "Pn") === 9);
  assert("D no unauthorized down", unauthorized(cloud, rebuilt.roster).length === 0);
  resetPayrollPendingAddIntentsForTests();
}

// E — hours-down without ADD → fail-loud BLOCK
{
  const cloud = cloud15();
  const after = cloud.map((e, i) =>
    i === 0 ? { ...e, days: { ...e.days, Pn: { ...e.days.Pn, to: "11:00" } } } : e,
  );
  const rebuilt = rebuild(cloud, cloud, after);
  assert("E fail-loud", rebuilt.mode === "silent_down_fail_loud");
  assert("E hours-down present", unauthorized(cloud, rebuilt.roster).length > 0);
}

// F — shrink >50%
{
  const cloud = cloud15();
  const tiny = [makeEmp("e1", "Emp 1", { hoursTo: "07:00" })];
  assert("F shrink blocked", wouldBlockPayrollShrink(cloud, tiny) === true);
}

// G — cloud unreachable fail-closed still in Guard (no skipGuard)
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8");
  assert(
    "G cloud_unreachable_fail_closed",
    src.includes('return stripEmp("cloud_unreachable_fail_closed")'),
  );
  assert(
    "G no pendingAdd skipFreshness",
    !src.includes("if (pendingAdd) skip") && !src.includes("skipCloudFreshnessGate: true /* membership"),
  );
}

// H — Guard failure: pending preserved; restore does not ACK
{
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  lsStore["kw-week-employees"] = JSON.stringify(cloud15());
  const snap = captureKwWeekEmployeesLsBeforePush();
  lsStore["kw-week-employees"] = JSON.stringify([...cloud15(), add]);
  restoreKwWeekEmployeesLsAfterFailedPush(snap);
  const restored = JSON.parse(lsStore["kw-week-employees"]);
  assert("H pending key survives restore", getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
  assert("H snapshot still unions ADD", unionRosterWithPendingAdds(restored).some((e) => e.directoryId === DAM_DIR));
  assert("H LS not ACKed as 16", restored.length === 15);
  resetPayrollPendingAddIntentsForTests();
}

// I — CAS success ACK clears pending
{
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  ackPayrollPendingAddsInRoster([...cloud15(), add]);
  assert("I pending cleared after CAS roster", getPayrollPendingAddKeys().size === 0);
  assert("I union no extra after ack", unionRosterWithPendingAdds(cloud15()).length === 15);
}

// J — second pwrPush / settlement roster 15 + pending → 16
{
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  let flushed = null;
  bindPayrollDomainPushHandler((roster) => {
    flushed = roster;
  });
  schedulePayrollDomainPush(cloud, { settlementCloudAck: true }, cloud);
  flushPayrollDomainPush();
  unbindPayrollDomainPushHandler();
  assert("J flush includes Damianek", Array.isArray(flushed) && flushed.some((e) => e.directoryId === DAM_DIR));
  const rebuilt = rebuild(cloud, cloud, cloud);
  assert("J rebuild still 16", rebuilt.roster.length === 16);
  resetPayrollPendingAddIntentsForTests();
}

// K — explicit REMOVE after ADD → revoked; tomb blocks resurrect
{
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  revokePayrollPendingAdd(add);
  assert("K pending revoked", getPayrollPendingAddKeys().size === 0);
  const tomb = new Set([weekEmployeeMergeKey(add)]);
  const mem = sanitizeStaleRosterMembership(cloud, [...cloud, add], [...cloud, add], tomb);
  assert("K tomb blocks resurrect", !mem.roster.some((e) => e.directoryId === DAM_DIR));
}

// L — apply/reconcile freshness (production bug reproduction)
{
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const optimistic = [...cloud, add];
  const merged = DATA_KEYS.map(() => null);
  merged[DATA_KEYS.indexOf("kw-week-employees")] = cloud;
  const reconciled = reconcilePayrollKeysWithFreshLocal(merged, { weekEmployees: cloud });
  const applied = reconciled[DATA_KEYS.indexOf("kw-week-employees")];
  assert("L reconcile keeps Damianek", Array.isArray(applied) && applied.some((e) => e.directoryId === DAM_DIR));
  const uiAfterFreshness = unionRosterWithPendingAdds(cloud);
  assert("L applyAdminDataBundle path 16", uiAfterFreshness.length === 16);
  const rebuilt = rebuild(cloud, optimistic, cloud);
  assert("L rebuild after apply still 16", rebuilt.roster.length === 16);
  assert("L Guard would allow", unauthorized(cloud, rebuilt.roster).length === 0);
  resetPayrollPendingAddIntentsForTests();
}

// M — real pwrAdd path: CAS 409 stale revision → rebase → ADD still lands
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  const kv = {
    "kw-weekFrom": WF,
    "kw-weekTo": WT,
    "kw-week-employees": cloud,
    "kw-week-employees-deleted-ids": [],
    "kw-payroll-week-meta": { rosterRevision: 267, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
  };
  lsStore["kw-weekFrom"] = JSON.stringify(WF);
  lsStore["kw-weekTo"] = JSON.stringify(WT);
  lsStore["kw-week-employees"] = JSON.stringify(cloud);
  lsStore["kw-payroll-week-meta"] = JSON.stringify(kv["kw-payroll-week-meta"]);

  let force409Once = true;
  let casAttempts = 0;
  let lastPushed = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const body = JSON.parse(String(opts?.body || "{}"));
    const ok = (payload) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    });
    if (u.includes("/batch-get")) {
      return ok({ values: (body.keys || []).map((k) => kv[k] ?? null) });
    }
    if (u.includes("/batch-set")) {
      if (body.payrollWeekCas) casAttempts += 1;
      if (force409Once && body.payrollWeekCas) {
        force409Once = false;
        const errPayload = {
          ok: false,
          error: "stale_revision",
          code: "stale_revision",
          serverRevision: (kv["kw-payroll-week-meta"].rosterRevision || 1) + 1,
          roster: kv["kw-week-employees"],
          currentRoster: kv["kw-week-employees"],
          message: "stale payroll revision",
        };
        return {
          ok: false,
          status: 409,
          text: async () => JSON.stringify(errPayload),
          json: async () => errPayload,
        };
      }
      const keys = body.keys || [];
      const values = body.values || [];
      for (let i = 0; i < keys.length; i++) kv[keys[i]] = values[i];
      const idx = keys.indexOf("kw-week-employees");
      if (idx >= 0) {
        lastPushed = values[idx];
        kv["kw-payroll-week-meta"] = {
          ...kv["kw-payroll-week-meta"],
          rosterRevision: (kv["kw-payroll-week-meta"].rosterRevision || 1) + 1,
        };
      }
      return ok({ ok: true });
    }
    return ok({ ok: true });
  };

  const { pwrAdd } = await import("../src/lib/payroll-week-roster-bundle.ts");
  let threw = null;
  let result = null;
  try {
    result = await pwrAdd({
      weekFrom: WF,
      weekTo: WT,
      directoryIds: [DAM_DIR],
      directory: [],
      currentRoster: cloud,
      newEmployees: [add],
    });
  } catch (e) {
    threw = e;
  }
  globalThis.fetch = realFetch;

  assert("M pwrAdd survives CAS 409", threw === null, threw ? String(threw.message ?? threw) : "");
  assert("M CAS retried after 409", casAttempts >= 2, `attempts=${casAttempts}`);
  assert("M pushed roster has Damianek", Array.isArray(lastPushed) && lastPushed.some((e) => e.directoryId === DAM_DIR));
  assert("M cloud roster 16", Array.isArray(kv["kw-week-employees"]) && kv["kw-week-employees"].length === 16);
  assert("M result pushed", result?.pushed === true);
  assert("M pending cleared after CAS", getPayrollPendingAddKeys().size === 0);
  resetPayrollPendingAddIntentsForTests();
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
