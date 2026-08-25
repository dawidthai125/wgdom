/**
 * IK-KNR KL-3 HOST — harness + Phase 1 research-on-MISS (OD-KNR-FLAG-1 YES).
 *
 * npx vite-node scripts/test-knr-host-kl3.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_DISCOVERY_HTTP_ALLOWLIST,
  KNR_HOST_KL3_EXPLICIT_RESEARCH,
  KNR_HOST_KL3_LOOKUP_ONLY,
  KNR_KNOWLEDGE_KL3_HOST_MARKER,
  buildKnrHostKnowledgeAttemptKey,
  buildSyntheticAthFixture,
  emptyKnrCatalogStore,
  emptyKnrRawEvidenceStore,
  executeKnrOwnerVerifyApprove,
  ingestAthForKnrOwnerVerify,
  isKnrDiscoveryAllowlistEmpty,
  isKnrLocalHitStatus,
  resolveHostKnrKnowledgeLookupOnly,
  resolveKnrKnowledgeKl3b,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-20T16:00:00.000Z";
const SAMPLE = "KNR 2-02 0803-01";
const basis = buildCatalogBasisFromRawCode(SAMPLE);

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

function athFile(displayCode = SAMPLE) {
  return {
    bytes: buildSyntheticAthFixture({
      displayCode,
      includePln: false,
      withR: true,
      withM: true,
      withS: true,
    }),
    sourceFilename: "synthetic.ath",
    targetDisplayCode: displayCode,
  };
}

async function verifiedHitStore() {
  const pending = await ingestAthForKnrOwnerVerify({
    bytes: buildSyntheticAthFixture({
      displayCode: SAMPLE,
      includePln: false,
      withR: true,
      withM: true,
      withS: true,
    }),
    sourceFilename: "synthetic.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE,
    ownerActorId: superActor.actorId,
    catalogStore: emptyKnrCatalogStore(NOW),
    autoOwnerVerify: false,
  });
  if (!pending.ok || !pending.candidate) {
    throw new Error(`verifiedHitStore ingest failed: ${pending.messagePl ?? pending.outcome}`);
  }
  const approved = await executeKnrOwnerVerifyApprove({
    candidate: pending.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: pending.catalogStore,
    evidenceStore: pending.evidenceStore,
    persistInMemory: true,
  });
  if (!approved.ok || !approved.catalogStore) {
    throw new Error(`verifiedHitStore approve failed: ${approved.messagePl ?? ""}`);
  }
  return approved.catalogStore;
}

assert("HOST-marker", KNR_KNOWLEDGE_KL3_HOST_MARKER === true);
assert("HOST-OD-FLAG-1-YES", KNR_HOST_KL3_EXPLICIT_RESEARCH === true);
assert("HOST-not-hard-lookup-only", KNR_HOST_KL3_LOOKUP_ONLY === false);
assert(
  "HOST-allowlist-single-pilot",
  !isKnrDiscoveryAllowlistEmpty()
    && KNR_DISCOVERY_HTTP_ALLOWLIST.length === 1
    && KNR_DISCOVERY_HTTP_ALLOWLIST[0]?.sourceId === "l3_bip_malopolska_1646919",
);

// --- Phase 1 TEST 1: FLAG OFF override ---
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p1-off",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    explicitResearch: false,
    nowIso: NOW,
  });
  assert("P1-T1 MISS RESEARCH_DISABLED", out.envelope.lineResults[0]?.lookupStatus === "RESEARCH_DISABLED");
  assert("P1-T1 researchExecuted false", out.researchExecuted === false);
  assert("P1-T1 HTTP 0", out.httpRequestCount === 0);
  assert("P1-T1 lookupOnly true", out.lookupOnly === true);
}

// --- Phase 1 TEST 2: FLAG ON + L1 → PENDING_VERIFY ---
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p1-l1",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
    actor: superActor,
    athFiles: [athFile()],
    nowIso: NOW,
  });
  const line = out.envelope.lineResults[0];
  assert("P1-T2 PENDING_VERIFY", line?.lookupStatus === "PENDING_VERIFY", line?.lookupStatus);
  assert("P1-T2 researchExecuted true", out.researchExecuted === true);
  assert("P1-T2 HTTP 0", out.httpRequestCount === 0);
  assert("P1-T2 not VERIFIED", line?.lookupStatus !== "LOCAL_HIT");
  assert("P1-T2 lookupOnly false", out.lookupOnly === false);
}

// --- Phase 1 TEST 3: FLAG ON + NO L1 ---
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p1-nol1",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    actor: superActor,
    athFiles: [],
    nowIso: NOW,
  });
  assert("P1-T3 RESEARCH_NO_RESULT", out.envelope.lineResults[0]?.lookupStatus === "RESEARCH_NO_RESULT");
  assert("P1-T3 researchExecuted true", out.researchExecuted === true);
  assert("P1-T3 HTTP 0", out.httpRequestCount === 0);
}

// --- Phase 1 TEST 4: empty discovery allowlist HTTP=0 (default ON path) ---
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p1-http",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    actor: superActor,
    athFiles: [],
    nowIso: NOW,
  });
  assert(
    "P1-T4 allowlist single pilot",
    KNR_DISCOVERY_HTTP_ALLOWLIST.length === 1
      && KNR_DISCOVERY_HTTP_ALLOWLIST[0]?.sourceId === "l3_bip_malopolska_1646919",
  );
  assert("P1-T4 HTTP 0", out.httpRequestCount === 0);
  assert("P1-T4 sidechannel HTTP 0", out.discoverySideChannel.httpRequestCount === 0);
}

// --- Phase 1 TEST 5: HIT → no research ---
{
  const store = await verifiedHitStore();
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-host",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: store,
    actor: superActor,
    athFiles: [athFile()],
    nowIso: NOW,
  });
  assert("P1-T5 / HOST-01 HIT envelope", out.envelope.lineResults[0]?.lookupStatus === "LOCAL_HIT");
  assert("P1-T5 HIT no research", out.researchExecuted === false && out.envelope.summary.researchExecuted === false);
}

// --- Phase 1 TEST 6: research failure distinguishable from MISS ---
{
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-p1-fail",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    actor: superActor,
    athFiles: [
      {
        bytes: new Uint8Array([1, 2, 3]),
        sourceFilename: "bad.ath",
        targetDisplayCode: SAMPLE,
      },
    ],
    nowIso: NOW,
  });
  const status = out.envelope.lineResults[0]?.lookupStatus;
  assert(
    "P1-T6 failure != MISS/DISABLED",
    status === "RESEARCH_UNAVAILABLE" || status === "LEGAL_BLOCK" || status === "CONFLICT",
    status,
  );
  assert("P1-T6 researchExecuted true", out.researchExecuted === true);
  assert("P1-T6 not RESEARCH_DISABLED", status !== "RESEARCH_DISABLED");
  assert("P1-T6 not LOCAL_MISS alone", status !== "LOCAL_MISS");
}

// --- Phase 1 TEST 7: no auto actions (contracts) ---
{
  const adapterSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts"),
    "utf8",
  );
  assert("P1-T7 no auto VERIFY in adapter", !adapterSrc.includes("executeKnrOwnerVerifyApprove"));
  assert("P1-T7 no persistVerified in adapter", !adapterSrc.includes("persistVerifiedKnrCatalogEntry"));
  assert(
    "P1-T7 no OWNER_KNR_MAPPINGS import/use",
    !adapterSrc.includes("ik-knr-owner-mapping") && !adapterSrc.includes("applyOwnerKnrMapping"),
  );
  assert("P1-T7 no classifyEstimator", !adapterSrc.includes("classifyEstimatorPricingPlane"));
  assert("P1-T7 no fetch", !adapterSrc.includes("fetch("));
}

{
  const staleStore = await verifiedHitStore();
  const key = Object.keys(staleStore.entries)[0];
  staleStore.entries[key] = {
    ...staleStore.entries[key],
    verificationStatus: "STALE",
  };
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-stale",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: staleStore,
    nowIso: NOW,
  });
  const line = out.envelope.lineResults[0];
  assert("HOST-03 STALE_HIT", line?.lookupStatus === "STALE_HIT" && line?.stale === true);
}

{
  // Default host MISS without actor → research path entered, ACL gate (not hard DISABLED)
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-miss",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
  });
  assert(
    "HOST-04 MISS research path ACL (not DISABLED)",
    out.envelope.lineResults[0]?.lookupStatus === "RESEARCH_UNAVAILABLE",
    out.envelope.lineResults[0]?.lookupStatus,
  );
  assert("HOST-04 researchExecuted false (ACL before L1)", out.researchExecuted === false);
}

{
  const single = await resolveKnrKnowledgeKl3b({
    tenderId: "t",
    lineId: "L1",
    catalogBasis: basis,
    catalogStore: emptyKnrCatalogStore(NOW),
    explicitResearch: false,
    nowIso: NOW,
  });
  assert("HOST-05 no explicit no research", single.envelope.lineResults[0]?.lookupStatus === "RESEARCH_DISABLED");
  assert("HOST-05 researchExecuted false", single.researchExecuted === false);
}

{
  const denied = await resolveKnrKnowledgeKl3b({
    tenderId: "t",
    lineId: "L1",
    catalogBasis: basis,
    catalogStore: emptyKnrCatalogStore(NOW),
    explicitResearch: true,
    actor: { actorId: "x", role: "admin", displayName: "Admin" },
    athFiles: [],
    nowIso: NOW,
  });
  assert("HOST-06 unauthorized", denied.envelope.lineResults[0]?.lookupStatus === "RESEARCH_UNAVAILABLE");
}

{
  const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
  const orchestraSrc =
    readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"), "utf8") +
    readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts"), "utf8");
  const vmBlock = hostSrc.slice(hostSrc.indexOf("buildIkEntryConversationViewModel"));
  assert(
    "HOST-07 no explicitResearch true in host/orchestra callers",
    !hostSrc.includes("explicitResearch: true") && !orchestraSrc.includes("explicitResearch: true"),
  );
  assert("HOST-07 resolveHost import", orchestraSrc.includes("resolveHostKnrKnowledgeLookupOnly"));
  assert("HOST-07 useEffect knowledge", orchestraSrc.includes("knowledgeAttemptedRef"));
  assert("HOST-10 Q10 no knrKnowledge in VM", !vmBlock.slice(0, 1200).includes("knrKnowledge"));
}

{
  const pendingStore = emptyKnrCatalogStore(NOW);
  const pending = await ingestAthForKnrOwnerVerify({
    bytes: buildSyntheticAthFixture({
      displayCode: SAMPLE,
      includePln: false,
      withR: true,
      withM: true,
      withS: true,
    }),
    sourceFilename: "synthetic.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE,
    ownerActorId: superActor.actorId,
    catalogStore: pendingStore,
    autoOwnerVerify: false,
  });
  assert("HOST-08 PENDING exists in KL-3B", pending.ok && pending.outcome === "PENDING_VERIFY");
  assert("HOST-09 PENDING != HIT", isKnrLocalHitStatus("PENDING_VERIFY") === false);
}

{
  const multi = await resolveKnrKnowledgeKl3b({
    tenderId: "t",
    lineId: "L1",
    catalogBasis: basis,
    catalogStore: emptyKnrCatalogStore(NOW),
    explicitResearch: true,
    actor: superActor,
    athFiles: [
      { bytes: new Uint8Array([1]), sourceFilename: "a.ath", targetDisplayCode: "A" },
      { bytes: new Uint8Array([2]), sourceFilename: "b.ath", targetDisplayCode: "B" },
    ],
    nowIso: NOW,
  });
  assert("HOST-10 CONFLICT multi", multi.envelope.lineResults[0]?.lookupStatus === "CONFLICT");
}

{
  const incomplete = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t",
    lines: [
      {
        lineId: "L1",
        catalogBasis: {
          family: null,
          catalogId: null,
          tableCode: null,
          rawCode: "",
          display: "",
          normalizedKey: "",
        },
      },
    ],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
  });
  assert("HOST-11 INCOMPLETE", incomplete.envelope.lineResults[0]?.lookupStatus === "INCOMPLETE");
}

assert(
  "HOST-14 HTTP=0 adapter",
  (
    await resolveHostKnrKnowledgeLookupOnly({
      tenderId: "t",
      lines: [{ lineId: "L1", catalogBasis: basis }],
      catalogStore: emptyKnrCatalogStore(NOW),
      nowIso: NOW,
    })
  ).httpRequestCount === 0,
);

{
  const adapterSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts"),
    "utf8",
  );
  assert("HOST-15 no fetch in adapter", !adapterSrc.includes("fetch("));
  assert("HOST-16 no LLM in adapter", !/llm|openai|gpt/i.test(adapterSrc));
  assert("HOST-25 no second resolver name", !adapterSrc.match(/function resolveKnrKnowledge(?!Kl3b)/));
  assert("HOST-18 no localStorage in adapter", !adapterSrc.includes("localStorage"));
  assert("HOST-26 REUSE resolveKnrKnowledgeKl3b", adapterSrc.includes("resolveKnrKnowledgeKl3b"));
  assert("HOST-27 no discovery orch call", !adapterSrc.includes("orchestrateKnrDiscovery"));
  assert("HOST-28 no executeKnrDiscoveryHttpPlan", !adapterSrc.includes("executeKnrDiscoveryHttpPlan"));
}

{
  const expertSrc = readFileSync(join(root, "src/lib/intelligent-estimator/ik-knr-expert.ts"), "utf8");
  assert(
    "HOST-21 Expert unchanged import",
    !expertSrc.includes("knr-host-kl3") && !expertSrc.includes("knr-research-kl3b"),
  );
}

{
  const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
  const orchestraSrc =
    readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"), "utf8") +
    readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts"), "utf8");
  const vmBlock = hostSrc.slice(hostSrc.indexOf("buildIkEntryConversationViewModel"));
  assert(
    "HOST-19 no catalogBasis write",
    !hostSrc.includes("catalogBasis =") && !orchestraSrc.includes("catalogBasis ="),
  );
  assert(
    "HOST-20 no catalogWorkId write in host",
    !hostSrc.includes("catalogWorkId =") && !orchestraSrc.includes("catalogWorkId ="),
  );
  assert("HOST-22 VM no knrKnowledge opt", !vmBlock.slice(0, 1200).includes("knrKnowledge"));
  assert("HOST-23 P5 unchanged executeResearch", orchestraSrc.includes("executeResearch: opts.p5ResearchOn"));
  assert(
    "HOST-17 no auto VERIFIED in host",
    !hostSrc.includes("persistVerifiedKnrCatalogEntry") &&
      !orchestraSrc.includes("persistVerifiedKnrCatalogEntry"),
  );
  assert("HOST-24 no cloud-sync import", !hostSrc.includes("cloud-sync") && !orchestraSrc.includes("cloud-sync"));
}

{
  const keyOn = buildKnrHostKnowledgeAttemptKey("t1", [{ lineId: "L1", catalogBasis: basis }], true);
  const keyOff = buildKnrHostKnowledgeAttemptKey("t1", [{ lineId: "L1", catalogBasis: basis }], false);
  assert("HOST attempt key research mode", keyOn.includes("research-on-miss"));
  assert("HOST attempt key lookup mode", keyOff.includes("lookup-only"));
}

{
  const expert = runIkKnrExpert({
    tenderId: "t",
    documentExpert: {
      masterBoq: { readyForExperts: false, status: "blocked", lineCount: 0 },
      masterBoqLines: [],
      costDocuments: [],
      przedmiary: [],
      extraction: { extractedCount: 0 },
      offerBoq: null,
    },
  });
  assert("HOST Expert blocked unchanged", expert.status === "BLOCKED");
}

{
  const masterSsot = readFileSync(
    join(root, "docs/architecture/INTELLIGENT-ESTIMATOR-MASTER-SSOT.md"),
    "utf8",
  ).slice(0, 500);
  assert("HOST Master SSOT untouched head", masterSsot.includes("MASTER SSOT"));
}

{
  const mappingSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/ik-knr-owner-mapping.ts"),
    "utf8",
  );
  assert(
    "HOST mapping pilot unchanged",
    mappingSrc.includes('normalizedKey: "KNR-W|4-01|1202-07"') &&
      mappingSrc.includes('workId: "cc-w2-wykwity-zacieki"'),
  );
}

console.log(`\nKL-3 HOST harness: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
