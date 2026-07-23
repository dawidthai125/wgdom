/**
 * TENDERS-SYNC-STORM-P0 — T1–T8 regression gates.
 * npx vite-node scripts/test-tenders-sync-storm-p0.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

globalThis.localStorage = {
  _m: new Map(),
  setItem(k, v) {
    this._m.set(String(k), String(v));
  },
  getItem(k) {
    return this._m.has(String(k)) ? this._m.get(String(k)) : null;
  },
  removeItem(k) {
    this._m.delete(String(k));
  },
  clear() {
    this._m.clear();
  },
  key(i) {
    return [...this._m.keys()][i] ?? null;
  },
  get length() {
    return this._m.size;
  },
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const { tenderDossierHeavyParseDone } = await import("../src/lib/tender-dossier-pipeline.ts");
const { CURRENT_PARSER_VERSION } = await import("../src/lib/tender-dossier-parser-version.ts");
const {
  bumpHeavyRunAttemptsForTest,
  getHeavyMaxRunsPerKeyForTest,
  getHeavyRunAttemptsForTest,
  HEAVY_E_RUN_DEP_KEYS,
  isDossierInflightForItem,
  markDossierInflightForTest,
  resetDossierHeavyLazyForTests,
} = await import("../src/app/hooks/useTenderDossierHeavyLazy.ts");
const {
  flushTenderPipelinePersist,
  forcePipelinePersistDebounceForTests,
  getTenderPipelineCloudWriteCountForTests,
  resetTenderPipelinePersistCoalesceForTests,
  scheduleTenderPipelinePersist,
  setTenderPipelineCloudPushForTests,
  syncTenderPipelineLocalOnly,
} = await import("../src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts");

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function installCloudStub() {
  setTenderPipelineCloudPushForTests(async () => {
    /* no network — count only via coalesce counter */
  });
}

