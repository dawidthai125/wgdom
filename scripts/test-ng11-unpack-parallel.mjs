/**
 * NG11-Q2 — parallel archive unpack (ZIP/7Z ≤2).
 * npx vite-node scripts/test-ng11-unpack-parallel.mjs
 */

import {
  DOSSIER_ARCHIVE_UNPACK_CONCURRENCY,
  forcePipelineUnpackParallelForTests,
  getMaxUnpackConcurrencyForTests,
  isPipelineUnpackParallelEnabled,
  resetUnpackConcurrencyTelemetryForTests,
  runArchiveUnpackWithConcurrency,
} from "../src/lib/tender-pipeline/tender-archive-unpack-concurrency.ts";

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function p50(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function run() {
  console.log("=== NG11-Q2 Parallel Archive Unpack ===\n");

  forcePipelineUnpackParallelForTests(null);
  ok("Q2-1 flag OFF by default (no test override)", !isPipelineUnpackParallelEnabled());

  forcePipelineUnpackParallelForTests(true);
  ok("Q2-2 test override ON", isPipelineUnpackParallelEnabled());

  ok("Q2-3 frozen unpack concurrency = 2", DOSSIER_ARCHIVE_UNPACK_CONCURRENCY === 2);

  resetUnpackConcurrencyTelemetryForTests();
  const orderItems = ["a", "b", "c", "d"];
  const orderOutcomes = await runArchiveUnpackWithConcurrency(orderItems, 2, async (item) => {
    await sleep(10);
    return { value: item.toUpperCase(), error: null };
  });
  ok("Q2-4 preserves result order", orderOutcomes.map((o) => o.value).join(",") === "A,B,C,D");
  ok("Q2-5 peak workers ≤ 2", getMaxUnpackConcurrencyForTests() <= 2);

  resetUnpackConcurrencyTelemetryForTests();
  const benchItems = [0, 1, 2, 3];
  const unpackDelayMs = 50;
  const benchRuns = 5;
  const serialSamples = [];
  const parallelSamples = [];

  for (let i = 0; i < benchRuns; i += 1) {
    resetUnpackConcurrencyTelemetryForTests();
    const serialStart = Date.now();
    await runArchiveUnpackWithConcurrency(benchItems, 1, async () => {
      await sleep(unpackDelayMs);
      return { value: 1, error: null };
    });
    serialSamples.push(Date.now() - serialStart);

    resetUnpackConcurrencyTelemetryForTests();
    const parallelStart = Date.now();
    await runArchiveUnpackWithConcurrency(benchItems, 2, async () => {
      await sleep(unpackDelayMs);
      return { value: 1, error: null };
    });
    parallelSamples.push(Date.now() - parallelStart);
  }

  const serialP50 = p50(serialSamples);
  const parallelP50 = p50(parallelSamples);
  const reductionPct = ((serialP50 - parallelP50) / serialP50) * 100;
  console.log(
    `  PG-Q2 harness: serial P50=${serialP50}ms parallel P50=${parallelP50}ms reduction=${reductionPct.toFixed(1)}%`,
  );
  ok("Q2-6 PG-Q2 P50 reduction ≥40% (4× unpack mock)", reductionPct >= 40);

  resetUnpackConcurrencyTelemetryForTests();
  let mergeOrder = "";
  const mergeItems = [1, 2, 3, 4];
  const mergeOutcomes = await runArchiveUnpackWithConcurrency(mergeItems, 2, async (n) => {
    await sleep(40 - n * 5);
    return { value: n, error: null };
  });
  for (const o of mergeOutcomes) {
    mergeOrder += String(o.value);
  }
  ok("Q2-7 deterministic merge order (input index)", mergeOrder === "1234");

  resetUnpackConcurrencyTelemetryForTests();
  const errOutcomes = await runArchiveUnpackWithConcurrency(["x"], 2, async () => ({
    value: null,
    error: "boom",
  }));
  ok("Q2-8 immutable error outcome", errOutcomes[0].error === "boom" && errOutcomes[0].value === null);

  resetUnpackConcurrencyTelemetryForTests();
  forcePipelineUnpackParallelForTests(false);
  ok("Q2-9 flag OFF via test override", !isPipelineUnpackParallelEnabled());

  const empty = await runArchiveUnpackWithConcurrency([], 2, async () => ({
    value: 1,
    error: null,
  }));
  ok("Q2-10 empty input returns []", empty.length === 0);

  forcePipelineUnpackParallelForTests(null);

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
