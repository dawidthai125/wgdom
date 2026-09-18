/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 7: QUOTA / BUDGET / WRITE-BLOCK (T-QUOTA-*, T-INDEX-BUDGET-*).
 * Design Freeze v1.1 §7 (trzy warstwy quota), §3.2 krok 6 (BUDGET), §3.3 B/C (failure paths),
 * §8 (migration), §9 (backup), §4 (reader); PLAN Phase 7 / D8 / NEW-06.
 *
 * Najważniejszy invariant pod testem (PIPELINE-QUOTA-01):
 *   IDB FULL ACK → DURABLE FULL → INDEX WRITE MAY FAIL → FULL MUST SURVIVE
 *
 * Moduły pipeline trzymają stan sesji (coldMem, localSeq, memo kształtu LS) — KAŻDY scenariusz
 * biegnie w osobnym procesie (`--case=<id>`), jak w Phase 3/5/6.
 *
 * Run:  npx vite-node scripts/test-storage-tier1-pipeline-quota-budget.mjs
 * Single: npx vite-node scripts/test-storage-tier1-pipeline-quota-budget.mjs --case=budget-block
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/test-storage-tier1-pipeline-quota-budget.mjs";

const CASES = [
  "static",
  "budget-unit",
  "budget-warn",
  "budget-block",
  "browser-quota",
  "empty-exemption",
  "legacy-migration-budget",
  "reader-after-block",
  "backup-idb-full",
  "layer-c",
];

const PIPELINE_KEY = "kw-tenders-pipeline";
const SETTINGS_KEY = "kw-app-settings";
const IDB_KEY = "tenders-pipeline-full";
const RING_KEY = "wgdom-pipeline-ls-telemetry";

// ---------------------------------------------------------------------------
// Parent — one child per scenario
// ---------------------------------------------------------------------------

function runParent() {
  const started = Date.now();
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const id = CASES[i];
    console.log(`\n--- [${i + 1}/${CASES.length}] T-QUOTA/BUDGET ${id} ---\n`);
    const res = spawnSync("npx", ["vite-node", SELF, `--case=${id}`], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env: { ...process.env },
    });
    if (res.status !== 0) {
      console.error(`\nFAIL case ${id}\n`);
      console.error(`=== PHASE 7 QUOTA/BUDGET: ${passed}/${CASES.length} cases PASS — ABORT ===`);
      process.exit(1);
    }
    passed++;
  }
  console.log(`\n=== PHASE 7 QUOTA/BUDGET: ${passed}/${CASES.length} cases PASS (${Date.now() - started}ms) ===\n`);
  process.exit(0);
}

const caseArg = process.argv.find((a) => a.startsWith("--case="));
if (!caseArg) runParent();

const CASE_ID = caseArg.slice("--case=".length);

// ---------------------------------------------------------------------------
// Child harness — localStorage (spy + fault injection), idb stub, Blob/stringify counters
// ---------------------------------------------------------------------------

const { installIdbStub } = await import("./_lib/idb-memory-stub.mjs");

/**
 * `logPipelineLocalSaveTelemetry` (ring buffer `wgdom-pipeline-ls-telemetry`) jest no-op bez
 * `window` — minimalny shim, żeby testować oba kanały obserwowalności (ring + __WG_STORAGE__).
 */
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;

const ls = {
  _m: new Map(),
  failMode: null, // null | "quota" | "error"
  setCalls: [],
  removeCalls: [],
  setItem(k, v) {
    const key = String(k);
    if (key === PIPELINE_KEY) {
      this.setCalls.push({ bytes: String(v).length });
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

/** Cloud nietknięty przez writera — każde `fetch` to naruszenie kontraktu (seam = caller). */
const fetchCalls = [];
globalThis.fetch = async (url) => {
  fetchCalls.push(String(url));
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};

/**
 * Liczniki dowodzące ONE SERIALIZATION / ONE MEASURE na payload INDEX (DF §7 B, §18).
 * `blobIndex` zlicza wyłącznie pomiary payloadu INDEX — pomiar envelope IDB (Phase 1,
 * `cold.ts`) dotyczy innego payloadu i trafia do `blobOther`.
 */
const counters = { indexStringify: 0, blobIndex: 0, blobOther: 0 };
const rawStringify = JSON.stringify;
const isIndexPayload = (s) => typeof s === "string" && s.startsWith("[{") && s.includes('"_lsIndex"');
JSON.stringify = function (...args) {
  const out = rawStringify.apply(JSON, args);
  if (isIndexPayload(out)) counters.indexStringify++;
  return out;
};
const RawBlob = globalThis.Blob;
globalThis.Blob = class CountingBlob extends RawBlob {
  constructor(parts, opts) {
    super(parts, opts);
    if (Array.isArray(parts) && isIndexPayload(parts[0])) counters.blobIndex++;
    else counters.blobOther++;
  }
};

/**
 * Warstwa C (DF §7 C) biegnie w `requestIdleCallback` i skanuje CAŁY LS. Kolejka nie jest
 * drenowana automatycznie: dzięki temu (a) dowodzimy, że pomiar globalny nie jest synchroniczny,
 * (b) skan LS nie zanieczyszcza liczników `Blob` mierzących payload INDEX.
 */
const idleQueue = [];
globalThis.requestIdleCallback = (cb) => idleQueue.push(cb);
const drainIdle = () => { const q = idleQueue.splice(0); q.forEach((cb) => cb()); return q.length; };

const idb = installIdbStub({ mode: "ok" });
idb.reset();

let pass = 0;
let fail = 0;
function assert(name, cond, detail) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, detail !== undefined ? JSON.stringify(detail) : ""); }
}

