/**
 * HISTORICAL ATH → KnrKl3bAthFile[] → KL-3 wire — Owner GO tests A–R.
 * npx vite-node scripts/test-historical-ath-kl3-wire.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  buildSyntheticAthFixture,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  emptyKnrRawEvidenceStore,
  resolveHostKnrKnowledgeLookupOnly,
  resolveKnrHostMissDisplayCode,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import {
  HISTORICAL_ATH_KL3_MAPPER_WIRED,
  buildKnrKl3bAthFilesFromHistoricalIndex,
  collectKl3TargetDisplayCodes,
  historicalIndexKl3Signature,
} from "../src/lib/intelligent-estimator/historical-executed/historical-ath-kl3-files.ts";
import {
  buildHistoricalExecutedIndexFromAthSources,
  buildHistoricalExecutedIndexFromOccurrences,
  makeHistoricalOccurrence,
} from "../src/lib/intelligent-estimator/historical-executed/historical-executed-index.ts";
import {
  getHistoricalExecutedAthBytesCached,
  resetHistoricalExecutedHostHydrateCachesForTests,
  seedHistoricalExecutedAthBytesCacheForTests,
} from "../src/lib/intelligent-estimator/historical-executed/historical-executed-host-hydrate.ts";
import { executeKl3KnowledgeLookup } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts";
import {
  evaluateLaborOnlyAutoBomV1Contract,
  buildWorkIdDiscoveryQueryHash,
} from "../src/lib/intelligent-estimator/orchestra/labor-only-auto-bom-v1-contract.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else console.log("PASS:", msg);
}

const NOW = Date.parse("2026-09-16T03:10:00.000Z");
const TS = new Date(NOW).toISOString();
const CODE = "KNR 4-01 0909-04";
const CODE2 = "KNR 4-01 0909-05";
const WORK_ID = "cw.knr.knr-4-01.0909-04.szt";
const EVIDENCE_KEY = "KNR|4-01|0909-04";
const basis = buildCatalogBasisFromRawCode(CODE);
const basis2 = buildCatalogBasisFromRawCode(CODE2);
const superActor = { actorId: "dawid", role: "super_admin", displayName: "Dawid" };

function athBytes(displayCode = CODE, opts = {}) {
  return buildSyntheticAthFixture({
    displayCode,
    includePln: false,
    withR: opts.withR !== false,
    withM: opts.withM === true,
    withS: false,
  });
}

function histSource(bytes, { jobId = "job-1", filename = "kosztorys-1.ath", sha = "sha-1" } = {}) {
  return {
    bytes,
    jobId,
    address: `addr ${jobId}`,
    filename,
    storagePath: `jobs/${jobId}/${filename}`,
    contentSha256: sha,
    jobStatus: "completed",
  };
}

function seed(src) {
  seedHistoricalExecutedAthBytesCacheForTests({
    storagePath: src.storagePath,
    contentSha256: src.contentSha256,
    bytes: src.bytes,
  });
}

ok(HISTORICAL_ATH_KL3_MAPPER_WIRED === true, "marker HISTORICAL_ATH_KL3_MAPPER_WIRED");
ok(resolveKnrHostMissDisplayCode(basis) === CODE, `host miss display code = ${CODE}`);

// ——— A–D. historicalIndex + 1 valid ATH → KnrKl3bAthFile[] (bytes / target / filename preserved) ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const bytes = athBytes(CODE, { withM: false });
  const src = histSource(bytes);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  ok(index.byDisplayCode.has(CODE), "A index has target displayCode");
  seed(src);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: collectKl3TargetDisplayCodes([{ catalogBasis: basis }]),
  });
  ok(out.athFiles.length === 1, "A 1 KnrKl3bAthFile emitted");
  ok(out.outcomes[0]?.status === "EMITTED", "A outcome EMITTED");
  ok(out.athFiles[0]?.bytes === bytes, "B bytes preserved (same buffer from cache)");
  ok(out.athFiles[0]?.targetDisplayCode === CODE, "C targetDisplayCode preserved");
  ok(out.athFiles[0]?.sourceFilename === "kosztorys-1.ath", "D sourceFilename preserved");
  ok(out.athFiles[0]?.sourceUrl == null, "D no sourceUrl (no SSRF surface)");
  ok(
    getHistoricalExecutedAthBytesCached({ storagePath: src.storagePath }) === bytes,
    "D cache accessor returns hydrated bytes",
  );
}

// ——— E. 2 candidates (different content) for target → MULTI_CANDIDATE, no pick ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const s1 = histSource(athBytes(CODE, { withM: false }), { jobId: "j1", filename: "kosztorys-a.ath", sha: "sha-a" });
  const s2 = histSource(athBytes(CODE, { withM: true }), { jobId: "j2", filename: "kosztorys-b.ath", sha: "sha-b" });
  const index = buildHistoricalExecutedIndexFromAthSources([s1, s2]);
  seed(s1);
  seed(s2);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: [CODE],
  });
  ok(out.athFiles.length === 0, "E no ATH file emitted for multi-candidate target");
  ok(
    out.outcomes[0]?.status === "MULTI_CANDIDATE" || out.outcomes[0]?.status === "CONFLICT_TARGET",
    `E fail-closed status (${out.outcomes[0]?.status})`,
  );
  ok((out.outcomes[0]?.candidateCount ?? 0) >= 2, "E candidateCount ≥ 2");
}

// ——— E2. identical bytes in two jobs (same contentSha256) = one source → emitted ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const bytes = athBytes(CODE, { withM: false });
  const s1 = histSource(bytes, { jobId: "j1", filename: "kosztorys-x.ath", sha: "sha-same" });
  const s2 = histSource(bytes, { jobId: "j2", filename: "kosztorys-x.ath", sha: "sha-same" });
  const index = buildHistoricalExecutedIndexFromAthSources([s1, s2]);
  seed(s1);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE] });
  ok(out.athFiles.length === 1 && out.outcomes[0]?.candidateCount === 1, "E2 identical content = 1 candidate");
}

// ——— F. conflict target (conflictsByDisplayCode) → fail-closed ———
{
  const occA = makeHistoricalOccurrence({ displayCode: CODE, jobId: "j1", identityKeyV2: "id-A", chapter: "r1" });
  const occB = makeHistoricalOccurrence({ displayCode: CODE, jobId: "j1", identityKeyV2: "id-B", chapter: "r2" });
  const index = buildHistoricalExecutedIndexFromOccurrences([occA, occB]);
  ok(index.conflictsByDisplayCode.has(CODE), "F index reports conflict for target");
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: [CODE],
    getBytes: () => athBytes(CODE),
  });
  ok(out.athFiles.length === 0, "F conflict target → no ATH file");
  ok(out.outcomes[0]?.status === "CONFLICT_TARGET", "F status CONFLICT_TARGET");
}

// ——— G. missing bytes → no ATH file ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE));
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE] });
  ok(out.athFiles.length === 0 && out.outcomes[0]?.status === "NO_BYTES", "G cache miss → NO_BYTES, no file");
  const out2 = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: [CODE],
    getBytes: () => new Uint8Array(0),
  });
  ok(out2.athFiles.length === 0 && out2.outcomes[0]?.status === "NO_BYTES", "G empty bytes → NO_BYTES");
}

// ——— H. missing historicalIndex → no ATH file ———
{
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: null, targetDisplayCodes: [CODE] });
  ok(out.athFiles.length === 0 && out.outcomes[0]?.status === "NO_INDEX", "H null index → NO_INDEX");
  const out2 = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: undefined, targetDisplayCodes: [CODE, "", null] });
  ok(out2.athFiles.length === 0, "H undefined index → []");
  ok(historicalIndexKl3Signature(null) === "h0", "H signature null = h0");
}

// ——— I. invalid file (non-.ath source) → no ATH file ———
{
  const occ = makeHistoricalOccurrence({
    displayCode: CODE,
    jobId: "j1",
    source: { jobId: "j1", address: "a", filename: "kosztorys.pdf", storagePath: "jobs/j1/kosztorys.pdf", contentSha256: "sha-pdf", jobStatus: "completed" },
  });
  const index = buildHistoricalExecutedIndexFromOccurrences([occ]);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: [CODE],
    getBytes: () => athBytes(CODE),
  });
  ok(out.athFiles.length === 0 && out.outcomes[0]?.status === "INVALID_FILE", "I non-.ath → INVALID_FILE");
}

// ——— I2. target not in history → NO_HISTORY ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE));
  seed(src);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const out = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE2] });
  ok(out.athFiles.length === 0 && out.outcomes[0]?.status === "NO_HISTORY", "I2 unknown target → NO_HISTORY");
}

// ——— J + K. KL-3 receives athFiles from mapper → existing RMS adapter invoked ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE, { withM: false }));
  seed(src);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const knr = {
    tenderId: "t-hist-j",
    status: "ready",
    lines: [{ lineId: "L1", dwellingId: "d1", catalogBasis: basis, lookupStatus: null }],
    reasons: [],
  };
  const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: collectKl3TargetDisplayCodes(knr.lines),
  });
  let captured = null;
  const persistCalls = [];
  // Guard: KL-3 persist CONNECT must never reach real Supabase from this test.
  const fetchCalls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    fetchCalls.push(String(args[0]));
    throw new Error("test-historical-ath-kl3-wire: network I/O forbidden in test J");
  };
  let result = null;
  try {
    result = await executeKl3KnowledgeLookup({
      tenderId: "t-hist-j",
      knr,
      athFiles,
      isCancelled: () => false,
      setKnrKnowledge: () => {},
      setKnowledgeBusy: () => {},
      onHostComplete: (r) => {
        captured = r;
      },
      // Test seam — no network / no localStorage writes (2.66.230 persist CONNECT).
      discoveryPersistIo: {
        loadLocal: () => emptyKnrDiscoveryEvidenceStore(TS),
        save: async (store) => {
          persistCalls.push(store);
        },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
  } finally {
    globalThis.fetch = origFetch;
  }
  ok(result?.athRmsWire?.adaptedCount === 1, "J KL-3 received athFiles (adaptedCount=1)");
  ok(result?.athRmsWire?.outcomes?.[0]?.status === "ADAPTED", "K existing RMS adapter invoked (ADAPTED)");
  ok(captured?.athRmsWire?.adaptedCount === 1, "J onHostComplete sees wire");
  ok(persistCalls.length === 1 && Boolean(persistCalls[0]?.entries[EVIDENCE_KEY]), "J persist CONNECT routed to discoveryPersistIo mock (ATH evidence)");
  ok(fetchCalls.length === 0, `J zero network I/O during KL-3 (fetch calls: ${fetchCalls.length})`);

  const orchSrc = readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"), "utf8");
  ok(/buildKnrKl3bAthFilesFromHistoricalIndex\(/.test(orchSrc), "J call site uses mapper");
  ok(/executeKl3KnowledgeLookup\(\{[\s\S]*?athFiles,[\s\S]*?isCancelled/.test(orchSrc), "J call site passes athFiles");
  ok(/historicalIndexKl3Signature\(historicalIndex\)/.test(orchSrc), "J KL-3 key includes historical signature");
  ok((orchSrc.match(/executeKl3KnowledgeLookup\(/g) || []).length === 1, "J single KL-3 call site (no parallel path)");
}

// ——— L. V1-HARD remains PASS with mapper-produced ATH (host seam with workId/unit) ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE, { withM: false }));
  seed(src);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE] });
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hist-l",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    evidenceStore: emptyKnrRawEvidenceStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles,
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(out.athRmsWire.adaptedCount === 1, "L adapted from historical ATH");
  const v1 = evaluateLaborOnlyAutoBomV1Contract({
    workId: WORK_ID,
    unit: "szt",
    discoveryStore: out.athRmsWire.discoveryStore,
    nowMs: NOW,
  });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", `L V1-HARD ACCEPT (${v1.reasons})`);
  // M. NO_MATERIAL_NORM under existing policy (R>0 · M=0 · trusted) — evidence-derived only.
  ok(out.athRmsWire.outcomes[0]?.noMaterialNormEmitted === true, "M NO_MATERIAL_NORM emitted (M=0 evidence-derived)");
  const rec = out.athRmsWire.discoveryStore?.entries[EVIDENCE_KEY];
  ok((rec?.sources || []).some((s) => /NO_MATERIAL_NORM\|evidence-derived/.test(s.fragment || "")), "M variant B fragment");
}

// ——— M2. ATH with material norms → NO_MATERIAL_NORM NOT emitted ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE, { withM: true }));
  seed(src);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE] });
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hist-m2",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles,
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(out.athRmsWire.outcomes[0]?.noMaterialNormEmitted !== true, "M2 materials present → no NO_MATERIAL_NORM");
}

// ——— N + O. static: no labor PLN, no tender-package .ath, no new loader/storage ———
{
  const mapperSrc = readFileSync(join(root, "src/lib/intelligent-estimator/historical-executed/historical-ath-kl3-files.ts"), "utf8");
  const hydrateSrc = readFileSync(join(root, "src/lib/intelligent-estimator/historical-executed/historical-executed-host-hydrate.ts"), "utf8");
  const hostSrc = readFileSync(join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts"), "utf8");
  ok(!/runIkLaborGapResearch|runSelectiveWorkRateResearch|ourRate|OUR_RATE/.test(mapperSrc), "N mapper no labor PLN / OUR RATE");
  ok(!/runIkLaborGapResearch|runSelectiveWorkRateResearch/.test(hostSrc), "N host no labor PLN research");
  ok(!/tender-ingest|multi-dwelling|getTenderPackage|retainOwnerFile|TenderPackage/.test(mapperSrc), "O mapper never touches tender-package .ath");
  ok(!/KnrVerifyAdminView|knr-corpus-ingest/.test(mapperSrc), "O mapper not wired to KnrVerifyAdminView / corpus ingest");
  ok(!/\bfetch\(|localStorage|kosztorys-preview/.test(mapperSrc), "O mapper has no fetch / storage (cache-only, no new loader)");
  ok(/fetchKosztorysBytes/.test(hydrateSrc) && !/fetchKosztorysBytes/.test(mapperSrc), "O bytes loader stays in existing hydrate only");
}

// ——— Q. cross-tender reuse remains PASS ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const src = histSource(athBytes(CODE, { withM: false }));
  seed(src);
  const index = buildHistoricalExecutedIndexFromAthSources([src]);
  const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({ historicalIndex: index, targetDisplayCodes: [CODE] });
  const first = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hist-q1",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles,
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const store = first.athRmsWire.discoveryStore;
  ok((store?.byQueryHash[buildWorkIdDiscoveryQueryHash(WORK_ID)] || []).includes(EVIDENCE_KEY), "Q tender A indexed");
  const second = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hist-q2",
    lines: [{ lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" }],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: store,
    actor: superActor,
    athFiles: [],
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  ok(second.athRmsWire.adaptedCount === 0, "Q tender B no re-adapt");
  const v1 = evaluateLaborOnlyAutoBomV1Contract({ workId: WORK_ID, unit: "szt", discoveryStore: store, nowMs: NOW });
  ok(v1.decision === "LABOR_ONLY_AUTO_BOM_ACCEPT", "Q tender B V1 REUSE without research");
}

// ——— R. host per-line selection: 2 targets → 2 files → no KL3B MULTI_CANDIDATE conflict ———
{
  resetHistoricalExecutedHostHydrateCachesForTests();
  const s1 = histSource(athBytes(CODE, { withM: false }), { jobId: "j1", filename: "kosztorys-1.ath", sha: "sha-1" });
  const s2 = histSource(athBytes(CODE2, { withM: false }), { jobId: "j2", filename: "kosztorys-2.ath", sha: "sha-2" });
  seed(s1);
  seed(s2);
  const index = buildHistoricalExecutedIndexFromAthSources([s1, s2]);
  const { athFiles } = buildKnrKl3bAthFilesFromHistoricalIndex({
    historicalIndex: index,
    targetDisplayCodes: collectKl3TargetDisplayCodes([{ catalogBasis: basis }, { catalogBasis: basis2 }]),
  });
  ok(athFiles.length === 2, "R mapper emits 1 file per target (2 targets)");
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hist-r",
    lines: [
      { lineId: "L1", catalogBasis: basis, workId: WORK_ID, positionUnit: "szt" },
      { lineId: "L2", catalogBasis: basis2, positionUnit: "szt" },
    ],
    catalogStore: emptyKnrCatalogStore(TS),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(TS),
    actor: superActor,
    athFiles,
    discoveryFeatureEnabled: false,
    nowIso: TS,
  });
  const statuses = out.envelope.lineResults.map((r) => `${r.lineId}:${r.lookupStatus}:${r.gapReason ?? ""}`);
  ok(!out.envelope.lineResults.some((r) => r.gapReason === "MULTI_CANDIDATE"), `R KL3B no MULTI_CANDIDATE (${statuses})`);
  ok(out.athRmsWire.adaptedCount === 2, "R both lines ADAPTED via per-target selection");
}

if (failed > 0) {
  console.error(`\nFAILED ${failed}`);
  process.exit(1);
}
console.log("\nALL PASS — historical ATH → KL-3 wire A–R");
