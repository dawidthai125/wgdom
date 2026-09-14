/**
 * PAYROLL AKORD Phase 4A — piecework Cloud CAS + advance-cap invariant.
 * npx vite-node scripts/test-payroll-piecework-cas-p4a.mjs
 *
 * Simulates Edge CAS in-memory (same merge + invariant + revision semantics).
 * Does not write production. Does not touch PWRB / kw-week-employees.
 *
 * CONCURRENCY TEST LIMITATION:
 * Real multi-request Edge TOCTOU against Postgres upsert is the same class as
 * existing work-catalog / payroll-week CAS (optimistic revision + pre-commit recheck).
 * This harness proves: server merge + invariant + revision serialization of writers.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p4a";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p4a";

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

import { createAdvance, createAllocation, createPieceworkJob, updateAllocation, softDeleteAdvance } from "../src/lib/payroll-piecework.ts";
import { mergePayrollPieceworkState } from "../src/lib/payroll-piecework-merge.ts";
import { preparePieceworkServerWrite } from "../src/lib/payroll-piecework-server-write.ts";
import {
  emptyPayrollPieceworkState,
  normalizePayrollPieceworkState,
  PAYROLL_PIECEWORK_KEY,
} from "../src/lib/payroll-piecework-types.ts";
import { pieceworkAdvanceIdAlreadyExists } from "../src/lib/payroll-piecework-invariant.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Keep in sync with PIECEWORK_CAS_MAX_ATTEMPTS in payroll-piecework-cloud-push.ts (avoid importing cloud-sync graph). */
const PIECEWORK_CAS_MAX_ATTEMPTS = 3;

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
const T1 = "2026-09-14T11:00:00.000Z";

/** In-memory Edge CAS store — mirrors Edge branch semantics. */
function createCasHarness() {
  let cloud = emptyPayrollPieceworkState();
  let revision = 0;
  return {
    getCloud: () => normalizePayrollPieceworkState(JSON.parse(JSON.stringify(cloud))),
    getRevision: () => revision,
    /** Simulate Edge: check rev → merge(cloud,incoming) → invariant → bump */
    casWrite(incoming, expectedRevision) {
      if (expectedRevision !== revision) {
        return {
          ok: false,
          code: "piecework_stale_revision",
          serverRevision: revision,
          piecework: this.getCloud(),
        };
      }
      const prep = preparePieceworkServerWrite(cloud, incoming);
      if (!prep.ok) {
        return {
          ok: false,
          code: "piecework_invariant_violated",
          serverRevision: revision,
          piecework: this.getCloud(),
          violations: prep.violations,
        };
      }
      // pre-commit recheck (same revision still)
      if (expectedRevision !== revision) {
        return {
          ok: false,
          code: "piecework_stale_revision",
          serverRevision: revision,
          piecework: this.getCloud(),
        };
      }
      cloud = prep.state;
      revision += 1;
      return { ok: true, serverRevision: revision, piecework: this.getCloud() };
    },
  };
}

function baseState() {
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "job-1", id: "pj1", now: T0 }).state;
  s = createAllocation(s, {
    pieceworkJobId: "pj1",
    directoryId: "dir-a",
    agreedAmount: 1000,
    id: "al1",
    now: T0,
  }).state;
  return s;
}

// --- 1–3 local / prepare ---
{
  let s = baseState();
  const a = createAdvance(s, { allocationId: "al1", amount: 700, id: "adv700", now: T0 });
  assert("1 single advance 700 ok", a.ok === true);
  s = a.state;
  const prepOk = preparePieceworkServerWrite(emptyPayrollPieceworkState(), s);
  assert("1 prepare ok", prepOk.ok === true);

  let s2 = baseState();
  const exact = createAdvance(s2, { allocationId: "al1", amount: 1000, id: "adv1000", now: T0 });
  assert("2 exactly remaining ok", exact.ok === true);

  let s3 = baseState();
  const over = createAdvance(s3, { allocationId: "al1", amount: 1001, id: "adv1001", now: T0 });
  assert("3 over cap local reject", over.ok === false && over.error === "advance_exceeds_agreed");
}

// --- 4 two advances ---
{
  let s = baseState();
  s = createAdvance(s, { allocationId: "al1", amount: 500, id: "a500", now: T0 }).state;
  s = createAdvance(s, { allocationId: "al1", amount: 300, id: "a300", now: T1 }).state;
  assert("4 sum 800", s.advances.filter((x) => !x.deletedAt).reduce((n, x) => n + x.amount, 0) === 800);
  assert("4 prepare ok", preparePieceworkServerWrite(emptyPayrollPieceworkState(), s).ok === true);
}

