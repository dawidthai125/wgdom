/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 5: LOCALSTORAGE INDEX CUTOVER (T-CUTOVER-*).
 * Design Freeze v1.1 §3.2/§3.3 (writer), §8.1/§8.2/§8.4 (migracja), §13 (NEW-03), §A (INDEX ≠ FULL);
 * PLAN Phase 5 (GATE 5: LS nie staje się INDEX bez wcześniejszego ACK envelope + pokrycia id legacy).
 *
 * Moduły `tenders-pipeline-cold.ts` / `tenders-bzp.ts` trzymają stan sesji (coldMem, localSeq, memo kształtu LS),
 * którego produkcja nie resetuje — dlatego KAŻDY scenariusz biegnie w osobnym procesie (`--case=<id>`).
 *
 * Run:  npx vite-node scripts/test-storage-tier1-pipeline-cutover.mjs
 * Single: npx vite-node scripts/test-storage-tier1-pipeline-cutover.mjs --case=legacy-full
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/test-storage-tier1-pipeline-cutover.mjs";

const CASES = [
  "flag-on",
  "flag-off",
  "idb-first",
  "no-idb",
  "legacy-full",
  "legacy-lean",
  "partial-migration",
  "empty",
  "index",
  "quota",
  "rollback",
  "semantics",
  "static",
];

const PIPELINE_KEY = "kw-tenders-pipeline";
const SETTINGS_KEY = "kw-app-settings";
const DELETED_IDS_KEY = "kw-tenders-deleted-ids";
const IDB_KEY = "tenders-pipeline-full";

// ---------------------------------------------------------------------------
// Parent — spawn one child per scenario
// ---------------------------------------------------------------------------

function runParent() {
  const started = Date.now();
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const id = CASES[i];
    console.log(`\n--- [${i + 1}/${CASES.length}] T-CUTOVER ${id} ---\n`);
    const res = spawnSync("npx", ["vite-node", SELF, `--case=${id}`], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
    });
    if (res.status !== 0) {
      console.error(`\nFAIL case ${id}\n`);
      console.error(`=== PHASE 5 CUTOVER: ${passed}/${CASES.length} cases PASS — ABORT ===`);
      process.exit(1);
    }
    passed++;
  }
  console.log(`\n=== PHASE 5 CUTOVER: ${passed}/${CASES.length} cases PASS (${Date.now() - started}ms) ===\n`);
  process.exit(0);
}

const caseArg = process.argv.find((a) => a.startsWith("--case="));
if (!caseArg) runParent();

const CASE_ID = caseArg.slice("--case=".length);

// ---------------------------------------------------------------------------
// Child harness — localStorage (fault injection) + idb stub + spies
// ---------------------------------------------------------------------------

const { installIdbStub } = await import("./_lib/idb-memory-stub.mjs");

const ls = {
  _m: new Map(),
  failMode: null, // null | "quota" | "error"
  setCalls: [],
  removeCalls: [],
  setItem(k, v) {
    const key = String(k);
    if (key === PIPELINE_KEY) {
      this.setCalls.push({ value: String(v), idbSeqAtWrite: idbSeqNow() });
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
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("stub: cloud must not be reached by the local cutover path");
};

const IDB_MODE = CASE_ID === "no-idb" ? "missing" : "ok";
const idb = installIdbStub({ mode: IDB_MODE });
idb.reset();

function idbRawEnvelope() { return idb.getRaw(IDB_KEY)?.value; }
function idbSeqNow() {
  const v = idbRawEnvelope();
  return v && typeof v === "object" && !Array.isArray(v) ? v.localSeq : null;
}

let pass = 0;
let fail = 0;
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail) : ""); }
}

const lsRaw = () => ls.getItem(PIPELINE_KEY);
const lsParsed = () => { const r = lsRaw(); return r == null ? null : JSON.parse(r); };
// Phase 11 HARD VERSION GATE — flaga ON wymaga zadeklarowanego minimum ≤ APP_VERSION klienta.
const { APP_VERSION: HARNESS_APP_VERSION } = await import("../src/lib/app-version.ts");
const setFlag = (on) => ls._m.set(SETTINGS_KEY, JSON.stringify({
  pipelineLocalIndexV1: on,
  pipelineLocalIndexMinAppVersion: HARNESS_APP_VERSION,
}));
const setDeletedIds = (ids) => ls._m.set(DELETED_IDS_KEY, JSON.stringify(ids));
const notes = () => globalThis.__WG_STORAGE__.history().map((e) => e.note);
const notesSince = (from) => globalThis.__WG_STORAGE__.history().slice(from).map((e) => e.note);
const historyLen = () => globalThis.__WG_STORAGE__.history().length;
const readSource = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// Modules (after globals)
// ---------------------------------------------------------------------------

