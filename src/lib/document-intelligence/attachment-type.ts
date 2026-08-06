/**
 * COND-8h — Attachment Type provisional → confirmed (unified with rankLabel).
 */

import type { AttachmentType, FilenamePriority, RankLabel } from "./types";
import { createEvidence } from "./evidence";
import type { DiEvidence } from "./types";
import { DI_T_BOQ } from "./types";

export function provisionalAttachmentType(filename: string): AttachmentType {
  const n = String(filename || "").toLowerCase();
  if (/przedmiar|\bboq\b/.test(n)) return "BOQ";
  if (/kosztorys|ath|norma|formularz\s+cenow|oferta\s+cenow/.test(n)) return "COST_ESTIMATE";
  if (/stwiorb|specyfikacja\s+techn/.test(n)) return "STWIORB";
  if (/rysunek|schemat|projekt/.test(n)) return "DRAWING";
  if (/\bopz\b/.test(n)) return "OPZ";
  if (/\bswz\b|\bsiwz\b/.test(n)) return "SWZ";
  if (/umow/.test(n)) return "CONTRACT";
  if (/formularz|o[sś]wiadczenie|pe[łl]nomoc/.test(n)) return "FORM";
  if (/za[łl][aą]cznik|annex|wykaz|zakres/.test(n)) return "ANNEX";
  return "OTHER";
}

export function confirmAttachmentType(input: {
  provisional: AttachmentType;
  overall: number;
  rankLabel: RankLabel;
  filenamePriority: FilenamePriority;
}): { confirmed: AttachmentType; evidence: DiEvidence } {
  let confirmed = input.provisional;

  if (input.overall >= DI_T_BOQ) {
    if (input.rankLabel === "COST_ESTIMATE" || input.provisional === "COST_ESTIMATE") {
      confirmed = "COST_ESTIMATE";
    } else {
      confirmed = "BOQ";
    }
  } else if (input.rankLabel === "SWZ") confirmed = "SWZ";
  else if (input.rankLabel === "OPZ") confirmed = "OPZ";
  else if (input.rankLabel === "FORM") confirmed = "FORM";
  else if (input.rankLabel === "CONTRACT") confirmed = "CONTRACT";
  else if (input.provisional === "ANNEX") confirmed = "ANNEX";
  else confirmed = input.provisional === "OTHER" ? "OTHER" : input.provisional;

  return {
    confirmed,
    evidence: createEvidence({
      source: "AttachmentType",
      polarity: confirmed === "BOQ" || confirmed === "COST_ESTIMATE" ? "support" : "neutral",
      evidenceStrength: input.overall >= DI_T_BOQ ? "HIGH" : "LOW",
      summary: `Type ${input.provisional} → ${confirmed}`,
      atPass: "P6-8h",
    }),
  };
}
