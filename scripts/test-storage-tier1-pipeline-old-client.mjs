/**
 * STORAGE-TIER1-PIPELINE-CONTRACT-01 — PHASE 10 · T-OLD-CLIENT-READS-INDEX (DF Test S).
 *
 * Reproduction test (AUDIT ONLY — no production code touched, no fix, no flag change).
 *
 * Question: can OLD RELEASE (MAIN @ 3bfecc7f / prod 2.66.230) read an LS INDEX written by the
 * contract writer and overwrite the durable IDB FULL envelope with INDEX-derived state?
 *
 * Design:
 *  1. Fixture is produced by the REAL contract writer (`saveTendersPipelineLocal`, flag ON in an
 *     in-memory settings double) — LS INDEX is a true INDEX, IDB is a true FULL envelope.
 *  2. The old release is exercised in a child `vite-node` process with cwd = MAIN checkout, so the
 *     `@/` alias resolves to old-release sources. Provenance is asserted (old export surface only).
 *  3. Storage / cloud are in-memory doubles; nothing leaves the process.
 *
 * Usage: npx vite-node scripts/test-storage-tier1-pipeline-old-client.mjs [-- --main <path>]
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { installIdbStub } from "./_lib/idb-memory-stub.mjs";

const OUT_DIR = resolve(".tmp/phase10");
const FIXTURE_PATH = resolve(OUT_DIR, "fixture.json");
const EXPECTED_OLD_SHA = "3bfecc7f";

function argOf(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const MAIN_DIR = resolve(argOf("main", "../WGDOM1"));
const PROBE = resolve("scripts/_lib/old-client-probe.mjs");

let pass = 0;
let fail = 0;
const failures = [];

function check(id, ok, detail) {
  if (ok) {
    pass += 1;
    console.log(`  PASS ${id}`);
  } else {
    fail += 1;
    failures.push(`${id} — ${detail ?? ""}`);
    console.log(`  FAIL ${id} — ${detail ?? ""}`);
  }
}

// ---------------------------------------------------------------------------
// 0. Old release identity
// ---------------------------------------------------------------------------

console.log("T-OLD-CLIENT-READS-INDEX — PHASE 10 reproduction\n");
console.log("[0] old release identity");

const headSha = spawnSync("git", ["log", "--format=%H", "-1"], { cwd: MAIN_DIR, encoding: "utf8" })
  .stdout?.trim() ?? "";
check(
  "T-OLD-0.1 old checkout HEAD = 3bfecc7f",
  headSha.startsWith(EXPECTED_OLD_SHA),
  `HEAD=${headSha || "unknown"}`,
);

const PIPELINE_PATHS = [
  "src/lib/tenders-bzp.ts",
  "src/lib/tenders-sync.ts",
  "src/lib/cloud-sync.ts",
  "src/lib/storage/tenders-pipeline-cold.ts",
  "src/lib/storage/storage-idb.ts",
  "src/lib/tender-pipeline",
];
const dirtyPipelineFiles = spawnSync("git", ["status", "--short", "--", ...PIPELINE_PATHS], {
  cwd: MAIN_DIR,
  encoding: "utf8",
}).stdout?.trim() ?? "";
check(
  "T-OLD-0.2 old pipeline/storage/cloud sources byte-identical to 3bfecc7f",
  dirtyPipelineFiles === "",
  dirtyPipelineFiles.replace(/\s+/g, " ").slice(0, 200),
);

/** `app-settings.ts` carries unrelated Owner WIP in the old checkout — assert it is pipeline-neutral. */
const appSettingsDiff = spawnSync("git", ["diff", "--", "src/lib/app-settings.ts"], {
  cwd: MAIN_DIR,
  encoding: "utf8",
}).stdout ?? "";
const appSettingsTouchesPipeline = appSettingsDiff
  .split(/\r?\n/)
  .filter((l) => /^[+-][^+-]/.test(l))
  .some((l) => /pipeline|Pipeline|lsIndex|idb|Idb|INDEX/.test(l));
check(
  "T-OLD-0.3 old app-settings WIP does not touch any pipeline flag / helper",
  !appSettingsTouchesPipeline,
  "app-settings diff touches pipeline symbols",
);
if (appSettingsDiff.trim() !== "") {
  console.log("  NOTE deviation: app-settings.ts has unrelated local WIP (material margin floor) — pipeline-neutral");
}

