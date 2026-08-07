/**
 * GLOBAL-KNOWLEDGE-E1A — foundation types (DF GLOBAL-KNOWLEDGE-01).
 * Pure model: Legal · Provenance · Versioning · Identity · Lifecycle.
 * Brak cen · Link Table · Graph · KNR ingest w tym slice.
 */

export const GLOBAL_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

/** localStorage key — E1A: store istnieje, App nie wczytuje → NO-OP runtime. */
export const GLOBAL_KNOWLEDGE_STORAGE_KEY = "kw-global-knowledge";

export type GlobalKnowledgeEntryKind =
  | "norm"
  | "technology"
  | "material"
  | "pack_ref"
  | "other";

export type GlobalKnowledgeLifecycle =
  | "ACTIVE"
  | "DEPRECATED"
  | "SUPERSEDED"
  | "OBSOLETE";

export type GlobalKnowledgeConfidence = "high" | "medium" | "low";

export type GlobalKnowledgeAllowedUse =
  | "identity"
  | "lexicon"
  | "graph"
  | "indicative_rate";

/** Origin whitelist (Legal Gate) — bez live scrape. */
export type GlobalKnowledgeOriginId =
  | "manual_owner"
  | "licensed_bundle"
  | "user_controlled_import"
  | "wgdom_internal"
  | "technology_foundation";

export interface GlobalKnowledgeProvenance {
  originId: GlobalKnowledgeOriginId | string;
  licenceId: string;
  sourceFilename?: string | null;
  importedAt: string;
  importedBy: string;
  contentHash: string;
  allowedUse: GlobalKnowledgeAllowedUse[];
}

export interface GlobalKnowledgeLicenceRecord {
  licenceId: string;
  labelPl: string;
  originsAllowed: string[];
  allowedUse: GlobalKnowledgeAllowedUse[];
  active: boolean;
  /** ISO — opcjonalny koniec ważności licencji. */
  validTo?: string | null;
  notes?: string | null;
}

export interface GlobalKnowledgeEntry {
  globalId: string;
  kind: GlobalKnowledgeEntryKind;
  namePl: string;
  unit?: string | null;
  normCode?: string | null;
  lifecycle: GlobalKnowledgeLifecycle;
  /** Wymagane gdy lifecycle === SUPERSEDED. */
  supersededBy?: string | null;
  confidence: GlobalKnowledgeConfidence;
  revision: string;
  validFrom: string;
  validTo?: string | null;
  provenance: GlobalKnowledgeProvenance;
}

export interface GlobalKnowledgeStore {
  schemaVersion: typeof GLOBAL_KNOWLEDGE_SCHEMA_VERSION | number;
  contentVersion: string;
  licences: GlobalKnowledgeLicenceRecord[];
  entries: GlobalKnowledgeEntry[];
  updatedAt: string | null;
}

/** Payload kandydat na import — walidacja bez side-effect (E1A). */
export interface GlobalKnowledgeImportCandidate {
  kind: GlobalKnowledgeEntryKind;
  namePl: string;
  unit?: string | null;
  normCode?: string | null;
  revision?: string;
  validFrom?: string;
  validTo?: string | null;
  lifecycle?: GlobalKnowledgeLifecycle;
  supersededBy?: string | null;
  confidence?: GlobalKnowledgeConfidence;
  provenance: {
    originId: string;
    licenceId: string;
    sourceFilename?: string | null;
    importedAt?: string;
    importedBy: string;
    allowedUse: GlobalKnowledgeAllowedUse[];
  };
}
