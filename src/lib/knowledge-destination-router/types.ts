/**
 * GO48 / KB-03 — Knowledge Destination Router (thin facade).
 *
 * Research Result → Knowledge Type → Destination → Authority → Persistence → Index → Reuse
 *
 * NOT a storage layer. NOT a replacement for catalog-write-router.
 * Does NOT escalate Evidence/Candidate/Research → OUR RATE.
 */

export const KB03_KNOWLEDGE_DESTINATION_ROUTER_ID =
  "KB-03-KNOWLEDGE-DESTINATION-ROUTER-GO48" as const;

/** Typed knowledge kinds — classify ONLY via explicit discriminant, never free text. */
export const KNOWLEDGE_TYPES = [
  "LABOR_RATE",
  "MATERIAL_PRICE",
  "MARKET_QUOTE",
  "WORK_IDENTITY",
  "IDENTITY_CANDIDATE",
  "KNR_MAPPING",
  "G177_MAPPING",
  "TECHNOLOGY",
  "BOM",
  "TECHNOLOGY_PACK",
  "HISTORICAL",
  "TENDER_SPECIFIC",
  "MARGIN",
  "SELL",
  "EVIDENCE",
  "RESEARCH_CANDIDATE",
  "SUPPLIER",
  "REGIONAL",
  "WORK_CATALOG",
  "OUR_RATE",
  "COMPANY_PRICE",
] as const;

export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export type KnowledgeDestinationId =
  | "LABOR_SOURCE_EVIDENCE"
  | "IDENTITY_CANDIDATE_STORE"
  | "WORK_CATALOG"
  | "OUR_RATE_VIA_ACCEPT"
  | "PRICE_MEMORY_VIA_ACCEPT"
  | "KNR_DISCOVERY"
  | "KNR_VERIFIED_CATALOG"
  | "EPHEMERAL_CANDIDATE"
  | "DERIVED_NO_STORE"
  | "COMMERCIAL_PRICING"
  | "UNSUPPORTED";

export type KnowledgeAuthority =
  | "EVIDENCE_OBSERVATION"
  | "RESEARCH_CANDIDATE"
  | "OWNER_REVIEW"
  | "OWNER_ACCEPT"
  | "OWNER_VERIFY"
  | "OWNER_CONFIG"
  | "PACK_GATE"
  | "DERIVED"
  | "LEGACY"
  | "HISTORICAL"
  | "TENDER_SCOPED"
  | "DISCOVERY"
  | "UNKNOWN";

export type KnowledgeRouteStatus =
  | "ROUTE_OK"
  | "OWNER_REQUIRED"
  | "UNSUPPORTED_DESTINATION"
  | "AMBIGUOUS_DESTINATION"
  | "AMBIGUOUS_TYPE"
  | "FORBIDDEN_CANONICAL_WRITE"
  | "INVALID_KNOWLEDGE"
  | "DUPLICATE"
  | "ORPHAN_REUSE_OPEN";

export type KnowledgeClassifyInput = {
  /**
   * Explicit typed discriminant — REQUIRED.
   * Free-string inference is forbidden (fail closed).
   */
  knowledgeType: KnowledgeType;
  /**
   * Optional intent: when set, must agree with knowledgeType destination family
   * or route fails AMBIGUOUS_DESTINATION.
   */
  intendedDestination?: KnowledgeDestinationId | null;
  /** When true, caller requests canonical OUR RATE / WC write via router — always OWNER_REQUIRED / FORBIDDEN. */
  requestCanonicalWrite?: boolean;
  /** When true, caller asserts Owner authorization for Owner-gated destinations. */
  ownerAuthorized?: boolean;
};

export type KnowledgeRoutePlan = {
  routerId: typeof KB03_KNOWLEDGE_DESTINATION_ROUTER_ID;
  status: KnowledgeRouteStatus;
  knowledgeType: KnowledgeType | null;
  destination: KnowledgeDestinationId;
  authority: KnowledgeAuthority;
  persistence: "EXISTING_STORE" | "EPHEMERAL" | "DERIVED" | "NONE" | "UNSUPPORTED";
  reusable: boolean;
  canonical: boolean;
  ownerRequired: boolean;
  indexed: boolean;
  orphanReuse: boolean;
  messagePl: string;
  /** catalog-write-router remains separate WC gate — never claimed as this router. */
  isCatalogWriteRouter: false;
};

export type KnowledgePersistInput = KnowledgeClassifyInput & {
  /** LABOR Evidence payload — only used for EVIDENCE / LABOR_RATE observation persist. */
  laborEvidence?: {
    workId: string;
    workNamePl: string;
    unit: string;
    observations: ReadonlyArray<{
      sourceId: string;
      workNamePl: string;
      ratePln: number;
      unit: string;
      regionScope: string;
      laborOnly: true;
      sourceUrl: string;
      observedAt: string;
      netGross: "netto" | "brutto" | "unknown";
      sourceMinPln?: number | null;
      sourceMaxPln?: number | null;
    }>;
    synonymUsed?: string | null;
    identityMethod?: "exact_name" | "owner_synonym" | "owner_identity_mapping" | "names_loosely" | "unmatched";
    persist?: boolean;
  };
};

export type KnowledgePersistResult = KnowledgeRoutePlan & {
  wrote: boolean;
  ourRateWritten: false;
  workCatalogMutated: false;
  identityCandidateMutated: false;
  priceMemoryWritten: false;
  technologyPackMutated: false;
  detail?: unknown;
};

export type KnowledgeReuseQuery = {
  knowledgeType: KnowledgeType;
  workId?: string;
  workNamePl?: string;
  unit?: string;
};

export type KnowledgeReuseResult = {
  routerId: typeof KB03_KNOWLEDGE_DESTINATION_ROUTER_ID;
  status: KnowledgeRouteStatus;
  hit: boolean;
  count: number;
  isOurRate: false;
  reusable: boolean;
  orphanReuse: boolean;
  messagePl: string;
};