const lsRaw = () => ls.getItem(PIPELINE_KEY);
// Phase 11 HARD VERSION GATE — flaga ON wymaga zadeklarowanego minimum ≤ APP_VERSION klienta.
const { APP_VERSION: HARNESS_APP_VERSION } = await import("../src/lib/app-version.ts");
const setFlag = (on) => ls._m.set(SETTINGS_KEY, JSON.stringify({
  pipelineLocalIndexV1: on,
  pipelineLocalIndexMinAppVersion: HARNESS_APP_VERSION,
}));
const notes = () => globalThis.__WG_STORAGE__.history().map((e) => e.note ?? "");
const pipelineSetCalls = () => ls.setCalls.length;
const envelope = () => idb.getRaw(IDB_KEY)?.value;
/** Liczba potwierdzonych zapisów IDB = liczba `envelope:ack:seq=N` (jeden ACK = jeden seq). */
const idbAckCount = () => notes().filter((n) => n.startsWith("envelope:ack:seq=")).length;
const ring = () => { const r = ls.getItem(RING_KEY); return r == null ? [] : JSON.parse(r); };
const readSource = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// Modules (after globals)
// ---------------------------------------------------------------------------

const budgetMod = await import("../src/lib/storage/storage-budget.ts");
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");
const bzp = await import("../src/lib/tenders-bzp.ts");
const telemetry = await import("../src/lib/storage/storage-telemetry.ts");

const {
  PIPELINE_INDEX_LS_WARN,
  PIPELINE_INDEX_LS_BLOCK,
  STORAGE_WARNING,
  STORAGE_CRITICAL,
  STORAGE_LIMIT,
} = budgetMod;
const {
  evaluatePipelineIndexBudget,
  buildTenderPipelineLsIndex,
  detectPipelineLsKind,
  parsePipelineIdbEnvelope,
  getPipelineColdMemory,
  hydratePipelineColdFromIdb,
} = cold;
const {
  saveTendersPipelineLocal,
  awaitPipelineLocalWriteSettled,
  loadTendersPipelineLocal,
  resolvePipelineFullSource,
  readPipelineLocalSaveTelemetry,
  TENDERS_PIPELINE_KEY,
} = bzp;

assert("harness: klucz LS", TENDERS_PIPELINE_KEY === PIPELINE_KEY);

// ---------------------------------------------------------------------------
// Fixtures — FULL z heavy polami + kontrola rozmiaru INDEX (padding w `title`, pole allow-listy)
// ---------------------------------------------------------------------------

function fullItem(n, pad = 0) {
  return {
    id: `t-${String(n).padStart(4, "0")}`,
    bzpNumber: `2026/BZP ${n}`,
    title: `Remont lokalu ${n}${pad > 0 ? ` ${"t".repeat(pad)}` : ""}`,
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
    noticeHtml: `<html><body>${"x".repeat(200)}</body></html>`,
    tenderDossier: { kosztorys: { ok: true, rows: Array.from({ length: 8 }, (_, i) => ({ lp: i + 1, name: `poz ${i}` })), rowCount: 8 } },
    tenderFit: { fitLabel: "strong", winChancePct: 55, reasons: ["r1"] },
    awardResult: { winnerName: "Firma X", amountPln: 100000, fetchedAt: "2026-09-25T00:00:00.000Z", isUs: false },
    ikFinalBid: { v: 1, finalBidPln: 104500 + n },
    changeMonitor: { events: [{ at: "2026-09-10", kind: "docs_changed" }] },
  };
}

const indexBytes = (items, seq = 1) =>
  new RawBlob([rawStringify(buildTenderPipelineLsIndex(items, seq))]).size;

