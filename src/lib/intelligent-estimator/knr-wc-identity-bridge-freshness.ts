/**
 * IK-KNR-WC-IDENTITY-BRIDGE P2.2 — upstream fingerprint + stale advisory.
 *
 * Freshness is ADVISORY · never auto-rebuild batch · never HTTP/Supabase from bridge.
 */

import type { KnrCatalogStore } from "./knr-knowledge/knr-catalog-store";
import type { KnrDiscoveryEvidenceStore } from "./knr-knowledge/knr-discovery-evidence-types";
import type {
  KnrWcBridgeKeyInput,
  KnrWcIdentityProposalRecord,
  KnrWcUpstreamFingerprint,
} from "./knr-wc-identity-bridge-types";

export type KnrWcProposalStaleResult = {
  staleEvidence: boolean;
  unitRevalidationRequired: boolean;
  /** Single-key force refresh → cache MISS for that key only. */
  forceMiss: boolean;
};

export function snapshotUpstreamFingerprint(
  catalogStore?: KnrCatalogStore | null,
  discoveryStore?: KnrDiscoveryEvidenceStore | null,
): KnrWcUpstreamFingerprint {
  return {
    knrCatalogEtag: catalogStore?.etag?.trim() || null,
    discoveryEtag: discoveryStore?.etag?.trim() || null,
  };
}

export function readCurrentUpstreamFingerprint(
  catalogStore?: KnrCatalogStore | null,
  discoveryStore?: KnrDiscoveryEvidenceStore | null,
): KnrWcUpstreamFingerprint {
  return snapshotUpstreamFingerprint(catalogStore, discoveryStore);
}

/**
 * Advisory stale check — does NOT trigger rebuild or HTTP.
 */
export function isProposalStale(
  record: KnrWcIdentityProposalRecord,
  current: KnrWcUpstreamFingerprint,
  keyInput?: Pick<KnrWcBridgeKeyInput, "unitRaw"> | null,
  forceRefreshKeys?: ReadonlySet<string> | readonly string[] | null,
): KnrWcProposalStaleResult {
  const forceSet =
    forceRefreshKeys instanceof Set
      ? forceRefreshKeys
      : new Set(forceRefreshKeys ?? []);

  if (forceSet.has(record.normalizedKey)) {
    return {
      staleEvidence: false,
      unitRevalidationRequired: false,
      forceMiss: true,
    };
  }

  const snap = record.upstreamFingerprint;
  let staleEvidence = false;
  if (snap) {
    if (
      (snap.knrCatalogEtag ?? null) !== (current.knrCatalogEtag ?? null)
      || (snap.discoveryEtag ?? null) !== (current.discoveryEtag ?? null)
    ) {
      staleEvidence = true;
    }
  }

  const incomingUnit = String(keyInput?.unitRaw ?? "").trim();
  const cachedUnit = String(record.unitRaw ?? "").trim();
  const unitRevalidationRequired =
    incomingUnit.length > 0
    && cachedUnit.length > 0
    && incomingUnit !== cachedUnit;

  return {
    staleEvidence,
    unitRevalidationRequired,
    forceMiss: false,
  };
}