const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");
const bzp = await import("../src/lib/tenders-bzp.ts");

const { classifyPipelineRepresentation, hasLsIndexMarker } = repr;
const {
  detectPipelineLsKind,
  parsePipelineIdbEnvelope,
  validatePipelineFullForWrite,
  buildTenderPipelineLsIndex,
  stripTenderPipelineForLocalStorage,
  getPipelineColdMemory,
} = cold;
const {
  saveTendersPipelineLocal,
  awaitPipelineLocalWriteSettled,
  resolvePipelineFullSource,
  evaluatePipelineIndexCutover,
  TENDERS_PIPELINE_KEY,
} = bzp;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullItem(n) {
  const id = `t-${String(n).padStart(4, "0")}`;
  return {
    id,
    bzpNumber: `2026/BZP ${n}`,
    title: `Remont lokalu ${n}`,
    organizationName: "Wrocławskie Mieszkania",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45453000-7",
    publicationDate: "2026-09-01",
    submittingOffersDate: "2026-09-20T10:00:00.000Z",
    tenderId: `ocds-${n}`,
    status: "new",
    notes: "prywatna notatka — FULL only",
    relevanceScore: 40 + n,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "2026-09-01T08:00:00.000Z",
    updatedAt: `2026-09-1${n % 10}T09:00:00.000Z`,
    swzAnalysis: { estimatedValuePln: 120000 + n, estimatedValueRaw: `${120000 + n} zł`, wadiumPln: 2000, wadiumRaw: "2 000 zł", implementationDays: 60, profitabilityHint: "good" },
    noticeHtml: `<html><body>${"x".repeat(400)}</body></html>`,
    tenderDossier: {
      kosztorys: { ok: true, rows: Array.from({ length: 12 }, (_, i) => ({ lp: i + 1, name: `poz ${i}` })), rowCount: 12 },
    },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"] },
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: false },
    ikFinalBid: { v: 1, finalBidPln: 104500 + n },
    changeMonitor: { events: [{ at: "2026-09-10", kind: "docs_changed" }] },
  };
}

const FULL6 = Array.from({ length: 6 }, (_, i) => fullItem(i + 1));
const FULL4 = FULL6.slice(0, 4);
const LEGACY_LEAN6 = stripTenderPipelineForLocalStorage(FULL6);
const INDEX_SEQ_7 = buildTenderPipelineLsIndex(FULL6, 7);

function seedEnvelope(items, localSeq, extra = {}) {
  idb.seed(IDB_KEY, {
    schemaVersion: 1,
    bundleRevision: 0,
    localSeq,
    itemCount: items.length,
    writtenAt: "2026-09-17T10:00:00.000Z",
    maxUpdatedAt: items.reduce((m, it) => (it.updatedAt > m ? it.updatedAt : m), ""),
    items,
    writer: "seed",
    ...extra,
  });
}

function assertNoDestructiveCleanup(label) {
  assert(`${label}: brak removeItem na kluczu pipeline (§8.4)`,
    ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0, ls.removeCalls);
  assert(`${label}: envelope IDB nie skasowany`,
    IDB_MODE === "missing" || idbRawEnvelope() !== undefined);
}

assert("harness: klucz LS", TENDERS_PIPELINE_KEY === PIPELINE_KEY);

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

