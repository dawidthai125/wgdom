/**
 * IK-KNR Phase 2 — On-demand Discovery learning loop harness (T1–T20).
 * ZERO live production hosts · fixture allowlist + fake HTTP only.
 *
 * npx vite-node scripts/test-knr-discovery-on-demand-p2.mjs
 */
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
  KNR_DISCOVERY_L3_DOCUMENT_TEST_FIXTURE,
  KNR_DISCOVERY_ORCH_BATCH_MAX,
  KNR_DISCOVERY_SOURCE_CANDIDATES_AUDIT,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY,
  buildFakeKnrDiscoveryHttpSuccess,
  buildFakeL3BoqDocumentHtml,
  clearKnrDiscoveryClientSfStateForTests,
  clearKnrDiscoveryOnDemandBudgetForTests,
  createMemoryAtomicKnrDiscoveryJobStore,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  extractKnrDiscoveryFactCandidate,
  foldIdentityKeyV2,
  isKnrDiscoveryAllowlistEmpty,
  parseIdentityPartialFromCatalogBasis,
  planKnrDiscoveryHttp,
  resolveHostKnrKnowledgeLookupOnly,
  resolveKnrDiscoveryL3Document,
  runKnrDiscoveryOnDemand,
  selectKnrDiscoverySourceIds,
  stageDiscoveryFactToPendingCatalog,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { buildKnrWcIdentityProposals } from "../src/lib/intelligent-estimator/knr-wc-identity-bridge.ts";
import { OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";

const NOW = "2026-08-25T16:00:00.000Z";
const NOW_MS = Date.parse(NOW);

if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

const FIXTURE = KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE;
const SOURCE_ID = FIXTURE[0].sourceId;

function basisFor(code) {
  return buildCatalogBasisFromRawCode(code);
}

function missFromCode(code) {
  const basis = basisFor(code);
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identityKeyV2 = foldIdentityKeyV2(partial);
  const evidenceKeyV1 = String(basis.normalizedKey ?? "").trim();
  return {
    evidenceKeyV1,
    identityKeyV2,
    family: String(partial.family ?? "KNR"),
    displayCode: String(basis.rawCode ?? evidenceKeyV1),
    normalizedKey: evidenceKeyV1,
    identity: {
      family: partial.family,
      catalog: partial.catalog,
      table: partial.table,
      column: partial.column,
      item: partial.item,
    },
  };
}

function fakeFull(sourceId, knrLabel) {
  const base = buildFakeKnrDiscoveryHttpSuccess(sourceId, NOW);
  return {
    ...base,
    bodyText: `<html><body>opis: Remont wykwitów ${knrLabel} unit m2 KNR ${knrLabel} enough text for min length gate xxxxxxxxxx</body></html>`,
    accounting: { httpRequestCount: 1, attemptedFetch: true },
  };
}

function fakePartial(sourceId) {
  const base = buildFakeKnrDiscoveryHttpSuccess(sourceId, NOW);
  return {
    ...base,
    bodyText: `<html><body>KNR fixture only no unit field enough text for min length gate xxxxxxxxxx</body></html>`,
    accounting: { httpRequestCount: 1, attemptedFetch: true },
  };
}

clearKnrDiscoveryClientSfStateForTests();
clearKnrDiscoveryOnDemandBudgetForTests();

// --- Production controlled pilot ---
ok(
  "PROD allowlist pilot sources (2D + 2E)",
  !isKnrDiscoveryAllowlistEmpty()
    && KNR_DISCOVERY_HTTP_ALLOWLIST.length === 2
    && KNR_DISCOVERY_HTTP_ALLOWLIST.some((e) => e.sourceId === "l3_bip_malopolska_1646919")
    && KNR_DISCOVERY_HTTP_ALLOWLIST.some((e) => e.sourceId === "l3_rckik_wroclaw_1202_07"),
);
ok("PROD feature pilot ON", KNR_DISCOVERY_HTTP_FEATURE_DEFAULT === true);
ok(
  "PROD source selection keys (2D + 2E)",
  Object.keys(KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY).length === 2
    && KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY["KNR-W|4-01|0701-05"]?.[0] === "l3_bip_malopolska_1646919"
    && KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY["KNR-W|4-01|1202-07"]?.[0] === "l3_rckik_wroclaw_1202_07",
);
ok(
  "CANDIDATES audit only — no URLs",
  KNR_DISCOVERY_SOURCE_CANDIDATES_AUDIT.every((c) => c.url === null && c.sourceId === null),
);

// T7 feature OFF
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  const miss = missFromCode("KNR 4-01 0101-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: false,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "4-01"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  });
  ok("T7 FEATURE_OFF HTTP=0", r.httpRequestCount === 0 && r.perKey[0]?.reason === "FEATURE_OFF");
}

// T6 allowlist empty
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  const miss = missFromCode("KNR 4-01 0102-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: [],
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "4-01"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  });
  ok("T6 ALLOWLIST_EMPTY HTTP=0", r.httpRequestCount === 0 && r.perKey[0]?.reason === "ALLOWLIST_EMPTY");
}

