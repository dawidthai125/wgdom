/**
 * KL-7-P2A — Offline fixtures / seed for discovery evidence (ZERO HTTP).
 */

import { foldIdentityKeyV2 } from "./knr-identity-v2";
import {
  emptyKnrDiscoveryEvidenceStore,
  normalizeKnrDiscoveryEvidenceStore,
  saveKnrDiscoveryEvidenceStoreLocal,
  upsertKnrDiscoveryEvidenceOffline,
} from "./knr-discovery-evidence-store";
import type {
  KnrDiscoveryEvidenceRecord,
  KnrDiscoveryEvidenceStore,
  KnrDiscoverySourceRef,
} from "./knr-discovery-evidence-types";

const NOW = "2026-08-22T12:00:00.000Z";

function source(
  partial: Omit<KnrDiscoverySourceRef, "fetchedAt"> & { fetchedAt?: string },
): KnrDiscoverySourceRef {
  return {
    ...partial,
    fetchedAt: partial.fetchedAt ?? NOW,
  };
}

/** ≥2 sources → CORROBORATED (fixture). */
export function buildP2aCorroboratedFixture(): KnrDiscoveryEvidenceRecord {
  const identity = { family: "KNR" as const, catalog: "2-02", table: "0111-01" };
  const identityKeyV2 = foldIdentityKeyV2(identity);
  const evidenceKeyV1 = "KNR|2-02|0111-01";
  return {
    schemaVersion: 1,
    evidenceKeyV1,
    identityKeyV2,
    family: "KNR",
    displayCode: evidenceKeyV1,
    description: "Fixture corrob — structural only",
    unit: "m",
    discoveryStatus: "CORROBORATED",
    lifecycleState: "ACTIVE",
    sources: [
      source({
        sourceId: "fixture-gov-a",
        urlHash: "urlhash-gov-a",
        contentHash: "ch-a",
        priority: "GOVERNMENT",
        fragment: "R:1.0",
      }),
      source({
        sourceId: "fixture-uni-b",
        urlHash: "urlhash-uni-b",
        contentHash: "ch-b",
        priority: "UNIVERSITY",
        fragment: "R:1.0",
      }),
    ],
    norms: {
      laborNorms: [
        {
          kind: "R",
          code: "R-001",
          description: "robocizna fixture",
          unit: "r-g",
          quantity: 1,
        },
      ],
      materialNorms: [],
      equipmentNorms: [],
    },
    queryHashes: ["qh-knr-2-02-0111"],
    freshness: "FRESH",
    contentHash: "fixture-corrob-content",
    lastFetchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    catalogRevisionLink: null,
  };
}

/** Single INDUSTRY source → DISCOVERED · not READY. */
export function buildP2aSingleIndustryFixture(): KnrDiscoveryEvidenceRecord {
  const evidenceKeyV1 = "KNR|9-99|0001-01";
  return {
    schemaVersion: 1,
    evidenceKeyV1,
    identityKeyV2: null,
    family: "KNR",
    displayCode: evidenceKeyV1,
    discoveryStatus: "DISCOVERED",
    lifecycleState: "ACTIVE",
    sources: [
      source({
        sourceId: "fixture-industry",
        urlHash: "urlhash-ind",
        contentHash: "ch-ind",
        priority: "INDUSTRY",
      }),
    ],
    norms: { laborNorms: [], materialNorms: [], equipmentNorms: [] },
    queryHashes: ["qh-single"],
    freshness: "FRESH",
    contentHash: "fixture-single-ind",
    lastFetchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    catalogRevisionLink: null,
  };
}

/** Family conflict fixture seed pair helper. */
export function buildP2aFamilyConflictAttempt(): {
  existing: KnrDiscoveryEvidenceRecord;
  conflictingFamily: KnrDiscoveryEvidenceRecord;
} {
  const existing = buildP2aSingleIndustryFixture();
  return {
    existing,
    conflictingFamily: {
      ...existing,
      family: "KNR-W",
      contentHash: "fixture-family-conflict",
      sources: existing.sources,
    },
  };
}

export function buildP2aOfflineDiscoveryStore(): KnrDiscoveryEvidenceStore {
  let store = emptyKnrDiscoveryEvidenceStore(NOW);
  for (const rec of [buildP2aCorroboratedFixture(), buildP2aSingleIndustryFixture()]) {
    const r = upsertKnrDiscoveryEvidenceOffline({
      record: rec,
      nowIso: NOW,
      storeOverride: store,
    });
    store = r.store;
  }
  return normalizeKnrDiscoveryEvidenceStore(store, NOW, Date.parse(NOW));
}

export function seedKnrDiscoveryEvidenceOfflineLocal(): KnrDiscoveryEvidenceStore {
  return saveKnrDiscoveryEvidenceStoreLocal(buildP2aOfflineDiscoveryStore(), NOW);
}

export const KNR_DISCOVERY_FIXTURES_P2A_IMPLEMENTED = true as const;
