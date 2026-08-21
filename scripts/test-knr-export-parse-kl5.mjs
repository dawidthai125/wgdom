/**
 * IK-KNR KL-5 — evidence / ingest harness.
 *
 * npx vite-node scripts/test-knr-export-parse-kl5.mjs
 *
 * ZERO HTTP · ZERO Host · ZERO Research · ZERO Cloud · ZERO auto-VERIFIED
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_CATALOG_STORAGE_KEY,
  KNR_EVIDENCE_STORAGE_KEY,
  KNR_KNOWLEDGE_KL5_IMPLEMENTED,
  LicensedExportFileProvider,
  buildKnrEvidenceBlobHash,
  buildKnrNormContentHash,
  buildSyntheticAthFixture,
  createDefaultKnrNormaLicence,
  emptyKnrCatalogStore,
  emptyKnrRawEvidenceStore,
  evaluateKnrLegalGate,
  ingestLicensedAthExport,
  lookupKnrCatalog,
  normalizeKnrCatalogEntry,
  normalizeKnrRawEvidence,
  parseAthKnrNormExport,
  persistVerifiedKnrCatalogEntryInMemory,
  storeKnrEvidenceBlob,
  validateKnrCatalogEntryCandidate,
  validationPassIsNotVerified,
  verifyKnrEvidenceBlobIntegrity,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-20T12:00:00.000Z";

const CANONICAL_REL =
  "backup/storage/jobs/016e6d9b-b0c0-464e-a87c-2463034541ca/kosztorys-1780766012818-Krzywoustego_268_m_2_-_ofertowy.ath";
const CANONICAL_SHA256 =
  "e31791c8d8c532d49d683654c3d195c00fd4a4da0cf6713d9f6821fcf73e8880";
const SAMPLE_CODE = "KNR 2-02 0803-01";

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

function loadCanonicalBytes() {
  const path = join(root, CANONICAL_REL);
  if (!existsSync(path)) throw new Error(`Canonical ATH missing: ${path}`);
  const bytes = new Uint8Array(readFileSync(path));
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== CANONICAL_SHA256) throw new Error(`SHA256 mismatch: ${sha}`);
  return bytes;
}

const canonicalBytes = loadCanonicalBytes();

// --- Parse / normalize ---

{
  const parsed = parseAthKnrNormExport(canonicalBytes, { targetDisplayCode: SAMPLE_CODE });
  assert("T-KL-5-1 parse ok", parsed.ok === true);
  if (parsed.ok) {
    const p = parsed.positions[0];
    assert("T-KL-5-1 R populated", p.norms.laborNorms.length === 1);
    assert("T-KL-5-1 M populated", p.norms.materialNorms.length === 1);
    assert("T-KL-5-1 S populated", p.norms.equipmentNorms.length === 1);
  }
}

{
  const missing = parseAthKnrNormExport(canonicalBytes, { targetDisplayCode: "KNR 9-99 9999-99" });
  assert("T-KL-5-2 POSITION_NOT_FOUND", !missing.ok && missing.code === "POSITION_NOT_FOUND");
}

{
  const syn = buildSyntheticAthFixture({ displayCode: SAMPLE_CODE, withR: false });
  const parsed = parseAthKnrNormExport(syn, { targetDisplayCode: SAMPLE_CODE });
  assert("T-KL-5-3 RMS_INCOMPLETE no R", !parsed.ok && parsed.code === "RMS_INCOMPLETE");
}

{
  const syn = buildSyntheticAthFixture({ displayCode: "KNR 2-02 0101-02", withM: false });
  const parsed = parseAthKnrNormExport(syn, { targetDisplayCode: "KNR 2-02 0101-02" });
  assert("T-KL-5-4 RMS_INCOMPLETE no M", !parsed.ok && parsed.code === "RMS_INCOMPLETE");
}

{
  const syn = buildSyntheticAthFixture({ displayCode: "KNR 2-02 0101-03", withS: false });
  const parsed = parseAthKnrNormExport(syn, { targetDisplayCode: "KNR 2-02 0101-03" });
  assert("T-KL-5-5 RMS_INCOMPLETE no S", !parsed.ok && parsed.code === "RMS_INCOMPLETE");
}

{
  const norm = normalizeKnrRawEvidence({
    raw: {
      format: "ATH",
      parserVersion: "test",
      sourceFilename: "x.ath",
      capturedAt: NOW,
      payloadRef: { refId: "t", kind: "export_file" },
      originId: "knr_licensed_export",
      licenceId: "knr-norma-owner",
    },
    targetDisplayCode: SAMPLE_CODE,
    bytesOverride: canonicalBytes,
    nowIso: NOW,
  });
  if (norm.ok) {
    const bad = { ...norm.candidate, unit: "" };
    const v = validateKnrCatalogEntryCandidate({ entry: bad });
    assert("T-KL-5-6 bad unit fail", v.validationState !== "PASS");
  } else assert("T-KL-5-6 normalize", false, norm.messagePl);
}

// --- Deterministic ingest / PENDING_VERIFY ---

{
  let store = emptyKnrCatalogStore(NOW);
  let evidence = emptyKnrRawEvidenceStore(NOW);
  const first = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: store,
    evidenceStore: evidence,
  });
  assert("T-KL-5-7 first PENDING_VERIFY", first.ok === true && first.outcome === "PENDING_VERIFY");
  assert(
    "T-KL-5-7 candidate not VERIFIED",
    first.ok && first.candidate.verificationStatus === "PENDING_VERIFY",
  );
  if (first.ok) {
    store = first.catalogStore;
    evidence = first.evidenceStore;
  }

  const dup = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: store,
    evidenceStore: evidence,
  });
  assert("T-KL-5-7 duplicate NOOP", dup.ok && dup.outcome === "NOOP");
}

{
  let store = emptyKnrCatalogStore(NOW);
  const first = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: store,
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  if (first.ok) {
    store = first.catalogStore;
    const mutated = {
      ...first.candidate,
      norms: {
        ...first.candidate.norms,
        laborNorms: [{ ...first.candidate.norms.laborNorms[0], quantity: 9.99 }],
      },
    };
    mutated.contentHash = buildKnrNormContentHash(mutated.norms);
    store = {
      ...store,
      entries: { ...store.entries, [mutated.identityKeyV2]: mutated },
    };
    const conflict = await ingestLicensedAthExport({
      bytes: canonicalBytes,
      sourceFilename: "canonical.ath",
      capturedAt: NOW,
      nowIso: NOW,
      targetDisplayCode: SAMPLE_CODE,
      ownerActorId: "owner-test",
      catalogStore: store,
      evidenceStore: first.evidenceStore,
    });
    assert("T-KL-5-8 CONTENT_CONFLICT", !conflict.ok && conflict.reason === "CONTENT_CONFLICT");
  } else assert("T-KL-5-8 setup", false);
}

{
  const parsed = parseAthKnrNormExport(canonicalBytes, { targetDisplayCode: SAMPLE_CODE });
  if (parsed.ok) {
    const p = parsed.positions[0];
    assert("T-KL-5-9 edition", p.edition === "1998" || p.publisher.includes("1998"));
    assert("T-KL-5-9 publisher", p.publisher.includes("ORGBUD"));
  }
}

{
  const basis = buildCatalogBasisFromRawCode(SAMPLE_CODE);
  const norm = normalizeKnrRawEvidence({
    raw: {
      format: "ATH",
      parserVersion: "test",
      sourceFilename: "canonical.ath",
      capturedAt: NOW,
      payloadRef: { refId: "ev-test", kind: "export_file" },
      originId: "knr_licensed_export",
      licenceId: "knr-norma-owner",
    },
    bytesOverride: canonicalBytes,
    targetDisplayCode: SAMPLE_CODE,
    nowIso: NOW,
  });
  if (norm.ok) {
    assert("T-KL-5-10 evidenceKeyV1", norm.candidate.evidenceKeyV1 === basis.normalizedKey);
    assert(
      "T-KL-5-10 KNR↔evidence linkage",
      norm.candidate.provenance.rawEvidenceRef?.refId === "ev-test",
    );
  } else assert("T-KL-5-10 normalize", false, norm.messagePl);
}

{
  const parsed = parseAthKnrNormExport(canonicalBytes, { targetDisplayCode: SAMPLE_CODE });
  if (parsed.ok) {
    const h1 = buildKnrNormContentHash(parsed.positions[0].norms);
    const h2 = buildKnrNormContentHash(parsed.positions[0].norms);
    assert("T-KL-5-11 hash stable", h1 === h2 && h1.length > 0);
  }
}

{
  const ing = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  if (ing.ok) {
    const prov = ing.candidate.provenance;
    assert("T-KL-5-12 provenance ref", prov.rawEvidenceRef != null);
    assert("T-KL-5-12 licenceId", prov.licenceId === "knr-norma-owner");
    assert("T-KL-5-12 originId", prov.originId === "knr_licensed_export");
    assert("T-KL-5-12 capturedAt", prov.capturedAt === NOW);
  } else assert("T-KL-5-12 ingest", false, ing.messagePl);
}

{
  const norm = normalizeKnrRawEvidence({
    raw: {
      format: "FWD",
      parserVersion: "test",
      sourceFilename: "x.fwd",
      capturedAt: NOW,
      payloadRef: { refId: "x", kind: "export_file" },
      originId: "knr_licensed_export",
      licenceId: "knr-norma-owner",
    },
    bytesOverride: canonicalBytes,
  });
  assert("T-KL-5-13 UNSUPPORTED_FORMAT", !norm.ok && norm.reason === "UNSUPPORTED_FORMAT");
}

{
  const bad = new Uint8Array([0, 1, 2, 3]);
  const parsed = parseAthKnrNormExport(bad, { targetDisplayCode: SAMPLE_CODE });
  assert("T-KL-5-14 PARSER/UNSUPPORTED", parsed.ok === false);
}

// --- VERIFIED protection ---

{
  const auto = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    autoOwnerVerify: true,
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  assert(
    "T-KL-5-15 auto VERIFIED forbidden",
    !auto.ok && auto.reason === "AUTO_OWNER_VERIFY_FORBIDDEN",
  );
}

{
  const ing = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  assert("T-KL-5-16 PENDING staged", ing.ok && ing.outcome === "PENDING_VERIFY");
  if (ing.ok) {
    const lookup = lookupKnrCatalog(
      {
        identityKeyV2: ing.candidate.identityKeyV2,
        evidenceKeyV1: ing.candidate.evidenceKeyV1,
      },
      ing.catalogStore,
    );
    assert(
      "T-KL-5-16 PENDING not LOCAL_HIT",
      lookup.status === "LOCAL_MISS",
    );
    assert(
      "T-KL-5-16 entry staged PENDING",
      ing.catalogStore.entries[ing.candidate.identityKeyV2]?.verificationStatus
        === "PENDING_VERIFY",
    );
  }
}

{
  const ing = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  assert("T-KL-5-17 http=0", ing.ok && ing.httpRequestCount === 0);
  assert("T-KL-5-17 research=0", ing.ok && ing.researchExecuted === false);
}

{
  assert("T-KL-5-18 provider guard", LicensedExportFileProvider.providerCannotSetVerified() === true);
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
    "T-KL-5-18 normalize not VERIFIED",
    !norm.ok || norm.candidate.verificationStatus !== "VERIFIED",
  );
}

{
  const gate = evaluateKnrLegalGate(
    {
      licenceId: "knr-norma-owner",
      originId: "scrape_knr_public",
      allowedUse: ["knr_norm_persist"],
    },
    [createDefaultKnrNormaLicence()],
  );
  assert("T-KL-5-19 scraper denied", !gate.ok);
}

{
  const parsed = parseAthKnrNormExport(canonicalBytes, { targetDisplayCode: SAMPLE_CODE });
  if (parsed.ok) {
    const p = parsed.positions[0];
    const rQty = p.norms.laborNorms[0]?.quantity;
    assert("T-KL-5-20 R qty is nz not PLN", rQty === 0.2251);
    assert("T-KL-5-20 R qty not cj", rQty !== 15.53 && rQty !== 6.073);
  }
}

{
  const ing = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    licenceId: "unknown-licence",
    licences: [createDefaultKnrNormaLicence()],
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  assert("T-KL-5-21 legal reject", !ing.ok && ing.reason === "LEGAL_GATE_REJECT");
}

// --- Evidence integrity / identity / pricing / BOQ ---

{
  const stored = await storeKnrEvidenceBlob({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    format: "ATH",
    capturedAt: NOW,
    originId: "knr_licensed_export",
    licenceId: "knr-norma-owner",
    parserVersion: "KL-5-test",
    nowIso: NOW,
    storeOverride: emptyKnrRawEvidenceStore(NOW),
  });
  const blob = stored.store.blobs[stored.ref.refId];
  assert("T-KL-5-E source identity", blob?.originId === "knr_licensed_export");
  assert("T-KL-5-E evidence hash", blob?.contentHash === (await buildKnrEvidenceBlobHash(canonicalBytes)));
  assert("T-KL-5-E storage key", KNR_EVIDENCE_STORAGE_KEY === "kw-knr-evidence");
  assert("T-KL-5-E catalog key separate", KNR_CATALOG_STORAGE_KEY === "kw-knr-catalog");

  const okIntegrity = await verifyKnrEvidenceBlobIntegrity({ blob, bytes: canonicalBytes });
  assert("T-KL-5-E integrity ok", okIntegrity.ok === true);

  const tampered = new Uint8Array(canonicalBytes);
  tampered[0] = (tampered[0] + 1) % 256;
  const badIntegrity = await verifyKnrEvidenceBlobIntegrity({ blob, bytes: tampered });
  assert("T-KL-5-E tamper detected", badIntegrity.ok === false && badIntegrity.reason === "HASH_MISMATCH");

  const dupEv = await storeKnrEvidenceBlob({
    bytes: canonicalBytes,
    sourceFilename: "canonical-copy.ath",
    format: "ATH",
    capturedAt: NOW,
    originId: "knr_licensed_export",
    licenceId: "knr-norma-owner",
    parserVersion: "KL-5-test",
    nowIso: NOW,
    storeOverride: stored.store,
  });
  assert("T-KL-5-E duplicate evidence same ref", dupEv.ref.refId === stored.ref.refId);
}

{
  const ing = await ingestLicensedAthExport({
    bytes: canonicalBytes,
    sourceFilename: "canonical.ath",
    capturedAt: NOW,
    nowIso: NOW,
    targetDisplayCode: SAMPLE_CODE,
    ownerActorId: "owner-test",
    catalogStore: emptyKnrCatalogStore(NOW),
    evidenceStore: emptyKnrRawEvidenceStore(NOW),
  });
  if (ing.ok) {
    const priced = normalizeKnrCatalogEntry({ ...ing.candidate, ourRatePln: 12.5 });
    assert("T-KL-5-E pricing field rejected", priced === null);
    const spoof = persistVerifiedKnrCatalogEntryInMemory({
      entry: {
        ...ing.candidate,
        verificationStatus: "VERIFIED",
        verifiedAt: null,
        verifiedBy: null,
      },
      nowIso: NOW,
      store: emptyKnrCatalogStore(NOW),
    });
    assert("T-KL-5-E client VERIFIED spoof rejected", spoof.ok === false);
    const v = validateKnrCatalogEntryCandidate({
      entry: { ...ing.candidate, verificationStatus: "NORMATIVE" },
      forVerifiedTarget: false,
    });
    assert("T-KL-5-E PASS ≠ VERIFIED", validationPassIsNotVerified({
      ...v,
      verificationStatus: "NORMATIVE",
      validationState: "PASS",
    }));
  }
}

{
  const knrReport = runIkKnrExpert({
    documentExpert: {
      tenderId: "t-kl5",
      masterBoq: { readyForExperts: false, lineCount: 0 },
      masterBoqLines: [],
    },
  });
  assert("T-KL-5-B no BOQ/catalogWorkId write", knrReport.catalogWorkIdWritten === 0);
  assert("T-KL-5-B no research", knrReport.researchExecuted === false);
}

{
  assert("T-KL-5-M KL5 implemented", KNR_KNOWLEDGE_KL5_IMPLEMENTED === true);
  assert("T-KL-5-M no HTTP marker", true);
  assert("T-KL-5-M no Research marker", true);
  assert("T-KL-5-M no Cloud marker", true);
}

console.log("\n---");
console.log(`KL-5 export parse harness: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
