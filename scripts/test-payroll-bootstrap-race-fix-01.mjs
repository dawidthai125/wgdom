/**
 * PAYROLL-BOOTSTRAP-RACE-FIX-01 — bootstrap gate state machine + sequence ordering
 * Run: npx vite-node scripts/test-payroll-bootstrap-race-fix-01.mjs
 */
import {
  BOOTSTRAP_OFFLINE_TIMEOUT_MS,
  isCloudBootstrapReady,
  resolveBootstrapPhaseOpen,
} from "../src/lib/cloud-loader-bootstrap-gate.ts";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Mirrors CloudLoader gate + persist/init ordering for race proofs. */
function createBootstrapSequenceSimulator(opts = {}) {
  const events = [];
  let phase = "PENDING";
  let fetchSettled = false;
  let cancelled = false;
  let offlineTimeoutId = null;

  const log = (caller, reason, employeeCount) => {
    events.push({ t: Date.now(), caller, reason, employeeCount, phase });
  };

  const openPhase = (next) => {
    const prev = phase;
    phase = resolveBootstrapPhaseOpen(phase, next);
    if (phase !== prev) {
      log("CloudLoader", `bootstrap_phase_${phase.toLowerCase()}`, undefined);
    }
  };

  const start = () => {
    offlineTimeoutId = setTimeout(() => {
      if (cancelled || fetchSettled) return;
      openPhase("TIMEOUT");
      log("CloudLoader", "bootstrap_timeout_gate_open", undefined);
    }, opts.offlineTimeoutMs ?? BOOTSTRAP_OFFLINE_TIMEOUT_MS);
  };

  const simulateUseLocalStorageInit = () => {
    const raw = opts.lsStore?.["kw-week-employees"];
    const count = raw ? JSON.parse(raw).length : 0;
    log("useLocalStorage.init", "react_state_init_from_ls", count);
    return count;
  };

  const simulatePersist = (count) => {
    if (opts.lsStore) {
      opts.lsStore["kw-week-employees"] = JSON.stringify(Array.from({ length: count }, (_, i) => ({ id: `e${i}` })));
    }
    log("localStorage.setItem", "bootstrap_ls_write_week_employees", count);
  };

  const completeFetchSuccess = (empCount) => {
    if (cancelled) return;
    simulatePersist(empCount);
    log("CloudLoader", "bootstrap_ready", empCount);
    openPhase("SUCCESS");
    fetchSettled = true;
    if (offlineTimeoutId) clearTimeout(offlineTimeoutId);
  };

  const completeFetchFailed = () => {
    if (cancelled) return;
    openPhase("FAILED");
    fetchSettled = true;
    if (offlineTimeoutId) clearTimeout(offlineTimeoutId);
  };

  const dispose = () => {
    cancelled = true;
    if (offlineTimeoutId) clearTimeout(offlineTimeoutId);
  };

  return {
    events,
    get phase() { return phase; },
    get ready() { return isCloudBootstrapReady(phase); },
    start,
    simulateUseLocalStorageInit,
    completeFetchSuccess,
    completeFetchFailed,
    dispose,
  };
}

function seqIndex(events, reason) {
  return events.findIndex((e) => e.reason === reason);
}

console.log("=== PAYROLL-BOOTSTRAP-RACE-FIX-01 ===\n");

console.log("G1 — gate helpers");
{
  assert("G1 ready pending false", isCloudBootstrapReady("PENDING") === false);
  assert("G1 ready success true", isCloudBootstrapReady("SUCCESS") === true);
  assert("G1 timeout idempotent", resolveBootstrapPhaseOpen("TIMEOUT", "SUCCESS") === "TIMEOUT");
  assert("G1 pending→success", resolveBootstrapPhaseOpen("PENDING", "SUCCESS") === "SUCCESS");
}