// ---------------------------------------------------------------------------
// 1. Fixture built by the REAL contract writer (flag ON, in-memory storage)
// ---------------------------------------------------------------------------

console.log("\n[1] fixture (contract writer, flag ON — harness-only settings double)");

const lsMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (lsMap.has(k) ? lsMap.get(k) : null),
  setItem: (k, v) => void lsMap.set(k, String(v)),
  removeItem: (k) => void lsMap.delete(k),
  clear: () => lsMap.clear(),
  key: (i) => [...lsMap.keys()][i] ?? null,
  get length() {
    return lsMap.size;
  },
};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.window = globalThis;

// Phase 11 HARD VERSION GATE — fixture INDEX powstaje tylko, gdy bramka wersji przepuszcza
// canonical writer. Minimum = APP_VERSION tego builda (harness-only), żeby probe starego release'u
// nadal dostawał PRAWDZIWY LS INDEX (inaczej test przestałby wykrywać zachowanie MAIN).
const { APP_VERSION: CONTRACT_APP_VERSION } = await import("../src/lib/app-version.ts");
const APP_SETTINGS_ON = {
  pipelineLocalIndexV1: true,
  pipelineLocalIndexMinAppVersion: CONTRACT_APP_VERSION,
  pipelineCloudLeanGuardV1: true,
  pipelineCloudLeanMigrationComplete: true,
  pipelineCloudLeanRollback: false,
};
const APP_SETTINGS_GUARD_OFF = {
  pipelineLocalIndexV1: true,
  pipelineLocalIndexMinAppVersion: CONTRACT_APP_VERSION,
  pipelineCloudLeanGuardV1: false,
  pipelineCloudLeanMigrationComplete: false,
  pipelineCloudLeanRollback: false,
};
lsMap.set("kw-app-settings", JSON.stringify(APP_SETTINGS_ON));

const idb = installIdbStub({ mode: "ok" });
const IDB_KEY = "tenders-pipeline-full";
const PIPELINE_KEY = "kw-tenders-pipeline";