// T8 unknown source / empty selection
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  const miss = missFromCode("KNR 4-01 0103-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    // Explicit empty source selection — no BY_KEY, no registry auto-pick (G-P2-01).
    sourceIdsOverride: [],
    publicRegistryFallback: false,
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "4-01"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  });
  ok(
    "T8 NO_SOURCE_SELECTION HTTP=0",
    r.httpRequestCount === 0 && r.perKey[0]?.reason === "NO_SOURCE_SELECTION",
  );
  const plan = planKnrDiscoveryHttp({
    sourceId: "totally_unknown_source_xyz",
    featureEnabled: true,
    allowlistOverride: FIXTURE,
  });
  ok("T8 unknown sourceId SOURCE_DENIED", plan.denyCode === "UNKNOWN_SOURCE" || plan.jobStatus === "SOURCE_DENIED");
}

// T9 raw URL
{
  const plan = planKnrDiscoveryHttp({
    sourceId: SOURCE_ID,
    rawUrl: "https://evil.example/knr",
    featureEnabled: true,
    allowlistOverride: FIXTURE,
  });
  ok("T9 ARBITRARY_URL_FORBIDDEN", plan.denyCode === "ARBITRARY_URL_FORBIDDEN" && plan.accounting.httpRequestCount === 0);
}

// T10 SSRF
{
  const ssrfList = [
    {
      sourceId: "ssrf_fixture",
      hostname: "127.0.0.1",
      url: "https://127.0.0.1/knr",
      originId: "knr_government_public",
      active: true,
      priority: "GOVERNMENT",
    },
  ];
  const plan = planKnrDiscoveryHttp({
    sourceId: "ssrf_fixture",
    featureEnabled: true,
    allowlistOverride: ssrfList,
  });
  ok("T10 SSRF denied before fetch", plan.denyCode === "SSRF_DENIED" && plan.accounting.httpRequestCount === 0);
}

// T11 legal deny
{
  const badLegal = [
    {
      sourceId: "scrape_bad",
      hostname: "example.com",
      url: "https://example.com/x",
      originId: "scrape_web",
      active: true,
      priority: "OTHER",
    },
  ];
  const plan = planKnrDiscoveryHttp({
    sourceId: "scrape_bad",
    featureEnabled: true,
    allowlistOverride: badLegal,
  });
  ok("T11 LEGAL_DENIED", plan.denyCode === "LEGAL_DENIED" && plan.accounting.httpRequestCount === 0);
}

// T1 HIT → HTTP 0
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const code = "KNR 2-02 0803-01";
  const host = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-hit",
    lines: [{ lineId: "L1", catalogBasis: basisFor(code) }],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
    explicitResearch: false,
    discoveryFeatureEnabled: true,
    discoveryAllowlistOverride: FIXTURE,
    discoverySourceIdsOverride: [SOURCE_ID],
    discoveryHttpMode: "fake",
    discoveryFakeExecForSource: (id) => fakeFull(id, "2-02"),
    discoveryLeaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  });
  // Without verified catalog, this is MISS — use on-demand skip after seed evidence instead
  const miss = missFromCode(code);
  let discoveryStore = emptyKnrDiscoveryEvidenceStore(NOW);
  const first = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "2-02"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore,
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  discoveryStore = first.discoveryStore;
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const second = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "2-02"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore,
    catalogStore: first.catalogStore,
  });
  ok("T1/T5 learn-once second HTTP=0", second.httpRequestCount === 0 && second.perKey[0]?.reason === "SKIP_HIT_OR_EVIDENCE");
  ok("T5 lookupAfter EVIDENCE_HIT or PENDING", second.perKey[0]?.lookupAfter === "EVIDENCE_HIT" || second.perKey[0]?.lookupAfter === "PENDING_IN_CATALOG");
  void host;
}

