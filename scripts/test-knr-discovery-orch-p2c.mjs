/**
 * KL-7-P2C — Discovery orchestration OFF-mode harness.
 * ZERO live HTTP · ZERO VERIFIED · ZERO PLN · ZERO 12J.
 *
 * npx vite-node scripts/test-knr-discovery-orch-p2c.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import {
  emptyKnrCatalogStore,
  rebuildKnrAliasIndex,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import { buildKnrNormContentHash } from "../src/lib/intelligent-estimator/knr-knowledge/knr-content-hash.ts";
import { foldIdentityKeyV2 } from "../src/lib/intelligent-estimator/knr-knowledge/knr-identity-v2.ts";
import { emptyKnrDiscoveryEvidenceStore } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import { lookupKnrKnowledgeWithDiscoveryEvidence } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-lookup.ts";
import { KNR_DISCOVERY_HTTP_FEATURE_DEFAULT } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-types.ts";
import { KNR_DISCOVERY_HTTP_ALLOWLIST } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-allowlist.ts";
import {
  buildKnrDiscoveryJobId,
  claimKnrDiscoveryJobLease,
  createMemoryAtomicKnrDiscoveryJobStore,
  isKnrDiscoveryJobLeaseExpired,
  knrDiscoveryJobKvKey,
  KNR_DISCOVERY_JOB_KV_PREFIX,
  releaseKnrDiscoveryJobLease,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-job-lease.ts";
import {
  clearKnrDiscoveryClientSfStateForTests,
  isKnrDiscoveryClientSfInFlight,
  runKnrDiscoveryClientSingleFlight,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-client-sf.ts";
import {
  KNR_DISCOVERY_ORCH_BATCH_MAX,
  KNR_DISCOVERY_ORCH_CONCURRENCY_MAX,
  KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-orch-types.ts";
import {
  buildFakeKnrDiscoveryHttpSuccess,
  orchestrateKnrDiscoveryP2c,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-orch.ts";
import { emptyKnrDiscoveryHttpAccounting } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-08-22T16:00:00.000Z";
const NOW_MS = Date.parse(NOW);

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function buildVerifiedCatalogEntry() {
  const identity = {
    family: "KNR",
    catalog: "4-01",
    publisher: "TEST-PUB",
    edition: "2020",
    table: "0101",
    column: "01",
    item: "01",
  };
  const identityKeyV2 = foldIdentityKeyV2(identity);
  const norms = {
    laborNorms: [
      { kind: "R", code: "R-1", description: "robocizna", unit: "r-g", quantity: 1 },
    ],
    materialNorms: [],
    equipmentNorms: [],
  };
  const contentHash = buildKnrNormContentHash(norms);
  return {
    schemaVersion: 1,
    identityKeyV2,
    evidenceKeyV1: "KNR|4-01|0101-01",
    identity,
    originalSourceCode: "KNR 4-01 0101-01",
    displayCode: "KNR 4-01 0101-01",
    description: "verified",
    unit: "m2",
    norms,
    provenance: {
      sourceType: "LICENSED_PROGRAM_EXPORT",
      sourceIdentifier: "test",
      acquisitionMethod: "LICENSED_EXPORT",
      capturedAt: NOW,
      parserVersion: "test",
      contentHash,
      rawEvidenceRef: { refId: "ev-1", kind: "export_file" },
      revision: 1,
    },
    verificationStatus: "VERIFIED",
    validationState: "PASS",
    lifecycleState: "ACTIVE",
    contentHash,
    verifiedAt: NOW,
    verifiedBy: "owner",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function catalogWith(entry) {
  const entries = { [entry.identityKeyV2]: entry };
  return {
    ...emptyKnrCatalogStore(NOW),
    entries,
    aliasIndex: rebuildKnrAliasIndex(entries),
    updatedAt: NOW,
  };
}

clearKnrDiscoveryClientSfStateForTests();

// --- constants ---
ok("batch max 5", KNR_DISCOVERY_ORCH_BATCH_MAX === 5);
ok("concurrency max 3", KNR_DISCOVERY_ORCH_CONCURRENCY_MAX === 3);
ok("lease default 90s", KNR_DISCOVERY_JOB_LEASE_MS_DEFAULT === 90_000);
ok("feature pilot ON", KNR_DISCOVERY_HTTP_FEATURE_DEFAULT === true);
ok("allowlist single pilot", KNR_DISCOVERY_HTTP_ALLOWLIST.length === 1);
ok("prefix discovery job", KNR_DISCOVERY_JOB_KV_PREFIX === "kw-knr-discovery-job:");
ok("prefix not MMR", !KNR_DISCOVERY_JOB_KV_PREFIX.includes("price-research"));

// --- lease claim / renew / held / reclaim / release ---
{
  const store = createMemoryAtomicKnrDiscoveryJobStore();
  const req = {
    evidenceKeyV1: "KNR|P2C|0001",
    sourceId: "src-a",
    claimantId: "c1",
    leaseMs: 90_000,
  };
  const a = await claimKnrDiscoveryJobLease(store, req, NOW_MS);
  ok("lease acquire", a.acquired && a.reason === "acquired_new");
  const renew = await claimKnrDiscoveryJobLease(store, req, NOW_MS + 1000);
  ok("same claimant renew", renew.acquired && renew.reason === "acquired_same_claimant");
  const other = await claimKnrDiscoveryJobLease(
    store,
    { ...req, claimantId: "c2" },
    NOW_MS + 2000,
  );
  ok("held_by_other", !other.acquired && other.reason === "held_by_other");
  const key = knrDiscoveryJobKvKey(buildKnrDiscoveryJobId(req.evidenceKeyV1, req.sourceId));
  store.forceSet(key, {
    ...a.job,
    leaseUntil: new Date(NOW_MS - 1000).toISOString(),
  });
  ok("expired helper", isKnrDiscoveryJobLeaseExpired(store.dump().get(key), NOW_MS));
  const reclaim = await claimKnrDiscoveryJobLease(
    store,
    { ...req, claimantId: "c2" },
    NOW_MS,
  );
  ok("expired reclaim", reclaim.acquired && reclaim.reason === "acquired_reclaim_expired");
  const badRelease = await releaseKnrDiscoveryJobLease(store, {
    evidenceKeyV1: req.evidenceKeyV1,
    sourceId: req.sourceId,
    claimantId: "c1",
    nowMs: NOW_MS,
  });
  ok("release not owner", !badRelease.released && badRelease.error === "not_owner");
  const goodRelease = await releaseKnrDiscoveryJobLease(store, {
    evidenceKeyV1: req.evidenceKeyV1,
    sourceId: req.sourceId,
    claimantId: "c2",
    nowMs: NOW_MS,
  });
  ok("release owner", goodRelease.released === true);
}

// --- client SF ---
{
  clearKnrDiscoveryClientSfStateForTests();
  let runs = 0;
  const p1 = runKnrDiscoveryClientSingleFlight("ek", "s1", async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 30));
    return "a";
  });
  ok("sf in flight", isKnrDiscoveryClientSfInFlight("ek", "s1"));
  const p2 = runKnrDiscoveryClientSingleFlight("ek", "s1", async () => {
    runs += 1;
    return "b";
  });
  const [a, b] = await Promise.all([p1, p2]);
  ok("sf dedupe", a === "a" && b === "a" && runs === 1);
}

// --- empty / one / five / >5 / dupes ---
{
  const store = createMemoryAtomicKnrDiscoveryJobStore();
  const empty = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|E0",
    family: "KNR",
    sourceIds: [],
    claimantId: "orch",
    leaseStore: store,
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
  });
  ok("empty input", empty.sourceResults.length === 0 && empty.httpRequestCount === 0);

  const one = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|E1",
    family: "KNR",
    sourceIds: ["s1"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW, "INDUSTRY"),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("one source ingested", one.sourceResults[0]?.orchStatus === "ORCH_INGESTED");
  ok("one source no READY", one.discoveryStatus === "DISCOVERED");
  ok("one source http 0", one.httpRequestCount === 0);

  const fiveIds = ["a", "b", "c", "d", "e"];
  const five = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|E5",
    family: "KNR",
    sourceIds: fiveIds,
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("five planned", five.plannedSourceIds.length === 5 && five.truncatedSourceIds.length === 0);
  ok(
    "five corroboration",
    five.discoveryStatus === "CORROBORATED" || five.discoveryStatus === "READY_FOR_OWNER_VERIFY",
  );

  const six = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|E6",
    family: "KNR",
    sourceIds: ["1", "2", "3", "4", "5", "6"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("truncate >5", six.plannedSourceIds.length === 5 && six.truncatedSourceIds.length === 1);
  ok(
    "truncated skip status",
    six.sourceResults.some((r) => r.orchStatus === "BATCH_TRUNCATED_SKIP"),
  );

  const dup = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|ED",
    family: "KNR",
    sourceIds: ["x", "x", "y"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("dup dropped", dup.duplicateSourceIdsDropped.includes("x") && dup.plannedSourceIds.length === 2);
}

// --- concurrency max 3 ---
{
  let maxInFlight = 0;
  const sixIds = ["c1", "c2", "c3", "c4", "c5", "c6"];
  await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|CONC",
    family: "KNR",
    sourceIds: sixIds,
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: async (id) => {
      await new Promise((r) => setTimeout(r, 40));
      return buildFakeKnrDiscoveryHttpSuccess(id, NOW);
    },
    onPoolTelemetry: (t) => {
      maxInFlight = Math.max(maxInFlight, t.maxInFlight);
    },
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("concurrency <= 3", maxInFlight <= 3 && maxInFlight >= 1);
}

// --- held_by_other blocks orch fetch ---
{
  const leaseStore = createMemoryAtomicKnrDiscoveryJobStore();
  await claimKnrDiscoveryJobLease(
    leaseStore,
    {
      evidenceKeyV1: "KNR|P2C|HELD",
      sourceId: "only",
      claimantId: "other",
      leaseMs: 90_000,
    },
    NOW_MS,
  );
  const r = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|HELD",
    family: "KNR",
    sourceIds: ["only"],
    claimantId: "me",
    leaseStore,
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("orch held_by_other", r.sourceResults[0]?.orchStatus === "HELD_BY_OTHER");
  ok("held no http", r.httpRequestCount === 0);
}

// --- p2b mode FEATURE OFF => deny zero outbound ---
{
  const r = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|OFF",
    family: "KNR",
    sourceIds: ["gov"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "p2b",
    featureEnabled: false,
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("p2b off denied", r.sourceResults[0]?.orchStatus === "DENIED");
  ok("p2b off http 0", r.httpRequestCount === 0);
  ok(
    "p2b off feature/allowlist",
    r.sourceResults[0]?.denyCode === "FEATURE_OFF"
      || r.sourceResults[0]?.denyCode === "ALLOWLIST_EMPTY",
  );
}

// --- mocked deny ---
{
  const r = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|DENY",
    family: "KNR",
    sourceIds: ["bad"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: () => ({
      jobStatus: "DENIED",
      denyCode: "PDF_UNSUPPORTED",
      accounting: emptyKnrDiscoveryHttpAccounting(),
      finalUrl: null,
      contentType: "application/pdf",
      bodyText: null,
      fetchedAtIso: null,
      evidenceWritable: false,
    }),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("fake deny", r.sourceResults[0]?.orchStatus === "DENIED");
}

// --- family conflict HARD (P2A upsert REUSE) ---
{
  const { upsertKnrDiscoveryEvidenceOffline } = await import(
    "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts"
  );
  const base = emptyKnrDiscoveryEvidenceStore(NOW);
  const r1 = upsertKnrDiscoveryEvidenceOffline({
    nowIso: NOW,
    storeOverride: base,
    record: {
      schemaVersion: 1,
      evidenceKeyV1: "KNR|P2C|FAMX",
      family: "KNR",
      displayCode: "KNR|P2C|FAMX",
      discoveryStatus: "DISCOVERED",
      lifecycleState: "ACTIVE",
      sources: [
        {
          sourceId: "a",
          urlHash: "u1",
          contentHash: "c1",
          fetchedAt: NOW,
          priority: "GOVERNMENT",
        },
      ],
      norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
      queryHashes: [],
      freshness: "FRESH",
      contentHash: "c1",
      createdAt: NOW,
      updatedAt: NOW,
      catalogRevisionLink: null,
    },
  });
  const r2 = upsertKnrDiscoveryEvidenceOffline({
    nowIso: NOW,
    storeOverride: r1.store,
    record: {
      ...r1.record,
      family: "KNR-W",
      sources: [
        {
          sourceId: "b",
          urlHash: "u2",
          contentHash: "c2",
          fetchedAt: NOW,
          priority: "UNIVERSITY",
        },
      ],
      discoveryStatus: "DISCOVERED",
    },
  });
  ok("family conflict HARD", r2.record.discoveryStatus === "CONFLICT");
  ok("family stays KNR", r2.record.family === "KNR");
}

// --- CATALOG precedence ---
{
  const entry = buildVerifiedCatalogEntry();
  const catalog = catalogWith(entry);
  const lookup = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: { identityKeyV2: entry.identityKeyV2 },
    catalogStore: catalog,
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("CATALOG_HIT precedence", lookup.outcome === "CATALOG_HIT");
  ok("catalog hit http 0", lookup.httpRequestCount === 0);
}

// --- authority wall flags ---
{
  const r = await orchestrateKnrDiscoveryP2c({
    evidenceKeyV1: "KNR|P2C|AUTH",
    family: "KNR",
    sourceIds: ["s"],
    claimantId: "orch",
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    nowIso: NOW,
    nowMs: NOW_MS,
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok(
    "authority writes false",
    r.authorityWrites.catalog === false
      && r.authorityWrites.ath === false
      && r.authorityWrites.verified === false
      && r.authorityWrites.priced === false,
  );
}

// --- isolation / no 12J imports ---
{
  const orch = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-discovery-orch.ts");
  const lease = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-discovery-job-lease.ts");
  ok("orch no work-catalog", !orch.includes("work-catalog") && !orch.includes("ourRate"));
  ok("lease no price prefix", !lease.includes("kw-price-research-job"));
  ok("orch no write-router", !orch.includes("write-router") && !orch.includes("verify-orchestrator"));
  const edge = readSrc("supabase/functions/make-server-0afb8820/index.tsx");
  ok("edge claim route", edge.includes("knr-discovery-job-claim"));
  ok("edge release route", edge.includes("knr-discovery-job-release"));
  const edgeLease = readSrc("supabase/functions/make-server-0afb8820/knr-discovery-job-lease.ts");
  ok("edge lease prefix", edgeLease.includes('kw-knr-discovery-job:'));
}

console.log(`\nOK ${passed} assertions — KL-7-P2C OFF-mode`);
