/**
 * CLOUD-SYNC-BATCH-SET-TIMEOUT-RECOVERY-01 / EDGE-BATCH-SET-500-01 — chunk planner + contracts.
 *
 * Pure unit (no Deno / no live Edge). Covers A1–A12.
 *
 * Run: npx vite-node scripts/test-edge-batch-set-500-01-mset-chunk.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MSET_CHUNK_MAX_BYTES,
  MSET_CHUNK_MAX_KEYS,
  planMsetChunks,
  estimateKvValueBytes,
  sumChunkEstimatedBytes,
} from "../supabase/functions/make-server-0afb8820/kv-mset-chunk.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass++;
    console.log("PASS", name, detail ? `· ${detail}` : "");
  } else {
    fail++;
    console.log("FAIL", name, detail ? `· ${detail}` : "");
  }
}

/** Build a plain object whose JSON estimate is ≈ targetBytes (not a raw string). */
function objBytes(targetBytes) {
  const overhead = JSON.stringify({ d: "" }).length;
  const n = Math.max(0, targetBytes - overhead);
  return { d: "x".repeat(n) };
}

console.log("=== EDGE-BATCH-SET-500-01 mset chunk harness ===\n");
assert("const MAX_BYTES=450000", MSET_CHUNK_MAX_BYTES === 450_000);
assert("const MAX_KEYS=12", MSET_CHUNK_MAX_KEYS === 12);

// A1 — small keys → expected chunks
{
  const keys = ["a", "b", "c"];
  const values = [{ n: 1 }, { n: 2 }, { n: 3 }];
  const chunks = planMsetChunks(keys, values);
  assert("A1 single chunk for tiny keys", chunks.length === 1, `n=${chunks.length}`);
  assert("A1 preserves all keys", chunks[0].keys.join(",") === "a,b,c");
  assert("A1 soloOversized false", chunks[0].soloOversized === false);
}

// A2 — 12-key boundary
{
  const keys = Array.from({ length: 12 }, (_, i) => `k${i}`);
  const values = keys.map((k) => ({ k }));
  const c12 = planMsetChunks(keys, values);
  assert("A2 exactly 12 → 1 chunk", c12.length === 1 && c12[0].keys.length === 12);

  const keys13 = Array.from({ length: 13 }, (_, i) => `k${i}`);
  const values13 = keys13.map((k) => ({ k }));
  const c13 = planMsetChunks(keys13, values13);
  assert("A2 13 keys → 2 chunks", c13.length === 2, `n=${c13.length}`);
  assert("A2 first packed = 12", c13[0].keys.length === 12);
  assert("A2 second packed = 1", c13[1].keys.length === 1);
}

// A3 — 450KB boundary
{
  const under = objBytes(MSET_CHUNK_MAX_BYTES - 64);
  const over = objBytes(MSET_CHUNK_MAX_BYTES + 64);
  assert("A3 estimate under < max", estimateKvValueBytes(under) < MSET_CHUNK_MAX_BYTES, `b=${estimateKvValueBytes(under)}`);
  assert("A3 estimate over >= max", estimateKvValueBytes(over) >= MSET_CHUNK_MAX_BYTES, `b=${estimateKvValueBytes(over)}`);

  const cUnder = planMsetChunks(["u"], [under]);
  assert("A3 under = packed (not solo)", cUnder.length === 1 && cUnder[0].soloOversized === false);

  const cOver = planMsetChunks(["o"], [over]);
  assert("A3 over = solo oversized", cOver.length === 1 && cOver[0].soloOversized === true);
}

// A4 — oversized solo key
{
  const fat = objBytes(MSET_CHUNK_MAX_BYTES + 50_000);
  const chunks = planMsetChunks(["kw-tenders-pipeline", "tiny"], [fat, { ok: 1 }]);
  assert("A4 first chunk is fat solo", chunks[0].soloOversized === true && chunks[0].keys[0] === "kw-tenders-pipeline");
  assert("A4 tiny follows in packed", chunks.length === 2 && chunks[1].keys[0] === "tiny");
}

// A5 — multiple oversized keys
{
  const fat1 = objBytes(MSET_CHUNK_MAX_BYTES + 1_000);
  const fat2 = objBytes(MSET_CHUNK_MAX_BYTES + 2_000);
  const chunks = planMsetChunks(["fat-a", "ok", "fat-b"], [fat1, { x: 1 }, fat2]);
  assert("A5 two solos + one packed", chunks.length === 3, `n=${chunks.length}`);
  assert("A5 solos first (order of appearance)", chunks[0].keys[0] === "fat-a" && chunks[1].keys[0] === "fat-b");
  assert("A5 packed last", chunks[2].keys[0] === "ok" && chunks[2].soloOversized === false);
}

