/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.1 + P2.2 — batch builder with local proposal cache.
 *
 * Flow: dedup → cache lookup → P1 build for MISS only → persist → merge.
 * P2.2: tamper sanitize · quota graceful · freshness advisory · lazy stores on MISS only.
 * HTTP=0 · Supabase=0 · WC/A1/mapping/pricing write=0.
 */

import {
  isKnrWcIdentityBridgeP1Enabled,
  isKnrWcIdentityBridgeP21PersistEnabled,
  isKnrWcIdentityBridgeP22HardeningEnabled,
} from "./knr-wc-identity-bridge-feature";
import {
  isProposalStale,
  readCurrentUpstreamFingerprint,
  snapshotUpstreamFingerprint,
} from "./knr-wc-identity-bridge-freshness";
import { resolveBridgeStoresLazy } from "./knr-wc-identity-bridge-stores-lazy";
import {
  buildKnrWcIdentityProposals,
  type BuildKnrWcIdentityProposalsInput,
} from "./knr-wc-identity-bridge";
import type {
  KnrWcBridgeKeyInput,
  KnrWcIdentityProposal,
  KnrWcIdentityProposalBatchMetrics,
  KnrWcIdentityProposalCacheMetrics,
  KnrWcIdentityProposalCachedBatch,
  KnrWcIdentityProposalRecord,
  KnrWcIdentityProposalStore,
  KnrWcProposalPersistResult,
} from "./knr-wc-identity-bridge-types";
import {
  loadKnrWcIdentityProposalStoreLocal,
  proposalToPersistedRecord,
  recordToProposalForTender,
  resolveProposalRecordForCacheHit,
  saveKnrWcIdentityProposalStoreLocal,
  upsertKnrWcIdentityProposalRecord,
} from "./knr-wc-identity-proposal-store";

export type BuildKnrWcIdentityProposalsWithCacheInput = BuildKnrWcIdentityProposalsInput & {
  /** In-memory store for tests — skips localStorage when set. */
  proposalStoreOverride?: KnrWcIdentityProposalStore | null;
  /** P2.1 feature override. */
  persistEnabled?: boolean | null;
  /** P2.2 feature override. */
  p22HardeningEnabled?: boolean | null;
  /** ISO timestamp for persist (tests). */
  nowIso?: string;
  /** When false, persist in-memory only (no localStorage write). Default true. */
  persistToLocalStorage?: boolean;
  /** P2.2 — force single-key cache MISS (Owner refresh). */
  forceRefreshKeys?: readonly string[];
  /** P2.2 — optional lazy store loaders (Host · never Supabase from bridge). */
  loadCatalogStore?: () => import("./knr-knowledge/knr-catalog-store").KnrCatalogStore | null;
  loadDiscoveryStore?: () => import("./knr-knowledge/knr-discovery-evidence-types").KnrDiscoveryEvidenceStore | null;
  loadWorks?: () => import("./knr-wc-identity-bridge-types").KnrWcBridgeWorkRef[];
};

type CacheHitRow = {
  key: KnrWcBridgeKeyInput;
  record: KnrWcIdentityProposalRecord;
  staleEvidence: boolean;
  unitRevalidationRequired: boolean;
};

function emptyCacheMetrics(partial: Partial<KnrWcIdentityProposalCacheMetrics> & {
  inputKeys: number;
  uniqueKeys: number;
}): KnrWcIdentityProposalCacheMetrics {
  return {
    cacheHits: 0,
    cacheMisses: 0,
    proposalsBuilt: 0,
    proposalsReused: 0,
    discoveryCalls: 0,
    catalogLookups: 0,
    remoteStoreLoads: 0,
    supabaseQueries: 0,
    httpCalls: 0,
    catalogWorkWritten: 0,
    a1Written: 0,
    mappingWritten: 0,
    pricingWritten: 0,
    scraping: 0,
    ...partial,
  };
}

function parseKeyTableCode(key: KnrWcBridgeKeyInput): string {
  const nk = key.normalizedKey;
  const parts = nk.split("|");
  if (key.tableCode) return String(key.tableCode);
  if (parts.length >= 3) return parts[parts.length - 1] || "";
  return "";
}

/**
 * Batch builder with normalizedKey proposal cache (P2.1 + optional P2.2 hardening).
 * Requires P1 enabled for MISS builds; cache HITs skip all discovery/catalog work.
 */
