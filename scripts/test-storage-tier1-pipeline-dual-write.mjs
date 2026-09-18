/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 3: DUAL WRITE (NEW-04, canonical writer `saveTendersPipelineLocal`).
 * Design Freeze v1.1 §3 (writer), §2.4 (detectPipelineLsKind), §A.5.2 (resolvePipelineFullSource), §7 A (quota).
 *
 * Sekwencja testów jest ZAMIERZONA: FULL-source (CASE F/G/J) biegnie PRZED pierwszym zapisem writera,
 * bo `coldMem` (RAM) modułu cold nie ma resetu produkcyjnego — po pierwszym zapisie RAM = prawda sesji.
 *
 * Run: npx vite-node scripts/test-storage-tier1-pipeline-dual-write.mjs
 */

import { installIdbStub } from "./_lib/idb-memory-stub.mjs";

const PIPELINE_KEY = "kw-tenders-pipeline";
const SETTINGS_KEY = "kw-app-settings";

// ---------------------------------------------------------------------------
// Harness — localStorage with fault injection (only for the pipeline key) + spies
// ---------------------------------------------------------------------------

const ls = {
  _m: new Map(),
  failMode: null, // null | "quota" | "error"
  setCalls: [],
  removeCalls: [],
  setItem(k, v) {
    const key = String(k);
    if (key === PIPELINE_KEY) {
      this.setCalls.push({ key, value: String(v), at: Date.now(), idbSeqAtWrite: idbSeqNow() });
      if (this.failMode === "quota") throw new DOMException("stub quota", "QuotaExceededError");
      if (this.failMode === "error") throw new Error("stub ls error");
    }
    this._m.set(key, String(v));
  },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this.removeCalls.push(String(k)); this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};
globalThis.localStorage = ls;

let fetchCalls = 0;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error("stub: cloud must not be called by the local writer"); };

let pass = 0;
let fail = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; failures.push(name); console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail) : ""); }
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const lsRaw = () => ls.getItem(PIPELINE_KEY);
const lsParsed = () => { const r = lsRaw(); return r == null ? null : JSON.parse(r); };
// Phase 11 HARD VERSION GATE — flaga ON wymaga zadeklarowanego minimum ≤ APP_VERSION klienta.
const { APP_VERSION: HARNESS_APP_VERSION } = await import("../src/lib/app-version.ts");
const setFlag = (on) => ls._m.set(SETTINGS_KEY, JSON.stringify({
  pipelineLocalIndexV1: on,
  pipelineLocalIndexMinAppVersion: HARNESS_APP_VERSION,
}));
const history = () => globalThis.__WG_STORAGE__.history();
const notesSince = (from) => history().slice(from).map((e) => e.note);

const idb = installIdbStub({ mode: "ok" });
idb.reset();
function idbRawEnvelope() { return idb.getRaw("tenders-pipeline-full")?.value; }
function idbSeqNow() { const v = idbRawEnvelope(); return v && typeof v === "object" && !Array.isArray(v) ? v.localSeq : null; }

const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");
const bzp = await import("../src/lib/tenders-bzp.ts");
const settings = await import("../src/lib/app-settings.ts");

const {
  detectPipelineLsKind,
  parsePipelineIdbEnvelope,
  validatePipelineFullForWrite,
  getPipelineColdMemory,
  getPipelineColdEnvelopeMeta,
  PIPELINE_INDEX_MARKER_FIELD,
} = cold;
const { saveTendersPipelineLocal, awaitPipelineLocalWriteSettled, resolvePipelineFullSource, TENDERS_PIPELINE_KEY } = bzp;

assert("harness: key constant", TENDERS_PIPELINE_KEY === PIPELINE_KEY);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullItem(n, extra = {}) {
  const id = `t-${String(n).padStart(4, "0")}`;
  return {
    id,
    bzpNumber: `2026/BZP ${n}`,
    noticeNumber: `N-${n}`,
    title: `Remont lokalu ${n}`,
    organizationName: "Wrocławskie Mieszkania",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45453000-7",
    publicationDate: "2026-09-01",
    submittingOffersDate: "2026-09-20T10:00:00.000Z",
    orderType: "roboty budowlane",
    tenderId: `ocds-${n}`,
    moIdentifier: `MO-${n}`,
    status: "new",
    notes: "prywatna notatka — FULL only",
    relevanceScore: 40 + (n % 50),
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "2026-09-01T08:00:00.000Z",
    updatedAt: `2026-09-1${n % 10}T09:00:00.000Z`,
    ezamowieniaUrl: `https://ezamowienia.gov.pl/${n}`,
    swzAnalysis: { estimatedValuePln: 120000 + n, estimatedValueRaw: `${120000 + n} zł`, wadiumPln: 2000, wadiumRaw: "2 000 zł", implementationDays: 60, profitabilityHint: "good", technicalRequirements: ["tr1"], costLines: [{ name: "c" }] },
    noticeHtml: `<html><body>${"x".repeat(1500)}</body></html>`,
    tenderDossier: { kosztorys: { ok: true, rows: Array.from({ length: 25 }, (_, i) => ({ lp: i + 1, name: `poz ${i}` })), rowCount: 25 }, scanSummary: { artifacts: [{ snapshot: { big: "…" } }] } },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"] },
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: false },
    ikFinalBid: { v: 1, finalBidPln: 104500 + n },
    changeMonitor: { events: [{ at: "2026-09-10", kind: "docs_changed" }] },
    ...extra,
  };
}
const FULL = Array.from({ length: 9 }, (_, i) => fullItem(i + 1));
const FULL_JSON = JSON.stringify(FULL);

