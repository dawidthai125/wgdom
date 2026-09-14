/**
 * PAYROLL GAP-2 — extraCosts concurrent DELETE (soft tombstone deletedAt).
 * Preserves F1 ADD/UPDATE. Same-id re-add blocked; new costs use new UUID.
 * Run: npx vite-node scripts/test-payroll-extracosts-delete-tombstone.mjs
 */
import {
  mergeExtraCostsById,
  stampExtraCostsOnEdit,
  pickExtraCostByLww,
  isExtraCostDeleted,
  visibleExtraCosts,
} from "../src/lib/payroll-extra-costs-merge.ts";
import { mergeWeekEmployeeRecord } from "../src/lib/payroll-week-employee-record-merge.ts";
import {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} from "../src/lib/payroll-field-intent.ts";
import { defaultDay, defaultDays, approvedExtraCostAmount } from "../src/app/app-domain.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}`, detail);
  }
}

const NOW = "2026-09-14T12:00:00.000Z";
const LATER = "2026-09-14T13:00:00.000Z";
const EARLIER = "2026-09-14T11:00:00.000Z";

function cost(id, desc, amount, updatedAt, deletedAt) {
  return {
    id,
    description: desc,
    amount: String(amount),
    status: "approved",
    ...(updatedAt ? { updatedAt } : {}),
    ...(deletedAt ? { deletedAt } : {}),
  };
}

