/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — Phase 11: HARD VERSION GATE + CLOUD INDEX SANITIZATION.
 *
 * Owner Decision #1 — INDEX rollout tylko dla klienta, który rozumie INDEX (fail closed).
 * Owner Decision #2 — `_lsIndex` nigdy nie jest publikowany jako CLOUD LEAN.
 * Owner Decision #3 — brak konwersji INDEX → FULL / INDEX → LEGACY_FULL.
 *
 * Testy: T-VERSION-GATE-INDEX · T-VERSION-GATE-OFF · T-VERSION-COMPATIBLE-ON ·
 *        T-CLOUD-INDEX-NOT-PUBLISHED · T-CLOUD-FULL-STILL-PUBLISHED · T-CLOUD-LEAN-STILL-PUBLISHED ·
 *        T-CLOUD-INDEX-MIXED-NOT-PUBLISHED · T-CLOUD-IK-FINAL-BID-PRESERVED · T-CLOUD-WRITE-SAFETY-PRESERVED.
 *
 * Moduły pipeline trzymają stan sesji (coldMem, localSeq, memo LS) — KAŻDY scenariusz w osobnym
 * procesie (`--case=<id>`), jak Phase 3/5/6/7.
 *
 * Run:  npx vite-node scripts/test-storage-tier1-pipeline-version-gate-cloud.mjs
 * Single: npx vite-node scripts/test-storage-tier1-pipeline-version-gate-cloud.mjs --case=gate-ok
 */

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/test-storage-tier1-pipeline-version-gate-cloud.mjs";

const CASES = [
  "gate-pure",
  "gate-off",
  "gate-unset",
  "gate-below",
  "gate-invalid",
  "gate-ok",
  "cloud",
  "static",
];

/** Tylko ten scenariusz zbliża się do seamu chmurowego (stub fetch + VITE_SUPABASE_*). */
const CLOUD_CASES = new Set(["cloud"]);

const PIPELINE_KEY = "kw-tenders-pipeline";
const GUARD_KEY = "kw-tenders-pipeline-guard";
const SETTINGS_KEY = "kw-app-settings";
const IDB_KEY = "tenders-pipeline-full";

// ---------------------------------------------------------------------------
// Parent — one child per scenario
// ---------------------------------------------------------------------------

function runParent() {
  const started = Date.now();
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const id = CASES[i];
    console.log(`\n--- [${i + 1}/${CASES.length}] PHASE 11 ${id} ---\n`);
    const env = { ...process.env };
    if (CLOUD_CASES.has(id)) {
      env.VITE_SUPABASE_PROJECT_ID = "phase11-version-gate";
      env.VITE_SUPABASE_ANON_KEY = "phase11-anon-key";
    }
    const res = spawnSync("npx", ["vite-node", SELF, `--case=${id}`], {
      cwd: ROOT,
      stdio: "inherit",
      shell: true,
      env,
    });
    if (res.status !== 0) {
      console.error(`\nFAIL case ${id}\n`);
      console.error(`=== PHASE 11 VERSION GATE + CLOUD: ${passed}/${CASES.length} cases PASS — ABORT ===`);
      process.exit(1);
    }
    passed++;
  }
  console.log(`\n=== PHASE 11 VERSION GATE + CLOUD: ${passed}/${CASES.length} cases PASS (${Date.now() - started}ms) ===\n`);
  process.exit(0);
}

const caseArg = process.argv.find((a) => a.startsWith("--case="));
if (!caseArg) runParent();

const CASE_ID = caseArg.slice("--case=".length);

// ---------------------------------------------------------------------------
// Child harness — localStorage + idb stub + cloud stub
// ---------------------------------------------------------------------------

const { installIdbStub } = await import("./_lib/idb-memory-stub.mjs");

const ls = {
  _m: new Map(),
  setCalls: [],
  removeCalls: [],
  setItem(k, v) {
    const key = String(k);
    if (key === PIPELINE_KEY) this.setCalls.push(String(v));
    this._m.set(key, String(v));
  },
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; },
  removeItem(k) { this.removeCalls.push(String(k)); this._m.delete(String(k)); },
  clear() { this._m.clear(); },
  key(i) { return [...this._m.keys()][i] ?? null; },
  get length() { return this._m.size; },
};
globalThis.localStorage = ls;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;

/** Stub chmury: batch-get z `cloudKv`, batch-set rejestruje keys/values (kontrakt Edge). */
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
    const keys = Array.isArray(body.keys) ? body.keys : [];
    const values = Array.isArray(body.values) ? body.values : [];
    keys.forEach((k, i) => cloudKv.set(k, values[i]));
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

const lsParsed = () => { const r = ls.getItem(PIPELINE_KEY); return r == null ? null : JSON.parse(r); };
const notes = () => globalThis.__WG_STORAGE__.history().map((e) => e.note ?? "");
const readSource = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

// ---------------------------------------------------------------------------
// Modules (after globals)
// ---------------------------------------------------------------------------

