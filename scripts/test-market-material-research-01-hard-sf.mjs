/**
 * MARKET-MATERIAL-RESEARCH-01 — Hard Single-Flight lease (STAGE A).
 * Proves atomic claim semantics (mutex store ≈ PG row lock) under concurrency.
 * ZERO external HTTP · ZERO price mutation · ZERO live providers.
 *
 * npx vite-node scripts/test-market-material-research-01-hard-sf.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  isLeaseExpired,
  leaseRecordHasPriceMutation,
  releaseResearchJobLease,
  researchJobKvKey,
  validateResearchJobClaimRequest,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${a} !== ${b}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`UNEXPECTED_FETCH ${String(args[0])}`);
};

console.log("=== MARKET-MATERIAL-RESEARCH-01 HARD SF ===\n");

// ─── T7 malformed ───────────────────────────────────────────────────────────
{
  const a = validateResearchJobClaimRequest({});
  eq("T7 missing researchJobId", a.ok, false);
  const b = validateResearchJobClaimRequest({ researchJobId: "j1", claimantId: "c1", leaseMs: -1 });
  eq("T7 invalid leaseMs", b.ok, false);
  const c = validateResearchJobClaimRequest({
    researchJobId: "mat.grunt|manual|wroclaw",
    claimantId: "user-a",
    leaseMs: 30_000,
  });
  eq("T7 valid request", c.ok, true);
}

// ─── T1 no lease → A acquires ───────────────────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const r = await claimResearchJobLease(store, {
    researchJobId: "mat.grunt|manual|wroclaw",
    claimantId: "A",
    leaseMs: 60_000,
  });
  eq("T1 acquired", r.acquired, true);
  eq("T1 claimant A", r.job?.claimantId, "A");
  eq("T1 reason new", r.reason, "acquired_new");
  ok("T1 kv key prefix", researchJobKvKey("mat.grunt|manual|wroclaw").startsWith("kw-price-research-job:"));
}

// ─── T2 active A → B rejected ───────────────────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  await claimResearchJobLease(store, { researchJobId: "job-t2", claimantId: "A", leaseMs: 60_000 }, now);
  const b = await claimResearchJobLease(
    store,
    { researchJobId: "job-t2", claimantId: "B", leaseMs: 60_000 },
    now + 10,
  );
  eq("T2 B not acquired", b.acquired, false);
  eq("T2 still A", b.job?.claimantId, "A");
  eq("T2 reason held", b.reason, "held_by_other");
}

// ─── T3 same A cannot create duplicate active (idempotent hold) ─────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  const a1 = await claimResearchJobLease(
    store,
    { researchJobId: "job-t3", claimantId: "A", leaseMs: 60_000 },
    now,
  );
  const a2 = await claimResearchJobLease(
    store,
    { researchJobId: "job-t3", claimantId: "A", leaseMs: 60_000 },
    now + 5,
  );
  eq("T3 first acquired", a1.acquired, true);
  eq("T3 second acquired same claimant", a2.acquired, true);
  eq("T3 second reason same_claimant", a2.reason, "acquired_same_claimant");
  eq("T3 dump size 1", store.dump().size, 1);
}

// ─── T4 expired A → B acquires ──────────────────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const t0 = Date.now();
  await claimResearchJobLease(store, { researchJobId: "job-t4", claimantId: "A", leaseMs: 1_000 }, t0);
  const later = t0 + 2_000;
  ok("T4 lease expired wall", isLeaseExpired(store.dump().get(researchJobKvKey("job-t4")), later));
  const b = await claimResearchJobLease(
    store,
    { researchJobId: "job-t4", claimantId: "B", leaseMs: 60_000 },
    later,
  );
  eq("T4 B acquired", b.acquired, true);
  eq("T4 claimant B", b.job?.claimantId, "B");
  eq("T4 reclaim reason", b.reason, "acquired_reclaim_expired");
}

// ─── T5 10 concurrent claimants → exactly ONE acquired ──────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  const claimants = Array.from({ length: 10 }, (_, i) => `U${i}`);
  const results = await Promise.all(
    claimants.map((id) =>
      claimResearchJobLease(
        store,
        { researchJobId: "job-t5-concurrent", claimantId: id, leaseMs: 60_000 },
        now,
      ),
    ),
  );
  const winners = results.filter((r) => r.acquired && r.reason === "acquired_new");
  const acquiredAll = results.filter((r) => r.acquired);
  // First writer wins via tryInsert; same-claimant path only for that winner's duplicate — here all distinct
  eq("T5 exactly one acquired_new", winners.length, 1);
  eq("T5 exactly one acquired total", acquiredAll.length, 1);
  eq("T5 one key in store", store.dump().size, 1);
  const winnerId = winners[0].job.claimantId;
  ok(
    "T5 losers held_by_other",
    results.filter((r) => !r.acquired).every((r) => r.reason === "held_by_other" && r.job?.claimantId === winnerId),
  );
}

// Stress: 50 parallel
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      claimResearchJobLease(store, { researchJobId: "job-t5b", claimantId: `C${i}`, leaseMs: 30_000 }, now),
    ),
  );
  eq("T5b 50-parallel one winner", results.filter((r) => r.acquired).length, 1);
}

// ─── T6 different researchJobId independent ─────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  const a = await claimResearchJobLease(store, { researchJobId: "job-x", claimantId: "A", leaseMs: 60_000 }, now);
  const b = await claimResearchJobLease(store, { researchJobId: "job-y", claimantId: "B", leaseMs: 60_000 }, now);
  eq("T6 both acquired", a.acquired && b.acquired, true);
  eq("T6 two keys", store.dump().size, 2);
}

// ─── T8 no price mutation ───────────────────────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const r = await claimResearchJobLease(store, {
    researchJobId: "job-t8",
    claimantId: "A",
    leaseMs: 60_000,
  });
  eq("T8 no price fields", leaseRecordHasPriceMutation(r.job), false);
  ok(
    "T8 only lease fields",
    r.job &&
      Object.keys(r.job).sort().join(",") ===
        ["claimedAt", "claimantId", "leaseUntil", "researchJobId", "status"].sort().join(","),
  );
}

// ─── release + re-claim ─────────────────────────────────────────────────────
{
  const store = createMemoryAtomicResearchJobStore();
  const now = Date.now();
  await claimResearchJobLease(store, { researchJobId: "job-rel", claimantId: "A", leaseMs: 60_000 }, now);
  const rel = await releaseResearchJobLease(store, { researchJobId: "job-rel", claimantId: "A", nowMs: now });
  eq("release ok", rel.released, true);
  const b = await claimResearchJobLease(
    store,
    { researchJobId: "job-rel", claimantId: "B", leaseMs: 60_000 },
    now + 1,
  );
  eq("after release B acquires", b.acquired, true);
}

// ─── T9 no external HTTP ────────────────────────────────────────────────────
eq("T9 fetchCalls still 0", fetchCalls, 0);

// ─── T10 regressions unchanged (run only) ───────────────────────────────────
function runChild(label, script, expectPass) {
  const r = spawnSync("npx", ["vite-node", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
    timeout: 180_000,
    shell: true,
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  const allPass = out.match(/ALL PASS\s*\((\d+)\)/i) || out.match(/OK (\d+) assertions/i);
  const passLines = (out.match(/^ {0,2}PASS /gm) || []).length;
  const count = allPass ? Number(allPass[1]) : passLines;
  assert.equal(r.status, 0, `T10 ${label} exit\n${out.slice(-1500)}`);
  eq(`T10 ${label} PASS count`, count, expectPass);
}

console.log("\n--- T10 regressions ---");
runChild("SCREED", "scripts/test-economy-wet-cement-screed-v1.mjs", 18);
runChild("PAINTING", "scripts/test-painting-scope-harden-01.mjs", 50);
runChild("DECOMP", "scripts/test-technology-decomposition-01.mjs", 69);

globalThis.fetch = originalFetch;

console.log(`\nHARD SF ALL PASS (${passed})`);
console.log("EXTERNAL HTTP = ZERO");
console.log("PRICE MUTATION = ZERO");
