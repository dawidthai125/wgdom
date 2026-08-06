/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 — main Phase A pipeline (pure).
 */

import { isDocD1PdfFilename } from "../doc-detection/aliases";
import { attachmentRefEvidence, extractAttachmentRef } from "./attachment-ref";
import { confirmAttachmentType, provisionalAttachmentType } from "./attachment-type";
import { scoreContentAndSection } from "./content-section";
import { decideCoverage } from "./coverage";
import { collectCrossRefBoost } from "./cross-reference";
import { detectDuplicate, duplicateFingerprint } from "./duplicate";
import { appendEvidenceMany } from "./evidence";
import { buildExplainability } from "./explainability";
import {
  classifyFilenamePriority,
  detectFamilyId,
  familyEvidence,
  filenamePriorityEvidence,
} from "./filename-priority";
import { detectNegativeSignals } from "./negative";
import { resolveOcrContract, resolveSemanticContract } from "./ocr-contract";
import { recommendParser } from "./parser-recommendation";
import { annotateDocumentPurpose } from "./purpose";
import {
  computeBoqConfidence,
  mapRankLabel,
  rankingEvidence,
} from "./ranking";
import { scoreTableSignals } from "./table-signals";
import type {
  DocumentIntelligenceInput,
  DocumentIntelligenceResult,
  DiEvidence,
} from "./types";
import { DI_T_BOQ } from "./types";

export interface AnalyzeDocumentIntelligenceOptions {
  /** Shared fingerprint map for duplicate detect across batch. */
  seenFingerprints?: Map<string, string>;
  pass2Used?: number;
  escalateUsed?: number;
}

