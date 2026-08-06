/**
 * COND-8i — Document Purpose late annotation (no AI-COST / KF wire).
 */

import type { AttachmentType, DocumentPurpose, RankLabel } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { DI_T_BOQ } from "./types";

export function annotateDocumentPurpose(input: {
  confirmedType: AttachmentType;
  rankLabel: RankLabel;
  overall: number;
}): { purpose: DocumentPurpose; evidence: DiEvidence } {
  let purpose: DocumentPurpose = "OTHER";

  if (input.overall >= DI_T_BOQ && (input.rankLabel === "BOQ" || input.confirmedType === "BOQ")) {
    purpose = "PRIMARY_QUANTITY_SOURCE";
  } else if (input.confirmedType === "COST_ESTIMATE" || input.rankLabel === "COST_ESTIMATE") {
    purpose = "ESTIMATE_REFERENCE";
  } else if (input.confirmedType === "STWIORB" || input.confirmedType === "DRAWING") {
    purpose = "TECHNICAL_REFERENCE";
  } else if (input.confirmedType === "OPZ" || input.rankLabel === "OPZ") {
    purpose = "SPECIFICATION_REFERENCE";
  } else if (input.confirmedType === "CONTRACT" || input.rankLabel === "CONTRACT") {
    purpose = "CONTRACT_REFERENCE";
  } else if (input.confirmedType === "FORM" || input.confirmedType === "SWZ" || input.confirmedType === "ANNEX") {
    purpose = "FORMAL_ATTACHMENT";
  } else {
    purpose = "INFORMATIONAL";
  }

  return {
    purpose,
    evidence: createEvidence({
      source: "DocumentPurpose",
      polarity: purpose === "PRIMARY_QUANTITY_SOURCE" ? "support" : "neutral",
      evidenceStrength: purpose === "PRIMARY_QUANTITY_SOURCE" ? "HIGH" : "LOW",
      summary: `Purpose=${purpose}`,
      detail: "Late annotation only — no KF/AI-COST wire Phase A",
      atPass: "P8-purpose",
    }),
  };
}
