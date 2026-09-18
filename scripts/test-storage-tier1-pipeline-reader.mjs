/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 4: READER MIGRATION (T-READER-*).
 * Design Freeze v1.1 §4 (reader), §5 (session cache), §9 (backup), §A.5–§A.9 (semantic boundary).
 *
 * Sekwencja jest ZAMIERZONA: część A biegnie przy `coldMem = null` (brak resetu produkcyjnego RAM),
 * dopiero A7 (recovery) ustawia RAM FULL; część B testuje precedencję FULL, część C funkcje czyste
 * + granice na poziomie źródła (bootstrap / session cache / import / restore / export).
 *
 * Run: npx vite-node scripts/test-storage-tier1-pipeline-reader.mjs
 */

import { readFileSync } from "node:fs";
import { installIdbStub } from "./_lib/idb-memory-stub.mjs";

process.env.VITE_SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || "stub-project";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "stub-anon-key";

const PIPELINE_KEY = "kw-tenders-pipeline";
const SETTINGS_KEY = "kw-app-settings";
const IDB_KEY = "tenders-pipeline-full";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const ls = {
  _m: new Map(),
  setCalls: [],
  removeCalls: [],
  setItem(k, v) {
    const key = String(k);
    if (key === PIPELINE_KEY) this.setCalls.push({ key, value: String(v) });
    this._m.set(key, String(v));
  },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this.removeCalls.push(String(k)); this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};
globalThis.localStorage = ls;

/** cloudMode: "throw" | { items } — batch-get stub, zero prawdziwej sieci. */
let cloudMode = "throw";
let fetchCalls = 0;
globalThis.fetch = async (url) => {
  fetchCalls += 1;
  if (cloudMode === "throw") throw new Error("stub: cloud unavailable");
  if (!String(url).includes("batch-get")) throw new Error(`stub: unexpected endpoint ${url}`);
  return {
    ok: true,
    status: 200,
    json: async () => ({ values: [cloudMode.items] }),
  };
};

let pass = 0;
let fail = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; failures.push(name); console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail).slice(0, 400) : ""); }
}
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const history = () => globalThis.__WG_STORAGE__?.history() ?? [];
const notesSince = (from) => history().slice(from).map((e) => e.note);
const lsParsed = () => { const r = ls.getItem(PIPELINE_KEY); return r == null ? null : JSON.parse(r); };
const seedLs = (value) => ls._m.set(PIPELINE_KEY, JSON.stringify(value));
// Phase 11 HARD VERSION GATE — flaga ON wymaga zadeklarowanego minimum ≤ APP_VERSION klienta.
const { APP_VERSION: HARNESS_APP_VERSION } = await import("../src/lib/app-version.ts");
const setFlag = (on) => ls._m.set(SETTINGS_KEY, JSON.stringify({
  pipelineLocalIndexV1: on,
  pipelineLocalIndexMinAppVersion: HARNESS_APP_VERSION,
}));
const readSource = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

const idb = installIdbStub({ mode: "ok" });
idb.reset();
const idbRaw = () => idb.getRaw(IDB_KEY)?.value;

const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");
const bzp = await import("../src/lib/tenders-bzp.ts");
const sync = await import("../src/lib/tenders-sync.ts");

