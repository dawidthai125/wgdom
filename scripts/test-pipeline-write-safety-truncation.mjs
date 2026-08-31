/**
 * PIPELINE WRITE-SAFETY — truncation / critical-field / fail-closed (NO cloud write).
 *
 * Run: npx vite-node scripts/test-pipeline-write-safety-truncation.mjs
 *
 * ZERO network / ZERO batch-set.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";
import {
  evaluatePipelineSnapshotWriteSafety,
  guardTenderPipelineCloudWrite,
  assertTenderPipelineCloudWriteAllowed,
  PIPELINE_SNAPSHOT_REGRESSION_BLOCKED,
  PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED,
  PipelineWriteSafetyBlockedError,
} from "../src/lib/tender-pipeline-write-safety.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CHROBREGO = "08df0363-7b22-e462-ab56-940001283cba";
const WYSZ = "08defd1c-7dd3-05f6-962b-12000115ca6c";

const G3 = {
  kind: "ik_g3_final_bid",
  netPln: 159000,
  vatPln: 36570,
  grossPln: 195570,
  source: "owner_g3",
  currency: "PLN",
  schemaVersion: 1,
  tenderPipelineId: CHROBREGO,
};

let batchSet = 0;

function makeItem(id, extra = {}) {
  return {
    id,
    title: `tender-${id}`,
    status: "seen",
    updatedAt: "2026-08-31T06:00:00.000Z",
    addedAt: "2026-08-01T00:00:00.000Z",
    submittingOffersDate: "2026-09-30T00:00:00.000Z",
    ...extra,
  };
}

function buildCloud447() {
  const items = [];
  for (let i = 0; i < 445; i++) {
    items.push(makeItem(`cloud-filler-${String(i).padStart(4, "0")}`));
  }
  items.push(
    makeItem(CHROBREGO, {
      title: "CHROBREGO 34A",
      ikFinalBid: { ...G3 },
      submittedBidPln: null,
      ourEstimatePln: null,
    }),
  );
  items.push(
    makeItem(WYSZ, {
      title: "Wyszyńskiego 105A",
      ikFinalBid: null,
    }),
  );
  assert.equal(items.length, 447);
  return items;
}

function buildLocal13(cloud) {
  const pick = cloud.filter((x) => !String(x.id).startsWith("cloud-filler-"));
  const fillers = cloud.filter((x) => String(x.id).startsWith("cloud-filler-")).slice(0, 11);
  const wysz = pick.find((x) => x.id === WYSZ);
  assert.ok(wysz);
  const local = [...fillers, { ...wysz, tenderDossier: { brief: {}, builtAt: "2026-08-31T08:00:00.000Z" } }];
  assert.equal(local.length, 12);
  local.push(makeItem("local-only-extra"));
  assert.equal(local.length, 13);
  assert.equal(local.some((x) => x.id === CHROBREGO), false);
  return local;
}

/** Simulates pushKeysToCloudSafe pipeline gate — no network. */
function simulatePipelineSafePush(localItems, cloudOrUnavailable) {
  const verdict = guardTenderPipelineCloudWrite(localItems, cloudOrUnavailable);
  if (!verdict.allowed) {
    throw new PipelineWriteSafetyBlockedError(verdict);
  }
  // Only after guard: merge then "write"
  const cloudArr = cloudOrUnavailable === "UNAVAILABLE" ? null : cloudOrUnavailable;
  const merged = mergeTenderPipelineForCloud(localItems, cloudArr);
  batchSet += 1;
  return merged;
}

console.log("=== PIPELINE WRITE-SAFETY TRUNCATION ===\n");

const cloud = buildCloud447();
const local = buildLocal13(cloud);

// --- TEST 1: cloud=447 local=13 → BLOCK ---
{
  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: local,
  });
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.code, PIPELINE_SNAPSHOT_REGRESSION_BLOCKED);
  assert.equal(verdict.cloudCount, 447);
  assert.equal(verdict.localCount, 13);
  assert.ok(verdict.missingRecords >= 434);
  console.log("PASS TEST 1: 447→13 → PIPELINE_SNAPSHOT_REGRESSION_BLOCKED");
}

// --- TEST 2: CHROBREGO absent + cloud ikFinalBid → BLOCK ---
{
  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: local,
  });
  assert.equal(verdict.allowed, false);
  assert.ok(
    verdict.criticalLoss.some((c) => c.id === CHROBREGO && c.field === "ikFinalBid"),
    "CHROBREGO ikFinalBid must be in criticalLoss",
  );
  assert.equal(local.some((x) => x.id === CHROBREGO), false);
  assert.equal(cloud.find((x) => x.id === CHROBREGO)?.ikFinalBid?.netPln, 159000);
  console.log("PASS TEST 2: missing CHROBREGO + ikFinalBid loss → BLOCK");
}

// --- TEST 2b: CHROBREGO present locally without ikFinalBid → BLOCK ---
{
  const localWithBareChrob = [
    ...local.slice(0, 12),
    makeItem(CHROBREGO, { title: "CHROBREGO 34A", ikFinalBid: null }),
  ];
  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: localWithBareChrob,
  });
  assert.equal(verdict.allowed, false);
  assert.ok(
    verdict.criticalLoss.some((c) => c.reason === "critical_field_absent_on_local"),
  );
  console.log("PASS TEST 2b: local CHROBREGO without ikFinalBid → BLOCK");
}