const version = await import("../src/lib/app-version.ts");
const repr = await import("../src/lib/tender-pipeline/tender-pipeline-representation.ts");
const settings = await import("../src/lib/app-settings.ts");
const cold = await import("../src/lib/storage/tenders-pipeline-cold.ts");
const bzp = await import("../src/lib/tenders-bzp.ts");

const { APP_VERSION } = version;
const {
  classifyPipelineRepresentation,
  hasLsIndexMarker,
  isPipelineIndexCapabilitySatisfied,
  PIPELINE_INDEX_CLIENT_CAPABILITY,
  PIPELINE_INDEX_REQUIRED_CAPABILITY,
} = repr;
const {
  defaultAppSettings,
  evaluatePipelineLocalIndexRolloutGate,
  getLastPipelineLocalIndexGateDecision,
  isPipelineLocalIndexEnabled,
  isPipelineLocalIndexFlagEnabled,
  mergeAppSettings,
} = settings;
const { parsePipelineIdbEnvelope, stripTenderPipelineForLocalStorage, buildTenderPipelineLsIndex } = cold;
const { saveTendersPipelineLocal, awaitPipelineLocalWriteSettled } = bzp;

/** APP_VERSION + 1 patch — „klient starszy niż minimum" bez wymyślania numeru wydania. */
function bumpPatch(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v));
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : "999.0.0";
}