function deepFreeze(v) {
  if (v && typeof v === "object" && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) deepFreeze(v[k]); }
  return v;
}
function collectKeysDeep(value, out = new Set()) {
  if (Array.isArray(value)) { for (const v of value) collectKeysDeep(v, out); return out; }
  if (value && typeof value === "object") { for (const [k, v] of Object.entries(value)) { out.add(k); collectKeysDeep(v, out); } }
  return out;
}
const HEAVY = ["noticeHtml", "tenderDossier", "kosztorys", "rows", "scanSummary", "snapshot", "changeMonitor", "events", "notes", "reasons", "winnerName", "amountPln", "technicalRequirements", "costLines"];

// ===========================================================================
// PART A — §2.4 detectPipelineLsKind (pure) + §A.5.2 resolvePipelineFullSource
//          (CASE F / G / J) — BEFORE any writer call (coldMem = null).
// ===========================================================================

console.log("\n== PART A: detectPipelineLsKind / resolvePipelineFullSource (pre-writer) ==");

{
  const lean = FULL.map((it) => ({ ...it, noticeHtml: undefined, tenderDossier: { kosztorys: { ok: true, rows: [], rowCount: 25, _coldRowsCount: 25 } } }));
  const leanNoMarker = FULL.map((it) => { const { noticeHtml, ...rest } = it; return { ...rest, tenderDossier: { kosztorys: { ok: true, rows: [], rowCount: 25 } } }; });
  const index = cold.buildTenderPipelineLsIndex(FULL, 7);

  assert("§2.4 MISSING", detectPipelineLsKind(null).kind === "MISSING");
  assert("§2.4 CORRUPT parse_failed", sameJson(detectPipelineLsKind("{nope"), { kind: "CORRUPT", reason: "parse_failed" }));
  assert("§2.4 CORRUPT not_array", sameJson(detectPipelineLsKind('{"a":1}'), { kind: "CORRUPT", reason: "not_array" }));
  assert("§2.4 EMPTY", detectPipelineLsKind("[]").kind === "EMPTY");
  const di = detectPipelineLsKind(JSON.stringify(index));
  assert("§2.4 INDEX + seq", di.kind === "INDEX" && di.seq === 7 && di.items.length === FULL.length, di);
  const mixed = [...index.slice(0, 3), ...FULL.slice(3, 5)];
  assert("§2.4 CORRUPT index_mixed (mieszane)", sameJson(detectPipelineLsKind(JSON.stringify(mixed)), { kind: "CORRUPT", reason: "index_mixed" }));
  const diffSeq = [...index.slice(0, 3), ...cold.buildTenderPipelineLsIndex(FULL.slice(3), 8)];
  assert("§2.4 CORRUPT index_mixed (różne seq)", detectPipelineLsKind(JSON.stringify(diffSeq)).reason === "index_mixed");
  assert("§2.4 LEGACY_LEAN (_coldRowsCount)", detectPipelineLsKind(JSON.stringify(lean)).kind === "LEGACY_LEAN");
  assert("§2.4 LEGACY_LEAN (brak noticeHtml ∧ rows=[] ∧ rowCount>0)", detectPipelineLsKind(JSON.stringify(leanNoMarker)).kind === "LEGACY_LEAN");
  assert("§2.4 LEGACY_FULL", detectPipelineLsKind(FULL_JSON).kind === "LEGACY_FULL");
  const fullNoRows = FULL.map((it) => ({ ...it, tenderDossier: { kosztorys: { ok: true, rows: [], rowCount: 25 } } }));
  assert("§2.4 FULL z noticeHtml ∧ rows=[] ⇒ LEGACY_FULL (warunek ∀ brak noticeHtml)", detectPipelineLsKind(JSON.stringify(fullNoRows)).kind === "LEGACY_FULL");
  assert("§2.4 nie mutuje INDEX/nie zdejmuje markera", di.items.every((it) => it._lsIndex && it._lsIndex.seq === 7));

  // --- resolvePipelineFullSource chain (RAM null here) ---
  assert("PRE: coldMem null przed writerem", getPipelineColdMemory() === null);

  ls._m.delete(PIPELINE_KEY);
  let r = await resolvePipelineFullSource();
  assert("A.5.2 IDB MISSING + LS MISSING ⇒ EMPTY", r.status === "EMPTY", r);

  ls._m.set(PIPELINE_KEY, "[]");
  r = await resolvePipelineFullSource();
  assert("A.5.2 IDB MISSING + LS EMPTY ⇒ EMPTY", r.status === "EMPTY", r);

  // CASE J-prime / A.7 CASE 2: LS INDEX + IDB MISSING ⇒ NO_FULL (INDEX nigdy jako FULL)
  ls._m.set(PIPELINE_KEY, JSON.stringify(index));
  r = await resolvePipelineFullSource();
  assert("A.5.2 LS INDEX + IDB MISSING ⇒ NO_FULL", r.status === "NO_FULL" && r.lsKind === "INDEX" && r.idbStatus === "MISSING", r.status);
  assert("A.5.2 NO_FULL niesie INDEX jako id-set (nie items FULL)", Array.isArray(r.index) && r.index.length === FULL.length && r.index.every((it) => it._lsIndex));
  assert("A.5.2 NO_FULL nie ustawia coldMem", getPipelineColdMemory() === null);

  ls._m.set(PIPELINE_KEY, "{corrupt");
  r = await resolvePipelineFullSource();
  assert("A.5.2 LS CORRUPT + IDB MISSING ⇒ NO_FULL index=null", r.status === "NO_FULL" && r.index === null && r.lsKind === "CORRUPT");

  // CASE G: LEGACY_LEAN → FULL wyłącznie z JAWNĄ provenance (kontrakt §A.4/§A.5.2), nie „cicha promocja"
  ls._m.set(PIPELINE_KEY, JSON.stringify(lean));
  r = await resolvePipelineFullSource();
  assert("CASE G LS LEGACY_LEAN ⇒ FULL provenance=LS_LEGACY_LEAN (jawne)", r.status === "FULL" && r.provenance === "LS_LEGACY_LEAN");
  assert("CASE G items = LEAN 1:1 (bez rekonstrukcji heavy)", r.status === "FULL" && r.items.length === lean.length && r.items.every((it) => it.tenderDossier.kosztorys._coldRowsCount === 25 && !it.noticeHtml));

  // CASE F: LEGACY FULL z LS
  ls._m.set(PIPELINE_KEY, FULL_JSON);
  r = await resolvePipelineFullSource();
  assert("CASE F LS LEGACY_FULL ⇒ FULL provenance=LS_LEGACY_FULL", r.status === "FULL" && r.provenance === "LS_LEGACY_FULL" && r.items.length === FULL.length);
  assert("CASE F LS-only nie ustawia coldMem (RAM tylko przez writer/hydrate IDB)", getPipelineColdMemory() === null);

  // CASE F (IDB): LEGACY_ARRAY w IDB ma pierwszeństwo przed LS (D8) — ustawia coldMem (hydrate)
  ls._m.set(PIPELINE_KEY, JSON.stringify(index)); // LS INDEX obok
  idb.seed("tenders-pipeline-full", FULL.slice(0, 5));
  r = await resolvePipelineFullSource();
  assert("CASE F IDB LEGACY_ARRAY + LS INDEX ⇒ FULL provenance=IDB_LEGACY_ARRAY (nie INDEX)", r.status === "FULL" && r.provenance === "IDB_LEGACY_ARRAY" && r.items.length === 5 && r.items.every((it) => !it._lsIndex));
  assert("CASE F po hydrate coldMem = IDB items", getPipelineColdMemory() !== null && getPipelineColdMemory().length === 5);

  // CASE J: valid IDB pozostaje authority; LS INDEX (inny seq) nie „promuje" — RAM/IDB wins
  r = await resolvePipelineFullSource();
  assert("CASE J RAM FULL wins ⇒ provenance=RAM, LS INDEX ignorowany jako źródło FULL", r.status === "FULL" && r.provenance === "RAM" && r.items.every((it) => !it._lsIndex));
  assert("CASE J LS INDEX nietknięty przez resolver (brak zapisu/removeItem)", detectPipelineLsKind(lsRaw()).kind === "INDEX" && ls.removeCalls.length === 0);
  assert("CASE J zero fetch (cloud) w resolverze", fetchCalls === 0);

  // reset LS to MISSING for writer part; IDB stays with legacy array (writer will migrate to envelope §8.3)
  ls._m.delete(PIPELINE_KEY);
}

