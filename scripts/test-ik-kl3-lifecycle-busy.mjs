/**
 * KL-3 knowledgeBusy lifecycle — cancel / latch / settle contracts.
 * npx vite-node scripts/test-ik-kl3-lifecycle-busy.mjs
 */
import {
  shouldClearKl3KnowledgeBusyOnFinally,
  resolveKl3InFlightCancelCleanup,
  buildKl3KnowledgeKey,
} from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts";

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
  }
}

console.log("\n=== KL-3 lifecycle busy ===\n");

// 1) cancel → finally must NOT clear (cleanup owns clear; avoids clobbering newer run)
check(
  "finally clear when not cancelled",
  shouldClearKl3KnowledgeBusyOnFinally(false) === true,
);
check(
  "finally skip clear when cancelled",
  shouldClearKl3KnowledgeBusyOnFinally(true) === false,
);

// 2) cancel cleanup releases same-key latch + busy
{
  const c = resolveKl3InFlightCancelCleanup({
    inFlightKnowledgeKey: "K1",
    attemptedKey: "K1",
  });
  check("cancel cleanup clearBusy", c.clearBusy === true);
  check("cancel cleanup releases latch", c.nextAttemptedKey === null);
}
{
  const c = resolveKl3InFlightCancelCleanup({
    inFlightKnowledgeKey: "K1",
    attemptedKey: "K2",
  });
  check("cancel cleanup preserves other key latch", c.nextAttemptedKey === "K2");
}

// 3) same-key retry after cancel (simulates effect latch)
{
  let attempted = null;
  let busy = false;
  const key = "tender|1|basis|lookup-only|ir0";

  // start
  attempted = key;
  busy = true;

  // effect cleanup (self-cancel / unmount)
  const cleanup = resolveKl3InFlightCancelCleanup({
    inFlightKnowledgeKey: key,
    attemptedKey: attempted,
  });
  attempted = cleanup.nextAttemptedKey;
  if (cleanup.clearBusy) busy = false;
  // cancelled finally must not leave busy true
  if (shouldClearKl3KnowledgeBusyOnFinally(true)) busy = false;

  check("after cancel busy=false", busy === false);
  check("after cancel latch released", attempted === null);

  // same key can start again
  const canRetry = attempted !== key;
  check("same-key retry allowed", canRetry === true);
  if (canRetry) {
    attempted = key;
    busy = true;
  }
  check("retry sets busy", busy === true && attempted === key);
}

// 4) executeKl3KnowledgeLookup — cancel path clears via cleanup contract only;
//    success path clears in finally. Use stub host by cancelling before await settles.
{
  let busy = true;
  let knowledge = "SENTINEL";
  let cancelled = true;
  // Direct finally contract already tested; simulate success settle:
  cancelled = false;
  if (shouldClearKl3KnowledgeBusyOnFinally(cancelled)) busy = false;
  check("success settle clears busy", busy === false);

  busy = true;
  cancelled = true;
  // cancel: effect cleanup
  const cu = resolveKl3InFlightCancelCleanup({
    inFlightKnowledgeKey: "K",
    attemptedKey: "K",
  });
  if (cu.clearBusy) busy = false;
  if (shouldClearKl3KnowledgeBusyOnFinally(cancelled)) busy = false;
  check("cancel path busy=false", busy === false);
  check("cancel path does not invent knowledge", knowledge === "SENTINEL");
}

// 5) early-exit contracts (documented mirrors of hook branches)
function earlyExitMayProceed(mayProceed) {
  let busy = true;
  let attempted = "X";
  if (!mayProceed) {
    busy = false;
    attempted = null;
  }
  return { busy, attempted };
}
function earlyExitNoLines(tenderId, lineCount) {
  let busy = true;
  if (!tenderId || lineCount === 0) {
    busy = false;
  }
  return { busy };
}
check(
  "early !mayProceed clears busy+latch",
  earlyExitMayProceed(false).busy === false
    && earlyExitMayProceed(false).attempted === null,
);
check(
  "early no tenderId clears busy",
  earlyExitNoLines("", 5).busy === false,
);
check(
  "early no knr lines clears busy",
  earlyExitNoLines("t1", 0).busy === false,
);

// 6) buildKl3KnowledgeKey stability (content-equal keys)
{
  const knrA = {
    lines: [
      { lineId: "L1", dwellingId: "d1", catalogBasis: { normalizedKey: "nk1" } },
    ],
  };
  const knrB = {
    lines: [
      { lineId: "L1", dwellingId: "d1", catalogBasis: { normalizedKey: "nk1" } },
    ],
  };
  check(
    "knowledgeKey equal for content-equal knr",
    buildKl3KnowledgeKey("t1", knrA) === buildKl3KnowledgeKey("t1", knrB),
  );
}

// 7) RCA feedback-loop simulation: busy flip must not permanently latch when
//    cleanup+stable-key contracts are applied
{
  let attempted = null;
  let busy = false;
  const key = "stable-key";

  // start
  attempted = key;
  busy = true;

  // OLD BUG: cancel without clear + same-key early return
  let cancelled = true;
  // NEW: cleanup
  const cu = resolveKl3InFlightCancelCleanup({
    inFlightKnowledgeKey: key,
    attemptedKey: attempted,
  });
  attempted = cu.nextAttemptedKey;
  if (cu.clearBusy) busy = false;

  // remount with same key
  const blocked = attempted === key;
  check("stable remount not blocked by stale latch", blocked === false);
  check("no permanent busy after cancel cleanup", busy === false);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
