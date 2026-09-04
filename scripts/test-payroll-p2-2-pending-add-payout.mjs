/**
 * PAYROLL P2.2 — pending ADD (H14-REG) + early payout intent (PAY-*).
 * Run: npx vite-node scripts/test-payroll-p2-2-pending-add-payout.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p22";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p22";

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
    position: "Pracownik",
    rate: opts.rate ?? "100",
    days: Object.fromEntries(DAYS.map((d) => [d, { ...defaultDay(true, opts.hoursTo ?? "16:00") }])),
    prevSaturday: defaultDay(false),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-09-04T07:00:00.000Z",
    payrollEarlyPayouts: opts.early,
  };
}

function tx(id, amount, opts = {}) {
  const now = opts.nowIso ?? "2026-09-04T07:53:48.759Z";
  return {
    id,
    amount,
    method: opts.method ?? "cash",
    paidAt: opts.paidAt ?? "2026-09-04",
    periodKey: opts.periodKey ?? WT,
    createdAt: opts.createdAt ?? now,
    updatedAt: opts.updatedAt ?? now,
    ...(opts.deletedAt ? { deletedAt: opts.deletedAt } : {}),
  };
}

function hasEmp(roster, id) {
  return (roster ?? []).some((e) => e.id === id);
}

function empEarly(roster, empId) {
  const emp = (roster ?? []).find((e) => e.id === empId);
  return emp?.payrollEarlyPayouts ?? [];
}

const { sanitizeStaleRosterMembership } = await import("../src/lib/payroll-stale-roster-membership.ts");
const {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} = await import("../src/lib/payroll-field-intent.ts");
const { rebuildPayrollOutgoingAfterFreshness } = await import("../src/lib/cloud-sync.ts");
const { applyEarlyPayoutFieldIntent } = await import("../src/lib/payroll-early-payout.ts");
const {
  mergeWeekEmployeeRecord,
  pickPayrollEarlyPayoutsForMerge,
} = await import("../src/lib/payroll-week-employee-record-merge.ts");
const {
  rememberPayrollPendingAdds,
  revokePayrollPendingAdd,
  resetPayrollPendingAddIntentsForTests,
  ackPayrollPendingAddsInRoster,
  getPayrollPendingAddKeys,
} = await import("../src/lib/payroll-pending-add-intent.ts");

function cloud15() {
  return Array.from({ length: 15 }, (_, i) => makeEmp(`e${i + 1}`, `Emp ${i + 1}`));
}

function damianek(opts = {}) {
  return makeEmp("7e9bb56f-17da-4334-a5f8-6278283112f0", "Damianek", {
    directoryId: "6bafc80e-ee8c-4183-8e74-8750b7667d59",
    ...opts,
  });
}

function rebuild(cloud, before, after) {
  return rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: after,
    intentBefore: before,
    weekFrom: WF,
    weekTo: WT,
  });
}

// ─── H14-REG-1: before=15 after=16 cloud=15 → ADD remains ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const add = damianek();
  const after = [...before, add];
  rememberPayrollPendingAdds([add]);
  const mem = sanitizeStaleRosterMembership(cloud, after, before);
  assert("H14-REG-1 sanitize keeps ADD", hasEmp(mem.roster, add.id), `len=${mem.roster.length}`);
  const rebuilt = rebuild(cloud, before, after);
  assert("H14-REG-1 rebuild keeps ADD", hasEmp(rebuilt.roster, add.id));
}

// ─── H14-REG-2: before=16 after=16 cloud=15 former cloud emp → ghost ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const ghost = makeEmp("ghost-old", "Ghost Old", { directoryId: "dir-ghost-old" });
  const before = [...cloud, ghost];
  const after = [...cloud, ghost];
  const mem = sanitizeStaleRosterMembership(cloud, after, before);
  assert("H14-REG-2 ghost dropped", !hasEmp(mem.roster, ghost.id) && mem.roster.length === 15);
}

// ─── H14-REG-3: ADD first push fails, later hours edit rebuild keeps ADD ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const afterHours = [...cloud, { ...add, dataUpdatedAt: "2026-09-04T07:52:17.112Z" }];
  const rebuilt = rebuild(cloud, afterHours, afterHours);
  assert("H14-REG-3 survives later hours rebuild", hasEmp(rebuilt.roster, add.id));
}

// ─── H14-REG-4: ADD succeeds cloud=16 → no duplicate ───
{
  resetPayrollPendingAddIntentsForTests();
  const add = damianek();
  const cloud = [...cloud15(), add];
  rememberPayrollPendingAdds([add]);
  ackPayrollPendingAddsInRoster(cloud);
  const after = cloud.map((e) => ({ ...e }));
  const rebuilt = rebuild(cloud, after, after);
  const copies = rebuilt.roster.filter((e) => e.id === add.id);
  assert("H14-REG-4 no duplicate", copies.length === 1);
  assert("H14-REG-4 ack cleared pending", getPayrollPendingAddKeys().size === 0);
}

// ─── H14-REG-5: ADD then explicit remove before ACK → no resurrect ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  revokePayrollPendingAdd(add);
  const afterRemove = cloud.map((e) => ({ ...e }));
  const tomb = new Set([`dir:${add.directoryId}`]);
  const mem = sanitizeStaleRosterMembership(cloud, afterRemove, [...cloud, add], tomb);
  assert("H14-REG-5 not in after", !hasEmp(mem.roster, add.id));
  const withStaleAfter = sanitizeStaleRosterMembership(cloud, [...cloud, add], [...cloud, add], tomb);
  assert("H14-REG-5 tomb blocks resurrect", !hasEmp(withStaleAfter.roster, add.id));
}

// ─── H14-REG-6: remote deletion still protected ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const remoteDeleted = makeEmp("remote-del", "Remote Del");
  const before = [...cloud, remoteDeleted];
  const after = [...cloud, remoteDeleted];
  const mem = sanitizeStaleRosterMembership(cloud, after, before);
  assert("H14-REG-6 remote delete dropped", !hasEmp(mem.roster, remoteDeleted.id));
}

// ─── H14-REG-7: 409 rebase keeps pending ADD ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after = [...cloud, add];
  const rebased = rebasePayrollFieldIntents(cloud, after, after, [], WF, WT);
  assert("H14-REG-7 rebase keeps pending ADD", hasEmp(rebased, add.id));
}

// ─── H14-REG-8: two sequential rebuilds keep pending ADD ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const after1 = [...cloud, add];
  const r1 = rebuild(cloud, cloud, after1);
  const after2 = r1.roster.map((e) =>
    e.id === add.id ? { ...e, dataUpdatedAt: "2026-09-04T08:19:54.764Z" } : e,
  );
  const r2 = rebuild(cloud, after1, after2);
  assert("H14-REG-8 first rebuild keeps ADD", hasEmp(r1.roster, add.id));
  assert("H14-REG-8 second rebuild keeps ADD", hasEmp(r2.roster, add.id));
}

// ─── Existing H14 (no pending) still drops ───
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = [makeEmp("e1", "A")];
  const ghost = makeEmp("ghost", "Ghost");
  const before = [cloud[0], ghost];
  const after = [cloud[0], ghost];
  const mem = sanitizeStaleRosterMembership(cloud, after, before);
  assert("H14 no-pending ghost still dropped", mem.roster.length === 1 && mem.roster[0].id === "e1");
}

const OLD_ID = "936f2e30-old";
const NEW_ID = "6a42aba2-new";
const DATA_AT = "2026-09-04T07:50:00.000Z";

// ─── PAY-1: cloud old live; local delete + new → outgoing has both ───
{
  resetPayrollPendingAddIntentsForTests();
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = {
    ...oldLive,
    deletedAt: "2026-09-04T08:19:39.370Z",
    updatedAt: "2026-09-04T08:19:39.370Z",
  };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const applied = applyEarlyPayoutFieldIntent([oldLive], [oldLive], [oldDel, neu]);
  const ids = applied.list.map((t) => t.id).sort();
  assert("PAY-1 has new", applied.list.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY-1 old deleted", applied.list.some((t) => t.id === OLD_ID && t.deletedAt));
  assert("PAY-1 both ids", ids.join(",") === `${NEW_ID},${OLD_ID}` || ids.join(",") === `${OLD_ID},${NEW_ID}`);
}

// ─── PAY-2: local unchanged → cloud preserved ───
{
  const oldLive = tx(OLD_ID, 400);
  const applied = applyEarlyPayoutFieldIntent([oldLive], [oldLive], [oldLive]);
  assert("PAY-2 cloud preserved", applied.list.length === 1 && applied.list[0].id === OLD_ID && !applied.list[0].deletedAt);
}

// ─── PAY-3: local new, cloud missing → preserved even if already in before ───
{
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const applied = applyEarlyPayoutFieldIntent([], [neu], [neu]);
  assert("PAY-3 pending ADD from before+after", applied.list.some((t) => t.id === NEW_ID && !t.deletedAt));
}

// ─── PAY-4: remote payout, local no newer intent → remote kept ───
{
  const remote = tx("remote-ep", 700, { nowIso: "2026-09-04T09:00:00.000Z" });
  const localEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT });
  const cloudEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [remote] });
  const applied = applyPayrollFieldIntentsOntoCanonical(
    [cloudEmp],
    [localEmp],
    [{ ...localEmp, extraCosts: [{ id: "x", description: "paragon", amount: "1", status: "pending" }] }],
    [],
    WF,
    WT,
  );
  const eps = applied.roster[0]?.payrollEarlyPayouts ?? [];
  assert("PAY-4 remote preserved", eps.some((t) => t.id === "remote-ep" && t.amount === 700));
}

// ─── PAY-5: local mutation, dataUpdatedAt unchanged → merge keeps local ───
{
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = { ...oldLive, deletedAt: "2026-09-04T08:19:39.370Z", updatedAt: "2026-09-04T08:19:39.370Z" };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const cloudEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldLive] });
  const localEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldDel, neu] });
  const merged = mergeWeekEmployeeRecord(localEmp, cloudEmp);
  const list = merged.payrollEarlyPayouts ?? [];
  assert("PAY-5 dataUpdatedAt unused", localEmp.dataUpdatedAt === cloudEmp.dataUpdatedAt);
  assert("PAY-5 new wins", list.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY-5 old deleted", list.some((t) => t.id === OLD_ID && t.deletedAt));
}

// ─── PAY-6: payout then hours mutation → payout remains in rebuild ───
{
  resetPayrollPendingAddIntentsForTests();
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = { ...oldLive, deletedAt: "2026-09-04T08:19:39.370Z", updatedAt: "2026-09-04T08:19:39.370Z" };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const cloudEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldLive], hoursTo: "16:00" });
  const before = [makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldDel, neu], hoursTo: "16:00" })];
  const after = [makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldDel, neu], hoursTo: "17:00" })];
  const rebuilt = rebuild([cloudEmp], before, after);
  const list = empEarly(rebuilt.roster, "marcin");
  assert("PAY-6 new remains", list.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY-6 old deleted", list.some((t) => t.id === OLD_ID && t.deletedAt));
}

// ─── PAY-7: payout then freshness rebuild (before==after) → payout remains ───
{
  resetPayrollPendingAddIntentsForTests();
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = { ...oldLive, deletedAt: "2026-09-04T08:19:39.370Z", updatedAt: "2026-09-04T08:19:39.370Z" };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const cloudEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldLive] });
  const local = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldDel, neu] });
  const rebuilt = rebuild([cloudEmp], [local], [local]);
  const list = empEarly(rebuilt.roster, "marcin");
  assert("PAY-7 freshness keeps new", list.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY-7 freshness keeps delete", list.some((t) => t.id === OLD_ID && t.deletedAt));
}

// ─── PAY-8: CAS 409 rebase keeps payout intent ───
{
  resetPayrollPendingAddIntentsForTests();
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = { ...oldLive, deletedAt: "2026-09-04T08:19:39.370Z", updatedAt: "2026-09-04T08:19:39.370Z" };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const cloudEmp = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldLive] });
  const local = makeEmp("marcin", "Marcin", { dataUpdatedAt: DATA_AT, early: [oldDel, neu] });
  const rebased = rebasePayrollFieldIntents([cloudEmp], [local], [local], [], WF, WT);
  const list = rebased[0]?.payrollEarlyPayouts ?? [];
  assert("PAY-8 rebase new", list.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY-8 rebase delete", list.some((t) => t.id === OLD_ID && t.deletedAt));
}

// Edge-style merge: first arg = cloud prev, second = incoming
{
  const oldLive = tx(OLD_ID, 400, { nowIso: "2026-09-04T07:53:48.759Z" });
  const oldDel = { ...oldLive, deletedAt: "2026-09-04T08:19:39.370Z", updatedAt: "2026-09-04T08:19:39.370Z" };
  const neu = tx(NEW_ID, 250, { nowIso: "2026-09-04T08:19:54.764Z" });
  const picked = pickPayrollEarlyPayoutsForMerge([oldDel, neu], [oldLive]);
  assert("PAY merge picker local-first new", picked.some((t) => t.id === NEW_ID));
  const edgeStyle = pickPayrollEarlyPayoutsForMerge([oldLive], [oldDel, neu]);
  assert("PAY merge picker incoming new", edgeStyle.some((t) => t.id === NEW_ID && !t.deletedAt));
  assert("PAY merge picker incoming delete", edgeStyle.some((t) => t.id === OLD_ID && t.deletedAt));
}

console.log(`\nP2.2 ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
