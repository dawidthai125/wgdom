/**
 * KL-7-P2A — Lookup chain: CATALOG_HIT → EVIDENCE_HIT → DISCOVERY_REQUIRED.
 * HTTP always 0 · DISCOVERY_REQUIRED does NOT fetch.
 */

import type { KnrCatalogEntry } from "./knr-catalog-entry-types";
import {
  isKnrCatalogEntryServable,
  lookupKnrCatalog,
  type KnrCatalogLookupRequest,
} from "./knr-catalog-lookup";
import type { KnrCatalogStore } from "./knr-catalog-store";
import type { KnrDiscoveryEvidenceRecord, KnrDiscoveryEvidenceStore } from "./knr-discovery-evidence-types";

export type KnrDiscoveryLookupOutcome =
  | "CATALOG_HIT"
  | "EVIDENCE_HIT"
  | "DISCOVERY_REQUIRED"
  | "INVALID_LOOKUP";

export type KnrDiscoveryLookupResult =
  | {
      outcome: "CATALOG_HIT";
      identityKeyV2: string;
      evidenceKeyV1?: string;
      httpRequestCount: 0;
      catalogEntry: KnrCatalogEntry;
    }
  | {
      outcome: "EVIDENCE_HIT";
      identityKeyV2: string;
      evidenceKeyV1: string;
      httpRequestCount: 0;
      evidence: KnrDiscoveryEvidenceRecord;
    }
  | {
      outcome: "DISCOVERY_REQUIRED";
      identityKeyV2: string;
      evidenceKeyV1?: string;
      httpRequestCount: 0;
      /** Planning status only — never triggers fetch in P2A. */
      discoveryPlanned: false;
    }
  | {
      outcome: "INVALID_LOOKUP";
      identityKeyV2: string;
      reason: string;
      httpRequestCount: 0;
    };

function isEvidenceServable(entry: KnrDiscoveryEvidenceRecord | undefined): boolean {
  if (!entry) return false;
  if (entry.lifecycleState !== "ACTIVE") return false;
  // CONFLICT/INCOMPLETE may still be shown in UI, but EVIDENCE_HIT prefers usable discovery.
  return (
    entry.discoveryStatus === "DISCOVERED"
    || entry.discoveryStatus === "CORROBORATED"
    || entry.discoveryStatus === "READY_FOR_OWNER_VERIFY"
  );
}

export function lookupKnrDiscoveryEvidence(
  request: { evidenceKeyV1?: string | null; identityKeyV2?: string | null },
  store: KnrDiscoveryEvidenceStore,
): KnrDiscoveryEvidenceRecord | null {
  const ek = String(request.evidenceKeyV1 ?? "").trim();
  if (ek) {
    const byKey = store.entries[ek] ?? store.entries[store.byEvidenceKey[ek] ?? ""];
    if (isEvidenceServable(byKey)) return byKey!;
  }
  const ik = String(request.identityKeyV2 ?? "").trim();
  if (ik) {
    const keys = store.byIdentityKey[ik] ?? [];
    const candidates = keys
      .map((k) => store.entries[k])
      .filter(isEvidenceServable)
      .sort((a, b) => a!.evidenceKeyV1.localeCompare(b!.evidenceKeyV1));
    if (candidates.length === 1) return candidates[0]!;
    if (candidates.length > 1) {
      // Prefer READY / CORROBORATED
      const ready = candidates.find((c) => c!.discoveryStatus === "READY_FOR_OWNER_VERIFY");
      if (ready) return ready;
      const cor = candidates.find((c) => c!.discoveryStatus === "CORROBORATED");
      if (cor) return cor;
      return candidates[0]!;
    }
  }
  return null;
}

/**
 * Full P2A chain. Catalog HIT short-circuits — never checks discovery evidence.
 */
export function lookupKnrKnowledgeWithDiscoveryEvidence(input: {
  request: KnrCatalogLookupRequest;
  catalogStore: KnrCatalogStore;
  discoveryStore: KnrDiscoveryEvidenceStore;
}): KnrDiscoveryLookupResult {
  const catalog = lookupKnrCatalog(input.request, input.catalogStore);
  if (catalog.status === "INVALID_LOOKUP") {
    return {
      outcome: "INVALID_LOOKUP",
      identityKeyV2: catalog.identityKeyV2,
      reason: catalog.reason,
      httpRequestCount: 0,
    };
  }

  if (catalog.status === "LOCAL_HIT") {
    // CATALOG_HIT — do not consult discovery evidence.
    return {
      outcome: "CATALOG_HIT",
      identityKeyV2: catalog.identityKeyV2,
      evidenceKeyV1: catalog.entry.evidenceKeyV1,
      httpRequestCount: 0,
      catalogEntry: catalog.entry,
    };
  }

  // LOCAL_MISS → try discovery evidence
  const evidence = lookupKnrDiscoveryEvidence(
    {
      evidenceKeyV1: input.request.evidenceKeyV1,
      identityKeyV2: input.request.identityKeyV2,
    },
    input.discoveryStore,
  );

  if (evidence) {
    return {
      outcome: "EVIDENCE_HIT",
      identityKeyV2: input.request.identityKeyV2,
      evidenceKeyV1: evidence.evidenceKeyV1,
      httpRequestCount: 0,
      evidence,
    };
  }

  return {
    outcome: "DISCOVERY_REQUIRED",
    identityKeyV2: input.request.identityKeyV2,
    evidenceKeyV1: input.request.evidenceKeyV1 ?? undefined,
    httpRequestCount: 0,
    discoveryPlanned: false,
  };
}

/** Explicit re-export for tests — catalog servable gate unchanged. */
export { isKnrCatalogEntryServable };

export const KNR_DISCOVERY_LOOKUP_P2A_IMPLEMENTED = true as const;