/** FULL items: heavy fields + normal pipeline fields + ikFinalBid + updatedAt. */
const FULL_ITEMS = [
  {
    id: "t-001",
    tenderId: "2026/BZP 00100001/01",
    bzpNumber: "2026/BZP 00100001",
    title: "Remont instalacji elektrycznej — budynek A",
    status: "preparing",
    addedAt: "2026-02-01T08:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    publicationDate: "2026-02-01",
    submittingOffersDate: "2026-03-20",
    organizationName: "Wrocławskie Mieszkania sp. z o.o.",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45310000-3",
    relevanceScore: 88,
    matchedKeywords: ["instalacja", "remont"],
    isWroclaw: true,
    priorityBuyerId: "wm",
    priorityBuyerLabel: "WM",
    linkedJobId: null,
    ourEstimatePln: 412000,
    tenderState: "ongoing",
    ikFinalBid: { totalPln: 398500, acceptedAt: "2026-02-28T12:00:00.000Z", revision: 3 },
    noticeHtml: `<html><body>${"OGŁOSZENIE ".repeat(4000)}</body></html>`,
    noticeHtmlFetchedAt: "2026-02-02T09:00:00.000Z",
    notes: "Kontakt: inspektor WM, termin wizji lokalnej 2026-03-05",
    submittedBidPln: null,
    bzpDocuments: [
      { name: "SWZ.pdf", url: "https://example.invalid/swz.pdf" },
      { name: "Przedmiar.ath", url: "https://example.invalid/przedmiar.ath" },
    ],
    documentsFetchedAt: "2026-02-03T09:00:00.000Z",
    estimateHistory: [
      { at: "2026-02-10T09:00:00.000Z", pln: 430000 },
      { at: "2026-02-20T09:00:00.000Z", pln: 412000 },
    ],
    changeMonitor: { events: [{ at: "2026-02-15T09:00:00.000Z", kind: "deadline_changed" }] },
    swzAnalysis: {
      profitabilityHint: "ok",
      estimatedValuePln: 450000,
      estimatedValueRaw: "450 000,00 zł",
      implementationDays: 120,
      wadiumPercent: 2,
      wadiumPln: 9000,
      wadiumRaw: "9 000,00 zł",
    },
    tenderFit: { fitLabel: "dobre", winChancePct: 42 },
    awardResult: null,
    tenderDossier: {
      kosztorys: {
        source: "ath",
        rowCount: 3,
        rows: [
          { lp: 1, knr: "KNR 5-08 0101-01", desc: "Montaż tablicy", qty: 4, unit: "szt" },
          { lp: 2, knr: "KNR 5-08 0202-02", desc: "Przewody YDYp 3x2,5", qty: 820, unit: "m" },
          { lp: 3, knr: "KNR 5-08 0303-03", desc: "Gniazda podtynkowe", qty: 96, unit: "szt" },
        ],
      },
      formularz: { positions: 3 },
    },
  },
  {
    id: "t-002",
    tenderId: "2026/BZP 00100002/01",
    bzpNumber: "2026/BZP 00100002",
    title: "Przebudowa lokalu mieszkalnego — ul. Testowa 2",
    status: "submitted",
    addedAt: "2026-02-05T08:00:00.000Z",
    updatedAt: "2026-02-20T11:30:00.000Z",
    publicationDate: "2026-02-05",
    submittingOffersDate: "2026-02-19",
    organizationName: "ZZK Wrocław",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45453000-7",
    relevanceScore: 71,
    matchedKeywords: ["przebudowa"],
    isWroclaw: true,
    priorityBuyerId: "zzk",
    priorityBuyerLabel: "ZZK",
    linkedJobId: "job-77",
    ourEstimatePln: 158000,
    tenderState: "ongoing",
    ikFinalBid: { totalPln: 151200, acceptedAt: "2026-02-18T15:00:00.000Z", revision: 1 },
    submittedBidPln: 151200,
    submittedAt: "2026-02-19T09:00:00.000Z",
    notes: "Oferta złożona przez ePUAP",
    noticeHtml: `<html><body>${"TREŚĆ OGŁOSZENIA ".repeat(2500)}</body></html>`,
    bzpDocuments: [{ name: "SWZ.pdf", url: "https://example.invalid/swz2.pdf" }],
    tenderDossier: {
      kosztorys: {
        source: "pdf",
        rowCount: 2,
        rows: [
          { lp: 1, knr: "KNR 2-02 1101-01", desc: "Ścianki GK", qty: 38, unit: "m2" },
          { lp: 2, knr: "KNR 2-02 2002-02", desc: "Gładzie gipsowe", qty: 210, unit: "m2" },
        ],
      },
    },
  },
  {
    id: "t-003",
    tenderId: "2026/BZP 00100003/01",
    bzpNumber: "2026/BZP 00100003",
    title: "Konserwacja instalacji — pakiet 3",
    status: "new",
    addedAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-02T08:00:00.000Z",
    publicationDate: "2026-03-01",
    submittingOffersDate: "2026-03-28",
    organizationName: "MOPS Wrocław",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "50700000-2",
    relevanceScore: 55,
    matchedKeywords: ["konserwacja"],
    isWroclaw: true,
    linkedJobId: null,
    ourEstimatePln: null,
    ikFinalBid: null,
  },
];

const contractBzp = await import("@/lib/tenders-bzp");
const contractCold = await import("@/lib/storage/tenders-pipeline-cold");
const contractLean = await import("@/lib/tender-pipeline/tender-pipeline-cloud-lean");

check(
  "T-OLD-1.0 fixture built by contract build (INDEX writer present)",
  typeof contractCold.buildTenderPipelineLsIndex === "function" &&
    typeof contractBzp.awaitPipelineLocalWriteSettled === "function",
  "contract exports missing",
);

contractBzp.saveTendersPipelineLocal(FULL_ITEMS);
const settled = await contractBzp.awaitPipelineLocalWriteSettled();

const idbEnvelope = idb.getRaw(IDB_KEY)?.value ?? null;
const lsRaw = lsMap.get(PIPELINE_KEY) ?? null;
const lsIndex = lsRaw ? JSON.parse(lsRaw) : null;