/** FULL o zadanym rozmiarze INDEX (± ~1 KB): korekta paddingu po pomiarze, bez zgadywania. */
function makeFullForIndexBytes(targetBytes, count = 60, startId = 1) {
  let pad = Math.max(0, Math.round(targetBytes / count) - 500);
  for (let i = 0; i < 6; i++) {
    const items = Array.from({ length: count }, (_, k) => fullItem(startId + k, pad));
    const bytes = indexBytes(items);
    if (Math.abs(bytes - targetBytes) <= 1024) return { items, bytes };
    pad += Math.round((targetBytes - bytes) / count);
    if (pad < 0) pad = 0;
  }
  const items = Array.from({ length: count }, (_, k) => fullItem(startId + k, pad));
  return { items, bytes: indexBytes(items) };
}

const FULL_SMALL = Array.from({ length: 5 }, (_, i) => fullItem(i + 1));

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

if (CASE_ID === "static") {
  const bzpSrc = readSource("src/lib/tenders-bzp.ts");
  const coldSrc = readSource("src/lib/storage/tenders-pipeline-cold.ts");
  const budgetSrc = readSource("src/lib/storage/storage-budget.ts");
  const writer = bzpSrc.slice(
    bzpSrc.indexOf("export function saveTendersPipelineLocal"),
    bzpSrc.indexOf("// DF §A.5.2 — FULL-source resolver"),
  );

  // Kolejność DF §3.2: BUILD INDEX → MEASURE/BUDGET → setItem (budżet NIGDY po zapisie).
  const iBuild = writer.indexOf("buildTenderPipelineLsIndex(items, idb.localSeq)");
  const iBudget = writer.indexOf("evaluatePipelineIndexBudget(");
  const iWrite = writer.indexOf("writePipelineLsPayload(");
  assert("T-ORDER budżet pomiędzy BUILD INDEX a setItem (DF §3.2 krok 5→6→7)",
    iBuild > 0 && iBudget > iBuild && iWrite > iBudget, { iBuild, iBudget, iWrite });

  // ONE SERIALIZATION — ten sam `payload` mierzony i zapisywany (brak drugiego JSON.stringify).
  assert("T-ONE-SERIALIZATION jeden `JSON.stringify(index)` w seamie INDEX",
    (writer.match(/JSON\.stringify\(index\)/g) ?? []).length === 1
    && /const payload = JSON\.stringify\(index\);/.test(writer)
    && /writePipelineLsPayload\(\s*payload,/.test(writer), writer.length);
  assert("T-ONE-SERIALIZATION pomiar przekazany do seamu (bez drugiego Blob)",
    /evaluatePipelineIndexBudget\(lsPayloadBytes\(payload\)\)/.test(writer)
    && /budget\.bytes,\s*\n\s*\);/.test(writer));

  // Brak retry / brak destrukcji / brak downgrade formatu po BLOCK (DF §7 zakazy, §10).
  /** Komentarze opisują zakazy słowem „retry” — liczymy wyłącznie kod. */
  const writerCode = writer
    .split(/\r?\n/)
    .filter((l) => !/^\s*(?:\/\/|\/\*|\*)/.test(l))
    .join("\n");
  assert("T-NO-RETRY brak pętli/retry w kodzie writera",
    !/\bfor\s*\(|\bwhile\s*\(|\bdo\s*\{|retry|attempt/i.test(writerCode), writerCode.length);
  assert("T-NO-RETRY jedno wywołanie seamu setItem na ścieżkę (brak powtórzenia)",
    (writerCode.match(/writePipelineLsPayload\(/g) ?? []).length === 1
    && (writerCode.match(/writePipelineLsCompatLean\(/g) ?? []).length === 2, writerCode.length);
  assert("T-NO-INDEX-AFTER-BLOCK BLOCK zwraca `skipped` bez setItem i bez fallbacku LEAN",
    /reason: "budget_block"/.test(writer)
    && writer.indexOf('reason: "budget_block"') < iWrite
    && !/budget[\s\S]{0,400}writePipelineLsCompatLean/.test(writer));
  assert("T-NO-TRUNCATE brak truncate/slice/delete na payloadzie INDEX",
    !/payload\.(slice|substring)|delete index\[/.test(writer));

  // Warstwa C nigdy w hot-path (lekcja 02F V-PERF-A).
  assert("T-LAYER-C brak `measureLocalStorageBytes` w module writera",
    !/measureLocalStorageBytes/.test(bzpSrc));
  assert("T-LAYER-C pomiar globalny planowany po zapisie, w idle",
    /scheduleLocalStorageTotalTelemetry\(\);/.test(writer)
    && /requestIdleCallback/.test(readSource("src/lib/storage/storage-telemetry.ts")));

  // Progi: dokładne wartości DF §7 B, rozdzielne od globalnych.
  assert("T-THRESHOLDS stałe NEW-06 = DF §7 B (768 KiB / 1 MiB)",
    /PIPELINE_INDEX_LS_WARN = 768 \* 1024/.test(budgetSrc)
    && /PIPELINE_INDEX_LS_BLOCK = 1024 \* 1024/.test(budgetSrc));
  assert("T-THRESHOLDS budżet per-key nie korzysta z progów globalnych",
    !/STORAGE_(WARNING|CRITICAL|LIMIT)/.test(
      coldSrc.slice(coldSrc.indexOf("export function evaluatePipelineIndexBudget")),
    ));
  assert("T-BUDGET-PURE `evaluatePipelineIndexBudget` bez I/O i bez wyjątków zakresu",
    !/localStorage|idb|Blob|exemption/.test(
      coldSrc.slice(
        coldSrc.indexOf("export function evaluatePipelineIndexBudget"),
        coldSrc.indexOf("// §2.4 — detekcja kształtu LS"),
      ),
    ));

  // PIPELINE-WRITER-01 (Phase 6) nietknięte.
  assert("T-WRITER-01 nadal dokładnie jeden setItem(pipeline) w src",
    (bzpSrc.match(/localStorage\.setItem\(TENDERS_PIPELINE_KEY,/g) ?? []).length === 1);
  assert("T-WRITER-01 brak removeItem(pipeline)",
    !/localStorage\.removeItem\(\s*(?:TENDERS_PIPELINE_KEY|["']kw-tenders-pipeline["'])/.test(bzpSrc));

  // Budżet dotyczy WYŁĄCZNIE INDEX — compat LEAN zachowuje parity z MAIN (Phase 3 ⊇ MAIN).
  const compat = bzpSrc.slice(
    bzpSrc.indexOf("function writePipelineLsCompatLean"),
    bzpSrc.indexOf("function recordLsSkipped"),
  );
  assert("T-COMPAT-UNCHANGED compat LEAN bez budżetu per-key (parity MAIN)",
    !/evaluatePipelineIndexBudget/.test(compat), compat);
} else if (CASE_ID === "budget-unit") {
  // T-INDEX-BUDGET-WARN / T-INDEX-BUDGET-BLOCK — granice czystej funkcji (DF §7 B: `>=`).
  assert("progi: WARN = 786432 B (768 KiB), BLOCK = 1048576 B (1 MiB)",
    PIPELINE_INDEX_LS_WARN === 786432 && PIPELINE_INDEX_LS_BLOCK === 1048576,
    { PIPELINE_INDEX_LS_WARN, PIPELINE_INDEX_LS_BLOCK });
  assert("warstwa B ≠ warstwa C (progi globalne 1.2/1.4/1.5 MiB nietknięte)",
    STORAGE_WARNING === Math.floor(1.2 * 1024 * 1024)
    && STORAGE_CRITICAL === Math.floor(1.4 * 1024 * 1024)
    && STORAGE_LIMIT === Math.floor(1.5 * 1024 * 1024)
    && PIPELINE_INDEX_LS_BLOCK !== STORAGE_LIMIT);

  assert("0 B → ok", evaluatePipelineIndexBudget(0).state === "ok");
  assert("WARN−1 → ok", evaluatePipelineIndexBudget(PIPELINE_INDEX_LS_WARN - 1).state === "ok");
  assert("WARN → warning + nota index_budget_warning", (() => {
    const d = evaluatePipelineIndexBudget(PIPELINE_INDEX_LS_WARN);
    return d.state === "warning" && d.note === "index_budget_warning";
  })());
  assert("BLOCK−1 → warning (zapis nadal dozwolony)",
    evaluatePipelineIndexBudget(PIPELINE_INDEX_LS_BLOCK - 1).state === "warning");
  assert("BLOCK → block + nota index_budget_block", (() => {
    const d = evaluatePipelineIndexBudget(PIPELINE_INDEX_LS_BLOCK);
    return d.state === "block" && d.note === "index_budget_block";
  })());
  assert("BLOCK+1 MB → block", evaluatePipelineIndexBudget(PIPELINE_INDEX_LS_BLOCK * 2).state === "block");
  assert("decyzja raportuje bajty i oba progi (observability)", (() => {
    const d = evaluatePipelineIndexBudget(900000);
    return d.bytes === 900000 && d.warn === PIPELINE_INDEX_LS_WARN && d.block === PIPELINE_INDEX_LS_BLOCK;
  })());
  assert("ok → brak noty (żadna telemetria WARN/BLOCK)",
    evaluatePipelineIndexBudget(1024).note === undefined);

  // GATE 7: progi uzasadnione pomiarem P-3 (Phase 2: INDEX 505 poz. = 530 182 B).
  const measured505 = indexBytes(Array.from({ length: 505 }, (_, i) => fullItem(i + 1)));
  assert("GATE 7 realny INDEX 505 poz. < BLOCK (brak OWNER DECISION)",
    measured505 < PIPELINE_INDEX_LS_BLOCK, { measured505, block: PIPELINE_INDEX_LS_BLOCK });
  assert("GATE 7 realny INDEX 505 poz. < WARN (normalna produkcja bez telemetrii WARN)",
    measured505 < PIPELINE_INDEX_LS_WARN, { measured505, warn: PIPELINE_INDEX_LS_WARN });
  console.log(`   [P-3] INDEX 505 poz. = ${measured505} B (${(measured505 / 1024).toFixed(1)} KiB) · WARN ${PIPELINE_INDEX_LS_WARN} · BLOCK ${PIPELINE_INDEX_LS_BLOCK}`);
} else if (CASE_ID === "budget-warn") {
  // T-INDEX-BUDGET-WARN — WARN nie blokuje; zapis INDEX wykonany.
  setFlag(true);
  const { items, bytes } = makeFullForIndexBytes(880 * 1024);
  assert("fixture w przedziale WARN",
    bytes >= PIPELINE_INDEX_LS_WARN && bytes < PIPELINE_INDEX_LS_BLOCK, { bytes });

  counters.indexStringify = 0;
  counters.blobIndex = 0;
  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();

  assert("WARN: LS INDEX zapisany", res.ls.mode === "index" && res.ls.ok === true, res.ls);
  assert("WARN: telemetria index_budget_warning",
    notes().some((n) => n.startsWith("index_budget_warning:")), notes());
  assert("WARN: brak telemetrii index_budget_block", !notes().some((n) => n.startsWith("index_budget_block")));
  assert("WARN: LS zawiera INDEX (marker `_lsIndex`)", detectPipelineLsKind(lsRaw()).kind === "INDEX");
  assert("WARN: dokładnie jeden setItem(pipeline) — brak retry", pipelineSetCalls() === 1, ls.setCalls);
  assert("T-ONE-SERIALIZATION jedna serializacja INDEX na zapis",
    counters.indexStringify === 1, counters);
  assert("T-ONE-SERIALIZATION jeden pomiar payloadu INDEX (MEASURE reused w setItem)",
    counters.blobIndex === 1, counters);
  assert("WARN: bajty raportowane = bajty payloadu",
    res.ls.bytes === bytes, { reported: res.ls.bytes, bytes });
  assert("WARN: IDB envelope zapisany raz (localSeq = 1)",
    parsePipelineIdbEnvelope(envelope()).envelope?.localSeq === 1);
  assert("WARN: cloud nietknięty przez writera", fetchCalls.length === 0, fetchCalls);
} else if (CASE_ID === "budget-block") {
  // T-INDEX-BUDGET-BLOCK / T-NO-INDEX-AFTER-BLOCK / T-QUOTA-IDB-SURVIVES / T-NO-RETRY.
  setFlag(true);
  // Stary, mały INDEX w LS (seq 1) — musi pozostać nietknięty po BLOCK.
  const oldIndexRaw = rawStringify(buildTenderPipelineLsIndex(FULL_SMALL, 1));
  ls._m.set(PIPELINE_KEY, oldIndexRaw);

  const { items, bytes } = makeFullForIndexBytes(1200 * 1024);
  assert("fixture powyżej BLOCK", bytes >= PIPELINE_INDEX_LS_BLOCK, { bytes });

  counters.indexStringify = 0;
  counters.blobIndex = 0;
  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();

  assert("BLOCK: ls.mode=skipped, reason=budget_block",
    res.ls.mode === "skipped" && res.ls.ok === false && res.ls.reason === "budget_block", res.ls);
  assert("BLOCK: zmierzone bajty w wyniku", res.ls.bytes === bytes, { reported: res.ls.bytes, bytes });
  assert("T-NO-INDEX-AFTER-BLOCK zero wywołań setItem(pipeline)", pipelineSetCalls() === 0, ls.setCalls);
  assert("T-NO-INDEX-AFTER-BLOCK stary INDEX bajt-w-bajt nietknięty", lsRaw() === oldIndexRaw);
  assert("T-NO-INDEX-AFTER-BLOCK brak partial payload w LS",
    detectPipelineLsKind(lsRaw()).kind === "INDEX" && JSON.parse(lsRaw()).length === FULL_SMALL.length);
  assert("BLOCK: brak removeItem(pipeline)", !ls.removeCalls.includes(PIPELINE_KEY), ls.removeCalls);

  // IDB FULL = jedyne durable źródło — MUSI przetrwać.
  const parsed = parsePipelineIdbEnvelope(envelope());
  assert("T-QUOTA-IDB-SURVIVES envelope OK po BLOCK", parsed.status === "OK", parsed.status);
  assert("T-QUOTA-IDB-SURVIVES itemCount = pełna kolekcja",
    parsed.envelope?.itemCount === items.length, parsed.envelope?.itemCount);
  assert("T-QUOTA-IDB-SURVIVES ACK potwierdzony (localSeq 1)",
    res.idb.ok === true && res.idb.localSeq === 1, res.idb);
  const hydrated = await hydratePipelineColdFromIdb();
  assert("T-FULL-RECOVERABLE FULL czytelny z IDB (heavy obecne)",
    Array.isArray(hydrated) && hydrated.length === items.length
    && hydrated[0].notes === "prywatna notatka — FULL only"
    && hydrated[0].changeMonitor != null
    && !("_lsIndex" in hydrated[0]), hydrated?.length);

  // Telemetria: warstwa B ≠ warstwa A.
  assert("BLOCK: telemetria index_budget_block", notes().some((n) => n.startsWith("index_budget_block:")), notes());
  assert("BLOCK: brak quota_blocked_index (nie mieszamy warstw)",
    !notes().some((n) => n.includes("quota_blocked")), notes());
  assert("BLOCK: ring buffer kind=budget_block",
    ring().some((e) => e.kind === "budget_block") && readPipelineLocalSaveTelemetry().some((e) => e.kind === "budget_block"),
    ring());
  assert("BLOCK: brak wpisu quota_exceeded w ring buffer", !ring().some((e) => e.kind === "quota_exceeded"));

  // Brak retry / brak drugiej serializacji / brak drugiego seq.
  assert("T-NO-RETRY jedna serializacja INDEX, jeden pomiar (BLOCK nie ponawia cyklu)",
    counters.indexStringify === 1 && counters.blobIndex === 1, counters);
  assert("T-NO-RETRY jeden zapis IDB (brak drugiego localSeq)",
    parsed.envelope?.localSeq === 1 && idbAckCount() === 1, idbAckCount());
  assert("BLOCK: cloud nietknięty", fetchCalls.length === 0, fetchCalls);

  // Kolejny, mały zapis odbudowuje INDEX (best-effort, bez pętli).
  const res2Small = (saveTendersPipelineLocal(FULL_SMALL), await awaitPipelineLocalWriteSettled());
  assert("BLOCK: następny zapis w budżecie odbudowuje INDEX (seq 2)",
    res2Small.ls.mode === "index" && res2Small.ls.ok === true && res2Small.idb.localSeq === 2, res2Small.ls);
} else if (CASE_ID === "browser-quota") {
  // T-BROWSER-QUOTA-BLOCK — payload w budżecie, ale przeglądarka odrzuca zapis.
  setFlag(true);
  const oldIndexRaw = rawStringify(buildTenderPipelineLsIndex(FULL_SMALL, 1));
  ls._m.set(PIPELINE_KEY, oldIndexRaw);
  ls.failMode = "quota";

  const items = Array.from({ length: 8 }, (_, i) => fullItem(i + 1));
  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();

  assert("QUOTA: ls.reason=quota (warstwa A, nie budget_block)",
    res.ls.mode === "index" && res.ls.ok === false && res.ls.reason === "quota", res.ls);
  assert("QUOTA: setItem próbowany dokładnie raz (brak retry)", pipelineSetCalls() === 1, ls.setCalls);
  assert("QUOTA: LS nietknięty (stary INDEX)", lsRaw() === oldIndexRaw);
  assert("QUOTA: brak removeItem", !ls.removeCalls.includes(PIPELINE_KEY));
  assert("QUOTA: telemetria quota_blocked_index", notes().some((n) => n === "quota_blocked_index"), notes());
  assert("QUOTA: brak telemetrii index_budget_block", !notes().some((n) => n.startsWith("index_budget_block")));
  assert("QUOTA: ring buffer kind=quota_exceeded", ring().some((e) => e.kind === "quota_exceeded"));

  const parsed = parsePipelineIdbEnvelope(envelope());
  assert("T-QUOTA-IDB-SURVIVES envelope OK po QuotaExceededError", parsed.status === "OK", parsed.status);
  assert("T-QUOTA-IDB-SURVIVES itemCount pełny", parsed.envelope?.itemCount === items.length);
  assert("T-QUOTA-IDB-SURVIVES brak rollbacku IDB (localSeq 1, jeden zapis)",
    parsed.envelope?.localSeq === 1 && idbAckCount() === 1);
  const hydrated = await hydratePipelineColdFromIdb();
  assert("T-FULL-RECOVERABLE FULL czytelny po quota",
    Array.isArray(hydrated) && hydrated.length === items.length && hydrated[0].changeMonitor != null);
  assert("QUOTA: FULL nie trafił do LS (żadnej próby zapisu FULL)",
    detectPipelineLsKind(lsRaw()).kind === "INDEX");
  assert("QUOTA: cloud nietknięty", fetchCalls.length === 0, fetchCalls);
} else if (CASE_ID === "empty-exemption") {
  // T-EMPTY-EXEMPTION — `[]` pozostaje dozwolonym explicit empty write; budżet go nie wyjątkuje.
  setFlag(true);
  const legacyFull = Array.from({ length: 4 }, (_, i) => fullItem(i + 1));
  ls._m.set(PIPELINE_KEY, rawStringify(legacyFull));

  const emptyBudget = evaluatePipelineIndexBudget(new RawBlob(["[]"]).size);
  assert("EMPTY: budżet dla pustego INDEX = ok (bez wyjątku/bypassu)",
    emptyBudget.state === "ok" && emptyBudget.note === undefined, emptyBudget);

  const cutover = bzp.evaluatePipelineIndexCutover([]);
  assert("EMPTY: exemption `empty_collection` żyje WYŁĄCZNIE w warstwie cutover (PH5)",
    cutover.ok === true && cutover.exemption === "empty_collection", cutover);

  saveTendersPipelineLocal([]);
  const res = await awaitPipelineLocalWriteSettled();
  assert("EMPTY: zapis INDEX wykonany", res.ls.mode === "index" && res.ls.ok === true, res.ls);
  assert("EMPTY: LS = pusta kolekcja", lsRaw() === "[]");
  assert("EMPTY: brak telemetrii budżetu (ani WARN, ani BLOCK)",
    !notes().some((n) => n.startsWith("index_budget_")), notes());
  assert("EMPTY: envelope itemCount = 0, ACK OK",
    res.idb.ok === true && parsePipelineIdbEnvelope(envelope()).envelope?.itemCount === 0);
  assert("EMPTY: brak removeItem", !ls.removeCalls.includes(PIPELINE_KEY));
} else if (CASE_ID === "legacy-migration-budget") {
  // T-LEGACY-MIGRATION-BUDGET — BLOCK nie może dać „legacy lost + INDEX unavailable”.
  setFlag(true);
  const { items, bytes } = makeFullForIndexBytes(1200 * 1024);
  // LS = LEGACY_FULL z tymi samymi id (cutover dozwolony) — mały payload legacy.
  const legacyRaw = rawStringify(items.slice(0, 10).map((it) => ({ ...it, title: "legacy" })));
  ls._m.set(PIPELINE_KEY, legacyRaw);
  assert("fixture: LS startuje jako LEGACY_FULL",
    detectPipelineLsKind(lsRaw()).kind === "LEGACY_FULL");
  assert("fixture powyżej BLOCK", bytes >= PIPELINE_INDEX_LS_BLOCK, { bytes });

  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();

  assert("MIGRATION: cutover przeszedł, zablokował dopiero budżet",
    res.ls.reason === "budget_block" && res.ls.mode === "skipped", res.ls);
  assert("T-LEGACY-MIGRATION-BUDGET legacy source NIE usunięty (LS bajt-w-bajt)",
    lsRaw() === legacyRaw);
  assert("T-LEGACY-MIGRATION-BUDGET LS nadal LEGACY_FULL (brak cutover na INDEX)",
    detectPipelineLsKind(lsRaw()).kind === "LEGACY_FULL");
  assert("T-LEGACY-MIGRATION-BUDGET brak destrukcyjnego removeItem",
    !ls.removeCalls.includes(PIPELINE_KEY), ls.removeCalls);
  const parsed = parsePipelineIdbEnvelope(envelope());
  assert("T-LEGACY-MIGRATION-BUDGET IDB FULL kompletny (migracja durable)",
    parsed.status === "OK" && parsed.envelope?.itemCount === items.length);
  assert("MIGRATION: brak retry (jeden zapis IDB, zero setItem)",
    idbAckCount() === 1 && pipelineSetCalls() === 0);

  // Po powrocie do budżetu cutover legacy→INDEX wykonuje się normalnie.
  const small = items.slice(0, 10).map((it) => ({ ...it, title: `ok ${it.id}` }));
  saveTendersPipelineLocal(small);
  const res2 = await awaitPipelineLocalWriteSettled();
  assert("MIGRATION: po zmieszczeniu się w budżecie cutover → INDEX",
    res2.ls.mode === "index" && res2.ls.ok === true && detectPipelineLsKind(lsRaw()).kind === "INDEX", res2.ls);
} else if (CASE_ID === "reader-after-block") {
  // T-FULL-RECOVERABLE-AFTER-INDEX-BLOCK / T-INDEX-NEVER-FULL.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, rawStringify(buildTenderPipelineLsIndex(FULL_SMALL, 1)));
  const { items } = makeFullForIndexBytes(1200 * 1024);

  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();
  assert("setup: BLOCK", res.ls.reason === "budget_block");

  const read = loadTendersPipelineLocal();
  assert("READER: R1 zwraca FULL z RAM/IDB, nie stary INDEX z LS",
    read.length === items.length && read[0].notes === "prywatna notatka — FULL only", read.length);
  assert("T-INDEX-NEVER-FULL wynik readera bez markera `_lsIndex`",
    read.every((it) => !("_lsIndex" in it)));

  const src = await resolvePipelineFullSource();
  assert("READER: FULL-source = FULL (RAM), nie NO_FULL",
    src.status === "FULL" && src.items.length === items.length && src.provenance === "RAM", src);
  assert("READER: coldMem trzyma FULL po BLOCK", getPipelineColdMemory()?.length === items.length);

  const availability = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
  assert("READER: availability nie jest DEGRADED_INDEX (FULL durable w IDB)",
    availability.getPipelineFullAvailability() !== "DEGRADED_INDEX",
    availability.getPipelineFullAvailability());
} else if (CASE_ID === "backup-idb-full") {
  // T-BACKUP-USES-IDB-FULL — backup po BLOCK bierze FULL z IDB/RAM, nigdy INDEX z LS.
  setFlag(true);
  ls._m.set(PIPELINE_KEY, rawStringify(buildTenderPipelineLsIndex(FULL_SMALL, 1)));
  const { items } = makeFullForIndexBytes(1200 * 1024, 40);

  saveTendersPipelineLocal(items);
  const res = await awaitPipelineLocalWriteSettled();
  assert("setup: BLOCK + ACK", res.ls.reason === "budget_block" && res.idb.ok === true);

  const backup = await import("../src/lib/weekly-backup-email.ts");
  const data = backup.collectLocalBackupData();
  const pipe = data[PIPELINE_KEY];
  assert("T-BACKUP-USES-IDB-FULL backup pipeline = FULL (itemCount z IDB/RAM)",
    Array.isArray(pipe) && pipe.length === items.length, Array.isArray(pipe) ? pipe.length : pipe);
  assert("T-BACKUP-USES-IDB-FULL backup zawiera heavy + brak markera INDEX",
    pipe[0].changeMonitor != null && pipe[0].notes === "prywatna notatka — FULL only"
    && pipe.every((it) => !("_lsIndex" in it)));
  assert("T-BACKUP-USES-IDB-FULL backup ≠ zawartość LS (stary INDEX 5 poz.)",
    pipe.length !== FULL_SMALL.length);
} else if (CASE_ID === "layer-c") {
  // Warstwa C (DF §7 C) — telemetria globalna poza hot-path, throttle, nigdy BLOCK.
  const first = telemetry.scheduleLocalStorageTotalTelemetry();
  const second = telemetry.scheduleLocalStorageTotalTelemetry();
  assert("LAYER-C pierwszy pomiar zaplanowany", first === true);
  assert("LAYER-C throttle ≤ 1×/60 s (drugi pominięty)", second === false);
  assert("LAYER-C pomiar NIE biegnie synchronicznie (idle queue)",
    idleQueue.length === 1 && !notes().some((n) => n.startsWith("ls_total:")), notes());

  ls._m.set("kw-big", "x".repeat(2048));
  drainIdle();
  const lsTotal = globalThis.__WG_STORAGE__.history().filter((e) => e.key === "__ls_total__");
  assert("LAYER-C telemetria ls_total:<state> po uruchomieniu idle",
    lsTotal.length === 1 && /^ls_total:(ok|warning|critical|over)$/.test(lsTotal[0].note ?? ""), lsTotal);
  assert("LAYER-C pomiar raportuje bajty całego LS", lsTotal[0].bytes >= 2048, lsTotal[0]);
  assert("LAYER-C klucz telemetryczny nie jest kluczem pipeline",
    telemetry.LS_TOTAL_TELEMETRY_KEY === "__ls_total__" && lsTotal[0].key !== PIPELINE_KEY);

  // Warstwa C nigdy nie blokuje zapisu pipeline — nawet przy LS ponad progiem globalnym.
  setFlag(true);
  ls._m.set("kw-huge", "y".repeat(1_600_000));
  saveTendersPipelineLocal(FULL_SMALL);
  const res = await awaitPipelineLocalWriteSettled();
  assert("LAYER-C LS total > STORAGE_LIMIT nie blokuje INDEX (DF §7 C)",
    res.ls.mode === "index" && res.ls.ok === true, res.ls);
  assert("LAYER-C brak noty budżetowej z warstwy globalnej",
    !notes().some((n) => n.startsWith("index_budget_")), notes());
} else {
  console.error(`Unknown case: ${CASE_ID}`);
  process.exit(1);
}

console.log(`\n[${CASE_ID}] ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