const itemA = {
  id: "storm-a",
  title: "A",
  status: "seen",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

async function run() {
  console.log("=== TENDERS-SYNC-STORM-P0 T1–T8 ===\n");

  // --- T1 / T2: source contract — E-RUN deps break onUpdate→builtAt→reparse cycle ---
  const heavySrc = readFileSync(
    join(ROOT, "src/app/hooks/useTenderDossierHeavyLazy.ts"),
    "utf8",
  );
  const eRunDepsMatch = heavySrc.match(
    /\}, \[([^\]]+)\]\);\s*\n\s*return \{\s*\n\s*dossierBuilding/,
  );
  const eRunDeps = eRunDepsMatch ? eRunDepsMatch[1].replace(/\s+/g, "") : "";
  ok(
    "T1 E-RUN deps are exactly enabled,itemId,gateFingerprint,athPreviewEnabled,retryNonce",
    eRunDeps === "enabled,itemId,gateFingerprint,athPreviewEnabled,retryNonce",
  );
  ok(
    "T1 HEAVY_E_RUN_DEP_KEYS contract matches source",
    HEAVY_E_RUN_DEP_KEYS.join(",") === "enabled,itemId,gateFingerprint,athPreviewEnabled,retryNonce",
  );
  ok(
    "T2 builtAt is not an E-RUN dependency",
    !eRunDeps.includes("builtAt"),
  );
  ok(
    "T2 partial persist mode is local-only",
    heavySrc.includes('{ persist: "local" }') &&
      heavySrc.includes("partial-local"),
  );
  ok(
    "T2 final persist mode is cloud",
    heavySrc.includes('{ persist: "cloud" }') &&
      heavySrc.includes("final-cloud"),
  );

  // --- T3: gateFingerprint change allows new run key (circuit attempts isolated) ---
  resetDossierHeavyLazyForTests();
  bumpHeavyRunAttemptsForTest("item-1", "fp-docs-v1", 0);
  bumpHeavyRunAttemptsForTest("item-1", "fp-docs-v1", 0);
  ok(
    "T3 same gate key reaches circuit max",
    getHeavyRunAttemptsForTest("item-1", "fp-docs-v1", 0) === getHeavyMaxRunsPerKeyForTest(),
  );
  bumpHeavyRunAttemptsForTest("item-1", "fp-docs-v2", 0);
  ok(
    "T3 new gateFingerprint starts fresh attempt counter",
    getHeavyRunAttemptsForTest("item-1", "fp-docs-v2", 0) === 1,
  );

  // --- T4: 5× local + 1× cloud coalesce ≤ 1–2 cloud writes ---
  resetTenderPipelinePersistCoalesceForTests();
  forcePipelinePersistDebounceForTests(false);
  installCloudStub();
  for (let i = 0; i < 5; i++) {
    syncTenderPipelineLocalOnly([{ ...itemA, title: `partial-${i}` }]);
  }
  ok(
    "T4 five local-only syncs — 0 cloud writes",
    getTenderPipelineCloudWriteCountForTests() === 0,
  );
  scheduleTenderPipelinePersist([{ ...itemA, title: "final" }], { force: true });
  await flushTenderPipelinePersist("flush_explicit", { force: true });
  ok(
    "T4 one forced cloud final — cloud writes === 1",
    getTenderPipelineCloudWriteCountForTests() === 1,
  );

  // --- T5: tenderDossierHeavyParseDone + terminal parsedAt stops loop ---
  ok(
    "T5 empty dossier not done",
    tenderDossierHeavyParseDone(null) === false,
  );
  ok(
    "T5 terminal parsedAt (no kosztorys) is done when parserVersion matches",
    tenderDossierHeavyParseDone({
      parserVersion: CURRENT_PARSER_VERSION,
      builtAt: "2026-07-23T12:00:00.000Z",
      scanSummary: {
        totalDocuments: 0,
        scanned: 0,
        parsed: 0,
        byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
        sevenZipCount: 0,
        kosztorysFound: false,
        valueFound: false,
        criteriaFound: false,
        estimateFound: false,
        costDiscovery: null,
        parsedAt: "2026-07-23T12:00:00.000Z",
      },
    }) === true,
  );
  ok(
    "T5 heavy source stamps parsedAt on no-parseSession terminal path",
    heavySrc.includes("Terminal: no enrichment") && heavySrc.includes("parsedAt"),
  );

  // --- T6: debounce coalesce 10× schedule → 1 cloud write ---
  resetTenderPipelinePersistCoalesceForTests();
  forcePipelinePersistDebounceForTests(true);
  installCloudStub();
  for (let i = 0; i < 10; i++) {
    scheduleTenderPipelinePersist([{ ...itemA, title: `burst-${i}` }]);
  }
  await flushTenderPipelinePersist("flush_explicit");
  ok(
    "T6 ten schedules coalesce to 1 cloud write",
    getTenderPipelineCloudWriteCountForTests() === 1,
  );

  resetTenderPipelinePersistCoalesceForTests();
  forcePipelinePersistDebounceForTests(false);
  installCloudStub();
  scheduleTenderPipelinePersist([itemA]);
  ok(
    "T6 flag OFF without force — schedule no-op (legacy)",
    getTenderPipelineCloudWriteCountForTests() === 0,
  );
  scheduleTenderPipelinePersist([itemA], { force: true });
  await sleep(550);
  ok(
    "T6 force coalesce works even when debounce flag OFF",
    getTenderPipelineCloudWriteCountForTests() === 1,
  );

  // --- T7: updateItem wiring + inflight guard smoke (no MOPS / no live network) ---
  const pipelineSrc = readFileSync(
    join(ROOT, "src/app/tenders/strategy/hooks/useTendersPipeline.ts"),
    "utf8",
  );
  const pageSrc = readFileSync(join(ROOT, "src/app/TenderDetailPage.tsx"), "utf8");
  ok(
    "T7 updateItem honors persist local via syncTenderPipelineLocalOnly",
    pipelineSrc.includes('mode === "local"') &&
      pipelineSrc.includes("syncTenderPipelineLocalOnly(next)"),
  );
  ok(
    "T7 updateItem cloud path uses schedule force",
    pipelineSrc.includes('mode === "cloud"') &&
      pipelineSrc.includes("scheduleTenderPipelinePersist(next, { force: true })"),
  );
  ok(
    "T7 TenderDetailPage forwards persist opts to updateItem",
    pageSrc.includes("pipeline.updateItem(item?.id ?? tenderId, patch, opts)"),
  );
  resetDossierHeavyLazyForTests();
  markDossierInflightForTest("storm-inflight");
  ok("T7 inflight guard set", isDossierInflightForItem("storm-inflight"));
  resetDossierHeavyLazyForTests();
  ok("T7 inflight cleared by reset", !isDossierInflightForItem("storm-inflight"));

  // --- T8: isolation — no Payroll / Edge / StorageManager / persistKey API edits ---
  const coalesceSrc = readFileSync(
    join(ROOT, "src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts"),
    "utf8",
  );
  ok(
    "T8 coalesce still uses persistKey (no protocol fork)",
    coalesceSrc.includes("persistKey(TENDERS_PIPELINE_KEY, items)"),
  );
  ok(
    "T8 heavy hook does not import Payroll / StorageManager / Edge",
    !heavySrc.includes("payroll") &&
      !heavySrc.includes("storage-manager") &&
      !heavySrc.includes("supabase/functions"),
  );
  ok(
    "T8 circuit breaker max runs === 2",
    getHeavyMaxRunsPerKeyForTest() === 2,
  );
  ok(
    "T8 generation guard present in heavy hook",
    heavySrc.includes("runGenerationRef") && heavySrc.includes("isStale"),
  );

  resetTenderPipelinePersistCoalesceForTests();
  forcePipelinePersistDebounceForTests(null);
  resetDossierHeavyLazyForTests();

  console.log(`\n=== ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
