/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — PHASE 10 probe (T-OLD-CLIENT-READS-INDEX).
 *
 * TEST-ONLY. Runs the REAL old-release modules (MAIN @ 3bfecc7f) against a fixture where
 * IDB = contract FULL envelope and LS = contract INDEX. Zero production mutation:
 * `localStorage` / `indexedDB` / `fetch` are in-memory doubles; no network call leaves the process.
 *
 * MUST be executed with cwd = <MAIN checkout> so that the `@/` alias resolves to old-release `src/`.
 *   npx vite-node <thisFile> -- --case A --fixture <path> --out <path> [--state-in <path>] [--state-out <path>]
 *
 * Cases: A (cloud available) · B (cloud unavailable + writer sub-case) · C (cloud LEAN + cloud push)
 *        E1 / E2 (first boot / second boot — storage state carried over via --state-*).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { installIdbStub } from "./idb-memory-stub.mjs";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const CASE = arg("case", "A");
const FIXTURE_PATH = resolve(arg("fixture"));
const OUT_PATH = resolve(arg("out"));
const STATE_IN = arg("state-in");
const STATE_OUT = arg("state-out");

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));

// ---------------------------------------------------------------------------
// Storage doubles
// ---------------------------------------------------------------------------

const lsMap = new Map();
const lsWrites = [];

globalThis.localStorage = {
  getItem: (k) => (lsMap.has(k) ? lsMap.get(k) : null),
  setItem: (k, v) => {
    const str = String(v);
    lsWrites.push({ key: k, bytes: Buffer.byteLength(str, "utf8"), head: str.slice(0, 120) });
    lsMap.set(k, str);
  },
  removeItem: (k) => {
    lsWrites.push({ key: k, removed: true });
    lsMap.delete(k);
  },
  clear: () => lsMap.clear(),
  key: (i) => [...lsMap.keys()][i] ?? null,
  get length() {
    return lsMap.size;
  },
};
// `window` present (telemetry guards), `document` absent (cloud-freshness gate → harness pass).
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.window = globalThis;

const idb = installIdbStub({ mode: "ok" });
const IDB_KEY = "tenders-pipeline-full";
const PIPELINE_KEY = "kw-tenders-pipeline";
const GUARD_KEY = "kw-tenders-pipeline-guard";

// ---------------------------------------------------------------------------
// Initial state: fixture (boot 1) or carried-over state (boot 2)
// ---------------------------------------------------------------------------

if (STATE_IN) {
  const prev = JSON.parse(readFileSync(resolve(STATE_IN), "utf8"));
  for (const [k, v] of Object.entries(prev.ls)) lsMap.set(k, v);
  if (prev.idb !== undefined) idb.seed(IDB_KEY, prev.idb);
} else {
  lsMap.set(PIPELINE_KEY, JSON.stringify(fixture.lsIndex));
  lsMap.set(
    "kw-app-settings",
    JSON.stringify(CASE === "C2" ? fixture.appSettingsGuardOff : fixture.appSettings),
  );
  idb.seed(IDB_KEY, fixture.idbEnvelope);
}
lsWrites.length = 0; // seeding is not an observed write

// ---------------------------------------------------------------------------
// Cloud double — records every call, serves batch-get, never touches the network
// ---------------------------------------------------------------------------

const cloudMode = CASE === "B"
  ? "unavailable"
  : CASE === "C3"
    ? "lean_partial"
    : CASE === "C" || CASE === "C2" || CASE === "E2"
      ? "lean"
      : "minimal";
const cloudStore = new Map();
if (cloudMode === "lean") {
  cloudStore.set(PIPELINE_KEY, fixture.cloudLean);
  cloudStore.set(GUARD_KEY, fixture.cloudGuard ?? null);
} else if (cloudMode === "lean_partial") {
  // Cloud never received `t-001` (e.g. that record was only ever local FULL).
  cloudStore.set(PIPELINE_KEY, fixture.cloudLean.filter((i) => i.id !== "t-001"));
  cloudStore.set(GUARD_KEY, fixture.cloudGuard ?? null);
} else if (cloudMode === "minimal") {
  cloudStore.set(PIPELINE_KEY, fixture.cloudMinimal);
  cloudStore.set(GUARD_KEY, null);
}