const { classifyPipelineRepresentation, hasLsIndexMarker, getPipelineFullAvailability } = repr;
const {
  buildTenderPipelineLsIndex,
  validatePipelineFullForWrite,
  parsePipelineIdbEnvelope,
  evaluatePipelineIdbFreshness,
  detectPipelineLsKind,
  getPipelineColdMemory,
  hydratePipelineColdEnvelopeFromIdb,
} = cold;
const {
  loadTendersPipelineLocal,
  loadTendersPipeline,
  resolvePipelineFullSource,
  acceptExternalFull,
  awaitPipelineLocalWriteSettled,
} = bzp;
const { mergeTenderPipelineForCloud } = sync;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullItem(n) {
  const id = `t-${String(n).padStart(4, "0")}`;
  return {
    id,
    bzpNumber: `2026/BZP ${n}`,
    noticeNumber: `N-${n}`,
    title: `Remont lokalu ${n}`,
    organizationName: "Wrocławskie Mieszkania",
    organizationCity: "Wrocław",
    cpvCode: "45453000-7",
    publicationDate: "2026-09-01",
    submittingOffersDate: "2026-09-20T10:00:00.000Z",
    orderType: "roboty budowlane",
    status: "new",
    notes: "prywatna notatka — FULL only",
    relevanceScore: 40 + n,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    addedAt: "2026-09-01T08:00:00.000Z",
    updatedAt: `2026-09-1${n % 10}T09:00:00.000Z`,
    ezamowieniaUrl: `https://ezamowienia.gov.pl/${n}`,
    swzAnalysis: { estimatedValuePln: 120000 + n, wadiumPln: 2000, implementationDays: 60, profitabilityHint: "good", technicalRequirements: ["tr1"] },
    noticeHtml: `<html>${"x".repeat(800)}</html>`,
    tenderDossier: { kosztorys: { ok: true, rows: Array.from({ length: 12 }, (_, i) => ({ lp: i + 1 })), rowCount: 12 } },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"] },
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: false },
    ikFinalBid: { v: 1, finalBidPln: 104500 + n },
    changeMonitor: { events: [{ at: "2026-09-10", kind: "docs_changed" }] },
  };
}
const FULL = Array.from({ length: 6 }, (_, i) => fullItem(i + 1));
const FULL_JSON = JSON.stringify(FULL);
const INDEX_SEQ_7 = buildTenderPipelineLsIndex(FULL, 7);
const INDEX_JSON = JSON.stringify(INDEX_SEQ_7);
const LEGACY_LEAN = FULL.map((it) => {
  const { noticeHtml, ...rest } = it;
  return { ...rest, tenderDossier: { kosztorys: { ok: true, rows: [], rowCount: 12, _coldRowsCount: 12 } } };
});
const CLOUD_LEAN = FULL.map((it) => ({
  id: it.id,
  title: it.title,
  status: it.status,
  updatedAt: it.updatedAt,
  ikFinalBid: it.ikFinalBid,
  _cloudLean: { v: 1 },
}));

// ===========================================================================
// PART A — coldMem = null (INDEX hot-only, brak FULL, recovery)
// ===========================================================================

console.log("\n== PART A: brak FULL lokalnie (coldMem null) ==");

assert("harness: coldMem null na wejściu", getPipelineColdMemory() === null);
assert("harness: INDEX fixture ma marker", classifyPipelineRepresentation(INDEX_SEQ_7) === "INDEX");

seedLs(INDEX_SEQ_7);

// --- T-READER-INDEX-HOT-ONLY + T-READER-MISSING-IDB + T-READER-NO-MARKER-STRIPPING
{
  const items = loadTendersPipelineLocal();
  assert("T-READER-INDEX-HOT-ONLY zwrócone items zachowują `_lsIndex`", items.length === 6 && items.every((it) => it._lsIndex?.v === 1));
  assert("T-READER-INDEX-HOT-ONLY nie jest FULL (klasa INDEX)", classifyPipelineRepresentation(items) === "INDEX");
  const validation = validatePipelineFullForWrite(items);
  assert("T-READER-INDEX-HOT-ONLY writer odrzuca (index_not_full)", validation.ok === false && validation.reason === "index_not_full", validation);
  assert("T-READER-INDEX-HOT-ONLY availability DEGRADED_INDEX", getPipelineFullAvailability() === "DEGRADED_INDEX");
  assert("T-READER-INDEX-HOT-ONLY brak zapisu LS przez reader", ls.setCalls.length === 0);
  assert("T-READER-INDEX-HOT-ONLY brak zapisu IDB przez reader", idbRaw() === undefined);
  assert("T-READER-NO-MARKER-STRIPPING LS bez zmian", ls.getItem(PIPELINE_KEY) === INDEX_JSON);
  assert("T-READER-NO-MARKER-STRIPPING brak removeItem", ls.removeCalls.length === 0);

  const src = await resolvePipelineFullSource();
  assert("T-READER-MISSING-IDB status NO_FULL", src.status === "NO_FULL", src.status);
  assert("T-READER-MISSING-IDB idbStatus MISSING", src.status === "NO_FULL" && src.idbStatus === "MISSING", src);
  assert("T-READER-MISSING-IDB lsKind INDEX + id-set", src.status === "NO_FULL" && src.lsKind === "INDEX" && src.index?.length === 6);
  assert("T-READER-MISSING-IDB nigdy FULL z INDEX", src.status !== "FULL");
}