if (CASE_ID === "flag-on") {
  // T-CUTOVER-FLAG-ON — nowy zapis (LS pusty) ⇒ INDEX po ACK, seq spójny, dokładnie 1 setItem.
  setFlag(true);
  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  const parsed = lsParsed();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-FLAG-ON IDB ACK", r.idb.ok === true && r.idb.localSeq === 1, r.idb);
  assert("T-CUTOVER-FLAG-ON LS = INDEX", r.ls.mode === "index" && r.ls.ok === true, r.ls);
  assert("T-CUTOVER-FLAG-ON klasa LS = INDEX", classifyPipelineRepresentation(parsed) === "INDEX");
  assert("T-CUTOVER-FLAG-ON marker seq = envelope.localSeq", parsed.every((it) => it._lsIndex.seq === r.idb.localSeq));
  assert("T-CUTOVER-FLAG-ON envelope = FULL (heavy w IDB)",
    env.status === "OK" && env.envelope.items.every((it) => typeof it.noticeHtml === "string" && it.tenderDossier.kosztorys.rows.length === 12));
  assert("T-CUTOVER-FLAG-ON dokładnie 1 setItem pipeline", ls.setCalls.length === 1, ls.setCalls.length);
  assert("T-CUTOVER-FLAG-ON setItem po ACK tego seq", ls.setCalls[0].idbSeqAtWrite === 1, ls.setCalls[0].idbSeqAtWrite);
  assert("T-CUTOVER-FLAG-ON telemetria index_written", notes().some((n) => n === "index_written:seq=1"), notes());
  assert("T-CUTOVER-FLAG-ON INDEX nie przechodzi walidacji FULL", validatePipelineFullForWrite(parsed).ok === false);
  assert("T-CUTOVER-FLAG-ON 0 wywołań cloud", fetchCalls === 0);
  assertNoDestructiveCleanup("T-CUTOVER-FLAG-ON");
}

if (CASE_ID === "flag-off") {
  // T-CUTOVER-FLAG-OFF — brak flagi ⇒ compat LEGACY_LEAN jak MAIN; envelope FULL nadal pisany.
  setFlag(false);
  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  const parsed = lsParsed();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-FLAG-OFF LS = compat", r.ls.mode === "compat" && r.ls.ok === true, r.ls);
  assert("T-CUTOVER-FLAG-OFF LS bez markera INDEX", hasLsIndexMarker(parsed) === false);
  assert("T-CUTOVER-FLAG-OFF LS kind = LEGACY_LEAN", detectPipelineLsKind(lsRaw()).kind === "LEGACY_LEAN");
  assert("T-CUTOVER-FLAG-OFF envelope FULL durable", env.status === "OK" && env.envelope.itemCount === 6);
  assert("T-CUTOVER-FLAG-OFF brak telemetrii index_written", !notes().some((n) => String(n).startsWith("index_written")));
  assert("T-CUTOVER-FLAG-OFF brak detekcji kształtu LS (0 I/O guardu w OFF)",
    !notes().some((n) => String(n).startsWith("cutover_ls_kind")), notes());
  assertNoDestructiveCleanup("T-CUTOVER-FLAG-OFF");
}

if (CASE_ID === "idb-first") {
  // T-CUTOVER-IDB-FIRST — LS INDEX + valid IDB FULL ⇒ FULL z IDB; INDEX wyłącznie hot.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(INDEX_SEQ_7));
  seedEnvelope(FULL6, 7);

  const src = await resolvePipelineFullSource();
  assert("T-CUTOVER-IDB-FIRST provenance = IDB_OK", src.status === "FULL" && src.provenance === "IDB_OK", src.status === "FULL" ? src.provenance : src);
  assert("T-CUTOVER-IDB-FIRST FULL z heavy (nie projekcja INDEX)",
    src.status === "FULL" && src.items.every((it) => typeof it.noticeHtml === "string" && it.tenderDossier.kosztorys.rows.length === 12));
  assert("T-CUTOVER-IDB-FIRST FULL bez markera INDEX", src.status === "FULL" && hasLsIndexMarker(src.items) === false);
  assert("T-CUTOVER-IDB-FIRST LS pozostaje INDEX (hot)", classifyPipelineRepresentation(lsParsed()) === "INDEX");
  assert("T-CUTOVER-IDB-FIRST 0 setItem przy odczycie", ls.setCalls.length === 0);

  // Reader jest sterowany reprezentacją, nie flagą (cutover nie zmienia kontraktu Phase 4).
  const onItems = JSON.stringify((await resolvePipelineFullSource()).items);
  setFlag(false);
  const offItems = JSON.stringify((await resolvePipelineFullSource()).items);
  assert("T-CUTOVER-IDB-FIRST reader identyczny dla flag ON/OFF", onItems === offItems);
  assert("T-CUTOVER-IDB-FIRST 0 wywołań cloud", fetchCalls === 0);
  assertNoDestructiveCleanup("T-CUTOVER-IDB-FIRST");
}