check(
  "T-OLD-1.1 IDB = FULL envelope (schemaVersion + items + localSeq)",
  !!idbEnvelope && typeof idbEnvelope === "object" && !Array.isArray(idbEnvelope) &&
    idbEnvelope.schemaVersion === 1 && Array.isArray(idbEnvelope.items) &&
    idbEnvelope.items.length === FULL_ITEMS.length && typeof idbEnvelope.localSeq === "number",
  `idb=${JSON.stringify(idbEnvelope).slice(0, 120)}`,
);
check(
  "T-OLD-1.2 IDB FULL keeps heavy fields + ikFinalBid",
  !!idbEnvelope &&
    idbEnvelope.items.filter((i) => typeof i.noticeHtml === "string" && i.noticeHtml.length > 0).length === 2 &&
    idbEnvelope.items[0].tenderDossier.kosztorys.rows.length === 3 &&
    idbEnvelope.items[0].ikFinalBid.totalPln === 398500,
  "heavy/ikFinalBid missing in envelope",
);
check(
  "T-OLD-1.3 LS = real INDEX (all items carry _lsIndex marker v=1 + same seq)",
  Array.isArray(lsIndex) && lsIndex.length === FULL_ITEMS.length &&
    lsIndex.every((i) => i._lsIndex && i._lsIndex.v === 1 && i._lsIndex.seq === idbEnvelope.localSeq),
  `ls mode=${settled?.ls?.mode} raw=${String(lsRaw).slice(0, 120)}`,
);
check(
  "T-OLD-1.4 LS INDEX is a projection (no heavy fields, no tenderDossier/notes)",
  Array.isArray(lsIndex) &&
    lsIndex.every((i) => i.noticeHtml === undefined && i.tenderDossier === undefined && i.notes === undefined) &&
    lsIndex[0].ikFinalBid?.totalPln === 398500 && lsIndex[0].updatedAt === FULL_ITEMS[0].updatedAt,
  "INDEX projection unexpected",
);

const cloudLean = contractLean.stripTenderPipelineForCloud(FULL_ITEMS);
/** "minimal valid fixture" — cloud carries only the canonical minimum for one known id. */
const cloudMinimal = [{ id: "t-001", updatedAt: "2026-02-25T10:00:00.000Z", status: "preparing", title: FULL_ITEMS[0].title }];

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  FIXTURE_PATH,
  JSON.stringify(
    {
      meta: {
        contract: "STORAGE-TIER1-PIPELINE-CONTRACT-01",
        phase: 10,
        builtBy: "contract saveTendersPipelineLocal (flag ON) — harness storage doubles",
        oldReleaseSha: EXPECTED_OLD_SHA,
        localSeq: idbEnvelope?.localSeq ?? null,
      },
      fullItems: FULL_ITEMS,
      idbEnvelope,
      lsIndex,
      cloudLean,
      cloudMinimal,
      cloudGuard: null,
      appSettings: APP_SETTINGS_ON,
      appSettingsGuardOff: APP_SETTINGS_GUARD_OFF,
    },
    null,
    2,
  ),
  "utf8",
);
console.log(`  fixture → ${FIXTURE_PATH} (localSeq=${idbEnvelope?.localSeq})`);

// ---------------------------------------------------------------------------
// 2. Old-release probe runs
// ---------------------------------------------------------------------------

function runProbe(caseId, extra = []) {
  const out = resolve(OUT_DIR, `evidence-${caseId}.json`);
  const res = spawnSync(
    "npx",
    ["vite-node", PROBE, "--", "--case", caseId, "--fixture", FIXTURE_PATH, "--out", out, ...extra],
    {
      cwd: MAIN_DIR,
      encoding: "utf8",
      shell: true,
      timeout: 240000,
      env: {
        ...process.env,
        // Cloud is a local test double; these only make `isSupabaseConfigured()` true so that the
        // old cloud code path is exercised. No request ever leaves the process (fetch is stubbed).
        VITE_SUPABASE_PROJECT_ID: "phase10stub",
        VITE_SUPABASE_ANON_KEY: "phase10-anon-key",
      },
    },
  );
  if (res.status !== 0 || !existsSync(out)) {
    console.log(res.stdout?.slice(-2000) ?? "");
    console.log(res.stderr?.slice(-2000) ?? "");
    throw new Error(`probe case ${caseId} failed (status=${res.status})`);
  }
  return JSON.parse(readFileSync(out, "utf8"));
}