// --- T-READER-CLOUD-UNAVAILABLE
{
  cloudMode = "throw";
  const from = history().length;
  const items = await loadTendersPipeline();
  assert("T-READER-CLOUD-UNAVAILABLE telemetria recovery_unavailable", notesSince(from).some((n) => String(n).startsWith("recovery_unavailable")), notesSince(from));
  assert("T-READER-CLOUD-UNAVAILABLE zwrot = INDEX read-only", classifyPipelineRepresentation(items) === "INDEX");
  assert("T-READER-CLOUD-UNAVAILABLE brak INDEX → FULL", getPipelineColdMemory() === null && idbRaw() === undefined);
  assert("T-READER-CLOUD-UNAVAILABLE brak cloud poisoning (0 zapisów LS)", ls.setCalls.length === 0);
  assert("T-READER-CLOUD-UNAVAILABLE availability DEGRADED_INDEX", getPipelineFullAvailability() === "DEGRADED_INDEX");
}

// --- T-READER-CORRUPT-IDB
{
  idb.seed(IDB_KEY, { schemaVersion: 1, localSeq: 3, bundleRevision: 0, itemCount: 2, writtenAt: "2026-09-10T00:00:00.000Z", maxUpdatedAt: "", items: "nope" });
  const parsed = parsePipelineIdbEnvelope(idbRaw());
  assert("T-READER-CORRUPT-IDB parser = CORRUPT", parsed.status === "CORRUPT", parsed);
  const src = await resolvePipelineFullSource();
  assert("T-READER-CORRUPT-IDB status NO_FULL", src.status === "NO_FULL" && src.idbStatus === "CORRUPT", src);
  const items = loadTendersPipelineLocal();
  assert("T-READER-CORRUPT-IDB zwrot = INDEX (degraded)", classifyPipelineRepresentation(items) === "INDEX");
  assert("T-READER-CORRUPT-IDB corrupt nie skasowany", idbRaw() !== undefined);
  assert("T-READER-CORRUPT-IDB brak INDEX → FULL", getPipelineColdMemory() === null);
}

// --- T-READER-SUBSET-FAIL (CASE 7) — deterministyczny REJECT bez zapisu i bez silent loss
{
  const cloudMissingOne = FULL.slice(1).map((it) => ({ ...it }));
  const idbBefore = JSON.stringify(idbRaw() ?? null);
  const direct = acceptExternalFull(cloudMissingOne, FULL.map((it) => it.id));
  assert("T-READER-SUBSET-FAIL acceptExternalFull REJECT jawny", direct.ok === false && direct.reason === "index_ids_not_in_source:1", direct);
  assert("T-READER-SUBSET-FAIL raportuje brakujące id (bez silent loss)", direct.ok === false && sameJson(direct.missingIds, ["t-0001"]));
  assert("T-READER-SUBSET-FAIL REJECT nie zapisuje FULL (IDB bez zmian)", JSON.stringify(idbRaw() ?? null) === idbBefore);
  assert("T-READER-SUBSET-FAIL REJECT nie nadpisuje LS", ls.setCalls.length === 0 && ls.getItem(PIPELINE_KEY) === INDEX_JSON);
  assert("T-READER-SUBSET-FAIL stan pozostaje DEGRADED_INDEX", getPipelineFullAvailability() === "DEGRADED_INDEX");
  assert("T-READER-SUBSET-FAIL brak promocji INDEX po REJECT", getPipelineColdMemory() === null);
}

// --- A7 recovery §A.5.3: ACCEPT (subset OK) → canonical writer → envelope ACK → LS INDEX
{
  setFlag(true);
  const accepted = acceptExternalFull(FULL.map((it) => ({ ...it })), INDEX_SEQ_7.map((it) => it.id));
  assert("§A.5.3 ACCEPT gdy ids(INDEX) ⊆ ids(source)", accepted.ok === true);
  bzp.saveTendersPipelineLocal(accepted.items);
  const settled = await awaitPipelineLocalWriteSettled();
  assert("§A.5.3 recovery przez canonical writer (envelope + ACK)", settled?.idb?.ok === true && settled.idb.localSeq >= 1, settled?.idb);
  assert("§A.5.3 availability FULL po ACK", getPipelineFullAvailability() === "FULL");
  const env = parsePipelineIdbEnvelope(idbRaw());
  assert("§A.5.3 envelope FULL zapisany", env.status === "OK" && env.envelope?.itemCount === 6, env.status);
  assert("§A.5.3 envelope items = FULL (heavy obecne)", env.envelope?.items?.every((it) => typeof it.noticeHtml === "string"));
  const lsNow = lsParsed();
  assert("§A.5.3 LS = INDEX z nowym seq", classifyPipelineRepresentation(lsNow) === "INDEX" && lsNow[0]._lsIndex.seq === env.envelope?.localSeq, { seq: lsNow?.[0]?._lsIndex?.seq, env: env.envelope?.localSeq });
  assert("§A.5.3 coldMem = FULL (nie INDEX)", classifyPipelineRepresentation(getPipelineColdMemory()) === "FULL");
}

