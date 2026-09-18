/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 6: ONE WRITER CONVERGENCE (T-WRITER-*).
 * Design Freeze v1.1 §3 (writer contract), §6 (LS), §10 (reset), §11 (writers A–F), §A (INDEX ≠ FULL);
 * PLAN Phase 6 / D6 — canonical local writer = `saveTendersPipelineLocal`, PIPELINE-WRITER-01.
 *
 * Moduły pipeline trzymają stan sesji (coldMem, localSeq, memo kształtu LS), którego produkcja nie
 * resetuje — KAŻDY scenariusz biegnie w osobnym procesie (`--case=<id>`), jak w Phase 3/5.
 *
 * Run:  npx vite-node scripts/test-storage-tier1-pipeline-one-writer.mjs
 * Single: npx vite-node scripts/test-storage-tier1-pipeline-one-writer.mjs --case=writer-b
 */

import { spawnSync } from "child_process";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/test-storage-tier1-pipeline-one-writer.mjs";

const CASES = [
  "static",
  "writer-b",
  "writer-b-index",
  "reset-block",
  "reset-allow",
  "restore-full",
  "restore-index",
  "cloud-safe",
  "quota",
];

/** Tylko te scenariusze wolno zbliżać do seamu chmurowego (stub fetch + VITE_SUPABASE_*). */
const CLOUD_CASES = new Set(["reset-block", "reset-allow"]);

const PIPELINE_KEY = "kw-tenders-pipeline";
const SETTINGS_KEY = "kw-app-settings";
const DELETED_IDS_KEY = "kw-tenders-deleted-ids";
const INGEST_KEY = "kw-tender-ingest-v1";
const IDB_KEY = "tenders-pipeline-full";

// ---------------------------------------------------------------------------
// Parent — one child per scenario
// ---------------------------------------------------------------------------

function runParent() {
  const started = Date.now();
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const id = CASES[i];
    console.log(`\n--- [${i + 1}/${CASES.length}] T-WRITER ${id} ---\n`);
    const env = { ...process.env };
    if (CLOUD_CASES.has(id)) {
      env.VITE_SUPABASE_PROJECT_ID = "phase6-one-writer";
      env.VITE_SUPABASE_ANON_KEY = "phase6-anon-key";
    }
    const res = spawnSync("npx", ["vite-node", SELF, `--case=${id}`], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env,
    });
    if (res.status !== 0) {
      console.error(`\nFAIL case ${id}\n`);
      console.error(`=== PHASE 6 ONE WRITER: ${passed}/${CASES.length} cases PASS — ABORT ===`);
      process.exit(1);
    }
    passed++;
  }
  console.log(`\n=== PHASE 6 ONE WRITER: ${passed}/${CASES.length} cases PASS (${Date.now() - started}ms) ===\n`);
  process.exit(0);
}

const caseArg = process.argv.find((a) => a.startsWith("--case="));
if (!caseArg) runParent();

const CASE_ID = caseArg.slice("--case=".length);

// ---------------------------------------------------------------------------
// Child harness — localStorage (spy + fault injection) + idb stub + cloud stub
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
      this.setCalls.push({ value: String(v) });
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