if (CASE_ID === "no-idb") {
  // T-CUTOVER-NO-IDB — brak IDB (ACK FAIL) ⇒ brak cutover; compat LEAN (DF §3.2 / Owner #2).
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(LEGACY_LEAN6));
  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  const parsed = lsParsed();

  assert("T-CUTOVER-NO-IDB ACK FAIL", r.idb.ok === false, r.idb);
  assert("T-CUTOVER-NO-IDB brak INDEX w LS", hasLsIndexMarker(parsed) === false && r.ls.mode === "compat", r.ls);
  assert("T-CUTOVER-NO-IDB LS kind = LEGACY_LEAN", detectPipelineLsKind(lsRaw()).kind === "LEGACY_LEAN");
  assert("T-CUTOVER-NO-IDB telemetria idb_write_failed → compat_write",
    notes().some((n) => String(n).includes("idb_write_failed") && String(n).includes("compat_write")), notes());
  assert("T-CUTOVER-NO-IDB brak envelope (nie ma fałszywego FULL durable)", idbRawEnvelope() === undefined);
  assert("T-CUTOVER-NO-IDB brak removeItem", ls.removeCalls.length === 0, ls.removeCalls);
  assert("T-CUTOVER-NO-IDB RAM FULL zachowany (sesja)", (getPipelineColdMemory() ?? []).length === 6);
}

if (CASE_ID === "legacy-full") {
  // T-CUTOVER-LEGACY-FULL — legacy FULL w LS + pokrycie id w ACK-owanym envelope ⇒ bezpieczny cutover.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(FULL6));
  assert("T-CUTOVER-LEGACY-FULL start: LS = LEGACY_FULL", detectPipelineLsKind(lsRaw()).kind === "LEGACY_FULL");

  const decision = evaluatePipelineIndexCutover(FULL6);
  assert("T-CUTOVER-LEGACY-FULL decyzja: cutover dozwolony (subset OK)", decision.ok === true && decision.lsKind === "LEGACY_FULL", decision);

  const before = historyLen();
  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-LEGACY-FULL LS = INDEX po ACK", r.ls.mode === "index" && classifyPipelineRepresentation(lsParsed()) === "INDEX", r.ls);
  assert("T-CUTOVER-LEGACY-FULL heavy w envelope (nie utracone)",
    env.status === "OK" && env.envelope.items.every((it) => typeof it.noticeHtml === "string"));
  assert("T-CUTOVER-LEGACY-FULL id-set zachowany", env.status === "OK" && env.envelope.items.map((it) => it.id).join(",") === FULL6.map((it) => it.id).join(","));
  assert("T-CUTOVER-LEGACY-FULL ACK przed setItem", notesSince(before).indexOf("envelope_ok:seq=1") < notesSince(before).indexOf("index_written:seq=1"), notesSince(before));
  assertNoDestructiveCleanup("T-CUTOVER-LEGACY-FULL");
}

if (CASE_ID === "legacy-lean") {
  // T-CUTOVER-LEGACY-LEAN — LEAN nie jest INDEX-em ani „ukrytym FULL"; cutover tylko po ACK.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(LEGACY_LEAN6));

  const src = await resolvePipelineFullSource();
  assert("T-CUTOVER-LEGACY-LEAN provenance jawna LS_LEGACY_LEAN (§A.4)",
    src.status === "FULL" && src.provenance === "LS_LEGACY_LEAN", src.status === "FULL" ? src.provenance : src);
  assert("T-CUTOVER-LEGACY-LEAN LEAN bez markera INDEX", src.status === "FULL" && hasLsIndexMarker(src.items) === false);
  assert("T-CUTOVER-LEGACY-LEAN LEAN nie dostał INDEX-a bez zapisu", ls.setCalls.length === 0);

  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("T-CUTOVER-LEGACY-LEAN cutover po ACK", r.idb.ok === true && r.ls.mode === "index", { idb: r.idb.ok, ls: r.ls.mode });
  assert("T-CUTOVER-LEGACY-LEAN rows w envelope (heavy odtworzone z FULL)",
    env.status === "OK" && env.envelope.items.every((it) => it.tenderDossier.kosztorys.rows.length === 12));
  assert("T-CUTOVER-LEGACY-LEAN marker _coldRowsCount nie trafia do INDEX",
    JSON.stringify(lsParsed()).includes("_coldRowsCount") === false);
  assertNoDestructiveCleanup("T-CUTOVER-LEGACY-LEAN");
}