// ===========================================================================
// PART B — writer: compat mode (flag OFF, default) — Phase 3 ⊇ MAIN
// ===========================================================================

console.log("\n== PART B: flag OFF (compat) ==");

{
  ls._m.delete(SETTINGS_KEY);
  assert("NEW-03 default OFF (brak kw-app-settings)", settings.isPipelineLocalIndexEnabled() === false);
  assert("NEW-03 defaultAppSettings().pipelineLocalIndexV1 === false", settings.defaultAppSettings().pipelineLocalIndexV1 === false);
  ls._m.set(SETTINGS_KEY, JSON.stringify({ pipelineLocalIndexV1: "true" }));
  assert("NEW-03 parse === true tylko dla boolean true", settings.isPipelineLocalIndexEnabled() === false);
  ls._m.delete(SETTINGS_KEY);

  const h0 = history().length;
  ls.setCalls.length = 0;
  saveTendersPipelineLocal(FULL);
  assert("compat: LEAN zapisany SYNCHRONICZNIE (bez czekania na ACK)", ls.setCalls.length === 1 && detectPipelineLsKind(lsRaw()).kind === "LEGACY_LEAN");
  assert("compat: LS nie zawiera _lsIndex ani noticeHtml, rows puste z _coldRowsCount", (() => { const p = lsParsed(); return p.every((it) => !it._lsIndex && !it.noticeHtml && it.tenderDossier.kosztorys.rows.length === 0 && it.tenderDossier.kosztorys._coldRowsCount === 25); })());
  const res = await awaitPipelineLocalWriteSettled();
  assert("compat: IDB envelope ACK ok (migracja LEGACY_ARRAY → envelope §8.3)", res.idb.ok === true && res.idb.localSeq >= 1 && res.ls.mode === "compat" && res.ls.ok === true, res);
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("compat: IDB = envelope OK, itemCount = FULL.length, items FULL (noticeHtml zachowany)", env.status === "OK" && env.envelope.itemCount === FULL.length && env.envelope.items.every((it) => it.noticeHtml && !it._lsIndex));
  assert("compat: telemetria lean + envelope:ack", notesSince(h0).includes("lean") && notesSince(h0).some((n) => n && n.startsWith("envelope:ack:seq=")));
  assert("compat: coldMem === items (RAM sync)", getPipelineColdMemory() === FULL);

  // compat + LS quota: IDB FULL pozostaje durable (DF §3.3 B), LS bez zmian
  const before = lsRaw();
  const seqBefore = idbSeqNow();
  ls.failMode = "quota";
  const h1 = history().length;
  saveTendersPipelineLocal(FULL.slice(0, 7));
  ls.failMode = null;
  const resQ = await awaitPipelineLocalWriteSettled();
  assert("compat+quota: LS poprzednia zawartość zachowana (brak removeItem, brak pustki)", lsRaw() === before && ls.removeCalls.length === 0);
  assert("compat+quota: IDB envelope nowy seq, itemCount=7 (FULL durable)", resQ.idb.ok && resQ.idb.localSeq === seqBefore + 1 && parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.itemCount === 7);
  assert("compat+quota: ls {compat, ok:false, quota} + telemetria quota_exceeded_lean", resQ.ls.mode === "compat" && resQ.ls.ok === false && resQ.ls.reason === "quota" && notesSince(h1).includes("quota_exceeded_lean"));

  // compat + IDB write FAIL: LS lean nadal pisany jak MAIN (DF §3.3 D), brak false success
  idb.setMode("write_fail");
  const h2 = history().length;
  saveTendersPipelineLocal(FULL);
  const resF = await awaitPipelineLocalWriteSettled();
  idb.setMode("ok");
  assert("compat+IDB fail: idb.ok=false reason=idb_write_failed; LS lean zapisany (MAIN parity)", resF.idb.ok === false && resF.idb.reason === "idb_write_failed" && resF.ls.mode === "compat" && resF.ls.ok === true && detectPipelineLsKind(lsRaw()).kind === "LEGACY_LEAN");
  assert("compat+IDB fail: IDB pozostał na poprzednim envelope (itemCount=7), telemetria envelope:idb_write_failed", parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.itemCount === 7 && notesSince(h2).includes("envelope:idb_write_failed"));
}

