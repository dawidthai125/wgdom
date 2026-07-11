/**
 * NG11-F0 — pipeline timing telemetry (ring buffer, snapshot, baseline export).
 * npx vite-node scripts/test-ng11-pipeline-timing.mjs
 */

import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { derivePipelineState } from "../src/lib/tender-pipeline/derive-pipeline-state.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  buildPipelineTimingSnapshot,
  computeStageDurationPercentiles,
  exportPipelineTimingBaseline,
  forcePipelineTimingEnabledForTests,
  forcePipelineTimingDisabledForTests,
  markPipelineTimingStage,
  readPipelineTimingEvents,
  recordPipelineStateTiming,
  resetPipelineTimingForTests,
  withPipelineTimingStage,
} from "../src/lib/tender-pipeline/tender-pipeline-timing.ts";

const ITEM_ID = "ng11-f0-test-item";

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

resetPipelineTimingForTests();
forcePipelineTimingEnabledForTests(true);

console.log("=== NG11-F0 Pipeline timing telemetry ===\n");

ok("T1 disabled without force", (() => {
  resetPipelineTimingForTests();
  forcePipelineTimingDisabledForTests(true);
  markPipelineTimingStage(ITEM_ID, "discovery.bzp", "mark");
  return readPipelineTimingEvents(ITEM_ID).length === 0;
})());

forcePipelineTimingEnabledForTests(true);

markPipelineTimingStage(ITEM_ID, "discovery.bzp", "start");
markPipelineTimingStage(ITEM_ID, "discovery.bzp", "end");
ok("T2 start/end records duration", readPipelineTimingEvents(ITEM_ID).some((e) =>
  e.stage === "discovery.bzp" && e.kind === "end" && typeof e.durationMs === "number"));

await withPipelineTimingStage(ITEM_ID, "heavy.prefetch", async () => {
  await new Promise((r) => setTimeout(r, 5));
});
ok("T3 withPipelineTimingStage", readPipelineTimingEvents(ITEM_ID).some((e) =>
  e.stage === "heavy.prefetch" && e.kind === "end"));

const ITEM_READY = "ng11-f0-ready-item";
recordPipelineStateTiming(ITEM_READY, PipelineState.Pricing, PipelineState.Heavy);
recordPipelineStateTiming(ITEM_READY, PipelineState.Ready, PipelineState.Pricing);
ok("T5 pipeline.ready on Ready transition", readPipelineTimingEvents(ITEM_READY).some((e) =>
  e.stage === "pipeline.ready"));

for (let i = 0; i < 45; i += 1) {
  markPipelineTimingStage(ITEM_ID, "pipeline.state", "mark", {
    pipelineState: PipelineState.Discovery,
    detail: `tick-${i}`,
  });
}
const events = readPipelineTimingEvents(ITEM_ID);
ok("T4 ring buffer cap 40", events.length === 40);

recordPipelineStateTiming(ITEM_ID, PipelineState.Pricing, PipelineState.Heavy);
recordPipelineStateTiming(ITEM_ID, PipelineState.Ready, PipelineState.Pricing);
ok("T5b pipeline.state marks", readPipelineTimingEvents(ITEM_ID).some((e) =>
  e.stage === "pipeline.state"));

const snapshot = buildPipelineTimingSnapshot(ITEM_ID, PipelineState.Ready);
ok("T6 snapshot shape", Boolean(snapshot?.itemId === ITEM_ID && snapshot.stages.length > 0));

const baseline = exportPipelineTimingBaseline(ITEM_ID, { profile: "light", pipelineState: PipelineState.Ready });
ok("T7 baseline export version", baseline?.version === "ng11-f0-1");
ok("T8 baseline percentiles object", typeof baseline?.percentiles === "object");

const pct = computeStageDurationPercentiles(readPipelineTimingEvents(ITEM_ID));
ok("T9 percentiles samples", Object.values(pct).every((row) => typeof row.samples === "number"));

const derived = derivePipelineState({
  item: {
    id: ITEM_ID,
    tenderId: "t-1",
    title: "x",
    tenderDossier: {
      brief: { title: "x" },
      kosztorys: { ok: true, rows: [], sourceFilename: "t.ath" },
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: new Date().toISOString(),
    },
  },
  autoRunning: false,
  dossierBuilding: false,
  dossierSaving: false,
  dossierParseFailed: false,
  pricingReady: true,
  canStartHeavyParse: false,
});
ok("T10 derivePipelineState unchanged (read-only)", derived === PipelineState.Ready);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
