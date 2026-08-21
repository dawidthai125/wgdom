/**
 * IK-KNR KL-1 — deterministic LOCAL lookup (ADAPT: work-rate-lookup.ts).
 * Outcomes: LOCAL_HIT | LOCAL_MISS | INVALID_LOOKUP only — NO research · NO HTTP.
 */

import type { KnrCatalogEntry, KnrNormBundle } from "./knr-catalog-entry-types";
import type { KnrIdentityV2Partial } from "./knr-identity-v2";
import { hasMinimumKnrIdentityPartial } from "./knr-identity-v2";
import type { KnrCatalogStore } from "./knr-catalog-store";

export type KnrCatalogLookupRequest = {
  identityKeyV2: string;
  evidenceKeyV1?: string | null;
  partialIdentity?: KnrIdentityV2Partial;
};

export type KnrInvalidLookupReason =
  | "EMPTY_KEY"
  | "MALFORMED_KEY"
  | "ALIAS_AMBIGUOUS"
  | "MINIMUM_IDENTITY_MISSING";

export type KnrCatalogLocalHit = {
  status: "LOCAL_HIT";
  identityKeyV2: string;
  entry: KnrCatalogEntry;
  normBundle: KnrNormBundle;
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogLocalMiss = {
  status: "LOCAL_MISS";
  identityKeyV2: string;
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogInvalidLookup = {
  status: "INVALID_LOOKUP";
  identityKeyV2: string;
  reason: KnrInvalidLookupReason;
  httpRequestCount: 0;
  researchExecuted: false;
};

export type KnrCatalogLookupResult =
  | KnrCatalogLocalHit
  | KnrCatalogLocalMiss
  | KnrCatalogInvalidLookup;

function isTombstoned(store: KnrCatalogStore, identityKeyV2: string): boolean {
  return (store.tombstones ?? []).includes(identityKeyV2);
}

/** VERIFIED or STALE + ACTIVE lifecycle may be served as LOCAL HIT. */
export function isKnrCatalogEntryServable(entry: KnrCatalogEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.lifecycleState !== "ACTIVE") return false;
  return entry.verificationStatus === "VERIFIED" || entry.verificationStatus === "STALE";
}

function resolveHit(
  store: KnrCatalogStore,
  identityKeyV2: string,
): KnrCatalogLocalHit | KnrCatalogLocalMiss {
  if (isTombstoned(store, identityKeyV2)) {
    return {
      status: "LOCAL_MISS",
      identityKeyV2,
      httpRequestCount: 0,
      researchExecuted: false,
    };
  }
  const entry = store.entries[identityKeyV2];
  if (!isKnrCatalogEntryServable(entry)) {
    return {
      status: "LOCAL_MISS",
      identityKeyV2,
      httpRequestCount: 0,
      researchExecuted: false,
    };
  }
  return {
    status: "LOCAL_HIT",
    identityKeyV2,
    entry: entry!,
    normBundle: entry!.norms,
    httpRequestCount: 0,
    researchExecuted: false,
  };
}

function collectAliasCandidates(
  store: KnrCatalogStore,
  evidenceKeyV1: string,
): KnrCatalogEntry[] {
  const keys = store.aliasIndex[evidenceKeyV1.trim()] ?? [];
  const servable: KnrCatalogEntry[] = [];
  for (const key of keys) {
    const entry = store.entries[key];
    if (isKnrCatalogEntryServable(entry) && !isTombstoned(store, key)) {
      servable.push(entry!);
    }
  }
  return servable.sort((a, b) => a.identityKeyV2.localeCompare(b.identityKeyV2));
}

/**
 * Pure local lookup — deterministic · HTTP=0 · research=0.
 */
export function lookupKnrCatalog(
  request: KnrCatalogLookupRequest,
  store: KnrCatalogStore,
): KnrCatalogLookupResult {
  const identityKeyV2 = String(request.identityKeyV2 ?? "").trim();

  if (!identityKeyV2) {
    return {
      status: "INVALID_LOOKUP",
      identityKeyV2: "",
      reason: "EMPTY_KEY",
      httpRequestCount: 0,
      researchExecuted: false,
    };
  }

  if (request.partialIdentity && !hasMinimumKnrIdentityPartial(request.partialIdentity)) {
    return {
      status: "INVALID_LOOKUP",
      identityKeyV2,
      reason: "MINIMUM_IDENTITY_MISSING",
      httpRequestCount: 0,
      researchExecuted: false,
    };
  }

  const primary = resolveHit(store, identityKeyV2);
  if (primary.status === "LOCAL_HIT") return primary;

  const aliasKey = request.evidenceKeyV1?.trim();
  if (!aliasKey) return primary;

  const candidates = collectAliasCandidates(store, aliasKey);
  if (candidates.length === 0) return primary;
  if (candidates.length === 1) {
    const entry = candidates[0]!;
    return {
      status: "LOCAL_HIT",
      identityKeyV2: entry.identityKeyV2,
      entry,
      normBundle: entry.norms,
      httpRequestCount: 0,
      researchExecuted: false,
    };
  }

  return {
    status: "INVALID_LOOKUP",
    identityKeyV2,
    reason: "ALIAS_AMBIGUOUS",
    httpRequestCount: 0,
    researchExecuted: false,
  };
}