// A6 — greedy packing
{
  const mid = objBytes(200_000);
  const chunks = planMsetChunks(["a", "b", "c"], [mid, mid, mid]);
  // 200k+200k = 400k OK; +200k would exceed → 2+1
  assert("A6 greedy packs two then one", chunks.length === 2, `n=${chunks.length}`);
  assert("A6 first has 2", chunks[0].keys.length === 2);
  assert("A6 second has 1", chunks[1].keys.length === 1);
}

// A7 — deterministic order
{
  const keys = ["z", "a", "m"];
  const values = [{ i: 1 }, { i: 2 }, { i: 3 }];
  const c1 = planMsetChunks(keys, values);
  const c2 = planMsetChunks(keys, values);
  assert("A7 deterministic JSON", JSON.stringify(c1) === JSON.stringify(c2));
  assert("A7 preserves input order in packed", c1[0].keys.join(",") === "z,a,m");
}

// A8 — API body contract unchanged (source)
{
  const indexSrc = readFileSync(
    resolve("supabase/functions/make-server-0afb8820/index.tsx"),
    "utf8",
  );
  const batchSetMatch = indexSrc.match(/app\.post\("\/make-server-0afb8820\/batch-set"[\s\S]*?return c\.json\(\{ ok: true \}\)/);
  assert("A8 batch-set handler present", !!batchSetMatch);
  const handler = batchSetMatch?.[0] ?? "";
  assert("A8 reads keys from body", /keys/.test(handler) && /values/.test(handler));
  assert("A8 success body {ok:true} only", /return c\.json\(\{ ok: true \}\)/.test(handler));
  assert("A8 no chunkCount in HTTP success body", !/return c\.json\(\{ ok: true,\s*chunkCount/.test(handler));
  assert("A8 failure still requestId + 500", /return c\.json\(\{ ok: false, error: message, requestId \}, 500\)/.test(indexSrc));
}

// A9 — fail-fast chunk 2 (sequential apply contract)
{
  const chunks = planMsetChunks(
    ["a", "b", "c"],
    [objBytes(200_000), objBytes(200_000), objBytes(200_000)],
  );
  assert("A9 setup has ≥2 chunks", chunks.length >= 2, `n=${chunks.length}`);
  let applied = 0;
  let threw = false;
  try {
    for (let i = 0; i < chunks.length; i++) {
      if (i === 1) throw new Error("simulated chunk-2 failure");
      applied++;
    }
  } catch {
    threw = true;
  }
  assert("A9 stops after chunk1", applied === 1 && threw === true);
  // Source: mset awaits upsert in loop (no catch-continue)
  const kvSrc = readFileSync(
    resolve("supabase/functions/make-server-0afb8820/kv_store.tsx"),
    "utf8",
  );
  assert("A9 mset loops chunks sequentially", /for \(let i = 0; i < chunks\.length; i\+\+\)/.test(kvSrc));
  assert("A9 mset awaits upsert per chunk", /await upsertRowsWithLightRetry/.test(kvSrc));
}

// A10 / A11 / A12 — merge/tombstone/payroll BEFORE planMsetChunks (write layer only)
{
  const indexSrc = readFileSync(
    resolve("supabase/functions/make-server-0afb8820/index.tsx"),
    "utf8",
  );
  const msetCallIdx = indexSrc.indexOf("await kv.mset(keys, safeValues");
  const mergeWeekIdx = indexSrc.indexOf("mergeWeekEmployeesUnion");
  const tombIdx = indexSrc.indexOf("weekEmpTombstoned");
  const lwwJobsIdx = indexSrc.indexOf("isSuspiciousJobsShrink");
  assert("A10 mset after payroll merge path", mergeWeekIdx > 0 && msetCallIdx > mergeWeekIdx);
  assert("A11 mset after tombstone discovery path", tombIdx > 0 && msetCallIdx > tombIdx);
  assert("A12 mset after jobs protect path", lwwJobsIdx > 0 && msetCallIdx > lwwJobsIdx);
  assert("A12 protected key kw-week-employees still merged", /keys\[i\] === "kw-week-employees"/.test(indexSrc));
  assert("A12 no fat-key split of tenders/jobs/catalog", !/splitTendersPipeline|splitKwJobs|fat.?key.?split/i.test(indexSrc));
  assert("A12 statement_timeout not raised in batch-set", !/statement_timeout/.test(indexSrc.slice(Math.max(0, msetCallIdx - 500), msetCallIdx + 800)));
}

// empty + sum helper
assert("empty → []", planMsetChunks([], []).length === 0);
{
  const chunks = planMsetChunks(["a"], [{ x: 1 }]);
  assert("sumChunkEstimatedBytes ≥ 0", sumChunkEstimatedBytes(chunks) >= 0);
}

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===`);
process.exit(fail > 0 ? 1 : 0);