if (CASE_ID === "partial-migration") {
  // T-CUTOVER-PARTIAL-MIGRATION — legacy LS (old client) z id-ami spoza nowego FULL ⇒ BRAK cutover.
  setFlag(true);
  const legacyRaw = JSON.stringify(FULL6);
  ls._m.set(PIPELINE_KEY, legacyRaw);

  const decision = evaluatePipelineIndexCutover(FULL4);
  assert("T-CUTOVER-PARTIAL-MIGRATION decyzja: BLOCK (2 id bez pokrycia)",
    decision.ok === false && decision.missingIds.length === 2, decision);

  saveTendersPipelineLocal(FULL4);
  const r = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-PARTIAL-MIGRATION LS nietknięty (legacy zachowany)", lsRaw() === legacyRaw);
  assert("T-CUTOVER-PARTIAL-MIGRATION 0 setItem pipeline", ls.setCalls.length === 0, ls.setCalls.length);
  assert("T-CUTOVER-PARTIAL-MIGRATION ls.reason = legacy_subset", r.ls.mode === "skipped" && r.ls.reason === "legacy_subset", r.ls);
  assert("T-CUTOVER-PARTIAL-MIGRATION telemetria index_cutover_blocked",
    notes().some((n) => String(n) === "index_cutover_blocked:LEGACY_FULL:legacy_ids_missing=2"), notes());
  assert("T-CUTOVER-PARTIAL-MIGRATION IDB FULL durable dla zapisanego zakresu",
    env.status === "OK" && env.envelope.itemCount === 4 && r.idb.ok === true);
  assert("T-CUTOVER-PARTIAL-MIGRATION brak INDEX → FULL (LS nadal LEGACY_FULL)",
    detectPipelineLsKind(lsRaw()).kind === "LEGACY_FULL");
  assertNoDestructiveCleanup("T-CUTOVER-PARTIAL-MIGRATION");

  // Pokrycie przez tombstony: usunięte id-y legacy nie blokują cutover.
  setDeletedIds(["t-0005", "t-0006"]);
  const decision2 = evaluatePipelineIndexCutover(FULL4);
  assert("T-CUTOVER-PARTIAL-MIGRATION deletedIds domykają subset", decision2.ok === true, decision2);
  saveTendersPipelineLocal(FULL4);
  const r2 = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-PARTIAL-MIGRATION cutover po domknięciu subsetu",
    r2.ls.mode === "index" && classifyPipelineRepresentation(lsParsed()) === "INDEX", r2.ls);
}

if (CASE_ID === "empty") {
  // T-CUTOVER-PARTIAL-MIGRATION (wyjątek) — jawnie pusta kolekcja nie jest częściową migracją.
  // Guard subsetu chroni przed CZĘŚCIOWYM cutoverem; `[]` = autoryzowane opróżnienie (parity z MAIN,
  // DF §3.3 EMPTY, Phase 3 T-DUALWRITE-EMPTY). Reset/write-safety pozostają jedyną bramą dla `[]`.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(FULL6));

  const decision = evaluatePipelineIndexCutover([]);
  assert("T-CUTOVER-EMPTY decyzja: wyjątek empty_collection",
    decision.ok === true && decision.exemption === "empty_collection" && decision.lsKind === "LEGACY_FULL", decision);
  assert("T-CUTOVER-EMPTY niepusty częściowy zapis nadal BLOCK",
    evaluatePipelineIndexCutover(FULL4).ok === false);

  saveTendersPipelineLocal([]);
  const r = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-EMPTY envelope OK itemCount=0", r.idb.ok === true && env.status === "OK" && env.envelope.itemCount === 0, r.idb);
  assert("T-CUTOVER-EMPTY LS = '[]' (kontrakt Phase 3)", lsRaw() === "[]" && detectPipelineLsKind(lsRaw()).kind === "EMPTY", lsRaw());
  assert("T-CUTOVER-EMPTY brak removeItem (§8.4)", ls.removeCalls.length === 0, ls.removeCalls);
  assert("T-CUTOVER-EMPTY brak INDEX → FULL", validatePipelineFullForWrite(lsParsed()).ok === true && (lsParsed() ?? []).length === 0);
}