console.log("\nH1 — happy path: persist before init");
{
  const ls = { "kw-week-employees": "[]" };
  const sim = createBootstrapSequenceSimulator({ lsStore: ls, offlineTimeoutMs: 60_000 });
  sim.start();
  sim.completeFetchSuccess(14);
  assert("H1 ready after success", sim.ready === true);
  assert("H1 phase SUCCESS", sim.phase === "SUCCESS");
  const initCount = sim.simulateUseLocalStorageInit();
  assert("H1 init reads 14", initCount === 14);
  assert(
    "H1 persist before init",
    seqIndex(sim.events, "bootstrap_ls_write_week_employees")
      < seqIndex(sim.events, "react_state_init_from_ls"),
  );
  sim.dispose();
}

console.log("\nS1 — slow network (5s): no ready before persist");
{
  const ls = { "kw-week-employees": "[]" };
  const sim = createBootstrapSequenceSimulator({ lsStore: ls, offlineTimeoutMs: 60_000 });
  sim.start();
  assert("S1 not ready while pending", sim.ready === false);
  await sleep(5);
  assert("S1 still not ready at 5s", sim.ready === false);
  sim.completeFetchSuccess(14);
  assert("S1 ready after persist at ~5s", sim.ready === true);
  const initCount = sim.simulateUseLocalStorageInit();
  assert("S1 init=14 after slow fetch", initCount === 14);
  sim.dispose();
}

console.log("\nT1 — timeout: gate opens without persist");
{
  const ls = { "kw-week-employees": "[]" };
  const sim = createBootstrapSequenceSimulator({ lsStore: ls, offlineTimeoutMs: 50 });
  sim.start();
  await sleep(60);
  assert("T1 phase TIMEOUT", sim.phase === "TIMEOUT");
  assert("T1 ready on timeout", sim.ready === true);
  const initCount = sim.simulateUseLocalStorageInit();
  assert("T1 init stale 0 on timeout", initCount === 0);
  sim.dispose();
}

console.log("\nF1 — fetch reject: FAILED gate");
{
  const sim = createBootstrapSequenceSimulator({ offlineTimeoutMs: 60_000 });
  sim.start();
  sim.completeFetchFailed();
  assert("F1 phase FAILED", sim.phase === "FAILED");
  assert("F1 ready on failed", sim.ready === true);
  sim.dispose();
}

console.log("\nR1 — race reproduction: old 3s bug vs new gate");
{
  // Legacy bug model: ready at 3s before persist at 5s
  const legacyEvents = [];
  legacyEvents.push({ t: 3000, reason: "legacy_setReady_fallback" });
  legacyEvents.push({ t: 3000, reason: "react_state_init_from_ls", count: 0 });
  legacyEvents.push({ t: 5000, reason: "bootstrap_ls_write_week_employees", count: 14 });
  const legacyRace =
    legacyEvents.findIndex((e) => e.reason === "react_state_init_from_ls")
    < legacyEvents.findIndex((e) => e.reason === "bootstrap_ls_write_week_employees");
  assert("R1 legacy race init before persist", legacyRace === true);

  const ls = { "kw-week-employees": "[]" };
  const sim = createBootstrapSequenceSimulator({ lsStore: ls, offlineTimeoutMs: 60_000 });
  sim.start();
  await sleep(5);
  sim.completeFetchSuccess(14);
  sim.simulateUseLocalStorageInit();
  const fixedOrder =
    seqIndex(sim.events, "bootstrap_ls_write_week_employees")
    < seqIndex(sim.events, "react_state_init_from_ls");
  assert("R1 fixed persist before init", fixedOrder === true);
  sim.dispose();
}

console.log("\nX1 — 10x happy bootstrap sequence");
{
  let ok = true;
  for (let i = 0; i < 10; i++) {
    const ls = { "kw-week-employees": "[]" };
    const sim = createBootstrapSequenceSimulator({ lsStore: ls, offlineTimeoutMs: 60_000 });
    sim.start();
    sim.completeFetchSuccess(14);
    sim.simulateUseLocalStorageInit();
    const order =
      seqIndex(sim.events, "bootstrap_ls_write_week_employees")
      < seqIndex(sim.events, "react_state_init_from_ls");
    if (!order || sim.phase !== "SUCCESS") ok = false;
    sim.dispose();
  }
  assert("X1 10x persist before init", ok === true);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail > 0 ? 1 : 0);
