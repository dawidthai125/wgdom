/**
 * IK-KNR — Controlled L3 PDF live pilot (ONE source · ONE KNR · real HTTPS).
 * Owner GO 2026-08-25 · NOT for CI by default.
 *
 * npx vite-node scripts/test-knr-discovery-live-l3-pdf-pilot.mjs
 */
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_DISCOVERY_HTTP_FEATURE_DEFAULT,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY,
  clearKnrDiscoveryClientSfStateForTests,
  clearKnrDiscoveryDocumentCacheForTests,
  clearKnrDiscoveryOnDemandBudgetForTests,
  createMemoryAtomicKnrDiscoveryJobStore,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  extractKnrDiscoveryFactCandidate,
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
  planKnrDiscoveryHttp,
  runKnrDiscoveryOnDemand,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";

const NOW = new Date().toISOString();
const NOW_MS = Date.now();
const TARGET_CODE = "KNR-W 4-01 0701-05";
const SOURCE_ID = "l3_bip_malopolska_1646919";
const DOC_URL = "https://bip.malopolska.pl/api/files/1646919";

function missFromCode(code) {
  const basis = buildCatalogBasisFromRawCode(code);
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

const report = {
  sourceId: SOURCE_ID,
  url: DOC_URL,
  httpStatus: null,
  contentType: null,
  finalUrl: null,
  bytes: null,
  textLen: null,
  targetKnr: TARGET_CODE,
  extractedCode: null,
  extractedDescription: null,
  extractedUnit: null,
  rms: "not provided",
  factStatus: null,
  evidenceKey: null,
  evidenceDiscoveryStatus: null,
  catalogStatus: null,
  pendingVerify: false,
  firstHttpCount: null,
  secondHttpCount: null,
  cacheDedup: null,
  autoVerify: 0,
  autoMapping: 0,
};

console.log("=== IK-KNR CONTROLLED L3 PDF LIVE PILOT ===\n");

// Pre-flight gates
const plan = planKnrDiscoveryHttp({ sourceId: SOURCE_ID });
if (!plan.allowed) {
  console.error("BLOCKED: plan denied", plan);
  process.exit(2);
}
console.log("PLAN OK:", plan.hostname, plan.originId);

clearKnrDiscoveryClientSfStateForTests();
clearKnrDiscoveryOnDemandBudgetForTests();
clearKnrDiscoveryDocumentCacheForTests();

const miss = missFromCode(TARGET_CODE);
report.evidenceKey = miss.evidenceKeyV1;

const r1 = await runKnrDiscoveryOnDemand({
  missing: [miss],
  nowIso: NOW,
  nowMs: NOW_MS,
  leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
  catalogStore: emptyKnrCatalogStore(NOW),
  httpMode: "p2b",
});

report.firstHttpCount = r1.httpRequestCount;
const pk = r1.perKey[0];
const evidence = r1.discoveryStore.entries[miss.evidenceKeyV1];
const catalog = r1.catalogStore.entries[miss.identityKeyV2];

if (evidence?.sources[0]) {
  const src = evidence.sources[0];
  report.finalUrl = DOC_URL;
  report.textLen = (src.fragment ?? "").length;
}

const fact = pk?.fact ?? (evidence ? extractKnrDiscoveryFactCandidate(evidence, miss.evidenceKeyV1) : null);
if (fact) {
  report.extractedCode = fact.knrCode;
  report.extractedDescription = fact.description;
  report.extractedUnit = fact.unit;
  report.factStatus = fact.extractionStatus;
}
report.evidenceDiscoveryStatus = evidence?.discoveryStatus ?? null;
report.catalogStatus = catalog?.verificationStatus ?? null;
report.pendingVerify = catalog?.verificationStatus === "PENDING_VERIFY";

// Re-lookup (learn-once)
clearKnrDiscoveryOnDemandBudgetForTests();
const r2 = await runKnrDiscoveryOnDemand({
  missing: [miss],
  nowIso: NOW,
  nowMs: NOW_MS + 1,
  leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  discoveryStore: r1.discoveryStore,
  catalogStore: r1.catalogStore,
  httpMode: "p2b",
});
report.secondHttpCount = r2.httpRequestCount;
report.cacheDedup =
  r2.perKey[0]?.reason === "SKIP_HIT_OR_EVIDENCE" && r2.httpRequestCount === 0;

console.log("\n--- LIVE PILOT REPORT ---");
console.log(JSON.stringify(report, null, 2));
console.log("\n--- PER-KEY R1 ---", pk);
console.log("--- PER-KEY R2 ---", r2.perKey[0]);
console.log("\nALLOWLIST:", KNR_DISCOVERY_HTTP_ALLOWLIST.map((e) => e.sourceId));
console.log("FEATURE_DEFAULT:", KNR_DISCOVERY_HTTP_FEATURE_DEFAULT);
console.log("SELECTION:", KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY);

const pass =
  report.firstHttpCount === 1
  && report.secondHttpCount === 0
  && report.cacheDedup === true
  && report.factStatus === "FULL"
  && report.extractedUnit === "m2"
  && report.pendingVerify === true
  && r1.authorityWrites.catalogVerified === false
  && pk?.reason === "ORCH_DONE";

console.log("\nVERDICT:", pass ? "CONTROLLED_L3_PDF_LIVE_PASS" : "LIVE_ACTIVATION_BLOCKED");
process.exit(pass ? 0 : 1);