// ===========================================================================
// PART B — FULL dostępny (RAM/IDB) — precedencja i nienaruszalność
// ===========================================================================

console.log("\n== PART B: precedencja FULL (coldMem/IDB) ==");

// --- T-READER-IDB-FIRST
{
  seedLs(INDEX_SEQ_7); // stary INDEX (seq 7) obok świeżego FULL
  const items = loadTendersPipelineLocal();
  assert("T-READER-IDB-FIRST zwraca FULL, nie INDEX", classifyPipelineRepresentation(items) === "FULL");
  assert("T-READER-IDB-FIRST FULL ma heavy (noticeHtml)", items.every((it) => typeof it.noticeHtml === "string"));
  assert("T-READER-IDB-FIRST writer akceptuje zwrot jako FULL", validatePipelineFullForWrite(items).ok === true);
  assert("T-READER-IDB-FIRST reader nie zapisał LS", lsParsed()?.[0]?._lsIndex?.seq === 7);
}

// --- T-READER-FULL-IMMUTABLE
{
  const env = parsePipelineIdbEnvelope(idbRaw());
  const envItems = env.envelope?.items ?? [];
  assert("T-READER-FULL-IMMUTABLE envelope FULL nietknięty przez INDEX w LS", envItems.every((it) => !hasLsIndexMarker([it])));
  assert("T-READER-FULL-IMMUTABLE fixture FULL nie zmutowany", JSON.stringify(FULL) === FULL_JSON);
  const cm = getPipelineColdMemory();
  assert("T-READER-FULL-IMMUTABLE coldMem = FULL", cm != null && classifyPipelineRepresentation(cm) === "FULL");
}

// --- T-READER-STALE-IDB
{
  const env = parsePipelineIdbEnvelope(idbRaw()).envelope;
  const stale = { ...env, bundleRevision: 1 };
  idb.seed(IDB_KEY, stale);
  const guard = { v: 1, bundleRevision: 9, items: stale.items.map((it) => ({ id: it.id, updatedAt: it.updatedAt })) };
  const fresh = evaluatePipelineIdbFreshness(stale, guard, []);
  assert("T-READER-STALE-IDB stale ≠ corrupt (parser OK)", parsePipelineIdbEnvelope(stale).status === "OK");
  assert("T-READER-STALE-IDB freshness = STALE_REVISION", fresh.freshness === "STALE_REVISION", fresh);
  const hyd = await hydratePipelineColdEnvelopeFromIdb();
  assert("T-READER-STALE-IDB stale FULL pozostaje FULL", classifyPipelineRepresentation(hyd.items) === "FULL");
  assert("T-READER-STALE-IDB FULL nie zastąpiony projekcjami INDEX", hyd.items.every((it) => typeof it.noticeHtml === "string"));
  const src = await resolvePipelineFullSource();
  assert("T-READER-STALE-IDB FULL-source nadal FULL", src.status === "FULL", src.status);
}

// ===========================================================================
// PART C — funkcje czyste + granice reprezentacji / merge / seam / callerzy
// ===========================================================================

console.log("\n== PART C: merge / legacy / seam / callerzy ==");