function writeSettings(obj) {
  ls._m.set(SETTINGS_KEY, JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullItem(n) {
  return {
    id: `t-${String(n).padStart(3, "0")}`,
    tenderId: `ocds-${n}`,
    bzpNumber: `2026/BZP ${n}`,
    title: `Remont lokalu ${n}`,
    status: "preparing",
    addedAt: "2026-02-01T08:00:00.000Z",
    updatedAt: `2026-03-0${(n % 9) + 1}T10:00:00.000Z`,
    publicationDate: "2026-02-01",
    submittingOffersDate: "2026-03-20",
    organizationName: "Wrocławskie Mieszkania",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45453000-7",
    relevanceScore: 70 + n,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: "wm",
    priorityBuyerLabel: "WM",
    linkedJobId: null,
    ourEstimatePln: 100000 + n,
    tenderState: "ongoing",
    ikFinalBid: { totalPln: 98000 + n, acceptedAt: "2026-02-28T12:00:00.000Z", revision: 2 },
    notes: "prywatna notatka — FULL only",
    noticeHtml: `<html>${"OGŁOSZENIE ".repeat(200)}</html>`,
    bzpDocuments: [{ name: "SWZ.pdf", url: "https://example.invalid/swz.pdf" }],
    tenderFit: { fitLabel: "GO", winChancePct: 55 },
    swzAnalysis: { profitabilityHint: "ok", estimatedValuePln: 400000, implementationDays: 90 },
    tenderDossier: {
      kosztorys: {
        rows: Array.from({ length: 12 }, (_, i) => ({ lp: i + 1, desc: `poz ${i}`, qty: i })),
        source: "ath",
      },
      scanSummary: {
        branchWinnerArtifacts: [{ id: `a-${n}`, snapshot: { heavy: "x".repeat(500) } }],
        costBranchArtifacts: [],
      },
    },
    catalogQuantities: [{ workId: "w-1", qty: 12 }],
  };
}

const FULL3 = [fullItem(1), fullItem(2), fullItem(3)];

// ---------------------------------------------------------------------------
// CASE gate-pure — pure evaluator + capability (§13 macierz OFF/ON × klient)
// ---------------------------------------------------------------------------

if (CASE_ID === "gate-pure") {
  const CAP_OK = PIPELINE_INDEX_CLIENT_CAPABILITY;
  const policy = (flag, min) => ({ pipelineLocalIndexV1: flag, pipelineLocalIndexMinAppVersion: min });

  // FLAG OFF — legacy compatibility, niezależnie od wersji klienta.
  const offOld = evaluatePipelineLocalIndexRolloutGate("2.66.230", policy(false, "2.67.0"), CAP_OK);
  const offNew = evaluatePipelineLocalIndexRolloutGate("9.9.9", policy(false, "2.67.0"), CAP_OK);
  assert("T-VERSION-GATE-OFF flaga OFF + OLD CLIENT = INDEX blocked (flag_off)",
    offOld.allowed === false && offOld.reason === "flag_off", offOld);
  assert("T-VERSION-GATE-OFF flaga OFF + NEW CLIENT = INDEX blocked (flag_off)",
    offNew.allowed === false && offNew.reason === "flag_off", offNew);

  // FLAG ON + INCOMPATIBLE CLIENT — blokada (fail closed), nigdy „INDEX written anyway".
  const onOld = evaluatePipelineLocalIndexRolloutGate("2.66.230", policy(true, "2.66.231"), CAP_OK);
  assert("T-VERSION-GATE-INDEX ON + klient < minimum = blocked",
    onOld.allowed === false && onOld.reason === "client_below_min_version", onOld);

  // FLAG ON + minimum nieustalone / niepoprawne / brak wersji klienta = FAIL CLOSED.
  const unset = evaluatePipelineLocalIndexRolloutGate("9.9.9", policy(true, ""), CAP_OK);
  const blank = evaluatePipelineLocalIndexRolloutGate("9.9.9", policy(true, "   "), CAP_OK);
  const invalid = evaluatePipelineLocalIndexRolloutGate("9.9.9", policy(true, "2.67"), CAP_OK);
  const garbage = evaluatePipelineLocalIndexRolloutGate("9.9.9", policy(true, "next-release"), CAP_OK);
  const noVersion = evaluatePipelineLocalIndexRolloutGate(undefined, policy(true, "1.0.0"), CAP_OK);
  const zeroVersion = evaluatePipelineLocalIndexRolloutGate("0.0.0", policy(true, "0.0.0"), CAP_OK);
  assert("T-VERSION-GATE-INDEX ON + minimum unset = blocked (fail closed)",
    unset.allowed === false && unset.reason === "min_version_unset", unset);
  assert("T-VERSION-GATE-INDEX ON + minimum whitespace = blocked", blank.allowed === false, blank);
  assert("T-VERSION-GATE-INDEX ON + minimum niepełne (2.67) = blocked",
    invalid.allowed === false && invalid.reason === "min_version_invalid", invalid);
  assert("T-VERSION-GATE-INDEX ON + minimum nienumeryczne = blocked", garbage.allowed === false, garbage);
  assert("T-VERSION-GATE-INDEX ON + brak wersji klienta = blocked (unknown capability)",
    noVersion.allowed === false && noVersion.reason === "client_below_min_version", noVersion);
  assert("T-VERSION-GATE-INDEX ON + APP_VERSION 0.0.0 (dev/unknown build) = blocked",
    zeroVersion.allowed === false, zeroVersion);

  // FLAG ON + COMPATIBLE CLIENT — dozwolone (równa wersja i wyższa).
  const eq = evaluatePipelineLocalIndexRolloutGate("2.67.0", policy(true, "2.67.0"), CAP_OK);
  const gt = evaluatePipelineLocalIndexRolloutGate("2.67.5", policy(true, "2.67.0"), CAP_OK);
  assert("T-VERSION-COMPATIBLE-ON klient == minimum = allowed", eq.allowed === true && eq.reason === "allowed", eq);
  assert("T-VERSION-COMPATIBLE-ON klient > minimum = allowed", gt.allowed === true, gt);

  // Capability (rozumienie INDEX/envelope) — mismatch = blocked, zanim ocenimy wersję.
  const capMismatch = evaluatePipelineLocalIndexRolloutGate("2.67.0", policy(true, "2.67.0"), {
    indexMarkerVersion: 2,
    idbEnvelopeSchemaVersion: 1,
  });
  const capMissing = evaluatePipelineLocalIndexRolloutGate("2.67.0", policy(true, "2.67.0"), null);
  assert("T-VERSION-GATE-INDEX capability mismatch = blocked",
    capMismatch.allowed === false && capMismatch.reason === "capability_mismatch", capMismatch);
  assert("T-VERSION-GATE-INDEX brak capability = blocked (fail closed)",
    capMissing.allowed === false && capMissing.reason === "capability_mismatch", capMissing);
  assert("capability builda spełnia wymagania kontraktu",
    isPipelineIndexCapabilitySatisfied(PIPELINE_INDEX_CLIENT_CAPABILITY, PIPELINE_INDEX_REQUIRED_CAPABILITY) === true);
  assert("capability = wersje schematów kontraktu (envelope v1, marker v1)",
    PIPELINE_INDEX_REQUIRED_CAPABILITY.idbEnvelopeSchemaVersion === cold.PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION
    && PIPELINE_INDEX_REQUIRED_CAPABILITY.indexMarkerVersion === 1);

  // Polityka: default OFF + minimum puste; remote (chmura) może zadeklarować minimum.
  const d = defaultAppSettings();
  assert("FLAG: default pipelineLocalIndexV1 = false", d.pipelineLocalIndexV1 === false);
  assert("GATE: default pipelineLocalIndexMinAppVersion = '' (fail closed)", d.pipelineLocalIndexMinAppVersion === "");
  const merged = mergeAppSettings({ pipelineLocalIndexMinAppVersion: "2.67.0" }, d);
  assert("GATE: remote deklaruje minimum (cloud-first)", merged.pipelineLocalIndexMinAppVersion === "2.67.0");
  const keptLocal = mergeAppSettings({}, { ...d, pipelineLocalIndexMinAppVersion: "2.67.1" });
  assert("GATE: brak klucza w remote = minimum lokalne", keptLocal.pipelineLocalIndexMinAppVersion === "2.67.1");

  // Runtime: brak ustawień ⇒ OFF; surowa flaga ≠ bramka.
  ls._m.delete(SETTINGS_KEY);
  assert("RUNTIME: brak ustawień = INDEX blocked", isPipelineLocalIndexEnabled() === false);
  writeSettings({ pipelineLocalIndexV1: true });
  assert("RUNTIME: surowa flaga ON bez minimum = flaga true", isPipelineLocalIndexFlagEnabled() === true);
  assert("RUNTIME: bramka ON bez minimum = false (fail closed)", isPipelineLocalIndexEnabled() === false);
  assert("RUNTIME: decyzja bramki dostępna dla telemetrii",
    getLastPipelineLocalIndexGateDecision()?.reason === "min_version_unset");
}

// ---------------------------------------------------------------------------
// CASE gate-off / gate-unset / gate-below / gate-invalid — writer NIE pisze INDEX
// ---------------------------------------------------------------------------

const BLOCKED_CASES = {
  "gate-off": { settings: { pipelineLocalIndexV1: false, pipelineLocalIndexMinAppVersion: APP_VERSION }, reason: "flag_off" },
  "gate-unset": { settings: { pipelineLocalIndexV1: true }, reason: "min_version_unset" },
  "gate-below": { settings: { pipelineLocalIndexV1: true, pipelineLocalIndexMinAppVersion: bumpPatch(APP_VERSION) }, reason: "client_below_min_version" },
  "gate-invalid": { settings: { pipelineLocalIndexV1: true, pipelineLocalIndexMinAppVersion: "2.67" }, reason: "min_version_invalid" },
};

if (BLOCKED_CASES[CASE_ID]) {
  const { settings: cfg, reason } = BLOCKED_CASES[CASE_ID];
  writeSettings(cfg);

  saveTendersPipelineLocal(FULL3);
  const res = await awaitPipelineLocalWriteSettled();
  const lsValue = lsParsed();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert(`T-VERSION-GATE (${CASE_ID}) LS = compat LEGACY_LEAN, nie INDEX`,
    res.ls.mode === "compat" && res.ls.ok === true && hasLsIndexMarker(lsValue) === false, res.ls);
  assert(`T-VERSION-GATE (${CASE_ID}) klasa LS = FULL-compatible (bez markera)`,
    classifyPipelineRepresentation(lsValue) === "FULL");
  assert(`T-VERSION-GATE (${CASE_ID}) IDB = envelope FULL (bez zmian kontraktu IDB)`,
    env.status === "OK" && env.envelope.items.length === 3 && env.envelope.schemaVersion === 1, env.status);
  assert(`T-VERSION-GATE (${CASE_ID}) brak removeItem / destrukcji`, ls.removeCalls.length === 0);
  assert(`T-VERSION-GATE (${CASE_ID}) zero payloadów INDEX w setItem`,
    ls.setCalls.every((v) => !v.includes("_lsIndex")));
  assert(`T-VERSION-GATE (${CASE_ID}) decyzja bramki = ${reason}`,
    getLastPipelineLocalIndexGateDecision()?.reason === reason, getLastPipelineLocalIndexGateDecision());

  const gateNotes = notes().filter((n) => n.startsWith("index_gate_blocked:"));
  if (CASE_ID === "gate-off") {
    assert("T-VERSION-GATE-OFF flaga OFF = brak szumu telemetrii bramki", gateNotes.length === 0, gateNotes);
  } else {
    assert(`T-VERSION-GATE (${CASE_ID}) telemetria index_gate_blocked:${reason}`,
      gateNotes.some((n) => n.startsWith(`index_gate_blocked:${reason}`)), gateNotes);
  }

  // Drugi zapis w tej samej sesji — nadal brak INDEX (bramka jest preconditionem, nie jednorazowa).
  saveTendersPipelineLocal(FULL3);
  const res2 = await awaitPipelineLocalWriteSettled();
  assert(`T-VERSION-GATE (${CASE_ID}) kolejny zapis też bez INDEX`,
    res2.ls.mode === "compat" && hasLsIndexMarker(lsParsed()) === false);
}

// ---------------------------------------------------------------------------
// CASE gate-ok — COMPATIBLE CLIENT: INDEX dozwolony (ścieżka Phase 5 bez zmian)
// ---------------------------------------------------------------------------

if (CASE_ID === "gate-ok") {
  writeSettings({ pipelineLocalIndexV1: true, pipelineLocalIndexMinAppVersion: APP_VERSION });
  assert("T-VERSION-COMPATIBLE-ON bramka przepuszcza klienta == minimum", isPipelineLocalIndexEnabled() === true);

  saveTendersPipelineLocal(FULL3);
  const res = await awaitPipelineLocalWriteSettled();
  const lsValue = lsParsed();
  const env = parsePipelineIdbEnvelope(idbRawEnvelope());

  assert("T-VERSION-COMPATIBLE-ON LS = INDEX po ACK",
    res.ls.mode === "index" && res.ls.ok === true && classifyPipelineRepresentation(lsValue) === "INDEX", res.ls);
  assert("T-VERSION-COMPATIBLE-ON INDEX ma seq = localSeq envelope",
    env.status === "OK" && lsValue.every((it) => it._lsIndex.seq === env.envelope.localSeq));
  assert("T-VERSION-COMPATIBLE-ON IDB nadal FULL (heavy w envelope)",
    env.status === "OK" && env.envelope.items.every((it) => typeof it.noticeHtml === "string"));
  assert("T-VERSION-COMPATIBLE-ON INDEX bez heavy fields (projekcja)",
    lsValue.every((it) => it.noticeHtml === undefined && it.tenderDossier === undefined));
  assert("T-VERSION-COMPATIBLE-ON brak telemetrii index_gate_blocked",
    notes().every((n) => !n.startsWith("index_gate_blocked:")));

  // Minimum niższe niż klient — również allowed.
  const lower = evaluatePipelineLocalIndexRolloutGate(APP_VERSION, {
    pipelineLocalIndexV1: true,
    pipelineLocalIndexMinAppVersion: "2.0.0",
  });
  assert("T-VERSION-COMPATIBLE-ON klient > minimum = allowed", lower.allowed === true);
}

// ---------------------------------------------------------------------------
// CASE cloud — granica Cloud (CASE A–H §8)
// ---------------------------------------------------------------------------

if (CASE_ID === "cloud") {
  const gate = await import("../src/lib/cloud-freshness-gate.ts");
  gate.resetCloudFreshnessGateForTests({ allowWrites: true });

  const lean = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts");
  const route = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-route.ts");
  const push = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-push.ts");
  const cloudSync = await import("../src/lib/cloud-sync.ts");

  const TRACK_B_ON = {
    pipelineCloudLeanGuardV1: true,
    pipelineCloudLeanMigrationComplete: true,
    pipelineCloudLeanRollback: false,
    pipelineLocalIndexV1: true,
    pipelineLocalIndexMinAppVersion: APP_VERSION,
  };
  const TRACK_B_OFF = {
    pipelineCloudLeanGuardV1: false,
    pipelineCloudLeanMigrationComplete: false,
    pipelineCloudLeanRollback: false,
    pipelineLocalIndexV1: true,
    pipelineLocalIndexMinAppVersion: APP_VERSION,
  };

  const INDEX3 = buildTenderPipelineLsIndex(FULL3, 7);
  const LEGACY_LEAN3 = stripTenderPipelineForLocalStorage(FULL3);
  const MIXED = [{ ...INDEX3[0] }, { ...FULL3[1] }, { ...FULL3[2] }];

  const cloudPipeline = () => cloudKv.get(PIPELINE_KEY);
  const publishedBodies = () => cloudSetBodies
    .filter((b) => Array.isArray(b.keys) && b.keys.includes(PIPELINE_KEY))
    .map((b) => b.values[b.keys.indexOf(PIPELINE_KEY)]);

  // --- CASE A: FULL → Cloud (LEAN opublikowany, bez `_lsIndex`, ikFinalBid zachowany)
  writeSettings(TRACK_B_ON);
  await push.pushTenderPipelineToCloud(FULL3);
  const bodyA = cloudPipeline();
  assert("T-CLOUD-FULL-STILL-PUBLISHED CASE A: FULL → Cloud opublikowany",
    Array.isArray(bodyA) && bodyA.length === 3, Array.isArray(bodyA) ? bodyA.length : bodyA);
  assert("T-CLOUD-FULL-STILL-PUBLISHED CASE A: body = CLOUD LEAN (_cloudLean v1)",
    bodyA.every((it) => it._cloudLean?.v === 1));
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE A: brak `_lsIndex` w Cloud",
    JSON.stringify(bodyA).includes("_lsIndex") === false);
  assert("T-CLOUD-IK-FINAL-BID-PRESERVED CASE A: ikFinalBid 1:1",
    bodyA.every((it, i) => it.ikFinalBid?.totalPln === FULL3[i].ikFinalBid.totalPln));
  assert("CASE A: heavy fields zdjęte (noticeHtml / kosztorys.rows / snapshot)",
    bodyA.every((it) => it.noticeHtml === undefined
      && it.tenderDossier.kosztorys.rows.length === 0
      && it.tenderDossier.scanSummary.branchWinnerArtifacts.every((a) => a.snapshot === undefined)));
  assert("CASE A: legalne pola LEAN nietknięte (catalogQuantities / swzAnalysis / bzpDocuments / tenderFit / cpvCode)",
    bodyA.every((it, i) => JSON.stringify(it.catalogQuantities) === JSON.stringify(FULL3[i].catalogQuantities)
      && JSON.stringify(it.swzAnalysis) === JSON.stringify(FULL3[i].swzAnalysis)
      && JSON.stringify(it.bzpDocuments) === JSON.stringify(FULL3[i].bzpDocuments)
      && JSON.stringify(it.tenderFit) === JSON.stringify(FULL3[i].tenderFit)
      && it.cpvCode === FULL3[i].cpvCode));
  assert("CASE A: guard Track B zapisany razem z body", cloudKv.has(GUARD_KEY));
  const guardRevAfterA = cloudKv.get(GUARD_KEY)?.bundleRevision;

  // --- CASE B: LEGACY_FULL → Cloud (tablica bez markerów = FULL-compatible)
  const setsBeforeB = cloudCalls.set;
  await push.pushTenderPipelineToCloud(FULL3.map((it) => ({ ...it })));
  assert("T-CLOUD-FULL-STILL-PUBLISHED CASE B: LEGACY_FULL → Cloud opublikowany",
    cloudCalls.set > setsBeforeB && Array.isArray(cloudPipeline()) && cloudPipeline().length === 3);
  assert("CASE B: brak `_lsIndex`", JSON.stringify(cloudPipeline()).includes("_lsIndex") === false);

  // --- CASE C: LEGACY_LEAN → Cloud
  const setsBeforeC = cloudCalls.set;
  const leanC = lean.stripTenderPipelineForCloud(LEGACY_LEAN3);
  assert("T-CLOUD-LEAN-STILL-PUBLISHED CASE C: LEGACY_LEAN przechodzi serializer",
    leanC.length === 3 && leanC.every((it) => it._cloudLean?.v === 1));
  await push.pushTenderPipelineToCloud(LEGACY_LEAN3.map((it) => ({ ...it })));
  assert("T-CLOUD-LEAN-STILL-PUBLISHED CASE C: LEGACY_LEAN → Cloud opublikowany",
    cloudCalls.set > setsBeforeC && cloudPipeline().length === 3);
  assert("T-CLOUD-IK-FINAL-BID-PRESERVED CASE C: ikFinalBid zachowany w LEAN",
    cloudPipeline().every((it, i) => it.ikFinalBid?.totalPln === FULL3[i].ikFinalBid.totalPln));

  // --- CASE D: INDEX → Cloud (seam + serializer odmawiają; zero publikacji)
  const setsBeforeD = cloudCalls.set;
  const snapshotBeforeD = JSON.stringify(cloudPipeline());
  let seamErr = null;
  try { await push.pushTenderPipelineToCloud(INDEX3); } catch (e) { seamErr = e; }
  let stripErr = null;
  try { lean.stripTenderPipelineForCloud(INDEX3); } catch (e) { stripErr = e; }
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE D: seam rzuca PIPELINE_INDEX_NOT_FULL",
    seamErr?.code === "PIPELINE_INDEX_NOT_FULL", seamErr?.message);
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE D: serializer LEAN odmawia INDEX",
    stripErr?.code === "PIPELINE_INDEX_NOT_FULL", stripErr?.message);
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE D: zero batch-set", cloudCalls.set === setsBeforeD);
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE D: Cloud body bez zmian",
    JSON.stringify(cloudPipeline()) === snapshotBeforeD);
  assert("CASE D: telemetria odmowy (seam + cloud-lean)",
    notes().some((n) => n === "seam_rejected:index_not_full")
    && notes().some((n) => n === "cloud_lean_rejected:index_not_full"), notes().slice(-6));

  // --- CASE E: INDEX mixed with FULL (INDEX_INVALID)
  const setsBeforeE = cloudCalls.set;
  let mixedErr = null;
  try { await push.pushTenderPipelineToCloud(MIXED); } catch (e) { mixedErr = e; }
  let mixedStripErr = null;
  try { lean.stripTenderPipelineForCloud(MIXED); } catch (e) { mixedStripErr = e; }
  assert("T-CLOUD-INDEX-MIXED-NOT-PUBLISHED CASE E: klasa = INDEX_INVALID",
    classifyPipelineRepresentation(MIXED) === "INDEX_INVALID");
  assert("T-CLOUD-INDEX-MIXED-NOT-PUBLISHED CASE E: seam odmawia",
    mixedErr?.code === "PIPELINE_INDEX_NOT_FULL", mixedErr?.message);
  assert("T-CLOUD-INDEX-MIXED-NOT-PUBLISHED CASE E: serializer odmawia",
    mixedStripErr?.code === "PIPELINE_INDEX_NOT_FULL");
  assert("T-CLOUD-INDEX-MIXED-NOT-PUBLISHED CASE E: zero batch-set", cloudCalls.set === setsBeforeE);

  // --- CASE F: INDEX + brak itemu w Cloud (nie wolno „uzupełnić" Cloud z INDEX)
  const cloudBeforeF = cloudPipeline();
  cloudKv.set(PIPELINE_KEY, cloudBeforeF.filter((it) => it.id !== "t-001"));
  const setsBeforeF = cloudCalls.set;
  let missingErr = null;
  try { await push.pushTenderPipelineToCloud(INDEX3); } catch (e) { missingErr = e; }
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE F: brak itemu w Cloud nie uzasadnia publikacji INDEX",
    missingErr?.code === "PIPELINE_INDEX_NOT_FULL" && cloudCalls.set === setsBeforeF);
  assert("CASE F: Cloud nadal bez `t-001` (brak INDEX-derived item)",
    cloudPipeline().every((it) => it.id !== "t-001")
    && JSON.stringify(cloudPipeline()).includes("_lsIndex") === false);
  cloudKv.set(PIPELINE_KEY, cloudBeforeF);

  // --- CASE G: INDEX + Track B guard (guard nietknięty, bundleRevision bez zmian)
  const guardBeforeG = JSON.stringify(cloudKv.get(GUARD_KEY));
  let guardErr = null;
  try { await push.pushTenderPipelineToCloud(INDEX3); } catch (e) { guardErr = e; }
  assert("CASE G: INDEX nie dotyka guarda Track B",
    guardErr?.code === "PIPELINE_INDEX_NOT_FULL"
    && JSON.stringify(cloudKv.get(GUARD_KEY)) === guardBeforeG);
  assert("CASE G: bundleRevision niezmieniony przez próbę INDEX",
    cloudKv.get(GUARD_KEY)?.bundleRevision >= guardRevAfterA);

  // --- CASE H: INDEX w generycznym bundlu (Track B OFF) — backstop egress + write-safety FULL
  writeSettings(TRACK_B_OFF);
  const pureSanitized = route.sanitizePipelineIndexFromPushKeys(
    [PIPELINE_KEY, GUARD_KEY, "kw-jobs"],
    [INDEX3, { bundleRevision: 9 }, [{ id: "j1" }]],
  );
  assert("CASE H: sanitizer usuwa parę body+guard dla INDEX",
    pureSanitized.blocked === true
    && pureSanitized.keys.length === 1 && pureSanitized.keys[0] === "kw-jobs"
    && pureSanitized.representation === "INDEX", pureSanitized.keys);
  const pureFull = route.sanitizePipelineIndexFromPushKeys([PIPELINE_KEY], [FULL3]);
  assert("CASE H: sanitizer nie rusza FULL", pureFull.blocked === false && pureFull.keys.length === 1);

  const snapshotBeforeH = JSON.stringify(cloudPipeline());
  const setsBeforeH = cloudCalls.set;
  await cloudSync.pushKeysToCloud([PIPELINE_KEY, "kw-contacts"], [INDEX3, [{ id: "c1", name: "X" }]], {
    skipCloudFreshnessGate: true,
  });
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE H: bundle publikuje pozostałe klucze",
    cloudCalls.set === setsBeforeH + 1 && Array.isArray(cloudKv.get("kw-contacts")));
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE H: pipeline pominięty w batch-set",
    cloudSetBodies[cloudSetBodies.length - 1].keys.includes(PIPELINE_KEY) === false,
    cloudSetBodies[cloudSetBodies.length - 1].keys);
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE H: Cloud pipeline bez zmian (write-safety zachowane)",
    JSON.stringify(cloudPipeline()) === snapshotBeforeH);
  assert("CASE H: telemetria cloud_publish_skipped:index_not_full",
    notes().some((n) => n.startsWith("cloud_publish_skipped:index_not_full")), notes().slice(-4));

  // --- CASE H3: druga ścieżka egress — pushKeysToCloudSafe (merge + Track B routing)
  const snapshotBeforeH3 = JSON.stringify(cloudPipeline());
  let safeErr = null;
  try {
    await cloudSync.pushKeysToCloudSafe([PIPELINE_KEY, "kw-contacts"], [INDEX3, [{ id: "c2" }]]);
  } catch (e) { safeErr = e; }
  console.log("  [CASE H3] blocked by:", safeErr?.code ?? safeErr?.name ?? safeErr?.message ?? "no-throw");
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE H3: pushKeysToCloudSafe nie publikuje INDEX-derived body",
    JSON.stringify(cloudPipeline()) === snapshotBeforeH3,
    { err: safeErr?.code ?? safeErr?.message, after: cloudPipeline()?.length });
  assert("T-CLOUD-INDEX-NOT-PUBLISHED CASE H3: Cloud nadal bez `_lsIndex`",
    JSON.stringify(cloudPipeline()).includes("_lsIndex") === false);
  // Dowód, że ścieżka realnie doszła do batch-set (nie cichy short-circuit przed egress).
  assert("CASE H3: pozostałe klucze bundla opublikowane (egress osiągnięty)",
    Array.isArray(cloudKv.get("kw-contacts")) && cloudKv.get("kw-contacts").some((c) => c.id === "c2"),
    cloudKv.get("kw-contacts"));

  // --- CASE H2: write-safety nadal blokuje truncation FULL (bez zmian semantyki)
  writeSettings(TRACK_B_ON);
  const setsBeforeH2 = cloudCalls.set;
  let truncErr = null;
  try { await push.pushTenderPipelineToCloud([FULL3[0]]); } catch (e) { truncErr = e; }
  assert("T-CLOUD-WRITE-SAFETY-PRESERVED: FULL 1/3 blokowany przez write-safety",
    truncErr != null && cloudCalls.set === setsBeforeH2, truncErr?.message);
  assert("T-CLOUD-WRITE-SAFETY-PRESERVED: Cloud nadal ma 3 itemy", cloudPipeline().length === 3);

  assert("CLOUD: żaden opublikowany body nie zawiera `_lsIndex`",
    publishedBodies().every((b) => JSON.stringify(b).includes("_lsIndex") === false));
}