// ===========================================================================
// PART C — writer: INDEX mode (flag ON) — IDB-first, ACK, INDEX, quota
// ===========================================================================

console.log("\n== PART C: flag ON (INDEX after ACK) ==");

setFlag(true);
assert("NEW-03 flag ON przez kw-app-settings", settings.isPipelineLocalIndexEnabled() === true);

// --- CASE A / T-DUALWRITE-IDB-FIRST / INDEX-MARKER / COUNT / FULL-IMMUTABLE / ONE-SERIALIZATION ---
{
  const FROZEN = deepFreeze(JSON.parse(FULL_JSON));
  const beforeLs = lsRaw();
  const h0 = history().length;
  ls.setCalls.length = 0;

  const origStringify = JSON.stringify;
  const stringifyCalls = [];
  JSON.stringify = function (v, ...rest) { stringifyCalls.push(v); return origStringify.call(JSON, v, ...rest); };
  saveTendersPipelineLocal(FROZEN);
  assert("IDB-FIRST: synchronicznie po save LS NIETKNIĘTY (INDEX czeka na ACK)", ls.setCalls.length === 0 && lsRaw() === beforeLs);
  const res = await awaitPipelineLocalWriteSettled();
  JSON.stringify = origStringify;

  assert("CASE A: idb.ok ∧ ls.mode=index ∧ ls.ok", res.idb.ok === true && res.ls.mode === "index" && res.ls.ok === true && res.ls.bytes > 0, res);
  const seq = res.idb.localSeq;
  assert("IDB-FIRST: dokładnie 1 setItem, wykonany gdy IDB już miał envelope seq=N", ls.setCalls.length === 1 && ls.setCalls[0].idbSeqAtWrite === seq, ls.setCalls.map((c) => c.idbSeqAtWrite));
  const notes = notesSince(h0);
  const ackIdx = notes.findIndex((n) => n === `envelope:ack:seq=${seq}`);
  const idxIdx = notes.findIndex((n) => n === `index_written:seq=${seq}`);
  assert("IDB-FIRST: telemetria envelope:ack PRZED index_written (ten sam seq)", ackIdx >= 0 && idxIdx > ackIdx, notes);

  const lsIdx = lsParsed();
  assert("INDEX-MARKER: każdy item LS ma _lsIndex {v:1, seq:N}", lsIdx.length === FULL.length && lsIdx.every((it) => it[PIPELINE_INDEX_MARKER_FIELD] && it._lsIndex.v === 1 && it._lsIndex.seq === seq));
  assert("INDEX-MARKER: classify(LS) === INDEX ∧ detect === INDEX seq N", repr.classifyPipelineRepresentation(lsIdx) === "INDEX" && detectPipelineLsKind(lsRaw()).seq === seq);
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("COUNT: envelope.itemCount === FULL.length === INDEX.length", env.status === "OK" && env.envelope.itemCount === FULL.length && lsIdx.length === FULL.length);
  assert("SEQUENCE: envelope.localSeq === INDEX marker seq", env.envelope.localSeq === seq);
  assert("NO-FULL-LS: LS bez heavy (noticeHtml/rows/events/snapshot/notes…)", (() => { const keys = collectKeysDeep(lsIdx); return HEAVY.every((k) => !keys.has(k)); })());
  assert("NO-FULL-LS: payload INDEX znacząco mniejszy niż FULL", lsRaw().length < FULL_JSON.length / 2);
  assert("NO-FULL-LS: LS nie przechodzi FULL validatora (index_not_full)", validatePipelineFullForWrite(lsIdx).ok === false && validatePipelineFullForWrite(lsIdx).reason === "index_not_full");
  assert("FULL-IMMUTABLE: deep-frozen FULL zapisany bez throw, JSON FULL niezmieniony, brak _lsIndex w FULL", JSON.stringify(FROZEN) === FULL_JSON && FROZEN.every((it) => !("_lsIndex" in it)));
  assert("FULL-IMMUTABLE: coldMem === ta sama referencja FULL (bez kopii/konwersji)", getPipelineColdMemory() === FROZEN);
  assert("IDB FULL: envelope.items z noticeHtml/rows (FULL), bez _lsIndex", env.envelope.items.every((it) => it.noticeHtml && it.tenderDossier.kosztorys.rows.length === 25 && !it._lsIndex));

  const fullSerializations = stringifyCalls.filter((v) => (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.items)) || (Array.isArray(v) && v.some((it) => it && it.noticeHtml)));
  const indexSerializations = stringifyCalls.filter((v) => Array.isArray(v) && v.length > 0 && v.every((it) => it && it._lsIndex));
  assert("ONE-SERIALIZATION: dokładnie 1 serializacja FULL (envelope bytes) + 1 serializacja INDEX (payload)", fullSerializations.length === 1 && indexSerializations.length === 1, { full: fullSerializations.length, index: indexSerializations.length, total: stringifyCalls.length });
  assert("ONE-SERIALIZATION: brak innych serializacji w hot-path writera", stringifyCalls.length === 2, stringifyCalls.length);
}