// T2 single MISS discovery
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0202-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "4-01-0202"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  ok("T2 single MISS orch", r.perKey.length === 1 && r.perKey[0]?.reason === "ORCH_DONE");
  ok("T2 evidence present", Boolean(r.discoveryStore.entries[miss.evidenceKeyV1]));
  ok("T13 not VERIFIED", r.authorityWrites.catalogVerified === false);
  ok("T14/T15/T16 no authority planes", r.authorityWrites.ownerKnrMappings === false && r.authorityWrites.a1 === false && r.authorityWrites.p4 === false && r.authorityWrites.f5 === false);
}

// T3 mixed HIT/MISS — only miss discovers (HIT skipped via prior evidence)
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const hit = missFromCode("KNR 4-01 0301-01");
  const miss = missFromCode("KNR 4-01 0302-01");
  let store = emptyKnrDiscoveryEvidenceStore(NOW);
  const seed = await runKnrDiscoveryOnDemand({
    missing: [hit],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "hit"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore: store,
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  store = seed.discoveryStore;
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const mixed = await runKnrDiscoveryOnDemand({
    missing: [hit, miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "miss"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore: store,
    catalogStore: seed.catalogStore,
    ignoreProcessBudget: true,
  });
  ok("T3 HIT skipped", mixed.perKey.find((p) => p.evidenceKeyV1 === hit.evidenceKeyV1)?.reason === "SKIP_HIT_OR_EVIDENCE");
  ok("T3 MISS orch", mixed.perKey.find((p) => p.evidenceKeyV1 === miss.evidenceKeyV1)?.reason === "ORCH_DONE");
}

// T4 / T19 dedupe 20 identical
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0404-01");
  const many = Array.from({ length: 20 }, () => miss);
  const r = await runKnrDiscoveryOnDemand({
    missing: many,
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "dedupe"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  ok("T4/T19 dedupe to 1", r.dedupedMissCount === 1 && r.skippedDuplicateInputCount === 19);
  ok("T4 single orch row", r.perKey.length === 1);
}

// T12 partial — no fabricated unit/description in FULL stage
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0505-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakePartial(id),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  ok(
    "T12 PARTIAL no staged PENDING",
    r.perKey[0]?.fact?.extractionStatus === "PARTIAL_DISCOVERY" && r.perKey[0]?.stagedPending === false,
  );
  const entry = r.catalogStore.entries[miss.identityKeyV2];
  ok("T12 catalog not auto filled", !entry || entry.verificationStatus !== "VERIFIED");
}

// T17 conflict status extract
{
  const record = {
    schemaVersion: 1,
    evidenceKeyV1: "KNR|4-01|CONF",
    family: "KNR",
    displayCode: "KNR 4-01 CONF",
    discoveryStatus: "CONFLICT",
    lifecycleState: "ACTIVE",
    sources: [
      {
        sourceId: "a",
        urlHash: "1",
        fragment: "opis: Alpha path enough text",
        contentHash: "c1",
        fetchedAt: NOW,
        priority: "GOVERNMENT",
      },
      {
        sourceId: "b",
        urlHash: "2",
        fragment: "opis: Beta path enough text",
        contentHash: "c2",
        fetchedAt: NOW,
        priority: "UNIVERSITY",
      },
    ],
    norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    queryHashes: [],
    freshness: "FRESH",
    contentHash: "x",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const fact = extractKnrDiscoveryFactCandidate(record);
  ok("T17 CONFLICT extraction", fact.extractionStatus === "CONFLICT");
}

// T18 budget — second identical MISS without ignore → BUDGET_EXHAUSTED if no evidence? 
// After first orch evidence exists → SKIP. Test budget when evidence wiped:
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0606-01");
  const lease = createMemoryAtomicKnrDiscoveryJobStore();
  await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "budget"),
    leaseStore: lease,
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  // fresh empty store but budget remembers key
  const again = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "budget2"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  });
  ok("T18 budget prevents duplicate fetch", again.perKey[0]?.reason === "BUDGET_EXHAUSTED" && again.httpRequestCount === 0);
}