// --- TEST 3: cloud=447 local=447 + one legal change → ALLOW ---
{
  const fullLocal = cloud.map((x) =>
    x.id === WYSZ
      ? { ...x, status: "interested", updatedAt: "2026-08-31T09:00:00.000Z" }
      : { ...x },
  );
  assert.equal(fullLocal.length, 447);
  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: fullLocal,
  });
  assert.equal(verdict.allowed, true);
  assert.equal(verdict.code, "OK");
  const written = simulatePipelineSafePush(fullLocal, cloud);
  assert.equal(written.length, 447);
  const wysz = written.find((x) => x.id === WYSZ);
  assert.equal(wysz?.status, "interested");
  console.log("PASS TEST 3: full snapshot + legal change → ALLOW");
}

// --- TEST 4: cloud fetch throws / UNAVAILABLE → BLOCK ---
{
  const verdict = guardTenderPipelineCloudWrite(local, "UNAVAILABLE");
  assert.equal(verdict.allowed, false);
  assert.equal(verdict.code, PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED);
  assert.throws(
    () => assertTenderPipelineCloudWriteAllowed(local, "UNAVAILABLE"),
    (err) =>
      err instanceof PipelineWriteSafetyBlockedError
      && err.code === PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED,
  );
  const before = batchSet;
  assert.throws(() => simulatePipelineSafePush(local, "UNAVAILABLE"));
  assert.equal(batchSet, before, "no write on cloud-read failure");
  console.log("PASS TEST 4: PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED");
}

// --- TEST 5: merge(local13, null) must not lead to write (guard first) ---
{
  const unsafeMerged = mergeTenderPipelineForCloud(local, null);
  assert.equal(unsafeMerged.length, 13, "raw merge still collapses (documented)");
  const before = batchSet;
  assert.throws(() => simulatePipelineSafePush(local, "UNAVAILABLE"));
  assert.throws(() => {
    // Guard on local vs cloud BEFORE merge — incomplete snapshot blocked even if cloud readable
    simulatePipelineSafePush(local, cloud);
  });
  assert.equal(batchSet, before, "incomplete snapshot → ZERO write");
  console.log("PASS TEST 5: merge(local13,null) path cannot write (guard blocks)");
}

// --- TEST 6: full merge preserves CHROBREGO G3 ---
{
  const fullLocal = cloud.map((x) => ({ ...x }));
  const chLocal = fullLocal.find((x) => x.id === CHROBREGO);
  assert.ok(chLocal);
  chLocal.notes = "legal touch";
  chLocal.updatedAt = "2026-08-31T10:00:00.000Z";

  const verdict = evaluatePipelineSnapshotWriteSafety({
    cloudItems: cloud,
    localItems: fullLocal,
  });
  assert.equal(verdict.allowed, true);

  const written = simulatePipelineSafePush(fullLocal, cloud);
  const ch = written.find((x) => x.id === CHROBREGO);
  assert.ok(ch);
  assert.equal(ch.ikFinalBid?.netPln, 159000);
  assert.equal(ch.ikFinalBid?.vatPln, 36570);
  assert.equal(ch.ikFinalBid?.grossPln, 195570);
  assert.equal(ch.ikFinalBid?.source, "owner_g3");
  assert.equal(ch.ikFinalBid?.kind, "ik_g3_final_bid");
  console.log("PASS TEST 6: full snapshot merge preserves CHROBREGO G3");
}

// --- Static: production wiring present ---
{
  const safetySrc = readFileSync(join(ROOT, "src/lib/tender-pipeline-write-safety.ts"), "utf8");
  const cloudSrc = readFileSync(join(ROOT, "src/lib/cloud-sync.ts"), "utf8");
  const persistSrc = readFileSync(
    join(ROOT, "src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts"),
    "utf8",
  );
  const edgeSrc = readFileSync(
    join(ROOT, "supabase/functions/make-server-0afb8820/index.tsx"),
    "utf8",
  );

  assert.ok(safetySrc.includes("evaluatePipelineSnapshotWriteSafety"));
  assert.ok(safetySrc.includes("PIPELINE_SNAPSHOT_REGRESSION_BLOCKED"));
  assert.ok(safetySrc.includes("PIPELINE_CLOUD_READ_FAILED_WRITE_BLOCKED"));
  assert.ok(cloudSrc.includes("assertTenderPipelineCloudWriteAllowed"));
  assert.ok(cloudSrc.includes("tender-pipeline-write-safety"));
  assert.ok(/persistKey\(TENDERS_PIPELINE_KEY,\s*items\)/.test(persistSrc));
  // Edge shrink still optional / absent — OK for this GO
  assert.equal(
    /pipeline_shrink_rejected|kw-tenders-pipeline.*shrink/i.test(edgeSrc),
    false,
  );
  console.log("PASS static: client guard wired; Edge shrink not required");
}

assert.equal(batchSet >= 2, true, "legal writes only via stub");
console.log("\n=== ALL PIPELINE WRITE-SAFETY CHECKS PASS ===");
console.log(JSON.stringify({
  verdict: "REGRESSION_TEST_GREEN",
  productionGuard: "WIRED",
  batchSet,
  cloudWrite: 0,
  chrobregoRestore: false,
}, null, 2));
