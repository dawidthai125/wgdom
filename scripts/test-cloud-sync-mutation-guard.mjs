/**
 * CloudSyncMutationGuard — T12-guard (tokeny) + T13 (recovery).
 * npx vite-node scripts/test-cloud-sync-mutation-guard.mjs
 */
import { cloudSyncMutationGuard } from "../src/lib/cloud-sync-mutation-guard.ts";

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

console.log("=== CLOUD SYNC MUTATION GUARD ===\n");

// T12-guard — równoległe tokeny (#012)
console.log("T12-guard parallel tokens");
{
  reset();
  const t1 = begin("kw-jobs", { suppressMs: 0 });
  const t2 = begin("kw-jobs", { suppressMs: 0 });
  assert("T12-guard blocked with two tokens", isBlocked());
  end(t1);
  assert("T12-guard still blocked after end t1", isBlocked());
  end(t2);
  assert("T12-guard unblocked after end t2", !isBlocked());
}

// T12-guard — end idempotent (#012 R12.2)
console.log("\nT12-guard end idempotent");
{
  reset();
  const t1 = begin("kw-jobs", { suppressMs: 0 });
  end(t1);
  end(t1);
  assert("T12-guard idempotent end", !isBlocked());
}

// T12-guard — unknown token no-op (#012 R12.1)
console.log("\nT12-guard unknown token");
{
  reset();
  const t1 = begin("kw-jobs", { suppressMs: 0 });
  end("csmg-unknown" );
  assert("T12-guard unknown end no-op — still blocked", isBlocked());
  end(t1);
  assert("T12-guard valid end clears", !isBlocked());
}

// T13 — recovery po przerwanym cyklu (#013)
console.log("\nT13 recovery after interrupted cycle");
{
  reset();
  const tokenA = begin("kw-jobs");
  const tokenB = begin("kw-week-employees");
  end(tokenA);
  assert("T13 blocked with leaked tokenB", isBlocked());
  reset();
  assert("T13 isBlocked false after reset", !isBlocked());
  const tNew = begin("kw-jobs", { suppressMs: 0 });
  end(tNew);
  assert("T13 new begin/end cycle works", !isBlocked());
}

// T13 — end after reset on stale token no underflow
console.log("\nT13 end stale token after reset");
{
  reset();
  const stale = begin("kw-jobs", { suppressMs: 0 });
  reset();
  end(stale);
  assert("T13 stale end after reset — not blocked", !isBlocked());
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
