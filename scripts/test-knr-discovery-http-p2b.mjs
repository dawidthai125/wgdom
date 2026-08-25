/**
 * KL-7-P2B — Discovery HTTP foundation (DEFAULT OFF · empty allowlist · accounting).
 * ZERO production live HTTP · ZERO VERIFIED · ZERO PLN · ZERO 12J.
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
import {
  emptyKnrDiscoveryEvidenceStore,
  upsertKnrDiscoveryEvidenceOffline,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import { lookupKnrKnowledgeWithDiscoveryEvidence } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-lookup.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  isKnrDiscoveryAllowlistEmpty,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-allowlist.ts";
import { isKnrDiscoverySsrfDeniedHost } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-ssrf.ts";
import { planKnrDiscoveryHttp } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-planner.ts";
import { executeKnrDiscoveryHttpPlan } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-exec.ts";
import { ingestKnrDiscoveryHttpResultToEvidence } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-ingest.ts";
import { evaluateKnrDiscoveryHttpLegalGate } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-legal.ts";
import { resolveHostKnrKnowledgeLookupOnly } from "../src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts";
import { KNR_DISCOVERY_HTTP_FEATURE_DEFAULT } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-http-types.ts";
import { buildP2aCorroboratedFixture } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-fixtures.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-08-22T14:00:00.000Z";

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
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

function mockFetch(handlers) {
  return async (url) => {
    const h = handlers[url] || handlers["*"];
    if (!h) throw new Error(`unexpected_fetch:${url}`);
    return h;
  };
}

// --- invariants ---
ok("prod feature pilot ON", KNR_DISCOVERY_HTTP_FEATURE_DEFAULT === true);
ok("prod allowlist single pilot", isKnrDiscoveryAllowlistEmpty() === false);
ok("prod allowlist length 1", KNR_DISCOVERY_HTTP_ALLOWLIST.length === 1);
ok(
  "prod pilot sourceId",
  KNR_DISCOVERY_HTTP_ALLOWLIST[0]?.sourceId === "l3_bip_malopolska_1646919",
);

// T-B1 CATALOG_HIT → HTTP 0
{
  const entry = buildVerifiedCatalogEntry();
  const catalog = catalogWith(entry);
  const discovery = emptyKnrDiscoveryEvidenceStore(NOW);
  const lookup = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: { identityKeyV2: entry.identityKeyV2 },
    catalogStore: catalog,
    discoveryStore: discovery,
  });
  ok("T-B1 CATALOG_HIT", lookup.outcome === "CATALOG_HIT");
  ok("T-B1 HTTP 0", lookup.httpRequestCount === 0);
  const plan = planKnrDiscoveryHttp({ sourceId: "any", featureEnabled: false });
  ok("T-B1 no fetch after catalog", plan.accounting.httpRequestCount === 0);
}

// T-B2 EVIDENCE_HIT → HTTP 0
{
  const cor = buildP2aCorroboratedFixture();
  let discovery = emptyKnrDiscoveryEvidenceStore(NOW);
  discovery = upsertKnrDiscoveryEvidenceOffline({
    record: cor,
    nowIso: NOW,
    storeOverride: discovery,
  }).store;
  const lookup = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: {
      identityKeyV2: cor.identityKeyV2,
      evidenceKeyV1: cor.evidenceKeyV1,
    },
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: discovery,
  });
  ok("T-B2 EVIDENCE_HIT", lookup.outcome === "EVIDENCE_HIT");
  ok("T-B2 HTTP 0", lookup.httpRequestCount === 0);
}

// T-B3 feature OFF
{
  const plan = planKnrDiscoveryHttp({
    sourceId: "p2b_test_gov_fixture",
    featureEnabled: false,
    allowlistOverride: KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  });
  ok("T-B3 FEATURE_OFF", plan.denyCode === "FEATURE_OFF");
  ok("T-B3 HTTP 0", plan.accounting.httpRequestCount === 0);
  const exec = await executeKnrDiscoveryHttpPlan(plan);
  ok("T-B3 exec no fetch", exec.accounting.attemptedFetch === false);
  ok("T-B3 exec HTTP 0", exec.accounting.httpRequestCount === 0);
}

// T-B4 empty allowlist + feature ON (isolated)
{
  const plan = planKnrDiscoveryHttp({
    sourceId: "x",
    featureEnabled: true,
    allowlistOverride: [],
  });
  ok("T-B4 ALLOWLIST_EMPTY", plan.denyCode === "ALLOWLIST_EMPTY");
  ok("T-B4 HTTP 0", plan.accounting.httpRequestCount === 0);
}

// T-B5 unknown sourceId
{
  const plan = planKnrDiscoveryHttp({
    sourceId: "nope",
    featureEnabled: true,
    allowlistOverride: KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  });
  ok("T-B5 UNKNOWN_SOURCE", plan.denyCode === "UNKNOWN_SOURCE");
  ok("T-B5 HTTP 0", plan.accounting.httpRequestCount === 0);
}

// T-B6 non-allowlisted host via raw URL forbidden
{
  const plan = planKnrDiscoveryHttp({
    sourceId: "p2b_test_gov_fixture",
    rawUrl: "https://evil.example/x",
    featureEnabled: true,
    allowlistOverride: KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE,
  });
  ok("T-B6 ARBITRARY_URL_FORBIDDEN", plan.denyCode === "ARBITRARY_URL_FORBIDDEN");
  ok("T-B6 HTTP 0", plan.accounting.httpRequestCount === 0);
}

// T-B7..T-B10 SSRF
ok("T-B7 private IPv4", isKnrDiscoverySsrfDeniedHost("10.0.0.1") === true);
ok("T-B8 loopback", isKnrDiscoverySsrfDeniedHost("127.0.0.1") === true);
ok("T-B9 link-local", isKnrDiscoverySsrfDeniedHost("169.254.1.1") === true);
ok("T-B10 private IPv6", isKnrDiscoverySsrfDeniedHost("fc00::1") === true);
ok("T-B10b loopback IPv6", isKnrDiscoverySsrfDeniedHost("::1") === true);
ok("T-B10c fe80", isKnrDiscoverySsrfDeniedHost("fe80::1") === true);

{
  const evil = [
    {
      sourceId: "evil_private",
      hostname: "10.0.0.5",
      url: "https://10.0.0.5/x",
      originId: "knr_government_public",
      active: true,
      priority: "GOVERNMENT",
    },
  ];
  const plan = planKnrDiscoveryHttp({
    sourceId: "evil_private",
    featureEnabled: true,
    allowlistOverride: evil,
  });
  ok("T-B7 plan SSRF_DENIED", plan.denyCode === "SSRF_DENIED");
  ok("T-B7 plan HTTP 0", plan.accounting.httpRequestCount === 0);
}

// T-B11 legal deny scrape
{
  ok(
    "T-B11 scrape origin deny",
    evaluateKnrDiscoveryHttpLegalGate("scrape_knr_public").ok === false,
  );
  const scrapeEntry = [
    {
      sourceId: "scrape_src",
      hostname: "example.com",
      url: "https://example.com/x",
      originId: "scrape_knr_public",
      active: true,
      priority: "OTHER",
    },
  ];
  const plan = planKnrDiscoveryHttp({
    sourceId: "scrape_src",
    featureEnabled: true,
    allowlistOverride: scrapeEntry,
  });
  ok("T-B11 LEGAL_DENIED", plan.denyCode === "LEGAL_DENIED");
  ok("T-B11 HTTP 0", plan.accounting.httpRequestCount === 0);
}

// T-B12 unsupported CT · T-B13 PDF · T-B14 too large · T-B15 timeout · T-B16 redirect
{
  const fixture = KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE;
  const url = fixture[0].url;
  const plan = planKnrDiscoveryHttp({
    sourceId: fixture[0].sourceId,
    featureEnabled: true,
    allowlistOverride: fixture,
  });
  ok("fixture plan allowed", plan.allowed === true);

  const pdfExec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    skipDocumentCache: true,
    pdfExtractFn: async () => ({
      text: "",
      pageCount: 1,
      noTextLayer: true,
      extractError: false,
    }),
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url,
        headers: { get: () => "application/pdf" },
        text: async () => "x".repeat(100),
        arrayBuffer: async () => new TextEncoder().encode("%PDF-scan").buffer,
      },
    }),
  });
  ok(
    "T-B13 PDF scan → PDF_TEXT_UNAVAILABLE (no OCR)",
    pdfExec.denyCode === "PDF_TEXT_UNAVAILABLE",
  );
  ok("T-B13 attempted", pdfExec.accounting.httpRequestCount === 1);

  const pdfOk = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    skipDocumentCache: true,
    pdfExtractFn: async () => ({
      text: "KNR 4-01 0354-07 Wykucie ościeżnic szt. enough text for min length gate xxxxxxxxxx",
      pageCount: 1,
      noTextLayer: false,
      extractError: false,
    }),
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url,
        headers: { get: () => "application/pdf" },
        text: async () => "unused",
        arrayBuffer: async () => new TextEncoder().encode("%PDF-ok").buffer,
      },
    }),
  });
  ok("T-B13b PDF text layer SUCCEEDED", pdfOk.jobStatus === "SUCCEEDED" && pdfOk.evidenceWritable === true);

  const ctExec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url,
        headers: { get: () => "application/octet-stream" },
        text: async () => "x".repeat(100),
      },
    }),
  });
  ok("T-B12 unsupported CT", ctExec.denyCode === "UNSUPPORTED_CONTENT_TYPE");

  const bigExec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url,
        headers: { get: () => "text/html" },
        text: async () => "y".repeat(400_001),
      },
    }),
  });
  ok("T-B14 TOO_LARGE", bigExec.denyCode === "TOO_LARGE");

  const redirExec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url: "https://evil-not-allowlisted.test/x",
        headers: { get: () => "text/html" },
        text: async () => "<html>" + "z".repeat(80) + "</html>",
      },
    }),
  });
  ok("T-B16 REDIRECT_DENIED", redirExec.denyCode === "REDIRECT_DENIED");

  const timeoutExec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    fetchImpl: async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    },
  });
  ok("T-B15 TIMEOUT", timeoutExec.denyCode === "TIMEOUT");
}

// T-B17 allowlisted success (isolated fixture only)
{
  const fixture = KNR_DISCOVERY_HTTP_ALLOWLIST_TEST_FIXTURE;
  const url = fixture[0].url;
  const plan = planKnrDiscoveryHttp({
    sourceId: fixture[0].sourceId,
    featureEnabled: true,
    allowlistOverride: fixture,
  });
  const body = "<html><body>" + "KNR fixture body content enough chars ".repeat(3) + "</body></html>";
  const exec = await executeKnrDiscoveryHttpPlan(plan, {
    allowlistOverride: fixture,
    nowIso: NOW,
    fetchImpl: mockFetch({
      [url]: {
        ok: true,
        status: 200,
        url,
        headers: { get: () => "text/html; charset=utf-8" },
        text: async () => body,
      },
    }),
  });
  ok("T-B17 SUCCEEDED", exec.jobStatus === "SUCCEEDED");
  ok("T-B17 evidenceWritable", exec.evidenceWritable === true);

  // T-B18 ingest discovery only
  const ingested = ingestKnrDiscoveryHttpResultToEvidence({
    exec,
    evidenceKeyV1: "KNR|P2B|TEST-01",
    family: "KNR",
    sourceId: fixture[0].sourceId,
    nowIso: NOW,
  });
  ok("T-B18 ingest ok", ingested.ok === true);
  ok(
    "T-B18 discovery status DISCOVERED",
    ingested.ok && ingested.record.discoveryStatus === "DISCOVERED",
  );
  ok(
    "T-B18 catalogRevisionLink null",
    ingested.ok && ingested.record.catalogRevisionLink == null,
  );
  ok(
    "T-B19 no verificationStatus field",
    ingested.ok && !("verificationStatus" in ingested.record),
  );
  ok(
    "T-B20 no PLN fields",
    ingested.ok
      && !("ourRate" in ingested.record)
      && !("companyPrice" in ingested.record)
      && !("margin" in ingested.record),
  );
}

// T-B21 family mismatch CONFLICT
{
  const first = {
    schemaVersion: 1,
    evidenceKeyV1: "KNR|P2B|FAM",
    family: "KNR",
    displayCode: "KNR|P2B|FAM",
    discoveryStatus: "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources: [
      {
        sourceId: "a",
        urlHash: "u1",
        contentHash: "c1",
        fetchedAt: NOW,
        priority: "OTHER",
      },
    ],
    norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    queryHashes: [],
    freshness: "FRESH",
    contentHash: "c1",
    createdAt: NOW,
    updatedAt: NOW,
    catalogRevisionLink: null,
  };
  let store = emptyKnrDiscoveryEvidenceStore(NOW);
  store = upsertKnrDiscoveryEvidenceOffline({
    record: first,
    nowIso: NOW,
    storeOverride: store,
  }).store;
  const conflict = upsertKnrDiscoveryEvidenceOffline({
    record: { ...first, family: "KNR-W", contentHash: "c2" },
    nowIso: NOW,
    storeOverride: store,
  });
  ok("T-B21 CONFLICT", conflict.record.discoveryStatus === "CONFLICT");
  ok("T-B21 family stays KNR", conflict.record.family === "KNR");
}

// T-B22..T-B24 Host side-channel
{
  const entry = buildVerifiedCatalogEntry();
  const catalog = catalogWith(entry);
  const host = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p2b",
    lines: [
      {
        lineId: "L1",
        catalogBasis: {
          family: "KNR",
          catalogId: "4-01",
          tableCode: "0101-01",
          rawCode: "KNR 4-01 0101-01",
          display: "KNR 4-01 0101-01",
          normalizedKey: entry.evidenceKeyV1,
        },
      },
    ],
    catalogStore: catalog,
    nowIso: NOW,
  });
  ok("T-B22 host HTTP 0", host.httpRequestCount === 0);
  ok("T-B22 sidechannel present", !!host.discoverySideChannel);
  const sc = host.discoverySideChannel.lines[0];
  ok("T-B22 CATALOG_HIT side", sc?.outcome === "CATALOG_HIT");
  ok("T-B22 priced false", sc?.priced === false && host.discoverySideChannel.priced === false);
  ok("T-B22 verified false", sc?.verified === false);

  const missHost = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p2b-miss",
    lines: [
      {
        lineId: "L2",
        catalogBasis: {
          family: "KNR",
          catalogId: "9-99",
          tableCode: "0000-00",
          rawCode: "missing",
          display: "missing",
          normalizedKey: "KNR|9-99|0000-00",
        },
      },
    ],
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
    nowIso: NOW,
  });
  const sc2 = missHost.discoverySideChannel.lines[0];
  ok("T-B24 DISCOVERY_REQUIRED", sc2?.outcome === "DISCOVERY_REQUIRED");
  ok("T-B24 HTTP plan deny", sc2?.httpPlan?.accounting.httpRequestCount === 0);
  ok("T-B24 not priced", sc2?.priced === false);
}

// Evidence HIT host
{
  const cor = buildP2aCorroboratedFixture();
  let discovery = emptyKnrDiscoveryEvidenceStore(NOW);
  discovery = upsertKnrDiscoveryEvidenceOffline({
    record: cor,
    nowIso: NOW,
    storeOverride: discovery,
  }).store;
  const host = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-ev",
    lines: [
      {
        lineId: "E1",
        catalogBasis: {
          family: "KNR",
          catalogId: "2-02",
          tableCode: "0111-01",
          rawCode: cor.evidenceKeyV1,
          display: cor.displayCode,
          normalizedKey: cor.evidenceKeyV1,
        },
      },
    ],
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: discovery,
    nowIso: NOW,
  });
  ok("T-B23 EVIDENCE_HIT host", host.discoverySideChannel.lines[0]?.outcome === "EVIDENCE_HIT");
  ok("T-B23 HTTP 0", host.discoverySideChannel.httpRequestCount === 0);
}

// Edge wiring markers · forbidden files untouched by content check
{
  const edge = readSrc("supabase/functions/make-server-0afb8820/index.tsx");
  ok("Edge endpoint present", edge.includes("knr-discovery-selective-lookup"));
  ok("Edge allowlist empty const", edge.includes("KNR_DISCOVERY_EDGE_ALLOWLIST"));
  ok("Edge arbitrary url forbid", edge.includes("arbitrary_url_forbidden"));
  ok("Edge ssrf", edge.includes("ssrf_denied"));
  const router = readSrc(
    "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts",
  );
  ok("write-router not importing discovery http", !router.includes("knr-discovery-http"));
}

console.log(`\nOK ${passed} assertions — KL-7-P2B foundation`);