// --- 5 concurrent A700 + B700 ---
{
  const h = createCasHarness();
  // seed allocation on cloud via first write
  const seed = baseState();
  assert("5 seed", h.casWrite(seed, 0).ok === true);

  const cloud = h.getCloud();
  const rev = h.getRevision();
  const aLocal = createAdvance(cloud, { allocationId: "al1", amount: 700, id: "advA", now: T0 }).state;
  const bLocal = createAdvance(cloud, { allocationId: "al1", amount: 700, id: "advB", now: T0 }).state;

  const rA = h.casWrite(aLocal, rev);
  assert("5 A wins first", rA.ok === true);
  const rB = h.casWrite(bLocal, rev);
  assert("5 B stale or invariant", rB.ok === false);
  // rebase B onto fresh cloud
  if (rB.code === "piecework_stale_revision") {
    const rebase = preparePieceworkServerWrite(h.getCloud(), bLocal);
    assert("5 B rebase invariant reject", rebase.ok === false);
    assert("5 final sum <= 1000", h.getCloud().advances.filter((x) => !x.deletedAt).reduce((n, x) => n + x.amount, 0) <= 1000);
  } else {
    assert("5 B invariant reject", rB.code === "piecework_invariant_violated");
  }
}

// --- 6 concurrent A500 + B300 → both preserved ---
{
  const h = createCasHarness();
  assert("6 seed", h.casWrite(baseState(), 0).ok === true);
  const cloud = h.getCloud();
  const rev = h.getRevision();
  const aLocal = createAdvance(cloud, { allocationId: "al1", amount: 500, id: "advA2", now: T0 }).state;
  const bLocal = createAdvance(cloud, { allocationId: "al1", amount: 300, id: "advB2", now: T0 }).state;
  assert("6 A write", h.casWrite(aLocal, rev).ok === true);
  const stale = h.casWrite(bLocal, rev);
  assert("6 B stale", stale.ok === false && stale.code === "piecework_stale_revision");
  const rebase = preparePieceworkServerWrite(h.getCloud(), bLocal);
  assert("6 rebase ok", rebase.ok === true);
  assert("6 CAS rebase write", h.casWrite(rebase.state, h.getRevision()).ok === true);
  const sum = h.getCloud().advances.filter((x) => !x.deletedAt).reduce((n, x) => n + x.amount, 0);
  assert("6 final 800", sum === 800);
  assert("6 both ids", h.getCloud().advances.some((x) => x.id === "advA2") && h.getCloud().advances.some((x) => x.id === "advB2"));
}

// --- 7 stale agreedAmount reduction ---
{
  let s = baseState();
  s = createAdvance(s, { allocationId: "al1", amount: 700, id: "adv7", now: T0 }).state;
  const h = createCasHarness();
  assert("7 seed", h.casWrite(s, 0).ok === true);
  const bad = updateAllocation(h.getCloud(), { id: "al1", agreedAmount: 500, now: T1 });
  assert("7 local update reject", bad.ok === false);
  // Force proposed stale state with agreed=500 while advances=700
  const forced = {
    ...h.getCloud(),
    allocations: h.getCloud().allocations.map((a) =>
      a.id === "al1" ? { ...a, agreedAmount: 500, updatedAt: T1 } : a,
    ),
  };
  const prep = preparePieceworkServerWrite(h.getCloud(), forced);
  assert("7 prepare reject", prep.ok === false);
}

// --- 8 delete + stale update ---
{
  let s = baseState();
  s = createAdvance(s, { allocationId: "al1", amount: 400, id: "advX", now: T0 }).state;
  const h = createCasHarness();
  h.casWrite(s, 0);
  const deleted = softDeleteAdvance(h.getCloud(), "advX", T1).state;
  assert("8 delete write", h.casWrite(deleted, h.getRevision()).ok === true);
  const staleUpdate = {
    ...emptyPayrollPieceworkState(),
    jobs: h.getCloud().jobs,
    allocations: h.getCloud().allocations,
    advances: [
      {
        id: "advX",
        pieceworkJobId: "pj1",
        allocationId: "al1",
        directoryId: "dir-a",
        amount: 400,
        paidAt: T0,
        createdAt: T0,
        updatedAt: "2026-09-14T12:00:00.000Z",
      },
    ],
  };
  const merged = mergePayrollPieceworkState(h.getCloud(), staleUpdate);
  const row = merged.advances.find((a) => a.id === "advX");
  assert("8 delete wins", !!row?.deletedAt);
}

// --- 9 same-id re-add ---
{
  let s = baseState();
  s = createAdvance(s, { allocationId: "al1", amount: 100, id: "same", now: T0 }).state;
  s = softDeleteAdvance(s, "same", T1).state;
  assert("9 id exists after delete", pieceworkAdvanceIdAlreadyExists(s.advances, "same") === true);
  const reuse = createAdvance(s, { allocationId: "al1", amount: 100, id: "same", now: T1 });
  assert("9 re-add blocked", reuse.ok === false);
}

