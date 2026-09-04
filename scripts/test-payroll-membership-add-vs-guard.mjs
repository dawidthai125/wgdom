/**
 * PAYROLL — membership ADD vs Guard (unrelated hours-down).
 * Run: npx vite-node scripts/test-payroll-membership-add-vs-guard.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-mem-add-guard";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-mem-add-guard";

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
    directoryId: "6bafc80e-ee8c-4183-8e74-8750b7667d59",
    hoursTo: "07:00",
  });
}

const { rebuildPayrollOutgoingAfterFreshness, wouldBlockPayrollShrink } = await import(
  "../src/lib/cloud-sync.ts"
);
const { listUnauthorizedHoursDownSlots, slotHours } = await import("../src/lib/payroll-hours-intent.ts");
const { outgoingHasLegalMembershipAdd, sanitizeStaleRosterMembership } = await import(
  "../src/lib/payroll-stale-roster-membership.ts"
);
const { rememberPayrollPendingAdds, resetPayrollPendingAddIntentsForTests, revokePayrollPendingAdd } =
  await import("../src/lib/payroll-pending-add-intent.ts");
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");

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

// A — existing + legal ADD + no hours-down → ALLOW
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e, days: { ...e.days } }));
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after = [...before, add];
  const rebuilt = rebuild(cloud, before, after);
  const down = unauthorized(cloud, rebuilt.roster);
  assert("A mode canonical", rebuilt.mode === "canonical_intent");
  assert("A Damianek present", rebuilt.roster.some((e) => e.id === add.id));
  assert("A no hours-down", down.length === 0);
  assert("A no shrink", wouldBlockPayrollShrink(cloud, rebuilt.roster) === false);
  assert("A has membership add", outgoingHasLegalMembershipAdd(cloud, after, before) === true);
  resetPayrollPendingAddIntentsForTests();
}

// B — legal ADD + unrelated existing hours-down → cloud hours kept, ADD kept, down not authorized
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e, days: { ...e.days } }));
  const stale = before.map((e, i) =>
    i === 0
      ? { ...e, days: { ...e.days, Pn: { ...e.days.Pn, to: "11:00" } } }
      : e,
  );
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after = [...stale, add];
  const rawDown = unauthorized(cloud, after);
  assert("B raw after has hours-down", rawDown.length > 0 && rawDown[0].slot === "Pn");
  const rebuilt = rebuild(cloud, before, after);
  const down = unauthorized(cloud, rebuilt.roster);
  const e1 = rebuilt.roster.find((e) => e.id === "e1");
  assert("B mode canonical not fail-loud", rebuilt.mode === "canonical_intent");
  assert("B Damianek present", rebuilt.roster.some((e) => e.id === add.id));
  assert("B existing Pn restored to cloud 9h", slotHours(e1, "Pn") === 9);
  assert("B hours-down not in outgoing", down.length === 0);
  assert("B no shrink", wouldBlockPayrollShrink(cloud, rebuilt.roster) === false);
  resetPayrollPendingAddIntentsForTests();
}

// C — existing-member hours-down without ADD → fail-loud / would BLOCK
{
  const cloud = cloud15();
  const after = cloud.map((e, i) =>
    i === 0
      ? { ...e, days: { ...e.days, Pn: { ...e.days.Pn, to: "11:00" } } }
      : e,
  );
  const rebuilt = rebuild(cloud, cloud, after);
  const down = unauthorized(cloud, rebuilt.roster);
  assert("C mode fail-loud", rebuilt.mode === "silent_down_fail_loud");
  assert("C hours-down present", down.length > 0);
  assert("C no membership add", outgoingHasLegalMembershipAdd(cloud, after, cloud) === false);
}

// D — shrink >50% → BLOCK
{
  const cloud = cloud15();
  const tiny = [makeEmp("e1", "Emp 1", { hoursTo: "07:00" })];
  assert("D shrink blocked", wouldBlockPayrollShrink(cloud, tiny) === true);
}

// E — cloud unreachable still fail-closed in Guard source (no bypass added)
{
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8");
  assert(
    "E cloud_unreachable_fail_closed still strips",
    src.includes('return stripEmp("cloud_unreachable_fail_closed")'),
  );
  assert("E no pendingAdd skipGuard", !src.includes("if (pendingAdd) skip") && !src.includes("skipPayrollGuard: true /* membership"));
}

// F — explicit REMOVE stays removed; tomb blocks cloud-absent resurrect (P2.4)
{
  const cloud = cloud15();
  const removed = cloud[0];
  const after = cloud.slice(1);
  const tomb = new Set([weekEmployeeMergeKey(removed)]);
  const mem = sanitizeStaleRosterMembership(cloud, after, cloud, tomb);
  assert("F removed absent", !mem.roster.some((e) => e.id === removed.id));
  const ghost = makeEmp("ghost-x", "Ghost");
  const tombGhost = new Set([weekEmployeeMergeKey(ghost)]);
  const blocked = sanitizeStaleRosterMembership(
    cloud,
    [...after, ghost],
    [...after, ghost],
    tombGhost,
  );
  assert("F tomb blocks resurrect after remove", !blocked.roster.some((e) => e.id === ghost.id));
}

// G — legal ADD + current-week tomb (P2.4)
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after = [...before, add];
  const tomb = new Set([weekEmployeeMergeKey(add)]);
  const rebuilt = rebuild(cloud, before, after, tomb);
  assert("G P2.4 ADD survives tomb", rebuilt.roster.some((e) => e.id === add.id));
  assert("G mode canonical", rebuilt.mode === "canonical_intent");
  resetPayrollPendingAddIntentsForTests();
}

// H — ADD outgoing would persist (no Guard block metrics)
{
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after = [...before, add];
  const rebuilt = rebuild(cloud, before, after);
  assert("H roster 16", rebuilt.roster.length === 16);
  assert("H Damianek merge dir", weekEmployeeMergeKey(add) === "dir:6bafc80e-ee8c-4183-8e74-8750b7667d59");
  assert("H guard would allow", unauthorized(cloud, rebuilt.roster).length === 0);
  assert("H revoke still works", (() => {
    revokePayrollPendingAdd(add);
    return true;
  })());
  resetPayrollPendingAddIntentsForTests();
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
