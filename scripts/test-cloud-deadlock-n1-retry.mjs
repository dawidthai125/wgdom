/**
 * CLOUD-P0-DEADLOCK-N1 — unit tests + deadlock simulation.
 *
 * npx vite-node scripts/test-cloud-deadlock-n1-retry.mjs
 */
import {
  isTransientBatchSetError,
  BATCH_SET_TRANSIENT_RETRY_DELAYS_MS,
  BATCH_SET_MAX_ATTEMPTS,
  delayBeforeBatchSetAttempt,
} from "../src/lib/cloud-batch-set-retry.ts";
import {
  getSyncMetrics,
  resetSyncMetrics,
  recordBatchSet,
  recordBatchSetRetry,
} from "../src/lib/cloud-sync-throttle.ts";
import { isSupabaseConfigured } from "../src/config/supabase.ts";
import { pushKeysToCloud } from "../src/lib/cloud-sync.ts";

let passed = 0;
let failed = 0;

function assertEq(actual, expected, label) {
  if (actual === expected) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}`);
  }
}

console.log("=== CLOUD-P0-DEADLOCK-N1 RETRY TESTS ===\n");

// ─── T1: isTransientBatchSetError ───────────────────────────────────────────
assertEq(
  isTransientBatchSetError(500, '{"ok":false,"error":"deadlock detected"}'),
  true,
  "T1a 500 + deadlock detected → true",
);
assertEq(
  isTransientBatchSetError(500, "ERROR: 40P01 deadlock_detected"),
  true,
  "T1b 500 + 40P01 → true",
);
assertEq(
  isTransientBatchSetError(503, "Deadlock Detected in transaction"),
  true,
  "T1c 503 + Deadlock Detected (case) → true",
);
assertEq(
  isTransientBatchSetError(500, "statement timeout"),
  false,
  "T1d 500 + statement timeout → false",
);
assertEq(
  isTransientBatchSetError(429, "deadlock detected"),
  false,
  "T1e 429 + deadlock → false",
);
assertEq(
  isTransientBatchSetError(400, "deadlock detected"),
  false,
  "T1f 400 + deadlock → false",
);
assertEq(
  isTransientBatchSetError(200, "deadlock detected"),
  false,
  "T1g 200 → false",
);

// ─── T2: schedule ───────────────────────────────────────────────────────────
assertEq(BATCH_SET_MAX_ATTEMPTS, 4, "T2a MAX_ATTEMPTS = 4");
assertEq(BATCH_SET_TRANSIENT_RETRY_DELAYS_MS.length, 3, "T2b 3 delays");
assertEq(BATCH_SET_TRANSIENT_RETRY_DELAYS_MS[0], 250, "T2c delay1 = 250");
assertEq(BATCH_SET_TRANSIENT_RETRY_DELAYS_MS[1], 500, "T2d delay2 = 500");
assertEq(BATCH_SET_TRANSIENT_RETRY_DELAYS_MS[2], 1000, "T2e delay3 = 1000");
assertEq(delayBeforeBatchSetAttempt(1), 0, "T2f attempt1 delay = 0");
assertEq(delayBeforeBatchSetAttempt(2), 250, "T2g attempt2 delay = 250");
assertEq(delayBeforeBatchSetAttempt(3), 500, "T2h attempt3 delay = 500");
assertEq(delayBeforeBatchSetAttempt(4), 1000, "T2i attempt4 delay = 1000");

// ─── T3: metrics ────────────────────────────────────────────────────────────
resetSyncMetrics();
recordBatchSet();
recordBatchSetRetry();
recordBatchSetRetry();
const m = getSyncMetrics();
assertEq(m.batchSet, 1, "T3a batchSet = 1");
assertEq(m.batchSetRetries, 2, "T3b batchSetRetries = 2");

// ─── T4–T7: deadlock simulation via mocked fetch + pushKeysToCloud ──────────
const origFetch = globalThis.fetch;

function mockResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

async function withMockedFetch(sequence, fn) {
  let i = 0;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init?.body, attemptIndex: i });
    const next = sequence[Math.min(i, sequence.length - 1)];
    i += 1;
    return mockResponse(next.status, next.body);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = origFetch;
  }
}

const deadlockBody = {
  ok: false,
  error: "deadlock detected",
  requestId: "edge-dl-test",
};

if (!isSupabaseConfigured()) {
  console.warn("SKIP  T4–T7 pushKeysToCloud simulation — brak VITE_SUPABASE_*");
} else {
  // T4: deadlock then 200 → success after 1 retry
  resetSyncMetrics();
  const t4Start = Date.now();
  await withMockedFetch(
    [
      { status: 500, body: deadlockBody },
      { status: 200, body: { ok: true } },
    ],
    async (calls) => {
      await pushKeysToCloud(["kw-contacts"], [[]], { skipPayrollGuard: true });
      assertEq(calls.length, 2, "T4a HTTP calls = 2 (deadlock→OK)");
      const metrics = getSyncMetrics();
      assertEq(metrics.batchSet, 2, "T4b batchSet = 2");
      assertEq(metrics.batchSetRetries, 1, "T4c batchSetRetries = 1");
      const elapsed = Date.now() - t4Start;
      assertTrue(elapsed >= 240, `T4d waited ~250ms before retry (elapsed=${elapsed})`);
    },
  );

  // T5: 4× deadlock → throw after 4 HTTP, delays 250+500+1000
  resetSyncMetrics();
  const t5Start = Date.now();
  let threw5 = false;
  await withMockedFetch(
    [
      { status: 500, body: deadlockBody },
      { status: 500, body: deadlockBody },
      { status: 500, body: deadlockBody },
      { status: 500, body: deadlockBody },
    ],
    async (calls) => {
      try {
        await pushKeysToCloud(["kw-contacts"], [[]], { skipPayrollGuard: true });
      } catch (e) {
        threw5 = true;
        assertTrue(
          String(e.message).includes("batch-set 500"),
          `T5a throw message contains batch-set 500 (${e.message})`,
        );
        assertTrue(
          String(e.message).toLowerCase().includes("deadlock"),
          "T5b throw message contains deadlock",
        );
      }
      assertTrue(threw5, "T5c threw after exhaustion");
      assertEq(calls.length, 4, "T5d HTTP calls = 4");
      const metrics = getSyncMetrics();
      assertEq(metrics.batchSet, 4, "T5e batchSet = 4");
      assertEq(metrics.batchSetRetries, 3, "T5f batchSetRetries = 3");
      const elapsed = Date.now() - t5Start;
      assertTrue(elapsed >= 1700, `T5g waited ≥1750ms total (elapsed=${elapsed})`);
    },
  );

  // T6: non-transient 500 → immediate throw, 1 HTTP
  resetSyncMetrics();
  let threw6 = false;
  await withMockedFetch(
    [{ status: 500, body: { ok: false, error: "statement timeout", requestId: "x" } }],
    async (calls) => {
      try {
        await pushKeysToCloud(["kw-contacts"], [[]], { skipPayrollGuard: true });
      } catch (e) {
        threw6 = true;
        assertTrue(String(e.message).includes("batch-set 500"), "T6a throw batch-set 500");
      }
      assertTrue(threw6, "T6b threw immediately");
      assertEq(calls.length, 1, "T6c HTTP calls = 1 (no retry)");
      assertEq(getSyncMetrics().batchSetRetries, 0, "T6d batchSetRetries = 0");
    },
  );

  // T7: success first try — no retry
  resetSyncMetrics();
  await withMockedFetch([{ status: 200, body: { ok: true } }], async (calls) => {
    await pushKeysToCloud(["kw-contacts"], [[]], { skipPayrollGuard: true });
    assertEq(calls.length, 1, "T7a HTTP calls = 1");
    assertEq(getSyncMetrics().batchSetRetries, 0, "T7b no retries");
  });
}

console.log(`\n=== CLOUD-P0-DEADLOCK-N1: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
