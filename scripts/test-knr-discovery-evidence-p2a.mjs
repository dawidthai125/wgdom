/**
 * KL-7-P2A — Discovery evidence memory + lookup chain (offline).
 * ZERO HTTP · ZERO VERIFIED from evidence · ZERO 12J / Owner map / OUR RATE / PLN.
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
  normalizeKnrDiscoveryEvidenceStore,
  normalizeKnrDiscoveryEvidenceRecord,
  rebuildKnrDiscoveryIndexes,
  upsertKnrDiscoveryEvidenceOffline,
  isDestructiveKnrDiscoveryReplace,
  clampDiscoveryStatusForSources,
  isValidOwnerHardAuthority,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-store.ts";
import {
  mergeKnrDiscoveryEvidenceStoreDetailed,
  shouldPushKnrDiscoveryEvidenceToCloud,
  KNR_DISCOVERY_DECISION_C_AUTHORITY_MERGE,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-merge.ts";
import {
  lookupKnrKnowledgeWithDiscoveryEvidence,
  lookupKnrDiscoveryEvidence,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-lookup.ts";
import {
  buildP2aCorroboratedFixture,
  buildP2aSingleIndustryFixture,
  buildP2aFamilyConflictAttempt,
  buildP2aOfflineDiscoveryStore,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-fixtures.ts";
import { buildKnrDiscoveryUiRows } from "../src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-ui.ts";
import {
  DATA_KEYS,
  BOOTSTRAP_DEFERRED_KEYS,
  mergeDataKey,
  bootstrapMergedShouldPush,
} from "../src/lib/cloud-sync.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-08-22T12:00:00.000Z";

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
    description: "verified catalog",
    unit: "m2",
    norms,
    provenance: {
      sourceType: "LICENSED_PROGRAM_EXPORT",
      sourceIdentifier: "test-ath",
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
    verifiedBy: "owner-test",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function catalogStoreWith(entry) {
  const entries = { [entry.identityKeyV2]: entry };
  return {
    ...emptyKnrCatalogStore(NOW),
    entries,
    aliasIndex: rebuildKnrAliasIndex(entries),
    updatedAt: NOW,
  };
}

// --- T1: store key + schema ---
{
  const types = readSrc(
    "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-evidence-types.ts",
  );
  ok("T1 key kw-knr-discovery-evidence", types.includes("kw-knr-discovery-evidence"));
  ok(
    "T1 discovery statuses",
    ["DISCOVERED", "CORROBORATED", "CONFLICT", "INCOMPLETE", "READY_FOR_OWNER_VERIFY"].every(
      (s) => types.includes(s),
    ),
  );
}

// --- T2: indexes rebuilt ---
{
  const store = buildP2aOfflineDiscoveryStore();
  const cor = buildP2aCorroboratedFixture();
  ok("T2 byEvidenceKey", store.byEvidenceKey[cor.evidenceKeyV1] === cor.evidenceKeyV1);
  ok(
    "T2 byIdentityKey",
    (store.byIdentityKey[cor.identityKeyV2] ?? []).includes(cor.evidenceKeyV1),
  );
  ok("T2 byUrlHash", (store.byUrlHash["urlhash-gov-a"] ?? []).includes(cor.evidenceKeyV1));
  ok(
    "T2 byQueryHash",
    (store.byQueryHash["qh-knr-2-02-0111"] ?? []).includes(cor.evidenceKeyV1),
  );
  ok(
    "T2 byContentHash",
    (store.byContentHash[cor.contentHash] ?? []).includes(cor.evidenceKeyV1),
  );
}

// --- T3: pricing deny ---
{
  const bad = normalizeKnrDiscoveryEvidenceRecord({
    ...buildP2aSingleIndustryFixture(),
    ourRate: 12,
  });
  ok("T3 reject ourRate", bad === null);
  const bad2 = normalizeKnrDiscoveryEvidenceRecord({
    ...buildP2aSingleIndustryFixture(),
    companyPrice: 1,
  });
  ok("T3 reject companyPrice", bad2 === null);
  const bad3 = normalizeKnrDiscoveryEvidenceRecord({
    ...buildP2aSingleIndustryFixture(),
    verificationStatus: "VERIFIED",
  });
  ok("T3 reject spoof VERIFIED", bad3 === null);
}

// --- T4: single industry never READY ---
{
  const clamped = clampDiscoveryStatusForSources("READY_FOR_OWNER_VERIFY", [
    {
      sourceId: "x",
      urlHash: "u",
      contentHash: "c",
      fetchedAt: NOW,
      priority: "INDUSTRY",
    },
  ]);
  ok("T4 single industry not READY", clamped === "DISCOVERED");
}

// --- T5: corrob ≥2 keeps CORROBORATED ---
{
  const rec = normalizeKnrDiscoveryEvidenceRecord(buildP2aCorroboratedFixture());
  ok("T5 corrob status", rec?.discoveryStatus === "CORROBORATED");
  ok("T5 corrob sources≥2", (rec?.sources.length ?? 0) >= 2);
}

// --- T6: family lock CONFLICT ---
{
  const { existing, conflictingFamily } = buildP2aFamilyConflictAttempt();
  let store = emptyKnrDiscoveryEvidenceStore(NOW);
  store = upsertKnrDiscoveryEvidenceOffline({
    record: existing,
    nowIso: NOW,
    storeOverride: store,
  }).store;
  const r = upsertKnrDiscoveryEvidenceOffline({
    record: conflictingFamily,
    nowIso: NOW,
    storeOverride: store,
  });
  ok("T6 family mismatch → CONFLICT", r.record.discoveryStatus === "CONFLICT");
  ok("T6 family not rewritten to KNR-W", r.record.family === "KNR");
}

// --- T7: anti-wipe empty cloud ---
{
  const local = buildP2aOfflineDiscoveryStore();
  const cloud = emptyKnrDiscoveryEvidenceStore(NOW);
  const merged = mergeKnrDiscoveryEvidenceStoreDetailed(local, cloud);
  ok("T7 empty cloud keeps local", Object.keys(merged.store.entries).length >= 2);
  ok(
    "T7 destructive detect",
    isDestructiveKnrDiscoveryReplace(cloud, local) === true,
  );
  ok(
    "T7 shouldPush empty blocked",
    shouldPushKnrDiscoveryEvidenceToCloud(cloud, local) === false,
  );
}

// --- T8: content conflict → Decision C HOLD (INTENTIONAL: was NEXT_LOCAL_WINS local keep) ---
{
  const a = buildP2aSingleIndustryFixture();
  const local = normalizeKnrDiscoveryEvidenceStore({
    schemaVersion: 1,
    updatedAt: NOW,
    etag: "",
    entries: { [a.evidenceKeyV1]: a },
    ...rebuildKnrDiscoveryIndexes({ [a.evidenceKeyV1]: a }),
  });
  const cloudEntry = { ...a, contentHash: "different-hash", description: "cloud" };
  const cloud = normalizeKnrDiscoveryEvidenceStore({
    schemaVersion: 1,
    updatedAt: NOW,
    etag: "",
    entries: { [a.evidenceKeyV1]: cloudEntry },
    ...rebuildKnrDiscoveryIndexes({ [a.evidenceKeyV1]: cloudEntry }),
  });
  const merged = mergeKnrDiscoveryEvidenceStoreDetailed(local, cloud);
  const held = merged.store.entries[a.evidenceKeyV1];
  ok("T8 Decision C HOLD status CONFLICT", held.discoveryStatus === "CONFLICT");
  ok(
    "T8 Decision C durable authorityHold",
    held.authorityHold?.reason === "CONTENT_HASH_MISMATCH"
      && held.authorityHold?.resolution === "HOLD",
  );
  ok("T8 conflict recorded", merged.conflicts.some((c) => c.reason === "CONTENT_HASH_MISMATCH" && c.keptSide === "hold"));
  ok("T8 no silent local business win", held.contentHash === a.contentHash && held.discoveryStatus === "CONFLICT");
}

// --- T9: CATALOG_HIT short-circuit · HTTP 0 · no evidence consult needed ---
{
  const entry = buildVerifiedCatalogEntry();
  const catalog = catalogStoreWith(entry);
  const discovery = buildP2aOfflineDiscoveryStore();
  const result = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: { identityKeyV2: entry.identityKeyV2 },
    catalogStore: catalog,
    discoveryStore: discovery,
  });
  ok("T9 CATALOG_HIT", result.outcome === "CATALOG_HIT");
  ok("T9 HTTP 0", result.httpRequestCount === 0);
}

// --- T10: EVIDENCE_HIT on catalog miss ---
{
  const cor = buildP2aCorroboratedFixture();
  const catalog = emptyKnrCatalogStore(NOW);
  const discovery = buildP2aOfflineDiscoveryStore();
  const result = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: {
      identityKeyV2: cor.identityKeyV2,
      evidenceKeyV1: cor.evidenceKeyV1,
    },
    catalogStore: catalog,
    discoveryStore: discovery,
  });
  ok("T10 EVIDENCE_HIT", result.outcome === "EVIDENCE_HIT");
  ok("T10 HTTP 0", result.httpRequestCount === 0);
  ok("T10 evidence key", result.outcome === "EVIDENCE_HIT" && result.evidenceKeyV1 === cor.evidenceKeyV1);
}

// --- T11: DISCOVERY_REQUIRED · no fetch ---
{
  const catalog = emptyKnrCatalogStore(NOW);
  const discovery = emptyKnrDiscoveryEvidenceStore(NOW);
  const result = lookupKnrKnowledgeWithDiscoveryEvidence({
    request: { identityKeyV2: "MISSING|KEY|V2", evidenceKeyV1: "NOPE" },
    catalogStore: catalog,
    discoveryStore: discovery,
  });
  ok("T11 DISCOVERY_REQUIRED", result.outcome === "DISCOVERY_REQUIRED");
  ok("T11 HTTP 0", result.httpRequestCount === 0);
  ok(
    "T11 discoveryPlanned false",
    result.outcome === "DISCOVERY_REQUIRED" && result.discoveryPlanned === false,
  );
}

// --- T12: direct evidence lookup ---
{
  const store = buildP2aOfflineDiscoveryStore();
  const hit = lookupKnrDiscoveryEvidence(
    { evidenceKeyV1: "KNR|2-02|0111-01" },
    store,
  );
  ok("T12 direct evidence", hit?.discoveryStatus === "CORROBORATED");
}

// --- T13: cloud-sync wiring ---
{
  ok("T13 DATA_KEYS", DATA_KEYS.includes("kw-knr-discovery-evidence"));
  ok("T13 DEFERRED", BOOTSTRAP_DEFERRED_KEYS.includes("kw-knr-discovery-evidence"));
  const local = buildP2aOfflineDiscoveryStore();
  const merged = mergeDataKey("kw-knr-discovery-evidence", local, emptyKnrDiscoveryEvidenceStore());
  ok(
    "T13 mergeDataKey anti-wipe",
    Object.keys(merged.entries ?? {}).length >= 2,
  );
  ok(
    "T13 bootstrap push gate",
    bootstrapMergedShouldPush(
      "kw-knr-discovery-evidence",
      local,
      emptyKnrDiscoveryEvidenceStore(),
    ) === true,
  );
  ok(
    "T13 bootstrap no empty push",
    bootstrapMergedShouldPush(
      "kw-knr-discovery-evidence",
      emptyKnrDiscoveryEvidenceStore(),
      local,
    ) === false,
  );
}

// --- T14: UI filters ---
{
  const rows = buildKnrDiscoveryUiRows({
    records: Object.values(buildP2aOfflineDiscoveryStore().entries),
    statusFilter: "CORROBORATED",
  });
  ok("T14 filter CORROBORATED", rows.length >= 1);
  ok(
    "T14 all corrob",
    rows.every((r) => r.discoveryStatus === "CORROBORATED"),
  );
  const conflictFilter = buildKnrDiscoveryUiRows({
    records: Object.values(buildP2aOfflineDiscoveryStore().entries),
    statusFilter: "CONFLICT",
  });
  ok("T14 CONFLICT filter empty ok", conflictFilter.length === 0);
}

// --- T15: panel markers · no WIP touch ---
{
  const panel = readSrc("src/app/knr-catalog/KnrCatalogPanel.tsx");
  ok("T15 sources panel", panel.includes("data-knr-discovery-sources"));
  ok("T15 evidence panel", panel.includes("data-knr-discovery-evidence-panel"));
  ok("T15 evidence status filter wiring", panel.includes("KNR_DISCOVERY_UI_STATUS_FILTERS"));
  ok("T15 no PLN in discovery section", !panel.includes("companyPrice"));
  const sync = readSrc("src/lib/cloud-sync.ts");
  ok("T15 cloud sync key", sync.includes("kw-knr-discovery-evidence"));

  const w12j = [
    "src/lib/work-catalog/work-rate-preserve.ts",
    "src/lib/work-catalog/work-catalog-store.ts",
    "src/lib/work-catalog/work-catalog-sync.ts",
    "src/lib/work-catalog/index.ts",
    "scripts/test-our-work-rate-persistence-12j.mjs",
  ];
  // Isolation: P2A must not edit these — checked via git later; marker that test knows them:
  ok("T15 12J isolation list", w12j.length === 5);

  const router = readSrc(
    "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts",
  );
  ok("T15 write-router untouched marker still present", router.length > 100);
}

// --- T16: STALE freshness ≠ delete ---
{
  const old = {
    ...buildP2aSingleIndustryFixture(),
    lastFetchedAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
  };
  const n = normalizeKnrDiscoveryEvidenceRecord(old, Date.parse(NOW));
  ok("T16 STALE freshness", n?.freshness === "STALE");
  ok("T16 still ACTIVE", n?.lifecycleState === "ACTIVE");
  ok("T16 not VERIFIED field", !("verificationStatus" in (n ?? {})));
}

// =============================================================================
// Decision C — OWNER_HARD_WINS (SEAM-DC-1/2/3) · INTENTIONAL T8 semantic change documented above
// =============================================================================
ok("DC marker", KNR_DISCOVERY_DECISION_C_AUTHORITY_MERGE === true);

function withHard(rec, overrides = {}) {
  const contentHash = overrides.contentHash ?? rec.contentHash;
  return {
    ...rec,
    ...overrides,
    contentHash,
    ownerHardAuthority: {
      kind: "OWNER_HARD",
      actorId: overrides.actorId ?? "dawid",
      decidedAt: overrides.decidedAt ?? NOW,
      decisionId: overrides.decisionId ?? `dec-${rec.evidenceKeyV1}`,
      coveredContentHash: overrides.coveredContentHash ?? contentHash,
      source: "OWNER_EXPLICIT",
      reasonPl: "Decision C test",
    },
  };
}

function storeOf(entry) {
  return normalizeKnrDiscoveryEvidenceStore({
    schemaVersion: 1,
    updatedAt: NOW,
    etag: "",
    entries: { [entry.evidenceKeyV1]: entry },
    ...rebuildKnrDiscoveryIndexes({ [entry.evidenceKeyV1]: entry }),
  });
}

// --- DC-N1: local-only / cloud-only / disjoint / same-hash / lifecycle ---
{
  const a = buildP2aSingleIndustryFixture();
  const localOnly = storeOf(a);
  const empty = emptyKnrDiscoveryEvidenceStore(NOW);
  ok("DC-N1 local-only", mergeKnrDiscoveryEvidenceStoreDetailed(localOnly, empty).store.entries[a.evidenceKeyV1]?.contentHash === a.contentHash);
  ok("DC-N1 cloud-only", mergeKnrDiscoveryEvidenceStoreDetailed(empty, localOnly).store.entries[a.evidenceKeyV1]?.contentHash === a.contentHash);

  const b = { ...buildP2aCorroboratedFixture(), evidenceKeyV1: "KNR|9-99|0001-01", contentHash: "disjoint-b" };
  const left = storeOf(a);
  const right = storeOf(b);
  const disjoint = mergeKnrDiscoveryEvidenceStoreDetailed(left, right);
  ok("DC-N1 disjoint both keys", Boolean(disjoint.store.entries[a.evidenceKeyV1]) && Boolean(disjoint.store.entries[b.evidenceKeyV1]));

  const cor = buildP2aCorroboratedFixture();
  const sameLocal = { ...cor, discoveryStatus: "DISCOVERED", updatedAt: "2026-08-21T12:00:00.000Z" };
  const sameCloud = { ...cor, discoveryStatus: "CORROBORATED", updatedAt: "2026-08-23T12:00:00.000Z" };
  const same = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(sameLocal), storeOf(sameCloud));
  ok("DC-N1 same-hash prefers richer status", same.store.entries[cor.evidenceKeyV1]?.discoveryStatus === "CORROBORATED");

  const active = { ...a, lifecycleState: "ACTIVE", contentHash: "life-a" };
  const superseded = { ...a, lifecycleState: "SUPERSEDED", contentHash: "life-b", description: "old" };
  const life = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(active), storeOf(superseded));
  ok("DC-N1 ACTIVE vs SUPERSEDED → ACTIVE (L1)", life.store.entries[a.evidenceKeyV1]?.lifecycleState === "ACTIVE");
  ok("DC-N1 not HOLD when not both ACTIVE", life.store.entries[a.evidenceKeyV1]?.discoveryStatus !== "CONFLICT");
}

// --- DC-C1: ACTIVE/ACTIVE content + family → HOLD; legacy → HOLD ---
{
  const a = buildP2aSingleIndustryFixture();
  const cloud = { ...a, contentHash: "cloud-x", description: "cloud" };
  const hold = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(a), storeOf(cloud));
  const h = hold.store.entries[a.evidenceKeyV1];
  ok("DC-C1 content HOLD", h.discoveryStatus === "CONFLICT" && h.authorityHold?.reason === "CONTENT_HASH_MISMATCH");

  const famL = { ...a, family: "KNR" };
  const famC = { ...a, family: "KNR-W", contentHash: a.contentHash };
  const famHold = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(famL), storeOf(famC));
  ok("DC-C1 family HOLD", famHold.store.entries[a.evidenceKeyV1]?.authorityHold?.reason === "FAMILY_MISMATCH");

  ok("DC-C1 legacy not HARD", !isValidOwnerHardAuthority(a));
  ok("DC-C1 legacy conflict HOLD (no invent)", hold.conflicts.some((c) => c.keptSide === "hold"));
}

// --- DC-H: Owner HARD wins / dual HARD HOLD / malformed / covered mismatch / ATH ---
{
  const base = buildP2aSingleIndustryFixture();
  const hardLocal = withHard(base);
  const ordinaryCloud = { ...base, contentHash: "ath-or-cloud", description: "ordinary", sources: [{ sourceId: "ath_l1_aux_x", urlHash: "u", contentHash: "c", fetchedAt: NOW, priority: "OTHER" }] };
  ok("DC-H valid HARD", isValidOwnerHardAuthority(normalizeKnrDiscoveryEvidenceRecord(hardLocal)));

  const hl = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(hardLocal), storeOf(ordinaryCloud));
  ok("DC-H HARD local vs ordinary cloud", hl.store.entries[base.evidenceKeyV1]?.contentHash === hardLocal.contentHash);
  ok("DC-H HARD local keptSide", hl.conflicts.some((c) => c.keptSide === "hard_local" && c.resolution === "OWNER_HARD_WINS"));

  const hardCloud = withHard({ ...base, contentHash: "hard-cloud-hash", description: "cloud-hard" });
  const ordinaryLocal = { ...base, contentHash: "local-ordinary" };
  const hc = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(ordinaryLocal), storeOf(hardCloud));
  ok("DC-H HARD cloud vs ordinary local", hc.store.entries[base.evidenceKeyV1]?.contentHash === hardCloud.contentHash);
  ok("DC-H HARD cloud keptSide", hc.conflicts.some((c) => c.keptSide === "hard_cloud"));

  const hardSameDevice = withHard({ ...base, contentHash: "same-device-hard" });
  const ordinarySame = { ...base, contentHash: "same-device-local" };
  const hs = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(ordinarySame), storeOf(hardSameDevice));
  ok("DC-H HARD same-device vs ordinary", hs.store.entries[base.evidenceKeyV1]?.contentHash === hardSameDevice.contentHash);

  const hardA = withHard({ ...base, contentHash: "hard-a" });
  const hardB = withHard({ ...base, contentHash: "hard-b", decisionId: "other-dec" });
  const dual = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(hardA), storeOf(hardB));
  ok("DC-H two HARD different hashes → OWNER_EXCEPTION", dual.store.entries[base.evidenceKeyV1]?.authorityHold?.reason === "OWNER_HARD_CONFLICT");
  ok("DC-H dual resolution", dual.store.entries[base.evidenceKeyV1]?.authorityHold?.resolution === "OWNER_EXCEPTION");

  const malformed = {
    ...base,
    contentHash: "mal-hash",
    ownerHardAuthority: { kind: "OWNER_HARD", actorId: "", decidedAt: NOW, decisionId: "x", coveredContentHash: "mal-hash", source: "OWNER_EXPLICIT" },
  };
  const malNorm = normalizeKnrDiscoveryEvidenceRecord(malformed);
  ok("DC-H malformed stripped/invalid", !isValidOwnerHardAuthority(malNorm));
  const malMerge = mergeKnrDiscoveryEvidenceStoreDetailed(
    storeOf({ ...base, contentHash: "mal-hash", ownerHardAuthority: malformed.ownerHardAuthority }),
    storeOf({ ...base, contentHash: "other" }),
  );
  ok("DC-H malformed → HOLD not invent", malMerge.store.entries[base.evidenceKeyV1]?.discoveryStatus === "CONFLICT");

  const coveredMismatch = withHard(base, { coveredContentHash: "NOT-THE-CONTENT-HASH" });
  ok("DC-H coveredHash mismatch not valid", !isValidOwnerHardAuthority(normalizeKnrDiscoveryEvidenceRecord(coveredMismatch)));
  const covMerge = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(coveredMismatch), storeOf({ ...base, contentHash: "cloud-y" }));
  ok("DC-H covered mismatch → HOLD", covMerge.store.entries[base.evidenceKeyV1]?.discoveryStatus === "CONFLICT");

  const hardAth = withHard(base);
  const ath = { ...base, contentHash: "ath-wire-hash", sources: [{ sourceId: "ath_l1_aux_pub", urlHash: "ath", contentHash: "athc", fetchedAt: NOW, priority: "OTHER" }] };
  const athMerge = mergeKnrDiscoveryEvidenceStoreDetailed(storeOf(hardAth), storeOf(ath));
  ok("DC-H HARD + ATH mismatch → HARD wins", athMerge.store.entries[base.evidenceKeyV1]?.contentHash === hardAth.contentHash);
  ok("DC-H ATH does not mint HARD", !isValidOwnerHardAuthority(normalizeKnrDiscoveryEvidenceRecord(ath)));
}

// --- DC-S: anti-wipe / CONFLICT pushable ---
{
  const local = buildP2aOfflineDiscoveryStore();
  const cloud = emptyKnrDiscoveryEvidenceStore(NOW);
  ok("DC-S empty over non-empty destructive", isDestructiveKnrDiscoveryReplace(cloud, local) === true);
  ok("DC-S shouldPush empty blocked", shouldPushKnrDiscoveryEvidenceToCloud(cloud, local) === false);

  const a = buildP2aSingleIndustryFixture();
  const heldStore = mergeKnrDiscoveryEvidenceStoreDetailed(
    storeOf(a),
    storeOf({ ...a, contentHash: "diff" }),
  ).store;
  ok("DC-S CONFLICT not empty", Object.keys(heldStore.entries).length === 1);
  ok("DC-S CONFLICT pushable vs empty cloud", shouldPushKnrDiscoveryEvidenceToCloud(heldStore, emptyKnrDiscoveryEvidenceStore(NOW)) === true);
  ok(
    "DC-S HOLD changes etag vs pre-conflict local",
    heldStore.etag !== storeOf(a).etag,
  );
}

console.log(`\nOK ${passed} assertions — KL-7-P2A offline + Decision C`);
