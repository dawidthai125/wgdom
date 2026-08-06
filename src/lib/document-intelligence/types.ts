/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — types (DF + COND-1…8j-d).
 */

export type FilenamePriority = "boost" | "neutral" | "penalty";

export type EvidenceStrength = "LOW" | "MEDIUM" | "HIGH";

export type EvidencePolarity = "support" | "contradict" | "neutral";

export type EvidenceSource =
  | "FilenamePriority"
  | "AttachmentRef"
  | "Family"
  | "CrossReference"
  | "Content"
  | "Section"
  | "Table"
  | "Negative"
  | "AttachmentType"
  | "DocumentPurpose"
  | "Coverage"
  | "Duplicate"
  | "Conflict";

export type AttachmentType =
  | "BOQ"
  | "COST_ESTIMATE"
  | "STWIORB"
  | "DRAWING"
  | "SPECIFICATION"
  | "SWZ"
  | "OPZ"
  | "FORM"
  | "CONTRACT"
  | "ANNEX"
  | "OTHER";

export type DocumentPurpose =
  | "PRIMARY_QUANTITY_SOURCE"
  | "ESTIMATE_REFERENCE"
  | "TECHNICAL_REFERENCE"
  | "SPECIFICATION_REFERENCE"
  | "CONTRACT_REFERENCE"
  | "FORMAL_ATTACHMENT"
  | "INFORMATIONAL"
  | "OTHER";

export type RankLabel =
  | "BOQ"
  | "COST_ESTIMATE"
  | "SWZ"
  | "OPZ"
  | "FORM"
  | "CONTRACT"
  | "OTHER";

export type RecommendedParser =
  | "ath"
  | "xlsx"
  | "pdf_przedmiar"
  | "none"
  | "defer_ocr";

export interface DiEvidence {
  id: string;
  source: EvidenceSource;
  polarity: EvidencePolarity;
  evidenceStrength: EvidenceStrength;
  summary: string;
  detail?: string;
  atPass: string;
}

export interface BoqConfidence {
  filenameConfidence: number;
  contentConfidence: number;
  tableConfidence: number;
  ocrConfidence: number | null;
  overallConfidence: number;
}

export interface AttachmentRefResult {
  attachmentRef: string | null;
  familyKey: string | null;
  memberKey: string | null;
  aliases: string[];
  confidence: "high" | "medium" | "low";
  ambiguous: boolean;
}

export interface ExplainabilityBundle {
  chosenBecause: string[];
  rejectedBecause: string[];
  negativeReasons: string[];
  rankingReasons: string[];
  confidenceReasons: string[];
}

export interface ParserRecommendation {
  recommendedParser: RecommendedParser;
  parserConfidence: number;
  candidateParsers: Array<{
    parser: RecommendedParser;
    confidence: number;
    reason: string;
  }>;
}

export interface DocumentIntelligenceKpi {
  boqCandidatesDetected: number;
  boqCandidatesParsed: number;
  boqCandidatesRejected: number;
  boqCandidatesMerged: number;
  docsConsidered: number;
  docsPass2: number;
  docsSkippedByCap: number;
}

/** Locked DF thresholds Phase A. */
export const DI_T_BOQ = 0.55;
export const DI_SAMPLE_PAGES = 3;
export const DI_PASS2_CAP = 8;
export const DI_ESCALATE_MAX = 3;
export const DI_EVIDENCE_MAX = 32;
export const DI_XREF_SOURCE_CAP = 3;

export interface DocumentIntelligenceInput {
  filename: string;
  /** Optional unique key (defaults to filename). */
  candidateKey?: string;
  /** Page texts for section/content (Pass-2/8f). */
  pageTexts?: readonly string[];
  /** Full text fallback when pages unknown. */
  fullText?: string | null;
  /** Bytes size for duplicate fingerprint. */
  byteLength?: number;
  /** Already-extracted SWZ/source texts for limited xref (8e-α). */
  crossRefSourceTexts?: readonly { filename: string; text: string }[];
  /** Sibling filenames for family + xref resolve. */
  siblingFilenames?: readonly string[];
  hasTextLayer?: boolean | null;
  isPdf?: boolean;
  isXlsx?: boolean;
  isAthExt?: boolean;
}

export interface DocumentIntelligenceResult {
  candidateKey: string;
  filename: string;
  filenamePriority: FilenamePriority;
  attachmentRef: AttachmentRefResult;
  familyId: string | null;
  attachmentTypeProvisional: AttachmentType;
  attachmentTypeConfirmed: AttachmentType;
  purpose: DocumentPurpose;
  rankLabel: RankLabel;
  documentConfidence: number;
  boq: BoqConfidence;
  tableScore: number;
  contentScore: number;
  sectionBoost: number;
  evidence: DiEvidence[];
  explain: ExplainabilityBundle;
  parser: ParserRecommendation;
  duplicateOf: string | null;
  escalated: boolean;
  ocrStatus: "not_configured" | "missing_text" | "ok" | "n_a";
  semanticStatus: "not_configured" | "deferred";
}
