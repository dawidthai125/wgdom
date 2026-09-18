/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 1 (NEW-01 IDB envelope) — GATE 1 tests.
 * Design Freeze v1.1 §1 (envelope, parser, freshness, write/ACK, read) + PLAN Phase 1.
 *
 * Run: npx vite-node scripts/test-storage-tier1-pipeline-idb-envelope.mjs
 *
 * T-IDB-ENVELOPE-VALID · T-IDB-ENVELOPE-MISSING · T-IDB-ENVELOPE-LEGACY · T-IDB-ENVELOPE-CORRUPT ·
 * T-IDB-INDEX-MARKER · T-IDB-ACK · T-IDB-ACK-FAIL · T-IDB-FRESHNESS · T-IDB-STALE-IS-NOT-CORRUPT ·
 * T-IDB-NO-INDEX-AS-FULL · T-IDB-LOCALSEQ-PERSIST (reload) · P-1/P-2 measurement (stub — observation).
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

const IDB_KEY = "tenders-pipeline-full";
let moduleSeq = 0;
/** Fresh module instance (RAM state reset: coldMem, localSeq). Stub store persists on globalThis. */
async function freshCold() {
  moduleSeq += 1;
  const abs = new URL("../src/lib/storage/tenders-pipeline-cold.ts", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const spec = abs + "?phase1=" + moduleSeq;
  const mod = await import(/* @vite-ignore */ spec);
  return mod;
}
const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");

function item(id, updatedAt = "2026-09-01T00:00:00.000Z", extra = {}) {
  return { id, title: `T ${id}`, updatedAt, noticeHtml: "<p>heavy</p>", tenderDossier: { kosztorys: { rows: [{ a: 1 }] } }, ...extra };
}
function indexItem(id, seq = 7) {
  return { id, title: `T ${id}`, updatedAt: "2026-09-01T00:00:00.000Z", _lsIndex: { v: 1, seq } };
}
function validEnvelope(items, over = {}) {
  return {
    schemaVersion: 1,
    bundleRevision: 5,
    localSeq: 3,
    itemCount: items.length,
    writtenAt: "2026-09-17T08:00:00.000Z",
    maxUpdatedAt: items.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), ""),
    items,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Parser — pure (no IDB needed)
// ---------------------------------------------------------------------------
{
  installIdbStub({ mode: "ok" }).reset();
  const cold = await freshCold();
  const items = [item("a"), item("b", "2026-09-02T00:00:00.000Z")];

  // T-IDB-ENVELOPE-VALID
  const ok = cold.parsePipelineIdbEnvelope(validEnvelope(items, { writer: "test", appVersion: "0.0.0", deletedIdsRevision: "0:" }));
  assert("T-IDB-ENVELOPE-VALID status OK", ok.status === "OK", ok);
  assert("T-IDB-ENVELOPE-VALID envelope fields", ok.envelope?.localSeq === 3 && ok.envelope?.bundleRevision === 5 && ok.envelope?.itemCount === 2);
  assert("T-IDB-ENVELOPE-VALID optional fields kept", ok.envelope?.writer === "test" && ok.envelope?.appVersion === "0.0.0" && ok.envelope?.deletedIdsRevision === "0:");
  assert("T-IDB-ENVELOPE-VALID maxUpdatedAt", ok.envelope?.maxUpdatedAt === "2026-09-02T00:00:00.000Z");
  const unknownField = cold.parsePipelineIdbEnvelope(validEnvelope(items, { futureField: 1 }));
  assert("T-IDB-ENVELOPE-VALID unknown fields ignored (additive §1.9)", unknownField.status === "OK");
  const zero = cold.parsePipelineIdbEnvelope(validEnvelope([], { localSeq: 0, bundleRevision: 0 }));
  assert("T-IDB-ENVELOPE-VALID itemCount 0 is OK", zero.status === "OK" && zero.envelope?.itemCount === 0);

  // T-IDB-ENVELOPE-MISSING
  assert("T-IDB-ENVELOPE-MISSING null", cold.parsePipelineIdbEnvelope(null).status === "MISSING");
  assert("T-IDB-ENVELOPE-MISSING undefined", cold.parsePipelineIdbEnvelope(undefined).status === "MISSING");

  // T-IDB-ENVELOPE-LEGACY
  const legacy = cold.parsePipelineIdbEnvelope(items);
  assert("T-IDB-ENVELOPE-LEGACY status", legacy.status === "LEGACY_ARRAY", legacy);
  assert("T-IDB-ENVELOPE-LEGACY synthetic envelope", legacy.envelope?.localSeq === 0 && legacy.envelope?.bundleRevision === 0 && legacy.envelope?.writtenAt === "" && legacy.envelope?.writer === "legacy_array" && legacy.envelope?.itemCount === 2);
  assert("T-IDB-ENVELOPE-LEGACY != current envelope", legacy.status !== "OK");
  const legacyNoId = cold.parsePipelineIdbEnvelope([item("a"), { title: "no id" }]);
  assert("T-IDB-ENVELOPE-LEGACY item without id → CORRUPT", legacyNoId.status === "CORRUPT" && legacyNoId.reason === "item_without_id", legacyNoId);

  // T-IDB-ENVELOPE-CORRUPT
  const corruptCases = [
    ["parse_failed", "string-not-object"],
    ["parse_failed", 42],
    ["schema_version", validEnvelope(items, { schemaVersion: 2 })],
    ["schema_version", { items, itemCount: 2 }],
    ["items_not_array", validEnvelope(items, { items: "nope" })],
    ["item_count_mismatch", validEnvelope(items, { itemCount: 99 })],
    ["item_without_id", validEnvelope([item("a"), { title: "x" }], { itemCount: 2 })],
    ["item_without_id", validEnvelope([item("a"), { id: "" }], { itemCount: 2 })],
    ["duplicate_id", validEnvelope([item("a"), item("a")], { itemCount: 2 })],
    ["seq_not_finite", validEnvelope(items, { localSeq: -1 })],
    ["seq_not_finite", validEnvelope(items, { localSeq: "3" })],
    ["seq_not_finite", validEnvelope(items, { localSeq: Number.NaN })],
    ["seq_not_finite", validEnvelope(items, { bundleRevision: Number.POSITIVE_INFINITY })],
    ["seq_not_finite", validEnvelope(items, { bundleRevision: undefined })],
  ];
  for (const [reason, raw] of corruptCases) {
    const r = cold.parsePipelineIdbEnvelope(raw);
    assert(`T-IDB-ENVELOPE-CORRUPT ${reason}`, r.status === "CORRUPT" && r.reason === reason && r.envelope === null, r);
  }

  // T-IDB-INDEX-MARKER — envelope
  const idxEnv = cold.parsePipelineIdbEnvelope(validEnvelope([indexItem("a"), indexItem("b")]));
  assert("T-IDB-INDEX-MARKER envelope with INDEX items → CORRUPT item_index_marker", idxEnv.status === "CORRUPT" && idxEnv.reason === "item_index_marker", idxEnv);
  const mixedEnv = cold.parsePipelineIdbEnvelope(validEnvelope([item("a"), indexItem("b")]));
  assert("T-IDB-INDEX-MARKER mixed collection → CORRUPT item_index_marker", mixedEnv.status === "CORRUPT" && mixedEnv.reason === "item_index_marker", mixedEnv);
  // T-IDB-INDEX-MARKER — legacy array shape (INDEX must never be LEGACY_FULL)
  const idxLegacy = cold.parsePipelineIdbEnvelope([indexItem("a"), indexItem("b")]);
  assert("T-IDB-INDEX-MARKER INDEX array is NOT LEGACY_ARRAY", idxLegacy.status === "CORRUPT" && idxLegacy.reason === "item_index_marker", idxLegacy);
  // marker with any value (even null / v:2) is still a marker
  const idxWeird = cold.parsePipelineIdbEnvelope(validEnvelope([{ id: "a", _lsIndex: null }]));
  assert("T-IDB-INDEX-MARKER marker present with null value → still CORRUPT", idxWeird.status === "CORRUPT" && idxWeird.reason === "item_index_marker", idxWeird);

  // validatePipelineFullForWrite
  assert("validate FULL ok", cold.validatePipelineFullForWrite(items).ok === true);
  assert("validate not_array", cold.validatePipelineFullForWrite("x").ok === false && cold.validatePipelineFullForWrite("x").reason === "not_array");
  assert("validate item_not_object", cold.validatePipelineFullForWrite([1]).reason === "item_not_object");
  assert("validate item_without_id", cold.validatePipelineFullForWrite([{ title: "x" }]).reason === "item_without_id");
  assert("validate duplicate_id", cold.validatePipelineFullForWrite([item("a"), item("a")]).reason === "duplicate_id");
  assert("validate index_not_full", cold.validatePipelineFullForWrite([indexItem("a")]).reason === "index_not_full");
  assert("validate index_not_full wins over other reasons", cold.validatePipelineFullForWrite([indexItem("a"), indexItem("a")]).reason === "index_not_full");
  assert("validate empty array is FULL-valid", cold.validatePipelineFullForWrite([]).ok === true);
}

// ---------------------------------------------------------------------------
// Freshness — pure
// ---------------------------------------------------------------------------
{
  const cold = await freshCold();
  const items = [item("a", "2026-09-01T00:00:00.000Z"), item("b", "2026-09-02T00:00:00.000Z")];
  const env = validEnvelope(items, { bundleRevision: 5 });
  const guard = (over = {}) => ({
    schemaVersion: 1,
    bundleRevision: 5,
    bundleAt: "2026-09-17T00:00:00.000Z",
    itemCount: 2,
    deletedIdsRevision: "0:",
    items: [
      { id: "a", updatedAt: "2026-09-01T00:00:00.000Z", ikFinalBid: null },
      { id: "b", updatedAt: "2026-09-02T00:00:00.000Z", ikFinalBid: null },
    ],
    ...over,
  });

  const f1 = cold.evaluatePipelineIdbFreshness(env, guard(), []);
  assert("T-IDB-FRESHNESS FRESH", f1.freshness === "FRESH" && f1.missingIds.length === 0, f1);
  const f2 = cold.evaluatePipelineIdbFreshness(env, null, []);
  assert("T-IDB-FRESHNESS NO_REFERENCE (guard null)", f2.freshness === "NO_REFERENCE", f2);
  const f3 = cold.evaluatePipelineIdbFreshness(env, guard({ bundleRevision: 6 }), []);
  assert("T-IDB-FRESHNESS STALE_REVISION", f3.freshness === "STALE_REVISION", f3);
  const f4 = cold.evaluatePipelineIdbFreshness(env, guard({ items: [...guard().items, { id: "c", updatedAt: "2026-08-01T00:00:00.000Z", ikFinalBid: null }], itemCount: 3 }), []);
  assert("T-IDB-FRESHNESS SUBSET_MISSING_IDS", f4.freshness === "SUBSET_MISSING_IDS" && f4.missingIds.join() === "c", f4);
  const f4b = cold.evaluatePipelineIdbFreshness(env, guard({ items: [...guard().items, { id: "c", updatedAt: "2026-08-01T00:00:00.000Z", ikFinalBid: null }], itemCount: 3 }), ["c"]);
  assert("T-IDB-FRESHNESS deleted id not counted as missing", f4b.freshness === "FRESH", f4b);
  const f5 = cold.evaluatePipelineIdbFreshness(env, guard({ items: [guard().items[0], { id: "b", updatedAt: "2026-09-03T00:00:00.000Z", ikFinalBid: null }] }), []);
  assert("T-IDB-FRESHNESS STALE_UPDATED_AT", f5.freshness === "STALE_UPDATED_AT", f5);
  // order: revision before subset before updatedAt
  const f6 = cold.evaluatePipelineIdbFreshness(env, guard({ bundleRevision: 9, items: [{ id: "zzz", updatedAt: "2099-01-01T00:00:00.000Z", ikFinalBid: null }] }), []);
  assert("T-IDB-FRESHNESS order revision first", f6.freshness === "STALE_REVISION", f6);
  const f7 = cold.evaluatePipelineIdbFreshness(env, guard({ items: [{ id: "zzz", updatedAt: "2099-01-01T00:00:00.000Z", ikFinalBid: null }] }), []);
  assert("T-IDB-FRESHNESS order subset before updatedAt", f7.freshness === "SUBSET_MISSING_IDS", f7);
  // cap 50
  const many = Array.from({ length: 80 }, (_, i) => ({ id: `m${i}`, updatedAt: "2026-01-01T00:00:00.000Z", ikFinalBid: null }));
  const f8 = cold.evaluatePipelineIdbFreshness(env, guard({ items: many, itemCount: 80 }), []);
  assert("T-IDB-FRESHNESS missingIds capped at 50", f8.freshness === "SUBSET_MISSING_IDS" && f8.missingIds.length === 50, f8.missingIds.length);
  // extra local ids (envelope ⊃ guard) are not stale
  const f9 = cold.evaluatePipelineIdbFreshness(validEnvelope([...items, item("local-only", "2026-01-01T00:00:00.000Z")], { bundleRevision: 5 }), guard(), []);
  assert("T-IDB-FRESHNESS local-only ids do not make STALE", f9.freshness === "FRESH", f9);

  // T-IDB-STALE-IS-NOT-CORRUPT
  const staleParsed = cold.parsePipelineIdbEnvelope(env);
  const staleFresh = cold.evaluatePipelineIdbFreshness(staleParsed.envelope, guard({ bundleRevision: 42 }), []);
  assert("T-IDB-STALE-IS-NOT-CORRUPT parser OK", staleParsed.status === "OK");
  assert("T-IDB-STALE-IS-NOT-CORRUPT freshness STALE_REVISION", staleFresh.freshness === "STALE_REVISION");
  assert("T-IDB-STALE-IS-NOT-CORRUPT FULL items retained", staleParsed.envelope.items.length === 2 && staleParsed.envelope.items[0].noticeHtml === "<p>heavy</p>");
}

// ---------------------------------------------------------------------------
// Write + ACK (stub IDB)
// ---------------------------------------------------------------------------
{
  const idb = installIdbStub({ mode: "ok" });
  idb.reset();
  const cold = await freshCold();
  const items = [item("a"), item("b", "2026-09-02T00:00:00.000Z")];

  // T-IDB-ACK
  const r1 = await cold.setPipelineColdMemory(items, { bundleRevision: 5, writer: "test.phase1" });
  assert("T-IDB-ACK ok", r1.ok === true && r1.reason === undefined, r1);
  assert("T-IDB-ACK localSeq 1 (from 0)", r1.localSeq === 1, r1);
  assert("T-IDB-ACK bytes > 0 & ms >= 0", r1.bytes > 0 && r1.ms >= 0, r1);
  const stored = idb.getRaw(IDB_KEY);
  assert("T-IDB-ACK stored value is envelope (not array)", stored && !Array.isArray(stored.value) && stored.value.schemaVersion === 1, stored?.value && Object.keys(stored.value));
  assert("T-IDB-ACK stored envelope fields", stored.value.localSeq === 1 && stored.value.bundleRevision === 5 && stored.value.itemCount === 2 && stored.value.writer === "test.phase1" && typeof stored.value.writtenAt === "string" && stored.value.maxUpdatedAt === "2026-09-02T00:00:00.000Z");
  assert("T-IDB-ACK no _lsIndex in stored items", !stored.value.items.some((i) => "_lsIndex" in i));
  assert("T-IDB-ACK coldMem set", cold.getPipelineColdMemory() === items);
  assert("T-IDB-ACK meta", JSON.stringify(cold.getPipelineColdEnvelopeMeta()) === JSON.stringify({ localSeq: 1, bundleRevision: 5, status: "OK" }), cold.getPipelineColdEnvelopeMeta());
  assert("T-IDB-ACK availability FULL", repr.getPipelineFullAvailability() === "FULL");

  // localSeq monotonic; bundleRevision does not increase offline (no meta → last seen)
  const r2 = await cold.setPipelineColdMemory([...items, item("c")]);
  assert("T-IDB-ACK second write localSeq 2", r2.ok === true && r2.localSeq === 2, r2);
  assert("T-IDB-ACK bundleRevision unchanged offline", idb.getRaw(IDB_KEY).value.bundleRevision === 5);
  // bundleRevision lower than last seen still accepted as explicit reference (caller authority)
  const r3 = await cold.setPipelineColdMemory(items, { bundleRevision: 9 });
  assert("T-IDB-ACK explicit bundleRevision reference written", r3.ok && idb.getRaw(IDB_KEY).value.bundleRevision === 9);

  // Concurrent writes: each ACK matches its own seq (write chain)
  const [c1, c2, c3] = await Promise.all([
    cold.setPipelineColdMemory([item("x1")]),
    cold.setPipelineColdMemory([item("x1"), item("x2")]),
    cold.setPipelineColdMemory([item("x1"), item("x2"), item("x3")]),
  ]);
  assert("T-IDB-ACK concurrent writes all ACK", c1.ok && c2.ok && c3.ok, [c1, c2, c3]);
  assert("T-IDB-ACK concurrent seq strictly increasing", c1.localSeq < c2.localSeq && c2.localSeq < c3.localSeq);
  assert("T-IDB-ACK final stored = last write", idb.getRaw(IDB_KEY).value.itemCount === 3 && idb.getRaw(IDB_KEY).value.localSeq === c3.localSeq);

  // T-IDB-ACK-FAIL: idb unavailable
  {
    const idb2 = installIdbStub({ mode: "missing" });
    const cold2 = await freshCold();
    const r = await cold2.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL idb_unavailable", r.ok === false && r.reason === "idb_unavailable", r);
    assert("T-IDB-ACK-FAIL idb_unavailable — RAM still set (UI truth)", cold2.getPipelineColdMemory() === items);
    idb2.uninstall();
  }
  // T-IDB-ACK-FAIL: write fails
  {
    const idb3 = installIdbStub({ mode: "write_fail" });
    idb3.reset();
    const cold3 = await freshCold();
    const r = await cold3.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL idb_write_failed", r.ok === false && r.reason === "idb_write_failed", r);
    assert("T-IDB-ACK-FAIL idb_write_failed — nothing stored", idb3.getRaw(IDB_KEY) === undefined);
  }
  // T-IDB-ACK-FAIL: read-back fails (MISSING)
  {
    const idb4 = installIdbStub({ mode: "ok" });
    idb4.reset();
    const cold4 = await freshCold();
    idb4.onAfterPut(() => idb4.setMode("read_fail"));
    const r = await cold4.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL readback MISSING (read error) → readback_mismatch", r.ok === false && r.reason === "readback_mismatch" && r.readbackStatus === "MISSING", r);
    idb4.setMode("ok");
  }
  // T-IDB-ACK-FAIL: read-back differs (foreign write with other localSeq)
  {
    const idb5 = installIdbStub({ mode: "ok" });
    idb5.reset();
    const cold5 = await freshCold();
    let tampered = false;
    idb5.onAfterPut(() => { tampered = idb5.tamper(IDB_KEY, (v) => ({ ...v, localSeq: 999 })); });
    const r = await cold5.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL tamper applied", tampered === true);
    assert("T-IDB-ACK-FAIL readback different localSeq → readback_mismatch", r.ok === false && r.reason === "readback_mismatch" && r.readbackStatus === "OK", r);
    assert("T-IDB-ACK-FAIL mismatch does not promote meta", cold5.getPipelineColdEnvelopeMeta() === null);
  }
  // T-IDB-ACK-FAIL: read-back corrupt
  {
    const idb6 = installIdbStub({ mode: "ok" });
    idb6.reset();
    const cold6 = await freshCold();
    idb6.onAfterPut(() => idb6.tamper(IDB_KEY, (v) => ({ ...v, itemCount: 77 })));
    const r = await cold6.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL readback CORRUPT → readback_mismatch:item_count_mismatch", r.ok === false && r.reason === "readback_mismatch" && r.readbackStatus === "CORRUPT" && r.readbackReason === "item_count_mismatch", r);
  }
  // T-IDB-ACK-FAIL: read-back legacy (foreign old client overwrote with array)
  {
    const idb7 = installIdbStub({ mode: "ok" });
    idb7.reset();
    const cold7 = await freshCold();
    idb7.onAfterPut(() => idb7.tamper(IDB_KEY, (v) => v.items));
    const r = await cold7.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL readback LEGACY_ARRAY → readback_mismatch", r.ok === false && r.reason === "readback_mismatch" && r.readbackStatus === "LEGACY_ARRAY", r);
  }
  // T-IDB-ACK-FAIL: read-back index-marked
  {
    const idb8 = installIdbStub({ mode: "ok" });
    idb8.reset();
    const cold8 = await freshCold();
    idb8.onAfterPut(() => idb8.tamper(IDB_KEY, (v) => ({ ...v, items: v.items.map((i) => ({ ...i, _lsIndex: { v: 1, seq: 1 } })) })));
    const r = await cold8.setPipelineColdMemory(items);
    assert("T-IDB-ACK-FAIL readback index-marked → readback_mismatch:item_index_marker", r.ok === false && r.reason === "readback_mismatch" && r.readbackStatus === "CORRUPT" && r.readbackReason === "item_index_marker", r);
  }
}

// ---------------------------------------------------------------------------
// T-IDB-NO-INDEX-AS-FULL — writer path
// ---------------------------------------------------------------------------
{
  const idb = installIdbStub({ mode: "ok" });
  idb.reset();
  const cold = await freshCold();
  repr.setPipelineFullAvailability("UNKNOWN", "test-reset");
  const before = idb.getRaw(IDB_KEY);
  const r = await cold.setPipelineColdMemory([indexItem("a"), indexItem("b")]);
  assert("T-IDB-NO-INDEX-AS-FULL writer rejects validation_failed:index_not_full", r.ok === false && r.reason === "validation_failed" && r.validationReason === "index_not_full", r);
  assert("T-IDB-NO-INDEX-AS-FULL coldMem NOT updated", cold.getPipelineColdMemory() === null);
  assert("T-IDB-NO-INDEX-AS-FULL no IDB write", idb.getRaw(IDB_KEY) === before);
  assert("T-IDB-NO-INDEX-AS-FULL localSeq not consumed", r.localSeq === 0);
  assert("T-IDB-NO-INDEX-AS-FULL availability not promoted", repr.getPipelineFullAvailability() !== "FULL");

  // mixed collection also rejected
  const r2 = await cold.setPipelineColdMemory([item("a"), indexItem("b")]);
  assert("T-IDB-NO-INDEX-AS-FULL mixed rejected", r2.ok === false && r2.validationReason === "index_not_full" && cold.getPipelineColdMemory() === null);

  // Existing FULL in IDB must survive an INDEX write attempt (oracle b)
  const full = [item("f1"), item("f2")];
  const okWrite = await cold.setPipelineColdMemory(full, { bundleRevision: 1 });
  assert("T-IDB-NO-INDEX-AS-FULL setup FULL ack", okWrite.ok === true);
  const snapshot = JSON.stringify(idb.getRaw(IDB_KEY).value);
  const r3 = await cold.setPipelineColdMemory([indexItem("f1"), indexItem("f2")]);
  assert("T-IDB-NO-INDEX-AS-FULL INDEX after FULL rejected", r3.ok === false && r3.validationReason === "index_not_full");
  assert("T-IDB-NO-INDEX-AS-FULL IDB FULL unchanged", JSON.stringify(idb.getRaw(IDB_KEY).value) === snapshot);
  assert("T-IDB-NO-INDEX-AS-FULL coldMem still FULL", cold.getPipelineColdMemory() === full);
  // Non-index validation failure: RAM updated (UI truth), IDB untouched
  const r4 = await cold.setPipelineColdMemory([item("d"), item("d")]);
  assert("T-IDB-NO-INDEX-AS-FULL duplicate_id → RAM updated, IDB untouched", r4.reason === "validation_failed" && r4.validationReason === "duplicate_id" && cold.getPipelineColdMemory()?.length === 2 && JSON.stringify(idb.getRaw(IDB_KEY).value) === snapshot);
}

// ---------------------------------------------------------------------------
// Read / hydrate + legacy compatibility + reload persistence
// ---------------------------------------------------------------------------
{
  // MISSING
  const idb = installIdbStub({ mode: "ok" });
  idb.reset();
  {
    const cold = await freshCold();
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("hydrate MISSING", h.status === "MISSING" && h.items === null && h.envelope === null, h);
    assert("hydrate MISSING adapter → null", (await cold.hydratePipelineColdFromIdb()) === null);
    assert("hydrate MISSING meta", JSON.stringify(cold.getPipelineColdEnvelopeMeta()) === JSON.stringify({ localSeq: 0, bundleRevision: 0, status: "MISSING" }));
  }
  // LEGACY_ARRAY seeded (today's MAIN shape) — readable, not deleted, migrated on first write
  {
    idb.reset();
    const legacyItems = [item("L1"), item("L2", "2026-05-05T00:00:00.000Z")];
    idb.seed(IDB_KEY, legacyItems);
    const cold = await freshCold();
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("T-IDB-ENVELOPE-LEGACY hydrate status LEGACY_ARRAY", h.status === "LEGACY_ARRAY" && h.items?.length === 2, h.status);
    assert("T-IDB-ENVELOPE-LEGACY adapter returns items (MAIN contract)", (await cold.hydratePipelineColdFromIdb())?.length === 2);
    assert("T-IDB-ENVELOPE-LEGACY coldMem set", cold.getPipelineColdMemory()?.length === 2);
    assert("T-IDB-ENVELOPE-LEGACY legacy data untouched by read", Array.isArray(idb.getRaw(IDB_KEY).value));
    assert("T-IDB-ENVELOPE-LEGACY meta localSeq 0", cold.getPipelineColdEnvelopeMeta().localSeq === 0 && cold.getPipelineColdEnvelopeMeta().status === "LEGACY_ARRAY");
    const w = await cold.setPipelineColdMemory(legacyItems, { bundleRevision: 3, writer: "test.migrate" });
    assert("T-IDB-ENVELOPE-LEGACY first write → envelope localSeq 1 (§8.3)", w.ok && w.localSeq === 1 && !Array.isArray(idb.getRaw(IDB_KEY).value) && idb.getRaw(IDB_KEY).value.schemaVersion === 1);
  }
  // LEGACY_ARRAY empty → adapter null (MAIN semantics)
  {
    idb.reset();
    idb.seed(IDB_KEY, []);
    const cold = await freshCold();
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("legacy empty array → LEGACY_ARRAY, items null", h.status === "LEGACY_ARRAY" && h.items === null);
    assert("legacy empty adapter → null", (await cold.hydratePipelineColdFromIdb()) === null);
  }
  // CORRUPT → ignored, not deleted
  {
    idb.reset();
    idb.seed(IDB_KEY, { schemaVersion: 1, itemCount: 5, items: [item("a")], localSeq: 4, bundleRevision: 1 });
    const cold = await freshCold();
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("hydrate CORRUPT status + reason", h.status === "CORRUPT" && h.reason === "item_count_mismatch" && h.items === null, h);
    assert("hydrate CORRUPT record not deleted", idb.getRaw(IDB_KEY) !== undefined);
    assert("hydrate CORRUPT adapter → null", (await cold.hydratePipelineColdFromIdb()) === null);
    assert("hydrate CORRUPT localSeq reset to 0", cold.getPipelineColdEnvelopeMeta().localSeq === 0);
  }
  // CORRUPT via INDEX marker in IDB (someone wrote INDEX as FULL) → never hydrated as FULL
  {
    idb.reset();
    idb.seed(IDB_KEY, { schemaVersion: 1, itemCount: 2, items: [indexItem("a"), indexItem("b")], localSeq: 4, bundleRevision: 1 });
    const cold = await freshCold();
    repr.setPipelineFullAvailability("UNKNOWN", "test-reset");
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("T-IDB-NO-INDEX-AS-FULL hydrate INDEX envelope → CORRUPT item_index_marker", h.status === "CORRUPT" && h.reason === "item_index_marker" && h.items === null, h);
    assert("T-IDB-NO-INDEX-AS-FULL hydrate coldMem null", cold.getPipelineColdMemory() === null);
    assert("T-IDB-NO-INDEX-AS-FULL availability not FULL", repr.getPipelineFullAvailability() !== "FULL");
    idb.reset();
    idb.seed(IDB_KEY, [indexItem("a")]);
    const cold2 = await freshCold();
    const h2 = await cold2.hydratePipelineColdEnvelopeFromIdb();
    assert("T-IDB-NO-INDEX-AS-FULL legacy-shaped INDEX array → CORRUPT", h2.status === "CORRUPT" && h2.reason === "item_index_marker" && cold2.getPipelineColdMemory() === null, h2);
  }
  // OK envelope + reload: localSeq continues from stored envelope (T-IDB-LOCALSEQ-PERSIST)
  {
    idb.reset();
    const coldA = await freshCold();
    const w1 = await coldA.setPipelineColdMemory([item("p1")], { bundleRevision: 11 });
    const w2 = await coldA.setPipelineColdMemory([item("p1"), item("p2")]);
    assert("persist writes ack", w1.ok && w2.ok && w2.localSeq === 2);
    const coldB = await freshCold(); // "reload": new module instance, same stub store
    const h = await coldB.hydratePipelineColdEnvelopeFromIdb();
    assert("T-IDB-LOCALSEQ-PERSIST hydrate OK after reload", h.status === "OK" && h.items?.length === 2 && h.envelope.localSeq === 2 && h.envelope.bundleRevision === 11, h.status);
    assert("T-IDB-LOCALSEQ-PERSIST meta from envelope", JSON.stringify(coldB.getPipelineColdEnvelopeMeta()) === JSON.stringify({ localSeq: 2, bundleRevision: 11, status: "OK" }));
    const w3 = await coldB.setPipelineColdMemory([item("p1"), item("p2"), item("p3")]);
    assert("T-IDB-LOCALSEQ-PERSIST next write localSeq 3 (monotonic across reload)", w3.ok && w3.localSeq === 3 && idb.getRaw(IDB_KEY).value.localSeq === 3);
    assert("T-IDB-LOCALSEQ-PERSIST bundleRevision reference carried (11, not increased)", idb.getRaw(IDB_KEY).value.bundleRevision === 11);
    // hydrate cached after coldMem present
    const h2 = await coldB.hydratePipelineColdEnvelopeFromIdb();
    assert("hydrate cached returns coldMem", h2.items === coldB.getPipelineColdMemory() && h2.status === "OK");
  }
  // Write-before-hydrate: RAM stays session truth; status reflects IDB; localSeq never regresses below stored
  {
    idb.reset();
    idb.seed(IDB_KEY, { schemaVersion: 1, bundleRevision: 4, localSeq: 10, itemCount: 1, writtenAt: "", maxUpdatedAt: "", items: [item("old")] });
    const cold = await freshCold();
    const ramItems = [item("ram1"), item("ram2")];
    installIdbStub({ mode: "missing" });
    const w0 = await cold.setPipelineColdMemory(ramItems);
    assert("write-before-hydrate: idb_unavailable ack fail", w0.ok === false && w0.reason === "idb_unavailable" && w0.localSeq === 1);
    installIdbStub({ mode: "ok" }); // stub store persists on globalThis
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("write-before-hydrate: RAM wins (coldMem not replaced)", h.items === ramItems && cold.getPipelineColdMemory() === ramItems);
    assert("write-before-hydrate: status from IDB (OK) + envelope exposed", h.status === "OK" && h.envelope?.localSeq === 10);
    const w1 = await cold.setPipelineColdMemory(ramItems);
    assert("write-before-hydrate: next localSeq > stored (11, never 2)", w1.ok && w1.localSeq === 11 && idb.getRaw(IDB_KEY).value.localSeq === 11, w1);
    assert("write-before-hydrate: bundleRevision reference adopted from IDB (4)", idb.getRaw(IDB_KEY).value.bundleRevision === 4);
  }
  // MAIN-compat: indexedDB undefined → hydrate MISSING, no throw; strip still works
  {
    installIdbStub({ mode: "missing" });
    const cold = await freshCold();
    const h = await cold.hydratePipelineColdEnvelopeFromIdb();
    assert("no indexedDB → MISSING without throw", h.status === "MISSING");
    const lean = cold.stripTenderPipelineForLocalStorage([item("s1")]);
    assert("strip unchanged", !lean[0].noticeHtml && lean[0].tenderDossier.kosztorys._coldRowsCount === 1);
  }
}

// ---------------------------------------------------------------------------
// P-1 / P-2 — measurement on stub (observation only; real IDB in browser is Phase 3 GATE)
// ---------------------------------------------------------------------------
{
  const idb = installIdbStub({ mode: "ok" });
  idb.reset();
  const cold = await freshCold();
  const N = 505;
  const heavy = "x".repeat(4000);
  const dataset = Array.from({ length: N }, (_, i) => item(`ds-${i}`, `2026-0${1 + (i % 9)}-01T00:00:00.000Z`, {
    noticeHtml: `<html>${heavy}</html>`,
    tenderDossier: { kosztorys: { rows: Array.from({ length: 20 }, (_, r) => ({ lp: r, opis: heavy.slice(0, 200), ilosc: r * 1.5 })) } },
  }));
  const writes = [];
  let bytes = 0;
  for (let k = 0; k < 5; k++) {
    const r = await cold.setPipelineColdMemory(dataset, { bundleRevision: 1 });
    assert(`P-1 write ${k} ack`, r.ok === true, r);
    writes.push(r.ms);
    bytes = r.bytes;
  }
  const reads = [];
  for (let k = 0; k < 5; k++) {
    const fresh = await freshCold();
    const t0 = performance.now();
    const h = await fresh.hydratePipelineColdEnvelopeFromIdb();
    reads.push(performance.now() - t0);
    assert(`P-2 read ${k} OK`, h.status === "OK" && h.items?.length === N);
  }
  const p95 = (arr) => [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.ceil(arr.length * 0.95) - 1)];
  console.log(`P-1 (stub) write+ack envelope N=${N} bytes=${bytes} ms=[${writes.map((m) => m.toFixed(1)).join(", ")}] p95=${p95(writes).toFixed(1)}`);
  console.log(`P-2 (stub) read+parse N=${N} ms=[${reads.map((m) => m.toFixed(1)).join(", ")}] p95=${p95(reads).toFixed(1)}`);
  assert("P-1 (stub) p95 < 300ms", p95(writes) < 300, p95(writes));
  assert("P-2 (stub) p95 < 200ms", p95(reads) < 200, p95(reads));
}

console.log(`\n=== STORAGE-TIER1 Phase 1 IDB envelope: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) {
  console.log("Failures:", failures);
  process.exit(1);
}
