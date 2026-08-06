/**
 * Pass-6 Ranking + overall confidence (numeric scoring SSOT).
 * COND-8j-d: evidence strength ≠ ranking weight.
 */

import type {
  AttachmentType,
  BoqConfidence,
  FilenamePriority,
  RankLabel,
} from "./types";
import { DI_T_BOQ } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";

export function filenameConfidenceFromPriority(p: FilenamePriority): number {
  if (p === "boost") return 0.82;
  if (p === "penalty") return 0.18;
  return 0.4;
}

/**
 * DF overall:
 * overall = 0.25*filename + 0.35*content + 0.30*table + 0.10*(ocr|0)
 * then dampen + xrefBoost, clamp [0,1]
 */
export function computeBoqConfidence(input: {
  filenamePriority: FilenamePriority;
  contentScore: number;
  tableScore: number;
  ocrConfidence: number | null;
  dampen: number;
  xrefBoost: number;
}): BoqConfidence {
  const filenameConfidence = filenameConfidenceFromPriority(input.filenamePriority);
  const contentConfidence = Math.max(0, Math.min(1, input.contentScore));
  const tableConfidence = Math.max(0, Math.min(1, input.tableScore));
  const ocrPart = input.ocrConfidence == null ? 0 : Math.max(0, Math.min(1, input.ocrConfidence));

  let overall =
    0.25 * filenameConfidence +
    0.35 * contentConfidence +
    0.3 * tableConfidence +
    0.1 * ocrPart;

  overall = overall * input.dampen + input.xrefBoost;
  overall = Math.max(0, Math.min(1, overall));

  return {
    filenameConfidence,
    contentConfidence,
    tableConfidence,
    ocrConfidence: input.ocrConfidence,
    overallConfidence: overall,
  };
}

export function mapRankLabel(input: {
  overall: number;
  attachmentType: AttachmentType;
  rankAsFormal: boolean;
  filenamePriority: FilenamePriority;
}): RankLabel {
  if (input.rankAsFormal && input.overall < DI_T_BOQ) {
    if (input.attachmentType === "CONTRACT") return "CONTRACT";
    if (input.attachmentType === "FORM") return "FORM";
    if (input.attachmentType === "SWZ") return "SWZ";
    if (input.attachmentType === "OPZ") return "OPZ";
  }
  if (input.overall >= DI_T_BOQ) {
    if (input.attachmentType === "COST_ESTIMATE") return "COST_ESTIMATE";
    return "BOQ";
  }
  if (input.attachmentType === "SWZ") return "SWZ";
  if (input.attachmentType === "OPZ") return "OPZ";
  if (input.attachmentType === "FORM") return "FORM";
  if (input.attachmentType === "CONTRACT") return "CONTRACT";
  return "OTHER";
}

export function rankingEvidence(boq: BoqConfidence, rankLabel: RankLabel): DiEvidence {
  return createEvidence({
    source: "AttachmentType",
    polarity: boq.overallConfidence >= DI_T_BOQ ? "support" : "neutral",
    evidenceStrength:
      boq.overallConfidence >= 0.75 ? "HIGH" : boq.overallConfidence >= DI_T_BOQ ? "MEDIUM" : "LOW",
    summary: `Rank=${rankLabel} overall=${boq.overallConfidence.toFixed(2)} (T_BOQ=${DI_T_BOQ})`,
    detail: `f=${boq.filenameConfidence.toFixed(2)} c=${boq.contentConfidence.toFixed(2)} t=${boq.tableConfidence.toFixed(2)}`,
    atPass: "P6",
  });
}
