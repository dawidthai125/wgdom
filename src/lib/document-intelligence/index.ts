/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — public API.
 */

export type {
  AttachmentRefResult,
  AttachmentType,
  BoqConfidence,
  DiEvidence,
  DocumentIntelligenceInput,
  DocumentIntelligenceKpi,
  DocumentIntelligenceResult,
  DocumentPurpose,
  EvidencePolarity,
  EvidenceSource,
  EvidenceStrength,
  ExplainabilityBundle,
  FilenamePriority,
  ParserRecommendation,
  RankLabel,
  RecommendedParser,
} from "./types";

export {
  DI_ESCALATE_MAX,
  DI_EVIDENCE_MAX,
  DI_PASS2_CAP,
  DI_SAMPLE_PAGES,
  DI_T_BOQ,
  DI_XREF_SOURCE_CAP,
} from "./types";

export { analyzeDocumentIntelligence, analyzeDocumentIntelligenceBatch } from "./analyze";
export { extractAttachmentRef, normalizeAttachmentToken } from "./attachment-ref";
export { classifyFilenamePriority } from "./filename-priority";
export { scoreTableSignals, ACTIVE_SEARCH_TOKENS } from "./table-signals";
export { scoreContentAndSection } from "./content-section";
export { detectNegativeSignals } from "./negative";
export { recommendParser } from "./parser-recommendation";
export { accumulateDiKpi, diHealthSummary, emptyDiKpi } from "./kpi";
export { resolveOcrContract, resolveSemanticContract } from "./ocr-contract";
export {
  needsIkOcrB1,
  hasUsableNativePdfText,
  runIkPdfScanOcrB1,
  isIkOcrTrustedForHeuristic,
} from "./ocr-run-b1";
export {
  setIkOcrProviderForTests,
  resetIkOcrCallCountForTests,
  getIkOcrCallCountForTests,
} from "./ocr-provider";
export type {
  IkOcrResult,
  IkOcrPageResult,
  IkOcrProvider,
  IkExtractionMethod,
} from "./ocr-types";
export { resetDiEvidenceSeqForTests } from "./evidence";

/** Should cost pipeline force pdf przedmiar heuristic for this DI result? */
export function shouldForcePdfPrzedmiarParse(result: {
  parser: { recommendedParser: string };
}): boolean {
  return result.parser.recommendedParser === "pdf_przedmiar";
}