if (CASE_ID === "index") {
  // T-CUTOVER-INDEX — istniejący INDEX nie jest promowany do FULL; kolejny zapis = nowy INDEX seq.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(INDEX_SEQ_7));
  seedEnvelope(FULL6, 7);

  // Bootstrap urządzenia: hydracja envelope ustala monotoniczny localSeq (§1.2) przed zapisami.
  const hydrated = await resolvePipelineFullSource();
  assert("T-CUTOVER-INDEX hydracja: FULL z IDB (seq 7)", hydrated.status === "FULL" && hydrated.provenance === "IDB_OK");

  const indexItems = lsParsed();
  assert("T-CUTOVER-INDEX walidator FULL odrzuca INDEX",
    validatePipelineFullForWrite(indexItems).ok === false && validatePipelineFullForWrite(indexItems).reason === "index_not_full");
  assert("T-CUTOVER-INDEX envelope z INDEX = CORRUPT (item_index_marker)",
    parsePipelineIdbEnvelope({ schemaVersion: 1, bundleRevision: 0, localSeq: 7, itemCount: indexItems.length, writtenAt: "", maxUpdatedAt: "", items: indexItems }).reason === "item_index_marker");

  // Writer odrzuca INDEX jako wejście (backstop §3.1) — bez zapisu LS/IDB.
  const before = ls.setCalls.length;
  saveTendersPipelineLocal(indexItems);
  const rejected = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-INDEX writer odrzuca INDEX na wejściu", rejected.ls.mode === "skipped" && ls.setCalls.length === before, rejected.ls);
  assert("T-CUTOVER-INDEX envelope nie nadpisany INDEX-em", idbSeqNow() === 7);
  assert("T-CUTOVER-INDEX LS nadal INDEX seq 7", detectPipelineLsKind(lsRaw()).seq === 7);

  // Normalna praca po cutoverze: FULL → nowy INDEX z kolejnym seq (bez guardu legacy).
  saveTendersPipelineLocal(FULL6);
  const r = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-INDEX kolejny zapis = INDEX seq 8", r.ls.mode === "index" && r.idb.localSeq === 8 && lsParsed().every((it) => it._lsIndex.seq === 8), { ls: r.ls, seq: r.idb.localSeq });
  assertNoDestructiveCleanup("T-CUTOVER-INDEX");
}

if (CASE_ID === "quota") {
  // T-CUTOVER-QUOTA — LS quota przy INDEX ⇒ IDB FULL durable, LS bez zmian, brak retry.
  setFlag(true);
  saveTendersPipelineLocal(FULL6);
  const first = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-QUOTA setup: INDEX seq 1", first.ls.mode === "index");
  const lsAfterFirst = lsRaw();

  ls.failMode = "quota";
  const before = ls.setCalls.length;
  saveTendersPipelineLocal(FULL4);
  const r = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-QUOTA LS bez zmian", lsRaw() === lsAfterFirst);
  assert("T-CUTOVER-QUOTA brak retry (1 próba setItem)", ls.setCalls.length - before === 1, ls.setCalls.length - before);
  assert("T-CUTOVER-QUOTA reason = quota", r.ls.ok === false && r.ls.reason === "quota", r.ls);
  assert("T-CUTOVER-QUOTA telemetria quota_blocked_index", notes().some((n) => n === "quota_blocked_index"), notes());
  assert("T-CUTOVER-QUOTA IDB FULL nowy seq durable", r.idb.ok === true && env.status === "OK" && env.envelope.localSeq === 2 && env.envelope.itemCount === 4);
  assert("T-CUTOVER-QUOTA brak rollbacku envelope / brak INDEX w IDB", env.status === "OK" && hasLsIndexMarker(env.envelope.items) === false);
  assertNoDestructiveCleanup("T-CUTOVER-QUOTA");
}

if (CASE_ID === "rollback") {
  // T-CUTOVER-ROLLBACK — ON→OFF: następny zapis = compat LEAN; durable FULL nietknięty.
  setFlag(true);
  saveTendersPipelineLocal(FULL6);
  const on = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-ROLLBACK setup: LS = INDEX", on.ls.mode === "index" && classifyPipelineRepresentation(lsParsed()) === "INDEX");

  setFlag(false);
  saveTendersPipelineLocal(FULL6);
  const off = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-CUTOVER-ROLLBACK LS = compat LEAN", off.ls.mode === "compat" && hasLsIndexMarker(lsParsed()) === false, off.ls);
  assert("T-CUTOVER-ROLLBACK envelope FULL zachowany", env.status === "OK" && env.envelope.localSeq === 2 && env.envelope.itemCount === 6);
  assert("T-CUTOVER-ROLLBACK brak removeItem / brak destrukcji", ls.removeCalls.length === 0);
  const src = await resolvePipelineFullSource();
  assert("T-CUTOVER-ROLLBACK FULL nadal dostępny", src.status === "FULL" && src.items.length === 6);

  // Powrót OFF→ON na tym samym urządzeniu: LEAN (id-y pokryte) ⇒ ponowny cutover po ACK.
  setFlag(true);
  saveTendersPipelineLocal(FULL6);
  const again = await awaitPipelineLocalWriteSettled();
  assert("T-CUTOVER-ROLLBACK ponowny ON = INDEX", again.ls.mode === "index" && classifyPipelineRepresentation(lsParsed()) === "INDEX", again.ls);
}

