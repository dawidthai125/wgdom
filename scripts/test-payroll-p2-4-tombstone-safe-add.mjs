/**
 * PAYROLL P2.4 — tombstone-safe legal ADD + ACK-safe LocalStorage.
 * Run: npx vite-node scripts/test-payroll-p2-4-tombstone-safe-add.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p24";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p24";

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
const OTHER_WF = "2026-08-17";
const OTHER_WT = "2026-08-22";
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
    days: Object.fromEntries(DAYS.map((d) => [d, { ...defaultDay(d !== "So", opts.hoursTo ?? "16:00") }])),
    prevSaturday: defaultDay(false),
    extraCosts: [],
    settled: opts.settled === true,
    payrollSettlement: opts.payrollSettlement,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-09-04T07:00:00.000Z",
  };
}

function cloud15() {
  return Array.from({ length: 15 }, (_, i) => makeEmp(`e${i + 1}`, `Emp ${i + 1}`));
}

function damianek(opts = {}) {
  return makeEmp("7e9bb56f-17da-4334-a5f8-6278283112f0", "Damianek", {
    directoryId: "6bafc80e-ee8c-4183-8e74-8750b7667d59",
    position: "Kombinator2",
    rate: "28",
    settled: opts.settled === true,
    payrollSettlement: opts.payrollSettlement,
    ...opts,
  });
}

function hasEmp(roster, id) {
  return (roster ?? []).some((e) => e.id === id);
}

const { sanitizeStaleRosterMembership } = await import("../src/lib/payroll-stale-roster-membership.ts");
const { applyPayrollFieldIntentsOntoCanonical } = await import("../src/lib/payroll-field-intent.ts");
const {
  rebuildPayrollOutgoingAfterFreshness,
  filterDeletedWeekEmployees,
  deletedWeekEmployeeMergeKeySet,
  weekEmployeeTombstoneId,
  removeDeletedWeekEmployeeMergeKeysForWeek,
  saveDeletedWeekEmployeeKeys,
  getDeletedWeekEmployeeKeys,
  captureKwWeekEmployeesLsBeforePush,
  restoreKwWeekEmployeesLsAfterFailedPush,
} = await import("../src/lib/cloud-sync.ts");
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
const {
  rememberPayrollPendingAdds,
  revokePayrollPendingAdd,
  resetPayrollPendingAddIntentsForTests,
  ackPayrollPendingAddsInRoster,
  getPayrollPendingAddKeys,
} = await import("../src/lib/payroll-pending-add-intent.ts");

function damianekMergeKey() {
  return weekEmployeeMergeKey(damianek());
}

function currentWeekTombSet(emp = damianek()) {
  return new Set([weekEmployeeMergeKey(emp)]);
}

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

function setupAddScenario() {
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek({
    settled: true,
    payrollSettlement: { amount: 252, settledAt: "2026-09-04T11:00:00.000Z", paymentMethod: "cash" },
  });
  const before = cloud.map((e) => ({ ...e }));
  const after = [...before, add];
  rememberPayrollPendingAdds([add]);
  const tomb = currentWeekTombSet(add);
  return { cloud, before, after, add, tomb };
}

// ─── P2.4-1 cloud 15 + current-week tomb + legal ADD → outgoing 16 ───
{
  const { cloud, before, after, add, tomb } = setupAddScenario();
  const rebuilt = rebuild(cloud, before, after, tomb);
  assert("P2.4-1 outgoing 16", rebuilt.roster.length === 16, `len=${rebuilt.roster.length}`);
  assert("P2.4-1 Damianek present", hasEmp(rebuilt.roster, add.id));
}

// ─── P2.4-2 freshness UNION tomb + rebuild still 16 ───
{
  const { cloud, before, after, add } = setupAddScenario();
  saveDeletedWeekEmployeeKeys([weekEmployeeTombstoneId(WF, WT, add)]);
  removeDeletedWeekEmployeeMergeKeysForWeek(WF, WT, getPayrollPendingAddKeys());
  const tombAfterRevoke = deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT);
  const rebuilt = rebuild(cloud, before, after, tombAfterRevoke);
  assert("P2.4-2 tomb revoked for pending ADD", !tombAfterRevoke.has(damianekMergeKey()));
  assert("P2.4-2 rebuild still 16", rebuilt.roster.length === 16 && hasEmp(rebuilt.roster, add.id));
}

// ─── P2.4-3 sanitize keeps Damianek despite tomb ───
{
  const { cloud, before, after, add, tomb } = setupAddScenario();
  const mem = sanitizeStaleRosterMembership(cloud, after, before, tomb);
  assert("P2.4-3 sanitize keeps ADD", hasEmp(mem.roster, add.id) && mem.roster.length === 16);
}

// ─── P2.4-4 field intents keep Damianek + settlement ───
{
  const { cloud, before, after, add } = setupAddScenario();
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  const kept = field.roster.find((e) => e.id === add.id);
  assert("P2.4-4 field keeps ADD", !!kept);
  assert("P2.4-4 settlement intent kept", kept?.settled === true && kept?.payrollSettlement?.amount === 252);
}

// ─── P2.4-5 CAS 2xx releases pending ADD ───
{
  const { after, add } = setupAddScenario();
  assert("P2.4-5 pending before ACK", getPayrollPendingAddKeys().has(damianekMergeKey()));
  ackPayrollPendingAddsInRoster(after);
  assert("P2.4-5 pending released after ACK", !getPayrollPendingAddKeys().has(damianekMergeKey()));
  assert("P2.4-5 ACK identity was Damianek", after.some((e) => e.id === add.id));
}

// ─── P2.4-6 successful payload contains Damianek ───
{
  const { cloud, before, after, add, tomb } = setupAddScenario();
  const rebuilt = rebuild(cloud, before, after, tomb);
  assert("P2.4-6 payload has Damianek", hasEmp(rebuilt.roster, add.id));
  assert("P2.4-6 payload count 16", rebuilt.roster.length === 16);
}

// ─── P2.4-7 explicit Remove stays removed; tomb blocks resurrect ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  revokePayrollPendingAdd(add);
  const afterRemove = cloud.map((e) => ({ ...e }));
  const tomb = currentWeekTombSet(add);
  const mem = sanitizeStaleRosterMembership(cloud, afterRemove, [...cloud, add], tomb);
  assert("P2.4-7 remove not in outgoing", !hasEmp(mem.roster, add.id));
  const staleAfter = sanitizeStaleRosterMembership(cloud, [...cloud, add], [...cloud, add], tomb);
  assert("P2.4-7 tomb blocks resurrect after revoke", !hasEmp(staleAfter.roster, add.id));
  const filtered = filterDeletedWeekEmployees([...cloud, add], tomb);
  assert("P2.4-7 filterDeleted no pending → drop", !hasEmp(filtered, add.id));
}

// ─── P2.4-8 ADD → freshness tomb → rebuild → no loss ───
{
  const { cloud, before, after, add } = setupAddScenario();
  saveDeletedWeekEmployeeKeys([
    weekEmployeeTombstoneId(WF, WT, add),
    weekEmployeeTombstoneId(OTHER_WF, OTHER_WT, add),
  ]);
  const pulledTomb = deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT);
  assert("P2.4-8 freshness sees current-week tomb", pulledTomb.has(damianekMergeKey()));
  const rebuiltBeforeRevoke = rebuild(cloud, before, after, pulledTomb);
  assert("P2.4-8 rebuild keeps ADD despite freshness tomb", hasEmp(rebuiltBeforeRevoke.roster, add.id));
}

// ─── P2.4-9 failed CAS does not keep shrunk LS ───
{
  resetPayrollPendingAddIntentsForTests();
  const full = [...cloud15(), damianek()];
  localStorage.setItem("kw-week-employees", JSON.stringify(full));
  const previous = captureKwWeekEmployeesLsBeforePush();
  localStorage.setItem("kw-week-employees", JSON.stringify(cloud15()));
  assert("P2.4-9 optimistic wrote 15", JSON.parse(localStorage.getItem("kw-week-employees")).length === 15);
  restoreKwWeekEmployeesLsAfterFailedPush(previous);
  const restored = JSON.parse(localStorage.getItem("kw-week-employees"));
  assert("P2.4-9 restore 16", restored.length === 16 && restored.some((e) => e.name === "Damianek"));
}

// ─── P2.4-10 successful CAS LS agrees with outgoing ───
{
  const { cloud, before, after, add, tomb } = setupAddScenario();
  const rebuilt = rebuild(cloud, before, after, tomb);
  localStorage.setItem("kw-week-employees", JSON.stringify(rebuilt.roster));
  ackPayrollPendingAddsInRoster(rebuilt.roster);
  const ls = JSON.parse(localStorage.getItem("kw-week-employees"));
  assert("P2.4-10 LS count matches outgoing", ls.length === rebuilt.roster.length);
  assert("P2.4-10 LS has Damianek", ls.some((e) => e.id === add.id));
}

// ─── P2.4-11 other employee tomb does not drop Damianek ───
{
  const { cloud, before, after, add } = setupAddScenario();
  const other = cloud[0];
  const tomb = new Set([weekEmployeeMergeKey(other)]);
  const rebuilt = rebuild(cloud, before, after, tomb);
  assert("P2.4-11 Damianek kept", hasEmp(rebuilt.roster, add.id));
  assert("P2.4-11 other still in cloud path", hasEmp(rebuilt.roster, other.id));
}

// ─── P2.4-12 other-week tomb does not block current ADD ───
{
  const { cloud, before, after, add } = setupAddScenario();
  saveDeletedWeekEmployeeKeys([weekEmployeeTombstoneId(OTHER_WF, OTHER_WT, add)]);
  const currentTombs = deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT);
  assert("P2.4-12 other-week tomb not in current set", !currentTombs.has(damianekMergeKey()));
  const rebuilt = rebuild(cloud, before, after, currentTombs);
  assert("P2.4-12 ADD not blocked by other week", hasEmp(rebuilt.roster, add.id) && rebuilt.roster.length === 16);
}

// ─── filterDeleted + pending ADD keeps person ───
{
  const { add, tomb } = setupAddScenario();
  const filtered = filterDeletedWeekEmployees([add], tomb);
  assert("P2.4 filterDeleted pending ADD kept", hasEmp(filtered, add.id));
}

console.log(`\nP2.4 ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
