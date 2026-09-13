/**
 * Labor source discovery — DISCOVERED ≠ TRUSTED Evidence.
 * Promote only after validation → durable Owner-route extension.
 * Does NOT weaken KEEP-5 / static Owner host-lock core.
 */

export const LABOR_SOURCE_DISCOVERY_STORAGE_KEY = "kw-labor-source-discovery" as const;
export const LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION = 1 as const;

export type DiscoveredSourceStatus =
  | "DISCOVERED"
  | "FETCH_VALIDATED"
  | "REJECTED"
  | "PROMOTED";

export type DiscoveredSourceProvenance = {
  enqueuedBy: "OWNER" | "OPS" | "CHATGPT" | "KEEP5_LINK_EXTRACT" | "UNKNOWN";
  notePl?: string | null;
  parentTrustedUrl?: string | null;
  actor?: string | null;
};

export type DiscoveredSourceRecord = {
  discoveryId: string;
  host: string;
  url: string;
  status: DiscoveredSourceStatus;
  provenance: DiscoveredSourceProvenance;
  observedAt: string;
  contentType: string | null;
  qualityScore: number;
  rejectReasonPl?: string | null;
  /** Set after successful promote */
  promotedSourceId?: string | null;
};

/** Runtime Owner-route extension — Evidence upsert may use after promote. */
export type PromotedTrustedEvidenceRoute = {
  sourceId: string;
  url: string;
  host: string;
  workId: string;
  unit: string;
  role: "REFERENCE";
  laborOnly: true;
  identityLabelPl: string;
  promotedAt: string;
  discoveryId: string;
  ownerStatus: "DISCOVERY_PROMOTED_TRUSTED_EVIDENCE_ROUTE";
  notePl: string;
};

export type LaborSourceDiscoveryStore = {
  schemaVersion: typeof LABOR_SOURCE_DISCOVERY_SCHEMA_VERSION;
  etag: string;
  updatedAt: string;
  discoveries: DiscoveredSourceRecord[];
  promotedRoutes: PromotedTrustedEvidenceRoute[];
};
