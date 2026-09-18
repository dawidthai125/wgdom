/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — T-INDEX-NEVER-FULL (Phase 1 scope: NEW-08 leaf + IDB envelope boundary).
 * Design Freeze v1.1 Amendment §A.4 / §A.5.1 / §A.6 D. Entry points E4–E8 (merge/seam/import/restore/bootstrap)
 * are Phase 3–4 scope and NOT covered here.
 *
 * Run: npx vite-node scripts/test-storage-tier1-pipeline-index-never-full.mjs
 */

import { installIdbStub } from "./_lib/idb-memory-stub.mjs";

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) { this._m.set(String(k), String(v)); },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};

let pass = 0;
let fail = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; failures.push(name); console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail) : ""); }
}

const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const idb = installIdbStub({ mode: "ok" });
idb.reset();
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");

const full = (id) => ({ id, title: id, updatedAt: "2026-09-01T00:00:00.000Z", noticeHtml: "<p/>" });
const idx = (id, seq = 3) => ({ id, title: id, updatedAt: "2026-09-01T00:00:00.000Z", _lsIndex: { v: 1, seq } });

// --- hasLsIndexMarker ---
assert("hasLsIndexMarker FULL → false", repr.hasLsIndexMarker([full("a"), full("b")]) === false);
assert("hasLsIndexMarker INDEX → true", repr.hasLsIndexMarker([idx("a")]) === true);
assert("hasLsIndexMarker mixed → true", repr.hasLsIndexMarker([full("a"), idx("b")]) === true);
assert("hasLsIndexMarker marker=null still marker", repr.hasLsIndexMarker([{ id: "a", _lsIndex: null }]) === true);
assert("hasLsIndexMarker marker=undefined-value still marker (`in`)", repr.hasLsIndexMarker([{ id: "a", _lsIndex: undefined }]) === true);
assert("hasLsIndexMarker non-array → false", repr.hasLsIndexMarker("x") === false && repr.hasLsIndexMarker(null) === false);
assert("hasLsIndexMarker empty → false", repr.hasLsIndexMarker([]) === false);
assert("hasLsIndexMarker ignores nested marker (top-level only)", repr.hasLsIndexMarker([{ id: "a", nested: { _lsIndex: { v: 1 } } }]) === false);

// --- classifyPipelineRepresentation ---
assert("classify NOT_ARRAY", repr.classifyPipelineRepresentation({}) === "NOT_ARRAY" && repr.classifyPipelineRepresentation(null) === "NOT_ARRAY");
assert("classify EMPTY", repr.classifyPipelineRepresentation([]) === "EMPTY");
assert("classify FULL (shape only)", repr.classifyPipelineRepresentation([full("a"), full("b")]) === "FULL");
assert("classify INDEX", repr.classifyPipelineRepresentation([idx("a"), idx("b")]) === "INDEX");
assert("classify INDEX_INVALID mixed", repr.classifyPipelineRepresentation([full("a"), idx("b")]) === "INDEX_INVALID");
assert("classify INDEX_INVALID differing seq", repr.classifyPipelineRepresentation([idx("a", 1), idx("b", 2)]) === "INDEX_INVALID");
assert("classify INDEX_INVALID marker v≠1", repr.classifyPipelineRepresentation([{ id: "a", _lsIndex: { v: 2, seq: 1 } }]) === "INDEX_INVALID");
assert("classify INDEX_INVALID marker null", repr.classifyPipelineRepresentation([{ id: "a", _lsIndex: null }]) === "INDEX_INVALID");
assert("classify INDEX_INVALID item without id", repr.classifyPipelineRepresentation([{ _lsIndex: { v: 1, seq: 1 } }]) === "INDEX_INVALID");
assert("classify FULL never for any marked collection", ["INDEX", "INDEX_INVALID"].includes(repr.classifyPipelineRepresentation([idx("a"), full("b"), idx("c")])));
// §A.4 rule (ii): INDEX contains all FULL-required index fields — shape alone must not yield FULL
assert("classify INDEX item with full-looking fields still INDEX", repr.classifyPipelineRepresentation([{ ...full("a"), noticeHtml: "<big/>", _lsIndex: { v: 1, seq: 9 } }]) === "INDEX");

