/**
 * NG11-Q1 — parse concurrency (cost/metadata ≤3).
 * npx vite-node scripts/test-ng11-parse-concurrency.mjs
 */

import {
  DOSSIER_PARSE_COST_CONCURRENCY,
  DOSSIER_PARSE_METADATA_CONCURRENCY,
  forcePipelineParseConcurrencyForTests,
  getMaxParseConcurrencyForTests,
  isPipelineParseConcurrencyEnabled,
  resetParseConcurrencyTelemetryForTests,
  runParseCandidatesWithConcurrency,
} from "../src/lib/tender-pipeline/tender-parse-concurrency.ts";

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

async function run() {
  console.log("=== NG11-Q1 Parse Concurrency ===\n");

  forcePipelineParseConcurrencyForTests(null);
  ok("Q1-1 flag OFF by default (no test override)", !isPipelineParseConcurrencyEnabled());

  forcePipelineParseConcurrencyForTests(true);
  ok("Q1-2 test override ON", isPipelineParseConcurrencyEnabled());

  ok("Q1-3 frozen cost concurrency = 3", DOSSIER_PARSE_COST_CONCURRENCY === 3);
  ok("Q1-4 frozen metadata concurrency = 3", DOSSIER_PARSE_METADATA_CONCURRENCY === 3);

  resetParseConcurrencyTelemetryForTests();
  const orderItems = ["a", "b", "c", "d", "e", "f"];
  const orderOutcomes = await runParseCandidatesWithConcurrency(orderItems, 3, async (item) => {
    await sleep(10);
    return { value: item.toUpperCase(), error: null };
  });
  ok("Q1-5 preserves result order", orderOutcomes.map((o) => o.value).join(",") === "A,B,C,D,E,F");
  ok("Q1-6 peak workers ≤ 3", getMaxParseConcurrencyForTests() <= 3);

  resetParseConcurrencyTelemetryForTests();
  const benchItems = [0, 1, 2, 3, 4, 5];
  const serialStart = Date.now();
  await runParseCandidatesWithConcurrency(benchItems, 1, async () => {
    await sleep(30);
    return { value: 1, error: null };
  });
  const serialMs = Date.now() - serialStart;

  resetParseConcurrencyTelemetryForTests();
  const parallelStart = Date.now();
  await runParseCandidatesWithConcurrency(benchItems, 3, async () => {
    await sleep(30);
    return { value: 1, error: null };
  });
  const parallelMs = Date.now() - parallelStart;

  ok("Q1-7 parallel faster than serial (6×30ms)", parallelMs < serialMs * 0.8);

  resetParseConcurrencyTelemetryForTests();
  let mergeOrder = "";
  const mergeItems = [1, 2, 3];
  const mergeOutcomes = await runParseCandidatesWithConcurrency(mergeItems, 3, async (n) => {
    await sleep(30 - n * 5);
    return { value: n, error: null };
  });
  for (const o of mergeOutcomes) {
    mergeOrder += String(o.value);
  }
  ok("Q1-8 deterministic merge order (input index)", mergeOrder === "123");

  resetParseConcurrencyTelemetryForTests();
  const errOutcomes = await runParseCandidatesWithConcurrency(["x"], 3, async () => ({
    value: null,
    error: "boom",
  }));
  ok("Q1-9 immutable error outcome", errOutcomes[0].error === "boom" && errOutcomes[0].value === null);

  resetParseConcurrencyTelemetryForTests();
  forcePipelineParseConcurrencyForTests(false);
  ok("Q1-10 flag OFF via test override", !isPipelineParseConcurrencyEnabled());

  const empty = await runParseCandidatesWithConcurrency([], 3, async () => ({
    value: 1,
    error: null,
  }));
  ok("Q1-11 empty input returns []", empty.length === 0);

  forcePipelineParseConcurrencyForTests(null);

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