export function analyzeDocumentIntelligence(
  input: DocumentIntelligenceInput,
  opts?: AnalyzeDocumentIntelligenceOptions,
): DocumentIntelligenceResult {
  const candidateKey = input.candidateKey || input.filename;
  let evidence: DiEvidence[] = [];

  // P0 AttachmentRef
  const attachmentRef = extractAttachmentRef(input.filename);
  evidence = appendEvidenceMany(evidence, [attachmentRefEvidence(attachmentRef)]);

  // P1 Filename priority (NEVER reject)
  const fn = classifyFilenamePriority(input.filename);
  evidence = appendEvidenceMany(evidence, [filenamePriorityEvidence(fn.priority, fn.reason)]);

  // P5 Family (detect only)
  const familyId = detectFamilyId({
    attachmentRef: attachmentRef.attachmentRef,
    familyKey: attachmentRef.familyKey,
    siblingFilenames: input.siblingFilenames,
  });
  evidence = appendEvidenceMany(evidence, [familyEvidence(familyId)]);

  // Content + section + table (Pass-2/3/8f)
  const content = scoreContentAndSection({
    pageTexts: input.pageTexts,
    fullText: input.fullText,
  });
  evidence = appendEvidenceMany(evidence, content.evidence);

  const joinedText =
    (input.pageTexts && input.pageTexts.length
      ? input.pageTexts.join("\n")
      : null) ||
    String(input.fullText || "");

  const table = scoreTableSignals(joinedText);
  evidence = appendEvidenceMany(evidence, table.evidence);

  // Rough overall before negative (for coverage)
  const preOverall =
    0.25 * (fn.priority === "boost" ? 0.82 : fn.priority === "penalty" ? 0.18 : 0.4) +
    0.35 * content.contentScore +
    0.3 * table.tableScore;

  const coverage = decideCoverage({
    filenamePriority: fn.priority,
    overallAfterPass1ish: preOverall,
    pass2Used: opts?.pass2Used ?? 0,
    escalateUsed: opts?.escalateUsed ?? 0,
    sampledPages: content.sampledPages,
  });
  if (coverage.evidence) evidence = appendEvidenceMany(evidence, [coverage.evidence]);

  // P4 Negative
  const negative = detectNegativeSignals({
    filename: input.filename,
    text: joinedText,
    filenamePriority: fn.priority,
  });
  evidence = appendEvidenceMany(evidence, negative.evidence);

  // If content mandatory (mixed), do not let filename formal alone kill score
  const dampen = negative.forceContentMandatory
    ? Math.max(negative.dampen, 0.85)
    : negative.dampen;

  // P5 xref boost
  const xref = collectCrossRefBoost({
    attachmentRef: attachmentRef.attachmentRef,
    crossRefSourceTexts: input.crossRefSourceTexts,
  });
  evidence = appendEvidenceMany(evidence, xref.evidence);

  // OCR stub
  const ocr = resolveOcrContract({
    isPdf: input.isPdf,
    hasTextLayer: input.hasTextLayer,
    textLen: joinedText.trim().length,
  });
  void resolveSemanticContract();

  // P6 Ranking (numeric SSOT)
  const boq = computeBoqConfidence({
    filenamePriority: fn.priority,
    contentScore: content.contentScore,
    tableScore: table.tableScore,
    ocrConfidence: ocr.confidence,
    dampen,
    xrefBoost: xref.boost,
  });

  const provisional = provisionalAttachmentType(input.filename);
  // Provisional rank for type confirm — bootstrap with provisional mapping
  let rankLabel = mapRankLabel({
    overall: boq.overallConfidence,
    attachmentType: provisional,
    rankAsFormal: negative.rankAsFormal && !negative.forceContentMandatory,
    filenamePriority: fn.priority,
  });

  const typeConfirm = confirmAttachmentType({
    provisional,
    overall: boq.overallConfidence,
    rankLabel,
    filenamePriority: fn.priority,
  });
  evidence = appendEvidenceMany(evidence, [typeConfirm.evidence]);

  rankLabel = mapRankLabel({
    overall: boq.overallConfidence,
    attachmentType: typeConfirm.confirmed,
    rankAsFormal: negative.rankAsFormal && !negative.forceContentMandatory,
    filenamePriority: fn.priority,
  });
  evidence = appendEvidenceMany(evidence, [rankingEvidence(boq, rankLabel)]);

  // P7 Parser (COND-1 — selection only via DI)
  const parserRec = recommendParser({
    isAthExt: input.isAthExt,
    isXlsx: input.isXlsx,
    isPdf: input.isPdf !== false && !input.isAthExt && !input.isXlsx,
    overall: boq.overallConfidence,
    rankLabel,
    hasTextLayer: input.hasTextLayer,
    docD1Filename: isDocD1PdfFilename(input.filename),
    tableScore: table.tableScore,
  });
  evidence = appendEvidenceMany(evidence, [parserRec.evidence]);

  // P8 Purpose late — align with Pass-7 when DI selected quantity parser
  const purpose = annotateDocumentPurpose({
    confirmedType: typeConfirm.confirmed,
    rankLabel:
      parserRec.parser.recommendedParser === "pdf_przedmiar" && rankLabel === "OTHER"
        ? "BOQ"
        : rankLabel,
    overall:
      parserRec.parser.recommendedParser === "pdf_przedmiar"
        ? Math.max(boq.overallConfidence, DI_T_BOQ)
        : boq.overallConfidence,
  });
  evidence = appendEvidenceMany(evidence, [purpose.evidence]);

  // Duplicate minimal
  const fp = duplicateFingerprint({
    filename: input.filename,
    byteLength: input.byteLength,
    textHead: joinedText,
  });
  const dup = detectDuplicate(fp, opts?.seenFingerprints ?? new Map(), candidateKey);
  evidence = appendEvidenceMany(evidence, [dup.evidence]);

  const rankingReasons = [
    `overall=${boq.overallConfidence.toFixed(2)}`,
    `filename=${fn.priority}`,
    `content=${content.contentScore.toFixed(2)}`,
    `table=${table.tableScore.toFixed(2)}`,
    dampen < 1 ? `dampen=${dampen.toFixed(2)}` : null,
    xref.boost > 0 ? `xref=+${xref.boost.toFixed(2)}` : null,
  ].filter(Boolean) as string[];

  const explain = buildExplainability({
    evidence,
    overall: boq.overallConfidence,
    recommendedParser: parserRec.parser.recommendedParser,
    negativeReasons: negative.reasons,
    rankingReasons,
  });

  return {
    candidateKey,
    filename: input.filename,
    filenamePriority: fn.priority,
    attachmentRef,
    familyId,
    attachmentTypeProvisional: provisional,
    attachmentTypeConfirmed: typeConfirm.confirmed,
    purpose: purpose.purpose,
    rankLabel,
    documentConfidence: boq.overallConfidence,
    boq,
    tableScore: table.tableScore,
    contentScore: content.contentScore,
    sectionBoost: content.sectionBoost,
    evidence,
    explain,
    parser: parserRec.parser,
    duplicateOf: dup.duplicateOf,
    escalated: coverage.escalateFullText,
    ocrStatus: ocr.status,
    semanticStatus: "not_configured",
  };
}

/** Batch helper — shared duplicate map + KPI-friendly caps. */
export function analyzeDocumentIntelligenceBatch(
  inputs: readonly DocumentIntelligenceInput[],
): DocumentIntelligenceResult[] {
  const seen = new Map<string, string>();
  let pass2Used = 0;
  let escalateUsed = 0;
  const out: DocumentIntelligenceResult[] = [];
  for (const input of inputs) {
    const result = analyzeDocumentIntelligence(input, {
      seenFingerprints: seen,
      pass2Used,
      escalateUsed,
    });
    if (result.contentScore > 0 || result.filenamePriority === "boost") pass2Used += 1;
    if (result.escalated) escalateUsed += 1;
    out.push(result);
  }
  return out;
}