const fetchCalls = [];

globalThis.fetch = async (url, init = {}) => {
  const href = String(url);
  const body = typeof init.body === "string" ? init.body : null;
  const entry = { url: href, method: init.method ?? "GET", bodyBytes: body ? Buffer.byteLength(body, "utf8") : 0 };
  fetchCalls.push(entry);

  if (cloudMode === "unavailable") {
    entry.result = "network_error";
    throw new TypeError("phase10-probe: cloud unavailable (simulated network failure)");
  }
  if (href.endsWith("/batch-get")) {
    const keys = JSON.parse(body ?? "{}").keys ?? [];
    entry.keys = keys;
    entry.result = "values";
    const values = keys.map((k) => (cloudStore.has(k) ? cloudStore.get(k) : null));
    return jsonResponse({ ok: true, values });
  }
  if (href.endsWith("/batch-set")) {
    const parsed = JSON.parse(body ?? "{}");
    entry.result = "batch_set_accepted";
    entry.batchSet = recordBatchSet(parsed.keys ?? [], parsed.values ?? []);
    return jsonResponse({ ok: true, requestId: "phase10-probe" });
  }
  entry.result = "generic_ok";
  return jsonResponse({ ok: true });
};

function jsonResponse(payload) {
  const text = JSON.stringify(payload);
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => JSON.parse(text),
    text: async () => text,
  };
}