if (CASE_ID === "semantics") {
  // T-CUTOVER-BOOTSTRAP / T-CUTOVER-MERGE / T-CUTOVER-CLOUD — INDEX poza domeną FULL.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(INDEX_SEQ_7));

  const sync = await import("../src/lib/tenders-sync.ts");
  const leanMod = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts");
  const push = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-push.ts");

  // BOOTSTRAP: coldMem null + LS INDEX + IDB MISSING ⇒ NO_FULL (nigdy FULL z INDEX).
  const noFull = await resolvePipelineFullSource();
  assert("T-CUTOVER-BOOTSTRAP coldMem null + INDEX + IDB MISSING = NO_FULL",
    noFull.status === "NO_FULL" && noFull.lsKind === "INDEX" && noFull.idbStatus === "MISSING", noFull);
  assert("T-CUTOVER-BOOTSTRAP NO_FULL zwraca id-set INDEX, nie itemy FULL",
    noFull.status === "NO_FULL" && noFull.index.length === 6 && hasLsIndexMarker(noFull.index) === true);

  // coldMem null + LS INDEX + IDB FULL ⇒ FULL z IDB.
  seedEnvelope(FULL6, 7);
  const fromIdb = await resolvePipelineFullSource();
  assert("T-CUTOVER-BOOTSTRAP coldMem null + INDEX + IDB FULL = FULL z IDB",
    fromIdb.status === "FULL" && fromIdb.provenance === "IDB_OK", fromIdb.status === "FULL" ? fromIdb.provenance : fromIdb);

  // MERGE: INDEX nie jest uczestnikiem merge (§A.6.3) — wynik = strona FULL nienaruszona.
  const merged = sync.mergeTenderPipelineForCloud(INDEX_SEQ_7, FULL6, []);
  assert("T-CUTOVER-MERGE INDEX wykluczony z merge", merged.length === 6 && hasLsIndexMarker(merged) === false);
  assert("T-CUTOVER-MERGE strona FULL nienaruszona (heavy zachowane)",
    merged.every((it) => typeof it.noticeHtml === "string" && it.tenderDossier.kosztorys.rows.length === 12));
  const mergedEqualUpdatedAt = sync.mergeTenderPipelineForCloud(
    INDEX_SEQ_7.map((it) => ({ ...it })),
    FULL6.map((it) => ({ ...it })),
    [],
  );
  assert("T-CUTOVER-MERGE równe updatedAt nie promuje INDEX",
    mergedEqualUpdatedAt.every((it) => typeof it.noticeHtml === "string" && !("_lsIndex" in it)));
  assert("T-CUTOVER-MERGE telemetria wykluczenia INDEX",
    notes().some((n) => String(n).startsWith("merge_index_side_excluded:local:")), notes());

  // CLOUD: seam odrzuca INDEX; strip nie zdejmuje `_lsIndex`, ale czyści marker LS-lean.
  let thrown = null;
  try { await push.pushTenderPipelineToCloud(INDEX_SEQ_7); } catch (e) { thrown = e; }
  assert("T-CUTOVER-CLOUD seam odrzuca INDEX", thrown?.code === "PIPELINE_INDEX_NOT_FULL", thrown?.message);
  assert("T-CUTOVER-CLOUD 0 wywołań cloud z INDEX", fetchCalls === 0);

  const strippedLean = leanMod.stripTenderPipelineForCloud(LEGACY_LEAN6.map((it) => ({ ...it })));
  const strippedJson = JSON.stringify(strippedLean);
  assert("T-CUTOVER-CLOUD strip usuwa _coldRowsCount (test M)", strippedJson.includes("_coldRowsCount") === false);
  assert("T-CUTOVER-CLOUD strip nie dodaje ani nie zdejmuje _lsIndex (§A.10)",
    strippedJson.includes("_lsIndex") === false && !readSource("src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts").includes("delete next._lsIndex"));
  assert("T-CUTOVER-CLOUD cloud body pozostaje LEAN (_cloudLean)", strippedLean.every((it) => it._cloudLean?.v === 1));
  assertNoDestructiveCleanup("T-CUTOVER-SEMANTICS");
}

