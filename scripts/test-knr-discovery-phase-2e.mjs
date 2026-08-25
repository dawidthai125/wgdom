/**
 * IK-KNR Phase 2E — MOPS-driven controlled discovery expansion harness.
 * Local/fake HTTP only · ZERO live production discovery in default run.
 *
 * npx vite-node scripts/test-knr-discovery-phase-2e.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY,
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY,
  clearKnrDiscoveryClientSfStateForTests,
  clearKnrDiscoveryDocumentCacheForTests,
  clearKnrDiscoveryOnDemandBudgetForTests,
  createMemoryAtomicKnrDiscoveryJobStore,
  emptyKnrCatalogStore,
  emptyKnrDiscoveryEvidenceStore,
  foldIdentityKeyV2,
  parseIdentityPartialFromCatalogBasis,
  planKnrDiscoveryHttp,
  resolveKnrDiscoveryAllowlistSource,
  runKnrDiscoveryOnDemand,
  selectKnrDiscoverySourceIds,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";

const NOW = "2026-08-25T20:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const PHASE2D_SOURCE = "l3_bip_malopolska_1646919";
const PHASE2E_SOURCE = "l3_rckik_wroclaw_1202_07";
const PHASE2E_URL =
  "https://www.rckik.wroclaw.pl/przetargi/20110629132027przedmiar_robot_zalacznik_7.pdf";
const PHASE2E_BY_KEY = "KNR-W|4-01|1202-07";
const PHASE2D_BY_KEY = "KNR-W|4-01|0701-05";
/** RCKiK przedmiar layout — multi-line KNR-W + d.1 table code (not contiguous string). */
const PHASE2E_PDF_TEXT = [
  "KSIĄŻKA PRZEDMIARÓW 1",
  "1 KNR-W 4-01 Skasowanie wykwitów (zacieków) m 2",
  "d.1 1202-07",
  "50 m 2 50,000",
].join("\n");

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

clearKnrDiscoveryClientSfStateForTests();
clearKnrDiscoveryOnDemandBudgetForTests();
clearKnrDiscoveryDocumentCacheForTests();

// A — Phase 2D unchanged
ok(
  "A Phase 2D BY_KEY → malopolska",
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY[PHASE2D_BY_KEY]?.[0] === PHASE2D_SOURCE,
);
ok(
  "A Phase 2D allowlist entry intact",
  resolveKnrDiscoveryAllowlistSource(PHASE2D_SOURCE).ok === true
    && resolveKnrDiscoveryAllowlistSource(PHASE2D_SOURCE).entry.url
      === "https://bip.malopolska.pl/api/files/1646919",
);

// B — Phase 2E selection
ok(
  "B Phase 2E BY_KEY → rckik",
  KNR_DISCOVERY_SOURCE_SELECTION_BY_KEY[PHASE2E_BY_KEY]?.[0] === PHASE2E_SOURCE,
);
ok(
  "B Phase 2E allowlist URL exact",
  resolveKnrDiscoveryAllowlistSource(PHASE2E_SOURCE).ok === true
    && resolveKnrDiscoveryAllowlistSource(PHASE2E_SOURCE).entry.url === PHASE2E_URL,
);

// Normalization: KNR vs KNR-W distinct (no alias)
{
  const knr = buildCatalogBasisFromRawCode("KNR 4-01 1202-07");
  const knrW = buildCatalogBasisFromRawCode("KNR-W 4-01 1202-07");
  ok("B-norm KNR distinct from KNR-W", knr?.normalizedKey === "KNR|4-01|1202-07");
  ok("B-norm KNR-W is Phase 2E key", knrW?.normalizedKey === PHASE2E_BY_KEY);
  ok(
    "B-norm MOPS KNR code does not select Phase 2E",
    selectKnrDiscoverySourceIds({ evidenceKeyV1: knr?.normalizedKey ?? "" }).sourceIds.length === 0,
  );
}

// C — unknown key safety
{
  const unknown = missFromCode("KNR 2-02 0803-01");
  const sel = selectKnrDiscoverySourceIds({
    evidenceKeyV1: unknown.evidenceKeyV1,
    normalizedKey: unknown.normalizedKey,
  });
  const r = await runKnrDiscoveryOnDemand({
    missing: [unknown],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
    ignoreProcessBudget: true,
    httpMode: "fake",
    fakeExecForSource: async () => {
      throw new Error("must not fetch for unknown key");
    },
  });
  ok("C unknown selection EMPTY", sel.reason === "EMPTY" && sel.sourceIds.length === 0);
  ok(
    "C unknown NO_SOURCE_SELECTION HTTP=0",
    r.perKey[0]?.reason === "NO_SOURCE_SELECTION" && r.httpRequestCount === 0,
  );
}

// D — BY_FAMILY empty
ok("D BY_FAMILY empty", Object.keys(KNR_DISCOVERY_SOURCE_SELECTION_BY_FAMILY).length === 0);

// E — Edge allowlist empty (static file read)
{
  const edgeSrc = readFileSync(
    join(process.cwd(), "supabase/functions/make-server-0afb8820/index.tsx"),
    "utf8",
  );
  ok(
    "E Edge allowlist empty",
    /KNR_DISCOVERY_EDGE_ALLOWLIST[^=]*=\s*Object\.freeze\(\[\]\)/.test(edgeSrc),
  );
}