// --- T-READER-MERGE-NO-INDEX + T-READER-EQUAL-UPDATEDAT (§A.6.3)
{
  const cloudFull = FULL.map((it) => ({ ...it }));
  const merged = mergeTenderPipelineForCloud(INDEX_SEQ_7, cloudFull);
  assert("T-READER-MERGE-NO-INDEX wynik = FULL (strona INDEX wykluczona)", classifyPipelineRepresentation(merged) === "FULL" && merged.length === 6);
  assert("T-READER-MERGE-NO-INDEX heavy z cloud zachowane", merged.every((it) => typeof it.noticeHtml === "string"));
  assert("T-READER-MERGE-NO-INDEX brak markerów w wyniku", hasLsIndexMarker(merged) === false);

  // równe updatedAt: INDEX nie może być „primary” i nadpisać FULL projekcjami (F-P0-01)
  const equalIndex = buildTenderPipelineLsIndex(FULL, 11);
  const mergedEqual = mergeTenderPipelineForCloud(equalIndex, cloudFull);
  assert("T-READER-EQUAL-UPDATEDAT FULL pozostaje FULL przy równym updatedAt", mergedEqual.every((it) => typeof it.noticeHtml === "string" && typeof it.notes === "string"));
  assert("T-READER-EQUAL-UPDATEDAT brak pól INDEX-only", hasLsIndexMarker(mergedEqual) === false);

  // INDEX po stronie cloud również nie jest uczestnikiem
  const mergedCloudIndex = mergeTenderPipelineForCloud(FULL.map((it) => ({ ...it })), INDEX_SEQ_7);
  assert("T-READER-MERGE-NO-INDEX INDEX po stronie cloud odfiltrowany", hasLsIndexMarker(mergedCloudIndex) === false && mergedCloudIndex.every((it) => typeof it.noticeHtml === "string"));

  // deferred bootstrap: LS INDEX + brak cloud ⇒ brak promocji
  const mergedNoCloud = mergeTenderPipelineForCloud(INDEX_SEQ_7, null);
  assert("T-READER-DEFERRED-BOOTSTRAP merge(INDEX, null) = [] (brak promocji)", Array.isArray(mergedNoCloud) && mergedNoCloud.length === 0);
}

// --- T-READER-LEGACY-FULL / LEGACY-LEAN / CLOUD-LEAN
{
  assert("T-READER-LEGACY-FULL detect = LEGACY_FULL", detectPipelineLsKind(FULL_JSON).kind === "LEGACY_FULL");
  assert("T-READER-LEGACY-FULL klasa ≠ INDEX", classifyPipelineRepresentation(FULL) === "FULL");
  assert("T-READER-LEGACY-LEAN detect = LEGACY_LEAN", detectPipelineLsKind(JSON.stringify(LEGACY_LEAN)).kind === "LEGACY_LEAN");
  assert("T-READER-LEGACY-LEAN nie jest INDEX ani automatycznym FULL-source z LS przy IDB OK", classifyPipelineRepresentation(LEGACY_LEAN) === "FULL");
  assert("T-READER-CLOUD-LEAN nie jest INDEX", classifyPipelineRepresentation(CLOUD_LEAN) === "FULL");
  assert("T-READER-CLOUD-LEAN bez shape inference w readerze (brak `_lsIndex`)", hasLsIndexMarker(CLOUD_LEAN) === false);

  // FULL-source: IDB ma pierwszeństwo nad LS LEGACY_LEAN (F-P2-01)
  const srcOrder = readSource("src/lib/tenders-bzp.ts");
  const fnBody = srcOrder.slice(srcOrder.indexOf("export async function resolvePipelineFullSource"));
  assert("F-P2-01 kolejność: RAM → IDB → LS w resolvePipelineFullSource",
    fnBody.indexOf("getPipelineColdMemory") < fnBody.indexOf("hydratePipelineColdEnvelopeFromIdb") &&
    fnBody.indexOf("hydratePipelineColdEnvelopeFromIdb") < fnBody.indexOf("detectPipelineLsKind"));
}

// --- T-READER-RESTORE / import (§A.8.1–A.8.2) — acceptExternalFull
{
  const rejectIndex = acceptExternalFull(INDEX_SEQ_7, []);
  assert("T-READER-RESTORE INDEX jako źródło zewnętrzne = REJECT", rejectIndex.ok === false && rejectIndex.reason === "external_source_index", rejectIndex);
  const rejectShape = acceptExternalFull({ a: 1 }, []);
  assert("T-READER-RESTORE nie-tablica = REJECT", rejectShape.ok === false && rejectShape.reason === "external_source_not_array");
  const okFull = acceptExternalFull(FULL.map((it) => ({ ...it })), FULL.map((it) => it.id));
  assert("T-READER-RESTORE FULL z pliku/chmury = ACCEPT", okFull.ok === true && okFull.items.length === 6, okFull.ok ? "ok" : okFull);
  assert("T-READER-RESTORE FULL′ nienaruszone przez INDEX", okFull.ok && okFull.items.every((it) => typeof it.noticeHtml === "string" && !hasLsIndexMarker([it])));
  const okLean = acceptExternalFull(LEGACY_LEAN.map((it) => ({ ...it })), []);
  assert("T-READER-RESTORE LEGACY_LEAN (FULL-compatible §A.4) = ACCEPT", okLean.ok === true);
}