if (CASE_ID === "static") {
  // T-CUTOVER-NO-DESTRUCTIVE-CLEANUP + granice źródłowe cutoveru.
  const bzpSrc = readSource("src/lib/tenders-bzp.ts");
  const coldSrc = readSource("src/lib/storage/tenders-pipeline-cold.ts");
  const settingsSrc = readSource("src/lib/app-settings.ts");

  assert("T-CUTOVER-NO-DESTRUCTIVE-CLEANUP brak removeItem pipeline w src",
    !/localStorage\.removeItem\(\s*TENDERS_PIPELINE_KEY/.test(bzpSrc) && !/removeItem\(\s*["']kw-tenders-pipeline/.test(bzpSrc));
  assert("T-CUTOVER-NO-DESTRUCTIVE-CLEANUP brak idbRemove envelope",
    !/idbRemove\(\s*PIPELINE_COLD_IDB_KEY/.test(coldSrc) && !/idbRemove\(\s*["']tenders-pipeline-full/.test(coldSrc));

  const writer = bzpSrc.slice(bzpSrc.indexOf("export function saveTendersPipelineLocal"), bzpSrc.indexOf("// DF §A.5.2"));
  assert("GATE 5: INDEX budowany wyłącznie w gałęzi po ACK",
    writer.indexOf("if (!idb.ok)") < writer.indexOf("buildTenderPipelineLsIndex"));
  assert("GATE 5: guard cutover przed budową INDEX",
    writer.indexOf("evaluatePipelineIndexCutover") < writer.indexOf("buildTenderPipelineLsIndex"));
  assert("GATE 5: jedyny setItem pipeline w writePipelineLsPayload",
    (bzpSrc.match(/localStorage\.setItem\(TENDERS_PIPELINE_KEY,/g) ?? []).length === 1);
  // Phase 7: komentarze writera nazywają zakaz („bez retry”) — liczymy wyłącznie kod.
  const writerCode = writer.split(/\r?\n/).filter((l) => !/^\s*(?:\/\/|\/\*|\*)/.test(l)).join("\n");
  assert("GATE 5: brak retry po błędzie LS", !/retry/i.test(writerCode));

  assert("FLAG: default pipelineLocalIndexV1 = false (prod ON = Phase 10)",
    /pipelineLocalIndexV1:\s*false/.test(settingsSrc));
  assert("FLAG: brak auto-ON / brak nowego config systemu",
    !/pipelineLocalIndexV1\s*=\s*true/.test(settingsSrc) && !/pipelineLocalIndexV1:\s*true/.test(settingsSrc));
  const readerSection = bzpSrc.slice(
    bzpSrc.indexOf("export function loadTendersPipelineLocal"),
    bzpSrc.indexOf("// STORAGE-TIER1-PIPELINE-CONTRACT-01 Phase 3 — NEW-04"),
  );
  assert("FLAG: reader nie rozgałęzia się na flagę (Phase 4 kontrakt)",
    readerSection.length > 200 && !readerSection.includes("isPipelineLocalIndexEnabled()"));
  assert("FLAG: writer czyta flagę raz na zapis",
    (writer.match(/isPipelineLocalIndexEnabled\(\)/g) ?? []).length === 1);

  assert("PERF: brak measureLocalStorageBytes w writerze (P-5)", !writer.includes("measureLocalStorageBytes"));
  assert("PERF: guard czyta LS raz na sesję (memo)",
    bzpSrc.includes("if (pipelineLsWriterState != null) return pipelineLsWriterState;"));
  assert("PERF: po zapisie kształt LS znany bez ponownego czytania",
    bzpSrc.includes("markPipelineLsWriterState(\"INDEX\", null)") && bzpSrc.includes("markPipelineLsWriterState(\"LEGACY_LEAN\", items)"));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== T-CUTOVER ${CASE_ID}: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail === 0 ? 0 : 1);