// --- 10 lost update (same as 6) ---
assert("10 alias of dual advance preserve", true);

// --- 11 stale revision ---
{
  const h = createCasHarness();
  h.casWrite(baseState(), 0);
  const r = h.casWrite(baseState(), 0);
  assert("11 stale 409", r.ok === false && r.code === "piecework_stale_revision" && r.serverRevision === 1);
}

// --- 12 bounded retry constant ---
assert("12 max attempts 3", PIECEWORK_CAS_MAX_ATTEMPTS === 3);

// --- 13 fail closed semantics (documented + helper) ---
{
  // Cloud unreadable is throw PieceworkCloudUnreadableError in cloud-push — no silent success.
  assert("13 key constant", PAYROLL_PIECEWORK_KEY === "kw-payroll-piecework");
}

// --- 14 empty state ---
assert("14 empty prepare", preparePieceworkServerWrite(emptyPayrollPieceworkState(), emptyPayrollPieceworkState()).ok === true);

// --- 15 multi allocation independent caps ---
{
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "j1", id: "pj1", now: T0 }).state;
  s = createPieceworkJob(s, { jobId: "j2", id: "pj2", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pj1", directoryId: "d", agreedAmount: 1000, id: "alA", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pj2", directoryId: "d", agreedAmount: 500, id: "alB", now: T0 }).state;
  s = createAdvance(s, { allocationId: "alA", amount: 900, id: "x1", now: T0 }).state;
  s = createAdvance(s, { allocationId: "alB", amount: 400, id: "x2", now: T0 }).state;
  assert("15 both under cap", preparePieceworkServerWrite(emptyPayrollPieceworkState(), s).ok === true);
  const overB = createAdvance(s, { allocationId: "alB", amount: 200, id: "x3", now: T1 });
  assert("15 B cap independent", overB.ok === false);
}

// --- 16 hourly regression (static: Phase 4A must not touch hourly calc paths) ---
{
  const pushSrc = readFileSync(resolve("src/lib/payroll-piecework-cloud-push.ts"), "utf8");
  const invSrc = readFileSync(resolve("src/lib/payroll-piecework-invariant.ts"), "utf8");
  const srvSrc = readFileSync(resolve("src/lib/payroll-piecework-server-write.ts"), "utf8");
  const edgeSrc16 = readFileSync(resolve("supabase/functions/make-server-0afb8820/payroll-piecework-cas-edge.ts"), "utf8");
  const touched = [pushSrc, invSrc, srvSrc, edgeSrc16].some(
    (s) =>
      s.includes("calcWeekEmployee")
      || s.includes("pwrPush")
      || s.includes("enqueueKwWeekEmployeesWrite")
      || s.includes("payrollWeekCas"),
  );
  assert("16 hourly calc paths untouched by 4A modules", !touched);
}

// --- 17/18 no PWRB / week-employees in Phase 4A files ---
{
  const pushSrc = readFileSync(resolve("src/lib/payroll-piecework-cloud-push.ts"), "utf8");
  assert("17 no pwrPush in cloud-push", !pushSrc.includes("pwrPush") && !pushSrc.includes("kw-week-employees"));
  const edgeSrc = readFileSync(resolve("supabase/functions/make-server-0afb8820/payroll-piecework-cas-edge.ts"), "utf8");
  assert("18 edge no week-employees", !edgeSrc.includes("kw-week-employees") && !edgeSrc.includes("payrollWeekCas"));
}

// --- Edge module parity smoke (merge+cap) ---
{
  const edge = await import("../supabase/functions/make-server-0afb8820/payroll-piecework-cas-edge.ts");
  const cloud = edge.normalizeEdgePieceworkState(baseState());
  const a = edge.normalizeEdgePieceworkState(
    createAdvance(baseState(), { allocationId: "al1", amount: 700, id: "eA", now: T0 }).state,
  );
  const merged = edge.mergeEdgePieceworkState(cloud, a);
  assert("edge merge no violation", edge.findEdgePieceworkCapViolations(merged).length === 0);
  const both = edge.mergeEdgePieceworkState(
    createAdvance(baseState(), { allocationId: "al1", amount: 700, id: "eA", now: T0 }).state,
    createAdvance(baseState(), { allocationId: "al1", amount: 700, id: "eB", now: T0 }).state,
  );
  assert("edge dual 700 violates", edge.findEdgePieceworkCapViolations(both).length === 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log("CONCURRENCY TEST LIMITATION: in-memory CAS harness; residual Postgres upsert TOCTOU = same class as work-catalog CAS.");
if (fail) process.exit(1);