/** Store exactly what the old client SENT (no server-side union) + summarise it for evidence. */
function recordBatchSet(keys, values) {
  const out = [];
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (typeof key !== "string") continue;
    cloudStore.set(key, values[i]);
    out.push({ key, representation: describe(values[i]) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Representation describer — evidence for Test D (heavy / count / ikFinalBid / envelope / marker)
// ---------------------------------------------------------------------------

function describe(value) {
  if (value === null) return { shape: "null" };
  if (value === undefined) return { shape: "undefined" };
  if (typeof value === "string") {
    try {
      return { shape: "string_json", parsed: describe(JSON.parse(value)) };
    } catch {
      return { shape: "string_opaque", bytes: Buffer.byteLength(value, "utf8") };
    }
  }
  if (Array.isArray(value)) return { shape: "array", ...arrayFacts(value) };
  if (typeof value === "object") {
    const keys = Object.keys(value);
    const isEnvelope = Array.isArray(value.items) && typeof value.schemaVersion === "number";
    if (isEnvelope) {
      return {
        shape: "envelope",
        envelope: {
          schemaVersion: value.schemaVersion,
          bundleRevision: value.bundleRevision,
          localSeq: value.localSeq,
          itemCount: value.itemCount,
          writer: value.writer,
          writtenAt: value.writtenAt,
          maxUpdatedAt: value.maxUpdatedAt,
        },
        items: arrayFacts(value.items),
      };
    }
    return { shape: "object", keys: keys.slice(0, 20) };
  }
  return { shape: typeof value };
}

function arrayFacts(arr) {
  const items = arr.filter((x) => x && typeof x === "object");
  const withMarker = items.filter((x) => x._lsIndex && typeof x._lsIndex === "object");
  const heavy = items.filter((x) => typeof x.noticeHtml === "string" && x.noticeHtml.length > 0);
  const dossierRows = items.map((x) => {
    const rows = x?.tenderDossier?.kosztorys?.rows;
    return Array.isArray(rows) ? rows.length : null;
  });
  const nonIndexFields = items.map((x) => ({
    id: x.id,
    noticeHtml: typeof x.noticeHtml === "string" ? x.noticeHtml.length : null,
    tenderDossier: x.tenderDossier === undefined ? "absent" : "present",
    notes: x.notes === undefined ? "absent" : "present",
    bzpDocuments: Array.isArray(x.bzpDocuments) ? x.bzpDocuments.length : "absent",
    estimateHistory: Array.isArray(x.estimateHistory) ? x.estimateHistory.length : "absent",
    submittedBidPln: x.submittedBidPln === undefined ? "absent" : x.submittedBidPln,
    changeMonitor: x.changeMonitor === undefined ? "absent" : "present",
    cloudLeanMarker: x._cloudLean === undefined ? "absent" : "present",
  }));
  return {
    count: arr.length,
    itemKeysSample: items[0] ? Object.keys(items[0]).sort() : [],
    markerCount: withMarker.length,
    markerSample: withMarker[0]?._lsIndex ?? null,
    heavyNoticeHtmlCount: heavy.length,
    dossierRowCounts: dossierRows,
    ikFinalBid: items.map((x) => ({
      id: x.id,
      present: x.ikFinalBid !== undefined && x.ikFinalBid !== null,
      totalPln: x.ikFinalBid?.totalPln ?? null,
    })),
    updatedAt: items.map((x) => ({ id: x.id, updatedAt: x.updatedAt ?? null })),
    nonIndexFields,
  };
}

const settle = async (ms = 60) => {
  await new Promise((r) => setTimeout(r, ms));
  await Promise.resolve();
};

// ---------------------------------------------------------------------------
// Load REAL old-release modules (alias `@/` → MAIN src)
// ---------------------------------------------------------------------------

const cold = await import("@/lib/storage/tenders-pipeline-cold");
const bzp = await import("@/lib/tenders-bzp");
const sync = await import("@/lib/tenders-sync");
const lean = await import("@/lib/tender-pipeline/tender-pipeline-cloud-lean");
const cloudSync = await import("@/lib/cloud-sync");

const provenance = {
  cwd: process.cwd(),
  coldExports: Object.keys(cold).sort(),
  /** Old release has neither the contract envelope parser nor the INDEX budget/builder. */
  isOldRelease:
    cold.evaluatePipelineIndexBudget === undefined &&
    cold.parsePipelineIdbEnvelope === undefined &&
    cold.buildTenderPipelineLsIndex === undefined &&
    cold.detectPipelineLsKind === undefined &&
    bzp.resolvePipelineFullSource === undefined &&
    bzp.awaitPipelineLocalWriteSettled === undefined,
  pipelineColdIdbKey: cold.PIPELINE_COLD_IDB_KEY,
  pipelineKey: bzp.TENDERS_PIPELINE_KEY,
  apiBase: cloudSync.API_BASE,
  supabaseConfigured: cloudSync.isSupabaseConfigured(),
};

const evidence = {
  case: CASE,
  cloudMode,
  provenance,
  fixtureRef: { path: FIXTURE_PATH, sha: fixture.meta?.sha ?? null },
  before: {
    ls: describe(lsMap.get(PIPELINE_KEY) ?? null),
    idb: describe(idb.getRaw(IDB_KEY)?.value ?? null),
    cloud: describe(cloudStore.get(PIPELINE_KEY) ?? null),
  },
  steps: [],
};

function step(n, symbol, file, input, output, extra = {}) {
  evidence.steps.push({ n, symbol, file, input, output, ...extra });
}

// ---------------------------------------------------------------------------
// Case execution
// ---------------------------------------------------------------------------

// STEP 1 — hydratePipelineColdFromIdb (old release, cold.ts:63-73)
const hydrated = await cold.hydratePipelineColdFromIdb();
step(
  1,
  "hydratePipelineColdFromIdb",
  "src/lib/storage/tenders-pipeline-cold.ts:63",
  { idb: evidence.before.idb.shape },
  describe(hydrated),
  { coldMemAfter: describe(cold.getPipelineColdMemory()) },
);

// STEP 2 — loadTendersPipelineLocal (old release, tenders-bzp.ts:613-626)
const local = bzp.loadTendersPipelineLocal();
step(
  2,
  "loadTendersPipelineLocal",
  "src/lib/tenders-bzp.ts:613",
  { ls: evidence.before.ls.shape, coldMem: cold.getPipelineColdMemory() === null ? "null" : "present" },
  describe(local),
);

// STEP 3/4 — merge input/output (same symbol + same args as tenders-bzp.ts:726)
const cloudBodyForMerge = cloudMode === "unavailable" ? null : cloudStore.get(PIPELINE_KEY);
if (Array.isArray(cloudBodyForMerge)) {
  const merged = sync.mergeTenderPipelineForCloud(local, cloudBodyForMerge);
  step(
    4,
    "mergeTenderPipelineForCloud (direct invocation, same args as tenders-bzp.ts:726)",
    "src/lib/tenders-sync.ts:142",
    { local: describe(local), cloud: describe(cloudBodyForMerge) },
    describe(merged),
  );
  step(
    41,
    "stripTenderPipelineForCloud(merged) — what a cloud push would carry",
    "src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts",
    { merged: "see step 4" },
    describe(lean.stripTenderPipelineForCloud(merged)),
  );
}

// STEP 5-8 — real loadTendersPipeline() run (includes internal merge + finalize + persist)
const returned = await bzp.loadTendersPipeline();
await settle();
step(
  5,
  "loadTendersPipeline (real run)",
  "src/lib/tenders-bzp.ts:718",
  { idb: evidence.before.idb.shape, ls: evidence.before.ls.shape, cloud: cloudMode },
  describe(returned),
);

evidence.afterLoad = {
  ls: describe(lsMap.get(PIPELINE_KEY) ?? null),
  idb: describe(idb.getRaw(IDB_KEY)?.value ?? null),
  idbRecordUpdatedAt: idb.getRaw(IDB_KEY)?.updatedAt ?? null,
  cloud: describe(cloudStore.get(PIPELINE_KEY) ?? null),
  lsWrites: [...lsWrites],
  fetchCalls: fetchCalls.map((c) => ({ ...c })),
  coldMem: describe(cold.getPipelineColdMemory()),
};

// Case B sub-case — any user-intent write while LS = INDEX (writer path, not reader path)
if (CASE === "B") {
  const beforeWriter = describe(idb.getRaw(IDB_KEY)?.value ?? null);
  bzp.saveTendersPipelineLocal(bzp.loadTendersPipelineLocal());
  await settle();
  evidence.writerSubCase = {
    symbol: "saveTendersPipelineLocal",
    file: "src/lib/tenders-bzp.ts:669",
    input: describe(bzp.loadTendersPipelineLocal()),
    idbBefore: beforeWriter,
    idbAfter: describe(idb.getRaw(IDB_KEY)?.value ?? null),
    lsAfter: describe(lsMap.get(PIPELINE_KEY) ?? null),
  };
}

// Case C / C2 / C3 sub-case — cloud push from the INDEX-derived state (write path)
if (CASE === "C" || CASE === "C2" || CASE === "C3") {
  const cloudBefore = describe(cloudStore.get(PIPELINE_KEY) ?? null);
  let pushOutcome = { ok: false, error: null };
  try {
    await bzp.saveTendersPipeline(returned);
    pushOutcome.ok = true;
  } catch (e) {
    pushOutcome.error = { name: e?.name ?? null, code: e?.code ?? e?.detail?.code ?? null, message: String(e?.message ?? e) };
  }
  await settle();
  evidence.cloudPushSubCase = {
    symbol: "saveTendersPipeline → pushTenderPipelineToCloud",
    file: "src/lib/tenders-bzp.ts:745 → src/lib/tender-pipeline/tender-pipeline-cloud-push.ts:80",
    input: describe(returned),
    outcome: pushOutcome,
    cloudBefore,
    cloudAfter: describe(cloudStore.get(PIPELINE_KEY) ?? null),
    cloudGuardAfter: describe(cloudStore.get(GUARD_KEY) ?? null),
    batchSetCalls: fetchCalls.filter((c) => String(c.url).endsWith("/batch-set")).map((c) => c.batchSet ?? null),
    idbAfter: describe(idb.getRaw(IDB_KEY)?.value ?? null),
  };
}

evidence.networkEscape = fetchCalls.filter((c) => !String(c.url).includes("supabase.co")).map((c) => c.url);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(evidence, null, 2), "utf8");

if (STATE_OUT) {
  mkdirSync(dirname(resolve(STATE_OUT)), { recursive: true });
  writeFileSync(
    resolve(STATE_OUT),
    JSON.stringify(
      {
        ls: Object.fromEntries(lsMap),
        idb: idb.getRaw(IDB_KEY)?.value ?? null,
        cloud: Object.fromEntries(cloudStore),
      },
      null,
      2,
    ),
    "utf8",
  );
}

console.log(`[phase10-probe] case=${CASE} oldRelease=${provenance.isOldRelease} out=${OUT_PATH}`);