const heavyOf = (rep) => rep?.items?.heavyNoticeHtmlCount ?? rep?.heavyNoticeHtmlCount ?? 0;
const countOf = (rep) => rep?.items?.count ?? rep?.count ?? 0;
const markerOf = (rep) => rep?.items?.markerCount ?? rep?.markerCount ?? 0;
const bidsOf = (rep) => rep?.items?.ikFinalBid ?? rep?.ikFinalBid ?? [];
const rowsOf = (rep) => rep?.items?.dossierRowCounts ?? rep?.dossierRowCounts ?? [];

console.log("\n[2] CASE A — IDB FULL · LS INDEX · cloud available (minimal valid fixture)");
const A = runProbe("A");
check("T-OLD-A.0 probe ran old release (old export surface only)", A.provenance.isOldRelease === true, JSON.stringify(A.provenance.coldExports));
check(
  "T-OLD-A.1 hydratePipelineColdFromIdb returns null for contract envelope",
  A.steps[0].output.shape === "null" && A.steps[0].coldMemAfter.shape === "null",
  JSON.stringify(A.steps[0].output),
);
check(
  "T-OLD-A.2 loadTendersPipelineLocal returns the INDEX as pipeline body",
  A.steps[1].output.shape === "array" && markerOf(A.steps[1].output) === 3 && heavyOf(A.steps[1].output) === 0,
  JSON.stringify(A.steps[1].output).slice(0, 200),
);
check(
  "T-OLD-A.3 merge receives INDEX on the local side and emits _lsIndex-marked items",
  markerOf(A.steps.find((s) => s.n === 4)?.output) >= 1,
  "merge output has no marker",
);
check(
  "T-OLD-A.4 loadTendersPipeline persists (persistAlways) → IDB write happened",
  A.afterLoad.idbRecordUpdatedAt !== A.before.idb?.envelope?.writtenAt,
  "no idb record update detected",
);
check(
  "T-OLD-A.5 IDB envelope replaced by a legacy ARRAY",
  A.before.idb.shape === "envelope" && A.afterLoad.idb.shape === "array",
  `before=${A.before.idb.shape} after=${A.afterLoad.idb.shape}`,
);
check(
  "T-OLD-A.6 IDB after load has no heavy fields (noticeHtml/dossier rows lost)",
  heavyOf(A.afterLoad.idb) === 0 && rowsOf(A.afterLoad.idb).every((r) => r === null || r === 0),
  JSON.stringify({ heavy: heavyOf(A.afterLoad.idb), rows: rowsOf(A.afterLoad.idb) }),
);
check(
  "T-OLD-A.7 IDB after load carries _lsIndex markers (INDEX-derived state)",
  markerOf(A.afterLoad.idb) >= 1,
  `markers=${markerOf(A.afterLoad.idb)}`,
);

console.log("\n[3] CASE B — IDB FULL · LS INDEX · cloud unavailable");
const B = runProbe("B");
check("T-OLD-B.0 probe ran old release", B.provenance.isOldRelease === true, "");
check(
  "T-OLD-B.1 reader path without cloud does not write IDB (no persistAlways)",
  B.afterLoad.idb.shape === "envelope" && countOf(B.afterLoad.idb) === 3 && heavyOf(B.afterLoad.idb) === 2,
  `after=${B.afterLoad.idb.shape}`,
);
check(
  "T-OLD-B.2 returned pipeline is still INDEX-derived (UI works on INDEX)",
  markerOf(B.steps.find((s) => s.n === 5)?.output) === 3,
  "returned items not INDEX-derived",
);
check(
  "T-OLD-B.3 any user-intent write (saveTendersPipelineLocal) replaces envelope with INDEX array",
  B.writerSubCase.idbBefore.shape === "envelope" && B.writerSubCase.idbAfter.shape === "array" &&
    heavyOf(B.writerSubCase.idbAfter) === 0,
  JSON.stringify({ before: B.writerSubCase.idbBefore.shape, after: B.writerSubCase.idbAfter.shape }),
);

