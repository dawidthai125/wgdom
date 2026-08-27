#!/usr/bin/env node
/**
 * P5 Labor settle race — cancel + sticky-key regression (pure latch + runtime contract).
 *
 * npx vite-node scripts/test-ik-p5-labor-settle-race.mjs
 *
 * ZERO live HTTP · ZERO CatalogWork · ZERO Accept · ZERO KV.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isP5LaborAttemptStale,
  p5LaborCleanupInvalidate,
  shouldSkipP5LaborRestart,
} from "../src/lib/intelligent-estimator/orchestra/ik-p5-labor-settle-latch.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const LABOR_KEY = "t1|159|159|B|lr0";

// —— T1: stale predicates ——
ok(
  "T1a stale when cancelled",
  isP5LaborAttemptStale({ cancelled: true, generation: 1, runGenerationCurrent: 1 }) === true,
);
ok(
  "T1b stale when generation superseded",
  isP5LaborAttemptStale({ cancelled: false, generation: 1, runGenerationCurrent: 2 }) === true,
);
ok(
  "T1c live when current + not cancelled",
  isP5LaborAttemptStale({ cancelled: false, generation: 2, runGenerationCurrent: 2 }) === false,
);

// —— T2: cleanup before settle → clear sticky + bump gen (retry path) ——
{
  const inv = p5LaborCleanupInvalidate({
    generation: 1,
    runGenerationCurrent: 1,
    settled: false,
    laborKey: LABOR_KEY,
    laborAttemptedKey: LABOR_KEY,
  });
  ok("T2a bump generation on cancel-before-settle", inv.nextRunGeneration === 2);
  ok("T2b clear sticky on cancel-before-settle", inv.nextLaborAttemptedKey === null);
  ok(
    "T2c retry allowed after cancel",
    shouldSkipP5LaborRestart({
      laborKey: LABOR_KEY,
      laborAttemptedKey: inv.nextLaborAttemptedKey,
    }) === false,
  );
}

// —— T3: cleanup after settle → keep sticky (no duplicate) ——
{
  const inv = p5LaborCleanupInvalidate({
    generation: 3,
    runGenerationCurrent: 3,
    settled: true,
    laborKey: LABOR_KEY,
    laborAttemptedKey: LABOR_KEY,
  });
  ok("T3a bump generation after settled cleanup", inv.nextRunGeneration === 4);
  ok("T3b keep sticky after settle", inv.nextLaborAttemptedKey === LABOR_KEY);
  ok(
    "T3c no retry after successful settle",
    shouldSkipP5LaborRestart({
      laborKey: LABOR_KEY,
      laborAttemptedKey: inv.nextLaborAttemptedKey,
    }) === true,
  );
}

// —— T4: same laborKey sticky while in-flight ——
ok(
  "T4 skip restart while sticky claimed",
  shouldSkipP5LaborRestart({
    laborKey: LABOR_KEY,
    laborAttemptedKey: LABOR_KEY,
  }) === true,
);
ok(
  "T4b different key not skipped",
  shouldSkipP5LaborRestart({
    laborKey: LABOR_KEY,
    laborAttemptedKey: "other|key",
  }) === false,
);

// —— T5: lifecycle simulation — cancel + same key → retry; old settle ignored ——
{
  let runGeneration = 0;
  let laborAttempted = null;
  let labor = null;
  let settledTicks = 0;
  const starts = [];

  function startAttempt(label) {
    if (
      shouldSkipP5LaborRestart({
        laborKey: LABOR_KEY,
        laborAttemptedKey: laborAttempted,
      })
    ) {
      starts.push({ label, skipped: true });
      return null;
    }
    laborAttempted = LABOR_KEY;
    let cancelled = false;
    let settled = false;
    const generation = ++runGeneration;
    starts.push({ label, skipped: false, generation });

    const isCancelled = () =>
      isP5LaborAttemptStale({
        cancelled,
        generation,
        runGenerationCurrent: runGeneration,
      });

    const finish = (value) => {
      if (isCancelled()) return { applied: false };
      labor = value;
      settled = true;
      settledTicks += 1;
      return { applied: true };
    };

    const cleanup = () => {
      cancelled = true;
      const inv = p5LaborCleanupInvalidate({
        generation,
        runGenerationCurrent: runGeneration,
        settled,
        laborKey: LABOR_KEY,
        laborAttemptedKey: laborAttempted,
      });
      runGeneration = inv.nextRunGeneration;
      laborAttempted = inv.nextLaborAttemptedKey;
    };

    return { finish, cleanup, generation };
  }

  // Attempt 1 starts
  const a1 = startAttempt("A1");
  ok("T5a A1 started", a1 != null && starts[0].skipped === false);

  // Unstable dep → cleanup before settle (knowledgeBusy-style)
  a1.cleanup();
  ok("T5b sticky cleared after cancel", laborAttempted === null);
  ok("T5c generation bumped", runGeneration === 2);

  // Same laborKey effect re-run → must NOT sticky-skip
  const a2 = startAttempt("A2");
  ok("T5d A2 retry after cancel", a2 != null && starts[1].skipped === false);
  ok("T5e A2 is generation 3", a2.generation === 3);

  // Late A1 finish must not authoritatively settle
  const late = a1.finish({ status: "ready", stale: true });
  ok("T5f late A1 settle ignored", late.applied === false && labor === null);

  // A2 finishes
  const ok2 = a2.finish({ status: "ready", id: "A2" });
  ok("T5g A2 settle applied", ok2.applied === true && labor?.id === "A2");
  ok("T5h settled once", settledTicks === 1);

  // Unstable dep after success → cleanup keeps sticky
  a2.cleanup();
  ok("T5i sticky kept after settle", laborAttempted === LABOR_KEY);

  // Same key re-run → skip (no duplicate Labor)
  const a3 = startAttempt("A3");
  ok("T5j no duplicate after settle", a3 === null && starts[2].skipped === true);
  ok("T5k labor unchanged", labor?.id === "A2");
}

// —— T6: no parallel authoritative settle (two gens) ——
{
  let runGeneration = 0;
  let applied = [];
  const start = () => {
    const generation = ++runGeneration;
    return {
      generation,
      settle: (tag) => {
        if (
          isP5LaborAttemptStale({
            cancelled: false,
            generation,
            runGenerationCurrent: runGeneration,
          })
        ) {
          return;
        }
        applied.push(tag);
      },
      invalidate: () => {
        const inv = p5LaborCleanupInvalidate({
          generation,
          runGenerationCurrent: runGeneration,
          settled: false,
          laborKey: LABOR_KEY,
          laborAttemptedKey: LABOR_KEY,
        });
        runGeneration = inv.nextRunGeneration;
      },
    };
  };
  const g1 = start();
  g1.invalidate();
  const g2 = start();
  g1.settle("old");
  g2.settle("new");
  ok("T6 only newer generation settles", applied.join(",") === "new");
}

// —— T7: hook / runtime wiring (static) ——
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const runtimeSrc = readSrc(
  "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts",
);
const latchSrc = readSrc(
  "src/lib/intelligent-estimator/orchestra/ik-p5-labor-settle-latch.ts",
);

ok("T7a hook imports p5 settle latch", hookSrc.includes("ik-p5-labor-settle-latch"));
ok("T7b hook uses p5LaborCleanupInvalidate", hookSrc.includes("p5LaborCleanupInvalidate"));
ok("T7c hook uses laborRunGenerationRef", hookSrc.includes("laborRunGenerationRef"));
ok(
  "T7d runtime atomic setLabor+onSettled (no split finally)",
  /opts\.setLabor\(result\);\s*opts\.onSettled\(\);/.test(runtimeSrc)
    && !/finally\s*\{\s*if\s*\(!opts\.isCancelled\(\)\)\s*opts\.onSettled\(\);/.test(
      runtimeSrc,
    ),
);
ok("T7e latch file documents sticky clear", latchSrc.includes("Clear sticky"));
ok(
  "T7f APF/P7/P8 not imported by latch",
  !latchSrc.includes("runAutonomousPricingFallback")
    && !latchSrc.includes("runIkP7")
    && !latchSrc.includes("runIkP8"),
);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
