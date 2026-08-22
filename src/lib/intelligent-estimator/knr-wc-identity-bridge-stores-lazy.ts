/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.2 — lazy store resolution for MISS-only builds.
 *
 * FULL cache HIT → zero store loads · zero remote · bridge never calls Supabase.
 */

import type { KnrCatalogStore } from "./knr-knowledge/knr-catalog-store";
import type { KnrDiscoveryEvidenceStore } from "./knr-knowledge/knr-discovery-evidence-types";
import type {
  KnrWcBridgeKeyInput,
  KnrWcBridgeWorkRef,
} from "./knr-wc-identity-bridge-types";

export type ResolveBridgeStoresLazyInput = {
  cacheMissKeys: readonly KnrWcBridgeKeyInput[];
  catalogStore?: KnrCatalogStore | null;
  discoveryStore?: KnrDiscoveryEvidenceStore | null;
  works?: readonly KnrWcBridgeWorkRef[];
  /** Host-provided lazy loaders — invoked at most once each per batch MISS. */
  loadCatalogStore?: () => KnrCatalogStore | null;
  loadDiscoveryStore?: () => KnrDiscoveryEvidenceStore | null;
  loadWorks?: () => readonly KnrWcBridgeWorkRef[];
};

export type ResolveBridgeStoresLazyResult = {
  catalogStore: KnrCatalogStore | null;
  discoveryStore: KnrDiscoveryEvidenceStore | null;
  works: readonly KnrWcBridgeWorkRef[];
  remoteStoreLoads: number;
  supabaseQueries: 0;
};

const EMPTY_LAZY: ResolveBridgeStoresLazyResult = {
  catalogStore: null,
  discoveryStore: null,
  works: [],
  remoteStoreLoads: 0,
  supabaseQueries: 0,
};

/**
 * Resolve input stores only when there are cache misses.
 * Never loads per-key · never N× remote.
 */
export function resolveBridgeStoresLazy(
  input: ResolveBridgeStoresLazyInput,
): ResolveBridgeStoresLazyResult {
  if (input.cacheMissKeys.length === 0) {
    return EMPTY_LAZY;
  }

  let remoteStoreLoads = 0;
  let catalogStore = input.catalogStore ?? null;
  let discoveryStore = input.discoveryStore ?? null;
  let works: readonly KnrWcBridgeWorkRef[] = input.works ?? [];

  if (!catalogStore && input.loadCatalogStore) {
    catalogStore = input.loadCatalogStore() ?? null;
    remoteStoreLoads += 1;
  }
  if (!discoveryStore && input.loadDiscoveryStore) {
    discoveryStore = input.loadDiscoveryStore() ?? null;
    remoteStoreLoads += 1;
  }
  if (works.length === 0 && input.loadWorks) {
    works = input.loadWorks() ?? [];
    remoteStoreLoads += 1;
  }

  return {
    catalogStore,
    discoveryStore,
    works,
    remoteStoreLoads,
    supabaseQueries: 0,
  };
}
