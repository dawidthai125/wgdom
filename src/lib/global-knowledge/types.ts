/**
 * GLOBAL-KNOWLEDGE — foundation types (DF GLOBAL-KNOWLEDGE-01 + E1B additive).
 * Pure model: Legal · Provenance · Versioning · Identity · Lifecycle · Aliases.
 * Brak cen · Link Table · Graph · KNR→WC ingest (E3 OUT).
 * schemaVersion = 1 (additive only).
 */

export const GLOBAL_KNOWLEDGE_SCHEMA_VERSION = 1 as const;

/** localStorage key — App nie wczytuje w E1B → NO-OP wyceny. */
export const GLOBAL_KNOWLEDGE_STORAGE_KEY = "kw-global-knowledge";

/** Feature flag LS key — default OFF (DF E1B / AR-C3). */
export const GLOBAL_KNOWLEDGE_E1B_FLAG_KEY = "kw-global-knowledge-e1b";

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
  /** E1B additive — synonimy Identity (fold + dedupe). */
  aliases: string[];
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

/** Payload kandydat na import — walidacja bez side-effect (E1A) / commit (E1B). */
export interface GlobalKnowledgeImportCandidate {
  kind: GlobalKnowledgeEntryKind;
  namePl: string;
  unit?: string | null;
  normCode?: string | null;
  aliases?: string[] | null;
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

/** Meta batchu kontrolowanego importu (E1B). */
export interface GlobalKnowledgeImportBatchMeta {
  importedBy: string;
  sourceFilename?: string | null;
  nowIso?: string;
  /** Test harness only — omija flag OFF dla unit tests (nie runtime prod). */
  forcePersistForTests?: boolean;
}

export interface GlobalKnowledgeSoftDeleteMeta {
  actor: string;
  nowIso?: string;
  forcePersistForTests?: boolean;
}

export interface GlobalKnowledgeLegalWipeOpts {
  /** Wymagany non-empty — bez silent wipe (DF). */
  confirmToken: string;
  actor: string;
  notes: string;
  nowIso?: string;
  forcePersistForTests?: boolean;
}
