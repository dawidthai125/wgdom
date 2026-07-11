/**
 * NG11-A2 — dossier artifact cache (session LRU, cost/full phases).
 * npx vite-node scripts/test-ng11-artifact-cache.mjs
 */

import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import {
  DOSSIER_ARTIFACT_CACHE_MAX,
  buildArtifactCacheKey,
  clearDossierArtifactCacheForTests,
  consumeDossierArtifactHitTelemetry,
  dossierArtifactCacheSizeForTests,
  forcePipelineArtifactCacheForTests,
  getDossierArtifactCached,
  getDossierArtifactHitPhaseForItem,
  isPipelineArtifactCacheEnabled,
  normalizeHeavyParseFingerprint,
  resetDossierArtifactHitTelemetryForTests,
  setDossierArtifactCached,
  shouldForceArtifactCacheMiss,
} from "../src/lib/tender-pipeline/tender-dossier-artifact-cache.ts";

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

function p50(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mockItem(overrides = {}) {
  return {
    id: "a2-item-1",
    tenderId: "t-a2-1",
    title: "NG11-A2 Test",
    ourEstimatePln: null,
    uploadedFile: null,
    bzpDocuments: [{ index: 0, filename: "kosztorys.pdf", downloadUrl: "https://x/1" }],
    externalDocDiscovery: null,
    tenderDossier: null,
    ...overrides,
  };
}

function mockDossier(partial = true) {
  return {
    brief: { title: "NG11-A2 Test" },
    kosztorys: { ok: true, rows: [], sourceFilename: "k.pdf" },
    scanSummary: partial ? { parsed: 1 } : { parsed: 1, parsedAt: new Date().toISOString() },
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: new Date().toISOString(),
  };
}

function mockParseSession() {
  return {
    tenderId: "t-a2-1",
    docs: [],
    opts: {},
    allCandidates: [],
    candidates: [],
    costCandidates: [],
    costDiscovery: null,
    sevenZUnpackOk: true,
    sevenZInnerCount: 0,
    zipUnpackOk: true,
    zipInnerCount: 0,
    swzMerged: null,
    bestKosztorys: { ok: true, rows: [], sourceFilename: "k.pdf" },
    estimatePln: null,
    parsedCount: 1,
    warnings: [],
    costPhaseComplete: true,
    metadataPhaseComplete: false,
  };
}

async function run() {
  console.log("=== NG11-A2 Dossier Artifact Cache ===\n");

  clearDossierArtifactCacheForTests();
  forcePipelineArtifactCacheForTests(null);
  ok("A2-1 flag OFF by default (no test override)", !isPipelineArtifactCacheEnabled());

  forcePipelineArtifactCacheForTests(true);
  ok("A2-2 test override ON", isPipelineArtifactCacheEnabled());

  ok("A2-3 frozen cache max = 12", DOSSIER_ARTIFACT_CACHE_MAX === 12);

  const item = mockItem();
  const fp1 = normalizeHeavyParseFingerprint(item);
  const fp2 = normalizeHeavyParseFingerprint({
    ...item,
    tenderDossier: { ...mockDossier(), parserVersion: 1 },
  });
  ok("A2-4 fingerprint normalizes parserVersion to CURRENT", fp1 === fp2);

  const keyCost = buildArtifactCacheKey(item, "cost");
  const keyFull = buildArtifactCacheKey(item, "full");
  ok("A2-5 cost/full keys differ by phase", keyCost !== keyFull && keyCost.endsWith(":cost"));

  ok("A2-6 miss when empty store", getDossierArtifactCached(item, "cost") === null);

  const costSnap = {
    phase: "cost",
    tenderDossier: mockDossier(true),
    swzAnalysis: null,
    ourEstimatePln: null,
    parseSession: mockParseSession(),
  };
  setDossierArtifactCached(item, costSnap);
  ok("A2-7 store + hit cost phase", getDossierArtifactCached(item, "cost")?.phase === "cost");
  ok("A2-8 full phase still miss after cost store", getDossierArtifactCached(item, "full") === null);

  resetDossierArtifactHitTelemetryForTests();
  getDossierArtifactCached(item, "cost");
  ok("A2-9 telemetry records cost hit", getDossierArtifactHitPhaseForItem(item.id) === "cost");

  const consumed = consumeDossierArtifactHitTelemetry();
  ok("A2-10 consume telemetry read-once", consumed.phase === "cost" && consumed.itemId === item.id);
  ok("A2-11 telemetry cleared after consume", getDossierArtifactHitPhaseForItem(item.id) === null);

  const staleDossier = { ...mockDossier(), parserVersion: 1 };
  ok("A2-12 stale dossier forces miss", shouldForceArtifactCacheMiss(staleDossier));
  ok("A2-13 stale guard blocks cache read", getDossierArtifactCached(item, "cost", staleDossier) === null);

  clearDossierArtifactCacheForTests();
  for (let i = 0; i < DOSSIER_ARTIFACT_CACHE_MAX + 3; i += 1) {
    const it = mockItem({ id: `a2-lru-${i}`, tenderId: `t-lru-${i}` });
    setDossierArtifactCached(it, {
      phase: "full",
      tenderDossier: mockDossier(false),
      swzAnalysis: null,
      ourEstimatePln: null,
    });
    if (i < DOSSIER_ARTIFACT_CACHE_MAX) await sleep(1);
  }
  ok("A2-14 LRU cap enforced", dossierArtifactCacheSizeForTests() === DOSSIER_ARTIFACT_CACHE_MAX);
  ok("A2-15 oldest evicted (first tender miss)", getDossierArtifactCached(mockItem({ id: "a2-lru-0", tenderId: "t-lru-0" }), "full") === null);
  ok("A2-16 newest retained", getDossierArtifactCached(mockItem({ id: "a2-lru-14", tenderId: "t-lru-14" }), "full")?.phase === "full");

  clearDossierArtifactCacheForTests();
  forcePipelineArtifactCacheForTests(false);
  setDossierArtifactCached(item, costSnap);
  ok("A2-17 flag OFF skips store", dossierArtifactCacheSizeForTests() === 0);

  forcePipelineArtifactCacheForTests(true);
  setDossierArtifactCached(item, costSnap);
  forcePipelineArtifactCacheForTests(false);
  ok("A2-18 flag OFF skips read", getDossierArtifactCached(item, "cost") === null);

  clearDossierArtifactCacheForTests();
  forcePipelineArtifactCacheForTests(true);

  const parseDelayMs = 40;
  let parseCalls = 0;
  const simulateMiss = async () => {
    parseCalls += 1;
    await sleep(parseDelayMs);
    return { ok: true };
  };

  const simulateHitPath = async () => {
    const hit = getDossierArtifactCached(item, "full");
    if (hit?.phase === "full") return { hit: true };
    await simulateMiss();
    setDossierArtifactCached(item, {
      phase: "full",
      tenderDossier: mockDossier(false),
      swzAnalysis: null,
      ourEstimatePln: null,
    });
    return { hit: false };
  };

  const missSamples = [];
  const hitSamples = [];
  const benchRuns = 5;
  for (let i = 0; i < benchRuns; i += 1) {
    clearDossierArtifactCacheForTests();
    parseCalls = 0;
    const missStart = Date.now();
    await simulateHitPath();
    missSamples.push(Date.now() - missStart);

    parseCalls = 0;
    const hitStart = Date.now();
    await simulateHitPath();
    hitSamples.push(Date.now() - hitStart);
  }

  const missP50 = p50(missSamples);
  const hitP50 = p50(hitSamples);
  const reductionPct = ((missP50 - hitP50) / missP50) * 100;
  console.log(
    `  PG-A2 harness: miss P50=${missP50}ms hit P50=${hitP50}ms reduction=${reductionPct.toFixed(1)}%`,
  );
  ok("A2-19 PG-A2 retry hit faster than miss (≥50%)", reductionPct >= 50);
  ok("A2-20 hit path skips parse work", hitP50 < parseDelayMs);

  const hitEntry = getDossierArtifactCached(item, "full");
  const mutated = hitEntry?.tenderDossier;
  if (mutated && "kosztorys" in mutated && mutated.kosztorys) {
    mutated.kosztorys.ok = false;
  }
  const hitAgain = getDossierArtifactCached(item, "full");
  ok("A2-21 immutable snapshot on read (clone)", hitAgain?.tenderDossier?.kosztorys?.ok === true);

  forcePipelineArtifactCacheForTests(null);
  clearDossierArtifactCacheForTests();

  console.log(`\n=== NG11-A2: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