/** Stub chmury: batch-get zwraca `cloudKv`, każdy inny endpoint = OK (zapis rejestrowany). */
const cloudKv = new Map();
const cloudCalls = { get: 0, set: 0, other: 0 };
const cloudSetBodies = [];
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.endsWith("/batch-get")) {
    cloudCalls.get += 1;
    const keys = JSON.parse(init?.body ?? "{}").keys ?? [];
    const values = keys.map((k) => (cloudKv.has(k) ? cloudKv.get(k) : null));
    return { ok: true, status: 200, json: async () => ({ values }) };
  }
  if (u.endsWith("/batch-set")) {
    cloudCalls.set += 1;
    const body = JSON.parse(init?.body ?? "{}");
    cloudSetBodies.push(body);
    for (const [k, v] of Object.entries(body.items ?? body.kv ?? {})) cloudKv.set(k, v);
    if (Array.isArray(body.entries)) {
      for (const e of body.entries) cloudKv.set(e.key, e.value);
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }
  cloudCalls.other += 1;
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

const idb = installIdbStub({ mode: "ok" });
idb.reset();

function idbRawEnvelope() { return idb.getRaw(IDB_KEY)?.value; }

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
const notes = () => globalThis.__WG_STORAGE__.history().map((e) => e.note);
const readSource = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

function listSourceFiles(dir, out = []) {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(path.join(ROOT, rel)).isDirectory()) listSourceFiles(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

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
} = cold;
const { awaitPipelineLocalWriteSettled, TENDERS_PIPELINE_KEY } = bzp;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullItem(n) {
  return {
    id: `t-${String(n).padStart(4, "0")}`,
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
    tenderDossier: { kosztorys: { ok: true, rows: Array.from({ length: 12 }, (_, i) => ({ lp: i + 1, name: `poz ${i}` })), rowCount: 12 } },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"] },
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: false },
    ikFinalBid: { v: 1, finalBidPln: 104500 + n },
    changeMonitor: { events: [{ at: "2026-09-10", kind: "docs_changed" }] },
  };
}

const FULL6 = Array.from({ length: 6 }, (_, i) => fullItem(i + 1));
const FULL4 = FULL6.slice(0, 4);
const LEGACY_LEAN6 = stripTenderPipelineForLocalStorage(FULL6);
const INDEX_SEQ_5 = buildTenderPipelineLsIndex(FULL6, 5);

assert("harness: klucz LS", TENDERS_PIPELINE_KEY === PIPELINE_KEY);

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