// F–H — Phase 2E discovery fake HTTP → PENDING_VERIFY, no VERIFIED
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss2e = missFromCode("KNR-W 4-01 1202-07");
  ok("F miss uses Phase 2E BY_KEY", miss2e.evidenceKeyV1 === PHASE2E_BY_KEY);

  const plan = planKnrDiscoveryHttp({ sourceId: PHASE2E_SOURCE, featureEnabled: true });
  ok(
    "F planner resolves exact URL",
    plan.allowed === true && plan.requestUrl === PHASE2E_URL,
  );
  ok(
    "F planner rejects raw URL",
    planKnrDiscoveryHttp({ rawUrl: PHASE2E_URL, featureEnabled: true }).allowed === false,
  );

  let fetchCount = 0;
  const first = await runKnrDiscoveryOnDemand({
    missing: [miss2e],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
    ignoreProcessBudget: true,
    httpMode: "fake",
    fakeExecForSource: async (sourceId) => {
      fetchCount += 1;
      ok("F selected sourceId", sourceId === PHASE2E_SOURCE);
      return {
        jobStatus: "SUCCEEDED",
        denyCode: null,
        accounting: { httpRequestCount: 1, attemptedFetch: true },
        finalUrl: PHASE2E_URL,
        contentType: "application/pdf",
        bodyText: PHASE2E_PDF_TEXT,
        fetchedAtIso: NOW,
        evidenceWritable: true,
      };
    },
  });

  ok("F ORCH_DONE", first.perKey[0]?.reason === "ORCH_DONE");
  ok("F bounded HTTP=1", first.httpRequestCount === 1 && fetchCount === 1);
  ok(
    "G catalogVerified false",
    first.authorityWrites.catalogVerified === false,
  );
  ok(
    "F PENDING_VERIFY staged",
    first.perKey[0]?.stagedPending === true
      && first.catalogStore.entries[miss2e.identityKeyV2]?.verificationStatus === "PENDING_VERIFY",
  );
  ok(
    "H never VERIFIED",
    Object.values(first.catalogStore.entries).every((e) => e.verificationStatus !== "VERIFIED"),
  );

  // I — learning-once for Phase 2E key
  const second = await runKnrDiscoveryOnDemand({
    missing: [miss2e],
    nowIso: NOW,
    nowMs: NOW_MS + 1,
    featureEnabled: true,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    discoveryStore: first.discoveryStore,
    catalogStore: first.catalogStore,
    ignoreProcessBudget: true,
    httpMode: "fake",
    fakeExecForSource: async () => {
      throw new Error("must not refetch after evidence learned");
    },
  });
  ok(
    "I learning-once SKIP_HIT_OR_EVIDENCE",
    second.perKey[0]?.reason === "SKIP_HIT_OR_EVIDENCE" && second.httpRequestCount === 0,
  );
}

// J — independent learning state for 2D vs 2E keys
{
  clearKnrDiscoveryOnDemandBudgetForTests();
  clearKnrDiscoveryClientSfStateForTests();
  const miss2d = missFromCode("KNR-W 4-01 0701-05");
  const miss2e = missFromCode("KNR-W 4-01 1202-07");
  let calls = 0;
  const r = await runKnrDiscoveryOnDemand({
    missing: [miss2d, miss2e],
    nowIso: NOW,
    nowMs: NOW_MS,
    featureEnabled: true,
    leaseStore: createMemoryAtomicKnrDiscoveryJobStore(),
    catalogStore: emptyKnrCatalogStore(NOW),
    discoveryStore: emptyKnrDiscoveryEvidenceStore(NOW),
    ignoreProcessBudget: true,
    httpMode: "fake",
    fakeExecForSource: async (sourceId) => {
      calls += 1;
      const bodyText =
        sourceId === PHASE2E_SOURCE
          ? PHASE2E_PDF_TEXT
          : "KNR-W 4-01 0701-05 sample m2";
      return {
        jobStatus: "SUCCEEDED",
        denyCode: null,
        accounting: { httpRequestCount: 1, attemptedFetch: true },
        finalUrl:
          sourceId === PHASE2E_SOURCE
            ? PHASE2E_URL
            : "https://bip.malopolska.pl/api/files/1646919",
        contentType: "application/pdf",
        bodyText,
        fetchedAtIso: NOW,
        evidenceWritable: true,
      };
    },
  });
  ok("J both keys ORCH_DONE", r.perKey.length === 2 && r.perKey.every((k) => k.reason === "ORCH_DONE"));
  ok(
    "J independent evidence keys",
    Boolean(r.discoveryStore.entries[miss2d.evidenceKeyV1])
      && Boolean(r.discoveryStore.entries[miss2e.evidenceKeyV1]),
  );
  ok("J two bounded HTTP calls", r.httpRequestCount === 2 && calls === 2);
  ok(
    "J source routing",
    r.perKey.find((k) => k.evidenceKeyV1 === PHASE2E_BY_KEY)?.sourceIds[0] === PHASE2E_SOURCE
      && r.perKey.find((k) => k.evidenceKeyV1 === PHASE2D_BY_KEY)?.sourceIds[0] === PHASE2D_SOURCE,
  );
}

console.log(`\nPhase 2E harness: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