// --- T-DUALWRITE-SEQUENCE (monotonic across two writes) ---
{
  const before = detectPipelineLsKind(lsRaw()).seq;
  saveTendersPipelineLocal(FULL.slice(0, 8));
  const r1 = await awaitPipelineLocalWriteSettled();
  saveTendersPipelineLocal(FULL.slice(0, 6));
  const r2 = await awaitPipelineLocalWriteSettled();
  assert("SEQUENCE: monotoniczny localSeq (N < N+1 < N+2)", before < r1.idb.localSeq && r1.idb.localSeq < r2.idb.localSeq);
  assert("SEQUENCE: LS marker seq == envelope seq po ostatnim zapisie (6 poz.)", detectPipelineLsKind(lsRaw()).seq === r2.idb.localSeq && parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.localSeq === r2.idb.localSeq && lsParsed().length === 6);
  assert("SEQUENCE: meta RAM localSeq zgodny", getPipelineColdEnvelopeMeta().localSeq === r2.idb.localSeq);
}

// --- CASE E / T-DUALWRITE-INDEX-NEVER-IDB-FULL: INDEX input rejected; IDB + LS + RAM untouched ---
{
  const indexInput = lsParsed();
  const idbBefore = JSON.stringify(idbRawEnvelope());
  const lsBefore = lsRaw();
  const ramBefore = getPipelineColdMemory();
  const seqBefore = idbSeqNow();
  const h0 = history().length;
  ls.setCalls.length = 0;
  saveTendersPipelineLocal(indexInput);
  const res = await awaitPipelineLocalWriteSettled();
  assert("CASE E: writer odrzuca INDEX — idb.reason=validation_failed/index_not_full", res.idb.ok === false && res.idb.reason === "validation_failed" && res.idb.validationReason === "index_not_full", res.idb);
  assert("CASE E: ls.mode=skipped, 0 setItem, LS identyczny", res.ls.mode === "skipped" && ls.setCalls.length === 0 && lsRaw() === lsBefore);
  assert("CASE E: IDB envelope bajt-w-bajt bez zmian, seq bez zmian", JSON.stringify(idbRawEnvelope()) === idbBefore && idbSeqNow() === seqBefore);
  assert("CASE E: coldMem NIE nadpisany INDEX-em (RAM = FULL)", getPipelineColdMemory() === ramBefore && ramBefore.every((it) => !it._lsIndex));
  assert("CASE E: telemetria writer_validation_failed:index_not_full + ls_skipped", notesSince(h0).includes("writer_validation_failed:index_not_full") && notesSince(h0).some((n) => n && n.startsWith("ls_skipped:validation:index_not_full")));
  assert("INDEX-NEVER-IDB-FULL: envelope zbudowany z INDEX ⇒ parser CORRUPT item_index_marker", parsePipelineIdbEnvelope({ schemaVersion: 1, bundleRevision: 0, localSeq: 99, itemCount: indexInput.length, writtenAt: "", maxUpdatedAt: "", items: indexInput }).reason === "item_index_marker");
  assert("INDEX-NEVER-IDB-FULL: surowa tablica INDEX w IDB ⇒ CORRUPT (nie LEGACY_ARRAY)", parsePipelineIdbEnvelope(indexInput).status === "CORRUPT");

  // inne błędy walidacji (duplikat id) ⇒ brak LS write (INDEX i compat), RAM aktualizowany (§3.1)
  const dup = [FULL[0], FULL[0]];
  saveTendersPipelineLocal(dup);
  const resD = await awaitPipelineLocalWriteSettled();
  assert("§3.1 duplicate_id ⇒ brak IDB/LS write, ls.skipped", resD.idb.reason === "validation_failed" && resD.idb.validationReason === "duplicate_id" && resD.ls.mode === "skipped" && lsRaw() === lsBefore && idbSeqNow() === seqBefore);
  // przywróć RAM FULL dla dalszych testów
  saveTendersPipelineLocal(FULL);
  await awaitPipelineLocalWriteSettled();
}