function emp(overrides = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Test",
    phone: "",
    position: "",
    rate: "30",
    settled: false,
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

console.log("=== PAYROLL GAP-2 EXTRACOSTS DELETE TOMBSTONE ===\n");

// EC-D1 delete vs unchanged
{
  const live = cost("x", "X", 10, EARLIER);
  const tomb = cost("x", "X", 10, NOW, NOW);
  const r = mergeExtraCostsById([tomb], [live]);
  assert("EC-D1 delete vs unchanged → tomb wins", isExtraCostDeleted(r[0]) && r[0].id === "x");
}

// EC-D2 delete vs update (stale edit after delete)
{
  const tomb = cost("x", "X", 10, NOW, NOW);
  const staleEdit = cost("x", "edited", 99, LATER);
  const r = mergeExtraCostsById([staleEdit], [tomb]);
  assert(
    "EC-D2 delete vs update → tomb blocks resurrection",
    isExtraCostDeleted(r[0]) && r[0].amount === "10",
  );
}

// EC-D3 delete vs delete
{
  const a = cost("x", "X", 10, EARLIER, EARLIER);
  const b = cost("x", "X", 10, LATER, LATER);
  const r = pickExtraCostByLww(a, b);
  assert("EC-D3 delete vs delete → newer deletedAt", r.deletedAt === LATER);
}

// EC-D4 delete vs add-new-ID
{
  const tomb = cost("x", "X", 10, NOW, NOW);
  const neu = cost("y", "Y", 5, NOW);
  const r = mergeExtraCostsById([tomb], [neu]);
  assert("EC-D4 both ids present", r.map((c) => c.id).sort().join(",") === "x,y");
  assert("EC-D4 x deleted, y live", isExtraCostDeleted(r.find((c) => c.id === "x")) && !isExtraCostDeleted(r.find((c) => c.id === "y")));
}

// EC-D5 delete vs stale legacy (no updatedAt)
{
  const tomb = cost("x", "X", 10, NOW, NOW);
  const legacy = { id: "x", description: "old", amount: "1", status: "approved" };
  const r = mergeExtraCostsById([legacy], [tomb]);
  assert("EC-D5 tomb beats legacy live", isExtraCostDeleted(r[0]));
}

// EC-D6 409 rebase — field intent after delete
{
  const before = emp({
    extraCosts: [cost("x", "X", 10, EARLIER)],
  });
  const after = emp({
    extraCosts: stampExtraCostsOnEdit(before.extraCosts, [], NOW),
  });
  const cloud = emp({
    extraCosts: [cost("x", "X", 10, EARLIER), cost("y", "Y", 3, EARLIER)],
  });
  const rebased = rebasePayrollFieldIntents([cloud], [before], [after], undefined, "2026-09-14", "2026-09-19");
  const costs = rebased[0]?.extraCosts || [];
  const x = costs.find((c) => c.id === "x");
  const y = costs.find((c) => c.id === "y");
  assert("EC-D6 x tombstoned after rebase", isExtraCostDeleted(x));
  assert("EC-D6 peer y preserved", y && !isExtraCostDeleted(y) && y.amount === "3");
}

// EC-D7 pull merge (record merge)
{
  const local = emp({
    extraCosts: [cost("x", "X", 10, NOW, NOW)],
    dataUpdatedAt: LATER,
  });
  const cloud = emp({
    extraCosts: [cost("x", "edited", 99, LATER)],
    dataUpdatedAt: EARLIER,
  });
  const merged = mergeWeekEmployeeRecord(local, cloud);
  const x = (merged.extraCosts || []).find((c) => c.id === "x");
  assert("EC-D7 pull merge tomb wins", isExtraCostDeleted(x));
}

// EC-D8 hydration / stamp delete + visible filter
{
  const before = [cost("x", "X", 10, EARLIER), cost("y", "Y", 5, EARLIER)];
  const stamped = stampExtraCostsOnEdit(before, [cost("y", "Y", 5, EARLIER)], NOW);
  assert("EC-D8 stamp keeps both rows", stamped.length === 2);
  assert("EC-D8 x has deletedAt", isExtraCostDeleted(stamped.find((c) => c.id === "x")));
  assert("EC-D8 visible only y", visibleExtraCosts(stamped).map((c) => c.id).join(",") === "y");
  assert("EC-D8 approved amount of tomb is 0", approvedExtraCostAmount(stamped.find((c) => c.id === "x")) === 0);
}

// EC-D9 tombstone cleanup — prior tombs preserved across unrelated edit
{
  const before = [
    cost("x", "X", 10, EARLIER, EARLIER),
    cost("y", "Y", 5, EARLIER),
  ];
  const stamped = stampExtraCostsOnEdit(before, [cost("y", "Y2", 6, EARLIER)], NOW);
  const x = stamped.find((c) => c.id === "x");
  const y = stamped.find((c) => c.id === "y");
  assert("EC-D9 prior tomb retained", isExtraCostDeleted(x) && x.deletedAt === EARLIER);
  assert("EC-D9 y updated live", !isExtraCostDeleted(y) && y.description === "Y2" && y.updatedAt === NOW);
}

// EC-D10 concurrent re-add same-id blocked; new id ok
{
  const tomb = cost("x", "X", 10, NOW, NOW);
  const sameIdReadd = cost("x", "reborn", 1, LATER);
  const newId = cost("z", "fresh", 2, LATER);
  const r = mergeExtraCostsById([sameIdReadd, newId], [tomb]);
  assert("EC-D10 same-id blocked", isExtraCostDeleted(r.find((c) => c.id === "x")));
  assert("EC-D10 new id allowed", !isExtraCostDeleted(r.find((c) => c.id === "z")));
}

// apply intents: baseline delete wins onto cloud
{
  const before = emp({ extraCosts: [cost("x", "X", 10, EARLIER)] });
  const after = emp({ extraCosts: stampExtraCostsOnEdit(before.extraCosts, [], NOW) });
  const cloud = emp({ extraCosts: [cost("x", "X", 10, EARLIER)] });
  const { roster: applied } = applyPayrollFieldIntentsOntoCanonical(
    [cloud],
    [before],
    [after],
    [],
    "2026-09-14",
    "2026-09-19",
  );
  assert(
    "EC-D intent apply tomb",
    isExtraCostDeleted((applied[0].extraCosts || [])[0]),
  );
}

console.log(`\n=== GAP-2 RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