// --- Seam §A.6.5 — INDEX nigdy do cloud
{
  const push = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-push.ts");
  let thrown = null;
  try { await push.pushTenderPipelineToCloud(INDEX_SEQ_7); } catch (e) { thrown = e; }
  assert("§A.6.5 seam odrzuca INDEX (PipelineIndexNotFullError)", thrown?.code === "PIPELINE_INDEX_NOT_FULL", thrown?.message);
}

// --- Granice na poziomie źródła (call graph readerów)
{
  const bzpSrc = readSource("src/lib/tenders-bzp.ts");
  const cacheSrc = readSource("src/lib/tenders-pipeline-session-cache.ts");
  const cloudSyncSrc = readSource("src/lib/cloud-sync.ts");
  const appSrc = readSource("src/app/App.tsx");
  const emailSrc = readSource("src/lib/weekly-backup-email.ts");

  assert("R2 session cache: brak readPipelineLocal (§5)", !cacheSrc.includes("readPipelineLocal"));
  assert("R2 session cache: items z getPipelineColdMemory", cacheSrc.includes("getPipelineColdMemory()"));
  assert("R2 session cache: brak parsowania body LS pipeline", !cacheSrc.includes("TENDERS_PIPELINE_KEY"));

  assert("R9 bootstrap: local side przez resolveBootstrapPipelineLocalSide", cloudSyncSrc.includes("resolveBootstrapPipelineLocalSide(local)"));
  assert("R9 bootstrap: brak FULL ⇒ klucz pominięty", /if \(localFull === undefined\) return;/.test(cloudSyncSrc));
  assert("R9 bootstrap: telemetria bootstrap_pipeline_skipped_no_full", cloudSyncSrc.includes("bootstrap_pipeline_skipped_no_full"));
  assert("§A.6.3 null-short-circuit: storedSideForMerge dla pipeline", cloudSyncSrc.includes("function storedSideForMerge") && cloudSyncSrc.includes("const storedSide = storedSideForMerge(key, stored)"));

  assert("R3 import: local side = resolvePipelineFullSource", appSrc.includes("const local = await resolvePipelineFullSource()"));
  assert("R3 import: plik walidowany przez acceptExternalFull", appSrc.includes("acceptExternalFull(data[TENDERS_PIPELINE_KEY]"));
  assert("R5 restore: local side = resolvePipelineFullSource", appSrc.includes("const localPipeline = await resolvePipelineFullSource()"));
  assert("R5 restore: snapshot cloud walidowany", appSrc.includes("acceptExternalFull(cloudValues[pipeIdx]"));
  assert("R3/R5 nie używają loadTendersPipelineLocal", !appSrc.includes("loadTendersPipelineLocal"));
  assert("R4 export: FULL albo INCOMPLETE (§9)", appSrc.includes("pipelineTag = \"-INCOMPLETE\"") && appSrc.includes("pipelineTag = \"-full\""));
  assert("R8 e-mail: INDEX nigdy jako pipeline", emailSrc.includes("hasLsIndexMarker") && emailSrc.includes("delete data[TENDERS_PIPELINE_BACKUP_KEY]"));

  const recovery = bzpSrc.slice(bzpSrc.indexOf("async function recoverPipelineFullFromCloud"), bzpSrc.indexOf("export async function loadTendersPipeline"));
  assert("§A.5.3 recovery: zapis wyłącznie przez canonical writer", recovery.includes("saveTendersPipelineLocal(accepted.items)"));
  assert("§A.5.3 recovery: brak merge(INDEX, cloud)", !recovery.includes("mergeTenderPipelineForCloud"));
  assert("§A.5.3 recovery: brak wywołań push", !/\bpush[A-Za-z]*\(/.test(recovery));
  assert("§A.5.3 recovery: REJECT → telemetria index_ids_not_in_cloud", recovery.includes("index_ids_not_in_cloud"));

  assert("R1 reader: brak `as TenderPipelineItem[]` z surowego JSON.parse LS", !/JSON\.parse\(localStorage\.getItem\(TENDERS_PIPELINE_KEY\)/.test(bzpSrc));
  assert("R1 reader: brak zdejmowania markera", !/delete [A-Za-z.]*_lsIndex/.test(bzpSrc) && !/delete [A-Za-z.]*_lsIndex/.test(cloudSyncSrc));
  assert("§A.6.2 ingest hydrate pomija INDEX", bzpSrc.includes("ingest_hydrate_skipped:index_not_full"));
}

// ---------------------------------------------------------------------------

console.log(`\n=== STORAGE-TIER1 Phase 4 READER MIGRATION: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) {
  console.log("FAILURES:", failures.join(" | "));
  process.exit(1);
}