// T20 batch > 5 truncated by orch
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0707-01");
  const manySources = Array.from({ length: 7 }, (_, i) => `src_${i}`);
  const allow = manySources.map((sourceId) => ({
    sourceId,
    hostname: "example.com",
    url: `https://example.com/${sourceId}`,
    originId: "knr_government_public",
    active: true,
    priority: "GOVERNMENT",
  }));
  let planned = 0;
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: allow,
    sourceIdsOverride: manySources,
    httpMode: "fake",
    fakeExecForSource: (id) => {
      planned += 1;
      return fakeFull(id, "batch");
    },
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  ok("T20 batch max 5", planned <= KNR_DISCOVERY_ORCH_BATCH_MAX && r.perKey[0]?.reason === "ORCH_DONE");
}

// ProposedWork DISCOVERY_EVIDENCE
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 0808-01");
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: FIXTURE,
    sourceIdsOverride: [SOURCE_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => fakeFull(id, "prop"),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  const proposals = buildKnrWcIdentityProposals({
    tenderId: "t-p2-prop",
    keys: [{ normalizedKey: miss.evidenceKeyV1, displayCode: miss.displayCode }],
    discoveryStore: r.discoveryStore,
    catalogStore: r.catalogStore,
    featureEnabled: true,
  });
  const p = proposals.proposals?.[0] ?? proposals[0];
  ok(
    "I ProposedWork DISCOVERY_EVIDENCE",
    p?.sourceStatus === "DISCOVERY_EVIDENCE" && p?.ownerDecision === "unset",
  );
}

// FULL stage PENDING not VERIFIED
{
  const miss = missFromCode("KNR 4-01 0909-01");
  const fact = {
    knrCode: "KNR 4-01 0909-01",
    normalizedKnrCode: miss.evidenceKeyV1,
    description: "Test opis pełny",
    unit: "m2",
    sourceId: SOURCE_ID,
    sourceUrlHash: "abc",
    evidenceRef: miss.evidenceKeyV1,
    confidence: "medium",
    extractionStatus: "FULL",
  };
  const staged = stageDiscoveryFactToPendingCatalog({
    fact,
    identityKeyV2: miss.identityKeyV2,
    evidenceKeyV1: miss.evidenceKeyV1,
    identity: miss.identity,
    displayCode: miss.displayCode,
    nowIso: NOW,
    catalogStore: emptyKnrCatalogStore(NOW),
  });
  ok("stage PENDING_VERIFY", staged.ok && staged.outcome === "STAGED_PENDING" && staged.entry?.verificationStatus === "PENDING_VERIFY");
  ok("stage never VERIFIED", staged.entry?.verificationStatus !== "VERIFIED");
}

// Host wire feature OFF → HTTP 0 (G-P2-02: FEATURE_OFF ≠ RESEARCH_DISABLED)
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  const host = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-off",
    lines: [{ lineId: "L1", catalogBasis: basisFor("KNR 4-01 1010-01") }],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
    explicitResearch: true,
    discoveryFeatureEnabled: false,
    discoveryAllowlistOverride: FIXTURE,
    discoverySourceIdsOverride: [SOURCE_ID],
    discoveryHttpMode: "fake",
    discoveryFakeExecForSource: (id) => fakeFull(id, "host"),
    discoveryLeaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  });
  ok("Host feature OFF HTTP=0", host.httpRequestCount === 0);
  ok(
    "Host onDemand FEATURE_OFF",
    host.onDemandDiscovery != null
      && host.onDemandDiscovery.httpRequestCount === 0
      && host.onDemandDiscovery.perKey.some((k) => k.reason === "FEATURE_OFF"),
  );
}

// Pilot mapping unchanged
{
  const pilot = OWNER_KNR_MAPPINGS.find((m) => m.normalizedKey === "KNR-W|4-01|1202-07");
  ok("T/P pilot OWNER_KNR_MAPPINGS unchanged", Boolean(pilot));
}

// select empty
{
  const sel = selectKnrDiscoverySourceIds({ evidenceKeyV1: "KNR|NOPE" });
  ok("selection EMPTY", sel.reason === "EMPTY" && sel.sourceIds.length === 0);
}