console.log("\n[4] CASE C — IDB FULL · LS INDEX · cloud LEAN (+ cloud push, Track B guard ON)");
const stateC = resolve(OUT_DIR, "state-C.json");
const C = runProbe("C", ["--state-out", stateC]);
check("T-OLD-C.0 probe ran old release", C.provenance.isOldRelease === true, "");
check(
  "T-OLD-C.1 old client does NOT recognise INDEX (no rejection, treated as body)",
  markerOf(C.steps[1].output) === 3 && C.steps[1].output.shape === "array",
  "INDEX not treated as body",
);
check(
  "T-OLD-C.2 INDEX merged with cloud LEAN and written to IDB as array",
  C.before.idb.shape === "envelope" && C.afterLoad.idb.shape === "array" && markerOf(C.afterLoad.idb) >= 1,
  `after=${C.afterLoad.idb.shape}`,
);
check(
  "T-OLD-C.3 ikFinalBid survives in IDB after overwrite (INDEX projects it)",
  bidsOf(C.afterLoad.idb).filter((b) => b.present).length === 2,
  JSON.stringify(bidsOf(C.afterLoad.idb)),
);
check(
  "T-OLD-C.4 heavy fields NOT recoverable from cloud LEAN (lost in IDB)",
  heavyOf(C.afterLoad.idb) === 0,
  `heavy=${heavyOf(C.afterLoad.idb)}`,
);
const cloudAfterC = C.cloudPushSubCase?.cloudAfter;
check(
  "T-OLD-C.5 cloud push outcome recorded",
  C.cloudPushSubCase != null && (C.cloudPushSubCase.outcome.ok === true || C.cloudPushSubCase.outcome.error != null),
  "no push evidence",
);
check(
  "T-OLD-C.6 cloud item count not reduced by old client",
  cloudAfterC == null || countOf(cloudAfterC) >= countOf(C.before.cloud),
  `before=${countOf(C.before.cloud)} after=${countOf(cloudAfterC)}`,
);

console.log("\n[5] CASE C2 — same, Track B guard OFF (legacy lean-guard disabled)");
const C2 = runProbe("C2");
check("T-OLD-C2.0 probe ran old release", C2.provenance.isOldRelease === true, "");
check(
  "T-OLD-C2.1 IDB overwritten with INDEX array (guard state irrelevant for local durability)",
  C2.before.idb.shape === "envelope" && C2.afterLoad.idb.shape === "array",
  `after=${C2.afterLoad.idb.shape}`,
);
check(
  "T-OLD-C2.2 cloud push evidence captured",
  C2.cloudPushSubCase != null,
  "no push evidence",
);

console.log("\n[6] CASE E — reload (first boot → second boot, storage carried over)");
const stateE1 = resolve(OUT_DIR, "state-E1.json");
const E1 = runProbe("E1", ["--state-out", stateE1]);
const E2 = runProbe("E2", ["--state-in", stateE1]);
check(
  "T-OLD-E.1 first boot replaced envelope with INDEX-derived array",
  E1.before.idb.shape === "envelope" && E1.afterLoad.idb.shape === "array",
  `after=${E1.afterLoad.idb.shape}`,
);
check(
  "T-OLD-E.2 second boot hydrates coldMem FROM the INDEX-derived array (accepted as durable FULL)",
  E2.before.idb.shape === "array" && E2.steps[0].output.shape === "array" && markerOf(E2.steps[0].output) >= 1,
  JSON.stringify(E2.steps[0].output).slice(0, 200),
);
check(
  "T-OLD-E.3 second boot never regains heavy fields",
  heavyOf(E2.afterLoad.idb) === 0 && heavyOf(E2.steps.find((s) => s.n === 5)?.output) === 0,
  "heavy data reappeared",
);

// ---------------------------------------------------------------------------
// 3. Forward path: what the NEW code sees after the old client ran
// ---------------------------------------------------------------------------

console.log("\n[7] cloud delta — per-id field comparison (cloud LEAN before vs after old-client push)");
const stateCloud = JSON.parse(readFileSync(stateC, "utf8"));
const cloudAfterBody = stateCloud.cloud[PIPELINE_KEY];
const byId = (arr) => new Map((Array.isArray(arr) ? arr : []).map((i) => [i.id, i]));
const beforeById = byId(cloudLean);
const afterById = byId(cloudAfterBody);
const cloudDelta = [];
for (const [id, before] of beforeById) {
  const after = afterById.get(id) ?? {};
  const lost = Object.keys(before).filter((k) => !(k in after));
  const added = Object.keys(after).filter((k) => !(k in before));
  cloudDelta.push({ id, lost, added, ikFinalBidBefore: before.ikFinalBid?.totalPln ?? null, ikFinalBidAfter: after.ikFinalBid?.totalPln ?? null });
}
console.log(`  ${JSON.stringify(cloudDelta, null, 1)}`);
writeFileSync(resolve(OUT_DIR, "cloud-delta.json"), JSON.stringify(cloudDelta, null, 2), "utf8");

