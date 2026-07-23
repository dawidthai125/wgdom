/**
 * NG11-Q3 — debounced cloud persist coalesce.
 * npx vite-node scripts/test-ng11-debounce-persist.mjs
 */

import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import {
  cancelTenderPipelinePersist,
  flushTenderPipelinePersist,
  forcePipelinePersistDebounceForTests,
  getTenderPipelineCloudWriteCountForTests,
  getTenderPipelinePersistPending,
  notifyPipelinePersistTerminalState,
  resetTenderPipelinePersistCoalesceForTests,
  scheduleTenderPipelinePersist,
  setTenderPipelineCloudPushForTests,
} from "../src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts";
import { recordPipelineStateTiming } from "../src/lib/tender-pipeline/tender-pipeline-timing.ts";
import { forcePipelineTimingDisabledForTests } from "../src/lib/tender-pipeline/tender-pipeline-timing.ts";

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) {
    this._m.set(String(k), String(v));
  },
  getItem(k) {
    return this._m.has(String(k)) ? this._m.get(String(k)) : null;
  },
  removeItem(k) {
    this._m.delete(String(k));
  },
  clear() {
    this._m.clear();
  },
  key(i) {
    return [...this._m.keys()][i] ?? null;
  },
  get length() {
    return this._m.size;
  },
};

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

const itemA = { id: "q3-a", title: "A", status: "seen", updatedAt: "2026-01-01T00:00:00.000Z" };
const itemB = { id: "q3-b", title: "B", status: "seen", updatedAt: "2026-01-01T00:00:00.000Z" };

async function run() {
  console.log("=== NG11-Q3 Debounced Persist ===\n");

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(false);
  scheduleTenderPipelinePersist([itemA]);
  ok("Q3-1 flag OFF — schedule is no-op (no pending)", !getTenderPipelinePersistPending());

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);

  scheduleTenderPipelinePersist([itemA]);
  scheduleTenderPipelinePersist([itemB]);
  ok("Q3-2 burst schedule — pending before flush", getTenderPipelinePersistPending());

  await flushTenderPipelinePersist("flush_explicit");
  ok("Q3-3 single cloud write after coalesced burst", getTenderPipelineCloudWriteCountForTests() === 1);
  ok("Q3-4 pending cleared after flush", !getTenderPipelinePersistPending());

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);

  scheduleTenderPipelinePersist([itemA]);
  scheduleTenderPipelinePersist([itemB]);
  await sleep(550);
  ok("Q3-5 debounce timer — one cloud write", getTenderPipelineCloudWriteCountForTests() === 1);

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);
  scheduleTenderPipelinePersist([itemA]);
  notifyPipelinePersistTerminalState(PipelineState.Ready, PipelineState.Pricing);
  ok("Q3-6 Ready terminal — immediate flush", getTenderPipelineCloudWriteCountForTests() === 1);

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);
  scheduleTenderPipelinePersist([itemA]);
  await flushTenderPipelinePersist("beforeunload");
  ok("Q3-7 beforeunload flush — one write", getTenderPipelineCloudWriteCountForTests() === 1);

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);
  scheduleTenderPipelinePersist([itemA]);
  notifyPipelinePersistTerminalState(PipelineState.Failed, PipelineState.Heavy);
  ok("Q3-8 Failed terminal — immediate flush", getTenderPipelineCloudWriteCountForTests() === 1);

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);
  forcePipelineTimingDisabledForTests(true);
  scheduleTenderPipelinePersist([itemA]);
  recordPipelineStateTiming("bridge-item", PipelineState.Ready, PipelineState.Pricing);
  ok("Q3-9 timing bridge Ready (timing telemetry off)", getTenderPipelineCloudWriteCountForTests() === 1);

  resetTenderPipelinePersistCoalesceForTests();
  setTenderPipelineCloudPushForTests(async () => {});
  forcePipelinePersistDebounceForTests(true);
  scheduleTenderPipelinePersist([itemA]);
  cancelTenderPipelinePersist();
  await flushTenderPipelinePersist("flush_explicit");
  ok("Q3-10 cancel clears pending — no cloud write", getTenderPipelineCloudWriteCountForTests() === 0);

  resetTenderPipelinePersistCoalesceForTests();
  forcePipelinePersistDebounceForTests(null);

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