if (CASE_ID === "static") {
  // T-WRITER-ONE / T-WRITER-RAW-SETITEM / T-WRITER-ALL-ENTRYPOINTS / T-WRITER-INGEST-SEPARATE.
  const files = listSourceFiles("src");
  const rawSetItem = [];
  const rawRemoveItem = [];
  /** Linie komentarza nie są zapisem — liczymy wyłącznie kod. */
  const codeLines = (src) => src.split(/\r?\n/).filter((l) => !/^\s*(?:\/\/|\/\*|\*)/.test(l));
  for (const rel of files) {
    const lines = codeLines(readSource(rel));
    const setHits = lines.filter((l) => /localStorage\.setItem\(\s*(?:TENDERS_PIPELINE_KEY|["']kw-tenders-pipeline["'])/.test(l)).length;
    const removeHits = lines.filter((l) => /localStorage\.removeItem\(\s*(?:TENDERS_PIPELINE_KEY|["']kw-tenders-pipeline["'])/.test(l)).length;
    if (setHits > 0) rawSetItem.push({ rel, setHits });
    if (removeHits > 0) rawRemoveItem.push({ rel, removeHits });
  }

  assert("T-WRITER-ONE dokładnie jeden plik z setItem(pipeline) = canonical seam",
    rawSetItem.length === 1 && rawSetItem[0].rel === "src/lib/tenders-bzp.ts" && rawSetItem[0].setHits === 1, rawSetItem);
  assert("T-WRITER-RAW-SETITEM RAW_PIPELINE_SETITEM = 0 poza seamem",
    rawSetItem.filter((h) => h.rel !== "src/lib/tenders-bzp.ts").length === 0, rawSetItem);
  assert("T-WRITER-RAW-SETITEM brak removeItem(pipeline) w src (DF §8.4/§10)",
    rawRemoveItem.length === 0, rawRemoveItem);

  const bzpSrc = readSource("src/lib/tenders-bzp.ts");
  const seam = bzpSrc.slice(bzpSrc.indexOf("function writePipelineLsPayload"), bzpSrc.indexOf("export function saveTendersPipelineLocal"));
  assert("T-WRITER-ONE setItem znajduje się w writePipelineLsPayload (seam writera)",
    /localStorage\.setItem\(TENDERS_PIPELINE_KEY,/.test(seam));

  // Writer B — cloud-sync: pipeline nie idzie przez safeSetLocalStorageJson.
  const syncSrc = readSource("src/lib/cloud-sync.ts");
  const persistBootstrap = syncSrc.slice(
    syncSrc.indexOf("export function persistBootstrapMergedKey"),
    syncSrc.indexOf("function resolveBootstrapPipelineLocalSide"),
  );
  assert("T-WRITER-B route pipeline → canonical writer przed safeSetLocalStorageJson",
    persistBootstrap.indexOf("saveTendersPipelineLocal") < persistBootstrap.indexOf("safeSetLocalStorageJson")
    && /key === TENDERS_PIPELINE_KEY/.test(persistBootstrap), persistBootstrap.length);
  assert("T-WRITER-B pozostałe klucze bez zmiany semantyki",
    persistBootstrap.includes("const result = safeSetLocalStorageJson(key, merged);"));
  const persistKeySection = syncSrc.slice(syncSrc.indexOf("export async function persistKey"));
  assert("T-WRITER-B persistKey nadal deleguje pipeline do canonical writera",
    persistKeySection.slice(0, 2000).includes("saveTendersPipelineLocal"));

  // Writer C/F — App.tsx: klucz pipeline wyjęty z generycznych pętli setItem.
  const appSrc = readSource("src/app/App.tsx");
  const importBackup = appSrc.slice(appSrc.indexOf("const importBackup"), appSrc.indexOf("const exportBackup"));
  const importBackupBody = importBackup.length > 0 ? importBackup : appSrc;
  assert("T-WRITER-C pipeline usunięty z generycznej pętli setItem przed zapisem",
    /delete data\[TENDERS_PIPELINE_KEY\]/.test(importBackupBody)
    && importBackupBody.indexOf("delete data[TENDERS_PIPELINE_KEY]") < importBackupBody.indexOf("Object.entries(data).forEach"), true);
  assert("T-WRITER-C import zapisuje pipeline canonical writerem",
    /saveTendersPipelineLocal\(pipelineImported\)/.test(importBackupBody));
  assert("T-WRITER-C bundle chmurowy używa FULL z importu (nie body LS)",
    /if \(k === TENDERS_PIPELINE_KEY\) return pipelineImported \?\? null;/.test(importBackupBody));
  assert("T-WRITER-F restore z chmury: pipeline przez canonical writer, generyczny setItem pominięty",
    /if \(i === pipeIdx\)/.test(appSrc)
    && /saveTendersPipelineLocal\(merged\[pipeIdx\]/.test(appSrc));

  // Writer D — reset: cloud-first, zero destrukcji przed verdictem.
  const adminSrc = readSource("src/lib/tenders-admin.ts");
  const reset = adminSrc.slice(adminSrc.indexOf("export async function resetTendersPipeline"), adminSrc.indexOf("export async function resetTendersKeywords"));
  assert("T-WRITER-D reset: cloud read + write-safety PRZED zapisem lokalnym (DF §10)",
    reset.indexOf("assertTenderPipelineCloudWriteAllowed") < reset.indexOf("saveTendersPipelineLocal")
    && reset.indexOf("fetchKeysFromCloud") < reset.indexOf("assertTenderPipelineCloudWriteAllowed"), reset);
  assert("T-WRITER-D reset: jeden lokalny zapis pipeline (bez duplikatu persistKey)",
    (reset.match(/saveTendersPipelineLocal/g) ?? []).length === 1
    && !/persistKey\(TENDERS_PIPELINE_KEY/.test(reset));
  assert("T-WRITER-D reset: brak raw removeItem / clear",
    !/removeItem/.test(reset) && !/localStorage/.test(reset));

  // Writer G (F-P2-04) — restore snapshot.
  const backupSrc = readSource("src/lib/local-data-backup.ts");
  const restore = backupSrc.slice(backupSrc.indexOf("export async function restoreLocalDataSnapshot"));
  assert("T-WRITER-RESTORE generic writer pomija pipeline w pętli setItem",
    /if \(key === TENDERS_PIPELINE_KEY\)/.test(restore)
    && restore.indexOf("if (key === TENDERS_PIPELINE_KEY)") < restore.indexOf("localStorage.setItem(key"));
  assert("T-WRITER-RESTORE pipeline zapisywany canonical writerem po klasyfikacji",
    /classifyPipelineRepresentation\(pipelineValue\)/.test(restore)
    && /saveTendersPipelineLocal\(/.test(restore)
    && restore.indexOf("classifyPipelineRepresentation(pipelineValue)") < restore.indexOf("saveTendersPipelineLocal("));

  // T-WRITER-INGEST-SEPARATE
  const ingestSrc = readSource("src/lib/tender-ingest/registry.ts");
  assert("T-WRITER-INGEST-SEPARATE kw-tender-ingest-v1 to osobny klucz/writer",
    ingestSrc.includes(INGEST_KEY) === false
      ? /TENDER_INGEST_LS_KEY/.test(ingestSrc)
      : true);
  assert("T-WRITER-INGEST-SEPARATE ingest nie zapisuje klucza pipeline",
    !/localStorage\.setItem\(\s*(?:TENDERS_PIPELINE_KEY|["']kw-tenders-pipeline["'])/.test(ingestSrc)
    && !/saveTendersPipelineLocal/.test(ingestSrc));
  const ingestPatchSrc = readSource("src/lib/tender-ingest/persist-ingest-artifact-patch.ts");
  assert("T-WRITER-INGEST-SEPARATE ingest patch = cloud writer (bez lokalnego zapisu pipeline)",
    !/localStorage\.setItem/.test(ingestPatchSrc) && !/saveTendersPipelineLocal/.test(ingestPatchSrc));

  // T-WRITER-ALL-ENTRYPOINTS — komplet delegacji.
  const entrypoints = [
    ["cloud-sync.persistBootstrapMergedKey (B)", persistBootstrap.includes("saveTendersPipelineLocal")],
    ["cloud-sync.persistKey", persistKeySection.slice(0, 2000).includes("saveTendersPipelineLocal")],
    ["App.importBackup (C)", /saveTendersPipelineLocal\(pipelineImported\)/.test(appSrc)],
    ["App.restoreAllDataFromCloud (F)", /saveTendersPipelineLocal\(merged\[pipeIdx\]/.test(appSrc)],
    ["tenders-admin.resetTendersPipeline (D)", /saveTendersPipelineLocal\(\[\]\)/.test(adminSrc)],
    ["local-data-backup.restoreLocalDataSnapshot (G)", /saveTendersPipelineLocal\(/.test(backupSrc)],
    ["tender-pipeline-persist-coalesce", /saveTendersPipelineLocal\(items\)/.test(readSource("src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts"))],
    ["tenders-bzp.saveTendersPipeline + recovery + hydrate (A)", (bzpSrc.match(/saveTendersPipelineLocal\(/g) ?? []).length >= 4],
  ];
  for (const [label, ok] of entrypoints) {
    assert(`T-WRITER-ALL-ENTRYPOINTS ${label} → canonical seam`, ok === true);
  }

  // PERF — ONE FULL SERIALIZATION PER WRITE: delegacje nie serializują pipeline po drodze.
  assert("PERF delegacja B bez własnej serializacji FULL",
    !/JSON\.stringify/.test(persistBootstrap.slice(persistBootstrap.indexOf("key === TENDERS_PIPELINE_KEY"), persistBootstrap.indexOf("const result = safeSetLocalStorageJson"))));
  assert("PERF delegacja restore bez własnej serializacji pipeline",
    !/JSON\.stringify\(pipelineValue/.test(restore));
  // Phase 7: payload serializowany raz do zmiennej (MEASURE budżetu) i ten sam string idzie do seamu.
  assert("PERF canonical writer: jedna serializacja INDEX (payload mierzony i zapisywany)",
    (bzpSrc.match(/JSON\.stringify\(index\)/g) ?? []).length === 1
    && /const payload = JSON\.stringify\(index\);/.test(bzpSrc)
    && /writePipelineLsPayload\(\s*payload,/.test(bzpSrc));
  assert("PERF brak retry loop w delegacjach", !/retry/i.test(persistBootstrap) && !/retry/i.test(restore) && !/retry/i.test(reset));

  // 02F — bez powrotu generic storage managera.
  const hasStorageManager = listSourceFiles("src").some((rel) => /storage-manager/i.test(rel));
  assert("SCOPE 02F pozostaje 0 kodu (brak generic storage manager)", hasStorageManager === false);
}

if (CASE_ID === "writer-b") {
  // T-WRITER-B — persistBootstrapMergedKey(FULL) ⇒ canonical writer (IDB ACK → LS INDEX), 1 setItem.
  setFlag(true);
  const sync = await import("../src/lib/cloud-sync.ts");
  const before = ls.setCalls.length;

  const result = sync.persistBootstrapMergedKey(PIPELINE_KEY, FULL6);
  assert("T-WRITER-B kontrakt callera zachowany ({ok:true})", result.ok === true && result.storageFailure === false, result);

  await sync.awaitBootstrapPipelinePersistSettled();
  await awaitPipelineLocalWriteSettled();

  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("T-WRITER-B IDB FULL envelope OK (IDB-first)", env.status === "OK" && env.envelope.itemCount === 6, env.status);
  assert("T-WRITER-B LS = INDEX (nie raw FULL/LEAN)", classifyPipelineRepresentation(lsParsed()) === "INDEX", lsRaw()?.slice(0, 80));
  assert("T-WRITER-B marker seq = envelope.localSeq", lsParsed().every((it) => it._lsIndex.seq === env.envelope.localSeq));
  assert("T-WRITER-B dokładnie jeden setItem pipeline (bez duplikatu persistencji)", ls.setCalls.length - before === 1, ls.setCalls.length - before);
  assert("T-WRITER-B telemetria index_written", notes().some((n) => String(n).startsWith("index_written:")), notes());
  assert("T-WRITER-B brak removeItem pipeline", ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0);
  assert("T-WRITER-B heavy zostaje w IDB, nie w LS",
    lsRaw().includes("noticeHtml") === false && env.envelope.items.every((it) => typeof it.noticeHtml === "string"));
  assert("T-WRITER-B brak ruchu chmurowego w zapisie lokalnym", cloudCalls.get === 0 && cloudCalls.set === 0, cloudCalls);
}

if (CASE_ID === "writer-b-index") {
  // T-WRITER-INDEX-REJECT / T-WRITER-BOOTSTRAP — INDEX na wejściu delegacji ⇒ reject writera.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(INDEX_SEQ_5));
  const sync = await import("../src/lib/cloud-sync.ts");
  const lsBefore = lsRaw();
  const setsBefore = ls.setCalls.length;

  sync.persistBootstrapMergedKey(PIPELINE_KEY, INDEX_SEQ_5);
  await sync.awaitBootstrapPipelinePersistSettled();
  const settled = await awaitPipelineLocalWriteSettled();

  assert("T-WRITER-INDEX-REJECT writer odrzucił INDEX (brak zapisu LS)",
    settled.ls.mode === "skipped" && ls.setCalls.length === setsBefore, settled.ls);
  assert("T-WRITER-INDEX-REJECT LS nietknięty", lsRaw() === lsBefore);
  assert("T-WRITER-INDEX-REJECT brak envelope z INDEX w IDB", idbRawEnvelope() === undefined, idbRawEnvelope());
  assert("T-WRITER-INDEX-REJECT telemetria validation/index_not_full",
    notes().some((n) => String(n).includes("index_not_full")), notes());
  assert("T-WRITER-INDEX-REJECT INDEX nadal nie przechodzi walidatora FULL",
    validatePipelineFullForWrite(INDEX_SEQ_5).ok === false && validatePipelineFullForWrite(INDEX_SEQ_5).reason === "index_not_full");

  // T-WRITER-BOOTSTRAP — deferred bootstrap nie promuje INDEX: brak FULL ⇒ klucz pomijany.
  const bootstrapSrc = readSource("src/lib/cloud-sync.ts");
  const deferred = bootstrapSrc.slice(
    bootstrapSrc.indexOf("function resolveBootstrapPipelineLocalSide"),
    bootstrapSrc.indexOf("/** Faza 2 — deferred klucze"),
  );
  assert("T-WRITER-BOOTSTRAP INDEX ⇒ brak FULL (undefined) przed merge/persist",
    /representation === "INDEX"/.test(deferred) && /return undefined;/.test(deferred));
  assert("T-WRITER-BOOTSTRAP brak FULL ⇒ pominięcie klucza (bez merge → writer)",
    /if \(localFull === undefined\) return;/.test(bootstrapSrc));
}

if (CASE_ID === "reset-block") {
  // T-WRITER-D (BLOCK) — cloud non-empty ⇒ RESET BLOCK, local nietknięty (DF §10 / Owner #1).
  setFlag(true);
  const bzpMod = await import("../src/lib/tenders-bzp.ts");
  bzpMod.saveTendersPipelineLocal(FULL6);
  await awaitPipelineLocalWriteSettled();
  const lsBefore = lsRaw();
  const envBefore = JSON.stringify(idbRawEnvelope());
  const setsBefore = ls.setCalls.length;

  cloudKv.set(PIPELINE_KEY, FULL6);
  const admin = await import("../src/lib/tenders-admin.ts");

  let thrown = null;
  try { await admin.resetTendersPipeline(); } catch (e) { thrown = e; }

  assert("T-WRITER-D BLOCK: reset odrzucony przy cloud non-empty",
    thrown != null && String(thrown?.code ?? "").length > 0, { code: thrown?.code, msg: thrown?.message });
  assert("T-WRITER-D BLOCK: LS nietknięty", lsRaw() === lsBefore && ls.setCalls.length === setsBefore);
  assert("T-WRITER-D BLOCK: IDB FULL nietknięty", JSON.stringify(idbRawEnvelope()) === envBefore);
  assert("T-WRITER-D BLOCK: brak removeItem pipeline", ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0);
  assert("T-WRITER-D BLOCK: brak zapisu do chmury", cloudCalls.set === 0, cloudCalls);

  // Cloud UNAVAILABLE ⇒ również BLOCK.
  globalThis.fetch = async () => { throw new Error("stub cloud down"); };
  let thrown2 = null;
  try { await admin.resetTendersPipeline(); } catch (e) { thrown2 = e; }
  assert("T-WRITER-D BLOCK: cloud unavailable ⇒ BLOCK", thrown2 != null, thrown2?.message);
  assert("T-WRITER-D BLOCK: local nadal nietknięty po unavailable",
    lsRaw() === lsBefore && JSON.stringify(idbRawEnvelope()) === envBefore);
}

if (CASE_ID === "reset-allow") {
  // T-WRITER-D (ALLOW) + T-WRITER-EMPTY — jawnie pusty cloud ⇒ canonical writer `[]`.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(FULL6)); // legacy LS — kontekst guardu migracyjnego
  const bzpMod = await import("../src/lib/tenders-bzp.ts");
  assert("T-WRITER-EMPTY exemption empty_collection utrzymana (guard nie blokuje `[]` na legacy LS)",
    bzpMod.evaluatePipelineIndexCutover([]).ok === true
    && bzpMod.evaluatePipelineIndexCutover([]).exemption === "empty_collection",
    bzpMod.evaluatePipelineIndexCutover([]));

  bzpMod.saveTendersPipelineLocal(FULL6);
  await awaitPipelineLocalWriteSettled();

  cloudKv.set(PIPELINE_KEY, []);
  const admin = await import("../src/lib/tenders-admin.ts");
  const setsBefore = ls.setCalls.length;

  await admin.resetTendersPipeline();
  await awaitPipelineLocalWriteSettled();

  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("T-WRITER-D ALLOW: LS = '[]' przez canonical writer", lsRaw() === "[]" && detectPipelineLsKind(lsRaw()).kind === "EMPTY", lsRaw());
  assert("T-WRITER-D ALLOW: envelope itemCount = 0 (durable, nie usunięty)",
    env.status === "OK" && env.envelope.itemCount === 0, env.status);
  assert("T-WRITER-D ALLOW: dokładnie jeden lokalny zapis pipeline", ls.setCalls.length - setsBefore === 1, ls.setCalls.length - setsBefore);
  assert("T-WRITER-D ALLOW: brak removeItem pipeline", ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0);
  assert("T-WRITER-D ALLOW: chmura zapisana pustym FULL (bez INDEX)",
    cloudCalls.set > 0 && !JSON.stringify(cloudSetBodies).includes("_lsIndex"), { set: cloudCalls.set });
}

if (CASE_ID === "restore-full") {
  // T-WRITER-RESTORE (FULL) — snapshot LEGACY_* ⇒ canonical writer, nie raw setItem.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(LEGACY_LEAN6));
  const backup = await import("../src/lib/local-data-backup.ts");
  backup.saveLocalDataSnapshot();

  ls._m.set(PIPELINE_KEY, JSON.stringify(FULL4.map((it) => ({ ...it, title: "nadpisane" }))));
  const setsBefore = ls.setCalls.length;

  const snap = await backup.restoreLocalDataSnapshot();
  await awaitPipelineLocalWriteSettled();

  const env = parsePipelineIdbEnvelope(idbRawEnvelope());
  assert("T-WRITER-RESTORE FULL: snapshot przywrócony", snap != null);
  assert("T-WRITER-RESTORE FULL: IDB envelope z 6 poz. (canonical writer)",
    env.status === "OK" && env.envelope.itemCount === 6, env.status);
  assert("T-WRITER-RESTORE FULL: LS = INDEX po canonical writer", classifyPipelineRepresentation(lsParsed()) === "INDEX", lsRaw()?.slice(0, 60));
  assert("T-WRITER-RESTORE FULL: jeden setItem pipeline (seam)", ls.setCalls.length - setsBefore === 1, ls.setCalls.length - setsBefore);
  assert("T-WRITER-RESTORE FULL: brak surowego zapisu snapshotu na kluczu pipeline",
    !(ls.setCalls[ls.setCalls.length - 1]?.value ?? "").includes("_coldRowsCount"));
}

if (CASE_ID === "restore-index") {
  // T-WRITER-RESTORE (INDEX) — snapshot INDEX ⇒ pominięty (zero INDEX → FULL).
  setFlag(true);
  ls._m.set(PIPELINE_KEY, JSON.stringify(INDEX_SEQ_5));
  const backup = await import("../src/lib/local-data-backup.ts");
  backup.saveLocalDataSnapshot();

  ls._m.set(PIPELINE_KEY, JSON.stringify(LEGACY_LEAN6));
  const lsBefore = lsRaw();
  const setsBefore = ls.setCalls.length;

  const snap = await backup.restoreLocalDataSnapshot();
  await awaitPipelineLocalWriteSettled();

  assert("T-WRITER-RESTORE INDEX: restore zwraca snapshot (pozostałe klucze OK)", snap != null);
  assert("T-WRITER-RESTORE INDEX: brak zapisu pipeline (INDEX ≠ FULL)", ls.setCalls.length === setsBefore, ls.setCalls.length - setsBefore);
  assert("T-WRITER-RESTORE INDEX: LS pipeline nietknięty", lsRaw() === lsBefore);
  assert("T-WRITER-RESTORE INDEX: brak envelope (INDEX nie awansował do FULL)", idbRawEnvelope() === undefined);
  assert("T-WRITER-RESTORE INDEX: telemetria restore_pipeline_skipped:index_not_full",
    notes().some((n) => n === "restore_pipeline_skipped:index_not_full"), notes());
}

if (CASE_ID === "cloud-safe") {
  // T-WRITER-CLOUD-SAFE — delegowany lokalny zapis nie tworzy INDEX → cloud FULL.
  setFlag(true);
  const sync = await import("../src/lib/cloud-sync.ts");
  sync.persistBootstrapMergedKey(PIPELINE_KEY, FULL6);
  await sync.awaitBootstrapPipelinePersistSettled();
  await awaitPipelineLocalWriteSettled();
  assert("T-WRITER-CLOUD-SAFE setup: LS = INDEX po delegacji", classifyPipelineRepresentation(lsParsed()) === "INDEX");

  // Merge cloud↔local: INDEX po stronie lokalnej nie jest uczestnikiem FULL (§A.6.3).
  const tsync = await import("../src/lib/tenders-sync.ts");
  const mergedForCloud = tsync.mergeTenderPipelineForCloud(lsParsed(), FULL6, []);
  assert("T-WRITER-CLOUD-SAFE merge wyklucza INDEX po stronie lokalnej (§A.6.3)",
    mergedForCloud.length === 6 && hasLsIndexMarker(mergedForCloud) === false
    && mergedForCloud.every((it) => typeof it.noticeHtml === "string"), mergedForCloud.length);

  const push = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-push.ts");
  let thrown = null;
  try { await push.pushTenderPipelineToCloud(lsParsed()); } catch (e) { thrown = e; }
  assert("T-WRITER-CLOUD-SAFE seam odrzuca INDEX (PIPELINE_INDEX_NOT_FULL)", thrown?.code === "PIPELINE_INDEX_NOT_FULL", thrown?.message);
  assert("T-WRITER-CLOUD-SAFE 0 zapisów do chmury z INDEX", cloudCalls.set === 0, cloudCalls);

  const syncSrc = readSource("src/lib/cloud-sync.ts");
  assert("T-WRITER-CLOUD-SAFE brak strippingu markera `_lsIndex` w cloud-sync",
    !/delete\s+[a-zA-Z_$.]*_lsIndex/.test(syncSrc));
}

if (CASE_ID === "quota") {
  // T-WRITER-LS-QUOTA — quota LS w delegowanym zapisie ⇒ IDB FULL durable, brak retry.
  setFlag(true);
  const sync = await import("../src/lib/cloud-sync.ts");
  sync.persistBootstrapMergedKey(PIPELINE_KEY, FULL6);
  await sync.awaitBootstrapPipelinePersistSettled();
  await awaitPipelineLocalWriteSettled();
  const lsAfterFirst = lsRaw();

  ls.failMode = "quota";
  const setsBefore = ls.setCalls.length;
  sync.persistBootstrapMergedKey(PIPELINE_KEY, FULL4);
  await sync.awaitBootstrapPipelinePersistSettled();
  const settled = await awaitPipelineLocalWriteSettled();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-WRITER-LS-QUOTA LS bez zmian po quota", lsRaw() === lsAfterFirst);
  assert("T-WRITER-LS-QUOTA brak retry (1 próba setItem)", ls.setCalls.length - setsBefore === 1, ls.setCalls.length - setsBefore);
  assert("T-WRITER-LS-QUOTA IDB FULL durable (seq 2, 4 poz.)",
    settled.idb.ok === true && env.status === "OK" && env.envelope.localSeq === 2 && env.envelope.itemCount === 4, settled.idb);
  assert("T-WRITER-LS-QUOTA brak INDEX w envelope / brak rollbacku", hasLsIndexMarker(env.envelope.items) === false);
  assert("T-WRITER-LS-QUOTA brak removeItem pipeline", ls.removeCalls.filter((k) => k === PIPELINE_KEY).length === 0);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== T-WRITER ${CASE_ID}: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail === 0 ? 0 : 1);