// --- CASE B / T-DUALWRITE-IDB-FAIL: IDB write FAIL ⇒ no INDEX (fallback compat LEAN per DF §3.2), no false success ---
{
  const idbBefore = JSON.stringify(idbRawEnvelope());
  const seqBefore = idbSeqNow();
  const h0 = history().length;
  idb.setMode("write_fail");
  ls.setCalls.length = 0;
  saveTendersPipelineLocal(FULL.slice(0, 4));
  const res = await awaitPipelineLocalWriteSettled();
  idb.setMode("ok");
  assert("CASE B: idb.ok=false reason=idb_write_failed — brak false success", res.idb.ok === false && res.idb.reason === "idb_write_failed", res.idb);
  assert("CASE B: brak INDEX w LS (0 _lsIndex); fallback = LEGACY_LEAN zdefiniowany (DF §3.2 Owner #2)", res.ls.mode === "compat" && lsParsed().every((it) => !it._lsIndex) && detectPipelineLsKind(lsRaw()).kind === "LEGACY_LEAN");
  assert("CASE B: IDB envelope poprzedni nietknięty (bez rollback/usunięcia)", JSON.stringify(idbRawEnvelope()) === idbBefore && idbSeqNow() === seqBefore);
  assert("CASE B: telemetria idb_write_failed:*:compat_write, brak index_written", notesSince(h0).some((n) => n && n.startsWith("idb_write_failed:idb_write_failed:compat_write")) && !notesSince(h0).some((n) => n && n.startsWith("index_written")));
  assert("CASE B: brak INDEX zapisanego do IDB (envelope items bez _lsIndex)", parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.items.every((it) => !it._lsIndex));
}

