/**
 * KL-7-P0 — Cloud KNR SSOT + CATALOG_HIT (pure merge/lookup + wiring smoke).
 * ZERO HTTP discovery · ZERO invent VERIFIED · ZERO 12J / Owner map / OUR RATE.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

import {
  emptyKnrCatalogStore,
  rebuildKnrAliasIndex,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-store.ts";
import { lookupKnrCatalog } from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-lookup.ts";
import {
  mergeKnrCatalogStoreDetailed,
  shouldPushKnrCatalogToCloud,
} from "../src/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge.ts";
import { buildKnrNormContentHash } from "../src/lib/intelligent-estimator/knr-knowledge/knr-content-hash.ts";
import { OWNER_KNR_MAPPINGS } from "../src/lib/intelligent-estimator/ik-knr-owner-mapping.ts";
import { foldIdentityKeyV2 } from "../src/lib/intelligent-estimator/knr-knowledge/knr-identity-v2.ts";
import { DATA_KEYS, BOOTSTRAP_DEFERRED_KEYS, mergeDataKey, bootstrapMergedShouldPush } from "../src/lib/cloud-sync.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-08-21T22:00:00.000Z";

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function buildVerifiedEntry(overrides = {}) {
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
      {
        kind: "R",
        code: "R-1",
        description: "robocizna test",
        unit: "r-g",
        quantity: 1,
      },
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
    description: "pozycja testowa",
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
    ...overrides,
  };
}

function storeWith(entry) {
  const entries = { [entry.identityKeyV2]: entry };
  return {
    ...emptyKnrCatalogStore(NOW),
    entries,
    aliasIndex: rebuildKnrAliasIndex(entries),
  };
}

// P0-1 cloud catalog key registered
ok("P0-1 DATA_KEYS has kw-knr-catalog", DATA_KEYS.includes("kw-knr-catalog"));
ok(
  "P0-1 DEFERRED has kw-knr-catalog",
  BOOTSTRAP_DEFERRED_KEYS.includes("kw-knr-catalog"),
);

// P0-2 / P0-3 VERIFIED+ACTIVE → HIT via mergeDataKey cloud path
{
  const entry = buildVerifiedEntry();
  const cloud = storeWith(entry);
  const merged = mergeDataKey("kw-knr-catalog", emptyKnrCatalogStore(), cloud);
  const hit = lookupKnrCatalog(
    { identityKeyV2: entry.identityKeyV2, evidenceKeyV1: entry.evidenceKeyV1 },
    merged,
  );
  ok("P0-2/3 cloud CATALOG_HIT", hit.status === "LOCAL_HIT");
  ok("P0-3 http=0", hit.httpRequestCount === 0);
}

// P0-4 PENDING → MISS
{
  const entry = buildVerifiedEntry({
    verificationStatus: "PENDING_VERIFY",
    verifiedAt: null,
    verifiedBy: null,
  });
  const store = storeWith(entry);
  const miss = lookupKnrCatalog({ identityKeyV2: entry.identityKeyV2 }, store);
  ok("P0-4 PENDING MISS", miss.status === "LOCAL_MISS");
}

// P0-5 evidence-like STRUCTURAL → MISS (not CATALOG_HIT)
{
  const entry = buildVerifiedEntry({
    verificationStatus: "STRUCTURAL",
    validatedState: "INCOMPLETE",
    verifiedAt: null,
    verifiedBy: null,
    validationState: "INCOMPLETE",
  });
  const miss = lookupKnrCatalog({ identityKeyV2: entry.identityKeyV2 }, storeWith(entry));
  ok("P0-5 STRUCTURAL MISS", miss.status === "LOCAL_MISS");
}

// P0-6 cloud empty + local VERIFIED → anti-wipe keep local + push allowed
{
  const entry = buildVerifiedEntry();
  const local = storeWith(entry);
  const detailed = mergeKnrCatalogStoreDetailed(local, emptyKnrCatalogStore());
  ok("P0-6 keep local VERIFIED", detailed.store.entries[entry.identityKeyV2]?.verificationStatus === "VERIFIED");
  ok(
    "P0-6 push when cloud empty",
    shouldPushKnrCatalogToCloud(detailed.store, null) === true,
  );
  ok(
    "P0-6 bootstrap push gate",
    bootstrapMergedShouldPush("kw-knr-catalog", detailed.store, null) === true,
  );
}

// P0-7 local empty + cloud VERIFIED → HIT
{
  const entry = buildVerifiedEntry();
  const detailed = mergeKnrCatalogStoreDetailed(emptyKnrCatalogStore(), storeWith(entry));
  const hit = lookupKnrCatalog({ identityKeyV2: entry.identityKeyV2 }, detailed.store);
  ok("P0-7 local empty cloud HIT", hit.status === "LOCAL_HIT");
}

// P0-8 conflict → fail-safe keep local VERIFIED · no destructive push
{
  const a = buildVerifiedEntry();
  const b = buildVerifiedEntry({
    description: "inna norma",
    norms: {
      laborNorms: [
        {
          kind: "R",
          code: "R-2",
          description: "inna",
          unit: "r-g",
          quantity: 2,
        },
      ],
      materialNorms: [],
      equipmentNorms: [],
    },
  });
  b.contentHash = buildKnrNormContentHash(b.norms);
  b.provenance = { ...b.provenance, contentHash: b.contentHash };
  const detailed = mergeKnrCatalogStoreDetailed(storeWith(a), storeWith(b));
  ok("P0-8 has conflict", detailed.conflicts.length === 1);
  ok(
    "P0-8 kept local hash",
    detailed.store.entries[a.identityKeyV2]?.contentHash === a.contentHash,
  );
  ok(
    "P0-8 push blocked vs cloud VERIFIED conflict",
    shouldPushKnrCatalogToCloud(detailed.store, storeWith(b)) === false,
  );
}

// P0-9 Host path: no VERIFIED → no HIT (proxy for no PRICED)
{
  const pending = buildVerifiedEntry({
    verificationStatus: "PENDING_VERIFY",
    verifiedAt: null,
    verifiedBy: null,
  });
  const r = lookupKnrCatalog({ identityKeyV2: pending.identityKeyV2 }, storeWith(pending));
  ok("P0-9 no VERIFIED → MISS", r.status === "LOCAL_MISS");
}

// P0-10 no KNR→KNR-W auto
{
  const mergeSrc = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge.ts");
  const syncSrc = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync.ts");
  ok(
    "P0-10 no auto family rewrite",
    !/KNR-W.*replace|rewrite.*KNR-W|family:\s*\"KNR-W\"/.test(mergeSrc + syncSrc)
      || mergeSrc.includes("ZERO KNR→KNR-W"),
  );
  ok(
    "P0-10 Owner map untouched key",
    OWNER_KNR_MAPPINGS[0]?.normalizedKey === "KNR-W|4-01|1202-07",
  );
}

// P0-11 / P0-12 / P0-13 Owner map / rates untouched in this change set (static)
ok("P0-13 Owner map length 1", OWNER_KNR_MAPPINGS.length === 1);
ok(
  "P0-13 workId frozen",
  OWNER_KNR_MAPPINGS[0]?.workId === "cc-w2-wykwity-zacieki",
);

const ownerMap = readSrc("src/lib/intelligent-estimator/ik-knr-owner-mapping.ts");
ok("P0-11/12/13 owner map file has no P0 cloud edits marker invent", !ownerMap.includes("KL-7-P0"));

// P0-14 12J isolation — preserve file still untracked / not imported by knr cloud
{
  const mergeSrc = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-merge.ts");
  const syncSrc = readSrc("src/lib/intelligent-estimator/knr-knowledge/knr-catalog-sync.ts");
  const cloud = readSrc("src/lib/cloud-sync.ts");
  ok(
    "P0-14 no work-rate-preserve import",
    !mergeSrc.includes("work-rate-preserve")
      && !syncSrc.includes("work-rate-preserve")
      && !/knr-catalog.*work-rate-preserve|work-rate-preserve.*knr-catalog/.test(cloud),
  );
}

// P0-15 write-router still no static cloud-sync
{
  const wr = readSrc(
    "src/lib/intelligent-estimator/knr-knowledge/knr-catalog-write-router.ts",
  );
  ok("P0-15 write-router no cloud-sync", !wr.includes("cloud-sync"));
}

const cloud = readSrc("src/lib/cloud-sync.ts");
ok("P0 wiring mergeKnrCatalogStore", cloud.includes("mergeKnrCatalogStore"));
ok("P0 wiring shouldPushKnrCatalogToCloud", cloud.includes("shouldPushKnrCatalogToCloud"));

console.log(`\nOK ${passed} assertions`);
