/**
 * Pass-7 Parser recommendation (COND-1 — selection only via DI).
 */

import type { ParserRecommendation, RankLabel, RecommendedParser } from "./types";
import { DI_T_BOQ } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";

export function recommendParser(input: {
  isAthExt?: boolean;
  isXlsx?: boolean;
  isPdf?: boolean;
  overall: number;
  rankLabel: RankLabel;
  hasTextLayer?: boolean | null;
  /** Doc.D1 alias filename — DI still owns selection (COND-1). */
  docD1Filename?: boolean;
  tableScore?: number;
}): { parser: ParserRecommendation; evidence: DiEvidence } {
  const candidates: ParserRecommendation["candidateParsers"] = [];

  if (input.isAthExt) {
    candidates.push({
      parser: "ath",
      confidence: 0.95,
      reason: "ATH/NORMA extension",
    });
  }
  if (input.isXlsx) {
    candidates.push({
      parser: "xlsx",
      confidence: 0.9,
      reason: "XLSX cost workbook",
    });
  }
  if (input.isPdf !== false) {
    const pdfConf =
      input.overall >= DI_T_BOQ ? Math.min(0.92, 0.55 + input.overall * 0.4) : input.overall * 0.5;
    candidates.push({
      parser: "pdf_przedmiar",
      confidence: pdfConf,
      reason:
        input.overall >= DI_T_BOQ
          ? "DI BOQ threshold met — REUSE pdf przedmiar heuristic"
          : "Below T_BOQ — pdf parser low confidence",
    });
  }

  if (input.hasTextLayer === false && input.overall < DI_T_BOQ) {
    candidates.push({
      parser: "defer_ocr",
      confidence: 0.2,
      reason: "No text layer — OCR OUT Phase A (stub)",
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  let recommendedParser: RecommendedParser = "none";
  let parserConfidence = 0;

  if (input.isAthExt) {
    recommendedParser = "ath";
    parserConfidence = 0.95;
  } else if (input.isXlsx) {
    recommendedParser = "xlsx";
    parserConfidence = 0.9;
  } else if (
    input.overall >= DI_T_BOQ &&
    (input.rankLabel === "BOQ" || input.rankLabel === "COST_ESTIMATE")
  ) {
    recommendedParser = "pdf_przedmiar";
    parserConfidence = candidates.find((c) => c.parser === "pdf_przedmiar")?.confidence ?? 0.7;
  } else if (
    // Doc.D1 / strong table near-threshold — still select via DI Pass-7 (COND-1)
    input.docD1Filename &&
    input.overall >= DI_T_BOQ - 0.05 &&
    (input.tableScore ?? 0) >= 0.35
  ) {
    recommendedParser = "pdf_przedmiar";
    parserConfidence = Math.max(input.overall, 0.6);
    candidates.unshift({
      parser: "pdf_przedmiar",
      confidence: parserConfidence,
      reason: "Doc.D1 + table near T_BOQ — DI selects pdf_przedmiar",
    });
  } else {
    recommendedParser = "none";
    parserConfidence = input.overall;
  }

  const parser: ParserRecommendation = {
    recommendedParser,
    parserConfidence,
    candidateParsers: candidates.slice(0, 4),
  };

  return {
    parser,
    evidence: createEvidence({
      source: "Coverage",
      polarity: recommendedParser === "pdf_przedmiar" || recommendedParser === "ath" || recommendedParser === "xlsx"
        ? "support"
        : "neutral",
      evidenceStrength: recommendedParser === "none" ? "LOW" : "HIGH",
      summary: `Parser=${recommendedParser} conf=${parserConfidence.toFixed(2)}`,
      atPass: "P7",
    }),
  };
}