// --- L3 document discovery (mock Owner-approved BOQ) ---
{
  const L3 = KNR_DISCOVERY_L3_DOCUMENT_TEST_FIXTURE;
  const L3_ID = L3[0].sourceId;
  const resolved = resolveKnrDiscoveryL3Document(L3_ID, L3);
  ok("L3 resolve document from sourceId", resolved.ok === true && resolved.ok && resolved.url.includes("l3-boq"));
  ok(
    "L3 unresolved unknown source",
    resolveKnrDiscoveryL3Document("no_such_l3_doc", L3).reason === "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED",
  );

  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss = missFromCode("KNR 4-01 1202-07");
  const html = buildFakeL3BoqDocumentHtml({
    knrCode: "KNR 4-01 1202-07",
    description: "Skucie tynków zewnętrznych",
    unit: "m2",
  });
  const first = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: L3,
    sourceIdsOverride: [L3_ID],
    httpMode: "fake",
    fakeExecForSource: (id) => ({
      ...buildFakeKnrDiscoveryHttpSuccess(id, NOW),
      bodyText: html,
      finalUrl: L3[0].url,
      accounting: { httpRequestCount: 1, attemptedFetch: true },
      evidenceWritable: true,
    }),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    ignoreProcessBudget: true,
  });
  ok("L3-14 first ORCH_DONE", first.perKey[0]?.reason === "ORCH_DONE");
  ok("L3 evidence DISCOVERED", first.discoveryStore.entries[miss.evidenceKeyV1]?.discoveryStatus === "DISCOVERED");
  ok(
    "L3 FACT code/desc/unit",
    first.perKey[0]?.fact?.extractionStatus === "FULL"
      && Boolean(first.perKey[0]?.fact?.description)
      && first.perKey[0]?.fact?.unit?.toLowerCase().includes("m2"),
  );
  ok("L3 PENDING_VERIFY staged", first.perKey[0]?.stagedPending === true);
  ok(
    "L3 catalog PENDING not VERIFIED",
    first.catalogStore.entries[miss.identityKeyV2]?.verificationStatus === "PENDING_VERIFY",
  );
  ok("L3 first HTTP > 0", first.httpRequestCount >= 1);

  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const second = await runKnrDiscoveryOnDemand({
    missing: [miss],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: L3,
    sourceIdsOverride: [L3_ID],
    httpMode: "fake",
    fakeExecForSource: () => {
      throw new Error("must not fetch on re-lookup");
    },
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: first.catalogStore,
    discoveryStore: first.discoveryStore,
  });
  ok("L3 re-lookup HTTP=0", second.httpRequestCount === 0);
  ok(
    "L3 re-lookup skip learned",
    second.perKey[0]?.reason === "SKIP_HIT_OR_EVIDENCE"
      && (second.perKey[0]?.lookupAfter === "EVIDENCE_HIT"
        || second.perKey[0]?.lookupAfter === "PENDING_IN_CATALOG"),
  );

  // source selected but document not on allowlist
  clearKnrDiscoveryOnDemandBudgetForTests();
  const unresolved = await runKnrDiscoveryOnDemand({
    missing: [missFromCode("KNR 4-01 1211-01")],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    allowlistOverride: L3,
    sourceIdsOverride: ["missing_doc_source"],
    httpMode: "fake",
    fakeExecForSource: (id) => buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    ignoreProcessBudget: true,
  });
  ok(
    "L3 DOCUMENT_NOT_RESOLVED HTTP=0",
    unresolved.perKey[0]?.reason === "DISCOVERY_SOURCE_DOCUMENT_NOT_RESOLVED"
      && unresolved.httpRequestCount === 0,
  );

  // production controlled pilot unchanged
  ok(
    "PROD allowlist still 2D + 2E after L3 tests",
    KNR_DISCOVERY_HTTP_ALLOWLIST.length === 2
      && KNR_DISCOVERY_HTTP_ALLOWLIST.some((e) => e.sourceId === "l3_bip_malopolska_1646919")
      && KNR_DISCOVERY_HTTP_ALLOWLIST.some((e) => e.sourceId === "l3_rckik_wroclaw_1202_07"),
  );
  ok("PROD feature still pilot ON", KNR_DISCOVERY_HTTP_FEATURE_DEFAULT === true);
}

console.log(`\nPhase2 on-demand: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
