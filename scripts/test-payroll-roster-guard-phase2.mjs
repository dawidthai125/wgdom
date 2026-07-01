/**
 * PAYROLL-CLOUD-RECOVERY B3 — Guard Phase 2 (kw-week-employees).
 * npx vite-node scripts/test-payroll-roster-guard-phase2.mjs
 */
import {
  cloudSyncMutationGuard,
  KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS,
} from "../src/lib/cloud-sync-mutation-guard.ts";

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

const { begin, end, isBlocked, reset } = cloudSyncMutationGuard;

console.log("=== PAYROLL ROSTER GUARD PHASE 2 (B3) ===\n");

// B3-T1
console.log("B3-T1 begin blocks");
{
  reset();
  const t = begin("kw-week-employees", { suppressMs: 0 });
  assert("B3-T1 isBlocked after begin", isBlocked());
  end(t);
}

// B3-T2
console.log("\nB3-T2 end unblocks (suppressMs 0)");
{
  reset();
  const t = begin("kw-week-employees", { suppressMs: 0 });
  end(t);
  assert("B3-T2 isBlocked false after end", !isBlocked());
}

// B3-T3 — parallel roster tokens (#012)
console.log("\nB3-T3 parallel roster tokens");
{
  reset();
  const t1 = begin("kw-week-employees", { suppressMs: 0 });
  const t2 = begin("kw-week-employees", { suppressMs: 0 });
  assert("B3-T3 blocked with two tokens", isBlocked());
  end(t1);
  assert("B3-T3 still blocked after end t1", isBlocked());
  end(t2);
  assert("B3-T3 unblocked after end t2", !isBlocked());
}

// B3-T4 — unknown token no-op (#012 R12.1)
console.log("\nB3-T4 unknown token");
{
  reset();
  const t1 = begin("kw-week-employees", { suppressMs: 0 });
  end("csmg-unknown");
  assert("B3-T4 unknown end no-op — still blocked", isBlocked());
  end(t1);
  assert("B3-T4 valid end clears", !isBlocked());
}

// B3-T5 — reset recovery (#013)
console.log("\nB3-T5 reset recovery");
{
  reset();
  const tokenA = begin("kw-week-employees", { suppressMs: 0 });
  end(tokenA);
  const leaked = begin("kw-week-employees", { suppressMs: 0 });
  void leaked;
  assert("B3-T5 blocked with leaked token", isBlocked());
  reset();
  assert("B3-T5 isBlocked false after reset", !isBlocked());
}

// B3-T6 — independent scopes kw-week-employees vs kw-jobs (#012 R12.5)
console.log("\nB3-T6 independent scopes");
{
  reset();
  const jobsToken = begin("kw-jobs", { suppressMs: 0 });
  assert("B3-T6 kw-week-employees scope not blocked alone", !isBlocked("kw-week-employees"));
  assert("B3-T6 kw-jobs scope blocked", isBlocked("kw-jobs"));
  const rosterToken = begin("kw-week-employees", { suppressMs: 0 });
  assert("B3-T6 kw-week-employees blocked after begin", isBlocked("kw-week-employees"));
  end(jobsToken);
  assert("B3-T6 roster still blocked after end jobs", isBlocked("kw-week-employees"));
  end(rosterToken);
  assert("B3-T6 both scopes clear", !isBlocked());
}

// B3-T7 — default suppress ms constant
console.log("\nB3-T7 default suppress constant");
{
  assert(
    "B3-T7 KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS === 6000",
    KW_WEEK_EMPLOYEES_DEFAULT_SUPPRESS_MS === 6000,
  );
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
