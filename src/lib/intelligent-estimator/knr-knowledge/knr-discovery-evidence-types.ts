/**
 * KL-7-P2A — Discovery evidence memory types (≠ authority catalog · ≠ ATH blobs).
 * ZERO HTTP · ZERO PLN · ZERO VERIFIED · family locked.
 */

import type { KnrCatalogFamily, KnrNormComponentKind } from "./types";

export const KNR_DISCOVERY_EVIDENCE_STORAGE_KEY = "kw-knr-discovery-evidence" as const;

export const KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const KNR_DISCOVERY_OPS_FRESHNESS_DAYS = 90 as const;

/** Discovery-layer status — NEVER mix with verificationStatus. */
export type KnrDiscoveryStatus =
  | "DISCOVERED"
  | "CORROBORATED"
  | "CONFLICT"
  | "INCOMPLETE"
  | "READY_FOR_OWNER_VERIFY";

export type KnrDiscoveryOpsFreshness = "FRESH" | "STALE";

export type KnrDiscoveryLifecycle = "ACTIVE" | "SUPERSEDED" | "REJECTED";

export type KnrDiscoverySourcePriority =
  | "GOVERNMENT"
  | "OFFICIAL_PUBLIC_DOCUMENT"
  | "UNIVERSITY"
  | "PUBLIC_TENDER"
  | "INDUSTRY"
  | "OTHER";

/** Partial norm line — structural only · no PLN. */
export type KnrDiscoveryNormLine = {
  kind: KnrNormComponentKind;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  sourceRef?: string | null;
};

export type KnrDiscoveryNormBundle = {
  laborNorms: KnrDiscoveryNormLine[];
  materialNorms: KnrDiscoveryNormLine[];
  equipmentNorms: KnrDiscoveryNormLine[];
};

export type KnrDiscoverySourceRef = {
  sourceId: string;
  /** Hash of allowlisted URL — never free client URL string as authority. */
  urlHash: string;
  title?: string;
  publisher?: string;
  edition?: string;
  fragment?: string;
  contentHash: string;
  fetchedAt: string;
  priority: KnrDiscoverySourcePriority;
};

export type KnrDiscoveryEvidenceRecord = {
  schemaVersion: typeof KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION;
  evidenceKeyV1: string;
  identityKeyV2?: string | null;
  family: KnrCatalogFamily | string;
  displayCode: string;
  description?: string;
  unit?: string;
  discoveryStatus: KnrDiscoveryStatus;
  lifecycleState: KnrDiscoveryLifecycle;
  sources: KnrDiscoverySourceRef[];
  norms: KnrDiscoveryNormBundle;
  queryHashes: string[];
  /** Ops freshness marker — recomputed from lastFetchedAt / updatedAt. */
  freshness: KnrDiscoveryOpsFreshness;
  contentHash: string;
  lastFetchedAt?: string | null;
  lastResearchAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Always null until KL-6 VERIFY creates catalog authority. */
  catalogRevisionLink?: number | null;
};

export type KnrDiscoveryEvidenceStore = {
  schemaVersion: typeof KNR_DISCOVERY_EVIDENCE_SCHEMA_VERSION;
  updatedAt: string;
  etag: string;
  /** Primary map keyed by evidenceKeyV1. */
  entries: Record<string, KnrDiscoveryEvidenceRecord>;
  byEvidenceKey: Record<string, string>;
  byIdentityKey: Record<string, string[]>;
  byUrlHash: Record<string, string[]>;
  byQueryHash: Record<string, string[]>;
  byContentHash: Record<string, string[]>;
};

export const KNR_DISCOVERY_PRICING_FIELD_DENY = new Set([
  "ourRatePln",
  "pricePln",
  "pln",
  "marketQuotes",
  "ourRate",
  "sellPrice",
  "costPln",
  "companyPrice",
  "companyPricePln",
  "margin",
  "workId",
  "catalogWorkId",
]);

export function knrDiscoveryStatusLabelPl(status: KnrDiscoveryStatus): string {
  switch (status) {
    case "DISCOVERED":
      return "Odkryty";
    case "CORROBORATED":
      return "Potwierdzony (evidence)";
    case "CONFLICT":
      return "Konflikt";
    case "INCOMPLETE":
      return "Niekompletny";
    case "READY_FOR_OWNER_VERIFY":
      return "Gotowy do VERIFY";
    default:
      return String(status);
  }
}