check(
  "T-OLD-C.7 cloud body now carries _lsIndex markers on every item (LEAN contract contaminated)",
  Array.isArray(cloudAfterBody) && cloudAfterBody.length === 3 &&
    cloudAfterBody.every((i) => i._lsIndex && i._lsIndex.v === 1),
  "no marker contamination in cloud",
);
check(
  "T-OLD-C.8 cloud keeps every id (no count reduction)",
  [...beforeById.keys()].every((id) => afterById.has(id)) && afterById.size === beforeById.size,
  `before=${beforeById.size} after=${afterById.size}`,
);
check(
  "T-OLD-C.9 cloud keeps ikFinalBid values for all ids",
  cloudDelta.every((d) => d.ikFinalBidBefore === d.ikFinalBidAfter),
  JSON.stringify(cloudDelta.map((d) => [d.id, d.ikFinalBidBefore, d.ikFinalBidAfter])),
);
const cloudLostFields = cloudDelta.flatMap((d) => d.lost);
check(
  "T-OLD-C.10 for ids already in cloud: union merge preserves every LEAN field (only _lsIndex added)",
  cloudLostFields.length === 0 && cloudDelta.every((d) => d.added.length === 1 && d.added[0] === "_lsIndex"),
  `lost=${JSON.stringify(cloudLostFields)} added=${JSON.stringify(cloudDelta.map((d) => d.added))}`,
);

console.log("\n[7b] CASE C3 — cloud LEAN missing one id that exists locally (INDEX-only publish)");
const stateC3 = resolve(OUT_DIR, "state-C3.json");
const C3 = runProbe("C3", ["--state-out", stateC3]);
const c3Cloud = JSON.parse(readFileSync(stateC3, "utf8")).cloud[PIPELINE_KEY];
const c3T1 = (Array.isArray(c3Cloud) ? c3Cloud : []).find((i) => i.id === "t-001") ?? null;
const fullT1 = FULL_ITEMS[0];
const c3MissingFields = ["notes", "bzpDocuments", "estimateHistory", "changeMonitor", "documentsFetchedAt", "tenderDossier"]
  .filter((f) => fullT1[f] !== undefined && (c3T1 == null || c3T1[f] === undefined));
check("T-OLD-C3.0 probe ran old release", C3.provenance.isOldRelease === true, "");
check(
  "T-OLD-C3.1 cloud receives the id it lacked, as INDEX-derived content",
  c3T1 != null && c3T1._lsIndex?.v === 1,
  `t-001 in cloud = ${c3T1 == null ? "absent" : "present without marker"}`,
);
check(
  "T-OLD-C3.2 that cloud record lacks non-INDEX fields still held in local IDB FULL",
  c3MissingFields.length > 0,
  `missing=${JSON.stringify(c3MissingFields)}`,
);
console.log(`  cloud t-001 lacks: ${JSON.stringify(c3MissingFields)}`);
writeFileSync(
  resolve(OUT_DIR, "cloud-c3-record.json"),
  JSON.stringify({ cloudRecord: c3T1, missingVsLocalFull: c3MissingFields }, null, 2),
  "utf8",
);

console.log("\n[8] forward recovery — contract reader against post-old-client state");
const postIdbValue = JSON.parse(readFileSync(stateE1, "utf8")).idb;
const parsed = contractCold.parsePipelineIdbEnvelope(postIdbValue);
check(
  "T-OLD-F.1 contract parser rejects the post-old-client IDB value (no FULL authority)",
  parsed.status !== "OK",
  `status=${parsed.status} reason=${parsed.reason ?? "-"}`,
);
console.log(`  contract IDB parse → status=${parsed.status} reason=${parsed.reason ?? "-"}`);

