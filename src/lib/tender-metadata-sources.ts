/**
 * P2-E.1 — mapowanie ról dokumentów → pola metadanych dossier.
 */

import type { DocumentRole } from "@/lib/tender-document-role";

export type TenderMetadataField =
  | "estimatedValue"
  | "awardCriteria"
  | "wadium"
  | "implementationDeadline";

export interface TenderMetadataSources {
  estimatedValue: DocumentRole[];
  awardCriteria: DocumentRole[];
  wadium: DocumentRole[];
  implementationDeadline: DocumentRole[];
}

/** SSOT — które role dokumentów zasilają które pole. */
export const TENDER_METADATA_SOURCES: TenderMetadataSources = {
  estimatedValue: ["swz", "swz_modification", "stwior", "opz", "obmiar", "przedmiar", "kosztorys"],
  awardCriteria: ["swz", "swz_modification", "stwior", "opz"],
  wadium: ["swz", "swz_modification"],
  implementationDeadline: ["swz", "swz_modification", "stwior", "opz"],
};

export function roleContributesMetadata(
  role: DocumentRole,
  field: TenderMetadataField,
): boolean {
  return TENDER_METADATA_SOURCES[field].includes(role);
}

export function metadataParsePriority(role: DocumentRole): number {
  switch (role) {
    case "swz_modification": return 0;
    case "swz": return 1;
    case "opz": return 2;
    case "stwior": return 3;
    case "kosztorys": return 4;
    case "przedmiar": return 5;
    case "obmiar": return 6;
    default: return 9;
  }
}
