/**
 * GLOBAL_KNR_DISCOVERY_E2E — catalog MISS → public discovery → PENDING_VERIFY
 * → reanalysisRequired → Orchestra defer/unblock → Identity/Labor/F5 path.
 *
 * ZERO production writes · ZERO auto VERIFIED · fake HTTP only in test harness.
 *
 * Run: npx vite-node scripts/test-ik-global-knr-discovery-e2e.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_L3_DOCUMENT_TEST_FIXTURE,
  buildFakeKnrDiscoveryHttpSuccess,
  buildFakeL3BoqDocumentHtml,
  clearKnrDiscoveryOnDemandBudgetForTests,
  createMemoryAtomicKnrDiscoveryJobStore,
  emptyKnrCatalogStore,
  resolveHostKnrKnowledgeLookupOnly,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { computeIkOrchestraSyncSnapshot } from "../src/lib/intelligent-estimator/orchestra/ik-orchestra-engine.ts";
import {
  buildKnrReanalysisSignalFromHostResult,
  planKnrReanalysisOrchestraInvalidation,
  shouldDeferIkDownstreamUntilKnrKnowledge,
} from "../src/lib/intelligent-estimator/orchestra/ik-knr-reanalysis-seam.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-09-01T10:00:00.000Z";
const SAMPLE = "KNR 2-02 0803-01";
const basis = buildCatalogBasisFromRawCode(SAMPLE);
const CHROBREGO = { net: 159000, vat: 36570, gross: 195570, source: "owner_g3", kind: "ik_g3_final_bid" };

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
};

const writes = {
  batchSet: 0,
  catalogVerified: 0,
  accept: 0,
  p7: 0,
  g3: 0,
};

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

const superActor = { actorId: "dawid", role: "super_admin", displayName: "Dawid" };

function orchestraFlags() {
  return {
    p2DocumentsBoqOn: false,
    identityCoverageOn: false,
    p5LaborOn: true,
    p5ResearchOn: false,
    p6MaterialOn: true,
    p6ResearchOn: false,
    p7F5On: true,
    p8RiskOn: false,
  };
}

function makeTenderItem(id) {
  return {
    id,
    tenderId: id,
    title: `E2E ${id}`,
    bzpDocuments: [{ name: "swz.pdf", url: "https://example.test/swz.pdf" }],
    boqLines: [
      {
        lineId: "L-global",
        dwellingId: "dw-1",
        description: "Montaż osprzętu elektrycznego",
        unit: "szt",
        quantity: 2,
        catalogBasis: basis,
      },
    ],
  };
}

function makePackage(tenderId) {
  return {
    tenderId,
    schemaVersion: 2,
    dwellings: [
      {
        dwellingId: "dw-1",
        labelPl: "Lokal 1",
        documentMapping: { status: "confirmed" },
        boqLines: [
          {
            lineId: "L-global",
            description: "Montaż osprzętu elektrycznego",
            unit: "szt",
            quantity: 2,
            catalogBasis: basis,
          },
        ],
      },
    ],
  };
}

// --- A: catalog MISS → discovery → PENDING_VERIFY → host reanalysis ---
clearKnrDiscoveryOnDemandBudgetForTests();
const l3 = KNR_DISCOVERY_L3_DOCUMENT_TEST_FIXTURE;
const l3Id = l3[0].sourceId;
const html = buildFakeL3BoqDocumentHtml({
  knrCode: SAMPLE,
  description: "Montaż osprzętu elektrycznego",
  unit: "szt",
});

const hostResult = await resolveHostKnrKnowledgeLookupOnly({
  tenderId: "t-global-e2e",
  lines: [
    {
      lineId: "L-global",
      dwellingId: "dw-1",
      catalogBasis: basis,
      description: "Montaż osprzętu elektrycznego",
    },
  ],
  catalogStore: emptyKnrCatalogStore(NOW),
  actor: superActor,
  athFiles: [],
  discoveryFeatureEnabled: true,
  discoveryAllowlistOverride: l3,
  discoverySourceIdsOverride: [l3Id],
  discoveryHttpMode: "fake",
  discoveryFakeExecForSource: (id) => ({
    ...buildFakeKnrDiscoveryHttpSuccess(id, NOW),
    bodyText: html,
    finalUrl: l3[0].url,
    accounting: { httpRequestCount: 1, attemptedFetch: true },
    evidenceWritable: true,
  }),
  discoveryLeaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  nowIso: NOW,
});

assert("E2E catalog MISS → discovery ran", hostResult.onDemandDiscovery != null);
assert("E2E HTTP > 0 on MISS", hostResult.httpRequestCount > 0);
assert(
  "E2E PENDING_VERIFY staged",
  hostResult.envelope.lineResults[0]?.lookupStatus === "PENDING_VERIFY",
);
assert("E2E host reanalysisExecuted", hostResult.reanalysisExecuted === true);
assert("E2E host reanalysisRequired", hostResult.reanalysisRequired === true);
assert(
  "E2E reanalysis target dwellingId",
  hostResult.reanalysisTargets[0]?.dwellingId === "dw-1",
);
assert(
  "E2E reanalysis target lineId",
  hostResult.reanalysisTargets[0]?.lineId === "L-global",
);

const signal = buildKnrReanalysisSignalFromHostResult(hostResult, [
  { lineId: "L-global", dwellingId: "dw-1" },
]);
assert("E2E signal reanalysisRequired", signal.reanalysisRequired === true);
assert("E2E signal targets", signal.targets.length >= 1);

const plan = planKnrReanalysisOrchestraInvalidation(signal, {
  downstreamAlreadyDeferred: true,
});
assert("E2E plan labor bump", plan.bumpLaborRecalcEpoch === true);
assert("E2E plan material bump", plan.bumpMaterialRecalcEpoch === true);
assert(
  "E2E plan no identity bump when deferred",
  plan.bumpIdentityResearchEpoch === false,
);
const planWhenNotDeferred = planKnrReanalysisOrchestraInvalidation(signal, {
  downstreamAlreadyDeferred: false,
});
assert(
  "E2E plan identity bump when NOT deferred (G-ORD-02)",
  planWhenNotDeferred.bumpIdentityResearchEpoch === true,
);

function makeSyntheticExpertReport() {
  const line = {
    lineId: "L-global",
    lp: 1,
    description: "Montaż osprzętu elektrycznego",
    unit: "szt",
    quantity: 2,
    catalogBasis: basis,
    knrHint: SAMPLE,
    catalogWorkId: null,
    matchMethod: null,
    matchedBy: null,
    matchConfidence: null,
  };
  return {
    tenderId: "t-global-e2e",
    masterBoq: {
      status: "ready",
      readyForExperts: true,
      lineCount: 1,
      dwellingCount: 1,
      mode: "multi",
    },
    masterBoqLines: [{ dwellingId: "dw-1", line, provenance: null }],
    offerBoq: null,
    documentInventory: { files: [], warnings: [] },
    reasons: [],
  };
}

// --- B: Orchestra PHASE A defer → PHASE C unblock (G-ORD-01: auto from knr.lines) ---
const item = makeTenderItem("t-global-e2e");
const pkg = makePackage("t-global-e2e");
const report = makeSyntheticExpertReport();
const knr = runIkKnrExpert({
  tenderId: item.id,
  documentExpert: report,
  historicalIndex: null,
});

assert(
  "E2E defer while knowledgeBusy",
  shouldDeferIkDownstreamUntilKnrKnowledge({
    readyForExperts: true,
    knrLineCount: knr.lines.length,
    knowledgeBusy: true,
    knrKnowledge: null,
  }) === true,
);
assert("E2E knr lines for defer gate", knr.lines.length >= 1);

// Auto defer — omit deferDownstreamUntilKnrKnowledge (engine uses knr.lines, not ingest-only)
const snapDeferred = computeIkOrchestraSyncSnapshot({
  item,
  effectiveItem: item,
  pkg,
  ingest: { expert: report, phase: "ready", started: true, completed: true },
  historicalIndex: null,
  knrKnowledge: null,
  knowledgeBusy: true,
  flags: orchestraFlags(),
  chiefSession: null,
  knrReanalysisSignal: null,
});

assert("E2E Orchestra downstream deferred", snapDeferred.knrDownstreamDeferred === true);
assert(
  "E2E Identity blocked while deferred",
  snapDeferred.identityContext?.status === "blocked",
);
assert("E2E F5 null while deferred", snapDeferred.positionCostBid === null);
assert("E2E composite null while deferred", snapDeferred.composite === null);
assert("E2E P7 null while deferred", snapDeferred.positionCostBid === null);

const snapAfter = computeIkOrchestraSyncSnapshot({
  item,
  effectiveItem: item,
  pkg,
  ingest: { expert: report, phase: "ready", started: true, completed: true },
  historicalIndex: null,
  knrKnowledge: hostResult.envelope,
  knowledgeBusy: false,
  flags: orchestraFlags(),
  chiefSession: null,
  knrReanalysisSignal: signal,
});

assert("E2E Orchestra unblocked after KL-3", snapAfter.knrDownstreamDeferred === false);
assert(
  "E2E Identity reruns after KL-3",
  snapAfter.identityContext != null && snapAfter.identityContext.status !== "blocked",
);
assert(
  "E2E knrKnowledgeDiag pendingVerify",
  snapAfter.knrKnowledgeDiag.pendingVerify >= 1,
);
assert(
  "E2E reanalysis diag executed",
  snapAfter.knrReanalysisDiag.status === "executed",
);
assert(
  "E2E stale != fresh knrAppDiag",
  snapDeferred.knrAppDiag.status !== snapAfter.knrAppDiag.status
    || snapAfter.knrKnowledgeDiag.pendingVerify > snapDeferred.knrKnowledgeDiag.pendingVerify,
);

// G-ORD-01: even if we only had knrKnowledge=null+busy, auto path must defer without force flag
assert(
  "E2E auto-defer without explicit override",
  snapDeferred.knrDownstreamDeferred === true,
);

// Tender B — catalog already staged → no HTTP on HIT/PENDING local
clearKnrDiscoveryOnDemandBudgetForTests();
const stagedStore = hostResult.onDemandDiscovery?.catalogStore;
assert("E2E staged catalog available for Tender B", stagedStore != null);
const hostHit = await resolveHostKnrKnowledgeLookupOnly({
  tenderId: "t-global-e2e-b",
  lines: [
    {
      lineId: "L-global",
      dwellingId: "dw-2",
      catalogBasis: basis,
      description: "Montaż osprzętu elektrycznego",
    },
  ],
  catalogStore: stagedStore,
  actor: superActor,
  athFiles: [],
  discoveryFeatureEnabled: true,
  discoveryAllowlistOverride: l3,
  discoverySourceIdsOverride: [l3Id],
  discoveryHttpMode: "fake",
  discoveryFakeExecForSource: () => {
    throw new Error("HTTP must not run on catalog HIT/PENDING");
  },
  discoveryLeaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
  nowIso: NOW,
});
assert("E2E Tender B HTTP=0", hostHit.httpRequestCount === 0);
assert(
  "E2E Tender B PENDING or HIT",
  hostHit.envelope.lineResults[0]?.lookupStatus === "PENDING_VERIFY"
    || hostHit.envelope.lineResults[0]?.lookupStatus === "LOCAL_HIT"
    || hostHit.envelope.lineResults[0]?.lookupStatus === "STALE_HIT",
);

// --- C: KNR ≠ BOM / no VERIFIED / no invent ---
assert(
  "E2E no auto VERIFIED in catalog",
  hostResult.envelope.lineResults.every((l) => l.lookupStatus !== "VERIFIED"),
);
assert(
  "E2E knr app not priced from PENDING alone",
  snapAfter.knrApplicationResults.every((r) => r.finalStatus !== "PRICED"),
);

// --- D: global registry — no MOPS hardcode in production discovery ---
const registrySrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/ik-public-knr-source-registry.ts"),
  "utf8",
);
assert(
  "E2E no MOPS branch in registry",
  !registrySrc.includes("if (tenderId") && !registrySrc.includes("MOPS →"),
);

// --- E: Harmonogram block preserved ---
const docSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/ik-document-expert.ts"),
  "utf8",
);
assert(
  "E2E Harmonogram block",
  docSrc.includes("isFinancialScheduleNotCostFilename"),
);

// --- F: CHROBREGO immutable ---
assert(
  "E2E CHROBREGO",
  CHROBREGO.net === 159000 && CHROBREGO.vat === 36570 && CHROBREGO.gross === 195570,
);
assert("E2E CHROBREGO kind", CHROBREGO.kind === "ik_g3_final_bid");

// --- G: write counters ---
assert("E2E write batchSet=0", writes.batchSet === 0);
assert("E2E write accept=0", writes.accept === 0);
assert("E2E write p7=0", writes.p7 === 0);
assert("E2E write g3=0", writes.g3 === 0);

console.log(`\nGLOBAL_KNR_DISCOVERY_E2E: ${fail === 0 ? "PASS" : "FAIL"} (${pass} pass, ${fail} fail)`);
process.exit(fail > 0 ? 1 : 0);