const postLsRaw = stateCloud.ls[PIPELINE_KEY] ?? null;
const lsKind = contractCold.detectPipelineLsKind(postLsRaw);
check(
  "T-OLD-F.2 contract reader never promotes post-old-client LS to FULL",
  lsKind.kind === "INDEX" || lsKind.kind === "CORRUPT",
  `kind=${lsKind.kind} reason=${lsKind.reason ?? "-"}`,
);
console.log(`  contract LS classify → kind=${lsKind.kind} seq=${lsKind.seq ?? "-"} reason=${lsKind.reason ?? "-"}`);

const cloudRepr = contractCold.classifyPipelineRepresentation
  ? contractCold.classifyPipelineRepresentation(cloudAfterBody)
  : "n/a";
const reprMod = await import("@/lib/tender-pipeline/tender-pipeline-representation");
const cloudReprFinal = cloudRepr !== "n/a" ? cloudRepr : reprMod.classifyPipelineRepresentation(cloudAfterBody);
check(
  "T-OLD-F.3 contract classifies the contaminated cloud body as INDEX (not FULL)",
  cloudReprFinal === "INDEX" || cloudReprFinal === "INDEX_INVALID",
  `representation=${cloudReprFinal}`,
);
console.log(`  contract cloud classify → ${cloudReprFinal}`);

// ---------------------------------------------------------------------------
// 4. Network safety
// ---------------------------------------------------------------------------

console.log("\n[9] harness safety");
for (const [id, ev] of [["A", A], ["B", B], ["C", C], ["C2", C2], ["C3", C3], ["E1", E1], ["E2", E2]]) {
  check(`T-OLD-S.${id} no non-supabase/no real network escape`, (ev.networkEscape ?? []).length === 0, JSON.stringify(ev.networkEscape));
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const verdict = {
  OLD_CLIENT_READS_INDEX: markerOf(A.steps[1].output) === 3 ? "CONFIRMED" : "NOT CONFIRMED",
  OLD_CLIENT_OVERWRITES_IDB_FULL:
    A.before.idb.shape === "envelope" && A.afterLoad.idb.shape === "array" ? "YES" : "NO",
  OLD_CLIENT_LOSES_HEAVY: heavyOf(A.afterLoad.idb) === 0 && heavyOf(A.before.idb) > 0 ? "YES" : "NO",
  OLD_CLIENT_LOSES_IK_FINAL_BID: bidsOf(A.afterLoad.idb).filter((b) => b.present).length < 2 ? "YES" : "NO",
  ENVELOPE_REPLACED: A.afterLoad.idb.shape === "array" ? "YES" : "NO",
  CLOUD_CHANGED: C.cloudPushSubCase?.outcome?.ok === true ? "YES" : "NO",
  CLOUD_MARKER_CONTAMINATION:
    markerOf(C.cloudPushSubCase?.cloudAfter) >= 1 ? "YES" : C.cloudPushSubCase?.outcome?.ok ? "NO" : "BLOCKED",
  CLOUD_COUNT_REDUCED: afterById.size < beforeById.size ? "YES" : "NO",
  CLOUD_LOSES_IK_FINAL_BID: cloudDelta.some((d) => d.ikFinalBidBefore !== d.ikFinalBidAfter) ? "YES" : "NO",
  CLOUD_LOSES_NON_INDEX_FIELDS: cloudLostFields.length > 0 ? "YES" : "NO",
  CLOUD_INDEX_ONLY_PUBLISH_FOR_MISSING_ID: c3MissingFields.length > 0 ? "YES" : "NO",
  FORWARD_IDB_RECOVERABLE: parsed.status === "OK" ? "YES" : "NO",
};

writeFileSync(resolve(OUT_DIR, "verdict.json"), JSON.stringify({ verdict, pass, fail, failures }, null, 2), "utf8");

console.log(`\n${"=".repeat(60)}`);
console.log("T-OLD-CLIENT-READS-INDEX verdict:");
for (const [k, v] of Object.entries(verdict)) console.log(`  ${k} = ${v}`);
console.log(`${"=".repeat(60)}`);
console.log(`PASS ${pass} · FAIL ${fail}`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`\nevidence dir: ${OUT_DIR}`);
process.exit(fail > 0 ? 1 : 0);