export function buildKnrWcIdentityProposalsWithCache(
  input: BuildKnrWcIdentityProposalsWithCacheInput,
): KnrWcIdentityProposalCachedBatch {
  const tenderId = String(input.tenderId || "").trim() || "unknown-tender";
  const rawKeys = input.keys ?? [];
  const totalKeysInput = rawKeys.length;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const persistToDisk = input.persistToLocalStorage !== false;

  const p1Enabled = isKnrWcIdentityBridgeP1Enabled(input.featureEnabled);
  const p21Enabled = isKnrWcIdentityBridgeP21PersistEnabled(input.persistEnabled);
  const p22Enabled = isKnrWcIdentityBridgeP22HardeningEnabled(input.p22HardeningEnabled);

  if (!p1Enabled) {
    const empty = buildKnrWcIdentityProposals(input);
    return {
      ...empty,
      cacheMetrics: emptyCacheMetrics({
        inputKeys: totalKeysInput,
        uniqueKeys: 0,
      }),
    };
  }

  if (!p21Enabled) {
    const batch = buildKnrWcIdentityProposals(input);
    return {
      ...batch,
      cacheMetrics: emptyCacheMetrics({
        inputKeys: totalKeysInput,
        uniqueKeys: batch.metrics.uniqueKeys,
        proposalsBuilt: batch.proposals.length,
        discoveryCalls: batch.metrics.discoveryLookupCalls,
        catalogLookups: batch.metrics.catalogLookupCalls,
      }),
    };
  }

  const seen = new Set<string>();
  const unique: KnrWcBridgeKeyInput[] = [];
  let duplicateKeysDropped = 0;
  for (const k of rawKeys) {
    const nk = String(k.normalizedKey || "").trim();
    if (!nk) continue;
    if (seen.has(nk)) {
      duplicateKeysDropped += 1;
      continue;
    }
    seen.add(nk);
    unique.push({ ...k, normalizedKey: nk });
  }

  let store =
    input.proposalStoreOverride
    ?? loadKnrWcIdentityProposalStoreLocal();

  const mappedActive = new Set(
    (input.ownerMappings ?? [])
      .filter((m) => m.active && m.ownerApproval)
      .map((m) => m.normalizedKey),
  );

  const skippedHoldKeys: string[] = [];
  const skippedMappedKeys: string[] = [];
  const cacheHitRows: CacheHitRow[] = [];
  const cacheMissKeys: KnrWcBridgeKeyInput[] = [];

  const currentUpstream = readCurrentUpstreamFingerprint(
    input.catalogStore,
    input.discoveryStore,
  );

  for (const key of unique) {
    const tableCode = parseKeyTableCode(key);
    if (!tableCode) {
      skippedHoldKeys.push(key.normalizedKey);
      continue;
    }
    if (mappedActive.has(key.normalizedKey)) {
      skippedMappedKeys.push(key.normalizedKey);
      continue;
    }

    const rawEntry = store.entries[key.normalizedKey];
    if (!rawEntry) {
      cacheMissKeys.push(key);
      continue;
    }

    const resolved = resolveProposalRecordForCacheHit(rawEntry, nowIso, {
      p22Hardening: p22Enabled,
    });
    if (!resolved) {
      cacheMissKeys.push(key);
      continue;
    }

    if (p22Enabled) {
      const stale = isProposalStale(
        resolved,
        currentUpstream,
        key,
        input.forceRefreshKeys,
      );
      if (stale.forceMiss) {
        cacheMissKeys.push(key);
        continue;
      }
      cacheHitRows.push({
        key,
        record: resolved,
        staleEvidence: stale.staleEvidence,
        unitRevalidationRequired: stale.unitRevalidationRequired,
      });
    } else {
      cacheHitRows.push({
        key,
        record: resolved,
        staleEvidence: false,
        unitRevalidationRequired: false,
      });
    }
  }

  let cacheHits = 0;
  let proposalsReused = 0;
  const reusedProposals: KnrWcIdentityProposal[] = [];

  for (const row of cacheHitRows) {
    cacheHits += 1;
    proposalsReused += 1;
    reusedProposals.push(
      recordToProposalForTender(row.record, tenderId, row.key.lineRefs ?? [], {
        staleEvidence: row.staleEvidence || undefined,
        unitRevalidationRequired: row.unitRevalidationRequired || undefined,
      }),
    );
  }

  let remoteStoreLoads = 0;
  let builtBatch = null;
  const builtProposals: KnrWcIdentityProposal[] = [];
  let persistResult: KnrWcProposalPersistResult | undefined;

  if (cacheMissKeys.length > 0) {
    const lazy = p22Enabled
      ? resolveBridgeStoresLazy({
          cacheMissKeys,
          catalogStore: input.catalogStore,
          discoveryStore: input.discoveryStore,
          works: input.works,
          loadCatalogStore: input.loadCatalogStore,
          loadDiscoveryStore: input.loadDiscoveryStore,
          loadWorks: input.loadWorks,
        })
      : {
          catalogStore: input.catalogStore ?? null,
          discoveryStore: input.discoveryStore ?? null,
          works: input.works ?? [],
          remoteStoreLoads: 0,
          supabaseQueries: 0 as const,
        };
    remoteStoreLoads = lazy.remoteStoreLoads;

    const persistFingerprint = snapshotUpstreamFingerprint(
      lazy.catalogStore,
      lazy.discoveryStore,
    );

    builtBatch = buildKnrWcIdentityProposals({
      ...input,
      keys: cacheMissKeys,
      catalogStore: lazy.catalogStore,
      discoveryStore: lazy.discoveryStore,
      works: lazy.works,
      featureEnabled: true,
    });
    const keyByNk = new Map(cacheMissKeys.map((k) => [k.normalizedKey, k]));
    for (const proposal of builtBatch.proposals) {
      const record = proposalToPersistedRecord(proposal, nowIso, persistFingerprint);
      upsertKnrWcIdentityProposalRecord(store, record, nowIso);
      builtProposals.push(
        recordToProposalForTender(
          store.entries[record.normalizedKey] ?? record,
          tenderId,
          keyByNk.get(proposal.normalizedKey)?.lineRefs ?? [],
        ),
      );
    }
    if (persistToDisk && !input.proposalStoreOverride) {
      persistResult = saveKnrWcIdentityProposalStoreLocal(store, nowIso);
      store = persistResult.store;
    }
  }

  const proposals = [...reusedProposals, ...builtProposals];
  proposals.sort((a, b) =>
    a.normalizedKey < b.normalizedKey ? -1 : a.normalizedKey > b.normalizedKey ? 1 : 0,
  );

  const holdUnit = proposals.filter((p) => p.unitStatus === "HOLD_UNIT").length;
  const holdEvidence = proposals.filter((p) => p.recommendation === "HOLD_EVIDENCE").length;
  const discoveryRequired = proposals.filter((p) => p.discoveryStatus === "DISCOVERY_REQUIRED").length;
  const knrLocalHit = proposals.filter((p) => p.sourceStatus === "LOCAL_CATALOG").length;
  const evidenceHit = proposals.filter(
    (p) => p.sourceStatus === "DISCOVERY_EVIDENCE" || p.sourceStatus === "HARVEST",
  ).length;

  const metrics: KnrWcIdentityProposalBatchMetrics = {
    totalKeysInput,
    uniqueKeys: unique.length,
    duplicateKeysDropped,
    proposals: proposals.length,
    holdUnit,
    holdEvidence,
    discoveryRequired,
    knrLocalHit,
    evidenceHit,
    catalogIndexBuilds: builtBatch?.metrics.catalogIndexBuilds ?? 0,
    catalogLookupCalls: builtBatch?.metrics.catalogLookupCalls ?? 0,
    discoveryIndexBuilds: builtBatch?.metrics.discoveryIndexBuilds ?? 0,
    discoveryLookupCalls: builtBatch?.metrics.discoveryLookupCalls ?? 0,
    worksScanCalls: builtBatch?.metrics.worksScanCalls ?? 0,
    remoteStoreLoads,
    supabaseQueryCount: 0,
    httpRequestCount: 0,
    researchExecuted: false,
    catalogWorkWritten: 0,
    a1Written: 0,
    mappingWritten: 0,
    pricingWritten: 0,
    scraping: 0,
  };

  const cacheMetrics = emptyCacheMetrics({
    inputKeys: totalKeysInput,
    uniqueKeys: unique.length,
    cacheHits,
    cacheMisses: cacheMissKeys.length,
    proposalsBuilt: builtProposals.length,
    proposalsReused,
    discoveryCalls: builtBatch?.metrics.discoveryLookupCalls ?? 0,
    catalogLookups: builtBatch?.metrics.catalogLookupCalls ?? 0,
    remoteStoreLoads,
  });

  return {
    tenderId,
    proposals,
    skippedHoldKeys,
    skippedMappedKeys,
    metrics,
    cacheMetrics,
    persistResult,
  };
}