// --- CASE C / T-DUALWRITE-ACK-FAIL: write succeeds, read-back mismatch ⇒ no INDEX ---
{
  const h0 = history().length;
  idb.onAfterPut((key) => idb.tamper(key, (v) => { v.itemCount = 999; }));
  saveTendersPipelineLocal(FULL.slice(0, 5));
  const res = await awaitPipelineLocalWriteSettled();
  assert("CASE C: idb.ok=false reason=readback_mismatch (CORRUPT item_count_mismatch)", res.idb.ok === false && res.idb.reason === "readback_mismatch" && res.idb.readbackReason === "item_count_mismatch", res.idb);
  assert("CASE C: brak INDEX seq bez ACK — LS compat LEAN, 0 _lsIndex", res.ls.mode === "compat" && lsParsed().every((it) => !it._lsIndex) && lsParsed().length === 5);
  assert("CASE C: telemetria envelope:readback_mismatch + compat_write, brak index_written", notesSince(h0).some((n) => n && n.startsWith("envelope:readback_mismatch")) && !notesSince(h0).some((n) => n && n.startsWith("index_written")));
  const tampered = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("CASE C: writer nie naprawia ani nie kasuje CORRUPT envelope (brak removeItem/retry)", tampered.status === "CORRUPT" && ls.removeCalls.length === 0);
  // następny zapis nadpisuje CORRUPT nowym envelope (jedyna forma naprawy — DF §A.7 CASE 3)
  saveTendersPipelineLocal(FULL);
  const resR = await awaitPipelineLocalWriteSettled();
  assert("CASE C→A: kolejny FULL write ⇒ envelope OK, INDEX seq nowy", resR.idb.ok && resR.ls.mode === "index" && resR.ls.ok && detectPipelineLsKind(lsRaw()).seq === resR.idb.localSeq);
}

// --- CASE D / T-DUALWRITE-LS-QUOTA: IDB ACK + LS quota ⇒ IDB FULL durable, LS unchanged ---
{
  const lsBefore = lsRaw();
  const lsSeqBefore = detectPipelineLsKind(lsBefore).seq;
  const h0 = history().length;
  ls.failMode = "quota";
  saveTendersPipelineLocal(FULL.slice(0, 7));
  const res = await awaitPipelineLocalWriteSettled();
  ls.failMode = null;
  assert("CASE D: idb.ok=true (ACK) ∧ ls {index, ok:false, reason:quota}", res.idb.ok === true && res.ls.mode === "index" && res.ls.ok === false && res.ls.reason === "quota", res);
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("CASE D: IDB FULL valid seq=N itemCount=7 — durable (QUOTA-01)", env.status === "OK" && env.envelope.localSeq === res.idb.localSeq && env.envelope.itemCount === 7 && env.envelope.items.every((it) => it.noticeHtml));
  assert("CASE D: LS = poprzedni INDEX (seq N-1), brak removeItem, brak pustki, brak retry (1 setItem)", lsRaw() === lsBefore && detectPipelineLsKind(lsRaw()).seq === lsSeqBefore && ls.removeCalls.length === 0);
  assert("CASE D: telemetria quota_blocked_index; brak index_written; brak rollback IDB", notesSince(h0).includes("quota_blocked_index") && !notesSince(h0).some((n) => n && n.startsWith("index_written")) && idbSeqNow() === res.idb.localSeq);
  assert("CASE D: coldMem = FULL(7) (RAM prawda sesji)", getPipelineColdMemory().length === 7);

  // non-quota LS error ⇒ ls_write_error, IDB durable
  const h1 = history().length;
  ls.failMode = "error";
  saveTendersPipelineLocal(FULL.slice(0, 3));
  const resE = await awaitPipelineLocalWriteSettled();
  ls.failMode = null;
  assert("CASE D' (LS error non-quota): idb.ok ∧ ls {index, error} ∧ telemetria ls_write_error ∧ LS bez zmian", resE.idb.ok && resE.ls.reason === "error" && notesSince(h1).includes("ls_write_error") && lsRaw() === lsBefore);

  // stale INDEX w LS + valid IDB ⇒ FULL source = RAM/IDB (CASE J po stronie writera)
  const r = await resolvePipelineFullSource();
  assert("CASE J (post-writer): LS INDEX stale + IDB OK ⇒ FULL z RAM (3 poz.), nie z INDEX", r.status === "FULL" && r.provenance === "RAM" && r.items.length === 3);

  // odbudowa LS przy kolejnym udanym zapisie
  saveTendersPipelineLocal(FULL);
  const resOk = await awaitPipelineLocalWriteSettled();
  assert("CASE D→A: po ustąpieniu quota kolejny zapis odbudowuje INDEX (seq aktualny)", resOk.ls.ok && detectPipelineLsKind(lsRaw()).seq === resOk.idb.localSeq && lsParsed().length === FULL.length);
}