// ---------------------------------------------------------------------------
// CASE static — granice źródłowe Phase 11
// ---------------------------------------------------------------------------

if (CASE_ID === "static") {
  const settingsSrc = readSource("src/lib/app-settings.ts");
  const leanSrc = readSource("src/lib/tender-pipeline/tender-pipeline-cloud-lean.ts");
  const routeSrc = readSource("src/lib/tender-pipeline/tender-pipeline-cloud-route.ts");
  const bzpSrc = readSource("src/lib/tenders-bzp.ts");
  const syncSrc = readSource("src/lib/cloud-sync.ts");
  const versionSrc = readSource("src/lib/app-version.ts");

  assert("GATE: reuse istniejącego mechanizmu wersji (isAppVersionAtLeast + APP_VERSION)",
    settingsSrc.includes("isAppVersionAtLeast(version, min)")
    && settingsSrc.includes("evaluatePipelineLocalIndexRolloutGate(APP_VERSION"));
  assert("GATE: brak nowego frameworku wersji (app-version.ts bez zmian kontraktu)",
    versionSrc.includes("PIPELINE_CLOUD_LEAN_MIN_APP_VERSION")
    && !/PIPELINE_LOCAL_INDEX_MIN_APP_VERSION/.test(versionSrc));
  assert("GATE: brak zaszytego numeru wydania INDEX w src (minimum deklaruje Owner)",
    !/pipelineLocalIndexMinAppVersion:\s*"\d+\.\d+\.\d+"/.test(settingsSrc));
  assert("FLAG: default pipelineLocalIndexV1 = false", /pipelineLocalIndexV1:\s*false/.test(settingsSrc));
  assert("FLAG: brak auto-ON",
    !/pipelineLocalIndexV1\s*=\s*true/.test(settingsSrc) && !/pipelineLocalIndexV1:\s*true/.test(settingsSrc));

  const writer = bzpSrc.slice(
    bzpSrc.indexOf("export function saveTendersPipelineLocal"),
    bzpSrc.indexOf("// DF §A.5.2"),
  );
  assert("GATE: writer czyta bramkę raz na zapis",
    (writer.match(/isPipelineLocalIndexEnabled\(\)/g) ?? []).length === 1);
  assert("GATE: bramka jest preconditionem — przed budową INDEX",
    writer.indexOf("isPipelineLocalIndexEnabled()") < writer.indexOf("buildTenderPipelineLsIndex"));

  assert("CLOUD: brak zdejmowania `_lsIndex` (PIPELINE-NO-CONVERSION-01)",
    !leanSrc.includes("delete next._lsIndex") && !/delete\s+\w+\._lsIndex/.test(leanSrc)
    && !/delete\s+\w+\._lsIndex/.test(routeSrc) && !/delete\s+\w+\._lsIndex/.test(syncSrc));
  assert("CLOUD: serializer LEAN ma precondition INDEX",
    leanSrc.includes("hasLsIndexMarker(items)") && leanSrc.includes("PipelineIndexNotFullError"));
  assert("CLOUD: backstop egress podpięty przed batch-set",
    syncSrc.includes("sanitizePipelineIndexFromPushKeys(keys, values)")
    && syncSrc.indexOf("sanitizePipelineIndexFromPushKeys(keys, values)") < syncSrc.indexOf("const requestBody = JSON.stringify({"));
  assert("CLOUD: brak konwersji INDEX → FULL / LEGACY_FULL w Phase 11",
    !/indexToFull|fullFromIndex|promoteIndex/i.test(settingsSrc + leanSrc + routeSrc));

  // Kontrakty nietknięte przez Phase 11.
  const coldSrc = readSource("src/lib/storage/tenders-pipeline-cold.ts");
  assert("IDB: envelope schema v1 bez zmian",
    coldSrc.includes("export const PIPELINE_IDB_ENVELOPE_SCHEMA_VERSION = 1 as const;"));
  assert("IDB: brak idbRemove envelope", !/idbRemove\(\s*PIPELINE_COLD_IDB_KEY/.test(coldSrc));
  assert("RESET: nadal cloud-first (fetch przed zapisem lokalnym)",
    readSource("src/lib/tenders-admin.ts").includes("fetchKeysFromCloud([TENDERS_PIPELINE_KEY])"));
  assert("BACKUP: nadal FULL z IDB (resolvePipelineFullSource)",
    readSource("src/app/App.tsx").includes("const source = await resolvePipelineFullSource();"));
  assert("RESTORE: nadal canonical writer + odrzucenie INDEX",
    readSource("src/lib/local-data-backup.ts").includes("classifyPipelineRepresentation(pipelineValue)"));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n=== PHASE 11 ${CASE_ID}: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail === 0 ? 0 : 1);
