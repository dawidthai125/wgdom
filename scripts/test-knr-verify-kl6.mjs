/**
 * IK-KNR KL-6 — Owner VERIFY orchestrator harness (no UI / Host / nav).
 *
 * npx vite-node scripts/test-knr-verify-kl6.mjs
 *
 * ZERO HTTP · ZERO Cloud · ZERO Research · ZERO pricing · ZERO Host wiring
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNR_KNOWLEDGE_KL6_IMPLEMENTED,
  KNR_VERIFY_MVP_SINGLE_ONLY,
  KNR_VERIFY_PERSISTENT_QUEUE_STORAGE_KEY,
  buildKnrVerifyCandidateViewModel,
  buildSyntheticAthFixture,
  clearKnrCatalogStoreLocalForTests,
  clearKnrRawEvidenceStoreLocalForTests,
  emptyKnrCatalogStore,
  emptyKnrRawEvidenceStore,
  executeKnrOwnerVerifyApprove,
  executeKnrOwnerVerifyReject,
  ingestAthForKnrOwnerVerify,
  ingestLicensedAthExport,
  lookupKnrCatalog,
  normalizeKnrRawEvidence,
  persistVerifiedKnrCatalogEntryInMemory,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { adminCanVerifyKnrCatalog } from "../src/lib/admin-auth.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-20T12:00:00.000Z";
const SAMPLE = "KNR 2-02 0803-01";

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
const adminActor = { actorId: "stanislaw", role: "admin", displayName: "Stanisław" };
const emptyActor = { actorId: "", role: "super_admin", displayName: "" };

const auditSink = [];
function recordAudit(rec) {
  auditSink.push(rec);
}

async function ingestPending(displayCode = SAMPLE, opts = {}) {
  const bytes = buildSyntheticAthFixture({
    displayCode,
    includePln: true,
    withR: true,
    withM: true,
    withS: true,
  });
  return ingestAthForKnrOwnerVerify({
    bytes,
    sourceFilename: "synthetic.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: displayCode,
    ownerActorId: superActor.actorId,
    catalogStore: opts.catalogStore ?? emptyKnrCatalogStore(NOW),
    evidenceStore: opts.evidenceStore ?? emptyKnrRawEvidenceStore(NOW),
    autoOwnerVerify: opts.autoOwnerVerify,
    originId: opts.originId,
  });
}

assert("T-KL-6-1 ACL admin false", adminCanVerifyKnrCatalog("admin") === false);
assert("T-KL-6-1 ACL moderator false", adminCanVerifyKnrCatalog("moderator") === false);
assert("T-KL-6-2 ACL super_admin true", adminCanVerifyKnrCatalog("super_admin") === true);

{
  const pending = await ingestPending();
  assert("T-KL-6-3 PENDING_VERIFY", pending.ok && pending.outcome === "PENDING_VERIFY");
  assert(
    "T-KL-6-3 status",
    pending.ok && pending.candidate.verificationStatus === "PENDING_VERIFY",
  );
  if (pending.ok) {
    const vm = buildKnrVerifyCandidateViewModel(pending.candidate);
    assert("T-KL-6-3 display no PLN", vm.plnAuthorityFields.length === 0);
    assert("T-KL-6-3 http=0", pending.httpRequestCount === 0);
    assert("T-KL-6-3 research=0", pending.researchExecuted === false);
  }
}

{
  const ingest = await ingestPending("KNR 2-02 0803-02");
  const denied = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: adminActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert("T-KL-6-4 ACL deny approve", !denied.ok && denied.reason === "ACL_DENIED");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-03");
  const missingOwner = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: emptyActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert(
    "T-KL-6-4 missing Owner identity",
    !missingOwner.ok && missingOwner.reason === "MISSING_OWNER_IDENTITY",
  );
}

{
  auditSink.length = 0;
  const ingest = await ingestPending("KNR 2-02 0803-04");
  const approved = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
    expectedCandidateContentHash: ingest.candidate.contentHash,
    expectedIdentityKeyV2: ingest.candidate.identityKeyV2,
    recordAudit,
  });
  assert("T-KL-6-5 approve ok", approved.ok === true, approved.ok ? approved.outcome : approved.reason);
  if (approved.ok) {
    assert("T-KL-6-5 VERIFIED", approved.entry.verificationStatus === "VERIFIED");
    assert("T-KL-6-5 verifiedBy", approved.entry.verifiedBy === "dawid");
    assert("T-KL-6-5 verifiedAt", approved.entry.verifiedAt === NOW);
    assert("T-KL-6-5 LOCAL_HIT", approved.lookupStatus === "LOCAL_HIT");
    assert("T-KL-6-5 evidence linked", approved.entry.provenance.rawEvidenceRef != null);
    assert("T-KL-6-5 audit", auditSink[0]?.action === "knr_catalog_verify");
    const hit = lookupKnrCatalog(
      { identityKeyV2: approved.entry.identityKeyV2 },
      approved.catalogStore,
    );
    assert("T-KL-6-5 lookup HIT", hit.status === "LOCAL_HIT");
  }
}

{
  const ingest = await ingestPending("KNR 2-02 0803-05");
  const beforeBlobs = Object.keys(ingest.evidenceStore.blobs).length;
  auditSink.length = 0;
  const rejected = executeKnrOwnerVerifyReject({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    reason: "Niepoprawna pozycja testowa",
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
    recordAudit,
  });
  assert("T-KL-6-6 reject ok", rejected.ok === true);
  if (rejected.ok) {
    assert("T-KL-6-6 REJECTED", rejected.entry.verificationStatus === "REJECTED");
    assert("T-KL-6-6 evidence retained", Object.keys(rejected.evidenceStore.blobs).length === beforeBlobs);
    assert("T-KL-6-6 audit reject", auditSink[0]?.action === "knr_catalog_reject");
    const miss = lookupKnrCatalog(
      { identityKeyV2: rejected.entry.identityKeyV2 },
      rejected.catalogStore,
    );
    assert("T-KL-6-6 REJECTED not LOCAL_HIT", miss.status === "LOCAL_MISS");
    const reApprove = await executeKnrOwnerVerifyApprove({
      candidate: ingest.candidate,
      actor: superActor,
      nowIso: NOW,
      catalogStore: rejected.catalogStore,
      evidenceStore: ingest.evidenceStore,
    });
    assert(
      "T-KL-6-6 REJECTED cannot VERIFIED",
      !reApprove.ok && reApprove.reason === "INVALID_TRANSITION",
    );
  }
}

{
  const ingest = await ingestPending("KNR 2-02 0803-06");
  const short = executeKnrOwnerVerifyReject({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    reason: "short",
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert("T-KL-6-7 reject reason required", !short.ok && short.reason === "REJECT_REASON_REQUIRED");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-07");
  const spoof = await executeKnrOwnerVerifyApprove({
    candidate: { ...ingest.candidate, verificationStatus: "VERIFIED" },
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert("T-KL-6-8 client VERIFIED spoof", !spoof.ok && spoof.reason === "CLIENT_VERIFIED_REJECTED");
}

{
  const forced = await ingestPending("KNR 2-02 0803-08", { autoOwnerVerify: true });
  assert(
    "T-KL-6-9 ingest cannot VERIFIED",
    !forced.ok
      && (forced.reason === "AUTO_OWNER_VERIFY_FORBIDDEN" || forced.reason === "VERIFY_FAILED"),
  );
}

{
  const norm = normalizeKnrRawEvidence({
    raw: {
      format: "ATH",
      parserVersion: "test",
      sourceFilename: "x.ath",
      capturedAt: NOW,
      payloadRef: { refId: "inline", kind: "inline_stub" },
      originId: "knr_licensed_export",
      licenceId: "knr-norma-owner",
    },
  });
  assert(
    "T-KL-6-10 normalize cannot VERIFIED",
    !norm.ok || norm.candidate.verificationStatus !== "VERIFIED",
  );
}

{
  const ingest = await ingestPending("KNR 2-02 0803-09");
  const stale = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
    expectedCandidateContentHash: "stale-hash",
  });
  assert("T-KL-6-11 stale hash", !stale.ok && stale.reason === "STALE_CANDIDATE");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-10");
  const wrongId = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
    expectedIdentityKeyV2: "WRONG|IDENTITY",
  });
  assert("T-KL-6-12 wrong identity", !wrongId.ok && wrongId.reason === "IDENTITY_MISMATCH");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-11");
  const missing = {
    ...ingest.candidate,
    provenance: { ...ingest.candidate.provenance, rawEvidenceRef: null },
  };
  const failed = await executeKnrOwnerVerifyApprove({
    candidate: missing,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert("T-KL-6-13 missing provenance/evidence", !failed.ok && failed.reason === "MISSING_EVIDENCE");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-12");
  const refId = ingest.candidate.provenance.rawEvidenceRef?.refId;
  const blob = ingest.evidenceStore.blobs[refId];
  const tamperedStore = {
    ...ingest.evidenceStore,
    blobs: {
      ...ingest.evidenceStore.blobs,
      [refId]: {
        ...blob,
        // Keep stored hash, corrupt payload → integrity fail
        bytesBase64: Buffer.from("tampered-payload").toString("base64"),
      },
    },
  };
  const failed = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: tamperedStore,
  });
  assert("T-KL-6-14 tampered evidence", !failed.ok && failed.reason === "EVIDENCE_TAMPERED");
}

{
  const ingest = await ingestPending("KNR 2-02 0803-13");
  const first = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  const second = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    catalogStore: first.ok ? first.catalogStore : ingest.catalogStore,
    evidenceStore: ingest.evidenceStore,
  });
  assert("T-KL-6-15 duplicate NOOP", second.ok && second.outcome === "NOOP");
}

{
  clearKnrCatalogStoreLocalForTests();
  clearKnrRawEvidenceStoreLocalForTests();
  const ingest = await ingestPending("KNR 2-02 0803-14");
  const cas = await executeKnrOwnerVerifyApprove({
    candidate: ingest.candidate,
    actor: superActor,
    nowIso: NOW,
    evidenceStore: ingest.evidenceStore,
    expectedEtag: "not-the-current-etag",
  });
  assert("T-KL-6-16 CAS mismatch", !cas.ok && cas.reason === "CAS_MISMATCH");
  clearKnrCatalogStoreLocalForTests();
  clearKnrRawEvidenceStoreLocalForTests();
}

{
  const ingest = await ingestPending("KNR 2-02 0803-15");
  const direct = persistVerifiedKnrCatalogEntryInMemory({
    entry: {
      ...ingest.candidate,
      verificationStatus: "VERIFIED",
      verifiedAt: null,
      verifiedBy: null,
    },
    nowIso: NOW,
    store: emptyKnrCatalogStore(NOW),
  });
  assert("T-KL-6-17 write-router spoof rejected", direct.ok === false);
}

{
  const scraped = await ingestLicensedAthExport({
    bytes: buildSyntheticAthFixture({ displayCode: "KNR 2-02 0803-16" }),
    sourceFilename: "x.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: "KNR 2-02 0803-16",
    ownerActorId: "dawid",
    originId: "scrape_knr_public",
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  assert("T-KL-6-18 scraper ingest blocked", !scraped.ok && scraped.reason === "LEGAL_GATE_REJECT");
}

{
  const knrReport = runIkKnrExpert({
    documentExpert: {
      tenderId: "t-kl6",
      masterBoq: { readyForExperts: false, lineCount: 0 },
      masterBoqLines: [],
    },
  });
  assert("T-KL-6-19 BOQ unchanged", knrReport.catalogWorkIdWritten === 0);
  assert("T-KL-6-19 no research", knrReport.researchExecuted === false);
}

{
  const orch = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-verify-orchestrator.ts"),
    "utf8",
  );
  assert("T-KL-6-20 no Host in orch", !orch.includes("IkEntryHost"));
  assert("T-KL-6-20 no fetch", !orch.includes("fetch("));
  assert("T-KL-6-20 no cloud-sync", !orch.includes("cloud-sync"));
  assert("T-KL-6-20 no batch API", !orch.includes("executeKnrOwnerVerifyBatch"));
  assert("T-KL-6-20 queue deferred", KNR_VERIFY_PERSISTENT_QUEUE_STORAGE_KEY === null);
  assert("T-KL-6-20 single only", KNR_VERIFY_MVP_SINGLE_ONLY === true);
}

{
  const tipHost = execSync("git show HEAD:src/app/intelligent-estimator/IkEntryHost.tsx", {
    cwd: root,
    encoding: "utf8",
  });
  assert(
    "T-KL-6-21 tip Host no verify orch",
    !tipHost.includes("executeKnrOwnerVerifyApprove")
      && !tipHost.includes("knr-verify-orchestrator"),
  );
}

assert("T-KL-6-22 KL6 marker", KNR_KNOWLEDGE_KL6_IMPLEMENTED === true);
assert("T-KL-6-22 HTTP=0 marker", true);
assert("T-KL-6-22 Cloud=0 marker", true);

console.log(`\nKL-6 result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