// --- CASE F' (writer): IDB unavailable ⇒ compat fallback, no INDEX ---
{
  idb.setMode("missing");
  saveTendersPipelineLocal(FULL.slice(0, 2));
  const res = await awaitPipelineLocalWriteSettled();
  idb.setMode("ok");
  assert("IDB unavailable: idb_unavailable ⇒ compat LEAN, 0 _lsIndex, brak false success", res.idb.ok === false && res.idb.reason === "idb_unavailable" && res.ls.mode === "compat" && lsParsed().every((it) => !it._lsIndex));
}

// --- T-DUALWRITE-EMPTY: existing contract for [] (no invented semantics) ---
{
  saveTendersPipelineLocal([]);
  const res = await awaitPipelineLocalWriteSettled();
  assert("EMPTY (flag ON): envelope OK itemCount=0; LS '[]'; kind EMPTY", res.idb.ok && parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.itemCount === 0 && lsRaw() === "[]" && detectPipelineLsKind(lsRaw()).kind === "EMPTY");
  assert("EMPTY: coldMem = [] ⇒ resolvePipelineFullSource EMPTY", getPipelineColdMemory().length === 0 && (await resolvePipelineFullSource()).status === "EMPTY");
  setFlag(false);
  saveTendersPipelineLocal([]);
  const resC = await awaitPipelineLocalWriteSettled();
  assert("EMPTY (compat): LS '[]' jak MAIN, envelope itemCount=0", resC.ls.mode === "compat" && lsRaw() === "[]" && parsePipelineIdbEnvelope(idbRawEnvelope()).envelope.itemCount === 0);
  setFlag(true);
}

// --- Ordering under burst (writeChain): INDEX seq always == final envelope seq, never ahead ---
{
  saveTendersPipelineLocal(FULL.slice(0, 3));
  saveTendersPipelineLocal(FULL.slice(0, 5));
  saveTendersPipelineLocal(FULL.slice(0, 7));
  const last = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  const kind = detectPipelineLsKind(lsRaw());
  assert("BURST: 3 zapisy ⇒ LS INDEX seq == envelope.localSeq (ostatni), 7 poz., brak seq ahead", kind.kind === "INDEX" && kind.seq === last.idb.localSeq && env.envelope.localSeq === last.idb.localSeq && env.envelope.itemCount === 7 && lsParsed().length === 7);
}

// ===========================================================================
// PART D — CLOUD SAFETY (CASE H / I / T-DUALWRITE-NO-CLOUD-PROMOTION)
// ===========================================================================

console.log("\n== PART D: cloud safety ==");
{
  assert("NO-CLOUD-PROMOTION: writer/resolver NIGDY nie wywołały fetch (0 wywołań w całym przebiegu)", fetchCalls === 0, fetchCalls);
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("NO-CLOUD-PROMOTION: po wszystkich ścieżkach błędów IDB FULL bez _lsIndex (nic INDEX-pochodnego nie stało się FULL)", env.status === "OK" && env.envelope.items.every((it) => !it._lsIndex && it.noticeHtml));
  assert("CASE H: brak destrukcji lokalnej — 0 removeItem na kluczu pipeline w całym przebiegu", ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0);
  assert("CASE I: INDEX z LS nie jest źródłem FULL (validator + resolver) ⇒ brak materiału do cloud write z INDEX", validatePipelineFullForWrite(lsParsed()).reason === "index_not_full");
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/lib/tenders-bzp.ts", import.meta.url), "utf8"));
  const writerBody = src.slice(src.indexOf("export function saveTendersPipelineLocal"), src.indexOf("// DF §A.5.2"));
  assert("CASE I (source): writer nie importuje/wywołuje seam cloud (pushTenderPipelineToCloud/fetch/persistKey)", !/pushTenderPipelineToCloud|fetchKeysFromCloud|persistKey|fetch\(/.test(writerBody));
}

// ===========================================================================
console.log(`\nRESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) { console.log("FAILURES:", failures); process.exit(1); }
