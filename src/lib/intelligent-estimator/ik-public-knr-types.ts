/**
 * IK Public KNR Research — types.
 *
 * SSOT catalog = kw-knr-catalog (PENDING_VERIFY / VERIFIED).
 * User term "VERIFIED_PUBLIC" maps to catalog PENDING_VERIFY + evidence DISCOVERED
 * (never write-router VERIFIED without Owner KL-6).
 *
 * ZERO invent qtyFactor/materialKey/workId · ZERO TechPack ACTIVE · ZERO P7/G3.
 */

export const IK_PUBLIC_KNR_RESEARCH_SCHEMA_VERSION = 1 as const;
export const IK_PUBLIC_KNR_RESEARCH_RESOLVER_ID = "public-knr-research-v1" as const;

export type PublicKnrSourceKind =
  | "BIP"
  | "GOVERNMENT"
  | "LOCAL_GOV"
  | "PUBLIC_TENDER"
  | "PUBLIC_PDF"
  | "PUBLIC_COST_ESTIMATE"
  | "PUBLIC_ARCHIVE"
  | "UNIVERSITY"
  | "PUBLIC_CONSTRUCTION"
  | "PUBLIC_KNR_CATALOG"
  | "OTHER_PUBLIC";

export type PublicKnrSourceTier =
  | "PUBLIC_TENDER_OFFICIAL"
  | "GOVERNMENT_BIP"
  | "UNIVERSITY"
  | "PUBLIC_TECHNICAL_DOCUMENT"
  | "PUBLIC_INDUSTRY_SITE"
  | "SEARCH_INDEXED_DOCUMENT"
  | "OTHER";

export type PublicKnrRejectReason =
  | "PAYWALL"
  | "LICENSE_REQUIRED"
  | "ROBOTS_DENY"
  | "NOT_ALLOWLISTED"
  | "SSRF"
  | "TIMEOUT"
  | "CONTENT_TOO_LARGE"
  | "NO_KNR_MATCH"
  | "EXTRACT_PARTIAL"
  | "DUPLICATE_EVIDENCE"
  | "ADAPTER_SKIP"
  | "BUDGET"
  | "OTHER";

/** Extracted public KNR — code/description/unit primary; BOM optional hard-only. */
export type PublicKnrRecord = {
  family: "KNR" | "KNR-W" | "KNNR" | "NNRNKB" | "OTHER";
  chapter: string | null;
  catalogId: string | null;
  positionCode: string;
  description: string | null;
  unit: string | null;
  materials?: Array<{
    materialKey: string;
    unit: string;
    qtyFactor: number;
    provenanceRef: string;
  }> | null;
  sourceUrl: string;
  sourceHash: string;
  sourceKind: PublicKnrSourceKind;
  sourceTier: PublicKnrSourceTier;
  sourceId: string;
  retrievedAt: string;
  /** True only when materialKey+unit+qtyFactor+provenance all present (rare for public BOQ). */
  bomComplete: boolean;
};

export type IkPublicKnrQueryPlan = {
  evidenceKeyV1: string;
  displayCode: string;
  queries: string[];
};

export type IkPublicKnrResearchTelemetry = {
  evidenceKeyV1: string;
  displayCode: string;
  catalogBefore: "HIT" | "PENDING" | "MISS";
  queries: string[];
  sourcesTried: number;
  sourcesAccepted: number;
  sourcesRejected: number;
  rejectReasons: PublicKnrRejectReason[];
  recordsExtracted: number;
  recordsValidated: number;
  catalogInserted: number;
  catalogSkippedDuplicate: number;
  bomCandidates: number;
  httpRequestCount: number;
  holdReasons: string[];
  nextAction:
    | "CONTINUE_ANALYSIS_WITH_VERIFIED_KNR"
    | "CONTINUE_WITH_PENDING_KNR_BOM_HOLD"
    | "IDENTITY_REQUIRED"
    | "NO_PUBLIC_EVIDENCE"
    | "SKIP_LOCAL_HIT"
    | "FEATURE_OR_ALLOWLIST_OFF";
};

export type IkPublicKnrCodeResult = {
  evidenceKeyV1: string;
  identityKeyV2: string;
  displayCode: string;
  /** Mapped: evidence DISCOVERED / catalog PENDING_VERIFY (alias VERIFIED_PUBLIC). */
  catalogLifecycle: "UNCHANGED" | "PENDING_VERIFY" | "ALREADY_VERIFIED" | "ALREADY_PENDING";
  knrEvidenceFound: boolean;
  bomComplete: boolean;
  identityRequired: boolean;
  telemetry: IkPublicKnrResearchTelemetry;
  messagePl: string;
};

export type PublicKnrSourceEvidence = {
  sourceUrl: string;
  sourceKind: PublicKnrSourceKind;
  title?: string;
  retrievedAt: string;
  httpStatus?: number;
  contentType?: string;
  accessible: boolean;
  paywall: boolean;
  score?: number;
  evidence?: string[];
};

export type PublicKnrDiscoveryTrace = {
  requestedCode: string;
  normalizedCode: string;
  queries: string[];
  sourcesTried: PublicKnrSourceEvidence[];
  sourcesAccepted: PublicKnrSourceEvidence[];
  sourcesRejected: Array<PublicKnrSourceEvidence & { reason: PublicKnrRejectReason }>;
  evidence: string[];
  extractedRecords: PublicKnrRecord[];
  catalogAction: "NONE" | "STAGED_PENDING" | "SKIP_DUPLICATE" | "SKIP_LOCAL_HIT";
  verificationStatus: "PENDING_VERIFY" | "UNCHANGED" | "ALREADY_VERIFIED";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  bomStatus:
    | "BOM_NOT_AVAILABLE"
    | "BOM_PARTIAL"
    | "BOM_COMPLETE"
    | "BOM_NOT_COMPLETE";
  discoveryStatus:
    | "KNR_FOUND"
    | "KNR_VERIFIED_BY_MULTI_SOURCE"
    | "KNR_STAGED"
    | "NO_PUBLIC_EVIDENCE"
    | "CROSS_FAMILY_REJECT"
    | "SKIP_CATALOG_HIT";
  reanalysisRequired: boolean;
  selectionReason?: string;
  httpRequestCount: number;
  invent: false;
};

export type PublicKnrReanalysisTarget = {
  tenderId?: string;
  dwellingId?: string;
  lineId?: string;
  knrCode: string;
  evidenceKeyV1: string;
  identityKeyV2: string;
};

export type IkPublicKnrResearchResult = {
  schemaVersion: typeof IK_PUBLIC_KNR_RESEARCH_SCHEMA_VERSION;
  resolverId: typeof IK_PUBLIC_KNR_RESEARCH_RESOLVER_ID;
  perCode: IkPublicKnrCodeResult[];
  httpRequestCount: number;
  catalogInsertedTotal: number;
  catalogSkippedDuplicateTotal: number;
  bomCandidatesTotal: number;
  reanalyzeRequired: boolean;
  reanalysisTargets?: PublicKnrReanalysisTarget[];
  traces?: PublicKnrDiscoveryTrace[];
  /** Never true from this engine. */
  authorityWrites: {
    catalogVerified: false;
    technologyPackActive: false;
    priceMemoryAccept: false;
    p7Persist: false;
    g3: false;
    invent: false;
  };
  discoveryStore: unknown;
  catalogStore: unknown;
};
