/**
 * IK-KNR KL-1 — catalog store + lookup harness (T-KL-1-1…15 + boundary extras).
 *
 * npx vite-node scripts/test-knr-catalog-store-kl1.mjs
 *
 * ZERO HTTP · ZERO Host · ZERO cloud · ZERO Research · ZERO pricing.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogBasisFromRawCode } from "../src/lib/tenders-bzp-brief.ts";
import {
  KNR_KNOWLEDGE_KL1_IMPLEMENTED,
  clearKnrCatalogStoreLocalForTests,
  emptyKnrCatalogStore,
  foldIdentityKeyV2,
  lookupKnrCatalog,
  normalizeKnrCatalogEntry,
  parseIdentityPartialFromCatalogBasis,
  persistVerifiedKnrCatalogEntry,
  persistVerifiedKnrCatalogEntryInMemory,
  planKnrOwnerVerifyTransition,
  rebuildKnrAliasIndex,
  validateKnrCatalogEntryCandidate,
  KNR_CATALOG_STORAGE_KEY,
  loadKnrCatalogStoreLocal,
  buildKnrNormContentHash,
} from "../src/lib/intelligent-estimator/knr-knowledge/index.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const NOW = "2026-08-19T12:00:00.000Z";

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
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

function buildVerifiedFixture(nowIso = NOW) {
  const CODE = "KNR 2-02 0101-01";
  const basis = buildCatalogBasisFromRawCode(CODE);
  const partial = parseIdentityPartialFromCatalogBasis(basis);
  const identity = {
    ...partial,
    publisher: "FIXTURE_PUBLISHER",
    edition: "2024",
    table: partial.table ?? "0101-01",
  };
  const identityKeyV2 = foldIdentityKeyV2(identity);
  const norms = {
    laborNorms: [{ kind: "R", code: "r-fix", description: "Robocizna", unit: "rb", quantity: 1.2 }],
    materialNorms: [{ kind: "M", code: "m-fix", description: "Materiał", unit: "kg", quantity: 0.5 }],
    equipmentNorms: [{ kind: "S", code: "s-fix", description: "Sprzęt", unit: "m-g", quantity: 0.1 }],
  };
  let entry = {
    schemaVersion: 1,
    identityKeyV2,
    evidenceKeyV1: partial.evidenceKeyV1,
    identity,
    originalSourceCode: CODE,
    displayCode: CODE,
    description: "Fixture pozycja KNR",
    unit: "m2",
    norms,
    provenance: {
      sourceType: "OWNER_MANUAL",
      sourceIdentifier: "kl1-fixture",
      acquisitionMethod: "MANUAL_OWNER",
      capturedAt: nowIso,
      parserVersion: "KL-1-fixture",
      contentHash: "",
      rawEvidenceRef: { refId: "fixture-ref", kind: "inline_stub" },
      revision: 1,
      originId: "knr_manual_owner",
      licenceId: "FIXTURE",
    },
    verificationStatus: "PENDING_VERIFY",
    validationState: "PASS",
    lifecycleState: "ACTIVE",
    contentHash: "",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const validated = validateKnrCatalogEntryCandidate({ entry, forVerifiedTarget: true });
  entry = { ...entry, validationState: validated.validationState, contentHash: validated.contentHash };
  const verified = planKnrOwnerVerifyTransition({
    entry,
    action: "VERIFY",
    actorId: "owner-fixture",
    nowIso,
  });
  if (!verified.ok) throw new Error("fixture verify failed");
  return { entry: verified.entry, identityKeyV2, evidenceKeyV1: partial.evidenceKeyV1, basis };
}

// T-KL-1-1 empty catalog → MISS
{
  const store = emptyKnrCatalogStore();
  const { identityKeyV2 } = buildVerifiedFixture();
  const result = lookupKnrCatalog({ identityKeyV2 }, store);
  assert("T-KL-1-1 empty catalog MISS", result.status === "LOCAL_MISS");
}

// T-KL-1-2 exact identity → HIT
{
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  const persisted = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store });
  store = persisted.store;
  const result = lookupKnrCatalog({ identityKeyV2 }, store);
  assert("T-KL-1-2 exact identity HIT", result.status === "LOCAL_HIT");
}

// T-KL-1-3 alias → HIT
{
  const { entry, identityKeyV2, evidenceKeyV1 } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  store = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store }).store;
  const result = lookupKnrCatalog(
    { identityKeyV2: "UNKNOWN|KEY", evidenceKeyV1 },
    store,
  );
  assert("T-KL-1-3 alias HIT", result.status === "LOCAL_HIT" && result.identityKeyV2 === identityKeyV2);
}

// T-KL-1-4 different identity → MISS
{
  const { entry } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  store = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store }).store;
  const result = lookupKnrCatalog({ identityKeyV2: "KNR|9-99|||||9999-99||" }, store);
  assert("T-KL-1-4 different identity MISS", result.status === "LOCAL_MISS");
}

// T-KL-1-5 invalid identity → INVALID
{
  const store = emptyKnrCatalogStore();
  const result = lookupKnrCatalog({ identityKeyV2: "" }, store);
  assert("T-KL-1-5 invalid EMPTY_KEY", result.status === "INVALID_LOOKUP" && result.reason === "EMPTY_KEY");
}

// T-KL-1-6 unverified cannot serve / write-router rejects
{
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  const unverified = { ...entry, verificationStatus: "NORMATIVE", verifiedAt: null, verifiedBy: null };
  let store = emptyKnrCatalogStore();
  store = {
    ...store,
    entries: { [identityKeyV2]: unverified },
    aliasIndex: rebuildKnrAliasIndex({ [identityKeyV2]: unverified }),
  };
  const lookup = lookupKnrCatalog({ identityKeyV2 }, store);
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: unverified,
    nowIso: NOW,
    store,
  });
  assert("T-KL-1-6 unverified lookup MISS", lookup.status === "LOCAL_MISS");
  assert("T-KL-1-6 unverified write rejected", write.ok === false && write.reason === "NOT_VERIFIED");
}

// T-KL-1-7 verified via write-router + localStorage reload HIT
{
  clearKnrCatalogStoreLocalForTests();
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  const write = persistVerifiedKnrCatalogEntry({ entry, nowIso: NOW });
  const reloaded = loadKnrCatalogStoreLocal();
  const lookup = lookupKnrCatalog({ identityKeyV2 }, reloaded);
  assert("T-KL-1-7 write-router CREATED", write.ok === true && write.outcome === "CREATED");
  assert("T-KL-1-7 reload HIT", lookup.status === "LOCAL_HIT");
  clearKnrCatalogStoreLocalForTests();
}

// T-KL-1-8 duplicate same hash → NOOP
{
  const { entry } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  const first = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store });
  store = first.store;
  const second = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store });
  assert("T-KL-1-8 duplicate NOOP", second.ok === true && second.outcome === "NOOP");
}

// T-KL-1-9 R/M/S separate
{
  const { entry } = buildVerifiedFixture();
  assert(
    "T-KL-1-9 R/M/S separate",
    entry.norms.laborNorms.every((l) => l.kind === "R")
      && entry.norms.materialNorms.every((l) => l.kind === "M")
      && entry.norms.equipmentNorms.every((l) => l.kind === "S"),
  );
}

// T-KL-1-10 pricing fields rejected at normalize
{
  const { entry } = buildVerifiedFixture();
  const rejected = normalizeKnrCatalogEntry({ ...entry, ourRatePln: 100 });
  assert("T-KL-1-10 pricing field rejected", rejected === null);
}

// T-KL-1-11 lookup HTTP=0
{
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  store = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store }).store;
  const result = lookupKnrCatalog({ identityKeyV2 }, store);
  assert(
    "T-KL-1-11 HTTP=0",
    result.status === "LOCAL_HIT" && result.httpRequestCount === 0,
  );
}

// T-KL-1-12 lookup research=0
{
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  store = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store }).store;
  const result = lookupKnrCatalog({ identityKeyV2 }, store);
  assert(
    "T-KL-1-12 research=0",
    result.status === "LOCAL_HIT" && result.researchExecuted === false,
  );
}

// T-KL-1-13 catalogBasis untouched
{
  const CODE = "KNR 2-02 0101-01";
  const basis = buildCatalogBasisFromRawCode(CODE);
  const copy = JSON.stringify(basis);
  parseIdentityPartialFromCatalogBasis(basis);
  assert("T-KL-1-13 catalogBasis unchanged", JSON.stringify(basis) === copy);
}

// T-KL-1-14 catalogWorkId untouched (Slice B)
{
  const knrReport = runIkKnrExpert({
    tenderId: "t1",
    documentExpert: {
      tenderId: "t1",
      masterBoq: { readyForExperts: false, lineCount: 0 },
      masterBoqLines: [],
    },
  });
  assert("T-KL-1-14 catalogWorkIdWritten=0", knrReport.catalogWorkIdWritten === 0);
}

// T-KL-1-15 tip Host / cloud / Master SSOT — no KL-1 runtime wiring on production tip
{
  const tipHost = execSync(
    "git show HEAD:src/app/intelligent-estimator/IkEntryHost.tsx",
    { cwd: root, encoding: "utf8" },
  );
  // KL-3 Host lookup-only may be on tip; KL-1 still forbids VERIFY/write from Host.
  assert(
    "T-KL-1-15 tip Host no VERIFY/write-router",
    !tipHost.includes("executeKnrOwnerVerify")
      && !tipHost.includes("persistVerifiedKnrCatalogEntry"),
  );

  const cloud = readFileSync(join(root, "src/lib/cloud-sync.ts"), "utf8");
  assert(
    "T-KL-1-15 cloud-sync registers kw-knr-catalog (KL-7-P0 SSOT)",
    cloud.includes('"kw-knr-catalog"') && cloud.includes("mergeKnrCatalogStore"),
  );
  assert(
    "T-KL-1-15 cloud-sync no Host lookup import",
    !cloud.includes("lookupKnrCatalog"),
  );

  const writeRouter = readFileSync(
    join(root, "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts"),
    "utf8",
  );
  assert(
    "T-KL-1-15 write-router no Host import",
    !writeRouter.includes("IkEntryHost") && !writeRouter.includes("cloud-sync"),
  );
}

// KL-1 marker + storage key
assert("T-KL-1-M KL1 implemented", KNR_KNOWLEDGE_KL1_IMPLEMENTED === true);
assert("T-KL-1-M storage key", KNR_CATALOG_STORAGE_KEY === "kw-knr-catalog");

// localStorage adapter round-trip
{
  clearKnrCatalogStoreLocalForTests();
  const { entry } = buildVerifiedFixture();
  persistVerifiedKnrCatalogEntry({ entry, nowIso: NOW });
  const raw = typeof localStorage !== "undefined"
    ? localStorage.getItem(KNR_CATALOG_STORAGE_KEY)
    : null;
  assert("T-KL-1-M localStorage written", raw != null && raw.includes(entry.identityKeyV2));
  clearKnrCatalogStoreLocalForTests();
}

// validation PASS alone ≠ auto VERIFIED in write path
{
  const { entry } = buildVerifiedFixture();
  const passOnly = {
    ...entry,
    verificationStatus: "NORMATIVE",
    validationState: "PASS",
    verifiedAt: null,
    verifiedBy: null,
  };
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: passOnly,
    nowIso: NOW,
    store: emptyKnrCatalogStore(),
  });
  assert("T-KL-1-M no auto VERIFIED on PASS", write.ok === false);
}

// PENDING_VERIFY ≠ HIT / ≠ persist
{
  const { entry, identityKeyV2 } = buildVerifiedFixture();
  const pending = {
    ...entry,
    verificationStatus: "PENDING_VERIFY",
    verifiedAt: null,
    verifiedBy: null,
  };
  const store = {
    ...emptyKnrCatalogStore(),
    entries: { [identityKeyV2]: pending },
    aliasIndex: rebuildKnrAliasIndex({ [identityKeyV2]: pending }),
  };
  const lookup = lookupKnrCatalog({ identityKeyV2 }, store);
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: pending,
    nowIso: NOW,
    store: emptyKnrCatalogStore(),
  });
  assert("T-KL-1-M PENDING_VERIFY lookup MISS", lookup.status === "LOCAL_MISS");
  assert("T-KL-1-M PENDING_VERIFY write rejected", write.ok === false && write.reason === "NOT_VERIFIED");
}

// Client VERIFIED spoof (no Owner VERIFY metadata)
{
  const { entry } = buildVerifiedFixture();
  const spoof = {
    ...entry,
    verificationStatus: "VERIFIED",
    verifiedAt: null,
    verifiedBy: null,
  };
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: spoof,
    nowIso: NOW,
    store: emptyKnrCatalogStore(),
  });
  assert("T-KL-1-M client VERIFIED spoof rejected", write.ok === false && write.reason === "NOT_VERIFIED");
}

// Content hash mismatch validation
{
  const { entry } = buildVerifiedFixture();
  const bad = validateKnrCatalogEntryCandidate({
    entry: { ...entry, contentHash: "deadbeef-not-a-real-hash" },
    forVerifiedTarget: true,
  });
  assert(
    "T-KL-1-M content hash mismatch",
    bad.codes.includes("CONTENT_HASH_MISMATCH") && bad.validationState !== "PASS",
  );
}

// Content conflict on different hash same identity
{
  const { entry } = buildVerifiedFixture();
  let store = emptyKnrCatalogStore();
  store = persistVerifiedKnrCatalogEntryInMemory({ entry, nowIso: NOW, store }).store;
  const mutatedNorms = {
    ...entry.norms,
    laborNorms: [{ ...entry.norms.laborNorms[0], quantity: 9.9 }],
  };
  const conflictEntry = {
    ...entry,
    norms: mutatedNorms,
    contentHash: buildKnrNormContentHash(mutatedNorms),
  };
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: conflictEntry,
    nowIso: NOW,
    store,
  });
  assert("T-KL-1-M content conflict", write.ok === false && write.reason === "CONTENT_CONFLICT");
}

// Invalid entry (missing unit) rejected
{
  const { entry } = buildVerifiedFixture();
  const invalid = { ...entry, unit: "" };
  const validation = validateKnrCatalogEntryCandidate({ entry: invalid, forVerifiedTarget: true });
  const write = persistVerifiedKnrCatalogEntryInMemory({
    entry: invalid,
    nowIso: NOW,
    store: emptyKnrCatalogStore(),
  });
  assert("T-KL-1-M invalid entry validation", validation.validationState !== "PASS");
  assert("T-KL-1-M invalid entry write rejected", write.ok === false && write.reason === "VALIDATION_FAILED");
}

console.log("\n---");
console.log(`KL-1 catalog harness: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
