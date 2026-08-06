/**
 * Health / KPI RO — boqCandidatesDetected|Parsed|Rejected|Merged (Merged=0 Phase A).
 */

import type { DocumentIntelligenceKpi, DocumentIntelligenceResult } from "./types";
import { DI_T_BOQ } from "./types";

export function emptyDiKpi(): DocumentIntelligenceKpi {
  return {
    boqCandidatesDetected: 0,
    boqCandidatesParsed: 0,
    boqCandidatesRejected: 0,
    boqCandidatesMerged: 0,
    docsConsidered: 0,
    docsPass2: 0,
    docsSkippedByCap: 0,
  };
}

export function accumulateDiKpi(
  kpi: DocumentIntelligenceKpi,
  result: DocumentIntelligenceResult,
  opts?: { parsedOk?: boolean; pass2?: boolean; skippedByCap?: boolean },
): DocumentIntelligenceKpi {
  const next = { ...kpi };
  next.docsConsidered += 1;
  if (opts?.pass2) next.docsPass2 += 1;
  if (opts?.skippedByCap) next.docsSkippedByCap += 1;

  const isBoqCand =
    result.boq.overallConfidence >= DI_T_BOQ ||
    result.rankLabel === "BOQ" ||
    result.rankLabel === "COST_ESTIMATE" ||
    result.parser.recommendedParser === "pdf_przedmiar" ||
    result.parser.recommendedParser === "ath" ||
    result.parser.recommendedParser === "xlsx";

  if (isBoqCand) {
    next.boqCandidatesDetected += 1;
    if (opts?.parsedOk) next.boqCandidatesParsed += 1;
    else if (result.parser.recommendedParser === "none") next.boqCandidatesRejected += 1;
  } else if (result.filenamePriority === "boost" && result.parser.recommendedParser === "none") {
    next.boqCandidatesRejected += 1;
  }

  // Phase A: Merged always 0 (composite merge = Phase B)
  next.boqCandidatesMerged = 0;
  return next;
}

/** Read-only health snapshot for operators. */
export function diHealthSummary(kpi: DocumentIntelligenceKpi): {
  status: "ok" | "degraded" | "empty";
  message: string;
} {
  if (kpi.docsConsidered === 0) {
    return { status: "empty", message: "No documents considered" };
  }
  if (kpi.boqCandidatesDetected === 0 && kpi.docsConsidered >= 3) {
    return {
      status: "degraded",
      message: "No BOQ candidates detected among documents",
    };
  }
  return {
    status: "ok",
    message: `detected=${kpi.boqCandidatesDetected} parsed=${kpi.boqCandidatesParsed} rejected=${kpi.boqCandidatesRejected}`,
  };
}
