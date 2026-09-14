/**
 * PAYROLL AKORD — weekly advance payout semantics (Owner TESTS 1–14).
 * IN-MEMORY / STATIC — no prod writes.
 * npx vite-node scripts/test-payroll-akord-week-advance-payout.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-week-adv";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-week-adv";

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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAdvance,
  createAllocation,
  createPieceworkJob,
} from "../src/lib/payroll-piecework.ts";
import {
  resolveAkordBalance,
  resolveAkordPayable,
  resolveAkordWeekAdvances,
} from "../src/lib/payroll-piecework-payable.ts";
import { emptyPayrollPieceworkState } from "../src/lib/payroll-piecework-types.ts";
import {
  buildPayrollCarryForwardRecord,
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
} from "../src/lib/payroll-carry-forward.ts";
import { resolveSettlementPayableAmount } from "../src/lib/payroll-settlement.ts";
import { freezeAkordArchivePayables } from "../src/lib/payroll-archive-akord.ts";
import { buildWeekSnapshot, defaultDays, weekEmployeeFromDir } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import { calcBiweeklyRowDisplay } from "../src/lib/payroll-cycle.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name);
  }
}

const T0 = "2026-09-14T10:00:00.000Z";
const W1 = { weekFrom: "2026-09-07", weekTo: "2026-09-12" };
const W2 = { weekFrom: "2026-09-14", weekTo: "2026-09-19" };
const W3 = { weekFrom: "2026-09-21", weekTo: "2026-09-26" };

function akordEmp(id = "dir-a") {
  return {
    ...weekEmployeeFromDir({
      id,
      name: "Akord",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
      compensationModel: "akord",
    }),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "", to: "", zaliczka: "" },
    },
  };
}

function hourlyEmp() {
  return {
    ...weekEmployeeFromDir({
      id: "dir-h",
      name: "Hourly",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
    }),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "08:00", to: "16:00", zaliczka: "" },
    },
  };
}

function seed(agreed = 1500) {
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "job-1", id: "pj1", now: T0 }).state;
  s = createAllocation(s, {
    pieceworkJobId: "pj1",
    directoryId: "dir-a",
    agreedAmount: agreed,
    id: "al1",
    now: T0,
  }).state;
  return s;
}

function addAdv(s, amount, week, id) {
  return createAdvance(s, {
    allocationId: s.allocations.find((a) => !a.deletedAt).id,
    amount,
    id,
    now: T0,
    paidAt: `${week.weekFrom}T12:00:00.000Z`,
    weekFrom: week.weekFrom,
    weekTo: week.weekTo,
  }).state;
}

// TEST 1 — no current-week advance → payout 0
{
  const s = seed(1500);
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W1, pieceworkState: s });
  assert("T1 weekly payout 0", row.displayNetPay === 0);
  assert("T1 remaining 1500", resolveAkordBalance("dir-a", s) === 1500);
}

// TEST 2 — advance 500 current week → payout 500
{
  const s = addAdv(seed(1500), 500, W1, "a1");
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W1, pieceworkState: s });
  assert("T2 weekly payout 500", row.displayNetPay === 500);
  assert("T2 remaining 1000", resolveAkordPayable("dir-a", s) === 1000);
}

// TEST 3 — previous-week advance only → current payout 0
{
  let s = addAdv(seed(1500), 500, W1, "prev");
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W2, pieceworkState: s });
  assert("T3 current payout 0", row.displayNetPay === 0);
  assert("T3 remaining still 1000", resolveAkordPayable("dir-a", s) === 1000);
}

// TEST 4 — prev 500 + current 200 → payout 200, remaining 800
{
  let s = addAdv(seed(1500), 500, W1, "p");
  s = addAdv(s, 200, W3, "c");
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W3, pieceworkState: s });
  assert("T4 current payout 200", row.displayNetPay === 200);
  assert("T4 remaining 800", resolveAkordPayable("dir-a", s) === 800);
}

// TEST 5 — multi allocation balance vs week advances
{
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "ja", id: "pja", now: T0 }).state;
  s = createPieceworkJob(s, { jobId: "jb", id: "pjb", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pja", directoryId: "dir-a", agreedAmount: 1000, id: "alA", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pjb", directoryId: "dir-a", agreedAmount: 700, id: "alB", now: T0 }).state;
  assert("T5 balance 1700", resolveAkordBalance("dir-a", s) === 1700);
  s = createAdvance(s, {
    allocationId: "alA",
    amount: 100,
    id: "wa",
    now: T0,
    paidAt: `${W1.weekFrom}T12:00:00.000Z`,
    weekFrom: W1.weekFrom,
    weekTo: W1.weekTo,
  }).state;
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W1, pieceworkState: s });
  assert("T5 weekly only current advances 100", row.displayNetPay === 100);
  assert("T5 balance after 1600", resolveAkordPayable("dir-a", s) === 1600);
}

// TEST 6 — archive freeze
{
  let s = addAdv(seed(1500), 500, W1, "arch");
  const emp = akordEmp();
  const snap = freezeAkordArchivePayables(buildWeekSnapshot(W1.weekFrom, W1.weekTo, [emp], []), [emp], {
    pieceworkState: s,
  });
  assert("T6 archive net 500", snap.employees[0].netPay === 500);
  s = addAdv(s, 300, W2, "later");
  assert("T6 later does not mutate archive", snap.employees[0].netPay === 500);
  assert("T6 live remaining 700", resolveAkordPayable("dir-a", s) === 700);
}

// TEST 7 — PDF netPay == weekly payout
{
  const s = addAdv(seed(1500), 500, W1, "pdf");
  const emp = akordEmp();
  const row = calcWeekEmployeeForPayroll(emp, { ...W1, pieceworkState: s });
  const calcRows = toPayrollCalcRows([{ emp, ...row, rateNum: 0 }], [], W1.weekFrom, W1.weekTo, [], s, []);
  assert("T7 PDF netPay 500 not remaining", calcRows[0].netPay === 500 && resolveAkordPayable("dir-a", s) === 1000);
}

// TEST 8 — biweekly counts current-week advances once
{
  const s = addAdv(seed(1500), 400, W1, "bi");
  const emp = akordEmp();
  const dir = [{ id: "dir-a", name: "Akord", biweeklyPayroll: true, biweeklyAnchorDate: "2026-09-12" }];
  const bw = calcBiweeklyRowDisplay(emp, dir, W1.weekFrom, W1.weekTo, [], undefined, { pieceworkState: s });
  assert("T8 biweekly once 400", bw != null && bw.displayNet === 400);
}

// TEST 9 — carry: remaining does not enter payout
{
  const s = addAdv(seed(1500), 500, W1, "carry");
  const emp = akordEmp();
  const row = calcWeekEmployeeForPayroll(emp, { ...W1, pieceworkState: s });
  const defer = canDeferPayroll(emp, row, [], false);
  assert("T9 defer 500", defer.ok && defer.frozenAmount === 500);
  const carry = buildPayrollCarryForwardRecord(500, W1.weekFrom, W1.weekTo);
  const next = { weekFrom: carry.targetWeekFrom, weekTo: carry.targetWeekTo };
  const saved = [
    {
      weekFrom: W1.weekFrom,
      weekTo: W1.weekTo,
      savedAt: T0,
      employees: [
        {
          directoryId: "dir-a",
          name: "Akord",
          netPay: 0,
          carryForwardOut: 500,
          carryForwardTargetFrom: next.weekFrom,
          carryForwardTargetTo: next.weekTo,
        },
      ],
    },
  ];
  const inRow = calcWeekEmployeeForPayroll(akordEmp(), { ...next, savedWeeks: saved, pieceworkState: s });
  assert("T9 carry-in 500 without remaining", inRow.displayNetPay === 500 && inRow.carryForwardIn === 500);
}

// TEST 10 — hourly regression
{
  const h = hourlyEmp();
  const row = calcWeekEmployeeForPayroll(h, { ...W1, pieceworkState: seed(9999) });
  assert("T10 hourly 320", row.displayNetPay === 320 && row.weekHours === 8);
}

// TEST 11 — job picker only in_progress (STATIC)
{
  const panel = readFileSync(resolve("src/app/AkordPieceworkPanel.tsx"), "utf8");
  assert("T11 filter in_progress only", panel.includes('j.status === "in_progress"') && !panel.includes('status === "completed"'));
  assert("T11 empty message PL", panel.includes("Brak robót w trakcie."));
}

// TEST 12 — Polish UI strings (STATIC)
{
  const panel = readFileSync(resolve("src/app/AkordPieceworkPanel.tsx"), "utf8");
  const required = [
    "Akord — roboty i zaliczki",
    "Uzgodniona kwota akordu nie jest automatycznie doliczana",
    "Do wypłaty w tym tygodniu z akordu wchodzą tylko zaliczki",
    "Pozostało z akordu",
    "Do wypłaty z akordu w tym tygodniu",
    "Dodaj robotę",
    "Zapisz zaliczkę",
    "Kwota zaliczki",
    "Notatka (opcjonalnie)",
    "Zaliczka z akordu — wpływa na wypłatę w tym tygodniu",
    "Zaliczka z poprzedniego tygodnia — nie wpływa na bieżącą wypłatę",
  ];
  for (const s of required) {
    assert(`T12 PL: ${s.slice(0, 40)}`, panel.includes(s));
  }
  assert("T12 no yellow main banner", panel.includes("border-sky-500") && !panel.includes("bg-amber-500/5 p-4"));
}

// TEST 13 — Cloud failure no false success (STATIC)
{
  const commit = readFileSync(resolve("src/lib/payroll-piecework-commit.ts"), "utf8");
  assert("T13 commit checks result.ok", commit.includes("result.ok") || commit.includes("!result.ok") || commit.includes("ok: false"));
  const panel = readFileSync(resolve("src/app/AkordPieceworkPanel.tsx"), "utf8");
  assert("T13 panel surfaces error", panel.includes("result.message") && panel.includes("{error &&"));
}

// TEST 14 — two advances same allocation: cap still enforced
{
  let s = seed(1500);
  s = addAdv(s, 1000, W1, "c1");
  const over = createAdvance(s, {
    allocationId: "al1",
    amount: 600,
    id: "c2",
    now: T0,
    paidAt: `${W1.weekFrom}T12:00:00.000Z`,
  });
  assert("T14 cap enforced", over.ok === false && over.error === "advance_exceeds_agreed");
  const ok2 = createAdvance(s, {
    allocationId: "al1",
    amount: 500,
    id: "c2ok",
    now: T0,
    paidAt: `${W1.weekFrom}T12:00:00.000Z`,
    weekFrom: W1.weekFrom,
    weekTo: W1.weekTo,
  });
  assert("T14 second within cap", ok2.ok === true);
  const row = calcWeekEmployeeForPayroll(akordEmp(), { ...W1, pieceworkState: ok2.state });
  assert("T14 weekly sum 1500", row.displayNetPay === 1500);
}

// settlement parity
{
  const s = addAdv(seed(1500), 500, W1, "set");
  const pay = resolveSettlementPayableAmount(akordEmp(), [], W1.weekFrom, W1.weekTo, [], { pieceworkState: s });
  assert("settlement = weekly advances", pay === 500);
}

console.log(`\nWeek-advance payout: ${pass} PASS / ${fail} FAIL`);
console.log("CLASSIFICATION: IN-MEMORY (T1–T10, T14, settlement) · STATIC (T11–T13)");
if (fail) process.exit(1);
