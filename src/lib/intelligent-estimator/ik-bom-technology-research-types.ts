/**
 * IK BOM Technology Research — types (RESEARCH LAYER).
 * ZERO invent · ZERO Catalog/PM/TechnologyPack ACTIVE persist.
 */

export const IK_BOM_TECH_RESEARCH_SCHEMA_VERSION = 1 as const;
export const IK_BOM_TECH_RESEARCH_RESOLVER_ID = "bom-technology-research-v1" as const;

export type IkBomTechResearchStatus =
  | "RESOLVED"
  | "CANDIDATE"
  | "AMBIGUOUS"
  | "NO_EVIDENCE"
  | "OWNER_REQUIRED"
  | "IDENTITY_MISMATCH";

export type IkBomProviderAvailability =
  | "AVAILABLE"
  | "NOT_CONFIGURED"
  | "LICENSE_REQUIRED"
  | "SOURCE_UNAVAILABLE"
  | "DISABLED";

export type IkBomProviderTried = {
  providerId: string;
  layer: "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
  availability: IkBomProviderAvailability;
  requests: number;
  hits: number;
  candidates: number;
  rejects: string[];
  elapsedMs: number;
  notesPl?: string;
};

export type IkBomResearchLineTrace = {
  lineId: string;
  dwellingId: string;
  workId: string | null;
  initialGap: string;
  identityStatus: string;
  providersTried: IkBomProviderTried[];
  sourcesFound: string[];
  candidates: number;
  rejects: string[];
  selectedCandidateId: string | null;
  confidence: number | null;
  evidenceRefs: string[];
  ephemeralApplied: boolean;
  stopReason: string;
  why: string[];
};

export type IkBomTechSourceType =
  | "TENDER_PRIMARY"
  | "TECHNOLOGY_PACK_ACTIVE"
  | "TECHNOLOGY_PACK_APPROVED"
  | "TECHNOLOGY_PACK_REVIEW"
  | "OWNER_APPROVED_HISTORICAL"
  | "NORMATIVE_CATALOG"
  | "MANUFACTURER"
  | "PUBLIC_TECHNICAL"
  | "ANALOG_TENDER"
  | "GENERIC_WEB";

export type IkBomTechEvidenceSupports =
  | "TECHNOLOGY"
  | "MATERIAL"
  | "QTY_FACTOR"
  | "UNIT"
  | "NORMATIVE_BASIS";

export type IkBomTechEvidence = {
  sourceKind: IkBomTechSourceType;
  sourceRef: string;
  title?: string;
  publisher?: string;
  url?: string;
  retrievedAt: string;
  excerpt?: string;
  evidenceHash?: string;
  relevance?: number;
  authority?: number;
  supports: IkBomTechEvidenceSupports[];
};

export type IkBomTechNormativeBasis = {
  catalog: "KNR" | "KNR-W" | "KNNR" | "KSNR" | "OTHER";
  catalogId: string | null;
  tableId: string | null;
  itemId: string | null;
  description: string;
  unit: string;
};

export type IkBomTechMaterialLine = {
  materialKey: string;
  description: string;
  unit: string;
  qtyFactor: number;
  role: "PRIMARY" | "AUXILIARY" | "CONSUMABLE";
  evidence: IkBomTechEvidence[];
};

export type IkBomTechConfidence = {
  technologyConfidence: number;
  materialIdentityConfidence: number;
  qtyFactorConfidence: number;
  unitConfidence: number;
  normativeConfidence: number;
  /** Minimum of critical dims — never average away a zero qtyFactor. */
  finalConfidence: number;
};

export type IkBomTechWriteClass = "READ" | "EPHEMERAL" | "OWNER_REQUIRED";

export type IkBomTechnologyCandidate = {
  schemaVersion: typeof IK_BOM_TECH_RESEARCH_SCHEMA_VERSION;
  tenderId: string;
  dwellingId: string;
  lineId: string;
  workId: string;
  technologyId: string;
  technologyDescription: string;
  sourceType: IkBomTechSourceType;
  normativeBasis: IkBomTechNormativeBasis | null;
  materials: IkBomTechMaterialLine[];
  laborBasis: string | null;
  equipmentBasis: string | null;
  confidence: IkBomTechConfidence;
  validation: { ok: boolean; rejects: string[] };
  evidence: IkBomTechEvidence[];
  writeClass: IkBomTechWriteClass;
  invent: false;
};

export type IkBomTechNoEvidenceDetail = {
  technologyMissing: boolean;
  noNormativeCandidate: boolean;
  noTenderSpecification: boolean;
  noManufacturerEvidence: boolean;
  noMaterialKey: boolean;
  noQtyFactorProvenance: boolean;
  unitMismatch: boolean;
  ambiguousTechnologies: boolean;
  identityMismatch: boolean;
  normativeSourceUnavailable: boolean;
  licenseRequired: boolean;
  laborOnlySuggested: boolean;
  reasons: string[];
  why: string[];
};

export type IkBomTechNormCandidate = {
  catalog: IkBomTechNormativeBasis["catalog"];
  catalogId: string;
  tableId: string | null;
  itemId: string;
  description: string;
  unit: string;
  score: number;
  materials: Array<{
    materialKey: string;
    description: string;
    unit: string;
    qtyFactor: number;
    role: IkBomTechMaterialLine["role"];
    sourceRef: string;
  }>;
  evidence: IkBomTechEvidence[];
};

export type IkBomTechTenderClaim = {
  dwellingId: string;
  lineId: string;
  claimKind: "TECHNOLOGY" | "MATERIAL" | "QTY_FACTOR" | "UNIT" | "SYSTEM";
  text: string;
  materialKey?: string | null;
  unit?: string | null;
  qtyFactor?: number | null;
  sourceRef: string;
  documentRole?: string | null;
  evidence: IkBomTechEvidence[];
};

export type IkBomTechResearchBudget = {
  maxNormCandidates?: number;
  maxWebResults?: number;
  allowWeb?: boolean;
  allowAnalogTender?: boolean;
  maxProviders?: number;
  maxRequestsPerProvider?: number;
  maxCandidates?: number;
  maxElapsedMs?: number;
};

/** Owner-injected / licensed normative row — hard qty only, never invent. */
export type IkBomInternalNormEntry = {
  lookupKey: string;
  catalog: IkBomTechNormativeBasis["catalog"];
  catalogId: string;
  tableId: string | null;
  itemId: string;
  description: string;
  unit: string;
  score: number;
  /** When true — suggests LABOR_ONLY path; does NOT auto-apply without Owner workId allowlist. */
  laborOnly?: boolean;
  materials: Array<{
    materialKey: string;
    description: string;
    unit: string;
    qtyFactor: number;
    role: IkBomTechMaterialLine["role"];
    sourceRef: string;
  }>;
  publication?: string;
  evidence: IkBomTechEvidence[];
};
