/**
 * IK Full Autonomy Commit 1 — durable Pack / IdentityCandidates / MultiDwelling.
 * ZERO live HTTP · ZERO prod KV mutate beyond localStorage fake.
 *
 * npx vite-node scripts/test-ik-full-autonomy-durability-01.mjs
 */
import {
  FIXTURE_ETICS_PACK_ID,
  TECHNOLOGY_PACK_STORAGE_KEY,
  clearPackRegistryForTests,
  clearTechnologyPackDurableStoreForTests,
  getPack,
  hydratePackRegistryFromDurable,
  listAllPacks,
  loadTechnologyPackDurableStoreLocal,
  mergeTechnologyPackDurableStore,
  seedBaselineCapabilities,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";
import {
  IDENTITY_CANDIDATE_STORAGE_KEY,
  WORK_CATALOG_STORAGE_KEY,
  clearIdentityCandidateStoresForTests,
  emptyIdentityCandidateDurableStore,
  loadIdentityCandidateDurableStore,
  mergeIdentityCandidateDurableStore,
  saveIdentityCandidateDurableStore,
} from "../src/lib/work-catalog/index.ts";
import {
  MULTI_DWELLING_PACKAGE_LS_KEY,
  clearMultiDwellingPackageStore,
  getTenderPackage,
  loadMultiDwellingPackageStore,
  mergeMultiDwellingPackageStore,
  upsertTenderPackage,
} from "../src/lib/multi-dwelling/index.ts";
import { DATA_KEYS, BOOTSTRAP_DEFERRED_KEYS } from "../src/lib/cloud-sync.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};
globalThis.fetch = async () => {
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

// --- GO#1 TechnologyPack durable ---
clearPackRegistryForTests();
clearTechnologyPackDurableStoreForTests();
seedBaselineCapabilities();
seedB0Fixtures();
const sample = getPack(FIXTURE_ETICS_PACK_ID, "1.0") || listAllPacks()[0];
ok("pack_registered_in_memory", !!sample, sample && `${sample.packId}@${sample.packVersion}`);
const durableBefore = loadTechnologyPackDurableStoreLocal();
ok("pack_durable_has_entries", durableBefore.packs.length > 0, durableBefore.packs.length);

const packId = sample.packId;
const packVersion = sample.packVersion;
clearPackRegistryForTests();
ok("pack_memory_cleared", !getPack(packId, packVersion));
const hydrated = hydratePackRegistryFromDurable();
ok("pack_hydrate_count", hydrated > 0, hydrated);
ok("pack_survives_memory_clear", !!getPack(packId, packVersion), `${packId}@${packVersion}`);

const mergedPack = mergeTechnologyPackDurableStore(
  { packs: [sample], updatedAt: "2026-01-01T00:00:00.000Z", etag: "a", schemaVersion: 1 },
  { packs: [], updatedAt: "2026-01-02T00:00:00.000Z", etag: "b", schemaVersion: 1 },
);
ok("pack_merge_refuses_empty_wipe", mergedPack.packs.length >= 1);

ok(
  "pack_data_key_in_data_keys",
  DATA_KEYS.includes(TECHNOLOGY_PACK_STORAGE_KEY)
    || DATA_KEYS.includes("kw-technology-packs"),
);
ok(
  "pack_deferred_bootstrap",
  BOOTSTRAP_DEFERRED_KEYS.includes("kw-technology-packs"),
);

// --- GO#3 IdentityCandidates ---
clearIdentityCandidateStoresForTests();
const now = "2026-09-13T12:00:00.000Z";
const cand = {
  candidateId: "ic:test-fp-1",
  fingerprint: "fp-test-1",
  parentContext: {
    parentWorkId: null,
    parentKind: "STANDALONE",
    tenderId: "t-test",
    dwellingId: null,
    boqLineRef: null,
  },
  proposedWorkId: null,
  proposedWorkIdPolicy: "B_GENERATE_ON_ACCEPT_ONLY",
  label: "test leaf",
  description: "test",
  unit: "m2",
  technology: null,
  scope: "labor",
  family: "test",
  slugHint: null,
  classification: {
    intendedPlane: "LABOR_ONLY",
    ownerPlaneToday: null,
    note: "test",
  },
  originalEvidence: {
    knrEvidence: [],
    sourceEvidence: [],
    semanticEvidence: [],
    negativeEvidence: [],
    competingCandidates: [],
  },
  confidenceComponents: {
    scopeExact: true,
    technologyExact: false,
    unitExact: true,
    semanticDefinitionClear: true,
    authoritativeExternalMapping: false,
    noCompetingIdentity: true,
    noRejectedEquivalent: true,
    deterministicProvenance: true,
    narrative: "test",
  },
  provenance: {
    createdBy: "OWNER_BRIEF",
    goChain: ["GO#3"],
    inputs: ["test"],
  },
  createdAt: now,
  updatedAt: now,
  expiresAt: null,
  status: "OWNER_REVIEW",
  persistence: "DURABLE",
  ownerDecision: {
    kind: "UNSET",
    decidedAt: null,
    note: null,
    canonicalAcceptDeferredToGo39: true,
  },
  reviewEdits: null,
  rejectionHistory: [],
  supersedesCandidateId: null,
  supersededByCandidateId: null,
  acceptedCanonicalProvenance: null,
  auditLog: [],
  mayWriteCatalogWork: false,
  mayAssignLaborWorkId: false,
  mayActivatePack: false,
  maySetOurRate: false,
};
saveIdentityCandidateDurableStore({
  schemaVersion: 1,
  updatedAt: now,
  candidates: [cand],
});
ok("ic_saved", loadIdentityCandidateDurableStore().candidates.length === 1);

const mergedIc = mergeIdentityCandidateDurableStore(
  loadIdentityCandidateDurableStore(),
  emptyIdentityCandidateDurableStore(),
);
ok("ic_merge_refuses_empty_wipe", mergedIc.candidates.length === 1);

const lsRaw = localStorage.getItem(IDENTITY_CANDIDATE_STORAGE_KEY);
ok("ic_ls_present", !!lsRaw && lsRaw.includes("fp-test-1"));
ok(
  "ic_isolated_from_wc_key",
  IDENTITY_CANDIDATE_STORAGE_KEY !== WORK_CATALOG_STORAGE_KEY
    && IDENTITY_CANDIDATE_STORAGE_KEY === "kw-identity-candidates",
);
ok("ic_data_key", DATA_KEYS.includes("kw-identity-candidates"));
ok("ic_deferred", BOOTSTRAP_DEFERRED_KEYS.includes("kw-identity-candidates"));

// --- GO#4 Multi-dwelling ---
clearMultiDwellingPackageStore();
const pkg = upsertTenderPackage({
  tenderId: "tender-autonomy-1",
  expectedDwellingCount: 1,
  mode: "legacy_single",
  dwellings: [
    {
      dwellingId: "default",
      labelPl: "Lokal 1",
      sourceDocumentIds: ["doc-1"],
      offerBoq: { lines: [{ id: "l1" }], meta: { attest: true } },
      costSnapshot: null,
      lineProvenance: null,
      costMulti: null,
      f5Gate: null,
      subtotals: null,
    },
  ],
  documentToDwelling: { "doc-1": "default" },
});
ok("mdp_upsert", !!pkg && pkg.tenderId === "tender-autonomy-1");
ok("mdp_offer_boq", !!getTenderPackage("tender-autonomy-1")?.dwellings[0]?.offerBoq);

const lsKey = localStorage.getItem(MULTI_DWELLING_PACKAGE_LS_KEY);
ok("mdp_ls", !!lsKey && lsKey.includes("tender-autonomy-1"));

const storeSnap = loadMultiDwellingPackageStore();
clearMultiDwellingPackageStore();
ok("mdp_cleared", !getTenderPackage("tender-autonomy-1"));
localStorage.setItem(MULTI_DWELLING_PACKAGE_LS_KEY, JSON.stringify(storeSnap));
ok(
  "mdp_hydrate_offer_boq",
  !!getTenderPackage("tender-autonomy-1")?.dwellings[0]?.offerBoq,
);

const mergedMdp = mergeMultiDwellingPackageStore(storeSnap, {
  version: 1,
  byTenderId: {},
});
ok(
  "mdp_merge_refuses_empty",
  Object.keys(mergedMdp.byTenderId).length === 1,
);
ok("mdp_data_key", DATA_KEYS.includes("kw-multi-dwelling-package-v1"));
ok("mdp_deferred", BOOTSTRAP_DEFERRED_KEYS.includes("kw-multi-dwelling-package-v1"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
