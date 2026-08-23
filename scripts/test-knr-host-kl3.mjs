/**
 * IK-KNR KL-3 HOST — lookup-only harness (HOST-01…34).
 *
 * npx vite-node scripts/test-knr-host-kl3.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_HOST_KL3_EXPLICIT_RESEARCH,
  KNR_HOST_KL3_LOOKUP_ONLY,
  KNR_KNOWLEDGE_KL3_HOST_MARKER,
  buildKnrHostKnowledgeAttemptKey,
  emptyKnrCatalogStore,
  executeKnrOwnerVerifyApprove,
  ingestAthForKnrOwnerVerify,
  isKnrLocalHitStatus,
  persistVerifiedKnrCatalogEntryInMemory,
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

async function verifiedHitStore() {
  const pending = await ingestAthForKnrOwnerVerify({
    bytes: (await import("../src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts")).buildSyntheticAthFixture({
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
assert("HOST-lookup-only-flag", KNR_HOST_KL3_LOOKUP_ONLY === true);
assert("HOST-explicit-research-false", KNR_HOST_KL3_EXPLICIT_RESEARCH === false);

{
  const store = await verifiedHitStore();
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-host",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: store,
    nowIso: NOW,
  });
  assert("HOST-01 HIT envelope", out.envelope.lineResults[0]?.lookupStatus === "LOCAL_HIT");
  assert("HOST-02 HIT no research", out.researchExecuted === false && out.envelope.summary.researchExecuted === false);
  assert("HOST-lookupOnly", out.lookupOnly === true);
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
  const out = await resolveHostKnrKnowledgeLookupOnly({
    tenderId: "t-miss",
    lines: [{ lineId: "L1", catalogBasis: basis }],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
  });
  assert("HOST-04 MISS", out.envelope.lineResults[0]?.lookupStatus === "RESEARCH_DISABLED");
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
  const orchestraSrc = readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"), "utf8")
    + readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts"), "utf8");
  const vmBlock = hostSrc.slice(hostSrc.indexOf("buildIkEntryConversationViewModel"));
  assert("HOST-07 no explicitResearch true in host", !hostSrc.includes("explicitResearch: true") && !orchestraSrc.includes("explicitResearch: true"));
  assert("HOST-07 resolveHost import", orchestraSrc.includes("resolveHostKnrKnowledgeLookupOnly"));
  assert("HOST-07 useEffect knowledge", orchestraSrc.includes("knowledgeAttemptedRef"));
  assert("HOST-10 Q10 no knrKnowledge in VM", !vmBlock.slice(0, 1200).includes("knrKnowledge"));
}

{
  const pendingStore = emptyKnrCatalogStore(NOW);
  const pending = await ingestAthForKnrOwnerVerify({
    bytes: (await import("../src/lib/intelligent-estimator/knr-knowledge/knr-export-parser.ts")).buildSyntheticAthFixture({
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
    lines: [{
      lineId: "L1",
      catalogBasis: {
        family: null,
        catalogId: null,
        tableCode: null,
        rawCode: "",
        display: "",
        normalizedKey: "",
      },
    }],
    catalogStore: emptyKnrCatalogStore(NOW),
    nowIso: NOW,
  });
  assert("HOST-11 INCOMPLETE", incomplete.envelope.lineResults[0]?.lookupStatus === "INCOMPLETE");
}

assert("HOST-14 HTTP=0 adapter", (await resolveHostKnrKnowledgeLookupOnly({
  tenderId: "t",
  lines: [{ lineId: "L1", catalogBasis: basis }],
  catalogStore: emptyKnrCatalogStore(NOW),
  nowIso: NOW,
})).httpRequestCount === 0);

{
  const adapterSrc = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-host-kl3-adapter.ts"),
    "utf8",
  );
  assert("HOST-15 no fetch in adapter", !adapterSrc.includes("fetch("));
  assert("HOST-16 no LLM in adapter", !/llm|openai|gpt/i.test(adapterSrc));
  assert("HOST-25 no second resolver name", !adapterSrc.match(/function resolveKnrKnowledge(?!Kl3b)/));
  assert("HOST-18 no localStorage in adapter", !adapterSrc.includes("localStorage"));
}

{
  const expertSrc = readFileSync(join(root, "src/lib/intelligent-estimator/ik-knr-expert.ts"), "utf8");
  assert("HOST-21 Expert unchanged import", !expertSrc.includes("knr-host-kl3") && !expertSrc.includes("knr-research-kl3b"));
}

{
  const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
  const orchestraSrc = readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts"), "utf8")
    + readFileSync(join(root, "src/lib/intelligent-estimator/orchestra/ik-orchestra-runtime.ts"), "utf8");
  const vmBlock = hostSrc.slice(hostSrc.indexOf("buildIkEntryConversationViewModel"));
  assert("HOST-19 no catalogBasis write", !hostSrc.includes("catalogBasis =") && !orchestraSrc.includes("catalogBasis ="));
  assert("HOST-20 no catalogWorkId write in host", !hostSrc.includes("catalogWorkId =") && !orchestraSrc.includes("catalogWorkId ="));
  assert("HOST-22 VM no knrKnowledge opt", !vmBlock.slice(0, 1200).includes("knrKnowledge"));
  assert("HOST-23 P5 unchanged executeResearch", orchestraSrc.includes("executeResearch: opts.p5ResearchOn"));
  assert("HOST-17 no auto VERIFIED in host", !hostSrc.includes("persistVerifiedKnrCatalogEntry") && !orchestraSrc.includes("persistVerifiedKnrCatalogEntry"));
  assert("HOST-24 no cloud-sync import", !hostSrc.includes("cloud-sync") && !orchestraSrc.includes("cloud-sync"));
}

{
  const key = buildKnrHostKnowledgeAttemptKey("t1", [{ lineId: "L1", catalogBasis: basis }]);
  assert("HOST attempt key deterministic", key.includes("lookup-only"));
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

console.log(`\nKL-3 HOST harness: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
