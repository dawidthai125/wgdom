/**
 * PAYROLL P2 — field-level stale write protection (R1–R20).
 * Run: npx vite-node scripts/test-payroll-p2-field-intent.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p2-field";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p2-field";

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

const WF = "2026-08-24";
const WT = "2026-08-29";
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

function defaultDay(active = false, to = "16:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, opts = {}) {
  const hoursTo = opts.hoursTo ?? "16:00"; // 9h default 07-16
  const rate = opts.rate ?? "100";
  const extraCosts = opts.extraCosts ?? [];
  const dataUpdatedAt = opts.dataUpdatedAt ?? "2026-08-20T10:00:00.000Z";
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate,
    rateUpdatedAt: opts.rateUpdatedAt ?? "2026-08-20T10:00:00.000Z",
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        {
          ...defaultDay(true, hoursTo),
          updatedAt: opts.dayUpdatedAt,
        },
      ]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts,
    settled: false,
    dataUpdatedAt,
  };
}

function slotH(emp, slot = "Pn") {
  const d = slot === "prevSaturday" ? emp.prevSaturday : emp.days?.[slot];
  if (!d?.active) return 0;
  const [fh, fm] = String(d.from || "0:0").split(":").map(Number);
  const [th, tm] = String(d.to || "0:0").split(":").map(Number);
  return +(((th * 60 + tm - (fh * 60 + fm)) / 60).toFixed(2));
}

const {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} = await import("../src/lib/payroll-field-intent.ts");
const { rebasePayrollRosterIntent, rebasePayrollExtraCostsIntent, isPayrollExtraCostsOnlyIntent } =
  await import("../src/lib/payroll-roster-rebase.ts");
const { cancelPayrollDomainPush, schedulePayrollDomainPush, hasPendingPayrollDomainPush, bindPayrollDomainPushHandler, unbindPayrollDomainPushHandler } =
  await import("../src/lib/payroll-domain-sync.ts");
const { weekEmployeeTombstoneId } = await import("../src/lib/cloud-sync.ts");

console.log("=== PAYROLL P2 — FIELD INTENT ===\n");

// R1: cloud 4h, stale 8h, edit extraCost => hours stay 4
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })]; // 4h
  const stale = makeEmp("e1", "A", { hoursTo: "16:00", dataUpdatedAt: "2026-08-28T18:00:00.000Z" }); // 9h ~8+
  const before = [stale];
  const after = [{
    ...stale,
    extraCosts: [{ id: "c1", description: "X", amount: "10", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R1 hours remain ~4 after extraCost", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1, String(slotH(roster[0], "Pn")));
  assert("R1 extraCost applied", (roster[0].extraCosts || []).length === 1);
}

// R2: edit another day on stale 8h => Pn stays 4
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const stale = makeEmp("e1", "A", { hoursTo: "16:00" });
  const before = [stale];
  const after = [{
    ...stale,
    days: {
      ...stale.days,
      Wt: { ...stale.days.Wt, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
    },
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  // Wt change without matching cloud baseline for Wt hours (stale Wt 9 vs cloud Wt 4) — Wt discarded; Pn stays cloud
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R2 Pn remains cloud 4h", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1, String(slotH(roster[0], "Pn")));
}

// R3: intentional hours increase 4→8 with matching baseline
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const before = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const after = [makeEmp("e1", "A", { hoursTo: "15:00" })]; // 8h
  after[0].days.Pn = { ...after[0].days.Pn, updatedAt: "2026-08-28T19:00:00.000Z" };
  const intents = [{
    weekFrom: WF,
    weekTo: WT,
    employeeId: "e1",
    slot: "Pn",
    fromHours: 4,
    toHours: 8,
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, intents, WF, WT);
  assert("R3 intentional hours-up to 8", Math.abs(slotH(roster[0], "Pn") - 8) < 0.1, String(slotH(roster[0], "Pn")));
}

// R4: edit day B, day A stays canonical
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00", dayUpdatedAt: "2026-08-27T10:00:00.000Z" })];
  cloud[0].days.Pn = { ...cloud[0].days.Pn, notes: [{ t: "cloud-note" }] };
  const stale = makeEmp("e1", "A", { hoursTo: "11:00" });
  stale.days.Pn = { ...stale.days.Pn, notes: [{ t: "stale-note" }] };
  const before = [stale];
  const after = [{
    ...stale,
    days: {
      ...stale.days,
      Wt: { ...stale.days.Wt, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
    },
  }];
  // Wt: before 9h cloud 4h — not matching; use localHoursIntent only if beforeH≈cloudH
  // Force Wt intent via matching: set before Wt to cloud 4h
  before[0] = {
    ...before[0],
    days: { ...before[0].days, Wt: { ...cloud[0].days.Wt } },
  };
  after[0] = {
    ...after[0],
    days: {
      ...before[0].days,
      Wt: { ...before[0].days.Wt, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
      Pn: stale.days.Pn,
    },
  };
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R4 Pn note stays cloud", JSON.stringify(roster[0].days.Pn?.notes || []).includes("cloud-note"));
}

// R5: cloud extraCost A, stale B, edit day => extraCost A
{
  const cloud = [makeEmp("e1", "A", {
    hoursTo: "11:00",
    extraCosts: [{ id: "a", description: "A", amount: "1", status: "approved" }],
  })];
  const stale = makeEmp("e1", "A", {
    hoursTo: "11:00",
    extraCosts: [{ id: "b", description: "B", amount: "2", status: "pending" }],
  });
  const before = [{ ...stale, days: { ...cloud[0].days } }];
  const after = [{
    ...before[0],
    days: {
      ...before[0].days,
      Pn: { ...before[0].days.Pn, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
    },
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R5 extraCost remains A", (roster[0].extraCosts || [])[0]?.description === "A");
}

// R6: cloud rate 100, stale 80, edit day => rate 100
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00", rate: "100" })];
  const stale = makeEmp("e1", "A", { hoursTo: "11:00", rate: "80" });
  const before = [{ ...stale, days: { ...cloud[0].days }, rate: "80" }];
  const after = [{
    ...before[0],
    days: {
      ...before[0].days,
      Pn: { ...before[0].days.Pn, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
    },
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R6 rate remains 100", String(roster[0].rate) === "100");
}

// R7: intentional rate 100→90
{
  const cloud = [makeEmp("e1", "A", { rate: "100" })];
  const before = [makeEmp("e1", "A", { rate: "100" })];
  const after = [makeEmp("e1", "A", { rate: "90", rateUpdatedAt: "2026-08-28T19:00:00.000Z" })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R7 rate becomes 90", String(roster[0].rate) === "90");
}

// R8: extraCost-only preserves days
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const before = [makeEmp("e1", "A", { hoursTo: "16:00" })];
  const after = [{
    ...before[0],
    extraCosts: [{ id: "c", description: "C", amount: "3", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  assert("R8 classified extraCosts-only", isPayrollExtraCostsOnlyIntent(before, after));
  const rebased = rebasePayrollExtraCostsIntent(cloud, before, after);
  assert("R8 days canonical 4h", Math.abs(slotH(rebased[0], "Pn") - 4) < 0.1);
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R8 field-intent days 4h", Math.abs(slotH(field.roster[0], "Pn") - 4) < 0.1);
}

// R9: day-only preserves rate + extraCosts
{
  const cloud = [makeEmp("e1", "A", {
    hoursTo: "11:00",
    rate: "100",
    extraCosts: [{ id: "a", description: "A", amount: "1", status: "approved" }],
  })];
  const before = [makeEmp("e1", "A", {
    hoursTo: "11:00",
    rate: "100",
    extraCosts: [{ id: "a", description: "A", amount: "1", status: "approved" }],
  })];
  const after = [{
    ...before[0],
    days: {
      ...before[0].days,
      Pn: { ...before[0].days.Pn, to: "12:00", updatedAt: "2026-08-28T19:00:00.000Z" },
    },
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R9 rate preserved", String(roster[0].rate) === "100");
  assert("R9 extraCost preserved", (roster[0].extraCosts || [])[0]?.description === "A");
}

// R10: rate-only preserves days + costs
{
  const cloud = [makeEmp("e1", "A", {
    hoursTo: "11:00",
    rate: "100",
    extraCosts: [{ id: "a", description: "A", amount: "1", status: "approved" }],
  })];
  const before = [makeEmp("e1", "A", { hoursTo: "16:00", rate: "100", extraCosts: cloud[0].extraCosts })];
  const after = [makeEmp("e1", "A", {
    hoursTo: "16:00",
    rate: "120",
    rateUpdatedAt: "2026-08-28T19:00:00.000Z",
    extraCosts: cloud[0].extraCosts,
  })];
  // before rate matches cloud → apply 120; days from cloud
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R10 rate 120", String(roster[0].rate) === "120");
  assert("R10 days canonical", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1);
  assert("R10 costs preserved", (roster[0].extraCosts || [])[0]?.description === "A");
}

// R11: 14-day stale + rate-only — no hours resurrection
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00", rate: "100", dataUpdatedAt: "2026-08-28T08:00:00.000Z" })];
  const stale = makeEmp("e1", "A", {
    hoursTo: "16:00",
    rate: "100",
    dataUpdatedAt: "2026-08-14T08:00:00.000Z",
  });
  const before = [stale];
  const after = [{ ...stale, rate: "110", rateUpdatedAt: "2026-08-28T19:00:00.000Z" }];
  // before.rate matches cloud 100 → rate ok; hours stay cloud
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R11 rate 110", String(roster[0].rate) === "110");
  assert("R11 no hours resurrect", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1);
}

// R12: intentional hours-up one slot; other slots canonical
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const before = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const after = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  after[0].days.Pn = { ...after[0].days.Pn, to: "15:00", updatedAt: "2026-08-28T19:00:00.000Z" };
  const intents = [{
    weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 4, toHours: 8,
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, intents, WF, WT);
  assert("R12 Pn=8", Math.abs(slotH(roster[0], "Pn") - 8) < 0.1);
  assert("R12 Wt=4", Math.abs(slotH(roster[0], "Wt") - 4) < 0.1);
}

// R13: remote DELETE + stale edit => no resurrect (membership inside field intent)
{
  const cloud = [makeEmp("z", "Z")];
  const staleX = makeEmp("x", "X");
  const before = [cloud[0], staleX];
  const after = [
    cloud[0],
    { ...staleX, rate: "99", rateUpdatedAt: "2026-08-28T19:00:00.000Z" },
  ];
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R13 X dropped by membership", !field.roster.some((e) => e.id === "x"));
}

// R14: remote ADD present in cloud + stale unrelated edit on other emp
{
  const cloud = [makeEmp("z", "Z", { hoursTo: "11:00" }), makeEmp("x", "X", { hoursTo: "11:00" })];
  const before = [makeEmp("z", "Z", { hoursTo: "16:00" })];
  const after = [{
    ...before[0],
    extraCosts: [{ id: "c", description: "C", amount: "1", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  const z = roster.find((e) => e.id === "z");
  const x = roster.find((e) => e.id === "x");
  assert("R14 z hours cloud", Math.abs(slotH(z, "Pn") - 4) < 0.1);
  assert("R14 remote ADD x preserved", !!x);
  assert("R14 z extraCost applied", (z?.extraCosts?.length ?? 0) === 1);
}

// R15: two devices different slots — apply intents independently
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const before = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  const after = [makeEmp("e1", "A", { hoursTo: "11:00" })];
  after[0].days.Pn = { ...after[0].days.Pn, to: "15:00", updatedAt: "2026-08-28T19:00:00.000Z" };
  const intents = [{
    weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 4, toHours: 8,
  }];
  const r = rebasePayrollFieldIntents(cloud, before, after, intents, WF, WT);
  assert("R15 Pn intended 8", Math.abs(slotH(r[0], "Pn") - 8) < 0.1);
  assert("R15 Wt canonical 4", Math.abs(slotH(r[0], "Wt") - 4) < 0.1);
}

// R16: same slot conflict — fromHours must match cloud or discarded
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00" })]; // 4
  const before = [makeEmp("e1", "A", { hoursTo: "16:00" })]; // stale 9
  const after = [makeEmp("e1", "A", { hoursTo: "15:00" })]; // wants 8
  const intents = [{
    weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 9, toHours: 8,
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, intents, WF, WT);
  assert("R16 stale fromHours rejected → cloud 4", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1);
}

// R17: pending debounce cancel API exists (bfcache path)
{
  let flushed = false;
  bindPayrollDomainPushHandler(() => {
    flushed = true;
  });
  schedulePayrollDomainPush([makeEmp("e1", "A")], {}, [makeEmp("e1", "A")]);
  assert("R17 pending scheduled", hasPendingPayrollDomainPush() === true);
  cancelPayrollDomainPush();
  assert("R17 pending cleared", hasPendingPayrollDomainPush() === false);
  assert("R17 not flushed after cancel", flushed === false);
  unbindPayrollDomainPushHandler();
}

// R18: fresh edit after cancel still schedulable
{
  let got = null;
  bindPayrollDomainPushHandler((roster) => {
    got = roster;
  });
  schedulePayrollDomainPush([makeEmp("e1", "A", { rate: "120" })], {}, [makeEmp("e1", "A", { rate: "100" })]);
  // flush immediately via cancel+manual — use short wait
  await new Promise((r) => setTimeout(r, 1100));
  assert("R18 fresh edit flushed", got != null && String(got[0].rate) === "120");
  unbindPayrollDomainPushHandler();
}

// R19: CAS 409 rebase uses field intents (roster rebase wrapper)
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00", rate: "100" })];
  const before = [makeEmp("e1", "A", { hoursTo: "16:00", rate: "100" })];
  const after = [{
    ...before[0],
    extraCosts: [{ id: "c", description: "C", amount: "1", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  const rebased = rebasePayrollRosterIntent(cloud, before, after);
  assert("R19 rebase hours cloud", Math.abs(slotH(rebased[0], "Pn") - 4) < 0.1);
  assert("R19 rebase costs applied", (rebased[0].extraCosts || [])[0]?.description === "C");
}

// R20: CAS-match path simulation — field apply before UNION-equivalent
{
  const cloud = [makeEmp("e1", "A", { hoursTo: "11:00", rate: "100" })];
  const staleOutgoing = [makeEmp("e1", "A", {
    hoursTo: "16:00",
    rate: "80",
    extraCosts: [{ id: "b", description: "B", amount: "2", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  })];
  const before = [makeEmp("e1", "A", { hoursTo: "16:00", rate: "80" })];
  const after = [{
    ...staleOutgoing[0],
    extraCosts: [{ id: "b", description: "B", amount: "2", status: "pending" }],
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R20 CAS-match hours 4", Math.abs(slotH(roster[0], "Pn") - 4) < 0.1);
  assert("R20 CAS-match rate 100", String(roster[0].rate) === "100");
  assert("R20 CAS-match cost B (edited)", (roster[0].extraCosts || [])[0]?.description === "B");
}

console.log(`\n=== P2 RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