// --- PipelineIndexNotFullError ---
const err = new repr.PipelineIndexNotFullError("test.ctx");
assert("error code", err.code === "PIPELINE_INDEX_NOT_FULL" && err.context === "test.ctx" && err instanceof Error && err.name === "PipelineIndexNotFullError");

// --- availability state ---
assert("availability default UNKNOWN", ["UNKNOWN", "FULL"].includes(repr.getPipelineFullAvailability()));
repr.setPipelineFullAvailability("DEGRADED_INDEX", "test");
assert("availability set/get", repr.getPipelineFullAvailability() === "DEGRADED_INDEX" && repr.getPipelineFullAvailabilityReason() === "test");
repr.setPipelineFullAvailability("UNKNOWN", "reset");

// --- Phase 1 entry points: INDEX never becomes FULL ---
const IDB_KEY = cold.PIPELINE_COLD_IDB_KEY;

// E-cold-write
const w = await cold.setPipelineColdMemory([idx("a"), idx("b")], { writer: "t-index-never-full" });
assert("cold write INDEX → validation_failed:index_not_full", w.ok === false && w.reason === "validation_failed" && w.validationReason === "index_not_full", w);
assert("cold write INDEX → no IDB record", idb.getRaw(IDB_KEY) === undefined);
assert("cold write INDEX → coldMem null", cold.getPipelineColdMemory() === null);
assert("cold write INDEX → availability not FULL", repr.getPipelineFullAvailability() !== "FULL");

// E-cold-parse (backstop on read)
for (const [label, raw] of [
  ["envelope INDEX", { schemaVersion: 1, bundleRevision: 0, localSeq: 1, itemCount: 2, writtenAt: "", maxUpdatedAt: "", items: [idx("a"), idx("b")] }],
  ["envelope mixed", { schemaVersion: 1, bundleRevision: 0, localSeq: 1, itemCount: 2, writtenAt: "", maxUpdatedAt: "", items: [full("a"), idx("b")] }],
  ["legacy-shaped INDEX array", [idx("a"), idx("b")]],
  ["legacy-shaped mixed array", [full("a"), idx("b")]],
]) {
  const r = cold.parsePipelineIdbEnvelope(raw);
  assert(`parse ${label} → CORRUPT item_index_marker (never OK / never LEGACY_ARRAY)`, r.status === "CORRUPT" && r.reason === "item_index_marker" && r.envelope === null, r);
}

// E-cold-hydrate (IDB already holding INDEX-marked data written by a foreign/legacy path)
idb.seed(IDB_KEY, { schemaVersion: 1, bundleRevision: 0, localSeq: 5, itemCount: 1, writtenAt: "", maxUpdatedAt: "", items: [idx("z")] });
const h = await cold.hydratePipelineColdEnvelopeFromIdb();
assert("hydrate INDEX-marked envelope → CORRUPT, items null", h.status === "CORRUPT" && h.reason === "item_index_marker" && h.items === null, h);
assert("hydrate INDEX-marked → adapter null", (await cold.hydratePipelineColdFromIdb()) === null);
assert("hydrate INDEX-marked → coldMem null", cold.getPipelineColdMemory() === null);
assert("hydrate INDEX-marked → record left in place (no delete)", idb.getRaw(IDB_KEY) !== undefined);
assert("hydrate INDEX-marked → availability not FULL", repr.getPipelineFullAvailability() !== "FULL");

// Oracle (d): after any OK parse, items carry no `_lsIndex`
const okEnv = cold.parsePipelineIdbEnvelope({ schemaVersion: 1, bundleRevision: 0, localSeq: 1, itemCount: 2, writtenAt: "", maxUpdatedAt: "", items: [full("a"), full("b")] });
assert("oracle (d): OK ⇒ no _lsIndex in items", okEnv.status === "OK" && !repr.hasLsIndexMarker(okEnv.envelope.items));

console.log(`\n=== STORAGE-TIER1 T-INDEX-NEVER-FULL (Phase 1 scope): ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) {
  console.log("Failures:", failures);
  process.exit(1);
}
